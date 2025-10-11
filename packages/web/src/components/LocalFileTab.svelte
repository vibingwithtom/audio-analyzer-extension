<script lang="ts">
  import { onDestroy } from 'svelte';
  import FileUpload from './FileUpload.svelte';
  import ResultsTable from './ResultsTable.svelte';
  import { AudioAnalyzer, LevelAnalyzer, CriteriaValidator } from '@audio-analyzer/core';
  import { FilenameValidator } from '../validation/filename-validator';
  import { currentCriteria, currentPresetId, availablePresets } from '../stores/settings';
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
      // If mode changed back to original, results are no longer stale
      if ($analysisMode === resultsMode) {
        resultsStale = false;
      } else {
        // Mode is different from what generated results
        resultsStale = true;
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
      // Basic file analysis
      const basicResults = await audioAnalyzer.analyzeFile(file);

      // Advanced analysis (skip if filename-only mode)
      let advancedResults = null;
      if ($analysisMode !== 'filename-only') {
        // Decode audio for advanced analysis
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        advancedResults = await levelAnalyzer.analyzeAudioBuffer(audioBuffer);
      }

      // Create blob URL for audio playback
      currentAudioUrl = URL.createObjectURL(file);

      // Combine results
      const analysisResults = {
        filename: file.name,
        fileSize: file.size,
        audioUrl: currentAudioUrl,
        ...basicResults,
        ...(advancedResults || {})
      };

      // Validate against criteria if a preset is selected
      const criteria = $currentCriteria;
      const mode = $analysisMode;
      if (criteria && $currentPresetId !== 'custom') {
        // Run audio criteria validation (skip if filename-only mode)
        const skipAudioValidation = mode === 'filename-only';
        validation = CriteriaValidator.validateResults(analysisResults, criteria, skipAudioValidation);

        // Add filename validation if the preset supports it (skip if audio-only mode)
        const currentPreset = availablePresets[$currentPresetId];
        if (currentPreset?.filenameValidationType && mode !== 'audio-only') {
          let filenameValidation;

          if (currentPreset.filenameValidationType === 'bilingual-pattern') {
            // Validate bilingual conversational filename
            filenameValidation = FilenameValidator.validateBilingual(file.name);
          } else if (currentPreset.filenameValidationType === 'script-match') {
            // Script matching not available in local file tab (requires Google Drive scripts folder)
            filenameValidation = {
              status: 'warning',
              value: file.name,
              issue: 'Script matching only available on Google Drive tab'
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

        results = {
          ...analysisResults,
          status: overallStatus,
          validation
        };
      } else {
        // No validation - just show results
        results = {
          ...analysisResults,
          status: 'pass'
        };
      }

      // Store the mode used to generate these results
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
    const file = inputElement?.files?.[0];

    if (!file) return;

    await processFile(file);
  }

  async function handleReprocess() {
    if (!currentFile) return;
    await processFile(currentFile);
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

  label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  input[type="checkbox"] {
    cursor: pointer;
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
</style>

<div class="local-file-tab">
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

  <FileUpload
    id="local-file-upload"
    {processing}
    accept="audio/*"
    on:change={handleFileChange}
  />

  <!-- Analysis Mode Selection (only for presets with filename validation) -->
  {#if $currentPresetId && availablePresets[$currentPresetId]?.supportsFilenameValidation}
    <div class="analysis-mode-section">
      <h3>Analysis Mode:</h3>
      <div class="radio-group">
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
            <span class="radio-description">Audio analysis + filename validation</span>
          </div>
        </label>

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
            <span class="radio-title">Audio Analysis Only</span>
            <span class="radio-description">Skip filename validation</span>
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
            <span class="radio-title">Filename Validation Only</span>
            <span class="radio-description">Fast - metadata only, no audio processing</span>
          </div>
        </label>
      </div>

      {#if availablePresets[$currentPresetId]?.filenameValidationType === 'script-match'}
        <div class="three-hour-note">
          ℹ️ <strong>Note:</strong> Three Hour filename validation requires Google Drive tab configuration (Phase 5.7).
        </div>
      {/if}
    </div>
  {/if}

  {#if error}
    <div class="error-message">{error}</div>
  {/if}

  {#if processing}
    <div class="processing-indicator">Processing file...</div>
  {/if}

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

  {#if results}
    <div class:stale-results-overlay={resultsStale}>
      <ResultsTable
        results={[results]}
        mode="single"
        metadataOnly={$analysisMode === 'filename-only'}
      />
    </div>
  {/if}
</div>
