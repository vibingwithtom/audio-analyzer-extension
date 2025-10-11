<script lang="ts">
  import StatusBadge from './StatusBadge.svelte';
  import { renderResultRow, updateColumnVisibility } from '../display-utils';
  import type { AudioResults, ValidationResults } from '../types';

  export let results: AudioResults[] = [];
  export let mode: 'single' | 'batch' = 'single';
  export let metadataOnly = false;

  $: isSingleFile = mode === 'single';

  function getValidationStatus(result: AudioResults, field: string): 'pass' | 'warning' | 'fail' | null {
    if (!result.validation) return null;
    return result.validation[field]?.status || null;
  }

  function getValidationIssue(result: AudioResults, field: string): string | undefined {
    if (!result.validation) return undefined;
    return result.validation[field]?.issue;
  }

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

  /* Row-level tinting based on overall status */
  .results-table tbody tr.status-fail {
    background-color: rgba(244, 67, 54, 0.05);
  }

  .results-table tbody tr.status-warning {
    background-color: rgba(255, 152, 0, 0.05);
  }

  .results-table tbody tr.status-pass {
    background-color: rgba(76, 175, 80, 0.05);
  }

  /* Cell-level validation highlighting */
  .validation-pass {
    background-color: rgba(76, 175, 80, 0.15);
    color: var(--success, #4CAF50);
    font-weight: 600;
  }

  .validation-warning {
    background-color: rgba(255, 152, 0, 0.15);
    color: var(--warning, #ff9800);
    font-weight: 600;
  }

  .validation-fail {
    background-color: rgba(244, 67, 54, 0.15);
    color: var(--danger, #f44336);
    font-weight: 600;
  }

  .validation-issue {
    cursor: help;
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
        <tr class:status-pass={result.status === 'pass'} class:status-warning={result.status === 'warning'} class:status-fail={result.status === 'fail'}>
          <td>{result.filename}</td>
          <td><StatusBadge status={result.status} /></td>
          {#if !metadataOnly}
            <td
              class:validation-pass={getValidationStatus(result, 'sampleRate') === 'pass'}
              class:validation-warning={getValidationStatus(result, 'sampleRate') === 'warning'}
              class:validation-fail={getValidationStatus(result, 'sampleRate') === 'fail'}
              class:validation-issue={getValidationIssue(result, 'sampleRate')}
              title={getValidationIssue(result, 'sampleRate')}
            >
              {result.sampleRate} Hz
            </td>
            <td
              class:validation-pass={getValidationStatus(result, 'bitDepth') === 'pass'}
              class:validation-warning={getValidationStatus(result, 'bitDepth') === 'warning'}
              class:validation-fail={getValidationStatus(result, 'bitDepth') === 'fail'}
              class:validation-issue={getValidationIssue(result, 'bitDepth')}
              title={getValidationIssue(result, 'bitDepth')}
            >
              {result.bitDepth} bit
            </td>
            <td
              class:validation-pass={getValidationStatus(result, 'channels') === 'pass'}
              class:validation-warning={getValidationStatus(result, 'channels') === 'warning'}
              class:validation-fail={getValidationStatus(result, 'channels') === 'fail'}
              class:validation-issue={getValidationIssue(result, 'channels')}
              title={getValidationIssue(result, 'channels')}
            >
              {result.channels}
            </td>
            <td
              class:validation-pass={getValidationStatus(result, 'duration') === 'pass'}
              class:validation-warning={getValidationStatus(result, 'duration') === 'warning'}
              class:validation-fail={getValidationStatus(result, 'duration') === 'fail'}
              class:validation-issue={getValidationIssue(result, 'duration')}
              title={getValidationIssue(result, 'duration')}
            >
              {result.duration}s
            </td>
          {/if}
          <td
            class:validation-pass={getValidationStatus(result, 'fileType') === 'pass'}
            class:validation-warning={getValidationStatus(result, 'fileType') === 'warning'}
            class:validation-fail={getValidationStatus(result, 'fileType') === 'fail'}
            class:validation-issue={getValidationIssue(result, 'fileType')}
            title={getValidationIssue(result, 'fileType')}
          >
            {formatBytes(result.fileSize)}
          </td>
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
