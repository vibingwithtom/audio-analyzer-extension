# Audio Analyzer: Testing & Refactoring Strategy

**Status:** 🔄 Phase 5 In Progress - Phase 5.9.1.1 
**Started:** October 9, 2025
**Phase 4 Completed:** October 10, 2025
**Phase 5.8.1 Completed:** October 11, 2025

---

## Executive Summary

This document outlines a comprehensive strategy to improve code quality, maintainability, and test coverage for the Audio Analyzer web application. The project currently has **zero test coverage** and a **3,159-line god class** that handles all application logic, making it difficult to maintain and extend safely.

**Strategy:** Test infrastructure first, build comprehensive test suite, then refactor with TypeScript, and migrate to component-based architecture.

**Development Approach:** LLM-assisted development with human review and testing cycles.

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Why Testing First?](#why-testing-first)
3. [LLM-First Development Approach](#llm-first-development-approach)
4. [Git & Branching Strategy](#git--branching-strategy)
5. [Phase 1: Test Infrastructure Setup](#phase-1-test-infrastructure-setup)
6. [Phase 2: Core Business Logic Tests](#phase-2-core-business-logic-tests)
7. [Phase 3: Integration Tests](#phase-3-integration-tests)
8. [Phase 4: Refactoring with TypeScript](#phase-4-refactoring-with-typescript)
9. [Phase 5: Svelte Migration](#phase-5-svelte-migration)
10. [Detailed Refactoring Plan](#detailed-refactoring-plan)
11. [Success Metrics](#success-metrics)
12. [GitHub Issues](#github-issues)
13. [Progress Tracking](#progress-tracking)

---

## Current State Analysis

### Architecture Overview

**Monorepo Structure:**
- ✅ `packages/core`: Well-organized (1,731 lines across 6 focused files)
- ⚠️ `packages/web/src/main.js`: **3,159 lines** - massive god class
- ✅ `packages/web/src/google-auth.js`: 417 lines
- ✅ `packages/web/src/box-auth.js`: 367 lines

### Core Package (Good Structure)
```
packages/core/
├── audio-analyzer.js      (186 lines)
├── batch-processor.js     (313 lines)
├── criteria-validator.js  (238 lines)
├── google-drive.js        (167 lines)
├── index.js              (105 lines)
└── level-analyzer.js      (722 lines)
```

### Web Package (Needs Refactoring)
```
packages/web/src/
├── main.js                   (3,159 lines) ⚠️ GOD CLASS
├── google-auth.js            (417 lines)
├── box-auth.js               (367 lines)
├── config.js                 (1,121 lines data)
├── bilingual-validation-data.json (1MB)
└── styles.css                (23,341 lines)
```

### Critical Issues

#### 1. God Class Anti-Pattern
`main.js` handles everything:
- ❌ UI initialization & DOM management (~200 lines)
- ❌ State management (settings, file processing, batch mode) (~300 lines)
- ❌ File handlers (local, Google Drive, Box) (~600 lines)
- ❌ Display logic (single file vs batch - **DUPLICATED**) (~500 lines)
- ❌ Validation logic (~400 lines)
- ❌ Audio playback (~200 lines)
- ❌ Advanced analysis (~400 lines)
- ❌ Auth status management (~200 lines)
- ❌ Settings management (~400 lines)

#### 2. Code Duplication
- **Display Logic:** `validateAndDisplayResults()` (single file) vs `showBatchResults()` (batch) - nearly identical logic
- **Filename Validation Settings:** Duplicated 3 times for local/Google Drive/Box
- **File Processing:** Similar patterns repeated for each source
- **Column Visibility:** Separate implementations for single vs batch tables

#### 3. Testing & Quality
- ❌ **Zero test coverage**
- ❌ No testing framework configured
- ❌ Only stub test scripts in package.json
- ❌ No CI/CD testing pipeline
- ❌ High risk of regressions when making changes

#### 4. Tight Coupling
- Business logic mixed with UI logic
- Hard to test individual components
- Difficult to reuse code
- Changes in one area affect many others

#### 5. No Type Safety
- ❌ No TypeScript or JSDoc
- ❌ Runtime errors from type mismatches
- ❌ Poor IDE autocomplete
- ❌ Difficult for LLMs to infer correct usage

---

## Git & Branching Strategy

### Overview

This project follows a **phase-based branching strategy** with frequent deployments to beta for testing. Each phase gets its own feature branch, with optional sub-branches for complex tasks.

### Branch Structure

```
main (production-ready, always stable)
├── feature/phase-1-test-infrastructure
├── feature/phase-2-3-comprehensive-tests
├── feature/phase-4-typescript-refactor
│   ├── feature/phase-4-typescript-setup
│   ├── feature/phase-4-file-handlers
│   ├── feature/phase-4-settings-manager
│   └── feature/phase-4-validation-module
└── feature/phase-5-svelte-migration
```

### Workflow by Phase


#### Phase 5: Svelte Migration
```bash
git checkout -b feature/phase-5-svelte-migration
# Convert one tab at a time
# Commit after each tab conversion
# Deploy to beta after each tab
# Merge to main after all tabs converted and verified
```

**Workflow per Tab:**
1. Write component tests (test-first)
2. Convert tab to Svelte
3. Run tests
4. Deploy to beta
5. Verify in beta
6. Commit
7. Repeat for next tab

**Merge Criteria:**
- ✅ All tabs converted
- ✅ All component tests passing (90%+ coverage per component)
- ✅ Bundle size increase <15KB
- ✅ Beta testing complete
- ✅ No regressions

**Risk Level:** High (major architectural change)

**Beta Testing Required:** Yes - after each tab and final

### Key Principles

#### 1. Always Deploy to Beta Before Merging to Main
- **Critical for Phases 4 and 5** where refactoring/migration happens
- Verify functionality manually in beta environment
- Catch issues before production

#### 2. Keep Main Stable
- Main branch should always be production-ready
- Only merge after beta verification passes
- If main breaks, fix immediately

#### 3. Small, Frequent Commits
- Commit after completing each logical unit of work
- Use descriptive commit messages (conventional commits format)
- Makes it easier to identify and revert issues

#### 4. Commit Message Format
Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**
- `feat:` New features
- `fix:` Bug fixes
- `refactor:` Code restructuring without functional changes
- `test:` Adding or updating tests
- `docs:` Documentation updates
- `chore:` Maintenance tasks (dependencies, config)

**Examples:**
```
feat: add Vitest testing infrastructure

test: add filename validation tests for Bilingual preset

refactor: extract file handlers to TypeScript modules
- Created BaseFileHandler abstract class
- Implemented LocalFileHandler, GoogleDriveHandler, BoxFileHandler
- Moved ~600 lines from main.js

fix: resolve TypeScript type errors in settings manager
```

#### 5. One Phase Branch = One PR (or Multiple Small PRs)
- For review purposes, each phase can be one PR
- Or split into multiple PRs if phase is large (e.g., Phase 4 sub-branches)
- Easier to review smaller, focused changes

### Deployment Workflow

**Every deployment follows this pattern:**

```bash
# 1. Make changes on feature branch
git add .
git commit -m "feat: add TypeScript file handlers"

# 2. Deploy to beta
cd packages/web
npm run deploy:beta

# 3. Test in beta
# Visit https://audio-analyzer.tinytech.site/beta/
# Verify changes work correctly

# 4. If beta passes, merge to main
git checkout main
git merge feature/phase-4-file-handlers

# 5. Deploy to production
cd packages/web
npm run deploy

# 6. Verify production
# Visit https://audio-analyzer.tinytech.site
```

### Emergency Rollback

If production breaks:

```bash
# Option 1: Revert the merge commit
git revert -m 1 <merge-commit-hash>
git push origin main

# Option 2: Fix forward (if issue is minor)
git checkout -b hotfix/fix-production-issue
# Make fix
git commit -m "fix: resolve production issue"
git push origin hotfix/fix-production-issue
# Deploy to beta, test, then merge to main
```

### Branch Lifecycle

**Creating a branch:**
```bash
git checkout main
git pull origin main
git checkout -b feature/phase-X-description
```

**Keeping branch up to date:**
```bash
# If main has changed while you're working
git checkout main
git pull origin main
git checkout feature/phase-X-description
git merge main
# Resolve any conflicts
```

**Cleaning up after merge:**
```bash
# Delete local branch
git branch -d feature/phase-X-description

# Delete remote branch (if pushed)
git push origin --delete feature/phase-X-description
```

---


### Phases 1-4: Summary of Achievements

**Testing Infrastructure:**
- ✅ 635 tests passing (0 flaky tests)
- ✅ 75%+ code coverage across codebase
- ✅ Fast test suite (<30 seconds full run)
- ✅ CI/CD integration with GitHub Actions

**Code Quality:**
- ✅ TypeScript adoption for all new modules
- ✅ 100% type coverage in new modules
- ✅ Better separation of concerns
- ✅ Eliminated some code duplication

**Refactoring Progress:**
- ✅ Handler modules extracted and typed
- ✅ Validation logic modularized
- ✅ Settings management centralized
- ✅ UI controller separated

**Remaining Work:**
- ⬜ main.js still at ~2,800 lines (needs Svelte migration for full reduction)
- ⬜ Display logic duplication still exists (will be eliminated in Phase 5)
- ⬜ Tab components still tightly coupled (Phase 5 will componentize)

**Next Step:** Phase 5 - Svelte Migration to achieve final architecture goals

---

## Phase 5: Svelte Migration

### Architectural Decisions

**State Management:** Use Svelte stores for shared state (SettingsManager, current results)

**Auth Integration:** Keep `google-auth.js` and `box-auth.js` as vanilla JS
- Pass auth instances as props to tabs
- No Svelte store conversion needed
- Reduces risk and scope

**UIController:** Remove during Phase 5.8 cleanup (Svelte handles DOM rendering)

### Migration Strategy

The migration follows a **sequential approach**: infrastructure → app shell → shared components → tabs → cleanup.

Each step includes explicit test checklists and manual verification.

#### 5.1 Setup & Infrastructure (1 day) ✅

#### 5.8.2 Google Drive Picker Lazy-Loading (0.5 days) ⬜

**Goal:** Apply lazy-loading pattern to Google Drive Picker (conditional on 5.8.1 success)

**Prerequisites:** Phase 5.8.1 must be complete and tested

**Why Conditional:**
- Only do this if Box Picker lazy-loading works well
- Google Picker is ~200KB (smaller than Box, but still benefits from lazy-loading)
- Same UX improvement: URL-only users don't pay picker cost

**Tasks:**

1. Refactor GoogleDriveTab.svelte:
   - Move `initPicker()` call from mount to button click
   - Add loading state to "Browse Google Drive" button
   - Reuse lazy-loading pattern from Box implementation

2. Test:
   - Verify picker loads only on button click
   - URL-only workflow unaffected
   - No regressions in existing functionality

**Success Criteria:**
- [ ] Picker loads on button click (not on tab open)
- [ ] Consistent UX with Box tab
- [ ] No performance regressions

**Commit:** `refactor: Phase 5.8.2 - Lazy-load Google Drive Picker`

---

#### 5.9 Batch/Folder Processing (2-3 days) ⬜

**Goal:** Implement batch processing for multiple files and folders across all tabs

**Why This is Critical:**
The original plan deferred batch processing as "optional," but it's a core feature that users need:
- Process entire folders of audio files at once
- Efficient validation of large batches (especially with filename-only mode)
- Essential for production workflows (e.g., validating 100+ files for Bilingual preset)
- Already supported by the core library (`BatchProcessor` class exists)

**Current State:**
- All tabs (Local Files, Google Drive, Box) only support single file processing
- `ResultsTable` component has batch mode support but it's unused
- Core library has `BatchProcessor` but it's not integrated into the Svelte app

**What Needs to Be Built:**

### 5.9.1 Local Files Tab - Multi-File Selection

**Implementation:**

1. **Update LocalFileTab.svelte**
   ```typescript
   // Add multi-file input
   <input
     type="file"
     accept="audio/*"
     multiple
     on:change={handleFileSelect}
   />
   ```

2. **Batch Processing Logic**
   ```typescript
   async function handleFileSelect(event: Event) {
     const input = event.target as HTMLInputElement;
     const files = Array.from(input.files || []);

     if (files.length === 0) return;

     if (files.length === 1) {
       // Single file - existing logic
       await processSingleFile(files[0]);
     } else {
       // Multiple files - batch processing
       await processBatchFiles(files);
     }
   }

   async function processBatchFiles(files: File[]) {
     processing = true;
     error = '';
     batchResults = [];

     for (let i = 0; i < files.length; i++) {
       const file = files[i];
       updateProgress(i + 1, files.length);

       try {
         const result = await processFile(file);
         batchResults.push(result);
       } catch (err) {
         batchResults.push({
           filename: file.name,
           status: 'fail',
           error: err.message
         });
       }
     }

     processing = false;
   }
   ```

3. **Progress Tracking UI**
   ```svelte
   {#if processing && totalFiles > 1}
     <div class="batch-progress">
       <div class="progress-bar">
         <div class="progress-fill" style="width: {(processedFiles / totalFiles) * 100}%"></div>
       </div>
       <span>Processing {processedFiles} of {totalFiles} files...</span>
     </div>
   {/if}
   ```

4. **Display Batch Results**
   ```svelte
   {#if batchResults.length > 0}
     <ResultsTable
       results={batchResults}
       mode="batch"
       metadataOnly={$analysisMode === 'filename-only'}
     />
   {/if}
   ```

### 5.9.1.1 Local Files - Experimental Display support
refer to documentation in   docs/PHASE_5.9.1.1_EXPERIMENTAL_DISPLAY.md


### 5.9.2 Google Drive Tab - Folder Support

**Implementation:**

1. **Update GoogleDriveAPI.ts**
   ```typescript
   async listFilesInFolder(folderId: string): Promise<FileMetadata[]> {
     // Use Drive API v3 to list all files in folder
     // Filter for audio files only
     const response = await gapi.client.drive.files.list({
       q: `'${folderId}' in parents and (mimeType contains 'audio/' or fileExtension='wav' or fileExtension='mp3' or fileExtension='flac')`,
       fields: 'files(id, name, mimeType, size)',
       pageSize: 1000
     });
     return response.result.files;
   }

   async downloadFolder(folderId: string): Promise<File[]> {
     const files = await this.listFilesInFolder(folderId);
     const downloadedFiles: File[] = [];

     for (const fileMetadata of files) {
       const file = await this.downloadFile(fileMetadata.id, fileMetadata.name);
       downloadedFiles.push(file);
     }

     return downloadedFiles;
   }
   ```

2. **Update GoogleDriveTab.svelte**
   ```typescript
   async function handleUrlSubmit() {
     const url = fileUrl.trim();
     if (!url) return;

     // Detect if URL is a folder
     if (url.includes('/folders/') || url.includes('?id=') && !url.includes('/file/')) {
       // Folder URL
       await processFolderUrl(url);
     } else {
       // File URL
       await processFileUrl(url);
     }
   }

   async function processFolderUrl(url: string) {
     processing = true;
     error = '';
     batchResults = [];

     try {
       const folderId = driveAPI.parseFolderUrl(url);
       const files = await driveAPI.listFilesInFolder(folderId);

       totalFiles = files.length;
       processedFiles = 0;

       for (const fileMetadata of files) {
         processedFiles++;

         let file: File;
         if ($analysisMode === 'filename-only') {
           // Metadata only
           file = new File([], fileMetadata.name);
         } else {
           // Download actual file
           file = await driveAPI.downloadFile(fileMetadata.id, fileMetadata.name);
         }

         const result = await processFile(file);
         batchResults.push(result);
       }
     } catch (err) {
       error = err.message;
     } finally {
       processing = false;
     }
   }
   ```

3. **Google Picker Multi-Select**
   ```typescript
   async function handleBrowseDrive() {
     if (!driveAPI) return;

     try {
       const pickerResult = await driveAPI.showPicker({
         multiSelect: true,  // Enable multi-select
         includeFolders: true // Allow folder selection
       });

       if (pickerResult.docs && pickerResult.docs.length > 0) {
         const docs = pickerResult.docs;

         // Check if any folders selected
         const folders = docs.filter(doc => doc.mimeType === 'application/vnd.google-apps.folder');
         const files = docs.filter(doc => doc.mimeType !== 'application/vnd.google-apps.folder');

         if (folders.length > 0) {
           // Process folders
           for (const folder of folders) {
             await processFolderId(folder.id);
           }
         }

         if (files.length > 0) {
           // Process individual files
           await processBatchFiles(files);
         }
       }
     } catch (err) {
       error = err.message;
     }
   }
   ```

### 5.9.3 Box Tab - Folder Support

**Implementation:**

1. **Update BoxAPI.ts**
   ```typescript
   async listFilesInFolder(folderId: string): Promise<FileMetadata[]> {
     const response = await fetch(
       `https://api.box.com/2.0/folders/${folderId}/items?fields=id,name,type,size`,
       {
         headers: {
           'Authorization': `Bearer ${this.auth.getAccessToken()}`
         }
       }
     );

     const data = await response.json();
     // Filter for audio files only
     return data.entries.filter(item =>
       item.type === 'file' && this.isAudioFile(item.name)
     );
   }

   parseFolderUrl(url: string): string {
     // Parse Box folder URLs:
     // https://app.box.com/folder/123456789
     const match = url.match(/\/folder\/(\d+)/);
     if (match) return match[1];
     throw new Error('Invalid Box folder URL');
   }
   ```

2. **Update BoxTab.svelte**
   ```typescript
   async function handleUrlSubmit() {
     const url = fileUrl.trim();
     if (!url) return;

     // Detect if URL is a folder
     if (url.includes('/folder/')) {
       await processFolderUrl(url);
     } else {
       await processFileUrl(url);
     }
   }

   async function processFolderUrl(url: string) {
     processing = true;
     error = '';
     batchResults = [];

     try {
       const folderId = boxAPI.parseFolderUrl(url);
       const files = await boxAPI.listFilesInFolder(folderId);

       totalFiles = files.length;
       processedFiles = 0;

       for (const fileMetadata of files) {
         processedFiles++;

         let file: File;
         if ($analysisMode === 'filename-only') {
           // Metadata only
           file = new File([], fileMetadata.name);
         } else {
           // Download actual file
           file = await boxAPI.downloadFile(fileMetadata.id, fileMetadata.name);
         }

         const result = await processFile(file);
         batchResults.push(result);
       }
     } catch (err) {
       error = err.message;
     } finally {
       processing = false;
     }
   }
   ```

### 5.9.4 Shared Batch Processing Store

**Create `src/stores/batchProcessing.ts`:**

```typescript
import { writable } from 'svelte/store';

export interface BatchProgress {
  total: number;
  processed: number;
  current: string;
  startTime: number;
}

function createBatchStore() {
  const { subscribe, set, update } = writable<BatchProgress | null>(null);

  return {
    subscribe,
    start: (total: number) => {
      set({
        total,
        processed: 0,
        current: '',
        startTime: Date.now()
      });
    },
    updateProgress: (processed: number, currentFile: string) => {
      update(state => state ? {
        ...state,
        processed,
        current: currentFile
      } : null);
    },
    complete: () => set(null)
  };
}

export const batchProgress = createBatchStore();
```

### 5.9.5 Batch Results Summary Component

**Create `src/components/BatchSummary.svelte`:**

```svelte
<script lang="ts">
  export let results: AudioResults[];

  $: summary = {
    total: results.length,
    pass: results.filter(r => r.status === 'pass').length,
    warning: results.filter(r => r.status === 'warning').length,
    fail: results.filter(r => r.status === 'fail').length,
    totalDuration: results.reduce((sum, r) => sum + (r.duration || 0), 0)
  };
</script>

<div class="batch-summary">
  <h3>Batch Summary</h3>
  <div class="summary-stats">
    <div class="stat">
      <span class="stat-label">Total Files:</span>
      <span class="stat-value">{summary.total}</span>
    </div>
    <div class="stat pass">
      <span class="stat-label">✓ Pass:</span>
      <span class="stat-value">{summary.pass}</span>
    </div>
    <div class="stat warning">
      <span class="stat-label">⚠ Warning:</span>
      <span class="stat-value">{summary.warning}</span>
    </div>
    <div class="stat fail">
      <span class="stat-label">✗ Fail:</span>
      <span class="stat-value">{summary.fail}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Total Duration:</span>
      <span class="stat-value">{formatDuration(summary.totalDuration)}</span>
    </div>
  </div>
</div>
```

**Implementation Plan:**

1. **Phase 5.9.1**: Local Files multi-select (0.5 day)
   - Add multi-file input
   - Implement batch processing loop
   - Add progress indicator

2. **Phase 5.9.2**: Google Drive folder support (1 day)
   - Add folder listing API method
   - Parse folder URLs
   - Update picker for multi-select
   - Batch processing integration

3. **Phase 5.9.3**: Box folder support (1 day)
   - Add folder listing API method
   - Parse folder URLs
   - Batch processing integration

4. **Phase 5.9.4**: Shared batch UI (0.5 day)
   - Create batch progress store
   - Create BatchSummary component
   - Polish batch results display

**Success Criteria:**
- [ ] Local Files: Can select multiple files and process them
- [ ] Google Drive: Can paste folder URL and process all audio files
- [ ] Google Drive: Picker supports multi-select and folder selection
- [ ] Box: Can paste folder URL and process all audio files
- [ ] Progress indicator shows during batch processing
- [ ] BatchSummary component displays aggregate stats
- [ ] Filename-only mode works efficiently for batch processing (no downloads)
- [ ] All 698+ tests still passing
- [ ] Beta deployment tested with real folders

**Commit:** `feat: Phase 5.9 - Batch/folder processing for all tabs`

---

#### 5.11 Three Hour Configuration (1-2 days) ⬜

**Goal:** Add scripts folder and speaker ID configuration for Three Hour preset filename validation

**Prerequisites:** Phase 5.7 (Google Drive Integration) must be complete

**Why This is a Separate Phase:**
Three Hour filename validation requires additional inputs that are:
- **Tab-specific**: Only available on Google Drive tab (not Local Files or Box)
- **User-configured**: Scripts folder URL + speaker ID must be provided
- **Persistent**: Need to store configuration across sessions
- **Requires Drive API**: Must fetch script list from Drive folder

**What Needs to Be Built:**

1. **Three Hour Settings Store** (`src/stores/threeHourSettings.ts`)
   ```typescript
   export const threeHourSettings = writable({
     scriptsFolderUrl: '',
     speakerId: ''
   });
   // Auto-persist to localStorage
   ```

2. **Google Drive Tab - Three Hour Configuration UI**

   When Three Hour preset is selected AND user chooses analysis mode with filename validation:

   ```
   ┌─────────────────────────────────────────────┐
   │ Three Hour Configuration:                   │
   │                                             │
   │ Scripts Folder URL:                         │
   │ [https://drive.google.com/drive/folders/...]│
   │                                             │
   │ Speaker ID:                                 │
   │ [SP001                                    ] │
   │                                             │
   │ ℹ️ These settings are saved automatically   │
   └─────────────────────────────────────────────┘
   ```

3. **Validation Integration**
   - Fetch script list from Google Drive scripts folder (using API from Phase 5.7)
   - Pass to FilenameValidator.validateThreeHour()
   - Display validation results in filename cell
   - Works with all three analysis modes

4. **Error Handling**
   - Invalid/inaccessible scripts folder URL
   - Empty speaker ID
   - Network errors fetching scripts
   - Graceful degradation if config missing

**Tab-Specific Behavior:**

| Tab | Three Hour Preset Behavior |
|-----|----------------------------|
| **Google Drive** | Show config inputs when filename validation mode selected |
| **Local Files** | Show note: "Three Hour filename validation requires Google Drive tab" |
| **Box** | Show note: "Three Hour filename validation requires Google Drive tab" |

**Implementation Tasks:**

1. Create `threeHourSettings` store with localStorage persistence
2. Add configuration UI to GoogleDriveTab (conditional on preset + analysis mode)
3. Fetch script list from Drive folder when URL provided
4. Integrate with FilenameValidator.validateThreeHour()
5. Add helpful error messages for common config issues
6. Update Settings tab docs to mention Google Drive configuration
7. Manual testing: Configure Three Hour on Drive tab, validate files

**Success Criteria:**
- [ ] Three Hour config inputs appear on Google Drive tab
- [ ] Settings persist across sessions
- [ ] Script folder URL validates and fetches script list
- [ ] Filename validation works with configured settings
- [ ] Clear error messages for missing/invalid config
- [ ] Other tabs show appropriate messaging

**Commit:** `feat: Phase 5.9 - Three Hour configuration inputs on Google Drive tab`

---

#### 5.12 Settings Tab Migration (1-2 days) ⬜

**Goal:** Finalize Settings tab Svelte conversion and polish

**Implementation Tasks:**

1. **Write SettingsTab tests first**

```typescript
// tests/components/SettingsTab.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { get } from 'svelte/store';
import SettingsTab from '../../src/components/SettingsTab.svelte';
import { settingsManager } from '../../src/stores';

describe('SettingsTab', () => {
  beforeEach(() => {
    // Reset settings to default
    settingsManager.set(new SettingsManager());
  });

  describe('Preset Selection', () => {
    it('should display all preset options', () => {
      render(SettingsTab);

      expect(screen.getByText(/auditions/i)).toBeInTheDocument();
      expect(screen.getByText(/character recordings/i)).toBeInTheDocument();
      expect(screen.getByText(/three hour/i)).toBeInTheDocument();
      expect(screen.getByText(/bilingual/i)).toBeInTheDocument();
      expect(screen.getByText(/custom/i)).toBeInTheDocument();
    });

    it('should update store when preset selected', async () => {
      const user = userEvent.setup();
      render(SettingsTab);

      const select = screen.getByLabelText(/preset/i);
      await user.selectOptions(select, 'auditions');

      await waitFor(() => {
        const settings = get(settingsManager);
        expect(settings.currentPreset).toBe('auditions');
      });
    });

    it('should load preset criteria when selected', async () => {
      const user = userEvent.setup();
      render(SettingsTab);

      const select = screen.getByLabelText(/preset/i);
      await user.selectOptions(select, 'three-hour');

      await waitFor(() => {
        // Should show Three Hour specific options
        expect(screen.getByLabelText(/speaker id/i)).toBeInTheDocument();
      });
    });
  });

  describe('Criteria Customization', () => {
    it('should show criteria inputs for custom preset', async () => {
      const user = userEvent.setup();
      render(SettingsTab);

      const select = screen.getByLabelText(/preset/i);
      await user.selectOptions(select, 'custom');

      await waitFor(() => {
        expect(screen.getByLabelText(/sample rate/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/bit depth/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/channels/i)).toBeInTheDocument();
      });
    });

    it('should update criteria when inputs change', async () => {
      const user = userEvent.setup();
      render(SettingsTab);

      const select = screen.getByLabelText(/preset/i);
      await user.selectOptions(select, 'custom');

      const sampleRateInput = screen.getByLabelText(/sample rate/i);
      await user.clear(sampleRateInput);
      await user.type(sampleRateInput, '96000');

      await waitFor(() => {
        const settings = get(settingsManager);
        expect(settings.criteria.sampleRate).toBe(96000);
      });
    });
  });

  describe('Three Hour Settings', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(SettingsTab);
      const select = screen.getByLabelText(/preset/i);
      await user.selectOptions(select, 'three-hour');
    });

    it('should show speaker ID input', () => {
      expect(screen.getByLabelText(/speaker id/i)).toBeInTheDocument();
    });

    it('should show scripts folder URL input', () => {
      expect(screen.getByLabelText(/scripts folder/i)).toBeInTheDocument();
    });

    it('should update validation settings', async () => {
      const user = userEvent.setup();

      const speakerInput = screen.getByLabelText(/speaker id/i);
      await user.type(speakerInput, 'SPEAKER123');

      const folderInput = screen.getByLabelText(/scripts folder/i);
      await user.type(folderInput, 'https://drive.google.com/drive/folders/abc');

      await waitFor(() => {
        const settings = get(settingsManager);
        expect(settings.threeHourSettings.speakerId).toBe('SPEAKER123');
        expect(settings.threeHourSettings.scriptsFolderUrl).toContain('abc');
      });
    });
  });

  describe('Settings Persistence', () => {
    it('should load saved settings on mount', () => {
      // Pre-save settings
      localStorage.setItem('audioAnalyzerSettings', JSON.stringify({
        currentPreset: 'auditions',
        criteria: { sampleRate: 48000 }
      }));

      render(SettingsTab);

      const select = screen.getByLabelText(/preset/i) as HTMLSelectElement;
      expect(select.value).toBe('auditions');
    });

    it('should save settings when changed', async () => {
      const user = userEvent.setup();
      render(SettingsTab);

      const select = screen.getByLabelText(/preset/i);
      await user.selectOptions(select, 'three-hour');

      await waitFor(() => {
        const saved = localStorage.getItem('audioAnalyzerSettings');
        expect(saved).toBeTruthy();
        const parsed = JSON.parse(saved!);
        expect(parsed.currentPreset).toBe('three-hour');
      });
    });
  });

  describe('Advanced Settings', () => {
    it('should toggle advanced options', async () => {
      const user = userEvent.setup();
      render(SettingsTab);

      const advancedToggle = screen.getByText(/advanced/i);
      await user.click(advancedToggle);

      expect(screen.getByLabelText(/noise floor model/i)).toBeInTheDocument();
    });

    it('should update advanced settings', async () => {
      const user = userEvent.setup();
      render(SettingsTab);

      const advancedToggle = screen.getByText(/advanced/i);
      await user.click(advancedToggle);

      const modelSelect = screen.getByLabelText(/noise floor model/i);
      await user.selectOptions(modelSelect, 'histogram');

      await waitFor(() => {
        const settings = get(settingsManager);
        expect(settings.advancedSettings.noiseFloorModel).toBe('histogram');
      });
    });
  });
});
```

2. **Create SettingsTab.svelte component**

```svelte
<!-- src/components/SettingsTab.svelte -->
<script lang="ts">
  import { settingsManager } from '../stores';

  let showAdvanced = false;

  $: currentPreset = $settingsManager.currentPreset;
  $: criteria = $settingsManager.criteria;
  $: threeHourSettings = $settingsManager.threeHourSettings;
  $: advancedSettings = $settingsManager.advancedSettings;

  function handlePresetChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    settingsManager.update(s => {
      s.setPreset(target.value);
      return s;
    });
  }

  function updateCriteria(field: string, value: any) {
    settingsManager.update(s => {
      s.criteria[field] = value;
      s.save();
      return s;
    });
  }

  function updateThreeHourSettings(field: string, value: string) {
    settingsManager.update(s => {
      s.threeHourSettings[field] = value;
      s.save();
      return s;
    });
  }

  function updateAdvancedSettings(field: string, value: any) {
    settingsManager.update(s => {
      s.advancedSettings[field] = value;
      s.save();
      return s;
    });
  }
</script>

<div class="settings-tab">
  <h2>Settings</h2>

  <section class="preset-section">
    <label for="preset-select">Validation Preset</label>
    <select
      id="preset-select"
      bind:value={currentPreset}
      on:change={handlePresetChange}
    >
      <option value="none">None (Metadata Only)</option>
      <option value="auditions">Auditions</option>
      <option value="character">Character Recordings</option>
      <option value="p2b2-mono">P2B2 Pairs (Mono)</option>
      <option value="p2b2-stereo">P2B2 Pairs (Stereo)</option>
      <option value="p2b2-mixed">P2B2 Pairs (Mixed)</option>
      <option value="three-hour">Three Hour</option>
      <option value="bilingual">Bilingual Conversational</option>
      <option value="custom">Custom</option>
    </select>

    <p class="preset-description">
      {#if currentPreset === 'none'}
        No validation criteria applied
      {:else if currentPreset === 'auditions'}
        48kHz, 16-bit, Mono, WAV format
      {:else if currentPreset === 'character'}
        48kHz, 16-bit, Mono, WAV format with character validation
      {:else if currentPreset === 'three-hour'}
        48kHz, 16-bit, Mono, 3+ hour duration with script matching
      {:else if currentPreset === 'bilingual'}
        48kHz, 16-bit, Stereo conversational with filename pattern validation
      {:else if currentPreset === 'custom'}
        Define your own validation criteria
      {/if}
    </p>
  </section>

  {#if currentPreset === 'custom'}
    <section class="criteria-section">
      <h3>Custom Criteria</h3>

      <label for="sample-rate">Sample Rate (Hz)</label>
      <input
        id="sample-rate"
        type="number"
        value={criteria.sampleRate}
        on:change={(e) => updateCriteria('sampleRate', parseInt(e.currentTarget.value))}
      />

      <label for="bit-depth">Bit Depth</label>
      <input
        id="bit-depth"
        type="number"
        value={criteria.bitDepth}
        on:change={(e) => updateCriteria('bitDepth', parseInt(e.currentTarget.value))}
      />

      <label for="channels">Channels</label>
      <select
        id="channels"
        value={criteria.channels}
        on:change={(e) => updateCriteria('channels', parseInt(e.currentTarget.value))}
      >
        <option value={1}>Mono (1)</option>
        <option value={2}>Stereo (2)</option>
      </select>

      <label for="file-type">File Type</label>
      <input
        id="file-type"
        type="text"
        value={criteria.fileType}
        on:change={(e) => updateCriteria('fileType', e.currentTarget.value)}
      />

      <label for="min-duration">Minimum Duration (seconds)</label>
      <input
        id="min-duration"
        type="number"
        value={criteria.minDuration}
        on:change={(e) => updateCriteria('minDuration', parseInt(e.currentTarget.value))}
      />
    </section>
  {/if}

  {#if currentPreset === 'three-hour'}
    <section class="three-hour-section">
      <h3>Three Hour Settings</h3>

      <label for="speaker-id">Speaker ID</label>
      <input
        id="speaker-id"
        type="text"
        placeholder="e.g., SPEAKER001"
        value={threeHourSettings.speakerId || ''}
        on:input={(e) => updateThreeHourSettings('speakerId', e.currentTarget.value)}
      />

      <label for="scripts-folder">Scripts Folder URL (Google Drive)</label>
      <input
        id="scripts-folder"
        type="text"
        placeholder="https://drive.google.com/drive/folders/..."
        value={threeHourSettings.scriptsFolderUrl || ''}
        on:input={(e) => updateThreeHourSettings('scriptsFolderUrl', e.currentTarget.value)}
      />
    </section>
  {/if}

  <section class="advanced-section">
    <button on:click={() => showAdvanced = !showAdvanced} class="toggle-advanced">
      {showAdvanced ? '▼' : '►'} Advanced Settings
    </button>

    {#if showAdvanced}
      <div class="advanced-content">
        <label for="noise-floor-model">Noise Floor Model</label>
        <select
          id="noise-floor-model"
          value={advancedSettings.noiseFloorModel}
          on:change={(e) => updateAdvancedSettings('noiseFloorModel', e.currentTarget.value)}
        >
          <option value="histogram">Histogram (Recommended)</option>
          <option value="old">Old Model (Bottom 20% RMS)</option>
        </select>

        <label>
          <input
            type="checkbox"
            checked={advancedSettings.enableReverbEstimation}
            on:change={(e) => updateAdvancedSettings('enableReverbEstimation', e.currentTarget.checked)}
          />
          Enable Reverb (RT60) Estimation
        </label>

        <label>
          <input
            type="checkbox"
            checked={advancedSettings.enableMicBleedDetection}
            on:change={(e) => updateAdvancedSettings('enableMicBleedDetection', e.currentTarget.checked)}
          />
          Enable Mic Bleed Detection
        </label>
      </div>
    {/if}
  </section>
</div>

<style>
  .settings-tab {
    padding: 1rem;
    max-width: 600px;
  }

  section {
    margin: 2rem 0;
  }

  h2 {
    margin-bottom: 1rem;
  }

  h3 {
    margin-bottom: 0.5rem;
    font-size: 1.1rem;
  }

  label {
    display: block;
    margin: 1rem 0 0.25rem;
    font-weight: 500;
  }

  input[type="text"],
  input[type="number"],
  select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 1rem;
  }

  .preset-description {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: var(--info-bg);
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .toggle-advanced {
    background: none;
    border: none;
    padding: 0.5rem 0;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
  }

  .advanced-content {
    margin-top: 1rem;
    padding: 1rem;
    background: var(--bg-secondary);
    border-radius: 4px;
  }

  label input[type="checkbox"] {
    width: auto;
    margin-right: 0.5rem;
  }
</style>
```

3. **Update App.svelte**
```svelte
{#if $currentTab === 'settings'}
  <SettingsTab />
{/if}
```

4. **Manual testing checklist**

**Preset selection:**
- [ ] All presets appear in dropdown
- [ ] Selecting preset updates UI immediately
- [ ] Preset descriptions accurate
- [ ] Settings persist across page refresh

**Custom criteria:**
- [ ] All criteria fields editable
- [ ] Values save correctly
- [ ] Invalid values handled gracefully

**Three Hour settings:**
- [ ] Speaker ID input works
- [ ] Scripts folder URL input works
- [ ] Values persist

**Advanced settings:**
- [ ] Toggle expands/collapses
- [ ] Noise floor model selection works
- [ ] Checkboxes toggle correctly
- [ ] Settings save

**Visual verification:**
- [ ] Layout clean and organized
- [ ] Form inputs styled correctly
- [ ] No console errors
- [ ] Mobile responsive

**Success Criteria:**
- [ ] All SettingsTab tests passing (90%+ coverage)
- [ ] Manual test checklist complete
- [ ] All settings work identically
- [ ] Settings persist correctly
- [ ] No regressions

**Commit:** `feat: migrate Settings tab to Svelte`

---

#### 5.12 Experimental Audio Analysis Display (1-2 days) ⬜

**Goal:** Display all experimental audio analysis features (reverb, noise floor, stereo separation, mic bleed, silence analysis) in the UI

**Why This is Missing:**
The core library (`level-analyzer.js`) has extensive experimental analysis features that are fully implemented but NOT displayed in the Svelte UI:
- Reverb Estimation (RT60) - Room acoustics analysis
- Noise Floor (histogram & RMS methods) - Background noise level
- Normalization Status - Peak level vs target (-6 dB)
- Silence Analysis - Leading, trailing, and longest silence gaps
- Stereo Separation - Detects mono-as-stereo, conversational stereo, etc.
- Mic Bleed Detection - Cross-channel leakage in conversational stereo

These are calculated by `LevelAnalyzer.analyzeAudioBuffer()` but the `ResultsTable` component doesn't show them.

**Current State:**
- `analysisMode` controls what gets analyzed (full/audio-only/filename-only)
- Full and audio-only modes already run `LevelAnalyzer.analyzeAudioBuffer()`
- Results object contains: `peakDb`, `noiseFloorDb`, `noiseFloorDbHistogram`, `normalizationStatus`, `reverbInfo`, `leadingSilence`, `trailingSilence`, `longestSilence`
- Stereo files also get: `stereoSeparation`, `micBleed` (if conversational stereo detected)
- **None of this data is displayed in ResultsTable**

**Implementation Strategy:**

### 5.12.1 Add Experimental Columns to ResultsTable

**Update `ResultsTable.svelte`:**

1. **Add new columns to table header**
   ```svelte
   <!-- After Duration column -->
   <th>Peak Level</th>
   <th>Noise Floor</th>
   <th>Normalization</th>
   <th>Reverb (RT60)</th>
   <th>Leading Silence</th>
   <th>Trailing Silence</th>
   <th>Longest Silence</th>
   <!-- For stereo files only -->
   {#if result.stereoSeparation}
     <th>Stereo Type</th>
     <th>Mic Bleed</th>
   {/if}
   ```

2. **Add data cells**
   ```svelte
   <!-- Peak Level -->
   <td class="numeric">
     {result.peakDb ? `${result.peakDb.toFixed(2)} dB` : 'N/A'}
   </td>

   <!-- Noise Floor -->
   <td class="numeric">
     {result.noiseFloorDbHistogram ? `${result.noiseFloorDbHistogram.toFixed(2)} dB` : 'N/A'}
   </td>

   <!-- Normalization -->
   <td class="status">
     {#if result.normalizationStatus}
       <span class="badge {result.normalizationStatus.status}">
         {result.normalizationStatus.message}
       </span>
     {:else}
       N/A
     {/if}
   </td>

   <!-- Reverb -->
   <td class="reverb-info">
     {#if result.reverbInfo}
       <span class="reverb-label {result.reverbInfo.label.toLowerCase().replace(' ', '-')}">
         {result.reverbInfo.time.toFixed(2)}s - {result.reverbInfo.label}
       </span>
       <span class="reverb-description">{result.reverbInfo.description}</span>
     {:else}
       N/A
     {/if}
   </td>

   <!-- Silence columns -->
   <td class="numeric">{result.leadingSilence ? `${result.leadingSilence.toFixed(2)}s` : 'N/A'}</td>
   <td class="numeric">{result.trailingSilence ? `${result.trailingSilence.toFixed(2)}s` : 'N/A'}</td>
   <td class="numeric">{result.longestSilence ? `${result.longestSilence.toFixed(2)}s` : 'N/A'}</td>

   <!-- Stereo columns (conditional) -->
   {#if result.stereoSeparation}
     <td class="stereo-type">
       {result.stereoSeparation.stereoType}
       <span class="confidence">({(result.stereoSeparation.stereoConfidence * 100).toFixed(0)}%)</span>
     </td>
   {/if}

   {#if result.micBleed}
     <td class="mic-bleed">
       <div>Median: {result.micBleed.new.medianSeparation.toFixed(1)} dB</div>
       <div>P10: {result.micBleed.new.p10Separation.toFixed(1)} dB</div>
       <div class="bleed-warning {result.micBleed.new.percentageConfirmedBleed > 5 ? 'high' : 'low'}">
         {result.micBleed.new.percentageConfirmedBleed.toFixed(1)}% confirmed bleed
       </div>
     </td>
   {/if}
   ```

3. **Column visibility toggle**
   - Add "Show Experimental Columns" checkbox above table
   - Hide/show experimental columns based on toggle
   - Save preference to localStorage

4. **Styling**
   ```css
   .reverb-label.excellent { color: var(--success); }
   .reverb-label.good { color: var(--info); }
   .reverb-label.fair { color: var(--warning); }
   .reverb-label.poor { color: var(--danger); }

   .bleed-warning.high { color: var(--danger); font-weight: 600; }
   .bleed-warning.low { color: var(--success); }

   .experimental-columns {
     background: rgba(59, 130, 246, 0.05);
   }
   ```

### 5.12.2 Add Stereo/Mic Bleed Analysis

**Update tab components (LocalFileTab, GoogleDriveTab, BoxTab):**

```typescript
// After basic + advanced analysis
if (audioBuffer.numberOfChannels === 2) {
  // Stereo separation analysis
  const stereoSeparation = levelAnalyzer.analyzeStereoSeparation(audioBuffer);

  // Mic bleed analysis (only for conversational stereo)
  if (stereoSeparation.stereoType === 'Conversational Stereo') {
    const micBleed = levelAnalyzer.analyzeMicBleed(audioBuffer);
    results.micBleed = micBleed;
  }

  results.stereoSeparation = stereoSeparation;
}
```

### 5.12.3 Experimental Analysis for Batch Mode

**Add toggle for batch processing:**

```svelte
<!-- In batch mode before processing -->
{#if batchMode}
  <div class="experimental-toggle">
    <label>
      <input type="checkbox" bind:checked={includeExperimental} />
      Include experimental analysis (slower)
    </label>
    <p class="help-text">
      Adds reverb, noise floor, silence, and stereo analysis.
      Increases processing time significantly.
    </p>
  </div>
{/if}
```

**Implementation approach (from BATCH_EXPERIMENTAL_OPTIONS.md):**
- **Option C: Post-Batch Analysis (Recommended)**
- Show results quickly without experimental data
- Add "Run Experimental Analysis on All Files" button below results
- Process sequentially when button clicked
- Update rows progressively with experimental data

### 5.12.4 Expandable Row Details (Optional Enhancement)

For complex data (mic bleed details, reverb decay curves), add expandable rows:

```svelte
<tr class="detail-row" class:expanded={expandedRows.includes(result.filename)}>
  <td colspan="100%">
    <div class="detail-panel">
      <!-- Mic Bleed Details -->
      {#if result.micBleed}
        <section>
          <h4>Mic Bleed Analysis</h4>
          <div class="bleed-metrics">
            <div>Median Separation: {result.micBleed.new.medianSeparation.toFixed(1)} dB</div>
            <div>Worst 10% Separation: {result.micBleed.new.p10Separation.toFixed(1)} dB</div>
            <div>Poor Separation Blocks: {result.micBleed.new.percentagePoorSeparation.toFixed(1)}%</div>
            <div>Confirmed Bleed: {result.micBleed.new.percentageConfirmedBleed.toFixed(1)}%</div>
          </div>
          {#if result.micBleed.new.worstBlocks.length > 0}
            <h5>Worst Bleed Instances:</h5>
            <ul>
              {#each result.micBleed.new.worstBlocks as block}
                <li>
                  {block.timestamp.toFixed(2)}s - {block.separation.toFixed(1)} dB separation
                  (correlation: {(block.correlation * 100).toFixed(0)}%)
                </li>
              {/each}
            </ul>
          {/if}
        </section>
      {/if}

      <!-- Reverb Details -->
      {#if result.reverbInfo}
        <section>
          <h4>Reverb Analysis</h4>
          <p><strong>{result.reverbInfo.label}:</strong> {result.reverbInfo.description}</p>
          <p>RT60: {result.reverbInfo.time.toFixed(3)} seconds</p>
        </section>
      {/if}
    </div>
  </td>
</tr>
```

**Implementation Plan:**

1. **Phase 5.12.1**: Add experimental columns to ResultsTable (0.5 day)
   - Add column headers
   - Display experimental data
   - Column visibility toggle

2. **Phase 5.12.2**: Add stereo/mic bleed analysis to tabs (0.5 day)
   - Integrate analyzeStereoSeparation()
   - Integrate analyzeMicBleed()
   - Update all three tabs

3. **Phase 5.12.3**: Post-batch experimental analysis (0.5 day)
   - Add "Run Experimental on All" button
   - Sequential processing with progress
   - Update rows progressively

4. **Phase 5.12.4**: Expandable row details (optional, 0.5 day)
   - Click to expand rows
   - Show detailed mic bleed metrics
   - Show reverb interpretation

**Success Criteria:**
- [ ] ResultsTable shows all experimental columns
- [ ] Column visibility toggle works
- [ ] Stereo separation displayed for stereo files
- [ ] Mic bleed analysis shown for conversational stereo
- [ ] Batch mode offers post-batch experimental analysis
- [ ] Progress indicator during batch experimental processing
- [ ] All experimental data properly formatted and readable
- [ ] Expandable rows show detailed metrics (optional)
- [ ] All 698+ tests still passing
- [ ] Beta deployment tested with various audio files

**Documentation:**
- Update README with experimental features
- Document mic bleed metrics interpretation
- Document reverb/RT60 interpretation
- Add examples of each stereo type

**Commit:** `feat: Phase 5.12 - Display experimental audio analysis features`

---

#### 5.13 Cleanup & Final Integration (1 day) ⬜

**Goal:** Remove old code, finalize integration, and verify everything works

**Implementation Tasks:**

1. **Remove old tab code from main.js**
   - Delete old `handleFileSelect()` function
   - Delete old `handleGoogleDriveUrl()` function
   - Delete old `handleBoxUrl()` function
   - Delete old results display functions
   - Delete old tab switching logic
   - Keep only app initialization code

2. **Verify main.js is ~200 lines**
   - Should contain:
     - Imports
     - Svelte app initialization
     - Auth initialization (pass to Svelte components)
     - Settings initialization
     - Basic error boundary
   - Should NOT contain:
     - Tab logic
     - File handling
     - Results display
     - Validation logic

3. **Remove unused UIController code**
   - If UIController is empty/unused, delete the file
   - If parts are still needed, extract to utilities

4. **Update imports and dependencies**
   - Remove unused imports from main.js
   - Verify all Svelte components import correctly
   - Check for circular dependencies

5. **Run full test suite**
```bash
npm run test:run
npm run typecheck
```

6. **Bundle size verification**
```bash
npm run build
# Check dist/ size
# Should be <15KB increase over baseline
```

7. **Full regression testing checklist**

**Local File Tab:**
- [ ] Single file upload works
- [ ] Metadata-only mode works
- [ ] Results display correctly
- [ ] Error handling works
- [ ] All presets work

**Google Drive Tab:**
- [ ] OAuth flow works
- [ ] Single file URL works
- [ ] Folder URL works (batch)
- [ ] Progress indicator works
- [ ] Results display correctly
- [ ] Error handling works

**Box Tab:**
- [ ] OAuth flow works
- [ ] Shared link works
- [ ] Folder URL works (batch)
- [ ] Results display correctly
- [ ] Error handling works

**Settings Tab:**
- [ ] All presets selectable
- [ ] Custom criteria editable
- [ ] Three Hour settings work
- [ ] Advanced settings work
- [ ] Settings persist

**Tab Navigation:**
- [ ] All tabs switchable
- [ ] Tab state persists when switching
- [ ] No memory leaks when switching

**Cross-cutting:**
- [ ] All 635 tests passing
- [ ] TypeScript compiles with no errors
- [ ] No console errors
- [ ] Bundle size acceptable (<15KB increase)
- [ ] Performance unchanged
- [ ] Mobile responsive
- [ ] Accessibility maintained

8. **Deploy to beta**
```bash
cd packages/web
npm run build
npm run deploy:beta
```

9. **Beta verification**
   - Test at https://audio-analyzer.tinytech.site/beta/
   - Run through full regression checklist
   - Check for any production-only issues
   - Verify all functionality works

10. **Documentation**
    - Update README if needed
    - Document new component architecture
    - Update developer guide

11. **Final commit and merge**
```bash
git add .
git commit -m "refactor: complete Phase 5 Svelte migration

- Migrated all tabs to Svelte components
- Created shared component library (ResultsTable, FileUpload, etc.)
- Reduced main.js from 3,159 lines to ~200 lines
- Maintained 75%+ test coverage with component tests
- All 635+ tests passing
- Zero regressions
- Bundle size increase: <15KB

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin main  # Triggers automatic production deployment
```

**Success Criteria:**
- [ ] main.js reduced to ~200 lines (94% reduction)
- [ ] All tabs migrated to Svelte
- [ ] All 635+ tests passing
- [ ] Component test coverage 90%+
- [ ] Bundle size increase <15KB
- [ ] Zero regressions
- [ ] Beta deployment successful
- [ ] Production deployment successful

**Phase 5 Complete! 🎉**

---

### Phase 5 Summary

**Total Timeline:** 10-15 days

| Phase | Duration | Status |
|-------|----------|--------|
| 5.1 Setup & Infrastructure | 1 day | ✅ |
| 5.2a Infrastructure & Bridge Pattern | 2 days | ✅ |
| 5.2b App Shell & Tab Navigation | 2-3 days | ✅ |
| 5.3 Shared Components Foundation | 2-3 days | ✅ |
| 5.4 Tab Migration - All Four Tabs | 2-3 days | ✅ |
| 5.5 Settings & Criteria Integration | 1-2 days | ✅ |
| 5.6 UI Polish & Analysis Mode | 1-2 days | ✅ |
| 5.7 Google Drive Integration | 2-3 days | ✅ |
| 5.8 Box Tab Migration | 2-3 days | ✅ |
| 5.8.1 Filename-Only Mode Optimizations | 0.5 day | ✅ |
| 5.8.2 Google Drive Picker Lazy-Loading | 0.5 day | ⬜ |
| 5.9 Batch/Folder Processing | 2-3 days | ⬜ |
| 5.10 Three Hour Configuration | 1-2 days | ⬜ |
| 5.11 Settings Tab Migration | 1-2 days | ⬜ |
| 5.12 Experimental Audio Analysis Display | 1-2 days | ⬜ |
| 5.13 Cleanup & Final Integration | 1 day | ⬜ |

**Key Outcomes:**
- ✅ Svelte component architecture
- ✅ main.js reduced from 3,159 lines to ~200 lines (94% reduction)
- ✅ Shared component library eliminates duplication
- ✅ Component test coverage 90%+
- ✅ All 635+ tests passing
- ✅ Better boundaries for future LLM development
- ✅ Zero regressions
- ✅ Production ready

---

## Success Metrics

### Test Coverage Targets

- **Phase 1 Complete:** Testing infrastructure functional
- **Phase 2 Complete:** ≥60% code coverage (core logic)
- **Phase 3 Complete:** ≥70% code coverage (integration)
- **Phase 4 Complete:** ≥75% code coverage (refactored + typed code)
- **Phase 5 Complete:** ≥75% coverage maintained (component-based)

### Code Quality Metrics

- **main.js Line Count:** ~200 lines (from 3,159) - 94% reduction
- **Code Duplication:** 0% in display logic
- **Type Coverage:** 100% of new modules created as TypeScript (.ts)
- **TypeScript Adoption:** All new modules (handlers, validation, UI, settings) in TypeScript
- **Component Architecture:** Clear separation of concerns with component boundaries
- **Component Test Coverage:** 90%+ per component
- **UI Component Testing:** 100% coverage of rendering, user interactions, error states
- **Test Suite Speed:** <30 seconds full run
- **Test Reliability:** 0 flaky tests

### Functional Metrics

- **Zero Regressions:** All existing functionality works
- **All Tests Passing:** 100% pass rate
- **CI/CD:** Automated testing on all PRs
- **Documentation:** All new modules and components documented
- **LLM-Ready:** Clear boundaries for LLM-assisted development

---


---

## Progress Tracking

### Master Checklist

#### Phase 1: Test Infrastructure (2-3 hours LLM time / 1 day calendar)
- [x] Install Vitest + dependencies
- [x] Configure vitest.config.js
- [x] Update package.json scripts
- [x] Create test file structure
- [x] Write sample tests
- [x] Verify setup works
- [x] **Phase 1 Complete** ✅

#### Phase 2: Core Business Logic Tests (2-3 days LLM / 1-2 weeks calendar)
- [x] Filename validation tests (Bilingual)
- [x] Filename validation tests (Three Hour)
- [x] Criteria validation tests
- [x] File type detection tests
- [x] Result formatting tests
- [x] Preset configuration tests
- [x] Overall status calculation tests
- [x] **Phase 2 Complete** ✅ (Test specifications written, covering ~620 lines of logic)

#### Phase 3: Integration Tests (1-2 days LLM / 1 week calendar)
- [x] File processing workflow tests
- [x] Batch processing tests
- [x] Auth state management tests
- [x] Display rendering tests
- [x] Mock utilities created (test-utils.js with mocking helpers)
- [x] **Phase 3 Complete** ✅ (Test specifications written for complete workflows)

#### Phase 4: Refactoring with TypeScript (3-5 days LLM / 2 weeks calendar)
- [x] 4.1: Set up TypeScript infrastructure (tsconfig.json, dependencies)
- [x] 4.2: Unify display logic (display-utils.ts, ~155 lines removed from main.js)
- [x] 4.3: Extract file utilities (file-utils.ts)
- [x] 4.4: Create settings manager as TypeScript module (settings/, ~400 lines removed from main.js)
- [x] **Bug Fix:** Batch processing context issue (formatDuration) - Added regression tests
- [x] 4.5: Extract validation module as TypeScript module (validation/, ~244 lines removed from main.js)
- [x] 4.6: Separate UI controller as TypeScript module (ui/, ~103 lines removed from main.js) - ✅ Verified in beta
- [x] 4.7: Add UI component testing (UIController 37 tests, SettingsManager 30 tests) - ✅ 67 new tests added
- [x] Update tests for new structure (635 tests total, all passing)
- [x] Verify all tests passing (including TypeScript type checking)
- [x] Verify no regressions
- [x] **Phase 4 Complete** ✅ (main.js reduced from 3,159 → 2,542 lines + all new modules in TypeScript + comprehensive testing)

#### Phase 5: Svelte Migration (3-5 days LLM / 2 weeks calendar)
- [x] 5.1: Setup & Infrastructure (Svelte + Vite 7 upgrade)
- [x] 5.2a: Infrastructure & Bridge Pattern (AppBridge, AuthService, ServiceCoordinator)
- [x] 5.2b: App Shell & Tab Navigation (Svelte components + tab system)
- [x] 5.3: Shared Components Foundation (ResultsTable, AudioPlayer, ErrorMessage, etc.)
- [x] 5.4: Tab Migration - All Four Tabs (LocalFileTab, GoogleDriveTab, BoxTab, SettingsTab)
- [x] 5.5: Settings & Criteria Integration (inline validation, green highlighting)
- [x] 5.6: UI Polish & Analysis Mode (three-mode selection system)
- [x] 5.7: Google Drive Integration (URL processing + Google Picker)
- [x] 5.8: Box Tab Migration (OAuth improvements + file processing)
- [x] 5.8.1: Filename-Only Mode Optimizations (metadata-only fetching, UI improvements)
- [ ] 5.8.2: Google Drive Picker Lazy-Loading
- [ ] 5.9: Batch/Folder Processing (multi-file/folder support for all tabs)
- [ ] 5.10: Three Hour Configuration (scripts folder + speaker ID)
- [ ] 5.11: Settings Tab Migration (finalization)
- [ ] 5.12: Experimental Audio Analysis Display (reverb, noise floor, stereo, mic bleed)
- [ ] 5.13: Cleanup & Final Integration
- [ ] Verify all component tests passing (90%+ coverage per component)
- [ ] Verify no regressions
- [ ] **Phase 5 Complete** ✅ (main.js ~200 lines + Svelte components + comprehensive component tests)

### Completion Dates

- **Phase 1 Started:** October 9, 2025
- **Phase 1 Completed:** October 9, 2025
- **Phase 2 Started:** October 9, 2025
- **Phase 2 Completed:** October 9, 2025 (Test specifications)
- **Phase 3 Started:** October 9, 2025
- **Phase 3 Completed:** October 9, 2025 (Test specifications)
- **Phase 4 Started:** October 10, 2025
- **Phase 4 Completed:** October 10, 2025
- **Phase 5 Started:** October 10, 2025
- **Phase 5.1 Completed:** October 10, 2025 (Setup & Infrastructure)
- **Phase 5.2a Completed:** October 10, 2025 (Infrastructure & Bridge Pattern)
- **Phase 5.2b Completed:** October 10, 2025 (App Shell & Tab Navigation)
- **Phase 5.3 Completed:** October 10, 2025 (Shared Components Foundation)
- **Phase 5.4 Completed:** October 10, 2025 (Tab Migration - All Four Tabs)
- **Phase 5.5 Completed:** October 10, 2025 (Settings & Criteria Integration)
- **Phase 5.6 Completed:** October 10, 2025 (UI Polish & Analysis Mode)
- **Phase 5.7 Completed:** October 11, 2025 (Google Drive Integration)
- **Phase 5.8 Completed:** October 11, 2025 (Box Tab Migration)
- **Phase 5.8.1 Completed:** October 11, 2025 (Filename-Only Mode Optimizations)
- **Phase 5 Completed:** _____ (In Progress - 5.8.1 complete, 5.8.2+ remaining)

### Total Timeline

**LLM Development Time:** ~2 weeks of actual work
**Calendar Time:** 4-8 weeks (depending on review cycles)
**Bottleneck:** Human review, testing, and decision-making

---
### Blockers & Risks

_(To be tracked as issues arise)_

---

## References

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Refactoring Patterns](https://refactoring.guru/refactoring/catalog)
- Main repo: https://github.com/vibingwithtom/audio-analyzer
- Production: https://audio-analyzer.tinytech.site
- Beta: https://audio-analyzer.tinytech.site/beta

---

**Last Updated:** October 10, 2025
**Document Owner:** @vibingwithtom
