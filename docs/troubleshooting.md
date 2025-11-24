# Troubleshooting Guide

This guide helps you diagnose and fix common issues with tamamo-x-mcp.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Configuration Problems](#configuration-problems)
- [LLM Provider Errors](#llm-provider-errors)
- [MCP Server Issues](#mcp-server-issues)
- [Tool Grouping Problems](#tool-grouping-problems)
- [Runtime Errors](#runtime-errors)

## Installation Issues

### Binary Won't Execute

**Symptom**:

```bash
./dist/tamamo-x --version
# bash: ./dist/tamamo-x: Permission denied
```

**Solution**:

```bash
# Make binary executable
chmod +x ./dist/tamamo-x

# Verify
./dist/tamamo-x --version
```

### Deno Version Error

**Symptom**:

```bash
deno task compile
# error: Unsupported Deno version
```

**Solution**:

```bash
# Check Deno version
deno --version

# Upgrade to Deno 2.x
deno upgrade
```

### Build Fails with Import Errors

**Symptom**:

```bash
deno task compile
# error: Module not found "jsr:@std/path@^1.0.0"
```

**Solution**:

```bash
# Clear Deno cache
deno cache --reload src/cli/main.ts

# Rebuild
deno task compile
```

## Configuration Problems

### "No configuration file found"

**Symptom**:

```bash
./dist/tamamo-x build
# Error: No configuration file found at ./tamamo-x.config.json
```

**Solution**:

```bash
# Run init command first
./dist/tamamo-x init

# Or create manually
cat > tamamo-x.config.json <<EOF
{
  "version": "1.0.0",
  "mcpServers": [],
  "llmProvider": {
    "type": "anthropic"
  }
}
EOF
```

### "Invalid configuration version"

**Symptom**:

```bash
./dist/tamamo-x build
# Error: Invalid configuration version. Expected "1.0.0", got "0.9.0"
```

**Solution**:

Update `version` field in `tamamo-x.config.json`:

```json
{
  "version": "1.0.0",
  ...
}
```

## LLM Provider Errors

### "No credentials found for provider"

**Symptom**:

```bash
./dist/tamamo-x build
# Error: No credentials found for provider: anthropic
```

**Solutions**:

#### For Anthropic (Claude)

**Option 1: CLI Tool Discovery**

```bash
# Check if Claude Code credentials exist
cat ~/.config/claude/credentials.json

# If missing, set up Claude Code or use env var
```

**Option 2: Environment Variable**

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
./dist/tamamo-x build
```

#### For OpenAI

**Option 1: CLI Tool Discovery**

```bash
# Check if Codex credentials exist
cat ~/.codex/auth.json

# Should contain: {"OPENAI_API_KEY": "sk-..."}
```

**Option 2: Environment Variable**

```bash
export OPENAI_API_KEY="sk-..."
./dist/tamamo-x build
```

#### For Gemini

**Option 1: Environment Variable**

```bash
export GOOGLE_API_KEY="AIza..."
./dist/tamamo-x build
```

**Option 2: gcloud CLI**

```bash
# Authenticate with gcloud
gcloud auth application-default login

# Verify credentials
cat ~/.config/gcloud/application_default_credentials.json
```

### "API rate limit exceeded"

**Symptom**:

```bash
./dist/tamamo-x build
# Error: Rate limit exceeded for API
```

**Solutions**:

**Wait and Retry**:

```bash
# Wait 60 seconds
sleep 60
./dist/tamamo-x build
```

**Switch Provider**:

```json
{
  "llmProvider": {
    "type": "openai" // Try different provider
  }
}
```

**Reduce Batch Size** (if supported in future versions):

```json
{
  "groupingConstraints": {
    "minToolsPerGroup": 10,
    "maxToolsPerGroup": 30
  }
}
```

### "Invalid API key format"

**Symptom**:

```bash
./dist/tamamo-x build
# Error: Invalid API key format
```

**Solution**:

Verify key format:

- **Anthropic**: Should start with `sk-ant-`
- **OpenAI**: Should start with `sk-`
- **Gemini**: Should start with `AIza`

```bash
# Check your key
echo $ANTHROPIC_API_KEY | head -c 10
# Should output: sk-ant-...
```

## MCP Server Issues

### "MCP server not responding"

**Symptom**:

```bash
./dist/tamamo-x build
# Error: MCP server 'filesystem' not responding
```

**Diagnosis**:

```bash
# Test server manually
mcp-server-filesystem --root .

# If command not found, server is not installed
```

**Solution**:

```bash
# Install the MCP server
npm install -g @modelcontextprotocol/server-filesystem

# Verify installation
which mcp-server-filesystem

# Update config with full path if needed
{
  "mcpServers": [{
    "command": "/usr/local/bin/mcp-server-filesystem",
    "args": ["--root", "."]
  }]
}
```

### "No tools discovered"

**Symptom**:

```bash
./dist/tamamo-x build
# ✓ Connected to 2 MCP servers
# ✓ Discovered 0 tools
# Error: No tools to group
```

**Diagnosis**:

Check MCP server output:

```bash
# Run server directly
mcp-server-filesystem --root .

# Should output tool definitions
```

**Solutions**:

**Check Server Configuration**:

```json
{
  "mcpServers": [{
    "name": "filesystem",
    "transport": "stdio", // Verify transport type
    "command": "mcp-server-filesystem",
    "args": ["--root", "."] // Verify arguments
  }]
}
```

**Verify Server Permissions**:

```bash
# Check directory permissions
ls -la .

# Ensure MCP server can read directory
```

### "Connection timeout"

**Symptom**:

```bash
./dist/tamamo-x build
# Error: Connection timeout: MCP server did not respond within 30s
```

**Solution**:

```bash
# Check if server process hangs
mcp-server-filesystem --root . &
ps aux | grep mcp-server

# Kill hung processes
killall mcp-server-filesystem

# Retry
./dist/tamamo-x build
```

## Tool Grouping Problems

### "Failed to create groups: constraints not satisfied"

**Symptom**:

```bash
./dist/tamamo-x build
# Error: Failed to create groups: Cannot satisfy constraints with 12 tools
```

**Diagnosis**:

You have too few tools for the grouping constraints.

**Solution**:

Adjust constraints in `tamamo-x.config.json`:

```json
{
  "groupingConstraints": {
    "minToolsPerGroup": 3, // Lower minimum
    "maxToolsPerGroup": 15,
    "minGroups": 2, // Lower minimum
    "maxGroups": 5
  }
}
```

### "Groups are not meaningful"

**Symptom**:

Generated groups don't make sense for your project.

**Solutions**:

**Add Project Context**:

Create `Agent.md`:

```markdown
# Project Context

This is a web development project using:

- Frontend: React
- Backend: Node.js + Express
- Database: PostgreSQL

Prefer grouping by:

- Feature modules (auth, users, products)
- Layer separation (frontend, backend, database)
```

**Adjust Constraints**:

```json
{
  "groupingConstraints": {
    "minToolsPerGroup": 5, // Increase for more specific groups
    "maxToolsPerGroup": 15, // Decrease for more focused groups
    "minGroups": 4, // Increase for more separation
    "maxGroups": 8
  }
}
```

**Rebuild**:

```bash
./dist/tamamo-x build
```

### "Some tools are missing from groups"

**Symptom**:

Expected tools don't appear in any group.

**Diagnosis**:

Tools may appear in multiple groups or be filtered out.

**Solution**:

Check all groups:

```bash
# List all tools in all groups
for dir in .tamamo-x/groups/*/; do
  echo "=== $(basename $dir) ==="
  cat "$dir/group.json" | grep -A 10 '"tools"'
done
```

## Runtime Errors

### "Port already in use" (MCP Server)

**Symptom**:

```bash
./dist/tamamo-x mcp
# Error: Address already in use
```

**Solution**:

```bash
# Find process using the port
lsof -i :3000

# Kill the process
kill -9 <PID>

# Restart
./dist/tamamo-x mcp
```

### "Memory limit exceeded"

**Symptom**:

```bash
./dist/tamamo-x build
# Error: JavaScript heap out of memory
```

**Solution**:

```bash
# Increase Deno memory limit
deno task compile --v8-flags=--max-old-space-size=4096

# Or split into smaller batches (reduce maxGroups)
```

### "Unexpected EOF"

**Symptom**:

```bash
./dist/tamamo-x build
# Error: Unexpected end of JSON input
```

**Solution**:

```bash
# Check config file syntax
deno eval 'JSON.parse(await Deno.readTextFile("tamamo-x.config.json"))'

# Fix JSON syntax errors
vim tamamo-x.config.json
```

## Getting Help

### Enable Debug Logging

```bash
# Set log level
export LOG_LEVEL=debug
./dist/tamamo-x build
```

### Check System Info

```bash
# Deno version
deno --version

# Binary info
file ./dist/tamamo-x

# OS info
uname -a
```

### Create Issue Report

When reporting issues, include:

1. **Environment**:
   - OS and version
   - Deno version
   - tamamo-x-mcp version

2. **Configuration**:
   - `tamamo-x.config.json` (redact credentials)
   - MCP servers installed
   - LLM provider used

3. **Error Output**:
   - Full error message
   - Debug logs if available

4. **Steps to Reproduce**:
   - Commands executed
   - Expected vs actual behavior

### Useful Diagnostic Commands

```bash
# Check config validity
deno eval 'console.log(JSON.parse(await Deno.readTextFile("tamamo-x.config.json")))'

# List MCP servers
which mcp-server-filesystem
which mcp-server-github

# Test LLM credentials
echo $ANTHROPIC_API_KEY | wc -c  # Should be ~100+ chars

# Check output directory
ls -la .tamamo-x/

# Validate group JSON
deno eval 'console.log(JSON.parse(await Deno.readTextFile(".tamamo-x/groups/group-1/group.json")))'
```

## Common Workflows

### Reset Everything

```bash
# Remove configuration
rm tamamo-x.config.json

# Remove generated groups
rm -rf .tamamo-x/

# Reinitialize
./dist/tamamo-x init
./dist/tamamo-x build
```

### Update Configuration

```bash
# Edit config
vim tamamo-x.config.json

# Validate
deno eval 'JSON.parse(await Deno.readTextFile("tamamo-x.config.json"))'

# Rebuild groups
./dist/tamamo-x build
```

### Test Single MCP Server

```bash
# Test server connectivity
mcp-server-filesystem --root . &
sleep 2
kill %1

# If successful, add to config
```

## Still Having Issues?

- **[Getting Started Guide](getting-started.md)**: Complete setup tutorial
- **[Usage Guide](usage.md)**: Detailed configuration reference
- **[Use Cases](use-cases.md)**: Example configurations

For persistent issues, please refer to the project repository for support.
