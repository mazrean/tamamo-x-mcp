# Testing CI Workflows Locally

This document describes how to test GitHub Actions workflows locally before pushing changes.

## Using act (nektos/act)

[act](https://github.com/nektos/act) allows you to run GitHub Actions workflows locally in Docker containers.

### Installation

**macOS (Homebrew)**:

```bash
brew install act
```

**Linux**:

```bash
curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
```

**Windows (Chocolatey)**:

```powershell
choco install act-cli
```

**Manual installation**: Download from [GitHub Releases](https://github.com/nektos/act/releases)

### Prerequisites

- Docker must be installed and running
- At least 8GB of available disk space for runner images

### Configuration

The project includes a `.actrc` file with recommended defaults:

- Uses `catthehacker/ubuntu:act-latest` runner images (includes common tools)
- Enables verbose logging
- Binds project root as workspace

### Running Workflows

**List available workflows**:

```bash
act -l
```

**Run CI workflow (on push event)**:

```bash
act push
```

**Run specific job**:

```bash
act -j quality-gates      # Lint, format, type check
act -j test-matrix        # Multi-platform tests
act -j coverage           # Test coverage
act -j build              # Build distributions
```

**Run with specific matrix value**:

```bash
# Test on specific OS (note: act uses Linux containers, so macOS/Windows are simulated)
act -j test-matrix --matrix os=ubuntu-latest
act -j test-matrix --matrix os=macos-latest
act -j test-matrix --matrix os=windows-latest
```

**Run distribution validation workflow**:

```bash
act schedule -W .github/workflows/distribution.yml
```

**Dry run (show what would execute)**:

```bash
act -n
```

### Platform-Specific Testing

Since act runs in Linux containers, platform-specific tests (macOS, Windows) are **simulated** and may not catch OS-specific issues. The CI matrix tests are best validated in actual GitHub Actions for true cross-platform verification.

### Common Issues

**"Input required and not supplied: token"**:

```bash
# Provide a dummy GitHub token
act -s GITHUB_TOKEN=dummy_token
```

**Docker permission denied**:

```bash
# Add your user to the docker group (Linux)
sudo usermod -aG docker $USER
# Log out and back in for changes to take effect
```

**Slow first run**:
act downloads runner images (~1-2GB) on first run. Subsequent runs are faster.

### Limitations

- Platform-specific features (macOS, Windows) may not work correctly
- Some GitHub Actions features are not fully supported
- Network access may differ from actual GitHub Actions
- Secrets must be provided manually via `-s` flag

### Recommended Workflow

1. Run `act -n` to preview what will execute
2. Run `act -j <job>` to test specific jobs
3. Run `deno test` and `deno lint` directly for faster feedback
4. Use act for validating workflow syntax and job dependencies
5. Push to GitHub for full platform matrix testing

## Direct Testing

For faster iteration without act:

```bash
# Quality gates (runs in seconds)
deno lint
deno fmt --check
deno check src/**/*.ts

# Unit tests (runs in ~10s)
deno test --allow-all tests/unit/

# Integration tests
deno test --allow-all tests/integration/

# Distribution tests
deno test --allow-all tests/distribution/

# CI enforcement tests
deno test --allow-all tests/ci/

# Full test suite
deno test --allow-all
```

## CI Enforcement Tests

The `tests/ci/` directory contains meta-tests that validate the CI configuration itself:

- **lint_enforcement_test.ts**: Ensures CI catches lint/format/type violations
- **test_gate_enforcement_test.ts**: Validates CI runs all test suites
- **distribution_gate_enforcement_test.ts**: Verifies both distributions build correctly

These tests ensure the CI pipeline is properly configured according to project constitution requirements.
