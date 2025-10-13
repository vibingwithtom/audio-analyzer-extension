# Phase 5.9.3: Box Batch Processing

## Status: 📝 PLANNING

**Created:** October 12, 2025

## Overview
This phase introduces high-performance batch folder processing to the Box tab. It leverages the parallel processing capabilities of the core `BatchProcessor` class, includes cancellation support for large jobs, and adds the ability to process entire folders by pasting a Box folder URL. This implementation ensures a consistent and efficient user experience for batch operations, mirroring the functionality of the Google Drive and Local File tabs.

### Key Features:
✅ **Parallel Processing** - Process 3-5 files concurrently for significant speed improvements.
✅ **Cancellation Support** - A "Cancel" button to stop large batch operations.
✅ **Folder URL Support** - Process all audio files within a Box folder by pasting its URL.
✅ **Reusable Architecture** - Utilizes the core `BatchProcessor` for consistency across all tabs.
✅ **Optimized Filename-Only Mode** - Validates filenames by fetching metadata only, without downloading file content.

## Background
- **Phase 5.8** introduced the Box tab with single file processing via shared links.
- **Phase 5.8.1** optimized the filename-only analysis mode to avoid unnecessary downloads.
- **Phase 5.9.2** established the batch processing pattern for the Google Drive tab, including parallel processing and cancellation. This phase applies that same pattern to Box.

## Current State
The Box tab currently supports:
- ✅ Single file processing via Box shared links.
- ✅ All four analysis modes (full, audio-only, filename-only, experimental).
- ✅ Stale results detection.
- ❌ No support for batch processing or folder analysis.

## Goal
The goal is to empower users to analyze entire Box folders efficiently. This includes:
- Processing all audio files within a folder specified by a URL.
- Tracking batch progress with a visual indicator and file counts.
- Displaying batch results in a summary table.
- Supporting all analysis modes, with a highly optimized "filename-only" mode for quick validation.

---

## Implementation Plan

### 1. Box API Enhancements

**Goal:** Add the capability to list all audio files within a Box folder.

**`src/services/box-api.ts` Changes:**
```typescript
// src/services/box-api.ts

// NEW: Add method to list all file metadata in a folder
async listFilesInFolder(folderId: string): Promise<BoxFileMetadata[]> {
  const response = await fetch(
    `https://api.box.com/2.0/folders/${folderId}/items?fields=id,name,type,size`,
    {
      headers: {
        'Authorization': `Bearer ${this.auth.getAccessToken()}`
      }
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to list folder items: ${error.message || response.statusText}`);
  }

  const data = await response.json();
  // Filter for audio files only, Box API doesn't have a MIME type filter in query
  return data.entries.filter(item =>
    item.type === 'file' && this.isAudioFile(item.name)
  );
}

// NEW: Add method to parse folder ID from a URL
parseFolderUrl(url: string): string {
  // Example URL: https://app.box.com/folder/1234567890
  const match = url.match(/\/folder\/(\d+)/);
  if (match && match[1]) {
    return match[1];
  }
  throw new Error('Invalid or unsupported Box folder URL');
}

// Helper to identify audio files by extension
isAudioFile(filename: string): boolean {
    const audioExtensions = ['.wav', '.mp3', '.flac', '.ogg', '.m4a', '.aac', '.wma', '.aiff'];
    return audioExtensions.some(ext => filename.toLowerCase().endsWith(ext));
}
```

### 2. Reusable Batch Processor Integration

This phase will use the same core `BatchProcessor` class from `@audio-analyzer/core` that was used for the Google Drive and Local File tabs. This ensures consistent parallel processing, progress tracking, and error handling.

```typescript
// Import from core
import { BatchProcessor } from '@audio-analyzer/core';

// Usage in BoxTab.svelte
const batchProcessor = new BatchProcessor({
  concurrency: 3, // Process 3 files at a time
  onProgress: (current, total, filename) => {
    batchProgress = { current, total, currentFile: filename };
  },
  onFileComplete: (result) => {
    batchResults = [...batchResults, result];
  },
  onError: (filename, error) => {
    // Append an error result to the batch
    batchResults = [...batchResults, {
      filename,
      status: 'error',
      error: error.message
    }];
  }
});
```

### 3. BoxTab.svelte Component Updates

**Refactor for Reusability and Add Batch Logic:**
The `processFile` logic will be extracted into a pure `analyzeFile` function, and new methods will be added to handle batch processing initiated by a folder URL.

```svelte
// src/components/BoxTab.svelte

<script>
  import { BatchProcessor } from '@audio-analyzer/core';

  // ... existing state ...
  let batchProcessing = false;
  let batchProgress = { current: 0, total: 0, currentFile: '' };
  let batchResults = [];
  let batchProcessor: BatchProcessor | null = null;

  // NEW: Detect folder URL and delegate
  async function handleUrlSubmit() {
    const url = fileUrl.trim();
    if (!url) return;

    try {
      // Check if the URL is a folder URL
      const folderId = boxAPI.parseFolderUrl(url);
      await processFolder(folderId);
    } catch (e) {
      // Not a folder URL, process as a single file link
      await processSingleFile(url);
    }
  }

  // UPDATED: Logic for a single file
  async function processSingleFile(url: string) {
    // ... existing single file processing logic using analyzeFile ...
  }

  // NEW: Process an entire folder
  async function processFolder(folderId: string) {
    processing = true; // Use a general "loading" indicator for fetching file list
    error = '';
    let filesToProcess: BoxFileMetadata[] = [];

    try {
      filesToProcess = await boxAPI.listFilesInFolder(folderId);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to list folder contents.';
      processing = false;
      return;
    }
    processing = false;

    if (filesToProcess.length === 0) {
      error = 'No audio files found in the specified folder.';
      return;
    }
    
    // With the list of files, start the batch processor
    await processBatchFiles(filesToProcess);
  }

  // NEW: Batch processing implementation
  async function processBatchFiles(boxFiles: BoxFileMetadata[]) {
    batchProcessing = true;
    batchProgress = { current: 0, total: boxFiles.length, currentFile: '' };
    batchResults = [];
    error = '';

    batchProcessor = new BatchProcessor({
      concurrency: 3,
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
      await batchProcessor.processFiles(boxFiles, async (boxFile) => {
        // In filename-only mode, create a dummy file with just the name
        if ($analysisMode === 'filename-only') {
          const emptyFile = new File([], boxFile.name, { type: 'audio/wav' });
          return await analyzeFile(emptyFile);
        }
        
        // Otherwise, download the full file from Box
        const file = await boxAPI.downloadFile(boxFile.id, boxFile.name);
        return await analyzeFile(file);
      });
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

  // Pure analysis function (extracted from old processFile logic)
  async function analyzeFile(file: File): Promise<AudioResults> {
    // ... same pure analysis logic as in GoogleDriveTab ...
  }
</script>

<!-- UI for URL input -->
<input bind:value={fileUrl} placeholder="Paste a Box file or folder URL" />
<button on:click={handleUrlSubmit}>Analyze</button>

<!-- Batch Progress UI (same as Google Drive Tab) -->
{#if batchProcessing}
  <div class="batch-progress">
    <h3>Processing Files...</h3>
    <progress value={batchProgress.current} max={batchProgress.total}></progress>
    <p>{batchProgress.current} / {batchProgress.total} files</p>
    <p class="current-file">{batchProgress.currentFile}</p>
    <button on:click={handleCancelBatch} class="btn-danger">Cancel</button>
  </div>
{/if}

<!-- Batch Results Display (reuse ResultsTable) -->
{#if batchResults.length > 0 && !batchProcessing}
  <ResultsTable
    results={batchResults}
    mode="batch"
    metadataOnly={$analysisMode === 'filename-only'}
    experimentalMode={$analysisMode === 'experimental'}
  />
{/if}
```

### 4. Analysis Mode Support

All four analysis modes will be supported for batch processing:
- **Full Analysis & Audio Only**: Downloads each file and performs the necessary analysis.
- **Filename Only (Optimized)**: Fetches only the list of filenames from the folder metadata. No file content is downloaded, making it extremely fast for validating naming conventions across a large number of files.
- **Experimental**: Downloads each file and runs the full suite of advanced and experimental metrics.

### 5. Error Handling

- **Per-File Errors**: If a single file fails to download or analyze, it will be marked with an "error" status in the results table, and the batch will continue processing the remaining files.
- **Batch-Level Errors**: If fetching the folder contents fails (e.g., invalid URL, permissions issue), a clear error message will be displayed to the user.
- **Cancellation**: If the user cancels the batch, processing will stop, and the results gathered up to that point will be displayed.

---

## Testing Strategy

### Manual Testing Checklist

**Batch Processing:**
- [ ] Paste a Box folder URL with 5-10 audio files.
- [ ] Verify the progress bar appears and updates correctly.
- [ ] Confirm all files are processed and results are displayed in the table.
- [ ] Check that the batch summary statistics (pass/fail counts) are accurate.

**Analysis Modes:**
- [ ] **Filename Only**: Run on a large folder (20+ files). Verify it completes quickly and no files were downloaded (check network tab).
- [ ] **Full Analysis**: Run on a small folder. Verify all columns are populated correctly.
- [ ] **Audio Only**: Verify filename validation is skipped.
- [ ] **Experimental**: Verify experimental columns are populated.

**Error Handling:**
- [ ] Process a folder containing one unsupported file type. Verify it shows an error for that file but others succeed.
- [ ] Paste an invalid folder URL. Verify a clear error message is shown.
- [ ] Paste a URL for a folder you don't have access to. Verify the error is handled gracefully.
- [ ] Start a large batch and click "Cancel". Verify processing stops and partial results are shown.

**Edge Cases:**
- [ ] Process a folder with no audio files. Verify the "No audio files found" message appears.
- [ ] Process a folder with a single audio file. Verify it runs as a batch of one.
- [ ] Ensure single file shared link processing is not broken.

---

## Implementation Steps

1.  **Update BoxAPI**: Add `listFilesInFolder()` and `parseFolderUrl()` methods to `src/services/box-api.ts`.
    - **Commit:** `feat(box): add folder content listing to Box API`
2.  **Refactor BoxTab**: Extract pure `analyzeFile` function and add `handleUrlSubmit` logic to differentiate between file and folder URLs in `src/components/BoxTab.svelte`.
    - **Commit:** `refactor(box): prepare BoxTab for batch processing`
3.  **Implement Batch Logic**: Add `processBatchFiles()` method, integrate the `BatchProcessor`, and add state for progress and results.
    - **Commit:** `feat(box): implement batch file processing for Box folders`
4.  **Add UI Components**: Add the batch progress and cancellation UI to the Svelte component. Integrate the `ResultsTable` for displaying batch results.
    - **Commit:** `feat(box): add UI for batch progress and results display`
5.  **Test and Verify**: Perform manual testing according to the checklist and deploy to beta for verification.
    - **Commit:** `test(box): verify Box batch processing functionality`

---

## Files to Modify

1.  **`src/services/box-api.ts`**: To add folder listing capabilities.
2.  **`src/components/BoxTab.svelte`**: To orchestrate the UI, batch processing logic, and results display.
3.  **`src/components/ResultsTable.svelte`**: No changes expected, as it already supports batch mode.

---

## Success Criteria

- [ ] Users can paste a Box folder URL and analyze all audio files within it.
- [ ] The "filename-only" mode is fast and does not download file content.
- [ ] A progress bar with file counts and a cancel button is displayed during batch processing.
- [ ] A summary of batch results is displayed after completion.
- [ ] Individual file errors do not stop the entire batch.
- [ ] The existing single-file-by-URL functionality remains unaffected.
- [ ] All manual tests pass, and the feature is verified in the beta environment.

---

## Estimated Time

- **Implementation:** 2-3 hours
- **Testing:** 1 hour
- **Total:** 3-4 hours

---

## Dependencies

- ✅ **Phase 5.8**: Box Tab Migration complete.
- ✅ **Phase 5.9.2**: Google Drive Batch Processing complete (provides the pattern to follow).
- ✅ Core `BatchProcessor` class is available and tested.
