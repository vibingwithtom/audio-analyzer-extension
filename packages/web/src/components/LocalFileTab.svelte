<script lang="ts">
  import { onDestroy } from 'svelte';
  import FileUpload from './FileUpload.svelte';
  import ResultsDisplay from './ResultsDisplay.svelte';
  import { analyzeAudioFile } from '../services/audio-analysis-service';
  import { currentPresetId, availablePresets, currentCriteria } from '../stores/settings';
  import { currentTab } from '../stores/tabs';
  import { analysisMode, setAnalysisMode, type AnalysisMode } from '../stores/analysisMode';
  import type { AudioResults, ValidationResults } from '../types';

  function goToSettings() {
    currentTab.setTab('settings');
  }

  let processing = false;
  let error = '';
  let results: AudioResults | null = null;
  let validation: ValidationResults | null = null;
  let currentAudioUrl: string | null = null;
  let currentFile: File | null = null;
  let resultsStale = false;
  let resultsMode: AnalysisMode | null = null; // The mode used to generate current results

  // Batch processing state
  let batchResults: AudioResults[] = [];
  let totalFiles = 0;
  let processedFiles = 0;
  let isBatchMode = false;
  let cancelRequested = false;
  let batchFiles: File[] = []; // Store files for reprocessing

  // Cleanup blob URL when component is destroyed
  function cleanup() {
    if (currentAudioUrl) {
      URL.revokeObjectURL(currentAudioUrl);
      currentAudioUrl = null;
    }
  }

  onDestroy(cleanup);

  // Auto-set mode for auditions presets (watch for preset changes)
  $: if ($currentPresetId?.startsWith('auditions-') && $analysisMode !== 'audio-only') {
    setAnalysisMode('audio-only');
  }

  // Helper functions for smart staleness detection
  // For audio properties, check if they were VALIDATED, not just if raw data exists
  function hasValidatedAudioProperties(result: AudioResults): boolean {
    return result.validation?.sampleRate !== undefined || result.validation?.bitDepth !== undefined;
  }

  function hasFilenameValidation(result: AudioResults): boolean {
    return result.validation?.filename !== undefined;
  }

  function hasExperimentalMetrics(result: AudioResults): boolean {
    return result.peakDb !== undefined || result.reverbInfo !== undefined;
  }

  function areResultsStaleForMode(
    results: AudioResults | AudioResults[],
    newMode: AnalysisMode,
    currentPreset: any
  ): boolean {
    const resultArray = Array.isArray(results) ? results : [results];
    const firstResult = resultArray[0];

    if (!firstResult) return true; // No results = stale

    switch (newMode) {
      case 'audio-only':
        // Need audio properties (check for VALIDATED data, not just raw data)
        return !hasValidatedAudioProperties(firstResult);

      case 'filename-only':
        // Need filename validation (if preset supports it)
        if (currentPreset?.supportsFilenameValidation) {
          return !hasFilenameValidation(firstResult);
        }
        return false; // Preset doesn't support filename validation, so not stale

      case 'full':
        // Need both audio properties and filename validation
        const needsFilename = currentPreset?.supportsFilenameValidation;
        if (!hasValidatedAudioProperties(firstResult)) return true;
        if (needsFilename && !hasFilenameValidation(firstResult)) return true;
        return false;

      case 'experimental':
        // Need experimental metrics
        return !hasExperimentalMetrics(firstResult);

      default:
        return false;
    }
  }

  // Smart staleness detection - only mark stale if new mode needs data we don't have
  $: {
    if ((results || (isBatchMode && batchResults.length > 0)) && resultsMode !== null) {
      if ($analysisMode === resultsMode) {
        resultsStale = false;
      } else {
        // Smart staleness detection based on what data is present vs needed
        const currentPreset = availablePresets[$currentPresetId];
        const currentResults = isBatchMode ? batchResults : results;
        const isStale = areResultsStaleForMode(currentResults, $analysisMode, currentPreset);

        // Debug logging
        console.log('Staleness Check:', {
          resultsMode,
          newMode: $analysisMode,
          isStale,
          hasValidatedAudio: results ? hasValidatedAudioProperties(results) : (batchResults.length > 0 ? hasValidatedAudioProperties(batchResults[0]) : false),
          hasFilename: results ? hasFilenameValidation(results) : (batchResults.length > 0 ? hasFilenameValidation(batchResults[0]) : false),
          hasExperimental: results ? hasExperimentalMetrics(results) : (batchResults.length > 0 ? hasExperimentalMetrics(batchResults[0]) : false)
        });

        resultsStale = isStale;
      }
    }
  }

  async function processFile(file: File) {
    // Clean up previous blob URL if exists
    cleanup();

    processing = true;
    error = '';
    results = null;
    validation = null;
    resultsStale = false;
    resultsMode = null;
    currentFile = file;

    try {
      // Use shared analysis service
      const analysisResults = await analyzeAudioFile(file, {
        analysisMode: $analysisMode,
        preset: $currentPresetId ? availablePresets[$currentPresetId] : null,
        presetId: $currentPresetId,
        criteria: $currentCriteria
      });

      // Create blob URL for audio playback
      currentAudioUrl = URL.createObjectURL(file);
      analysisResults.audioUrl = currentAudioUrl;

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

  async function handleFileChange(event: CustomEvent) {
    const inputElement = event.target as HTMLInputElement;
    const files = inputElement?.files;

    if (!files || files.length === 0) return;

    // Convert FileList to array
    const filesArray = Array.from(files);

    if (filesArray.length === 1) {
      // Single file mode
      isBatchMode = false;
      batchResults = [];
      await processFile(filesArray[0]);
    } else {
      // Batch mode
      isBatchMode = true;
      results = null;
      await processBatchFiles(filesArray);
    }
  }

  async function processBatchFiles(files: File[]) {
    processing = true;
    error = '';
    batchResults = [];
    batchFiles = files; // Store for reprocessing
    totalFiles = files.length;
    processedFiles = 0;
    cancelRequested = false;
    resultsStale = false;
    resultsMode = $analysisMode;

    for (let i = 0; i < files.length; i++) {
      // Check if cancel was requested
      if (cancelRequested) {
        error = 'Processing cancelled by user';
        break;
      }

      const file = files[i];
      processedFiles = i + 1;

      try {
        const result = await processSingleFile(file);
        batchResults = [...batchResults, result];
      } catch (err) {
        // Add error result (separate from validation failures)
        batchResults = [...batchResults, {
          filename: file.name,
          fileSize: file.size,
          fileType: 'unknown',
          channels: 0,
          sampleRate: 0,
          bitDepth: 0,
          duration: 0,
          status: 'error' as any,
          validation: {
            fileType: {
              status: 'fail',
              value: 'Error',
              issue: err instanceof Error ? err.message : 'Unknown error'
            }
          }
        }];
      }
    }

    processing = false;
    cancelRequested = false;
  }

  async function processSingleFile(file: File): Promise<AudioResults> {
    // Use shared analysis service
    return await analyzeAudioFile(file, {
      analysisMode: $analysisMode,
      preset: $currentPresetId ? availablePresets[$currentPresetId] : null,
      presetId: $currentPresetId,
      criteria: $currentCriteria
    });
  }

  async function handleReprocess() {
    if (isBatchMode && batchFiles.length > 0) {
      await processBatchFiles(batchFiles);
    } else if (currentFile) {
      await processFile(currentFile);
    }
  }

  function handleCancelBatch() {
    cancelRequested = true;
  }
</script>

<style>
  .local-file-tab {
    padding: 1.5rem 0;
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

</style>

<div class="local-file-tab">
  {#if $currentPresetId}
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

  <FileUpload
    id="local-file-upload"
    {processing}
    accept="audio/*"
    multiple={true}
    on:change={handleFileChange}
  />

  <!-- Analysis Mode Selection (only show for non-auditions presets) -->
  {#if !$currentPresetId?.startsWith('auditions-')}
    <div class="analysis-mode-section">
      <h3>Analysis Mode:</h3>
      <div class="radio-group">

        {#if availablePresets[$currentPresetId]?.supportsFilenameValidation && availablePresets[$currentPresetId]?.filenameValidationType !== 'script-match'}
          <!-- Filename validation presets (non-Three Hour): Show all 4 options (Audio Only, Filename Only, Full, Experimental) -->
          <label class="radio-label">
            <input
              type="radio"
              name="analysis-mode"
              value="audio-only"
              checked={$analysisMode === 'audio-only'}
              on:change={() => setAnalysisMode('audio-only')}
              disabled={processing}
            />
            <div class="radio-content">
              <span class="radio-title">Audio Only</span>
              <span class="radio-description">Basic properties only</span>
            </div>
          </label>

          <label class="radio-label">
            <input
              type="radio"
              name="analysis-mode"
              value="filename-only"
              checked={$analysisMode === 'filename-only'}
              on:change={() => setAnalysisMode('filename-only')}
              disabled={processing}
            />
            <div class="radio-content">
              <span class="radio-title">Filename Only</span>
              <span class="radio-description">Fastest - metadata only</span>
            </div>
          </label>

          <label class="radio-label">
            <input
              type="radio"
              name="analysis-mode"
              value="full"
              checked={$analysisMode === 'full'}
              on:change={() => setAnalysisMode('full')}
              disabled={processing}
            />
            <div class="radio-content">
              <span class="radio-title">Full Analysis</span>
              <span class="radio-description">Basic properties + filename validation</span>
            </div>
          </label>

          <label class="radio-label">
            <input
              type="radio"
              name="analysis-mode"
              value="experimental"
              checked={$analysisMode === 'experimental'}
              on:change={() => setAnalysisMode('experimental')}
              disabled={processing}
            />
            <div class="radio-content">
              <span class="radio-title">Experimental Analysis</span>
              <span class="radio-description">Peak level, noise floor, reverb, silence detection</span>
            </div>
          </label>

        {:else}
          <!-- Non-filename presets OR Three Hour preset: Show 2 options (Audio Analysis, Experimental) -->
          <label class="radio-label">
            <input
              type="radio"
              name="analysis-mode"
              value="audio-only"
              checked={$analysisMode === 'audio-only'}
              on:change={() => setAnalysisMode('audio-only')}
              disabled={processing}
            />
            <div class="radio-content">
              <span class="radio-title">Audio Analysis</span>
              <span class="radio-description">Basic properties (sample rate, bit depth, duration)</span>
            </div>
          </label>

          <label class="radio-label">
            <input
              type="radio"
              name="analysis-mode"
              value="experimental"
              checked={$analysisMode === 'experimental'}
              on:change={() => setAnalysisMode('experimental')}
              disabled={processing}
            />
            <div class="radio-content">
              <span class="radio-title">Experimental Analysis</span>
              <span class="radio-description">Peak level, noise floor, reverb, silence detection</span>
            </div>
          </label>
        {/if}

      </div>

      {#if availablePresets[$currentPresetId]?.filenameValidationType === 'script-match'}
        <div class="three-hour-note">
          ℹ️ <strong>Note:</strong> Three Hour filename validation requires Google Drive. Use the Google Drive tab for filename validation, or select Audio Analysis/Experimental here.
        </div>
      {/if}
    </div>
  {/if}

  <!-- Results Display Component -->
  <ResultsDisplay
    results={isBatchMode ? batchResults : results}
    isProcessing={processing}
    error={error}
    {resultsMode}
    {resultsStale}
    {processedFiles}
    {totalFiles}
    onReprocess={handleReprocess}
    onCancel={handleCancelBatch}
    {cancelRequested}
  />
</div>
