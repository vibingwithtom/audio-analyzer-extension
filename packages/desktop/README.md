# Audio Analyzer Desktop

Desktop audio analyzer application built with Electron. Provides comprehensive audio file analysis including format detection, metadata parsing, and advanced audio level analysis.

## Features

- **Local File Analysis**: Drag & drop or browse for audio files
- **Google Drive Integration**: Paste Google Drive share links to analyze cloud files
- **Format Support**: WAV, MP3, FLAC, AAC, M4A, OGG, WebM
- **Advanced Audio Analysis**: Peak levels, noise floor detection, normalization checks
- **Criteria Validation**: Set target specifications and validate files against them
- **Cross-Platform**: macOS, Windows, and Linux support

## Installation

### From Release
Download the latest release for your platform from the [releases page](https://github.com/vibingwithtom/audio-analyzer-extension/releases).

### Development
```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

## Usage

1. **Local Files**:
   - Drag and drop audio files into the application
   - Or click "Choose File" to browse

2. **Google Drive Files**:
   - Switch to the "Google Drive" tab
   - Paste a Google Drive share link
   - Click "Analyze" to download and process the file

3. **Set Criteria**:
   - Configure target specifications (sample rate, bit depth, etc.)
   - Files will be validated against these criteria with visual feedback

4. **Advanced Analysis**:
   - Click "Advanced Audio Level Analysis" for detailed audio metrics
   - View peak levels, noise floor, and normalization status

## Building

The app uses electron-builder for packaging:

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build-mac
npm run build-win
npm run build-linux

# Create installers and packages
npm run dist
```

## Auto-Updates

The application includes automatic update checking and installation powered by electron-updater. Updates are published through GitHub releases.

## Architecture

This desktop application is part of a monorepo that includes:
- `@audio-analyzer/core`: Shared audio analysis engine
- `@audio-analyzer/extension`: Chrome extension version
- `@audio-analyzer/desktop`: This desktop application

Both the desktop and extension versions use the same core audio analysis functionality.