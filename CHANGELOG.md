# Changelog

All notable changes to tamamo-x-mcp will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Versioning Strategy

This project follows **Semantic Versioning** (SemVer): `MAJOR.MINOR.PATCH`

- **MAJOR** (X.0.0): Incompatible API changes, breaking configuration format
  changes, breaking CLI interface changes
- **MINOR** (X.Y.0): New features in a backwards-compatible manner, new LLM
  provider support
- **PATCH** (X.Y.Z): Backwards-compatible bug fixes, documentation updates,
  performance improvements

**Pre-1.0 Note**: While the project is in `0.y.z` versions, breaking changes may
occur in minor versions. Full SemVer compatibility guarantees apply starting
from version `1.0.0`.

### Version Compatibility Guarantees (1.0.0+)

These guarantees apply **after** the `1.0.0` release. During `0.y.z` development:

- **Configuration files** (`tamamo-x.config.json`): May change between minor
  versions; migration guides provided when needed
- **MCP protocol**: Follows MCP specification versioning independently
- **CLI commands**: May change between minor versions during pre-1.0 development
- **Distribution parity**: Both Deno binary and npm package will always have
  identical version numbers and features (enforced in all versions)

## [Unreleased]

### Added

- **Configuration Management**
  - `tamamo-x-mcp init`: Interactive configuration setup
  - Support for importing MCP servers from `.mcp.json`
  - Auto-detection of project context files (`Agent.md`, `CLAUDE.md`)
  - Configuration validation with JSON Schema

- **Tool Discovery**
  - MCP client supporting stdio, HTTP, and WebSocket transports
  - Parallel tool discovery from multiple MCP servers
  - Graceful error handling for unavailable servers

- **LLM-Powered Tool Grouping**
  - Automatic tool analysis and grouping using LLM
  - Configurable grouping constraints (3-10 groups, 5-20 tools per group)
  - Project context-aware grouping
  - Performance optimization: batch LLM requests (10 tools per request)

- **Sub-Agent System**
  - Mastra-based agent orchestration
  - MCP server exposing grouped sub-agents
  - Request routing to specialized agents by ID

- **Multi-Provider LLM Support**
  - Anthropic (Claude 3.5 Sonnet)
  - OpenAI (GPT-4o)
  - Google Gemini (Gemini 2.0 Flash)
  - Vercel AI SDK
  - AWS Bedrock
  - OpenRouter
  - Automatic credential discovery from CLI tools

- **Dual Distribution**
  - Deno standalone binary (zero dependencies)
  - npm package for Node.js 20+ compatibility
  - Feature parity validation in CI

- **Quality Assurance**
  - Comprehensive test coverage (≥80%)
  - TDD workflow enforcement
  - Automated quality gates: lint, format, type-check
  - Cross-platform testing: Linux, macOS, Windows

- **CI/CD**
  - GitHub Actions workflows for CI, release, and distribution validation
  - Automated dependency updates via Dependabot
  - Branch protection rules enforcement

- **Documentation**
  - README with installation and usage guide
  - CONTRIBUTING with TDD workflow and quality gates
  - LICENSE (MIT)
  - CHANGELOG with versioning strategy

### Security

- Credentials never stored in configuration files
- Credential discovery from secure CLI tool storage
- Environment variable fallback for API keys

## Upcoming Releases

### [0.2.0] - Future

Planned features:

- Agent memory and conversation history
- Custom grouping strategies via plugins
- Web UI for configuration and monitoring
- Additional MCP transport support
- Enhanced project context analysis

### [1.0.0] - Future

Production-ready release with:

- Stable API and configuration format
- Performance benchmarks and optimization
- Comprehensive documentation and tutorials
- Community feedback integration

---

## How to Read This Changelog

### Categories

- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security improvements

### Version Format

- **[X.Y.Z]**: Released version with date
- **[Unreleased]**: Changes committed but not yet released
- **TBD**: To be determined (release date not set)

---

For detailed release information, see the project's GitHub Releases page once
published.
