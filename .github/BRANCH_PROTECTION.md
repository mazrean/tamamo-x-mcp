# Branch Protection Rules

This document describes the recommended branch protection rules for this repository to ensure code quality and maintain a clean git history.

## Main Branch Protection

Apply the following rules to the `main` branch:

### Required Status Checks

**Require status checks to pass before merging:**

- ✅ Enable "Require status checks to pass before merging"
- ✅ Enable "Require branches to be up to date before merging"

**Required checks:**

- `Quality Gates` (CI workflow - lint, format, type check)
- `Tests (ubuntu-latest)` (CI workflow - unit, integration, distribution tests)
- `Tests (macos-latest)` (CI workflow - platform-specific tests)
- `Tests (windows-latest)` (CI workflow - platform-specific tests)
- `Test Coverage` (CI workflow - test coverage ≥80%)
- `Build Distributions (ubuntu-latest)` (CI workflow - Deno binary and npm package builds)
- `Build Distributions (macos-latest)` (CI workflow - platform-specific builds)
- `Build Distributions (windows-latest)` (CI workflow - platform-specific builds)

### Merge Requirements

**Require pull request before merging:**

- ✅ Enable "Require a pull request before merging"
- **Required approvals**: 1 (for team projects; optional for solo projects)
- ✅ Enable "Dismiss stale pull request approvals when new commits are pushed"

**Restrictions:**

- ❌ Disable "Allow force pushes" (prevents git history rewriting)
- ❌ Disable "Allow deletions" (prevents accidental branch deletion)

### Additional Settings

**Commit signing:**

- ⚠️ Optional: Enable "Require signed commits" for enhanced security

**Linear history:**

- ✅ Enable "Require linear history" (enforces rebase or squash merge)
  - Prevents merge commits, keeps history clean
  - Requires developers to rebase on main before merging

**Required conversation resolution:**

- ✅ Enable "Require conversation resolution before merging"
  - All PR review comments must be resolved

**Status check grace period:**

- ⚠️ Optional: Add a 5-minute grace period for status checks
  - Prevents accidental merges during CI runs

## Development Branch Patterns

For feature branches following the pattern `dev/**` or `<taskid>-<description>`:

- No protection rules required (these are temporary branches)
- Developers can force push to their own feature branches
- Must create PR to merge into `main`

## Release Branches

For release branches (if using GitFlow):

- Apply similar protection as `main` branch
- Restrict who can push to release branches (maintainers only)

## Setup Instructions

### Via GitHub Web UI

1. Navigate to **Settings** → **Branches**
2. Click **Add branch protection rule**
3. Enter branch name pattern: `main`
4. Configure rules as described above:
   - Enable "Require status checks to pass before merging"
   - Enable "Require branches to be up to date before merging"
   - Select all required status checks (listed above)
   - Enable "Require a pull request before merging"
   - Set "Required approvals" to 1 (optional for solo projects)
   - Enable "Dismiss stale pull request approvals when new commits are pushed"
   - Enable "Require linear history"
   - Disable "Allow force pushes"
   - Disable "Allow deletions"
   - Enable "Require conversation resolution before merging"
   - ✅ **Enable "Do not allow bypassing the above settings" (Include administrators)**
5. Click **Create** or **Save changes**

### Via GitHub CLI

```bash
# Install GitHub CLI if not already installed
# https://cli.github.com/

# Authenticate
gh auth login

# Create branch protection rule for main
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks[strict]=true \
  --field 'required_status_checks[contexts][]=Quality Gates' \
  --field 'required_status_checks[contexts][]=Tests (ubuntu-latest)' \
  --field 'required_status_checks[contexts][]=Tests (macos-latest)' \
  --field 'required_status_checks[contexts][]=Tests (windows-latest)' \
  --field 'required_status_checks[contexts][]=Test Coverage' \
  --field 'required_status_checks[contexts][]=Build Distributions (ubuntu-latest)' \
  --field 'required_status_checks[contexts][]=Build Distributions (macos-latest)' \
  --field 'required_status_checks[contexts][]=Build Distributions (windows-latest)' \
  --field enforce_admins=true \
  --field required_pull_request_reviews[dismiss_stale_reviews]=true \
  --field required_pull_request_reviews[required_approving_review_count]=1 \
  --field required_linear_history=true \
  --field allow_force_pushes=false \
  --field allow_deletions=false \
  --field required_conversation_resolution=true
```

### Via Terraform (Infrastructure as Code)

```hcl
resource "github_branch_protection" "main" {
  repository_id = github_repository.repo.id
  pattern       = "main"

  required_status_checks {
    strict   = true
    contexts = [
      "Quality Gates",
      "Tests (ubuntu-latest)",
      "Tests (macos-latest)",
      "Tests (windows-latest)",
      "Test Coverage",
      "Build Distributions (ubuntu-latest)",
      "Build Distributions (macos-latest)",
      "Build Distributions (windows-latest)",
    ]
  }

  required_pull_request_reviews {
    dismiss_stale_reviews           = true
    required_approving_review_count = 1
  }

  enforce_admins              = true
  require_signed_commits      = false  # Optional
  require_linear_history      = true
  allow_force_pushes          = false
  allow_deletions             = false
  required_conversation_resolution = true
}
```

## Workflow Impact

### For Contributors

**Before submitting a PR:**

1. Run quality gates locally:
   ```bash
   deno lint
   deno fmt --check
   deno check src/**/*.ts
   ```

2. Run all tests:
   ```bash
   deno test --allow-all
   ```

3. Ensure your branch is up to date with `main`:
   ```bash
   git fetch origin main
   git rebase origin/main
   ```

**When PR checks fail:**

- Fix the issues locally
- Push the fixes (force push allowed on feature branches)
- Wait for CI checks to pass
- Request re-review if code changed significantly

### For Maintainers

**Merging PRs:**

- ✅ Squash and merge (recommended for feature PRs)
  - Combines all commits into one
  - Keeps main branch history clean
- ✅ Rebase and merge (for clean PR commit history)
  - Preserves individual commits
  - Requires PR commits to be well-structured
- ❌ Create merge commit (disabled by linear history requirement)

## Bypass Restrictions

**When to bypass:**

- Emergency hotfixes (requires admin permissions)
- Initial repository setup (before CI workflows are configured)

**How to bypass:**

1. Admins can enable "Allow specified actors to bypass required pull requests"
2. Select specific users or teams
3. ⚠️ Use sparingly - defeats the purpose of protection rules

## Constitution Compliance

These branch protection rules enforce the project constitution requirements:

- **Zero lint/format errors** (quality-gates check enforces constitution)
- **All tests pass** (test-matrix checks enforce test requirements)
- **≥80% coverage** (coverage check enforces coverage requirement)
- **Both distributions build** (build check ensures FR-015 parity)
- **Clean git history** (linear history requirement)

## Troubleshooting

**"Required status check is not present"**

- Ensure the CI workflow has run at least once successfully
- Check that job names match exactly (case-sensitive)
- Verify GitHub Actions is enabled for the repository

**"Branch is out of date"**

- Rebase your feature branch on the latest `main`:
  ```bash
  git fetch origin main
  git rebase origin/main
  git push --force-with-lease
  ```

**"Reviews are stale"**

- Request a new review after pushing commits
- Reviewers must re-approve after code changes

## References

- [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)
- [GitHub Status Checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks)
- [Linear Git History Benefits](https://www.bitsnbites.eu/a-tidy-linear-git-history/)
