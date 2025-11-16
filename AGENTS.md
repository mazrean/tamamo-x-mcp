# Repository Guidelines

## Project Structure & Module Organization

Core logic lives under `src`; `src/cli/main.ts` is the entrypoint, with `src/mcp`, `src/agents`, `src/grouping`, `src/config`, `src/types`, and `src/llm` covering their named responsibilities. Tests live in `tests` with the obvious buckets (`unit`, `integration`, `ci`, `distribution`, `fixtures`). Builds land in `dist`, and reference specs stay in `specs`. Touch `tamamo-x.config.json` only when adding or tuning MCP servers.

## Build, Test, and Development Commands

Stick with the existing Deno tasks. `deno task compile` builds the standalone binary into `dist/tamamo-x`, and `deno task npm:build` regenerates the npm bundle. `deno task fmt`, `deno task lint`, and `deno task test` handle formatting, static analysis, and the full suite; target directories with `deno test tests/unit` when you need speed. Run the matching task every time you touch the related code.

## Coding Style & Naming Conventions

The formatter is the law: two-space indent, 100-character lines, double quotes, mandatory semicolons. Run `deno fmt` before you push. TypeScript is strict everywhere—no implicit any, no lazy null checks. Use PascalCase for types and classes, camelCase for functions and variables, SCREAMING_SNAKE_CASE only for actual constants.

## Testing Guidelines

Tests belong in `tests`, with filenames mirroring the module under test (`foo.test.ts` wins). Use fixtures from `tests/fixtures` instead of inventing inline data. `deno task test` runs everything; narrow the blast radius with directory-specific runs when needed. Cover every path you change, or expect the patch to be bounced.

## Commit & Pull Request Guidelines

Commits follow Conventional Commits; the history already shows `feat:`, `fix:`, and optional ticket tags like `(T017)`. Keep commits focused and subjects imperative. Pull requests need a direct summary, the reason for the change, and proof of testing. Link issues or task IDs, include screenshots for user-facing tweaks, and highlight config updates.

## Agent & Configuration Notes

Agent behavior hangs off the definitions in `src/agents` and the wiring in `tamamo-x.config.json`. When introducing a new agent or MCP server, document the name, transport, and credentials in both config and code. Keep per-developer secrets out of the repo; rely on environment variables instead.
