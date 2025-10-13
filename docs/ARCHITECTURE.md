# Audio Analyzer - Architecture Documentation

**Last Updated:** January 13, 2025
**Version:** 2.0 (Post-Svelte Migration)

---

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Application Architecture](#application-architecture)
4. [Component Structure](#component-structure)
5. [State Management](#state-management)
6. [Service Layer](#service-layer)
7. [Data Flow](#data-flow)
8. [Authentication](#authentication)
9. [File Processing Pipeline](#file-processing-pipeline)
10. [Validation System](#validation-system)
11. [Build & Deployment](#build--deployment)

---

## Overview

Audio Analyzer is a progressive web application for analyzing audio file properties and validating them against preset criteria. The application supports multiple file sources (local files, Google Drive, Box) and provides both basic and experimental audio analysis features.

### Key Features

- **Multi-source file analysis:** Local files, Google Drive, Box
- **Preset validation:** Pre-configured criteria for different recording scenarios
- **Batch processing:** Analyze entire folders in parallel
- **Filename validation:** Pattern-based validation for specific presets
- **Experimental analysis:** Reverb, noise floor, stereo separation, mic bleed detection
- **Analysis modes:** Audio-only, filename-only, full, experimental

---

## Technology Stack

### Frontend
- **Framework:** Svelte 5 (migrated from vanilla JavaScript)
- **Build Tool:** Vite 7
- **Language:** TypeScript + JavaScript
- **Styling:** Component-scoped CSS + Global CSS variables

### Testing
- **Test Framework:** Vitest
- **Test Coverage:** 75%+
- **Total Tests:** 729 tests
- **CI/CD:** GitHub Actions

### Core Library
- **Package:** `@audio-analyzer/core`
- **Modules:** AudioAnalyzer, LevelAnalyzer, CriteriaValidator, BatchProcessor
- **Language:** JavaScript (ES Modules)

### External Services
- **Google Drive API:** OAuth 2.0 + Drive API v3 + Picker API
- **Box API:** OAuth 2.0 + Box Content API
- **Cloud Functions:** Google Cloud Functions (bilingual validation, Box proxy)

---

## Application Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User Interface (Svelte)                │
│  ┌──────────┬──────────────┬──────────┬──────────────┐    │
│  │  Local   │ Google Drive │   Box    │   Settings   │    │
│  │ FileTab  │     Tab      │   Tab    │     Tab      │    │
│  └──────────┴──────────────┴──────────┴──────────────┘    │
│         │              │           │            │           │
│         └──────────────┴───────────┴────────────┘           │
│                        │                                     │
│              ┌─────────▼─────────┐                          │
│              │  AppBridge (Events)│                          │
│              └─────────┬─────────┘                          │
└────────────────────────┼──────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼────────┐ ┌────▼─────┐  ┌──────▼──────┐
│ Service Layer  │ │  Stores  │  │   Auth      │
│ - Analysis     │ │ Settings │  │ Google/Box  │
│ - Drive API    │ │ Criteria │  │             │
│ - Box API      │ │   Mode   │  │             │
└────────┬───────┘ └──────────┘  └─────────────┘
         │
┌────────▼────────────────────────────────────────┐
│         @audio-analyzer/core Library            │
│  AudioAnalyzer │ LevelAnalyzer │ Validator     │
└─────────────────────────────────────────────────┘
```

### Entry Point (main.js - 12 lines)

The application entry point is minimal, consisting of:
1. Service coordinator initialization
2. Svelte app mounting

```javascript
import { mount } from 'svelte';
import App from './components/App.svelte';
import { ServiceCoordinator } from './bridge/service-coordinator';

const coordinator = new ServiceCoordinator();
const app = mount(App, { target: document.getElementById('app') });

export default app;
```

---

## Component Structure

### Component Hierarchy

```
App.svelte (Root)
├── Header
│   ├── Logo
│   └── Dark Mode Toggle
├── Tab Navigation
│   ├── Local File Tab Button
│   ├── Google Drive Tab Button
│   ├── Box Tab Button
│   └── Settings Tab Button
├── Tab Content (conditional rendering)
│   ├── LocalFileTab.svelte
│   │   ├── FileUpload (drop zone)
│   │   ├── AnalysisMode selector
│   │   └── ResultsDisplay
│   │       ├── ResultsTable
│   │       │   ├── Table header
│   │       │   └── Table rows
│   │       ├── AudioPlayer
│   │       └── BatchSummary
│   │
│   ├── GoogleDriveTab.svelte
│   │   ├── AuthSection
│   │   ├── URL Input + Browse Button
│   │   ├── AnalysisMode selector
│   │   ├── ThreeHourConfig (conditional)
│   │   └── ResultsDisplay
│   │
│   ├── BoxTab.svelte
│   │   ├── AuthSection
│   │   ├── URL Input + Browse Button
│   │   ├── AnalysisMode selector
│   │   └── ResultsDisplay
│   │
│   └── SettingsTab.svelte
│       ├── PresetSelector
│       ├── CriteriaInputs (for Custom preset)
│       ├── ThreeHourSettings (conditional)
│       └── AdvancedSettings (collapsible)
│
└── Footer
```

### Component Responsibilities

#### **App.svelte**
- Main app shell and layout
- Tab navigation state
- Dark mode toggle
- Header and footer rendering

#### **LocalFileTab.svelte**
- File upload via drag-and-drop or browse
- Multi-file selection for batch processing
- File validation before analysis
- Calls `analyzeAudioFile()` service

#### **GoogleDriveTab.svelte**
- Google OAuth authentication
- URL parsing (file/folder URLs)
- Google Picker integration (lazy-loaded)
- Batch processing for folders
- Three Hour configuration inputs
- Auto-fetch scripts from Drive folder

#### **BoxTab.svelte**
- Box OAuth authentication
- URL parsing (shared links, file/folder URLs)
- Box Picker integration (lazy-loaded)
- Batch processing for folders

#### **SettingsTab.svelte**
- Preset selection
- Custom criteria configuration
- Three Hour settings (speaker ID, scripts folder)
- Advanced settings (noise floor model, etc.)
- Settings persistence to localStorage

#### **ResultsDisplay.svelte**
- Single file vs batch mode detection
- Batch summary statistics
- Stale results indicator
- Reprocess button with mode switching
- Progress tracking for batch processing

#### **ResultsTable.svelte**
- Detailed results table rendering
- Validation status color coding
- Experimental metrics display
- Filename validation tooltips
- CSV export functionality

#### **AudioPlayer.svelte**
- Audio playback controls
- Waveform visualization (optional)
- Playback state management

---

## State Management

### Svelte Stores

The application uses Svelte stores for reactive state management:

#### **settings.ts**
```typescript
export const currentPresetId = writable<string>('none');
export const availablePresets = writable<Record<string, PresetConfig>>({...});
export const currentCriteria = writable<AudioCriteria | null>(null);
export const hasValidPresetConfig = derived([currentPresetId, currentCriteria], ...);
```

**Responsibilities:**
- Current preset selection
- Available presets registry
- Criteria configuration
- Preset validation state

#### **analysisMode.ts**
```typescript
export const analysisMode = writable<AnalysisMode>('audio-only');
export function setAnalysisMode(mode: AnalysisMode) { ... }
```

**Responsibilities:**
- Current analysis mode
- Mode switching logic
- Persistence to localStorage

#### **tabs.ts**
```typescript
export const currentTab = writable<string>('local-file');
export function setTab(tabId: string) { ... }
```

**Responsibilities:**
- Active tab state
- Tab navigation

#### **auth.ts**
```typescript
export const authState = writable({
  google: { isAuthenticated: false, userInfo: null },
  box: { isAuthenticated: false, userInfo: null }
});
```

**Responsibilities:**
- Google OAuth state
- Box OAuth state
- User information

#### **threeHourSettings.ts**
```typescript
export const threeHourSettings = writable({
  scriptsFolderUrl: '',
  speakerId: ''
});
```

**Responsibilities:**
- Three Hour preset configuration
- Scripts folder URL
- Speaker ID
- Auto-persistence to localStorage

---

## Service Layer

### Core Services

#### **audio-analysis-service.ts**
The central analysis service used by all tabs.

```typescript
export async function analyzeAudioFile(
  file: File | Blob,
  options: AnalysisOptions
): Promise<AudioResults>
```

**Features:**
- Handles all analysis modes (audio-only, filename-only, full, experimental)
- Integrates with `@audio-analyzer/core`
- Filename validation for supported presets
- Smart detection of empty files (metadata-only)
- Experimental analysis (reverb, noise floor, etc.)

#### **google-drive-api.ts**
Google Drive integration service.

```typescript
export class GoogleDriveAPI {
  parseUrl(url: string): { id: string; type: 'file' | 'folder' }
  downloadFile(fileId: string, options?: DownloadOptions): Promise<File>
  downloadFileFromUrl(url: string, options?: DownloadOptions): Promise<File>
  listAudioFilesInFolder(folderId: string): Promise<DriveFileMetadata[]>
  showPicker(options?: PickerOptions): Promise<PickerResult>
  getFileMetadata(fileId: string): Promise<DriveFileMetadata>
}
```

**Features:**
- URL parsing for various Drive URL formats
- Smart partial downloads (100KB for WAV headers)
- Google Picker lazy-loading
- Folder listing and batch processing

#### **box-api.ts**
Box integration service.

```typescript
export class BoxAPI {
  parseUrl(url: string): { id: string; type: 'file' | 'folder'; sharedLink?: string }
  downloadFile(fileId: string, sharedLink?: string, options?: DownloadOptions): Promise<File>
  downloadFileFromUrl(url: string, options?: DownloadOptions): Promise<File>
  listAudioFilesInFolder(folderId: string, sharedLink?: string): Promise<BoxFileMetadata[]>
  getFileMetadata(fileId: string, sharedLink?: string): Promise<BoxFileMetadata>
}
```

**Features:**
- URL parsing for Box shared links and folder URLs
- Smart partial downloads (100KB for WAV headers)
- Box Picker integration (lazy-loaded)
- Shared link support

---

## Data Flow

### Single File Analysis Flow

```
User selects file
    │
    ├─> LocalFileTab / GoogleDriveTab / BoxTab
    │
    ├─> File/URL validation
    │
    ├─> Download file (if remote)
    │   ├─> Full download (experimental mode or non-WAV)
    │   └─> Partial download (audio-only/full mode + WAV)
    │
    ├─> analyzeAudioFile(file, options)
    │   │
    │   ├─> Basic analysis (AudioAnalyzer)
    │   │   ├─> Extract sample rate, bit depth, channels
    │   │   ├─> Calculate duration
    │   │   └─> Detect file type
    │   │
    │   ├─> Advanced analysis (LevelAnalyzer - if experimental mode)
    │   │   ├─> Peak level detection
    │   │   ├─> Noise floor analysis
    │   │   ├─> Reverb estimation (RT60)
    │   │   ├─> Silence detection
    │   │   ├─> Stereo separation
    │   │   └─> Mic bleed detection
    │   │
    │   ├─> Validation (CriteriaValidator)
    │   │   ├─> Validate against preset criteria
    │   │   └─> Filename validation (if applicable)
    │   │
    │   └─> Return AudioResults
    │
    └─> Display results in ResultsTable
```

### Batch Processing Flow

```
User selects folder/multiple files
    │
    ├─> Tab component
    │
    ├─> List all audio files
    │
    ├─> Initialize batch state
    │   ├─> totalFiles
    │   ├─> processedFiles = 0
    │   └─> batchResults = []
    │
    ├─> Process files in parallel (concurrency = 3)
    │   │
    │   ├─> For each file:
    │   │   ├─> Download (if remote and not filename-only)
    │   │   ├─> analyzeAudioFile(file, options)
    │   │   ├─> Add result to batchResults
    │   │   ├─> Increment processedFiles
    │   │   └─> Update progress UI
    │   │
    │   └─> Handle cancellation requests
    │
    ├─> Calculate batch statistics
    │   ├─> Pass count
    │   ├─> Warning count
    │   ├─> Fail count
    │   ├─> Error count
    │   └─> Total duration
    │
    └─> Display batch summary + ResultsTable
```

---

## Authentication

### Google OAuth Flow

```
1. User clicks "Sign in with Google"
2. GoogleAuth.signIn() called
3. Google Identity Services popup opens
4. User authenticates and grants permissions
5. Token received and stored
6. authState store updated
7. Tab UI updates to show authenticated state
8. Google Drive API/Picker now accessible
```

**Scopes:**
- `https://www.googleapis.com/auth/drive.readonly`
- `https://www.googleapis.com/auth/drive.metadata.readonly`

### Box OAuth Flow

```
1. User clicks "Sign in with Box"
2. BoxAuth.signIn() called
3. Redirect to Box authorization URL
4. User authenticates and grants permissions
5. Box redirects to /box-callback
6. Token exchange happens
7. Token stored in localStorage
8. authState store updated
9. Box API now accessible
```

**Scopes:**
- `root_readonly` (read access to all files)

---

## File Processing Pipeline

### Download Optimization

The application uses smart download optimization to reduce bandwidth and improve performance:

#### **Full Download** (needed when):
- Experimental mode (requires complete audio data)
- Non-WAV files (MP3, FLAC, etc. - Web Audio API needs complete file)

#### **Partial Download** (100KB - used when):
- Audio-only or full mode
- WAV file format
- WAV headers contain all metadata in first ~100KB

#### **No Download** (metadata only - used when):
- Filename-only mode
- Only filename validation needed
- Creates empty File object with just the name

```typescript
// Example from google-drive-api.ts
async downloadFile(fileId: string, options?: {
  mode?: AnalysisMode;
  filename?: string;
}): Promise<File> {
  const mode = options?.mode || 'audio-only';
  const filename = options?.filename || '';

  const isWav = filename.toLowerCase().endsWith('.wav');
  const needsFullFile = mode === 'experimental' || !isWav;

  if (needsFullFile) {
    return await this.googleAuth.downloadFile(fileId);
  } else {
    // Partial download optimization
    const partialBlob = await this.googleAuth.downloadFileHeaders(fileId);
    const metadata = await this.getFileMetadata(fileId);
    const file = new File([partialBlob], metadata.name, { type: metadata.mimeType });

    // Store actual file size
    (file as any).actualSize = metadata.size;

    return file;
  }
}
```

---

## Validation System

### Preset-Based Validation

The application includes predefined presets for common recording scenarios:

- **Auditions (Character Recordings)**: 48kHz, 16-bit, Mono, WAV
- **Auditions (Emotional Voice)**: 48kHz, 16-bit, Mono, WAV
- **Character Recordings**: 48kHz, 16-bit, Mono, WAV
- **P2B2 Pairs (Mono)**: 48kHz, 16-bit, Mono, WAV
- **P2B2 Pairs (Stereo)**: 48kHz, 16-bit, Stereo, WAV
- **P2B2 Pairs (Mixed)**: 48kHz, 16-bit, Mono/Stereo, WAV
- **Three Hour**: 48kHz, 16-bit, Mono, WAV, 3+ hour duration, filename validation
- **Bilingual Conversational**: 48kHz, 16-bit, Stereo, WAV, filename validation
- **Custom**: User-defined criteria

### Filename Validation

Two presets support filename validation:

#### **Three Hour** (script-match)
**Pattern:** `[scriptName]_[speakerID].wav`

**Requirements:**
- Scripts folder URL (Google Drive)
- Speaker ID
- Script name must match file in scripts folder

**Example:** `Script_001_SP001.wav` (where Script_001 exists in scripts folder)

#### **Bilingual Conversational** (bilingual-pattern)
**Two patterns supported:**

**Scripted:**
```
[ConversationID]-[LanguageCode]-user-[UserID]-agent-[AgentID]
Example: CONV001-en-user-U123-agent-A456
```

**Unscripted:**
```
SPONTANEOUS_[number]-[LanguageCode]-user-[UserID]-agent-[AgentID]
Example: SPONTANEOUS_042-es-user-U789-agent-A123
```

### Validation Flow

```
analyzeAudioFile()
    │
    ├─> Basic analysis (sample rate, bit depth, etc.)
    │
    ├─> CriteriaValidator.validateResults(result, criteria, skipAudioValidation)
    │   │
    │   ├─> Validate file type
    │   ├─> Validate sample rate
    │   ├─> Validate bit depth
    │   ├─> Validate channels
    │   ├─> Validate duration
    │   └─> Return validation results
    │
    ├─> Filename validation (if preset supports it)
    │   │
    │   ├─> FilenameValidator.validateBilingual(filename)
    │   │   OR
    │   └─> FilenameValidator.validateThreeHour(filename, scriptsList, speakerId)
    │
    ├─> Merge validation results
    │
    └─> Determine overall status (pass/warning/fail)
```

---

## Build & Deployment

### Build Process

```bash
# Development
npm run dev              # Vite dev server on http://localhost:3000

# Production build
npm run build            # Creates dist/ folder

# Testing
npm run test:run         # Run all tests
npm run typecheck        # TypeScript type checking
```

### Deployment

#### **Beta Deployment**
```bash
cd packages/web
npm run deploy:beta
```
- Deploys to: https://audio-analyzer.tinytech.site/beta/
- Uses `vite.config.js` with `base: '/beta/'`
- Manual deployment for testing

#### **Production Deployment**
```bash
git push origin main
```
- **Automatic via GitHub Actions**
- Runs all tests first
- Blocks deployment if tests fail
- Deploys to: https://audio-analyzer.tinytech.site

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
1. Checkout code
2. Install dependencies
3. Run tests (729 tests)
4. Run TypeScript type checking
5. Build production bundle
6. Deploy to GitHub Pages (if all pass)
```

---

## Performance Considerations

### Bundle Size
- **Target:** <500KB total bundle size
- **Current:** Within target (after tree-shaking and minification)
- **Lazy Loading:** Google/Box Pickers loaded on demand

### Optimization Strategies
1. **Partial downloads** for WAV files (100KB vs full file)
2. **Lazy-loading** for Picker libraries
3. **Parallel processing** for batch operations (3 concurrent files)
4. **Tree-shaking** via Vite for unused code elimination
5. **Code splitting** for route-based chunks
6. **Svelte compilation** produces minimal runtime overhead

### Memory Management
- Blob URLs cleaned up with `onDestroy` lifecycle hooks
- File objects released after analysis
- Audio buffers garbage collected after use

---

## Security

### Authentication
- **OAuth 2.0** for Google Drive and Box
- **No credentials stored** in code
- Tokens stored in browser localStorage
- Automatic token refresh

### Data Privacy
- All processing happens **client-side** (browser)
- No audio data sent to servers (except for download from Google/Box)
- Cloud functions used only for:
  - Bilingual validation data fetch
  - Box CORS proxy (required by Box API limitations)

### Content Security
- HTTPS enforced
- No inline scripts
- CSP headers configured

---

## Future Enhancements

### Potential Improvements
1. **CSS Cleanup** - Move component-specific styles from global CSS
2. **WebWorkers** - Offload audio analysis to background threads
3. **IndexedDB** - Cache analysis results for large batches
4. **Waveform Visualization** - Real-time waveform display in AudioPlayer
5. **Export Formats** - PDF reports, detailed CSV exports
6. **Recursive Folder Processing** - Process nested folders in Google Drive/Box
7. **Drag-and-Drop Reordering** - Reorder batch results
8. **Undo/Redo** - For settings changes

---

## Developer Guide

### Adding a New Preset

1. Add preset definition to `src/settings/presets.ts`:
```typescript
export const myNewPreset: PresetConfig = {
  name: 'My New Preset',
  criteria: {
    fileType: ['wav'],
    sampleRate: [48000],
    bitDepth: [24],
    channels: [2],
    minDuration: [60] // 60 seconds minimum
  },
  filenameValidationType: null, // or 'bilingual-pattern' or 'script-match'
  supportsFilenameValidation: false
};
```

2. Register in `availablePresets`:
```typescript
export const availablePresets = {
  'my-new-preset': myNewPreset,
  // ... other presets
};
```

3. Add to SettingsTab dropdown if needed

### Adding a New Component

1. Create component file: `src/components/MyComponent.svelte`
2. Import and use in parent component
3. Add component tests: `tests/components/MyComponent.test.ts`
4. Run tests to verify

### Adding a New Store

1. Create store file: `src/stores/myStore.ts`
2. Define store with persistence if needed:
```typescript
import { writable } from 'svelte/store';

function createMyStore() {
  const { subscribe, set, update } = writable(initialValue);

  return {
    subscribe,
    doSomething: () => update(s => { /* logic */ })
  };
}

export const myStore = createMyStore();
```

3. Import and use with `$` prefix in components: `$myStore`

---

## Troubleshooting

### Common Issues

**Issue:** "Tests failing after changes"
- Run `npm run typecheck` to find TypeScript errors
- Check component imports and exports
- Verify store subscriptions are cleaned up

**Issue:** "Build fails in production"
- Check for console.log statements (remove or guard)
- Verify all imports are correct
- Check for missing dependencies

**Issue:** "OAuth not working"
- Verify redirect URIs match in OAuth app config
- Check localStorage for stale tokens (clear and retry)
- Ensure correct scopes are requested

---

## Contributing

See the main repository README for contribution guidelines.

---

**Maintained by:** @vibingwithtom
**Last Updated:** January 13, 2025
