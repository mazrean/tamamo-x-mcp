/**
 * Agent Client Protocol (ACP) provider implementation
 * Enables using external coding agents (Claude Code, Gemini CLI, Codex) as LLM providers
 *
 * ACP is a JSON-RPC 2.0 protocol for IDE-agent communication
 * Protocol flow: initialize → session/new → session/prompt (repeating)
 */

import type { CompletionOptions, LLMClient } from "../client.ts";

const DEFAULT_MODEL = "default";

// Minimal ACP types based on protocol specification
interface InitializeRequest {
  protocolVersion: string;
  clientCapabilities?: Record<string, unknown>;
}

interface InitializeResponse {
  protocolVersion: string;
  agentCapabilities?: Record<string, unknown>;
  authMethods?: Array<{ id: string; name: string }>;
}

interface NewSessionRequest {
  cwd: string;
  mcpServers?: Array<{
    serverName: string;
    configPath?: string;
  }>;
}

interface NewSessionResponse {
  sessionId: string;
  availableModes?: string[];
}

interface PromptRequest {
  sessionId: string;
  prompt: Array<{
    type: "text";
    text: string;
  }>;
}

interface PromptResponse {
  stopReason: "end_turn" | "max_tokens" | "stop_sequence" | "cancelled";
}

interface SessionUpdate {
  updateType: string;
  content?: Array<{
    type: string;
    text?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

interface JSONRPCRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params: unknown;
}

interface JSONRPCResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface JSONRPCNotification {
  jsonrpc: "2.0";
  method: string;
  params: unknown;
}

/**
 * Agent Client Protocol (ACP) Client
 * Manages connection to an ACP agent subprocess via stdio
 */
class ACPClient {
  private process: Deno.ChildProcess;
  private requestId = 0;
  private sessionId: string | null = null;
  private pendingRequests = new Map<number | string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }>();
  private byteBuffer = new Uint8Array(0); // Store raw bytes instead of decoded string
  private reader: ReadableStreamDefaultReader<Uint8Array>;
  private sessionUpdates: SessionUpdate[] = [];
  private isInitialized = false;

  constructor(
    command: string,
    args: string[] = [],
  ) {
    // Start the ACP agent as a subprocess
    this.process = new Deno.Command(command, {
      args,
      stdin: "piped",
      stdout: "piped",
      stderr: "inherit", // Log agent errors to stderr
    }).spawn();

    this.reader = this.process.stdout.getReader();
    this.startMessageLoop();
  }

  /**
   * Find byte sequence in buffer
   */
  private findBytes(buffer: Uint8Array, pattern: Uint8Array, start = 0): number {
    for (let i = start; i <= buffer.length - pattern.length; i++) {
      let found = true;
      for (let j = 0; j < pattern.length; j++) {
        if (buffer[i + j] !== pattern[j]) {
          found = false;
          break;
        }
      }
      if (found) return i;
    }
    return -1;
  }

  /**
   * Read and process Content-Length framed JSON-RPC messages from agent's stdout
   * ACP uses Content-Length headers like LSP, not newline-delimited JSON
   *
   * IMPORTANT: Content-Length is in BYTES, not characters. We must work with
   * raw byte arrays and only decode after extracting the exact byte range.
   */
  private async startMessageLoop() {
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    // Pre-encode search patterns
    const contentLengthPrefix = encoder.encode("Content-Length: ");
    const headerSeparatorCRLF = encoder.encode("\r\n\r\n");
    const headerSeparatorLF = encoder.encode("\n\n");

    try {
      while (true) {
        const { value, done } = await this.reader.read();
        if (done) break;

        // Append raw bytes to buffer
        const newBuffer = new Uint8Array(this.byteBuffer.length + value.length);
        newBuffer.set(this.byteBuffer);
        newBuffer.set(value, this.byteBuffer.length);
        this.byteBuffer = newBuffer;

        // Process Content-Length framed messages
        while (true) {
          // Find "Content-Length: " in bytes
          const headerStart = this.findBytes(this.byteBuffer, contentLengthPrefix);
          if (headerStart === -1) break; // Need more data

          // Find the header separator (\r\n\r\n or \n\n)
          const valueStart = headerStart + contentLengthPrefix.length;
          let separatorPos = this.findBytes(this.byteBuffer, headerSeparatorCRLF, valueStart);
          let separatorLength = 4;

          if (separatorPos === -1) {
            separatorPos = this.findBytes(this.byteBuffer, headerSeparatorLF, valueStart);
            separatorLength = 2;
          }

          if (separatorPos === -1) break; // Need more data

          // Extract and parse Content-Length value
          const lengthBytes = this.byteBuffer.slice(valueStart, separatorPos);
          const lengthStr = decoder.decode(lengthBytes).trim();
          const contentLength = parseInt(lengthStr, 10);

          if (isNaN(contentLength)) {
            console.error("Invalid Content-Length:", lengthStr);
            this.byteBuffer = this.byteBuffer.slice(separatorPos + separatorLength);
            continue;
          }

          // Calculate message boundaries in bytes
          const messageStart = separatorPos + separatorLength;
          const messageEnd = messageStart + contentLength;

          // Check if we have the complete message (in bytes)
          if (this.byteBuffer.length < messageEnd) break; // Need more data

          // Extract message bytes and decode
          const messageBytes = this.byteBuffer.slice(messageStart, messageEnd);
          const messageJson = decoder.decode(messageBytes);

          // Remove processed message from buffer (including header)
          this.byteBuffer = this.byteBuffer.slice(messageEnd);

          try {
            const message = JSON.parse(messageJson);
            this.handleMessage(message);
          } catch (err) {
            console.error("Failed to parse JSON-RPC message:", messageJson, err);
          }
        }
      }
    } catch (err) {
      console.error("ACP message loop error:", err);
    }
  }

  /**
   * Handle incoming JSON-RPC messages (responses, notifications, and requests)
   */
  private handleMessage(message: JSONRPCResponse | JSONRPCNotification | JSONRPCRequest) {
    // Check if it's a request from agent (has both id and method)
    if ("id" in message && "method" in message) {
      // Agent→Client request (e.g., fs/read_text_file, terminal/create)
      this.handleAgentRequest(message as JSONRPCRequest);
      return;
    }

    // Check if it's a response to our request
    if ("id" in message) {
      // Response to a Client→Agent request
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        this.pendingRequests.delete(message.id);
        if (message.error) {
          pending.reject(
            new Error(`ACP error ${message.error.code}: ${message.error.message}`),
          );
        } else {
          pending.resolve(message.result);
        }
      }
      return;
    }

    // Otherwise it's a notification
    if ("method" in message) {
      // Notification from agent
      if (message.method === "session/update") {
        const update = message.params as SessionUpdate;
        this.sessionUpdates.push(update);
      }
    }
  }

  /**
   * Handle Agent→Client requests (currently unsupported, returns error)
   */
  private async handleAgentRequest(request: JSONRPCRequest) {
    // For now, reject all Agent→Client requests as we don't support them yet
    // This includes fs/read_text_file, fs/write_text_file, terminal/*, etc.
    const errorResponse: JSONRPCResponse = {
      jsonrpc: "2.0",
      id: request.id,
      error: {
        code: -32601,
        message: `Method not supported: ${request.method}`,
        data: "This ACP client does not yet implement Agent→Client requests",
      },
    };

    // Send error response with Content-Length framing
    const responseJson = JSON.stringify(errorResponse);
    const contentLength = new TextEncoder().encode(responseJson).length;
    const message = `Content-Length: ${contentLength}\r\n\r\n${responseJson}`;

    try {
      const writer = this.process.stdin.getWriter();
      await writer.write(new TextEncoder().encode(message));
      writer.releaseLock();
    } catch (err) {
      console.error("Failed to send error response to agent:", err);
    }
  }

  /**
   * Send JSON-RPC request to agent with Content-Length framing and wait for response
   */
  private async sendRequest(method: string, params: unknown): Promise<unknown> {
    const id = ++this.requestId;
    const request: JSONRPCRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    // Send request via stdin with Content-Length header (like LSP)
    const requestJson = JSON.stringify(request);
    const contentLength = new TextEncoder().encode(requestJson).length;
    const message = `Content-Length: ${contentLength}\r\n\r\n${requestJson}`;

    const writer = this.process.stdin.getWriter();
    await writer.write(new TextEncoder().encode(message));
    writer.releaseLock();

    // Wait for response
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      // Timeout after 60 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`ACP request timeout: ${method}`));
        }
      }, 60000);
    });
  }

  /**
   * Initialize connection with ACP agent
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const request: InitializeRequest = {
      protocolVersion: "0.1.0",
      clientCapabilities: {
        // Currently we don't support Agent→Client requests
        // Set all capabilities to false to avoid the agent calling unsupported methods
        fs: {
          readTextFile: false,
          writeTextFile: false,
        },
        terminal: false,
      },
    };

    const response = await this.sendRequest("initialize", request) as InitializeResponse;

    // Validate protocol version compatibility
    if (response.protocolVersion !== "0.1.0") {
      console.warn(
        `ACP protocol version mismatch: client=0.1.0, agent=${response.protocolVersion}`,
      );
    }

    console.log("ACP initialized:", response);

    // Note: Authentication not implemented (assumes no auth required)
    this.isInitialized = true;
  }

  /**
   * Create a new session
   */
  async createSession(): Promise<string> {
    if (!this.isInitialized) {
      throw new Error("ACP client not initialized");
    }

    if (this.sessionId) {
      return this.sessionId;
    }

    const request: NewSessionRequest = {
      cwd: Deno.cwd(),
      mcpServers: [], // No MCP servers for now
    };

    const response = await this.sendRequest("session/new", request) as NewSessionResponse;
    this.sessionId = response.sessionId;
    return this.sessionId;
  }

  /**
   * Send a prompt to the agent and collect response
   */
  async sendPrompt(prompt: string): Promise<string> {
    if (!this.sessionId) {
      throw new Error("No active session");
    }

    // Clear previous session updates
    this.sessionUpdates = [];

    const request: PromptRequest = {
      sessionId: this.sessionId,
      prompt: [{
        type: "text",
        text: prompt,
      }],
    };

    // Wait for prompt completion
    await this.sendRequest("session/prompt", request) as PromptResponse;

    // Collect all agent message chunks from session updates
    const messageChunks: string[] = [];
    for (const update of this.sessionUpdates) {
      if (update.updateType === "agent_message_chunk" && update.content) {
        for (const block of update.content) {
          if (block.type === "text" && block.text) {
            messageChunks.push(block.text);
          }
        }
      }
    }

    return messageChunks.join("");
  }

  /**
   * Cleanup and close the agent process
   */
  async close(): Promise<void> {
    try {
      this.reader.cancel();
      await this.process.stdin.close();
      await this.process.kill();
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Create ACP LLM client
 */
export function createACPClient(
  agentCommand: string,
  agentArgs?: string[],
  model?: string,
): LLMClient {
  const selectedModel = model || DEFAULT_MODEL;
  let acpClient: ACPClient | null = null;

  return {
    provider: "acp",
    model: selectedModel,
    async complete(
      prompt: string,
      _options?: CompletionOptions,
    ): Promise<string> {
      // Note: ACP protocol doesn't support structured output enforcement
      // The responseSchema option is ignored for ACP providers
      // This is a protocol-level limitation, not an implementation gap

      try {
        // Lazy initialization: create client on first use
        if (!acpClient) {
          acpClient = new ACPClient(agentCommand, agentArgs || []);
          await acpClient.initialize();
          await acpClient.createSession();
        }

        // Send prompt and get response
        const response = await acpClient.sendPrompt(prompt);
        return response;
      } catch (error) {
        // Cleanup on error
        if (acpClient) {
          await acpClient.close();
          acpClient = null;
        }
        throw new Error(
          `ACP provider error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
  };
}
