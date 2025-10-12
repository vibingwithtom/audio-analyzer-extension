<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { authState, authService } from '../stores/auth';
  import { AppBridge } from '../bridge/app-bridge';
  import ResultsTable from './ResultsTable.svelte';
  import { AudioAnalyzer, LevelAnalyzer, CriteriaValidator } from '@audio-analyzer/core';
  import { FilenameValidator } from '../validation/filename-validator';
  import { currentCriteria, currentPresetId, availablePresets } from '../stores/settings';
  import { currentTab } from '../stores/tabs';
  import { analysisMode, setAnalysisMode, type AnalysisMode } from '../stores/analysisMode';
  import { GoogleDriveAPI } from '../services/google-drive-api';
  import type { AudioResults, ValidationResults } from '../types';

  const bridge = AppBridge.getInstance();
  let driveAPI: GoogleDriveAPI | null = null;

  function goToSettings() {
    currentTab.setTab('settings');
  }

  function handleSignIn() {
    bridge.dispatch({ type: 'auth:google:signin:requested' });
  }

  function handleSignOut() {
    bridge.dispatch({ type: 'auth:google:signout:requested' });
  }

  // Initialize Drive API when authenticated (picker loads lazily on button click)
  $: if ($authState.google.isAuthenticated && !driveAPI) {
    const googleAuth = authService.getGoogleAuthInstance();
    driveAPI = new GoogleDriveAPI(googleAuth);
  }

  let processing = false;
  let error = '';
  let results: AudioResults | null = null;
  let validation: ValidationResults | null = null;
  let currentAudioUrl: string | null = null;
  let currentFile: File | null = null;
  let resultsStale = false;
  let resultsMode: AnalysisMode | null = null;
  let fileUrl = '';
  let pickerInitialized = false;
  let pickerLoading = false;
  let originalFileUrl: string | null = null; // Store URL for re-downloading
  let originalFileId: string | null = null;   // Store file ID for re-downloading

  // Batch processing state
  let batchProcessing = false;
  let batchResults: AudioResults[] = [];
  let batchProgress = { current: 0, total: 0, currentFile: '' };
  let batchCancelled = false;

  const audioAnalyzer = new AudioAnalyzer();
  const levelAnalyzer = new LevelAnalyzer();

  // Cleanup blob URL when component is destroyed
  function cleanup() {
    if (currentAudioUrl) {
      URL.revokeObjectURL(currentAudioUrl);
      currentAudioUrl = null;
    }
  }

  onDestroy(cleanup);

  // Detect when analysis mode changes while results exist
  $: {
    if (results && resultsMode !== null) {
      if ($analysisMode === resultsMode) {
        resultsStale = false;
      } else {
        // Check if we actually need to reprocess based on available data
        const hasAudioData = results.sampleRate && results.sampleRate > 0;
        const hasFilenameValidation = results.validation?.filename !== undefined;

        // Determine if current mode needs data that's missing
        let needsReprocessing = false;

        if ($analysisMode === 'audio-only' && !hasAudioData) {
          needsReprocessing = true; // Need audio but don't have it
        } else if ($analysisMode === 'filename-only' && !hasFilenameValidation) {
          needsReprocessing = true; // Need filename validation but don't have it
        } else if ($analysisMode === 'full' && (!hasAudioData || !hasFilenameValidation)) {
          needsReprocessing = true; // Need both but missing one or both
        }
        // experimental mode needs audio data
        else if ($analysisMode === 'experimental' && !hasAudioData) {
          needsReprocessing = true;
        }

        resultsStale = needsReprocessing;
      }
    }
  }

  /**
   * Pure function to analyze a file (no side effects)
   * @param file - The file to analyze
   * @returns Analysis results with validation
   */
  async function analyzeFile(file: File): Promise<AudioResults> {
    // Skip audio analysis if file is empty (filename-only mode)
    let basicResults = null;
    if (file.size === 0) {
      // Extract file type from filename extension
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      const fileType = extension || 'unknown';

      // Minimal results for filename-only validation
      basicResults = {
        fileType: fileType,
        channels: 0,
        sampleRate: 0,
        bitDepth: 0,
        duration: 0
      };
    } else {
      // Basic file analysis
      basicResults = await audioAnalyzer.analyzeFile(file);
    }

    // Advanced analysis (ONLY in experimental mode)
    let advancedResults = null;
    if ($analysisMode === 'experimental' && file.size > 0) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Run level analysis with experimental features
      advancedResults = await levelAnalyzer.analyzeAudioBuffer(audioBuffer, null, true);
    }

    // Combine results
    const analysisResults = {
      filename: file.name,
      fileSize: file.size,
      ...basicResults,
      ...(advancedResults || {})
    };

    // Validate against criteria if a preset is selected
    const criteria = $currentCriteria;
    const mode = $analysisMode;
    if (criteria && $currentPresetId !== 'custom') {
      // Run audio criteria validation (skip if filename-only mode)
      const skipAudioValidation = mode === 'filename-only';
      const validation = CriteriaValidator.validateResults(analysisResults, criteria, skipAudioValidation);

      // Add filename validation if the preset supports it (only for filename-only and full modes)
      const currentPreset = availablePresets[$currentPresetId];
      if (currentPreset?.filenameValidationType && (mode === 'filename-only' || mode === 'full')) {
        let filenameValidation;

        if (currentPreset.filenameValidationType === 'bilingual-pattern') {
          filenameValidation = FilenameValidator.validateBilingual(file.name);
        } else if (currentPreset.filenameValidationType === 'script-match') {
          // Three Hour validation - available on Google Drive tab
          // TODO: Implement in Phase 5.7 with scripts folder URL and speaker ID
          filenameValidation = {
            status: 'warning',
            value: file.name,
            issue: 'Three Hour validation requires configuration (Phase 5.7)'
          };
        }

        if (filenameValidation && validation) {
          validation.filename = {
            status: filenameValidation.status as 'pass' | 'warning' | 'fail',
            value: file.name,
            issue: filenameValidation.issue || undefined
          };
        }
      }

      // Determine overall status based on validation
      let overallStatus: 'pass' | 'warning' | 'fail' = 'pass';
      if (validation) {
        const validationValues = Object.values(validation);
        if (validationValues.some((v: any) => v.status === 'fail')) {
          overallStatus = 'fail';
        } else if (validationValues.some((v: any) => v.status === 'warning')) {
          overallStatus = 'warning';
        }
      }

      return {
        ...analysisResults,
        status: overallStatus,
        validation
      };
    } else {
      return {
        ...analysisResults,
        status: 'pass'
      };
    }
  }

  /**
   * Process a single file (with UI side effects)
   * @param file - The file to process
   */
  async function processSingleFile(file: File) {
    cleanup();

    processing = true;
    error = '';
    results = null;
    validation = null;
    resultsStale = false;
    resultsMode = null;
    currentFile = file;

    try {
      // Analyze file (pure function)
      const analysisResults = await analyzeFile(file);

      // Create blob URL for audio playback (skip for empty files)
      if (file.size > 0) {
        currentAudioUrl = URL.createObjectURL(file);
        analysisResults.audioUrl = currentAudioUrl;
      }

      results = analysisResults;
      validation = analysisResults.validation || null;
      resultsMode = $analysisMode;

    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error occurred';
      results = null;
    } finally {
      processing = false;
    }
  }

  /**
   * Process multiple files in batch with parallel processing
   * @param driveFiles - Array of Drive file metadata to process
   */
  async function processBatchFiles(driveFiles: DriveFileMetadata[]) {
    batchProcessing = true;
    batchProgress = { current: 0, total: driveFiles.length, currentFile: '' };
    batchResults = [];
    batchCancelled = false;
    error = '';

    const concurrency = 3; // Process 3 files at once
    let index = 0;
    const inProgress: Promise<void>[] = [];

    try {
      while (index < driveFiles.length || inProgress.length > 0) {
        // Check if cancelled
        if (batchCancelled) {
          // Wait for in-progress downloads to complete
          await Promise.allSettled(inProgress);
          break;
        }

        // Start new downloads up to concurrency limit
        while (inProgress.length < concurrency && index < driveFiles.length) {
          const driveFile = driveFiles[index];
          index++;

          const promise = (async () => {
            try {
              batchProgress = { ...batchProgress, currentFile: driveFile.name };

              // Download file from Google Drive
              const file = await driveAPI!.downloadFile(driveFile.id);

              // Analyze file (pure function)
              const result = await analyzeFile(file);

              // Add to results
              batchResults = [...batchResults, result];
              batchProgress = { ...batchProgress, current: batchResults.length, total: driveFiles.length };
            } catch (err) {
              // Add error result
              const errorResult: AudioResults = {
                filename: driveFile.name,
                fileSize: driveFile.size || 0,
                fileType: 'unknown',
                channels: 0,
                sampleRate: 0,
                bitDepth: 0,
                duration: 0,
                status: 'error',
                error: err instanceof Error ? err.message : 'Unknown error'
              };
              batchResults = [...batchResults, errorResult];
              batchProgress = { ...batchProgress, current: batchResults.length, total: driveFiles.length };
            }
          })();

          inProgress.push(promise);
        }

        // Wait for at least one to complete
        if (inProgress.length > 0) {
          await Promise.race(inProgress);
          // Remove completed promises
          const stillInProgress = [];
          for (const p of inProgress) {
            const result = await Promise.race([p, Promise.resolve('still-running')]);
            if (result === 'still-running') {
              stillInProgress.push(p);
            }
          }
          inProgress.length = 0;
          inProgress.push(...stillInProgress);
        }
      }

      // Store results mode
      resultsMode = $analysisMode;

    } catch (err) {
      if (!batchCancelled) {
        error = err instanceof Error ? err.message : 'Batch processing failed';
      }
    } finally {
      batchProcessing = false;
    }
  }

  /**
   * Cancel batch processing
   */
  function handleCancelBatch() {
    batchCancelled = true;
  }

  async function handleUrlSubmit() {
    if (!fileUrl.trim()) return;
    if (!driveAPI) {
      error = 'Google Drive API not initialized. Please sign in again.';
      return;
    }

    processing = true;
    error = '';
    results = null;

    try {
      // Parse the URL to determine if it's a file or folder
      const parsed = driveAPI.parseUrl(fileUrl);

      if (parsed.type === 'folder') {
        // Folder URL - list audio files and batch process
        const filesToProcess = await driveAPI.getAllAudioFilesInFolder(parsed.id);

        if (filesToProcess.length === 0) {
          error = 'No audio files found in the folder';
          processing = false;
          return;
        }

        // Single file: use single-file processing
        if (filesToProcess.length === 1) {
          const fileMetadata = filesToProcess[0];
          originalFileUrl = null;
          originalFileId = fileMetadata.id;

          if ($analysisMode === 'filename-only') {
            const file = new File([], fileMetadata.name, { type: 'application/octet-stream' });
            await processSingleFile(file);
          } else {
            const file = await driveAPI.downloadFile(fileMetadata.id);
            await processSingleFile(file);
          }
          processing = false;
        } else {
          // Multiple files: use batch processing
          processing = false;
          await processBatchFiles(filesToProcess);
        }
      } else {
        // File URL - single file processing
        originalFileUrl = fileUrl;
        originalFileId = null;

        if ($analysisMode === 'filename-only') {
          // Filename-only mode: Just fetch metadata, don't download file
          const metadata = await driveAPI.getFileMetadataFromUrl(fileUrl);

          // Create a minimal File object for filename validation
          const file = new File([], metadata.name, { type: 'application/octet-stream' });
          await processSingleFile(file);
        } else {
          // Full or audio-only mode: Download the actual file
          const file = await driveAPI.downloadFileFromUrl(fileUrl);
          await processSingleFile(file);
        }
      }

      fileUrl = ''; // Clear input on success
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to process Google Drive URL';
      results = null;
      processing = false;
    }
  }

  async function handleBrowseDrive() {
    if (!driveAPI) {
      error = 'Google Drive API not initialized. Please sign in again.';
      return;
    }

    // Lazy-load the picker on first use
    if (!pickerInitialized) {
      pickerLoading = true;
      try {
        await driveAPI.initPicker();
        pickerInitialized = true;
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to load Google Drive Picker';
        pickerLoading = false;
        return;
      }
      pickerLoading = false;
    }

    processing = true;
    error = '';
    results = null;

    try {
      // Show picker with multi-select and folder support
      const pickerResult = await driveAPI.showPicker({
        multiSelect: true,
        selectFolders: true, // Enable folder selection
        audioOnly: true
      });

      if (!pickerResult.docs || pickerResult.docs.length === 0) {
        processing = false;
        return; // User cancelled
      }

      // Check if folder was selected
      const doc = pickerResult.docs[0];
      let filesToProcess: DriveFileMetadata[] = [];

      if (doc.type === 'folder') {
        // Get all audio files from folder
        processing = true;
        try {
          filesToProcess = await driveAPI.getAllAudioFilesInFolder(doc.id);
          if (filesToProcess.length === 0) {
            error = 'No audio files found in the selected folder';
            processing = false;
            return;
          }
        } catch (err) {
          error = err instanceof Error ? err.message : 'Failed to list folder contents';
          processing = false;
          return;
        }
      } else {
        // Files selected directly - convert to DriveFileMetadata format
        filesToProcess = pickerResult.docs.map(d => ({
          id: d.id,
          name: d.name,
          mimeType: d.mimeType,
          size: d.sizeBytes
        }));
      }

      // Single file: use single-file processing
      if (filesToProcess.length === 1) {
        const fileMetadata = filesToProcess[0];

        // Store file ID for reprocessing
        originalFileUrl = null;
        originalFileId = fileMetadata.id;

        if ($analysisMode === 'filename-only') {
          // Filename-only mode: Just use metadata
          const file = new File([], fileMetadata.name, { type: 'application/octet-stream' });
          await processSingleFile(file);
        } else {
          // Download and process file
          const file = await driveAPI.downloadFile(fileMetadata.id);
          await processSingleFile(file);
        }
        processing = false;
        return;
      }

      // Multiple files: use batch processing
      processing = false; // Turn off single-file processing flag
      await processBatchFiles(filesToProcess);

    } catch (err) {
      if (err instanceof Error && err.message.includes('cancelled')) {
        // User cancelled - not an error
        error = '';
      } else {
        error = err instanceof Error ? err.message : 'Failed to browse Google Drive';
      }
      results = null;
      processing = false;
    }
  }

  async function handleReprocess() {
    if (!driveAPI) {
      error = 'Google Drive API not initialized. Please sign in again.';
      return;
    }

    // Check if we need to re-download (switching from filename-only to audio mode)
    const needsRedownload = resultsMode === 'filename-only' && $analysisMode !== 'filename-only';

    if (needsRedownload && (originalFileUrl || originalFileId)) {
      processing = true;
      error = '';
      results = null;

      try {
        let file: File;

        if (originalFileUrl) {
          // Re-download from URL
          file = await driveAPI.downloadFileFromUrl(originalFileUrl);
        } else if (originalFileId) {
          // Re-download using file ID
          file = await driveAPI.downloadFile(originalFileId);
        } else {
          throw new Error('No file source available for reprocessing');
        }

        await processSingleFile(file);
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to reprocess file';
        results = null;
      } finally {
        processing = false;
      }
    } else if (currentFile) {
      // Normal reprocessing (just re-validate with different mode)
      await processSingleFile(currentFile);
    }
  }
</script>

<style>
  .google-drive-tab {
    padding: 1.5rem 0;
  }

  .auth-section {
    margin-bottom: 1.5rem;
    padding: 0.875rem 1rem;
    background: linear-gradient(135deg, rgba(219, 68, 55, 0.05) 0%, rgba(219, 68, 55, 0.1) 100%);
    border: 1px solid rgba(219, 68, 55, 0.2);
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .auth-section.signed-out {
    flex-direction: column;
    align-items: flex-start;
    padding: 1.25rem;
  }

  .auth-section h3 {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-secondary, #666666);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .auth-section.signed-out h3 {
    font-size: 1rem;
    text-transform: none;
    letter-spacing: normal;
    margin-bottom: 0.5rem;
    color: var(--text-primary, #333333);
  }

  .auth-section.signed-out p {
    margin: 0 0 0.75rem 0;
    color: var(--text-secondary, #666666);
    font-size: 0.875rem;
  }

  .user-email {
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--text-primary, #333333);
    flex: 1;
  }

  .current-preset {
    margin-bottom: 1.5rem;
    padding: 1.25rem;
    background: linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(37, 99, 235, 0.1) 100%);
    border: 1px solid rgba(37, 99, 235, 0.2);
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .preset-label {
    font-weight: 500;
    font-size: 0.875rem;
    color: var(--text-secondary, #666666);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .preset-name {
    font-weight: 600;
    font-size: 1rem;
    color: var(--primary, #2563eb);
  }

  .current-preset a {
    margin-left: auto;
    padding: 0.5rem 1rem;
    background: var(--primary, #2563eb);
    color: white;
    text-decoration: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .current-preset a:hover {
    background: var(--primary-dark, #1d4ed8);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);
  }

  .no-preset-warning {
    margin-bottom: 1.5rem;
    padding: 1.25rem;
    background: linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(255, 152, 0, 0.15) 100%);
    border: 1px solid rgba(255, 152, 0, 0.3);
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .no-preset-warning span {
    color: #000;
    font-weight: 500;
  }

  .no-preset-warning a {
    margin-left: auto;
    padding: 0.5rem 1rem;
    background: var(--warning, #ff9800);
    color: #000;
    text-decoration: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .no-preset-warning a:hover {
    background: #f57c00;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(255, 152, 0, 0.3);
  }

  .file-input-section {
    margin: 1.5rem 0;
    padding: 1.25rem;
    background: var(--bg-secondary, #ffffff);
    border: 1px solid var(--bg-tertiary, #e0e0e0);
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .file-input-section h3 {
    margin: 0 0 1rem 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-primary, #333333);
  }

  .file-input-wrapper {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .url-input-group {
    display: flex;
    gap: 0.75rem;
  }

  .url-input-group input {
    flex: 1;
    padding: 0.625rem 0.875rem;
    border: 2px solid var(--bg-tertiary, #e0e0e0);
    border-radius: 6px;
    font-size: 0.875rem;
  }

  .url-input-group input:focus {
    outline: none;
    border-color: var(--primary, #2563eb);
  }

  .analysis-mode-section {
    margin: 1.5rem 0;
    padding: 1.25rem;
    background: var(--bg-secondary, #ffffff);
    border: 1px solid var(--bg-tertiary, #e0e0e0);
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .analysis-mode-section h3 {
    margin: 0 0 1rem 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-primary, #333333);
  }

  .radio-group {
    display: flex;
    flex-direction: row;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .radio-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 0.875rem;
    border: 2px solid var(--bg-tertiary, #e0e0e0);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    flex: 1;
    min-width: 0;
  }

  .radio-label:hover {
    border-color: var(--primary, #2563eb);
    background: rgba(37, 99, 235, 0.02);
  }

  .radio-label input[type="radio"] {
    cursor: pointer;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  .radio-label input[type="radio"]:checked + .radio-content {
    color: var(--primary, #2563eb);
  }

  .radio-label:has(input[type="radio"]:checked) {
    border-color: var(--primary, #2563eb);
    background: rgba(37, 99, 235, 0.05);
  }

  .radio-content {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    flex: 1;
    min-width: 0;
  }

  .radio-title {
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--text-primary, #333333);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .radio-description {
    font-size: 0.75rem;
    color: var(--text-secondary, #666666);
    line-height: 1.2;
  }

  .three-hour-note {
    margin-top: 1rem;
    padding: 0.75rem;
    background: rgba(59, 130, 246, 0.1);
    border-left: 3px solid var(--primary, #2563eb);
    border-radius: 4px;
    font-size: 0.875rem;
    color: var(--text-primary, #333333);
  }

  .error-message {
    margin: 1.5rem 0;
    padding: 1.25rem;
    background: linear-gradient(135deg, rgba(244, 67, 54, 0.1) 0%, rgba(244, 67, 54, 0.15) 100%);
    border: 1px solid rgba(244, 67, 54, 0.3);
    color: var(--danger, #f44336);
    border-radius: 8px;
    font-weight: 500;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .processing-indicator {
    margin: 1.5rem 0;
    padding: 1.25rem;
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.05) 0%, rgba(76, 175, 80, 0.1) 100%);
    border: 1px solid rgba(76, 175, 80, 0.2);
    border-radius: 8px;
    text-align: center;
    color: var(--success, #4CAF50);
    font-weight: 500;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .batch-progress {
    margin: 1.5rem 0;
    padding: 1.5rem;
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.05) 0%, rgba(76, 175, 80, 0.1) 100%);
    border: 1px solid rgba(76, 175, 80, 0.2);
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .batch-progress h3 {
    margin: 0 0 1rem 0;
    color: var(--text-primary, #333333);
    font-size: 1rem;
  }

  .batch-progress progress {
    width: 100%;
    height: 1.5rem;
    border-radius: 4px;
    margin-bottom: 0.75rem;
  }

  .progress-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    gap: 1rem;
  }

  .progress-info p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-secondary, #666666);
  }

  .current-file {
    font-style: italic;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .btn-danger {
    padding: 0.5rem 1rem;
    background: var(--danger, #f44336);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-danger:hover {
    background: #d32f2f;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(244, 67, 54, 0.3);
  }

  .batch-summary {
    margin: 1.5rem 0;
    padding: 1.5rem;
    background: var(--bg-secondary, #ffffff);
    border: 1px solid var(--bg-tertiary, #e0e0e0);
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .batch-summary h3 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary, #333333);
  }

  .summary-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .stat {
    text-align: center;
    padding: 1rem;
    border-radius: 6px;
    background: var(--bg-tertiary, #f5f5f5);
  }

  .stat.pass {
    background: rgba(76, 175, 80, 0.1);
    border: 1px solid rgba(76, 175, 80, 0.3);
  }

  .stat.warning {
    background: rgba(255, 152, 0, 0.1);
    border: 1px solid rgba(255, 152, 0, 0.3);
  }

  .stat.fail {
    background: rgba(244, 67, 54, 0.1);
    border: 1px solid rgba(244, 67, 54, 0.3);
  }

  .stat.error {
    background: rgba(156, 39, 176, 0.1);
    border: 1px solid rgba(156, 39, 176, 0.3);
  }

  .stat-value {
    display: block;
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .stat-label {
    display: block;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary, #666666);
  }

  .batch-duration {
    padding: 0.75rem;
    background: rgba(37, 99, 235, 0.05);
    border: 1px solid rgba(37, 99, 235, 0.2);
    border-radius: 6px;
    text-align: center;
    font-weight: 500;
  }

  .duration-value {
    font-size: 1.1rem;
    color: var(--primary, #2563eb);
  }

  .stale-results-overlay {
    position: relative;
  }

  .stale-results-overlay::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.7);
    pointer-events: none;
    border-radius: 8px;
  }

  [data-theme="dark"] .stale-results-overlay::after {
    background: rgba(15, 23, 42, 0.7);
  }

  .stale-indicator {
    margin: 1rem 0;
    padding: 1rem;
    background: linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(255, 152, 0, 0.15) 100%);
    border: 1px solid rgba(255, 152, 0, 0.3);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .stale-indicator-text {
    color: var(--text-primary, #333333);
    font-weight: 500;
    font-size: 0.875rem;
  }

  .reprocess-button {
    padding: 0.5rem 1rem;
    background: var(--primary, #2563eb);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .reprocess-button:hover {
    background: var(--primary-dark, #1d4ed8);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);
  }

  .reprocess-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  button {
    padding: 0.5rem 1rem;
    background: var(--primary, #2563eb);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  button:hover {
    background: var(--primary-dark, #1d4ed8);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  button.secondary {
    background: var(--bg-tertiary, #e0e0e0);
    color: var(--text-primary, #333333);
  }

  button.secondary:hover {
    background: #d0d0d0;
  }

  .browse-drive-button {
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg, rgba(219, 68, 55, 0.9) 0%, rgba(219, 68, 55, 1) 100%);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(219, 68, 55, 0.3);
    white-space: nowrap;
  }

  .browse-drive-button:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(200, 50, 40, 0.9) 0%, rgba(200, 50, 40, 1) 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(219, 68, 55, 0.4);
  }

  .browse-drive-button:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(219, 68, 55, 0.3);
  }
</style>

<div class="google-drive-tab">
  {#if $authState.google.isAuthenticated}
    <div class="auth-section">
      <h3>Google Drive:</h3>
      <span class="user-email">✓ {$authState.google.userInfo?.email}</span>
      <button class="secondary" on:click={handleSignOut}>Sign Out</button>
    </div>
  {:else}
    <div class="auth-section signed-out">
      <h3>Google Drive Authentication</h3>
      <p>Sign in to access your Google Drive files</p>
      <button on:click={handleSignIn}>Sign in with Google</button>
    </div>
  {/if}

  {#if $authState.google.isAuthenticated}
    <!-- Preset Display -->
    {#if $currentPresetId && $currentPresetId !== 'custom'}
      <div class="current-preset">
        <span class="preset-label">Current Preset:</span>
        <span class="preset-name">{availablePresets[$currentPresetId]?.name || $currentPresetId}</span>
        <a href="#" on:click|preventDefault={goToSettings}>Change</a>
      </div>
    {:else}
      <div class="no-preset-warning">
        <span>⚠️ No preset selected. Files will be analyzed without validation.</span>
        <a href="#" on:click|preventDefault={goToSettings}>Select a preset</a>
      </div>
    {/if}

    <!-- File Input Section -->
    <div class="file-input-section">
      <h3>Select File:</h3>
      <div class="file-input-wrapper">
        <div class="url-input-group">
          <input
            type="text"
            bind:value={fileUrl}
            placeholder="Paste Google Drive file or folder URL (e.g., https://drive.google.com/...)"
            disabled={processing}
          />
          <button on:click={handleUrlSubmit} disabled={processing || !fileUrl.trim()}>
            Analyze URL
          </button>
          <button class="browse-drive-button" on:click={handleBrowseDrive} disabled={processing || pickerLoading}>
            {#if pickerLoading}
              🔄 Loading Picker...
            {:else}
              📁 Browse
            {/if}
          </button>
        </div>
      </div>
    </div>

    <!-- Analysis Mode Selection (only for presets with filename validation) -->
    {#if $currentPresetId && availablePresets[$currentPresetId]?.supportsFilenameValidation}
      <div class="analysis-mode-section">
        <h3>Analysis Mode:</h3>
        <div class="radio-group">
          <label class="radio-label">
            <input
              type="radio"
              name="analysis-mode-drive"
              value="full"
              checked={$analysisMode === 'full'}
              on:change={() => setAnalysisMode('full')}
              disabled={processing}
            />
            <div class="radio-content">
              <span class="radio-title">Full Analysis</span>
              <span class="radio-description">Audio analysis + filename validation</span>
            </div>
          </label>

          <label class="radio-label">
            <input
              type="radio"
              name="analysis-mode-drive"
              value="audio-only"
              checked={$analysisMode === 'audio-only'}
              on:change={() => setAnalysisMode('audio-only')}
              disabled={processing}
            />
            <div class="radio-content">
              <span class="radio-title">Audio Analysis Only</span>
              <span class="radio-description">Skip filename validation</span>
            </div>
          </label>

          <label class="radio-label">
            <input
              type="radio"
              name="analysis-mode-drive"
              value="filename-only"
              checked={$analysisMode === 'filename-only'}
              on:change={() => setAnalysisMode('filename-only')}
              disabled={processing}
            />
            <div class="radio-content">
              <span class="radio-title">Filename Validation Only</span>
              <span class="radio-description">Fast - metadata only, no audio processing</span>
            </div>
          </label>
        </div>

        {#if availablePresets[$currentPresetId]?.filenameValidationType === 'script-match'}
          <div class="three-hour-note">
            ℹ️ <strong>Note:</strong> Three Hour filename validation configuration will be added here in Phase 5.7 (scripts folder URL + speaker ID).
          </div>
        {/if}
      </div>
    {/if}

    <!-- Error Message -->
    {#if error}
      <div class="error-message">{error}</div>
    {/if}

    <!-- Processing Indicator -->
    {#if processing}
      <div class="processing-indicator">Processing file...</div>
    {/if}

    <!-- Batch Processing Progress -->
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

    <!-- Stale Results Warning -->
    {#if resultsStale}
      <div class="stale-indicator">
        <span class="stale-indicator-text">
          ⚠️ Results are from {resultsMode === 'full' ? 'Full Analysis' : resultsMode === 'audio-only' ? 'Audio Only' : 'Filename Only'} mode
        </span>
        <button
          class="reprocess-button"
          on:click={handleReprocess}
          disabled={processing}
        >
          ⟳ Reprocess with {$analysisMode === 'full' ? 'Full Analysis' : $analysisMode === 'audio-only' ? 'Audio Only' : 'Filename Only'}
        </button>
      </div>
    {/if}

    <!-- Results Table (Single File) -->
    {#if results && !batchProcessing && batchResults.length === 0}
      <div class:stale-results-overlay={resultsStale}>
        <ResultsTable
          results={[results]}
          mode="single"
          metadataOnly={$analysisMode === 'filename-only'}
          experimentalMode={$analysisMode === 'experimental'}
        />
      </div>
    {/if}

    <!-- Batch Results -->
    {#if batchResults.length > 0 && !batchProcessing}
      <!-- Batch Summary -->
      <div class="batch-summary">
        <h3>Batch Analysis Complete</h3>
        <div class="summary-stats">
          <div class="stat pass">
            <div class="stat-value">{batchResults.filter(r => r.status === 'pass').length}</div>
            <div class="stat-label">Pass</div>
          </div>
          <div class="stat warning">
            <div class="stat-value">{batchResults.filter(r => r.status === 'warning').length}</div>
            <div class="stat-label">Warnings</div>
          </div>
          <div class="stat fail">
            <div class="stat-value">{batchResults.filter(r => r.status === 'fail').length}</div>
            <div class="stat-label">Failed</div>
          </div>
          <div class="stat error">
            <div class="stat-value">{batchResults.filter(r => r.status === 'error').length}</div>
            <div class="stat-label">Errors</div>
          </div>
        </div>

        {#if $analysisMode !== 'filename-only'}
          <div class="batch-duration">
            <div class="duration-value">
              {(() => {
                // Only count pass and warning files (exclude failed and errors)
                const total = batchResults
                  .filter(r => r.status === 'pass' || r.status === 'warning')
                  .reduce((sum, r) => sum + (r.duration || 0), 0);
                const minutes = Math.floor(total / 60);
                const seconds = Math.floor(total % 60);
                return `Total Duration: ${minutes}:${seconds.toString().padStart(2, '0')}`;
              })()}
            </div>
          </div>
        {/if}
      </div>

      <!-- Batch Results Table -->
      <ResultsTable
        results={batchResults}
        mode="batch"
        metadataOnly={$analysisMode === 'filename-only'}
        experimentalMode={$analysisMode === 'experimental'}
      />
    {/if}
  {/if}
</div>
