# MCP Protocol Contracts

**Feature**: 001-tool-grouping
**Date**: 2025-11-15

## Overview

This document defines how tamamo-x-mcp interacts with the Model Context Protocol (MCP) in both client and server modes. All interactions follow the official MCP specification.

## Client Mode (Tool Discovery)

Tamamo-x-mcp acts as an MCP client to discover tools from configured external MCP servers.

### 1. Connection Initialization

**Request**: `initialize`

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {}
    },
    "clientInfo": {
      "name": "tamamo-x-mcp",
      "version": "1.0.0"
    }
  }
}
```

**Response**:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {
        "listChanged": true
      }
    },
    "serverInfo": {
      "name": "example-mcp-server",
      "version": "1.0.0"
    }
  }
}
```

**Usage**: Called once per MCP server during `init` or `build` commands to establish connection.

---

### 2. Tool List Discovery

**Request**: `tools/list`

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "params": {}
}
```

**Response**:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "get_weather",
        "description": "Get current weather for a location",
        "inputSchema": {
          "type": "object",
          "properties": {
            "location": {
              "type": "string",
              "description": "City name or coordinates"
            }
          },
          "required": ["location"]
        }
      },
      {
        "name": "search_web",
        "description": "Search the web for information",
        "inputSchema": {
          "type": "object",
          "properties": {
            "query": {
              "type": "string",
              "description": "Search query"
            },
            "limit": {
              "type": "integer",
              "description": "Max results",
              "default": 10
            }
          },
          "required": ["query"]
        }
      }
    ]
  }
}
```

**Usage**: Called during `build` command to discover all available tools for grouping.

---

### 3. Tool Invocation (Runtime)

**Request**: `tools/call`

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "get_weather",
    "arguments": {
      "location": "San Francisco"
    }
  }
}
```

**Response** (Success):

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Weather in San Francisco: 18°C, partly cloudy"
      }
    ]
  }
}
```

**Response** (Error):

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "error": {
    "code": -32602,
    "message": "Invalid location parameter"
  }
}
```

**Usage**: Called by sub-agents during `mcp` server runtime when executing user requests.

---

## Server Mode (Sub-Agent Exposure)

Tamamo-x-mcp acts as an MCP server to expose grouped tools as specialized sub-agents.

### 4. Server Initialization

**Request** (from MCP client):

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {}
    },
    "clientInfo": {
      "name": "claude-code",
      "version": "1.0.0"
    }
  }
}
```

**Response** (from tamamo-x):

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {
        "listChanged": false
      }
    },
    "serverInfo": {
      "name": "tamamo-x-mcp",
      "version": "1.0.0"
    }
  }
}
```

---

### 5. Sub-Agent Tool List

**Request**:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "params": {}
}
```

**Response**:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "web_research_agent",
        "description": "Specialized agent for web research tasks. Can search, scrape, and analyze web content.",
        "inputSchema": {
          "type": "object",
          "properties": {
            "task": {
              "type": "string",
              "description": "Research task description"
            }
          },
          "required": ["task"]
        }
      },
      {
        "name": "data_analysis_agent",
        "description": "Specialized agent for data analysis. Can process, visualize, and derive insights from data.",
        "inputSchema": {
          "type": "object",
          "properties": {
            "task": {
              "type": "string",
              "description": "Analysis task description"
            },
            "data": {
              "type": "object",
              "description": "Data to analyze"
            }
          },
          "required": ["task"]
        }
      }
    ]
  }
}
```

**Note**: Each sub-agent is exposed as a single MCP tool. The agent internally routes requests to its grouped tools.

---

### 6. Sub-Agent Invocation

**Request**:

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "web_research_agent",
    "arguments": {
      "task": "Find the latest TypeScript best practices for 2025"
    }
  }
}
```

**Response**:

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Based on my research using web search and content analysis tools:\n\n1. TypeScript 5.x features...\n2. Recommended patterns...\n\nTools used: search_web, fetch_url, extract_content"
      }
    ],
    "isError": false
  }
}
```

**Behavior**:

1. Sub-agent receives task via MCP protocol
2. Agent uses LLM to plan which grouped tools to invoke
3. Agent executes tools via original MCP clients
4. Agent aggregates results and returns via MCP protocol

---

## Error Handling

### Error Codes

| Code   | Meaning          | Example Scenario        |
| ------ | ---------------- | ----------------------- |
| -32700 | Parse error      | Malformed JSON          |
| -32600 | Invalid request  | Missing required fields |
| -32601 | Method not found | Unknown MCP method      |
| -32602 | Invalid params   | Wrong parameter types   |
| -32603 | Internal error   | Tool execution failure  |

### Error Response Format

```json
{
  "jsonrpc": "2.0",
  "id": 123,
  "error": {
    "code": -32603,
    "message": "Tool execution failed",
    "data": {
      "toolName": "get_weather",
      "details": "API rate limit exceeded"
    }
  }
}
```

---

## Protocol Compliance

### Required Methods (Client Mode)

- ✅ `initialize` - Connection establishment
- ✅ `tools/list` - Tool discovery
- ✅ `tools/call` - Tool invocation

### Required Methods (Server Mode)

- ✅ `initialize` - Accept client connections
- ✅ `tools/list` - Expose sub-agents as tools
- ✅ `tools/call` - Route requests to sub-agents

### Optional Methods

- ⚠️ `notifications/tools/list_changed` - Not implemented (static tool list)
- ⚠️ `resources/*` - Not implemented (no resource management)
- ⚠️ `prompts/*` - Not implemented (no prompt templates)

---

## Transport Support

### stdio (Supported)

- **Client**: Spawn server process, communicate via stdin/stdout
- **Server**: Accept connections via stdin, respond via stdout

### HTTP (Supported)

- **Client**: POST requests to server URL
- **Server**: HTTP server listening on configured port

### WebSocket (Supported)

- **Client**: WebSocket connection to server URL
- **Server**: WebSocket server listening on configured port

---

## Contract Testing

All protocol interactions MUST be validated with contract tests:

```typescript
// Test: Client can discover tools
Deno.test("MCP client discovers tools from server", async () => {
  const client = new MCPClient({ transport: "stdio", command: "test-server" });
  await client.initialize();
  const tools = await client.listTools();

  assertEquals(tools.length > 0, true);
  assertEquals(tools[0].name, "example_tool");
  assertEquals(tools[0].inputSchema.type, "object");
});

// Test: Server exposes sub-agents correctly
Deno.test("MCP server exposes sub-agents as tools", async () => {
  const server = await startMCPServer({ port: 3000 });
  const client = new MCPClient({ transport: "http", url: "http://localhost:3000" });

  const tools = await client.listTools();
  const agent = tools.find((t) => t.name.endsWith("_agent"));

  assertEquals(agent !== undefined, true);
  assertEquals(agent.description.includes("Specialized agent"), true);
});
```

---

## Protocol Contracts Complete

All MCP interactions documented. Ready for implementation and contract testing.
