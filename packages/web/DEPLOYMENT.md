# Deployment Guide

## Environments

This project supports two deployment environments:

### Production
- **URL**: https://audio-analyzer.tinytech.site
- **Branch**: `gh-pages` (root)
- **Deploy command**: `npm run deploy`

### Beta/Staging
- **URL**: https://audio-analyzer.tinytech.site/beta
- **Branch**: `gh-pages` (beta subdirectory)
- **Deploy command**: `npm run deploy:beta`

## Setup Requirements

### 1. DNS Configuration
Add this DNS record in your domain provider (tinytech.site):

```
Type: CNAME
Host: audio-analyzer
Value: vibingwithtom.github.io
```

### 2. Google OAuth Configuration
Add both URLs to your Google Cloud Console OAuth 2.0 Client:

**Authorized JavaScript origins:**
- `https://audio-analyzer.tinytech.site`
- `http://localhost:3000` (for local development)

**Authorized redirect URIs:**
- `https://audio-analyzer.tinytech.site`
- `https://audio-analyzer.tinytech.site/beta`
- `http://localhost:3000`

## Deployment Workflow

### Testing Changes Locally
```bash
npm run dev
# Open http://localhost:3000
```

### Deploying to Beta
1. Test locally first
2. Deploy to beta:
   ```bash
   npm run deploy:beta
   ```
3. Wait 1-2 minutes for GitHub Pages to update
4. Test at https://audio-analyzer.tinytech.site/beta

### Deploying to Production
1. Test on beta environment first
2. Deploy to production:
   ```bash
   npm run deploy
   ```
3. Wait 1-2 minutes for GitHub Pages to update
4. Verify at https://audio-analyzer.tinytech.site

## Rollback

If you need to rollback a deployment:

```bash
# For production (root)
git checkout gh-pages
git reset --hard HEAD~1
git push origin gh-pages --force

# For beta (beta subdirectory)
# Use gh-pages -d dist -e beta again with the previous version
```

## Notes

- Both environments use the same Google OAuth client
- The app automatically detects the environment based on URL path
- Beta is deployed to `/beta` subdirectory on the same `gh-pages` branch
- Production is deployed to the root of the `gh-pages` branch
- CNAME file is only used for production deployment
- GitHub Pages deployment is managed by the gh-pages package
