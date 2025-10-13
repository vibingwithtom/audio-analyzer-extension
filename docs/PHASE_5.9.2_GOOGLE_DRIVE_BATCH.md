# Phase 5.9.2: Google Drive Batch Processing

## Status: 📝 PLANNING (REVISED)

**Created:** October 12, 2025
**Revised:** October 12, 2025

## Overview
Add HIGH-PERFORMANCE batch folder processing to the Google Drive tab with parallel processing, cancellation support, and folder selection. This implementation uses the core library's `BatchProcessor` class to ensure consistency across all tabs.

### Key Improvements Over Original Plan:
✅ **Parallel Processing** - Process 3-5 files concurrently (3-5x faster than sequential)
✅ **Cancellation Support** - Cancel button for large batch operations
✅ **Folder Selection** - Full folder support (not optional)
✅ **Reusable Architecture** - Uses core `BatchProcessor` for all tabs
✅ **Pure Functions** - Refactored `analyzeFile()` with no side effects

## Background
- Phase 5.7 implemented single file processing for Google Drive (URL + Picker)
- Phase 5.8.1 implemented filename-only mode optimizations
- Phase 5.9.1.1 added experimental analysis mode display
- LocalFileTab already has batch processing as a reference implementation
- GoogleDriveAPI already has `pickAndDownloadFiles()` method with multi-select support

## Current State
GoogleDriveTab supports:
- ✅ Single file URL input
- ✅ Single file Google Picker selection
- ✅ Analysis mode selection (full/audio-only/filename-only/experimental)
- ✅ Stale results detection
- ❌ Batch folder processing (NOT YET IMPLEMENTED)

## Goal
Enable users to select entire Google Drive folders and analyze all audio files within them, with:
- Multi-file selection via Google Picker
- Progress tracking during batch processing
- Batch results display with summary statistics
- Support for all analysis modes (full/audio-only/filename-only/experimental)

---

## Implementation Plan (REVISED)

### Critical Improvements Over Original Plan:

1. **Parallel Processing**: Process 3-5 files concurrently instead of sequential (MUCH faster)
2. **Cancellation Support**: Allow users to cancel batch operations (essential for large batches)
3. **Folder Selection**: Include folder selection in main implementation (not optional)
4. **Reusable Batch Processor**: Use core library's `BatchProcessor` class for all tabs
5. **Refactored `processFile`**: Extract analysis logic to be reusable without side effects

---

### 1. Google Picker Multi-Select & Folder Support

**Current:** Picker allows single file selection only
**Goal:** Enable multi-file and folder selection with audio filtering

**GoogleDriveAPI Changes:**
```typescript
// src/services/google-drive-api.ts

// Update showPicker method to accept multiSelect and folder options
async showPicker(options?: {
  multiSelect?: boolean;     // NEW: enable multi-file selection
  selectFolders?: boolean;   // NEW: allow folder selection
  audioOnly?: boolean;       // NEW: filter to audio files only
}): Promise<PickerResult>

// Add method to list files in a folder (with audio filtering)
async listFilesInFolder(folderId: string, audioOnly = true): Promise<DriveFile[]>

// Add method to recursively get all audio files from folder
async getAllAudioFilesInFolder(folderId: string): Promise<DriveFile[]>
```

**Picker Configuration:**
- Enable multi-select: `picker.enableFeature(google.picker.Feature.MULTISELECT_ENABLED)`
- Allow folder selection: include `google.picker.ViewId.FOLDERS` view
- Filter to audio files: `setMimeTypes(['audio/*'])` or custom MIME type list
- Audio formats: WAV, MP3, FLAC, OGG, M4A, AAC, WMA, AIFF, etc.

### 2. Reusable Batch Processor Service

**NEW: Use core library's BatchProcessor class**

The core library already has a `BatchProcessor` class at `@audio-analyzer/core`. We'll use this for all tabs instead of duplicating batch logic.

```typescript
// Import from core
import { BatchProcessor } from '@audio-analyzer/core';

// Usage in GoogleDriveTab
const batchProcessor = new BatchProcessor({
  concurrency: 3, // Process 3 files at once (configurable)
  onProgress: (current, total, filename) => {
    batchProgress = { current, total, currentFile: filename };
  },
  onFileComplete: (result) => {
    batchResults = [...batchResults, result];
  },
  onError: (filename, error) => {
    // Add error result
    batchResults = [...batchResults, {
      filename,
      status: 'error',
      error: error.message
    }];
  }
});
```

**Benefits:**
- Parallel processing (3-5 files at once, not sequential)
- Reusable across all tabs (Local, Google Drive, Box)
- Built-in progress tracking and error handling
- Consistent batch experience

### 3. GoogleDriveTab Component Updates

**Refactor `processFile` for Reusability:**
```typescript
// OLD: processFile modifies component state directly
async function processFile(file: File) {
  processing = true;
  // ... analysis logic ...
  results = analysisResults; // Side effect
  processing = false;
}

// NEW: Extract analysis logic to pure function
async function analyzeFile(file: File): Promise<AudioResults> {
  // Basic file analysis
  const basicResults = await audioAnalyzer.analyzeFile(file);

  // Advanced analysis (if not filename-only)
  let advancedResults = null;
  if ($analysisMode !== 'filename-only') {
    const audioContext = new AudioContext();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    advancedResults = await levelAnalyzer.analyzeAudioBuffer(audioBuffer);
  }

  // Combine results
  const analysisResults = {
    filename: file.name,
    fileSize: file.size,
    ...basicResults,
    ...(advancedResults || {})
  };

  // Validate against criteria
  const criteria = $currentCriteria;
  if (criteria && $currentPresetId !== 'custom') {
    const validation = CriteriaValidator.validateResults(
      analysisResults,
      criteria,
      $analysisMode === 'filename-only'
    );

    // Add filename validation if needed
    // ... filename validation logic ...

    return { ...analysisResults, validation };
  }

  return analysisResults;
}

// NEW: Single file processing (uses analyzeFile)
async function processSingleFile(file: File) {
  processing = true;
  error = '';

  try {
    results = await analyzeFile(file);
    resultsMode = $analysisMode;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Unknown error';
    results = null;
  } finally {
    processing = false;
  }
}
```

**Add Batch Processing with Cancellation:**
```svelte
<script>
  import { BatchProcessor } from '@audio-analyzer/core';

  let batchProcessing = false;
  let batchProgress = { current: 0, total: 0, currentFile: '' };
  let batchResults = [];
  let batchProcessor: BatchProcessor | null = null;

  async function handleBrowseDrive() {
    if (!driveAPI) {
      error = 'Google Drive API not initialized. Please sign in again.';
      return;
    }

    // Show picker with multi-select and folder support
    const pickerResult = await driveAPI.showPicker({
      multiSelect: true,
      selectFolders: true,
      audioOnly: true
    });

    if (!pickerResult.docs || pickerResult.docs.length === 0) {
      return; // User cancelled
    }

    // Check if folder was selected
    const doc = pickerResult.docs[0];
    let filesToProcess: DriveFile[] = [];

    if (doc.type === 'folder') {
      // Get all audio files from folder
      processing = true;
      try {
        filesToProcess = await driveAPI.getAllAudioFilesInFolder(doc.id);
      } catch (err) {
        error = 'Failed to list folder contents';
        processing = false;
        return;
      }
      processing = false;
    } else {
      // Files selected directly
      filesToProcess = pickerResult.docs;
    }

    // Single file: use single-file processing
    if (filesToProcess.length === 1) {
      try {
        const file = await driveAPI.downloadFile(filesToProcess[0].id);
        await processSingleFile(file);
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to process file';
      }
      return;
    }

    // Multiple files: use batch processing
    await processBatchFiles(filesToProcess);
  }

  async function processBatchFiles(driveFiles: DriveFile[]) {
    batchProcessing = true;
    batchProgress = { current: 0, total: driveFiles.length, currentFile: '' };
    batchResults = [];
    error = '';

    // Create batch processor with parallel processing
    batchProcessor = new BatchProcessor({
      concurrency: 3, // Process 3 files at once
      onProgress: (current, total, filename) => {
        batchProgress = { current, total, currentFile: filename };
      },
      onFileComplete: (result) => {
        batchResults = [...batchResults, result];
      },
      onError: (filename, err) => {
        batchResults = [...batchResults, {
          filename,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error'
        }];
      }
    });

    try {
      // Process files with batch processor
      await batchProcessor.processFiles(driveFiles, async (driveFile) => {
        // Download file from Google Drive
        const file = await driveAPI.downloadFile(driveFile.id);

        // Analyze file (pure function, no side effects)
        return await analyzeFile(file);
      });

      // Store results mode
      resultsMode = $analysisMode;
    } catch (err) {
      if (err.message !== 'Cancelled') {
        error = err instanceof Error ? err.message : 'Batch processing failed';
      }
    } finally {
      batchProcessing = false;
      batchProcessor = null;
    }
  }

  function handleCancelBatch() {
    if (batchProcessor) {
      batchProcessor.cancel();
    }
  }
</script>

<!-- Batch Processing UI with Cancel Button -->
{#if batchProcessing}
  <div class="batch-progress">
    <h3>Processing Files...</h3>
    <progress value={batchProgress.current} max={batchProgress.total}></progress>
    <div class="progress-info">
      <p>{batchProgress.current} / {batchProgress.total} files</p>
      {#if batchProgress.currentFile}
        <p class="current-file">{batchProgress.currentFile}</p>
      {/if}
    </div>
    <button on:click={handleCancelBatch} class="btn-danger">
      Cancel
    </button>
  </div>
{/if}

<!-- Batch Results -->
{#if batchResults.length > 0 && !batchProcessing}
  <ResultsTable
    results={batchResults}
    mode="batch"
    metadataOnly={$analysisMode === 'filename-only'}
    experimentalMode={$analysisMode === 'experimental'}
  />
{/if}
```

### 3. Progress Tracking

**Visual Progress Indicator:**
- Progress bar showing `X / Y files`
- Current file being processed
- Estimated time remaining (optional)
- Cancel button (optional, can defer)

**Progress State:**
```typescript
interface BatchProgress {
  current: number;
  total: number;
  currentFile?: string;
  errors: number;
}
```

### 4. Batch Results Display

**Reuse Existing Components:**
- `ResultsTable.svelte` already supports `mode="batch"`
- Summary statistics already implemented:
  - Total files
  - Pass/Warning/Fail/Error counts
  - Total duration
  - Overall status breakdown

**Batch Summary Enhancements:**
```svelte
<div class="batch-summary">
  <h3>Batch Analysis Complete</h3>
  <div class="summary-stats">
    <div class="stat">
      <span class="stat-value">{batchResults.length}</span>
      <span class="stat-label">Total Files</span>
    </div>
    <div class="stat success">
      <span class="stat-value">{passCount}</span>
      <span class="stat-label">Passed</span>
    </div>
    <div class="stat warning">
      <span class="stat-value">{warningCount}</span>
      <span class="stat-label">Warnings</span>
    </div>
    <div class="stat error">
      <span class="stat-value">{failCount + errorCount}</span>
      <span class="stat-label">Failed</span>
    </div>
  </div>
  <div class="batch-duration">
    Total Duration: {formatTotalDuration(batchResults)}
  </div>
</div>
```

### 5. Analysis Mode Support

**All Four Modes Work with Batch:**

1. **Full Analysis** (`mode="full"`)
   - Downloads all files
   - Runs audio analysis + filename validation
   - Shows all columns in results table

2. **Audio Only** (`mode="audio-only"`)
   - Downloads all files
   - Runs audio analysis only
   - Skips filename validation
   - Shows audio columns only

3. **Filename Only** (`mode="filename-only"`)
   - **Optimized:** Fetches metadata only (no downloads)
   - Runs filename validation only
   - Shows filename + status columns only
   - Fastest option for bulk validation

4. **Experimental** (`mode="experimental"`)
   - Downloads all files
   - Runs audio analysis + experimental metrics
   - Shows experimental columns (peak, noise floor, reverb, etc.)

### 6. Error Handling

**Per-File Error Handling:**
- Continue processing even if individual files fail
- Mark failed files with "error" status
- Display error message in results table
- Include error count in summary

**Batch-Level Error Handling:**
- Network errors: retry logic (optional, can defer)
- Auth errors: prompt user to re-authenticate
- Quota errors: clear error message with guidance
- Cancel/abort: stop processing, show partial results

**Error Result Format:**
```typescript
{
  filename: 'problem-file.wav',
  status: 'error',
  error: 'Failed to decode audio: Unsupported format'
}
```

### 7. Folder Selection (Optional Enhancement)

**If time permits, add direct folder selection:**

```typescript
// User selects a folder in Picker
async function processFolderSelection(folderId: string) {
  const files = await driveAPI.listFilesInFolder(folderId);
  const audioFiles = files.filter(f => f.mimeType?.startsWith('audio/'));

  await processBatchFiles(audioFiles);
}
```

**Benefits:**
- Process entire folders without manual multi-select
- Recursive folder processing (future enhancement)

**Deferred Features:**
- Recursive subfolder processing
- Folder structure preservation
- Folder-based organization in results

---

## Testing Strategy

### Unit Tests (Not Required - Focus on Integration)
Since we're following the Phase 5.9.1.1 pattern where component tests are deferred due to tooling limitations, we'll focus on integration testing via manual beta verification.

### Manual Testing Checklist

**Batch Processing:**
- [ ] Select 2-5 audio files from Google Drive
- [ ] Progress bar updates correctly
- [ ] All files process successfully
- [ ] Batch results display with summary stats
- [ ] Pass/warning/fail counts are accurate

**Analysis Modes:**
- [ ] Full Analysis: Downloads files, shows all columns
- [ ] Audio Only: Downloads files, shows audio columns
- [ ] Filename Only: NO downloads, fast validation
- [ ] Experimental: Downloads files, shows experimental columns

**Error Handling:**
- [ ] One file fails: batch continues, error shown for that file
- [ ] All files fail: error summary shown
- [ ] Network error mid-batch: graceful handling
- [ ] Cancel during processing: stops cleanly (if implemented)

**Edge Cases:**
- [ ] Single file selected: uses single-file mode (not batch)
- [ ] 20+ files: handles large batches
- [ ] Mix of valid/invalid files: processes correctly
- [ ] No audio files in selection: appropriate error message

**Visual Verification:**
- [ ] Progress UI looks good
- [ ] Summary stats display correctly
- [ ] Results table scrolls for many files
- [ ] No console errors
- [ ] Mobile responsive

---

## Implementation Steps

### Step 1: Update GoogleDriveAPI
1. Add multi-select support to `showPicker()`
2. Add `listFilesInFolder()` method (if doing folder selection)
3. Test picker with multi-select in beta

**Commit:** `feat: add multi-select support to Google Drive Picker`

### Step 2: Add Batch Processing Logic
1. Create `processBatchFiles()` method
2. Add progress tracking state
3. Implement per-file error handling
4. Update results state to handle arrays

**Commit:** `feat: implement batch file processing for Google Drive`

### Step 3: Add Progress UI
1. Create progress bar component/section
2. Show current/total file count
3. Display current file being processed
4. Add visual feedback during processing

**Commit:** `feat: add batch processing progress UI`

### Step 4: Integrate Batch Results Display
1. Update ResultsTable invocation with batch mode
2. Add batch summary section
3. Calculate and display aggregate statistics
4. Format total duration

**Commit:** `feat: add batch results display with summary statistics`

### Step 5: Testing & Polish
1. Manual testing with beta deployment
2. Test all analysis modes
3. Test error scenarios
4. Performance testing with larger batches

**Commit:** `test: verify Google Drive batch processing`

---

## Files to Modify

1. **`src/services/google-drive-api.ts`**
   - Add multi-select option to `showPicker()`
   - Add `listFilesInFolder()` method (optional)
   - Update picker configuration

2. **`src/components/GoogleDriveTab.svelte`**
   - Add batch processing state (`batchResults`, `batchProgress`)
   - Add `processBatchFiles()` method
   - Add progress UI
   - Add batch results display
   - Update `handleBrowseDrive()` to detect single vs. batch

3. **`src/components/ResultsTable.svelte`**
   - No changes needed (already supports batch mode)

---

## Success Criteria

- [ ] Google Picker allows multi-file selection
- [ ] Batch processing works with progress tracking
- [ ] All files process correctly (or show individual errors)
- [ ] Batch results display with summary statistics
- [ ] All four analysis modes work in batch
- [ ] Filename-only mode skips downloads (fast)
- [ ] Error handling works (per-file and batch-level)
- [ ] Beta deployment verified
- [ ] No console errors
- [ ] No regressions in single-file mode

---

## Performance Considerations

**Download Optimization:**
- Filename-only mode: fetch metadata only (no downloads)
- Parallel downloads: consider downloading next file while processing current (future optimization)

**Memory Management:**
- Create blob URLs as needed
- Clean up blob URLs after use
- Avoid keeping all files in memory simultaneously

**API Quota:**
- Google Drive API has rate limits
- Batch processing stays within limits (sequential processing)
- Consider throttling for very large batches (future enhancement)

---

## Future Enhancements (Not in This Phase)

### Phase 5.9.3: Box Batch Processing
- Same pattern as Google Drive batch processing
- Box folder selection
- Box API file listing

### Phase 5.9.4: LocalFileTab Batch Polish
- LocalFileTab already has batch processing
- Could benefit from same UI improvements
- Shared batch components

### Phase 5.10: Batch UI Unification
- Extract shared batch processing components
- Unified batch summary component
- Shared progress indicator
- Consistent batch experience across all tabs

---

## Estimated Time

**Implementation:** 2-3 hours
- GoogleDriveAPI updates: 30 min
- Batch processing logic: 1 hour
- Progress UI: 30 min
- Integration & testing: 1 hour

**Testing:** 1 hour
- Manual testing all scenarios
- Beta verification
- Edge case testing

**Total:** 3-4 hours

---

## Dependencies

- ✅ Phase 5.7 complete (Google Drive single file processing)
- ✅ Phase 5.8.1 complete (filename-only optimizations)
- ✅ Phase 5.9.1.1 complete (experimental analysis display)
- ✅ GoogleDriveAPI.pickAndDownloadFiles() exists
- ✅ ResultsTable batch mode exists

---

## Notes

- Follow the same pattern as LocalFileTab batch processing
- Reuse existing components wherever possible
- Focus on core functionality first (folder selection can be deferred)
- Prioritize filename-only mode optimization (no downloads)
- Test with realistic file counts (10-20 files)
