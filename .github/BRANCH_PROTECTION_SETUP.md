# Branch Protection Setup

This document explains how to configure branch protection rules to ensure all code is tested before merging to main.

## GitHub Actions Workflows

We have two workflows:

1. **`ci.yml`** - Runs on ALL branches including feature branches
   - Runs tests
   - Performs TypeScript type checking
   - Runs linting
   - Purpose: Catch issues early in development

2. **`deploy.yml`** - Runs only on main branch
   - Runs tests (duplicate check for safety)
   - Deploys to production if tests pass
   - Purpose: Safe production deployment

## Setting Up Branch Protection Rules

To ensure no code reaches main without passing CI:

1. Go to: https://github.com/vibingwithtom/audio-analyzer/settings/branches

2. Click "Add rule" or edit the existing "main" branch rule

3. Configure these settings:

   ### Required Settings:
   - ✅ **Branch name pattern**: `main`
   - ✅ **Require a pull request before merging**
     - Require approvals: 0 (or 1 if you want self-review)
   - ✅ **Require status checks to pass before merging**
     - Add required check: `Run Tests` (from ci.yml workflow)
   - ✅ **Require branches to be up to date before merging**

   ### Optional but Recommended:
   - ✅ **Do not allow bypassing the above settings**
   - ✅ **Require linear history** (prevents merge commits)

4. Click "Create" or "Save changes"

## Recommended Workflow

### For Feature Development:

```bash
# 1. Create feature branch from main
git checkout main
git pull
git checkout -b feature/your-feature-name

# 2. Make changes and commit
git add .
git commit -m "feat: your feature description"

# 3. Push to GitHub (triggers CI on feature branch)
git push origin feature/your-feature-name

# 4. Check GitHub Actions to ensure tests pass
# Visit: https://github.com/vibingwithtom/audio-analyzer/actions

# 5. Create Pull Request when tests pass
gh pr create --base main --head feature/your-feature-name

# 6. Merge PR after CI passes (GitHub will enforce this)
```

### For Beta Testing:

```bash
# Deploy to beta while on feature branch
cd packages/web
npm run deploy:beta

# Test at: https://audio-analyzer.tinytech.site/beta/

# If tests pass and beta works, create PR to main
```

### For Hotfixes:

If you need to bypass (emergency only):
1. You can still push directly to main if you have admin rights
2. CI will still run and block deployment if tests fail
3. Better: Create a hotfix branch and fast-track the PR

## Why This Matters

**Before this setup:**
- Feature branches had no CI → problems only found when merging to main
- Production could break if we forgot to run tests locally

**After this setup:**
- Every push to any branch runs tests
- Can't merge to main without passing CI
- Production deployment has two layers of protection:
  1. Branch protection (can't merge without tests)
  2. Deploy workflow (won't deploy without tests)

## Checking Status

To verify branch protection is active:

```bash
# Check if CI runs on your branch
git push origin feature/my-feature
gh run list --branch feature/my-feature

# Try to merge without tests passing (should fail)
gh pr create --base main --head feature/my-feature
# GitHub will block merge if tests haven't passed
```

## Current Status

- ✅ CI workflow created (runs on all branches)
- ✅ Deploy workflow protects production
- ⏳ **Branch protection rules need to be set up in GitHub UI** (see steps above)

The branch protection rules must be configured through the GitHub web interface - they cannot be set via git config or committed files.
