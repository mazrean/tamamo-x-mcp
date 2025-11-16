# Contributing to tamamo-x-mcp

Thank you for your interest in contributing to tamamo-x-mcp! This document provides guidelines and workflows for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Quality Gates](#quality-gates)
- [Pull Request Process](#pull-request-process)
- [Testing Strategy](#testing-strategy)
- [Commit Guidelines](#commit-guidelines)
- [Project Structure](#project-structure)

## Code of Conduct

This project follows a professional and respectful development environment. We expect all contributors to:

- Be respectful and constructive in discussions
- Focus on technical merit and code quality
- Help maintain project standards through code reviews
- Report issues and bugs with clear reproduction steps

## Getting Started

### Prerequisites

- **Deno 2.x** (primary runtime)
- **Node.js 20+** (for npm package testing)
- **Git** for version control

### Initial Setup

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/YOUR_USERNAME/tamamo-x-mcp.git
   cd tamamo-x-mcp
   ```

2. **Install Deno** (if not already installed)

   ```bash
   curl -fsSL https://deno.land/install.sh | sh
   ```

3. **Verify setup**

   ```bash
   deno task test
   deno task lint
   ```

## Development Workflow

This project follows **Test-Driven Development (TDD)** as a core principle. All contributions must adhere to this workflow.

### TDD Workflow (Non-Negotiable)

1. **RED**: Write failing tests first
2. **GREEN**: Implement minimum code to pass tests
3. **REFACTOR**: Improve code while keeping tests green

**Example**:

```typescript
// Step 1: RED - Write test first (tests/unit/config/loader_test.ts)
Deno.test("config loader handles invalid JSON", async () => {
  const tmpFile = await Deno.makeTempFile();
  await Deno.writeTextFile(tmpFile, "{ invalid json }");

  await assertRejects(
    async () => await loadConfig(tmpFile),
    Error,
    "Invalid JSON",
  );

  await Deno.remove(tmpFile);
});

// Step 2: Verify test FAILS
// $ deno test tests/unit/config/loader_test.ts
// FAILED (expected behavior)

// Step 3: GREEN - Implement feature (src/config/loader.ts)
export async function loadConfig(filePath: string): Promise<Configuration> {
  const content = await Deno.readTextFile(filePath);
  try {
    return JSON.parse(content);
  } catch (parseError) {
    throw new Error(`Invalid JSON in configuration file: ${parseError.message}`);
  }
}

// Step 4: Verify test PASSES
// $ deno test tests/unit/config/loader_test.ts
// PASSED

// Step 5: REFACTOR - Improve code if needed
```

### Feature Development Process

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Write tests first** (TDD RED phase)

   - Add test file in `tests/unit/` or `tests/integration/`
   - Run test to verify it fails: `deno test path/to/test.ts`

3. **Implement feature** (TDD GREEN phase)

   - Write minimal code to pass tests
   - Run test to verify it passes

4. **Refactor** (TDD REFACTOR phase)

   - Improve code quality while keeping tests green
   - Run full test suite: `deno task test`

5. **Run quality gates** (before commit)

   ```bash
   deno task lint    # Must pass with zero errors
   deno task fmt     # Auto-format code
   deno task test    # All tests must pass
   ```

6. **Commit changes** (see [Commit Guidelines](#commit-guidelines))

7. **Push and create Pull Request**

## Quality Gates

All contributions must pass these gates before merging:

### Automated Checks (CI Enforced)

| Gate                   | Command                         | Requirement                   |
| ---------------------- | ------------------------------- | ----------------------------- |
| **Linting**            | `deno lint`                     | Zero errors, zero warnings    |
| **Formatting**         | `deno fmt --check`              | Code follows Deno style guide |
| **Type Checking**      | `deno check src/cli/main.ts`    | No TypeScript errors          |
| **Unit Tests**         | `deno test tests/unit/`         | 100% pass rate                |
| **Integration Tests**  | `deno test tests/integration/`  | 100% pass rate                |
| **Distribution Tests** | `deno test tests/distribution/` | Feature parity validated      |

### Coverage Requirements

- **Minimum**: ≥80% code coverage (enforced by CI)
- **Measurement**: `deno coverage`
- **Note**: CI will fail if coverage drops below 80%

### Manual Quality Checks

Before submitting a PR:

1. **Run all quality gates locally**

   ```bash
   deno task lint
   deno task fmt
   deno task test
   ```

2. **Test both distributions**

   ```bash
   deno task compile              # Build Deno binary
   deno task npm:build            # Build npm package
   deno test tests/distribution/  # Verify parity
   ```

3. **Verify no regressions**

   - Test affected features manually
   - Ensure backward compatibility

## Pull Request Process

### Before Creating PR

- [ ] All tests pass locally
- [ ] Code is formatted (`deno fmt`)
- [ ] No lint errors (`deno lint`)
- [ ] Coverage meets minimum 80% (check with `deno coverage`)
- [ ] Commit messages follow conventions
- [ ] Branch is up-to-date with `main`

### PR Template

When creating a PR, include:

```markdown
## Description

Brief description of changes.

## Related Issue

Fixes #[issue number]

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed

## Checklist

- [ ] Code follows TDD workflow (tests written first)
- [ ] All quality gates pass locally
- [ ] Documentation updated (if applicable)
- [ ] No breaking changes (or clearly documented)
```

### Review Process

1. **Automated CI checks** run on every PR
2. **Code review** by maintainers (focus on design, correctness, tests)
3. **Approval required** before merge
4. **Squash and merge** to maintain linear history

## Testing Strategy

### Test Organization

```
tests/
├── unit/                   # Fast, isolated tests
│   ├── config/             # Configuration module tests
│   ├── mcp/                # MCP client/server tests
│   ├── grouping/           # Tool grouping tests
│   ├── llm/                # LLM provider tests
│   └── agents/             # Agent execution tests
├── integration/            # Multi-module tests
│   ├── init_workflow_test.ts
│   ├── build_workflow_test.ts
│   └── mcp_server_test.ts
├── distribution/           # Distribution parity tests
│   ├── deno_binary_test.ts
│   ├── npm_package_test.ts
│   └── parity_test.ts
└── fixtures/               # Test data (configs, mock tools)
```

### Writing Tests

**Unit Tests** (fast, isolated):

```typescript
import { assertEquals } from "@std/assert";
import { validateConfig } from "../../src/config/validator.ts";

Deno.test("validateConfig rejects missing mcpServers", () => {
  const invalidConfig = { version: "1.0.0" };

  assertEquals(
    validateConfig(invalidConfig),
    { valid: false, errors: ["mcpServers is required"] },
  );
});
```

**Integration Tests** (realistic workflows):

```typescript
import { assertExists } from "@std/assert";
import { runInitCommand } from "../../src/cli/commands/init.ts";

Deno.test("init command creates valid config", async () => {
  const tmpDir = await Deno.makeTempDir();

  await runInitCommand({ dir: tmpDir, nonInteractive: true });

  const configPath = `${tmpDir}/tamamo-x.config.json`;
  assertExists(await Deno.stat(configPath));

  await Deno.remove(tmpDir, { recursive: true });
});
```

### Test Fixtures

Use test fixtures for reproducible test data:

```typescript
// tests/fixtures/mock_tools.ts
export const MOCK_FILE_TOOLS = [
  { name: "read_file", description: "Read file contents", ... },
  { name: "write_file", description: "Write to file", ... },
];
```

## Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**Types**:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `refactor`: Code refactoring (no functional changes)
- `perf`: Performance improvements
- `chore`: Build process, dependencies, tooling

**Examples**:

```
feat(grouping): add LLM-based tool complementarity analysis

Implement analyzer.ts to use LLM for identifying tool relationships.
Batches 10 tools per request for performance.

Closes #42
```

```
fix(mcp): handle connection timeout gracefully

Add 30s timeout for MCP server connections with retry logic.

Fixes #38
```

```
test(config): add validation tests for grouping constraints

Add 12 test cases covering min/max tool counts and group counts.

Part of #45
```

### Commit Best Practices

- **One logical change per commit**
- **Descriptive subject line** (50 chars max)
- **Body explains why, not what** (code shows what)
- **Reference issues/PRs** in footer

## Project Structure

### Key Directories

```
tamamo-x-mcp/
├── src/                    # Source code
│   ├── cli/                # CLI commands (init, build, mcp)
│   ├── config/             # Configuration management
│   ├── mcp/                # MCP protocol (client/server)
│   ├── grouping/           # Tool grouping logic
│   ├── llm/                # LLM provider abstraction
│   ├── agents/             # Sub-agent execution
│   └── types/              # TypeScript type definitions
├── tests/                  # Test suites (unit/integration/distribution)
├── specs/                  # Feature specifications
│   └── 001-tool-grouping/  # Current feature docs
├── .github/                # GitHub workflows (CI/CD)
├── scripts/                # Build scripts (npm package generation)
└── deno.json               # Deno configuration and tasks
```

### Adding New Modules

When adding new modules:

1. **Create module directory** under `src/`
2. **Add unit tests** in `tests/unit/[module]/`
3. **Export types** in `src/types/index.ts` if needed
4. **Update module dependency graph** in `specs/001-tool-grouping/plan.md` (if major
   change)

## Development Commands

### Common Tasks

```bash
# Run all tests
deno task test

# Run specific test file
deno test tests/unit/config/loader_test.ts

# Watch mode (auto-run tests on changes)
deno test --watch tests/unit/

# Lint code
deno task lint

# Format code
deno task fmt

# Type check
deno check src/cli/main.ts

# Build distributions
deno task compile       # Deno binary
deno task npm:build     # npm package

# Coverage report
deno test --coverage=coverage/
deno coverage coverage/ --lcov > coverage.lcov
```

### Useful Flags

```bash
# Run tests with permissions
deno test --allow-all

# Filter tests by name
deno test --filter "config"

# Parallel test execution
deno test --parallel

# Show test output
deno test --trace-leaks
```

## Getting Help

- **Documentation**: Check `specs/001-tool-grouping/` for detailed design docs
- **Issues**: Search existing issues before creating new ones
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Code Review**: Tag maintainers in PRs for review

## Additional Resources

- [Deno Manual](https://deno.land/manual)
- [Deno Standard Library](https://deno.land/std)
- [MCP Specification](https://modelcontextprotocol.io/docs)
- [Project Constitution](.specify/memory/constitution.md)

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (see LICENSE file).

---

Thank you for contributing to tamamo-x-mcp!
