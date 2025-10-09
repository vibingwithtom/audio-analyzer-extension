# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Audio Analyzer is a monorepo containing multiple applications for analyzing audio file properties and validating them against criteria. The project consists of:

- **Web application** (packages/web) - Progressive web app deployed to GitHub Pages
- **Chrome extension** (packages/extension) - Google Drive integration for analyzing audio files
- **Desktop application** (packages/desktop) - Electron-based standalone app
- **Core library** (packages/core) - Shared audio analysis engine used by all platforms
- **Cloud functions** - Google Cloud Functions for bilingual validation and Box proxy

## Common Commands

### Development
```bash
# Install dependencies (from root)
npm install

# Run web app locally
cd packages/web
npm run dev              # Runs Vite dev server on http://localhost:3000

# Run desktop app
cd packages/desktop
npm run dev              # Runs Electron in dev mode
npm start                # Runs Electron normally

# Build all packages
npm run build            # Builds all workspaces

# Lint all packages
npm run lint             # Runs linting on all workspaces
```

### Web Deployment (CRITICAL)
```bash
# Web app has beta and production environments
cd packages/web

# ALWAYS deploy to beta first
npm run deploy:beta      # Deploys to https://audio-analyzer.tinytech.site/beta/

# Only deploy to production after beta verification
npm run deploy           # Deploys to https://audio-analyzer.tinytech.site

# Clean deployments (removes --add flag, for fixing corrupted gh-pages branch)
npm run deploy:beta:clean
npm run deploy:clean
```

### Desktop Application Build
```bash
cd packages/desktop

npm run build            # Build for current platform
npm run build-mac        # Build for macOS
npm run build-win        # Build for Windows
npm run build-linux      # Build for Linux
npm run pack             # Build without creating installer (faster for testing)
```

### Cloud Functions
```bash
# Deploy bilingual validation function
cd cloud-functions/bilingual-validation
gcloud functions deploy bilingualValidation \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --region us-central1

# Deploy Box proxy function
cd cloud-functions/box-proxy
gcloud functions deploy box-proxy \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point boxProxy \
  --region us-central1
```

## Architecture

### Monorepo Structure
This is an npm workspaces monorepo. All packages are in `packages/` and share dependencies through the root `package.json`.

### Core Library (`packages/core`)
The core library is the heart of the application and is imported by all other packages. Key modules:

- **AudioAnalyzer** (`audio-analyzer.js`) - Extracts file properties (sample rate, bit depth, channels, duration, file type). Parses WAV headers directly for accurate bit depth. Uses Web Audio API's AudioContext for decoding.

- **LevelAnalyzer** (`level-analyzer.js`) - Advanced audio analysis including:
  - Peak level detection
  - Noise floor analysis (two methods: old model using quietest 20% of RMS windows, new histogram-based model)
  - Normalization checking (target: -6.0 dB)
  - Reverb estimation using RT60 calculation
  - Silence analysis (leading, trailing, and longest silence gaps)
  - Stereo separation analysis (detects mono-as-stereo, conversational stereo, etc.)
  - Mic bleed detection for conversational audio

- **CriteriaValidator** (`criteria-validator.js`) - Validates audio properties against target criteria. Returns pass/warning/fail status for each criterion.

- **BatchProcessor** (`batch-processor.js`) - Handles batch processing of multiple audio files with progress tracking.

- **GoogleDriveHandler** (`google-drive.js`) - Handles Google Drive URL parsing and file downloads.

- **AudioAnalyzerEngine** (`index.js`) - Convenience class combining all functionality.

### Web Application (`packages/web`)
Single-page vanilla JavaScript application (no framework). Key components:

- **main.js** - Main application logic, tab switching, file handling, batch processing, UI updates
- **google-auth.js** - Google OAuth integration using Google Identity Services
- **box-auth.js** - Box OAuth integration
- **config.js** - Configuration for cloud function URLs
- Built with Vite for bundling

**Important:** Uses `vite.config.js` to set base path:
- `mode === 'beta'` → base: '/beta/'
- Production → base: '/'

### Chrome Extension (`packages/extension`)
Manifest V3 Chrome extension for analyzing Google Drive files:

- **manifest.json** - Extension configuration with OAuth2 setup
- **popup.js/html** - Extension popup interface
- **content-script.js** - Injected into Google Drive pages
- **background.js** - Service worker for background tasks
- **file-handler.js/html** - Handles file analysis in separate window

### Desktop Application (`packages/desktop`)
Electron application with main and renderer processes:

- **src/main.js** - Electron main process
- Uses electron-builder for packaging
- Configured in package.json build section for macOS, Windows, Linux
- Auto-update support via electron-updater

### Cloud Functions

**bilingual-validation** - Provides validation data for bilingual conversational audio filename patterns. Returns JSON with language codes, conversation IDs by language, and valid contributor pairs.

**box-proxy** - CORS proxy for downloading Box shared files. Required because Box API doesn't support direct CORS requests from browsers.

## Key Concepts

### Audio Analysis Flow
1. File is read as ArrayBuffer
2. For WAV: Headers parsed directly for accurate metadata
3. For other formats: Web Audio API decodes audio
4. Basic properties extracted (sample rate, channels, etc.)
5. Optional: Advanced analysis (noise floor, reverb, silence, mic bleed)
6. Results validated against criteria if preset selected

### Presets System
The application includes predefined criteria presets for different recording scenarios:
- Auditions (Character Recordings, Emotional Voice)
- Character Recordings
- P2B2 Pairs (Mono/Stereo/Mixed)
- Three Hour
- Bilingual Conversational
- Custom

Each preset defines acceptable file types, sample rates, bit depths, channels, and minimum duration. Some presets support filename validation.

### Filename Validation
Two validation types:

1. **Three Hour preset** (`script-match`) - Requires speaker ID and scripts folder URL from Google Drive. Validates filename format: `[scriptName]_[speakerID].wav`

2. **Bilingual Conversational preset** (`bilingual-pattern`) - Validates against two patterns:
   - Scripted: `[ConversationID]-[LanguageCode]-user-[UserID]-agent-[AgentID]`
   - Unscripted: `SPONTANEOUS_[number]-[LanguageCode]-user-[UserID]-agent-[AgentID]`

### Batch Processing
Supports analyzing entire folders from:
- Google Drive folders (requires authentication)
- Box folders (requires authentication)
- Local multi-file selection

Batch results show aggregate statistics (pass/warning/fail/error counts) and total duration.

### Advanced Analysis Features
- **Noise Floor**: Uses histogram-based analysis to find most common quiet level (recommended) vs. old method using bottom 20% RMS
- **Reverb (RT60)**: Estimates room reverberation time by analyzing decay patterns after onsets
- **Silence Detection**: Dynamically sets threshold at 25% between noise floor and peak, filters out audio "ticks" shorter than 150ms
- **Mic Bleed**: Measures audio leakage between channels in conversational stereo recordings

## File Organization Notes

- Core library files are ES modules (type: "module" in package.json)
- Web app uses Vite for bundling and dev server
- Import paths use `@audio-analyzer/core` alias that resolves to `packages/core`
- All packages import from core using relative paths in actual files

## OAuth Configuration

### Google Drive
- Chrome extension uses manifest.json oauth2 config
- Web app uses Google Identity Services with client ID in index.html
- OAuth scopes: drive.readonly, drive.metadata.readonly

### Box
- Web app uses Box OAuth with redirect to `/box-callback`
- Requires Box developer app with client ID/secret
- Uses cloud function proxy for actual file downloads

## Important Notes

- The web app MUST be deployed to beta first before production
- Git status shows feature/mic-bleed-detection branch is currently active
- Recent work includes mic bleed detection feature and improvements to advanced analysis
- Core library is shared across all packages - changes affect all platforms
- Cloud functions are deployed separately to Google Cloud Platform
