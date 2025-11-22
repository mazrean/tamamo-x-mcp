# Agent Client Protocol (ACP) Provider Guide

## Overview

The ACP provider enables tamamo-x-mcp to use external coding agents that implement the [Agent Client Protocol](https://agentclientprotocol.com/) as LLM providers. This allows you to leverage various AI coding agents without requiring API credentials in tamamo-x-mcp's configuration.

## Why Use ACP Provider?

### Benefits

✅ **No API Key Management** - Agents handle their own authentication
✅ **Local LLM Support** - Use agents backed by local models (Ollama, etc.)
✅ **Enterprise Integration** - Connect to corporate AI agents with custom auth
✅ **Protocol Standardization** - ACP is becoming the standard for AI agent communication

### When to Use ACP vs Standard Providers

| Use Case                 | Recommended Provider   | Reason                                 |
| ------------------------ | ---------------------- | -------------------------------------- |
| Gemini CLI               | **ACP**                | Uses Google's auth, no API key needed  |
| Local LLM agents         | **ACP**                | No external API required               |
| Custom enterprise agents | **ACP**                | Custom authentication handled by agent |
| Direct Anthropic API     | Standard (`anthropic`) | More efficient, no protocol overhead   |
| Direct OpenAI API        | Standard (`openai`)    | More efficient, no protocol overhead   |

## Supported ACP Agents

### 1. Gemini CLI (Recommended)

Google's official CLI tool with built-in authentication.

**Installation:**

```bash
# Install Gemini CLI
npm install -g @google/generative-ai-cli
```

**Configuration:**

```json
{
  "version": "1.0.0",
  "mcpServers": [...],
  "llmProvider": {
    "type": "acp",
    "agentCommand": "gemini",
    "agentArgs": ["--model", "gemini-2.0-flash-exp"],
    "model": "gemini-2.0-flash-exp"
  }
}
```

**Authentication:**

```bash
# First-time setup (interactive Google login)
gemini auth login

# Then use tamamo-x-mcp normally
tamamo-x-mcp build
```

**Advantages:**

- ✅ No API key in config files
- ✅ Uses Google account authentication
- ✅ Free tier available
- ✅ Latest Gemini models

### 2. Custom Local LLM Agent

Use local models through a custom ACP-compatible agent wrapper.

**Example: Ollama-backed ACP agent**

Create a simple ACP wrapper script (`ollama-acp.sh`):

```bash
#!/bin/bash
# Custom ACP agent wrapper for Ollama
# This is a simplified example - production implementation requires
# full ACP protocol support (JSON-RPC 2.0 over stdio)

node /path/to/your/ollama-acp-adapter.js
```

**Configuration:**

```json
{
  "llmProvider": {
    "type": "acp",
    "agentCommand": "/path/to/ollama-acp.sh",
    "agentArgs": [],
    "model": "llama3.1"
  }
}
```

**Advantages:**

- ✅ Completely offline
- ✅ No API costs
- ✅ Full privacy control
- ✅ Custom model selection

### 3. Enterprise AI Agent

Connect to corporate AI infrastructure with custom authentication.

**Configuration:**

```json
{
  "llmProvider": {
    "type": "acp",
    "agentCommand": "/opt/company/ai-agent",
    "agentArgs": ["--profile", "production"],
    "model": "company-gpt-4"
  }
}
```

**Advantages:**

- ✅ Uses company SSO/auth
- ✅ Complies with security policies
- ✅ No external API dependencies
- ✅ Audit trail integration

## When NOT to Use ACP Provider

### ❌ claude-code-acp

While `@zed-industries/claude-code-acp` is an ACP agent, it **still requires ANTHROPIC_API_KEY**. In this case, use the standard `anthropic` provider instead:

**Not Recommended:**

```json
{
  "llmProvider": {
    "type": "acp",
    "agentCommand": "claude-code-acp"
  }
}
```

_Problem: Still needs ANTHROPIC_API_KEY environment variable_

**Recommended:**

```json
{
  "llmProvider": {
    "type": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "credentialSource": "cli-tool"
  }
}
```

_Benefit: Direct API access, better performance, same authentication_

### Other Cases to Avoid ACP

- **Direct API access is faster** - No protocol translation overhead
- **Agent unavailable** - Not all providers have ACP implementations
- **Simpler debugging** - Direct API calls are easier to troubleshoot

## Technical Details

### How ACP Communication Works

1. **Subprocess Launch**: tamamo-x-mcp spawns the agent as a subprocess
2. **Stdio Communication**: JSON-RPC 2.0 messages over stdin/stdout
3. **Protocol Flow**:
   ```
   initialize → session/new → session/prompt (repeated)
   ```
4. **Streaming Updates**: Agent sends `session/update` notifications
5. **Result Collection**: Aggregate message chunks into final response

### Configuration Schema

```typescript
{
  type: "acp",
  agentCommand: string,      // Path to agent executable
  agentArgs?: string[],      // Optional command-line arguments
  model?: string             // Optional model identifier
}
```

### Security Considerations

- ✅ **No credentials in config** - Agents manage their own auth
- ✅ **Subprocess isolation** - Each agent runs in separate process
- ⚠️ **Agent trust** - Only use trusted agent executables
- ⚠️ **Path validation** - Ensure agent command paths are secure

## Troubleshooting

### "Agent command not found"

**Problem**: Specified agent executable doesn't exist
**Solution**: Use absolute paths or ensure agent is in PATH

```json
{
  "agentCommand": "/usr/local/bin/gemini" // Absolute path
}
```

### "Connection timeout"

**Problem**: Agent not responding to ACP protocol
**Solution**: Verify agent supports ACP and is properly installed

```bash
# Test agent manually
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | gemini
```

### "Authentication failed"

**Problem**: Agent requires authentication setup
**Solution**: Complete agent-specific auth flow first

```bash
# Example for Gemini CLI
gemini auth login
```

## Examples Repository

See `/examples/acp-agents/` for complete working examples:

- `gemini-cli/` - Gemini CLI configuration
- `ollama-local/` - Local LLM setup
- `custom-wrapper/` - Custom ACP agent template

## Resources

- [Agent Client Protocol Specification](https://agentclientprotocol.com/)
- [ACP GitHub Repository](https://github.com/agentclientprotocol/agent-client-protocol)
- [Gemini CLI Documentation](https://ai.google.dev/gemini-api/docs/cli)
- [Building Custom ACP Agents](https://agentclientprotocol.com/docs/building-agents)

## Contributing

Have you created an ACP-compatible agent? Submit a PR to add it to this guide!
