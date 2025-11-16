# CI/CD Workflow Specifications

**Feature**: 001-tool-grouping
**Date**: 2025-11-15

## Overview

This document specifies GitHub Actions workflows for continuous integration, distribution validation, and automated releases. All workflows enforce constitution-mandated quality gates.

## Workflow Files

### 1. Main CI Workflow (`.github/workflows/ci.yml`)

**Purpose**: Enforce quality gates on every push and pull request

**Triggers**:

- Push to any branch
- Pull request to any branch

**Jobs**:

```yaml
name: CI

on:
  push:
  pull_request:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality-gates:
    name: Quality Gates
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4

      - name: Setup Deno
        uses: denoland/setup-deno@v1
        with:
          deno-version: v2.x

      - name: Cache Deno dependencies
        uses: actions/cache@v3
        with:
          path: |
            ~/.deno
            ~/.cache/deno
          key: deno-${{ hashFiles('deno.lock') }}
          restore-keys: |
            deno-

      - name: Lint
        run: deno lint

      - name: Format check
        run: deno fmt --check

      - name: Type check
        run: deno check src/**/*.ts

  test:
    name: Test (${{ matrix.os }})
    needs: quality-gates
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4

      - name: Setup Deno
        uses: denoland/setup-deno@v1
        with:
          deno-version: v2.x

      - name: Cache Deno dependencies
        uses: actions/cache@v3
        with:
          path: |
            ~/.deno
            ~/.cache/deno
          key: deno-${{ matrix.os }}-${{ hashFiles('deno.lock') }}
          restore-keys: |
            deno-${{ matrix.os }}-

      - name: Run unit tests
        run: deno test --parallel --coverage=coverage tests/unit/

      - name: Run integration tests
        run: deno test --coverage=coverage tests/integration/

      - name: Generate coverage report
        run: deno coverage coverage --lcov > coverage.lcov

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage.lcov
          flags: ${{ matrix.os }}

  build:
    name: Build
    needs: test
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4

      - name: Setup Deno
        uses: denoland/setup-deno@v1
        with:
          deno-version: v2.x

      - name: Build Deno binary
        run: deno task compile

      - name: Build npm package
        run: deno task npm:build

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: distributions-${{ github.sha }}
          path: dist/
          retention-days: 7

  distribution-parity:
    name: Distribution Parity Test
    needs: build
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4

      - name: Setup Deno
        uses: denoland/setup-deno@v1
        with:
          deno-version: v2.x

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Download artifacts
        uses: actions/download-artifact@v3
        with:
          name: distributions-${{ github.sha }}
          path: dist/

      - name: Make binaries executable
        run: chmod +x dist/tamamo-x

      - name: Run distribution tests
        run: deno test tests/distribution/

      - name: Fail on parity violations
        run: |
          if grep -q "PARITY_VIOLATION" test-results.json; then
            echo "::error::Distribution parity violation detected"
            exit 1
          fi
```

**Quality Gate Enforcement**:

- ✅ Lint errors → Build fails
- ✅ Format violations → Build fails
- ✅ Type errors → Build fails
- ✅ Test failures → Build fails
- ✅ Distribution parity violations → Build fails
- ⚠️ Coverage < 80% → Warning (not blocking)

---

### 2. Release Workflow (`.github/workflows/release.yml`)

**Purpose**: Automated release on tag push

**Triggers**:

- Tag push matching `v*.*.*`

**Jobs**:

````yaml
name: Release

on:
  push:
    tags:
      - "v*.*.*"

permissions:
  contents: write # For creating releases
  id-token: write # For npm provenance

jobs:
  validate-tag:
    name: Validate Tag
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.get-version.outputs.version }}
    steps:
      - name: Get version from tag
        id: get-version
        run: |
          VERSION=${GITHUB_REF#refs/tags/v}
          echo "version=$VERSION" >> $GITHUB_OUTPUT

      - name: Validate semantic version
        run: |
          if ! echo "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
            echo "::error::Invalid semantic version: $VERSION"
            exit 1
          fi

  build-distributions:
    name: Build (${{ matrix.platform }})
    needs: validate-tag
    strategy:
      matrix:
        include:
          - platform: linux
            os: ubuntu-latest
            target: x86_64-unknown-linux-gnu
          - platform: macos
            os: macos-latest
            target: x86_64-apple-darwin
          - platform: windows
            os: windows-latest
            target: x86_64-pc-windows-msvc
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Deno
        uses: denoland/setup-deno@v1
        with:
          deno-version: v2.x

      - name: Build binary
        run: |
          deno compile --allow-all \
            --target ${{ matrix.target }} \
            --output dist/tamamo-x-${{ matrix.platform }} \
            src/cli/main.ts

      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: binaries
          path: dist/tamamo-x-${{ matrix.platform }}*

  publish-npm:
    name: Publish to npm
    needs: [validate-tag, build-distributions]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Deno
        uses: denoland/setup-deno@v1
        with:
          deno-version: v2.x

      - name: Build npm package
        run: deno task npm:build

      - name: Publish to npm
        run: npm publish --provenance --access public
        working-directory: npm/
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

  create-release:
    name: Create GitHub Release
    needs: [validate-tag, build-distributions, publish-npm]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # For changelog generation

      - name: Download binaries
        uses: actions/download-artifact@v3
        with:
          name: binaries
          path: dist/

      - name: Generate changelog
        id: changelog
        run: |
          # Generate changelog from commits since last tag
          PREV_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")
          if [ -z "$PREV_TAG" ]; then
            CHANGELOG=$(git log --pretty=format:"- %s (%h)" HEAD)
          else
            CHANGELOG=$(git log --pretty=format:"- %s (%h)" $PREV_TAG..HEAD)
          fi
          echo "changelog<<EOF" >> $GITHUB_OUTPUT
          echo "$CHANGELOG" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          tag_name: v${{ needs.validate-tag.outputs.version }}
          name: Release v${{ needs.validate-tag.outputs.version }}
          body: |
            ## Changes
            ${{ steps.changelog.outputs.changelog }}

            ## Installation

            ### Deno Binary
            ```bash
            # Linux
            curl -fsSL https://github.com/${{ github.repository }}/releases/download/v${{ needs.validate-tag.outputs.version }}/tamamo-x-linux -o tamamo-x
            chmod +x tamamo-x

            # macOS
            curl -fsSL https://github.com/${{ github.repository }}/releases/download/v${{ needs.validate-tag.outputs.version }}/tamamo-x-macos -o tamamo-x
            chmod +x tamamo-x

            # Windows
            curl -fsSL https://github.com/${{ github.repository }}/releases/download/v${{ needs.validate-tag.outputs.version }}/tamamo-x-windows.exe -o tamamo-x.exe
            ```

            ### npm Package
            ```bash
            npx tamamo-x-mcp@${{ needs.validate-tag.outputs.version }}
            ```
          files: |
            dist/tamamo-x-linux
            dist/tamamo-x-macos
            dist/tamamo-x-windows.exe
          draft: false
          prerelease: false
````

**Release Process**:

1. Developer pushes tag: `git tag v1.0.0 && git push --tags`
2. Workflow validates semantic version
3. Builds binaries for Linux, macOS, Windows
4. Publishes npm package with provenance
5. Creates GitHub Release with:
   - Auto-generated changelog
   - Binary attachments
   - Installation instructions

---

### 3. Dependabot Configuration (`.github/dependabot.yml`)

**Purpose**: Automated dependency updates

```yaml
version: 2
updates:
  # Deno dependencies (via deno.lock)
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 5
    reviewers:
      - "maintainer-team"
    labels:
      - "dependencies"
      - "automated"
    commit-message:
      prefix: "chore(deps)"
      include: "scope"

  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    reviewers:
      - "maintainer-team"
    labels:
      - "dependencies"
      - "github-actions"
```

---

### 4. Distribution Validation Workflow (`.github/workflows/distribution.yml`)

**Purpose**: Deep distribution parity testing (runs nightly)

```yaml
name: Distribution Validation

on:
  schedule:
    - cron: "0 2 * * *" # 2 AM UTC daily
  workflow_dispatch: # Manual trigger

jobs:
  parity-test:
    name: Parity Test (Deep)
    runs-on: ubuntu-latest
    timeout-minutes: 45
    steps:
      - uses: actions/checkout@v4

      - name: Setup Deno
        uses: denoland/setup-deno@v1
        with:
          deno-version: v2.x

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Build both distributions
        run: |
          deno task compile
          deno task npm:build

      - name: Run comprehensive parity tests
        run: deno test --jobs=1 tests/distribution/
        env:
          DEEP_VALIDATION: "true"

      - name: Compare binary outputs
        run: |
          # Run same commands with both distributions
          # Compare outputs byte-by-byte
          ./dist/tamamo-x --version > deno-version.txt
          npx ./npm/ --version > npm-version.txt
          diff deno-version.txt npm-version.txt

      - name: Report violations
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Distribution Parity Violation Detected',
              body: 'Automated nightly validation found differences between Deno binary and npm package.',
              labels: ['bug', 'distribution', 'high-priority']
            })
```

---

## Branch Protection Rules

**Repository Settings → Branches → Branch protection rules**

For `main` branch:

```yaml
# Required status checks
require_status_checks:
  strict: true # Require branches to be up to date
  contexts:
    - "quality-gates"
    - "test (ubuntu-latest)"
    - "test (macos-latest)"
    - "test (windows-latest)"
    - "build"
    - "distribution-parity"

# Pull request requirements
require_pull_request_reviews:
  required_approving_review_count: 1
  dismiss_stale_reviews: true
  require_code_owner_reviews: true

# Additional restrictions
restrictions:
  - enforce_admins: true
  - allow_force_pushes: false
  - allow_deletions: false
  - require_linear_history: true
  - require_signed_commits: false
```

---

## Secrets Configuration

**Required GitHub Secrets** (Repository Settings → Secrets → Actions):

| Secret Name         | Purpose                         | Used By             | Required    |
| ------------------- | ------------------------------- | ------------------- | ----------- |
| `NPM_TOKEN`         | Publish npm packages            | `release.yml`       | ✅ Yes      |
| `ANTHROPIC_API_KEY` | Integration tests with real LLM | `ci.yml` (optional) | ⚠️ Optional |
| `OPENAI_API_KEY`    | Multi-provider testing          | `ci.yml` (optional) | ⚠️ Optional |

**Security Best Practices**:

- Use environment-specific secrets for staging vs production
- Rotate tokens quarterly
- Use GitHub Environments for production deployments
- Require manual approval for releases

---

## Workflow Monitoring

### Success Metrics

| Metric                 | Target | Measurement                 |
| ---------------------- | ------ | --------------------------- |
| **CI Success Rate**    | >95%   | Green builds / Total builds |
| **Average Build Time** | <20min | CI workflow duration        |
| **Test Flakiness**     | 0%     | Flaky tests / Total tests   |
| **Coverage Trend**     | ≥80%   | Code coverage over time     |
| **Release Frequency**  | Weekly | Tags pushed / Week          |

### Alerts

Set up GitHub Actions workflow notifications:

- ❌ Failed builds → Slack/Email
- ⚠️ Coverage drop >5% → GitHub Issue
- ❌ Distribution parity violation → GitHub Issue + Slack

---

## Local Testing

**Test CI workflows locally** using [act](https://github.com/nektos/act):

```bash
# Install act
brew install act

# Test CI workflow
act push -j quality-gates

# Test full CI pipeline
act push

# Test release workflow (dry-run)
act push --tag v0.0.0-test -j create-release --dry-run
```

---

## CI/CD Contracts Complete

All GitHub Actions workflows specified. Ready for implementation in Phase 6.
