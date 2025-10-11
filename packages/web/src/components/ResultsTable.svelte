<script lang="ts">
  import StatusBadge from './StatusBadge.svelte';
  import { renderResultRow, updateColumnVisibility } from '../display-utils';
  import type { AudioResults } from '../types';

  export let results: AudioResults[] = [];
  export let mode: 'single' | 'batch' = 'single';
  export let metadataOnly = false;

  $: isSingleFile = mode === 'single';

  // Calculate summary stats for batch mode
  $: summaryStats = mode === 'batch' ? {
    total: results.length,
    passed: results.filter(r => r.status === 'pass').length,
    failed: results.filter(r => r.status === 'fail').length,
    warnings: results.filter(r => r.status === 'warning').length,
    errors: results.filter(r => r.status === 'error').length
  } : null;

  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
</script>

<style>
  .results-container {
    margin-top: 2rem;
  }

  .batch-summary {
    margin-bottom: 1rem;
    padding: 1rem;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 8px;
  }

  .results-table {
    width: 100%;
    border-collapse: collapse;
  }

  .results-table th,
  .results-table td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--bg-tertiary, #e0e0e0);
    text-align: left;
  }

  .results-table th {
    font-weight: 600;
  }
</style>

<div class="results-container">
  {#if mode === 'batch' && summaryStats}
    <div class="batch-summary">
      <h3>Summary</h3>
      <p>{summaryStats.total} files: {summaryStats.passed} passed, {summaryStats.failed} failed</p>
    </div>
  {/if}

  <table class="results-table">
    <thead>
      <tr>
        <th>Filename</th>
        <th>Status</th>
        {#if !metadataOnly}
          <th>Sample Rate</th>
          <th>Bit Depth</th>
          <th>Channels</th>
          <th>Duration</th>
        {/if}
        <th>File Size</th>
        {#if isSingleFile}
          <th>Play</th>
        {/if}
      </tr>
    </thead>
    <tbody>
      {#each results as result}
        <tr>
          <td>{result.filename}</td>
          <td><StatusBadge status={result.status} /></td>
          {#if !metadataOnly}
            <td>{result.sampleRate} Hz</td>
            <td>{result.bitDepth} bit</td>
            <td>{result.channels}</td>
            <td>{result.duration}s</td>
          {/if}
          <td>{formatBytes(result.fileSize)}</td>
          {#if isSingleFile}
            <td>
              {#if result.audioUrl}
                <audio controls src={result.audioUrl}></audio>
              {/if}
            </td>
          {/if}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
