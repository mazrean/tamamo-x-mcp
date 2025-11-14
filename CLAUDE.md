# tamamo-x-mcp Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-15

## Active Technologies

- TypeScript (strict mode), targeting Deno 2.x and Node.js 20+ + Mastra (agent framework), @modelcontextprotocol/sdk, official LLM SDKs (@anthropic-ai/sdk, openai, @google/generative-ai, ai, @aws-sdk/client-bedrock-runtime) (001-tool-grouping)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript (strict mode), targeting Deno 2.x and Node.js 20+: Follow standard conventions

## Recent Changes

- 001-tool-grouping: Added TypeScript (strict mode), targeting Deno 2.x and Node.js 20+ + Mastra (agent framework), @modelcontextprotocol/sdk, official LLM SDKs (@anthropic-ai/sdk, openai, @google/generative-ai, ai, @aws-sdk/client-bedrock-runtime)

<!-- MANUAL ADDITIONS START -->
## Development Guidelines

You are working on a project that follows these strict development practices:

### Development Methodology
- Follow t-wada's TDD (Test-Driven Development) approach
- Make one commit per completed task

### Task Completion Requirements
After completing each task, you **MUST** perform ALL of the following steps in order:

1. **Code Quality Checks**
   - Run build process
   - Run lint checks
   - Run all tests

2. **Functional Verification**
   - Perform manual functionality testing to confirm the feature works as expected

3. **Pre-Documentation Update Steps**
   - Conduct code review using Codex MCP
   - Verify completion criteria with the project-planner sub-agent

4. **Documentation Update**
   - Update task progress in `docs/llm/PLAN.md`

### Important Notes
- Do NOT skip any of these steps
- Do NOT update `docs/llm/PLAN.md` until steps 1-3 are completed
- Always perform these steps in the specified order
<!-- MANUAL ADDITIONS END -->
