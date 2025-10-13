# Audio Analyzer Web App

A professional web-based audio file analysis tool that provides detailed technical information about audio files and validates them against specified criteria. Supports local files, Google Drive, and Box with intelligent batch processing.

## Features

### Multi-Source Support
- **Local File Analysis**: Drag and drop or browse single or multiple local audio files
- **Google Drive Integration**: Analyze files and folders directly from Google Drive URLs with OAuth authentication
- **Box Integration**: Analyze files and folders from Box.com with OAuth authentication

### Smart Batch Processing
- **Automatic Mode Detection**: Single file → detailed analysis; Multiple files → batch mode with summary statistics
- **Folder Support**: Process entire folders from Google Drive or Box in one operation
- **Progress Tracking**: Real-time progress indicators with file counts and percentages
- **Summary Dashboard**: Pass/warning/fail counts with total duration calculations

### Filename Validation
- **Three Hour Preset**: Script-match validation requiring matching .txt script files
- **Bilingual Conversational**: Pattern validation for conversation IDs, language codes, and contributor pairs
- **Metadata-Only Mode**: Fast validation using only filenames and metadata (no audio decoding)

### Analysis Presets
- Auditions
- Character Recordings
- P2B2 Pairs (Mono, Stereo, Mixed)
- Three Hour (with filename validation)
- Bilingual Conversational (with filename validation)
- Custom criteria

### Advanced Audio Analysis
- Peak level detection
- Noise floor analysis
- Normalization recommendations
- Multi-select criteria (file type, sample rate, bit depth, channels)

### Additional Features
- **Multiple Format Support**: WAV, MP3, FLAC, AAC, M4A, OGG
- **Progressive Web App**: Installable on desktop and mobile devices
- **Responsive Design**: Works perfectly on all screen sizes
- **Audio Playback**: Preview files directly in the browser (local and Google Drive)

## Technical Analysis

The app provides comprehensive technical information including:

- File format and codec information
- Sample rate and bit depth
- Channel configuration
- Duration and file size
- Advanced metrics (peak levels, noise floor, etc.)

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Serve built files
npm run serve
```

### Architecture

This web app is built with **Svelte 5** and Vite 7, using a modern component-based architecture.

**Key Technologies:**
- **Framework**: Svelte 5 (migrated from vanilla JavaScript)
- **Build Tool**: Vite 7
- **Language**: TypeScript + JavaScript
- **State Management**: Svelte stores
- **Testing**: Vitest (729 tests, 75%+ coverage)

**Monorepo Structure:**
- `@audio-analyzer/core` - Shared audio analysis engine
- `@audio-analyzer/extension` - Chrome extension
- `@audio-analyzer/desktop` - Electron desktop app
- `@audio-analyzer/web` - This web application (Svelte)

The web app imports the shared core engine to maintain consistency across all platforms.

**Architecture Documentation:**
- **Phase 5 Status**: See `../../docs/PHASE_5_STATUS.md` for migration completion details
- **Architecture Guide**: See `../../docs/ARCHITECTURE.md` for detailed architecture documentation

## Deployment

### Production Deployment

Deploy to https://audio-analyzer.tinytech.site:

```bash
npm run deploy
```

This builds the project and deploys to the `gh-pages` branch with the production domain.

### Beta Deployment

Deploy to https://audio-analyzer.tinytech.site/beta for testing:

```bash
npm run deploy:beta
```

This builds the project and deploys to the `gh-pages-beta` branch.

### Manual Deployment

The app can be deployed to any static hosting service:

**Netlify / Vercel:**
1. Build the project: `npm run build`
2. Deploy the `dist/` folder
3. Configure redirects for SPA routing if needed

**Custom Server:**
1. Build the project: `npm run build`
2. Serve the `dist/` folder with any web server (nginx, Apache, etc.)

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

Requires modern browser features:
- Web Audio API
- File API
- ES6 Modules
- CSS Grid

## PWA Features

The web app is a Progressive Web App with:

- Install prompts
- App-like experience
- Responsive design
- Web app manifest
- Offline functionality (planned)

## Cloud Integration

### Google Drive

Full OAuth 2.0 integration with:
- Sign in with Google account
- Access to files and folders via shared URLs
- Batch processing of folders
- Audio file playback directly from Drive

### Box

Full OAuth 2.0 integration with:
- Sign in with Box account
- Access to files and folders via shared URLs
- Batch processing of folders
- Cloud function proxy for secure token exchange

## Documentation

### Current Project Status
- **Phase 5 Status**: `../../docs/PHASE_5_STATUS.md` - Migration completion summary
- **Architecture Guide**: `../../docs/ARCHITECTURE.md` - Detailed technical architecture

### Planning & Features
- **Future Features**: `docs/FUTURE_FEATURES.md` - Planned enhancements
- **Batch Experimental Analysis**: `docs/BATCH_EXPERIMENTAL_OPTIONS.md` - Design details

### Historical Documentation
- **Archived Migration Docs**: `../../docs/Archive_TESTING_AND_REFACTORING.md` - Historical refactoring journey
- **Archived Planning**: `docs/archive/` - Historical planning documents

## License

MIT License - see LICENSE file for details.