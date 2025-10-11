<script lang="ts">
  import FileUpload from './FileUpload.svelte';
  import ResultsTable from './ResultsTable.svelte';
  import ValidationDisplay from './ValidationDisplay.svelte';
  import { AudioAnalyzer, LevelAnalyzer, CriteriaValidator } from '@audio-analyzer/core';
  import type { AudioResults, ValidationResults } from '../types';

  let processing = false;
  let error = '';
  let metadataOnly = false;
  let results: AudioResults | null = null;
  let validation: ValidationResults | null = null;

  const audioAnalyzer = new AudioAnalyzer();
  const levelAnalyzer = new LevelAnalyzer();

  async function handleFileChange(event: CustomEvent) {
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement?.files?.[0];

    if (!file) return;

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

      // Combine results
      results = {
        filename: file.name,
        status: 'pass' as const,
        fileSize: file.size,
        ...basicResults,
        ...(advancedResults || {})
      };

      // TODO: Validate against criteria from settings when SettingsManager is integrated

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

    {#if validation}
      <ValidationDisplay {validation} />
    {/if}
  {/if}
</div>
