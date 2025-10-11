<script lang="ts">
  import { onDestroy } from 'svelte';
  import FileUpload from './FileUpload.svelte';
  import ResultsTable from './ResultsTable.svelte';
  import { AudioAnalyzer, LevelAnalyzer, CriteriaValidator } from '@audio-analyzer/core';
  import { currentCriteria, currentPresetId, availablePresets } from '../stores/settings';
  import { currentTab } from '../stores/tabs';
  import type { AudioResults, ValidationResults } from '../types';

  function goToSettings() {
    currentTab.setTab('settings');
  }

  let processing = false;
  let error = '';
  let metadataOnly = false;
  let results: AudioResults | null = null;
  let validation: ValidationResults | null = null;
  let currentAudioUrl: string | null = null;

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

  async function handleFileChange(event: CustomEvent) {
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement?.files?.[0];

    if (!file) return;

    // Clean up previous blob URL if exists
    cleanup();

    processing = true;
    error = '';
    results = null;
    validation = null;

    try {
      // Basic file analysis
      const basicResults = await audioAnalyzer.analyzeFile(file);

      // Advanced analysis (if not metadata-only)
      let advancedResults = null;
      if (!metadataOnly) {
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
      if (criteria && $currentPresetId !== 'custom') {
        validation = CriteriaValidator.validateResults(analysisResults, criteria, metadataOnly);

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

    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error occurred';
      results = null;
    } finally {
      processing = false;
    }
  }
</script>

<style>
  .local-file-tab {
    padding: 1.5rem 0;
  }

  .current-preset {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .preset-label {
    font-weight: 500;
    color: var(--text-secondary, #666666);
  }

  .preset-name {
    font-weight: 600;
    color: var(--text-primary, #333333);
  }

  .current-preset a {
    margin-left: auto;
    color: var(--primary, #2563eb);
    text-decoration: none;
  }

  .current-preset a:hover {
    text-decoration: underline;
  }

  .no-preset-warning {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: var(--warning, #ff9800);
    color: #000;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .no-preset-warning a {
    margin-left: auto;
    color: #000;
    text-decoration: underline;
    font-weight: 600;
  }

  .options {
    margin: 1.5rem 0;
  }

  .error-message {
    margin: 1rem 0;
    padding: 1rem;
    background: var(--danger, #f44336);
    color: white;
    border-radius: 8px;
  }

  .processing-indicator {
    margin: 1rem 0;
    padding: 1rem;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 8px;
    text-align: center;
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

  <div class="options">
    <label>
      <input type="checkbox" bind:checked={metadataOnly} />
      Metadata Only (skip audio analysis for faster processing)
    </label>
  </div>

  {#if error}
    <div class="error-message">{error}</div>
  {/if}

  {#if processing}
    <div class="processing-indicator">Processing file...</div>
  {/if}

  {#if results}
    <ResultsTable
      results={[results]}
      mode="single"
      {metadataOnly}
    />
  {/if}
</div>
