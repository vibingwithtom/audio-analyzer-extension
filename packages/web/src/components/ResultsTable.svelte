<script lang="ts">
  import StatusBadge from './StatusBadge.svelte';
  import { renderResultRow, updateColumnVisibility } from '../display-utils';
  import { formatSampleRate, formatDuration, formatBitDepth, formatChannels, formatBytes } from '../utils/format-utils';
  import type { AudioResults, ValidationResults } from '../types';

  export let results: AudioResults[] = [];
  export let mode: 'single' | 'batch' = 'single';
  export let metadataOnly = false;
  export let experimentalMode = false;

  $: isSingleFile = mode === 'single';

  function getValidationStatus(result: AudioResults, field: string): 'pass' | 'warning' | 'fail' | null {
    if (!result.validation) return null;
    return result.validation[field]?.status || null;
  }

  function getValidationIssue(result: AudioResults, field: string): string | undefined {
    if (!result.validation) return undefined;
    return result.validation[field]?.issue;
  }

  function getAllValidationIssues(result: AudioResults): string[] {
    if (!result.validation) return [];
    const issues: string[] = [];

    // Collect all validation issues
    Object.entries(result.validation).forEach(([field, validation]) => {
      if (validation.issue) {
        // Split concatenated error messages
        // Pattern: Capital letter after lowercase letter or closing paren indicates new error
        const splitErrors = validation.issue.split(/(?<=[a-z\)])(?=[A-Z])/);
        issues.push(...splitErrors.map(err => err.trim()).filter(err => err.length > 0));
      }
    });

    return issues;
  }

  // Helper functions for experimental metrics color-coding
  function getNormalizationClass(status: any): string {
    if (!status) return '';
    if (status.status === 'normalized') return 'success';
    return 'warning';
  }

  function getReverbClass(label: string): string {
    if (!label) return '';
    if (label.includes('Excellent') || label.includes('Good')) return 'success';
    if (label.includes('Fair')) return 'warning';
    return 'error';
  }

  function getMicBleedClass(micBleed: any): string {
    if (!micBleed) return '';
    if (micBleed.percentageConfirmedBleed < 0.5) return 'success';
    return 'warning';
  }

  function formatTime(seconds: number | undefined): string {
    if (seconds === undefined || seconds === null) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Calculate summary stats for batch mode
  $: summaryStats = mode === 'batch' ? {
    total: results.length,
    passed: results.filter(r => r.status === 'pass').length,
    failed: results.filter(r => r.status === 'fail').length,
    warnings: results.filter(r => r.status === 'warning').length,
    errors: results.filter(r => r.status === 'error').length
  } : null;
</script>

<style>
  .results-container {
    margin-top: 2rem;
  }

  .batch-summary {
    margin-bottom: 1.5rem;
    padding: 1.25rem;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .batch-summary h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.125rem;
    color: var(--text-primary, #333333);
  }

  .batch-summary p {
    margin: 0;
    color: var(--text-secondary, #666666);
  }

  .results-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    background: var(--bg-primary, #ffffff);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .results-table th,
  .results-table td {
    padding: 0.875rem 1rem;
    text-align: left;
    border-bottom: 1px solid var(--bg-tertiary, #e0e0e0);
  }

  .results-table th {
    font-weight: 600;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary, #666666);
    background: var(--bg-secondary, #f5f5f5);
    border-bottom: 2px solid var(--bg-tertiary, #e0e0e0);
  }

  .results-table tbody tr {
    transition: background-color 0.15s ease;
  }

  .results-table tbody tr:hover {
    background: var(--bg-secondary, #f5f5f5);
  }

  .results-table tbody tr:last-child td {
    border-bottom: none;
  }

  .results-table td {
    font-size: 0.9375rem;
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

  /* Dark mode row tinting - use higher opacity for visibility */
  :global([data-theme="dark"]) .results-table tbody tr.status-fail {
    background-color: rgba(244, 67, 54, 0.15);
  }

  :global([data-theme="dark"]) .results-table tbody tr.status-warning {
    background-color: rgba(255, 152, 0, 0.15);
  }

  :global([data-theme="dark"]) .results-table tbody tr.status-pass {
    background-color: rgba(76, 175, 80, 0.15);
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

  .error-details-cell {
    white-space: pre-line;
    line-height: 1.6;
  }

  .error-line {
    display: block;
    margin: 0.25rem 0;
  }

  .error-line:first-child {
    margin-top: 0;
  }

  .error-line:last-child {
    margin-bottom: 0;
  }

  /* Experimental mode value color-coding */
  .value-success {
    color: var(--success, #4CAF50);
    font-weight: 500;
  }

  .value-warning {
    color: var(--warning, #ff9800);
    font-weight: 500;
  }

  .value-error {
    color: var(--danger, #f44336);
    font-weight: 500;
  }

  .subtitle {
    font-size: 0.7rem;
    color: var(--text-secondary, #666);
    display: block;
    margin-top: 0.15rem;
  }

  /* Experimental table should be scrollable horizontally if needed */
  .experimental-table-wrapper {
    overflow-x: auto;
  }
</style>

<div class="results-container">
  {#if mode === 'batch' && summaryStats}
    <div class="batch-summary">
      <h3>Summary</h3>
      <p>{summaryStats.total} files: {summaryStats.passed} passed, {summaryStats.failed} failed</p>
    </div>
  {/if}

  {#if experimentalMode}
    <!-- EXPERIMENTAL MODE TABLE -->
    <div class="experimental-table-wrapper">
      <table class="results-table">
        <thead>
          <tr>
            <th>Filename</th>
            <th>Peak Level</th>
            <th>Normalization</th>
            <th>Noise Floor (Old)</th>
            <th>Noise Floor (New)</th>
            <th>Reverb (RT60)</th>
            <th>Leading Silence</th>
            <th>Trailing Silence</th>
            <th>Longest Silence</th>
            <th>Stereo Separation</th>
            <th>Mic Bleed</th>
          </tr>
        </thead>
        <tbody>
          {#each results as result}
            <tr>
              <td>{result.filename}</td>
              <td>{result.peakDb !== undefined ? result.peakDb.toFixed(1) + ' dB' : 'N/A'}</td>
              <td>
                {#if result.normalizationStatus}
                  <span class="value-{getNormalizationClass(result.normalizationStatus)}">
                    {result.normalizationStatus.message || 'N/A'}
                  </span>
                  {#if result.normalizationStatus.peakDb !== undefined}
                    <span class="subtitle">Peak: {result.normalizationStatus.peakDb.toFixed(1)}dB</span>
                  {/if}
                {:else}
                  N/A
                {/if}
              </td>
              <td>{result.noiseFloorDb !== undefined ? result.noiseFloorDb.toFixed(1) + ' dB' : 'N/A'}</td>
              <td>{result.noiseFloorDbHistogram !== undefined ? result.noiseFloorDbHistogram.toFixed(1) + ' dB' : 'N/A'}</td>
              <td>
                {#if result.reverbInfo}
                  <span class="value-{getReverbClass(result.reverbInfo.label)}">
                    ~{result.reverbInfo.time.toFixed(2)} s
                  </span>
                  <span class="subtitle">{result.reverbInfo.label}</span>
                {:else}
                  N/A
                {/if}
              </td>
              <td>{formatTime(result.leadingSilence)}</td>
              <td>{formatTime(result.trailingSilence)}</td>
              <td>{formatTime(result.longestSilence)}</td>
              <td>
                {#if result.stereoSeparation}
                  {result.stereoSeparation.stereoType}
                  <span class="subtitle">{Math.round(result.stereoSeparation.stereoConfidence * 100)}% conf</span>
                {:else}
                  Mono file
                {/if}
              </td>
              <td>
                {#if result.micBleed?.new}
                  <span class="value-{getMicBleedClass(result.micBleed.new)}">
                    {result.micBleed.new.percentageConfirmedBleed > 0.5 ? 'Detected' : 'Not detected'}
                  </span>
                  <span class="subtitle">Med: {result.micBleed.new.medianSeparation.toFixed(1)}dB</span>
                {:else}
                  <span style="color: #999;">N/A</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <!-- STANDARD MODE TABLE -->
    <table class="results-table">
    <thead>
      <tr>
        <th>Filename</th>
        <th>Status</th>
        {#if metadataOnly}
          <th>Error Details</th>
        {:else}
          <th>File Type</th>
          <th>Sample Rate</th>
          <th>Bit Depth</th>
          <th>Channels</th>
          <th>Duration</th>
          <th>File Size</th>
          {#if isSingleFile}
            <th>Play</th>
          {/if}
        {/if}
      </tr>
    </thead>
    <tbody>
      {#each results as result}
        <tr class:status-pass={result.status === 'pass'} class:status-warning={result.status === 'warning'} class:status-fail={result.status === 'fail'}>
          <td
            class:validation-pass={getValidationStatus(result, 'filename') === 'pass'}
            class:validation-warning={getValidationStatus(result, 'filename') === 'warning'}
            class:validation-fail={getValidationStatus(result, 'filename') === 'fail'}
            class:validation-issue={getValidationIssue(result, 'filename')}
            title={getValidationIssue(result, 'filename')}
          >
            {result.filename}
          </td>
          <td><StatusBadge status={result.status} /></td>
          {#if metadataOnly}
            <!-- Filename-only mode: Show error details inline -->
            <td class="error-details-cell">
              {getValidationIssue(result, 'filename') || '—'}
            </td>
          {:else}
            <!-- Full analysis mode: Show all columns -->
            <td
              class:validation-pass={getValidationStatus(result, 'fileType') === 'pass'}
              class:validation-warning={getValidationStatus(result, 'fileType') === 'warning'}
              class:validation-fail={getValidationStatus(result, 'fileType') === 'fail'}
              class:validation-issue={getValidationIssue(result, 'fileType')}
              title={getValidationIssue(result, 'fileType')}
            >
              {result.fileType?.toUpperCase() || 'Unknown'}
            </td>
            <td
              class:validation-pass={getValidationStatus(result, 'sampleRate') === 'pass'}
              class:validation-warning={getValidationStatus(result, 'sampleRate') === 'warning'}
              class:validation-fail={getValidationStatus(result, 'sampleRate') === 'fail'}
              class:validation-issue={getValidationIssue(result, 'sampleRate')}
              title={getValidationIssue(result, 'sampleRate')}
            >
              {formatSampleRate(result.sampleRate)}
            </td>
            <td
              class:validation-pass={getValidationStatus(result, 'bitDepth') === 'pass'}
              class:validation-warning={getValidationStatus(result, 'bitDepth') === 'warning'}
              class:validation-fail={getValidationStatus(result, 'bitDepth') === 'fail'}
              class:validation-issue={getValidationIssue(result, 'bitDepth')}
              title={getValidationIssue(result, 'bitDepth')}
            >
              {formatBitDepth(result.bitDepth)}
            </td>
            <td
              class:validation-pass={getValidationStatus(result, 'channels') === 'pass'}
              class:validation-warning={getValidationStatus(result, 'channels') === 'warning'}
              class:validation-fail={getValidationStatus(result, 'channels') === 'fail'}
              class:validation-issue={getValidationIssue(result, 'channels')}
              title={getValidationIssue(result, 'channels')}
            >
              {formatChannels(result.channels)}
            </td>
            <td
              class:validation-pass={getValidationStatus(result, 'duration') === 'pass'}
              class:validation-warning={getValidationStatus(result, 'duration') === 'warning'}
              class:validation-fail={getValidationStatus(result, 'duration') === 'fail'}
              class:validation-issue={getValidationIssue(result, 'duration')}
              title={getValidationIssue(result, 'duration')}
            >
              {formatDuration(result.duration)}
            </td>
            <td>
              {formatBytes(result.fileSize)}
            </td>
            {#if isSingleFile}
              <td>
                {#if result.audioUrl}
                  <audio controls src={result.audioUrl}></audio>
                {/if}
              </td>
            {/if}
          {/if}
        </tr>
      {/each}
    </tbody>
  </table>
  {/if}
</div>
