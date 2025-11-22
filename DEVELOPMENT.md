# Development Guide

This guide provides instructions for contributing to tamamo-x-mcp development.

**User Documentation**:

- **[Getting Started](docs/getting-started.md)**: Tutorial for new users
- **[Usage Guide](docs/usage.md)**: Configuration reference
- **[Use Cases](docs/use-cases.md)**: Example configurations
- **[Troubleshooting](docs/troubleshooting.md)**: Common issues and solutions

## Table of Contents

- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Build](#build)
- [Project Structure](#project-structure)
- [Contributing](#contributing)

## Prerequisites

- **Deno 2.x** installed ([installation guide](https://deno.com/manual/getting_started/installation))
- **Git** for version control
- **Node.js 20+** (optional, for npm package testing)

## Setup

### Clone Repository

```bash
git clone https://github.com/mazrean/tamamo-x-mcp.git
cd tamamo-x-mcp
```

### Install Dependencies

Deno automatically manages dependencies. No explicit installation required.

### Verify Setup

```bash
# Run tests
deno test --allow-all

# Lint code
deno lint

# Format code
deno fmt

# Type check
deno check src/**/*.ts
```

## Development Workflow

### TDD Approach

This project follows **t-wada's TDD (Test-Driven Development)** methodology:

1. **Red**: Write a failing test for new functionality
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Improve code while keeping tests green

### One Commit Per Task

Make **one commit per completed task** with:

- All tests passing
- Linting and formatting applied
- Code reviewed (using Codex MCP if available)

### Task Completion Checklist

After completing each task, perform these steps **in order**:

#### 1. Code Quality Checks

```bash
# Run build process
deno task compile

# Run lint checks
deno lint

# Run all tests
deno test --allow-all
```

#### 2. Functional Verification

Manually test the feature to confirm it works as expected.

#### 3. Pre-Documentation Update Steps

- Conduct code review using Codex MCP
- Verify completion criteria with project-planner sub-agent

#### 4. Documentation Update

Update task progress in project documentation as needed.

**IMPORTANT**: Do NOT skip any steps or update documentation before completing steps 1-3.

## Testing

### Run All Tests

```bash
deno test --allow-all
```

### Run Specific Test Suite

```bash
# Unit tests
deno test --allow-all tests/unit/

# Integration tests
deno test --allow-all tests/integration/

# Distribution tests
deno test --allow-all tests/distribution/

# CI enforcement tests
deno test --allow-all tests/ci/
```

### Run Specific Test File

```bash
deno test --allow-all tests/unit/config/loader_test.ts
```

### Test with Coverage

```bash
# Generate coverage report
deno test --allow-all --coverage=cov_profile

# View coverage summary
deno coverage cov_profile

# Generate LCOV report (for IDE integration)
deno coverage cov_profile --lcov --output=cov_profile.lcov
```

### Coverage Requirements

- **Minimum Coverage**: ≥80% for all modules
- **CI Enforcement**: Coverage reports uploaded to Codecov

### Local CI Testing

Use [act](https://github.com/nektos/act) to test GitHub Actions workflows locally:

```bash
# Install act
brew install act  # macOS
# or follow instructions at https://github.com/nektos/act

# Run full CI workflow
act push

# Run specific job
act -j quality-gates
act -j test-matrix
act -j distribution-tests
```

See [.github/TESTING.md](.github/TESTING.md) for detailed testing instructions.

## Build

### Compile Standalone Binary

```bash
deno task compile
```

Output: `dist/tamamo-x` (platform-specific executable)

### Build npm Package

```bash
deno task npm:build
```

Output: `npm/` directory with package files

### Verify Distribution Parity

```bash
# Test both distributions have identical functionality
deno test --allow-all tests/distribution/
```

## Project Structure

```
tamamo-x-mcp/
├── src/                      # Source code
│   ├── cli/                  # CLI commands
│   │   ├── main.ts           # CLI entry point
│   │   └── commands/         # Command implementations
│   │       ├── init.ts       # Init command
│   │       ├── build.ts      # Build command
│   │       └── mcp.ts        # MCP server command
│   ├── config/               # Configuration management
│   │   ├── loader.ts         # Config file loading/saving
│   │   └── validator.ts      # Config validation
│   ├── mcp/                  # MCP protocol client/server
│   │   ├── discovery.ts      # Tool discovery from MCP servers
│   │   └── server.ts         # MCP server for exposing sub-agents
│   ├── grouping/             # LLM-based tool grouping logic
│   │   ├── grouper.ts        # Grouping algorithm
│   │   └── validator.ts      # Group constraint validation
│   ├── llm/                  # Multi-provider LLM abstraction
│   │   ├── client.ts         # Unified LLM client interface
│   │   ├── credentials.ts    # Credential discovery
│   │   └── providers/        # Provider-specific implementations
│   │       ├── anthropic.ts
│   │       ├── openai.ts     # Also handles OpenRouter
│   │       ├── gemini.ts
│   │       ├── vercel.ts
│   │       └── bedrock.ts
│   ├── agents/               # Sub-agent execution and routing
│   └── types/                # TypeScript type definitions
│       └── index.ts          # Central type exports
├── tests/                    # Test suites
│   ├── unit/                 # Per-module unit tests
│   │   ├── config/           # Config module tests
│   │   ├── mcp/              # MCP module tests
│   │   ├── grouping/         # Grouping module tests
│   │   ├── llm/              # LLM module tests
│   │   └── agents/           # Agents module tests
│   ├── integration/          # Multi-module integration tests
│   ├── distribution/         # Distribution parity tests
│   ├── ci/                   # CI enforcement meta-tests
│   └── fixtures/             # Test data
│       ├── configs/          # Mock configuration files
│       ├── tools/            # Mock MCP tools
│       └── responses/        # Mock LLM responses
├── .github/                  # GitHub Actions workflows
│   └── workflows/
│       └── ci.yml            # Main CI workflow
├── specs/001-tool-grouping/  # Feature specification
│   ├── spec.md               # Feature requirements
│   ├── plan.md               # Implementation roadmap
│   ├── data-model.md         # Entity definitions
│   ├── research.md           # Technical decisions
│   ├── quickstart.md         # User guide
│   └── contracts/            # API contracts & schemas
├── docs/                     # User documentation
│   └── usage.md              # Detailed usage guide
├── deno.json                 # Deno configuration
├── deno.lock                 # Dependency lock file
├── README.md                 # Project overview
├── DEVELOPMENT.md            # This file
└── LICENSE                   # MIT license
```

## Contributing

We welcome contributions! Please follow these guidelines:

### Quick Contribution Checklist

- [ ] Follow TDD workflow (test-first development)
- [ ] Run `deno lint` before committing
- [ ] Run `deno fmt` before committing
- [ ] Ensure all tests pass (`deno test --allow-all`)
- [ ] Maintain ≥80% test coverage
- [ ] Follow constitution requirements (see `.specify/memory/constitution.md`)
- [ ] One commit per completed task

### Code Style

- **TypeScript**: Strict mode with all strict flags enabled
- **Formatting**: Use `deno fmt` (no configuration needed)
- **Linting**: Use `deno lint` (enforced in CI)
- **Naming Conventions**:
  - Files: `snake_case.ts` for modules, `PascalCase.ts` for classes
  - Variables/Functions: `camelCase`
  - Types/Interfaces: `PascalCase`
  - Constants: `UPPER_SNAKE_CASE`

### Commit Messages

Follow conventional commit format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**:

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `test`: Test changes
- `docs`: Documentation changes
- `chore`: Build/tooling changes

**Examples**:

```
feat(grouping): implement LLM-based tool analysis

Add LLMToolAnalyzer class that uses provider-agnostic LLM client
to analyze tool descriptions and generate semantic groupings.

Closes #42
```

```
fix(config): validate credential source enum values

Ensure credentialSource only accepts valid values: cli-tool, env-var, explicit.

Resolves #58
```

### Pull Request Process

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feat/my-feature`)
3. **Commit** changes following commit message conventions
4. **Push** to your fork (`git push origin feat/my-feature`)
5. **Open** a pull request with:
   - Clear description of changes
   - Reference to related issues
   - Test coverage report
   - Screenshots (if UI changes)

### Development Scripts

```bash
# Run tests with watch mode
deno test --allow-all --watch

# Format and lint
deno task fmt
deno task lint

# Type check
deno check src/**/*.ts

# Build standalone binary
deno task compile

# Build npm package
deno task npm:build
```

### CI/CD Workflows

#### Continuous Integration (`.github/workflows/ci.yml`)

Runs automatically on:

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Steps:**

1. **Format Check**: `deno fmt --check`
2. **Lint**: `deno lint`
3. **Type Check**: `deno check src/**/*.ts` (with bash shell for cross-platform glob expansion)
4. **Unit Tests**: `deno test --allow-all tests/unit/`
5. **Integration Tests**: `deno test --allow-all tests/integration/`
6. **Distribution Tests**: `deno test --allow-all tests/distribution/`
7. **CI Tests**: `deno test --allow-all tests/ci/`
8. **Coverage**: Test coverage report (Ubuntu only)
9. **Build**: Compiles Deno binary and npm package

**Platforms**: Tests run in parallel on Ubuntu, macOS, and Windows

#### Release Workflow (`.github/workflows/release.yml`)

Triggers automatically when you push a version tag (e.g., `v1.0.0`)

**Built Artifacts:**

- **Linux x86_64** (`tamamo-x-mcp-linux-x64`)
- **Linux ARM64** (`tamamo-x-mcp-linux-arm64`)
- **macOS Intel** (`tamamo-x-mcp-darwin-x64`) - built on `macos-13`
- **macOS Apple Silicon** (`tamamo-x-mcp-darwin-arm64`) - built on `macos-14`
- **Windows x86_64** (`tamamo-x-mcp-windows-x64.exe`)
- **npm package** (published to npm registry)

**Release Steps:**

1. **Build Binaries**: Compiles standalone binaries for all platforms
2. **Build npm Package**: Creates npm package for Node.js users
3. **Create Release**: Creates GitHub Release with all binaries and SHA256 checksums
4. **Publish npm**: Publishes package to npm registry

#### Creating a Release

**Prerequisites:**

This project uses **npm Trusted Publishers** (Provenance) for secure, automated publishing from GitHub Actions.

**Initial Setup:**

1. **For First-Time Publication** (package doesn't exist on npm):
   - Create an npm automation token (Classic Token) at https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Add `NPM_TOKEN` to GitHub repository secrets:
     - Settings → Secrets and variables → Actions
     - Create new secret named `NPM_TOKEN`
   - Perform first release (see Release Process below)

2. **After First Successful Publish:**
   - **IMPORTANT**: Delete the `NPM_TOKEN` secret from GitHub repository:
     - Settings → Secrets and variables → Actions → NPM_TOKEN → Remove
   - From this point forward, the workflow will use OIDC authentication automatically
   - No npm token required for subsequent releases

**How Trusted Publishers (OIDC) Works:**

- When `NPM_TOKEN` is **not set**, npm automatically uses GitHub Actions OIDC tokens
- Workflow has `id-token: write` permission to request OIDC tokens
- Publishes with `--provenance` flag for cryptographic proof of origin
- Package includes signed attestation linking it to this specific repository
- More secure than long-lived tokens (no token storage, automatic rotation)

**Important Notes:**

- If `NPM_TOKEN` exists, it takes precedence over OIDC (defeating Trusted Publishers)
- Remove the token after first publish to enable true OIDC authentication
- First publish requires token because package doesn't exist yet on npm

**Release Process:**

1. **Update Version** in `deno.json`:
   ```json
   {
     "version": "1.0.0"
   }
   ```

2. **Commit and Tag**:
   ```bash
   git add deno.json
   git commit -m "chore: bump version to 1.0.0"
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. **Monitor**: Check the Actions tab on GitHub for build progress

**What Gets Released:**

- GitHub Release with all binaries and checksums
- npm package published to registry
- Auto-generated release notes

#### Troubleshooting CI/CD

**Release Fails:**

- **Binary compilation fails**: Check Deno version compatibility and platform support
- **npm publish fails**:
  - For first-time publish: Verify `NPM_TOKEN` secret is set correctly
  - For subsequent publishes with OIDC: Ensure `NPM_TOKEN` secret has been removed
  - If `NPM_TOKEN` still exists, OIDC won't activate (remove the secret)
  - Ensure version isn't already published on npm
  - Check that workflow has `id-token: write` permission for provenance

**CI Fails:**

- **Tests fail on Windows**: Ensure file paths use forward slashes and globs work cross-platform
- **Type check fails**: Run `deno check src/**/*.ts` locally to reproduce

#### Architecture Notes

**Cross-Platform Compatibility:**

- All build scripts use `shell: bash` for consistency across Windows/macOS/Linux
- Type check step explicitly uses bash to expand glob patterns on Windows
- macOS builds use specific runners: `macos-13` (Intel) and `macos-14` (Apple Silicon)
- Explicitly creates `dist/` directory before compilation

**Security:**

- No credentials stored in repository or config files
- Uses npm Trusted Publishers (Provenance) with OIDC tokens (after initial publish)
- Long-lived npm token only required for first publish, then removed
- Cryptographic proof of package origin via signed attestations
- OIDC tokens are short-lived and automatically rotated
- All binary artifacts include SHA256 checksums

### Branch Protection Rules

See [.github/BRANCH_PROTECTION.md](.github/BRANCH_PROTECTION.md) for required branch protection settings.

### Constitution Requirements

This project follows constitution-based development. See `.specify/memory/constitution.md` for:

- Core principles
- Quality standards
- Development practices
- Review requirements

## Troubleshooting

### Common Issues

**Issue**: `deno test` fails with permission errors

**Solution**: Ensure you're using `--allow-all` flag:

```bash
deno test --allow-all
```

**Issue**: `deno task compile` fails

**Solution**: Check Deno version (requires 2.x):

```bash
deno --version
```

**Issue**: Tests fail in CI but pass locally

**Solution**: Run local CI testing with `act`:

```bash
act push
```

### Getting Help

- **Issues**: [GitHub Issues](https://github.com/mazrean/tamamo-x-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/mazrean/tamamo-x-mcp/discussions)
- **Documentation**: [specs/001-tool-grouping/](specs/001-tool-grouping/)

## License

MIT License - see [LICENSE](LICENSE) for details.
