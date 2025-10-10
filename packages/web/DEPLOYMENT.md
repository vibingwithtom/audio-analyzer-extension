# Deployment Guide

## Overview

This project uses **automated CI/CD via GitHub Actions** for production deployments and **manual deployment** for beta testing.

### Environments

| Environment | URL | Deployment Method | When Tests Run |
|-------------|-----|-------------------|----------------|
| **Production** | https://audio-analyzer.tinytech.site | ✅ Automatic (GitHub Actions) | Before every deployment |
| **Beta** | https://audio-analyzer.tinytech.site/beta | Manual (`npm run deploy:beta`) | Optional |
| **Local** | http://localhost:3000 | `npm run dev` | On demand |

---

## Quick Start

### For Beta Testing (During Development)
```bash
cd packages/web
npm run deploy:beta
# Wait 1-2 minutes
# Test at https://audio-analyzer.tinytech.site/beta
```

### For Production Deployment
```bash
git checkout main
git merge feature/your-branch
git push origin main
# GitHub Actions automatically:
# 1. Runs all 635 tests
# 2. Runs TypeScript type checking
# 3. Builds the application
# 4. Deploys to production (if all checks pass)
```

**That's it!** No manual deployment needed for production.

---

## GitHub Actions Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)
**Triggers:** Every push and pull request to `main`

**What it does:**
- ✅ Runs all 635 tests
- ✅ Checks TypeScript types
- ✅ Verifies build succeeds
- ✅ Prevents merging broken code

**View status:** https://github.com/vibingwithtom/audio-analyzer/actions

### 2. Production Deployment (`.github/workflows/deploy.yml`)
**Triggers:** Automatically when code is pushed to `main`

**Steps:**
1. Runs all tests
2. Runs TypeScript type checking
3. **If tests pass:** Builds and deploys to production
4. **If tests fail:** ❌ Blocks deployment

**Benefits:**
- Cannot accidentally deploy broken code
- Tests always run before deployment
- No manual deployment commands needed

### 3. Beta Deployment (`.github/workflows/deploy-beta.yml`)
**Triggers:** Manual via GitHub Actions UI

**How to use:**
1. Go to https://github.com/vibingwithtom/audio-analyzer/actions
2. Click "Deploy to Beta" workflow
3. Click "Run workflow"
4. Select branch to deploy
5. Tests run, then deploys if passing

**Use case:** Testing feature branches in beta without checking them out locally.

---

## Deployment Methods Compared

### Production Deployment

#### Method 1: Automatic (Recommended ✅)
```bash
git push origin main
# GitHub Actions handles the rest
```

**Pros:**
- ✅ Tests always run first
- ✅ Cannot deploy broken code
- ✅ No commands to remember
- ✅ Consistent deployment process

**Cons:**
- Slower (~2-3 minutes for tests + build + deploy)

#### Method 2: Manual (Emergency Only ⚠️)
```bash
npm run deploy
```

**Use when:**
- GitHub Actions is down
- Emergency hotfix needed immediately
- Testing deployment process locally

**Warning:** Bypasses automated tests. Use sparingly.

### Beta Deployment

#### Method 1: Command Line (Recommended for Active Development ✅)
```bash
npm run deploy:beta
```

**Pros:**
- ✅ Fast
- ✅ Simple
- ✅ Works offline

**Cons:**
- Tests don't run automatically

#### Method 2: GitHub Actions UI
Use "Deploy to Beta" workflow (see above).

**Pros:**
- ✅ Tests run automatically
- ✅ Can deploy any branch

**Cons:**
- Slower
- Requires GitHub UI

---

## Detailed Workflow

### Development Cycle

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes
# ... edit code ...

# 3. Test locally
npm run dev
# Open http://localhost:3000

# 4. Run tests
npm run test:run

# 5. Deploy to beta
npm run deploy:beta

# 6. Test in beta
# Visit https://audio-analyzer.tinytech.site/beta

# 7. Merge to main (triggers production deployment)
git checkout main
git merge feature/new-feature
git push origin main

# 8. Monitor deployment
# Check https://github.com/vibingwithtom/audio-analyzer/actions

# 9. Verify production
# Visit https://audio-analyzer.tinytech.site
```

---

## Setup Requirements

### DNS Configuration
Add this DNS record in your domain provider (tinytech.site):

```
Type: CNAME
Host: audio-analyzer
Value: vibingwithtom.github.io
```

### Google OAuth Configuration
Add both URLs to your Google Cloud Console OAuth 2.0 Client:

**Authorized JavaScript origins:**
- `https://audio-analyzer.tinytech.site`
- `http://localhost:3000` (for local development)

**Authorized redirect URIs:**
- `https://audio-analyzer.tinytech.site`
- `https://audio-analyzer.tinytech.site/beta`
- `http://localhost:3000`

### GitHub Pages Configuration
- **Source:** Deploy from `gh-pages` branch
- **Custom domain:** audio-analyzer.tinytech.site
- **HTTPS:** Enforced

**Note:** This is automatically configured when you first deploy.

---

## Troubleshooting

### Production Deployment Failed

**Check GitHub Actions logs:**
1. Go to https://github.com/vibingwithtom/audio-analyzer/actions
2. Click the failed workflow run
3. Check which step failed:
   - **Tests failed:** Fix tests and push again
   - **Build failed:** Check TypeScript errors
   - **Deploy failed:** Check GitHub Pages status

**Common fixes:**
```bash
# Run tests locally
npm run test:run

# Check TypeScript errors
npm run typecheck

# Fix issues, then push again
git push origin main
```

### Beta Deployment Not Updating

**Wait 1-2 minutes** - GitHub Pages takes time to update.

**Force refresh browser:**
- Chrome/Firefox: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Safari: Cmd+Option+R

**Check deployment:**
```bash
# Verify gh-pages branch has your changes
git log origin/gh-pages --oneline -5
```

### Emergency Rollback

If production is broken and you need to rollback:

#### Option 1: Revert via Git
```bash
git revert HEAD
git push origin main
# GitHub Actions deploys the reverted version
```

#### Option 2: Manual Rollback (gh-pages branch)
```bash
git checkout gh-pages
git reset --hard HEAD~1
git push origin gh-pages --force
```

**Note:** Option 1 is preferred - maintains git history.

---

## Advanced

### Build Modes

The application supports two build modes:

```bash
# Production mode (base: '/')
npm run build

# Beta mode (base: '/beta/')
npm run build:beta
```

**Configured in:** `vite.config.js`

### Clean Deployments

If the `gh-pages` branch gets corrupted:

```bash
# Clean production deployment
npm run deploy:clean

# Clean beta deployment
npm run deploy:beta:clean
```

**What this does:** Removes `--add` flag, which creates a fresh deployment without preserving history.

### Testing Build Locally

```bash
# Build production
npm run build

# Preview build
npm run preview
# Opens http://localhost:4173
```

---

## Package.json Scripts Reference

```json
{
  "dev": "vite",                          // Local dev server
  "build": "vite build",                  // Build for production
  "build:beta": "vite build --mode beta", // Build for beta
  "preview": "vite preview",              // Preview production build
  "test": "vitest",                       // Run tests in watch mode
  "test:run": "vitest run",               // Run tests once
  "test:coverage": "vitest --coverage",   // Run tests with coverage
  "typecheck": "tsc --noEmit",            // Check TypeScript types
  "deploy": "npm run build && ...",       // Manual production deploy
  "deploy:beta": "npm run build:beta && ...", // Manual beta deploy
  "deploy:clean": "...",                  // Clean production deploy
  "deploy:beta:clean": "..."              // Clean beta deploy
}
```

---

## Notes

- Both environments use the same Google OAuth client
- The app automatically detects the environment based on URL path
- Beta is deployed to `/beta` subdirectory on `gh-pages` branch
- Production is deployed to the root of `gh-pages` branch
- CNAME file is automatically added during deployment
- GitHub Actions uses `peaceiris/actions-gh-pages@v4` for deployment
- Manual deployment uses `gh-pages` npm package
