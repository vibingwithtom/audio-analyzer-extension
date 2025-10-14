<script lang="ts">
  import StatusBadge from './StatusBadge.svelte';
  import { formatSampleRate, formatDuration, formatBitDepth, formatChannels, formatBytes } from '../utils/format-utils';
  import type { AudioResults, ValidationResults } from '../types';

  import { onMount } from 'svelte';

  const {
    results = [],
    mode = 'single',
    metadataOnly = false,
    experimentalMode = false
  }: {
    results?: AudioResults[];
    mode?: 'single' | 'batch';
    metadataOnly?: boolean;
    experimentalMode?: boolean;
  } = $props();

  const isSingleFile = $derived(mode === 'single');

  let tableWrapper: HTMLElement;
  let hasHorizontalScroll = $state(false);

  // Check if table has horizontal scroll
  function checkScroll() {
    if (tableWrapper) {
      hasHorizontalScroll = tableWrapper.scrollWidth > tableWrapper.clientWidth;
    }
  }

  // Check scroll on mount and when results change
  onMount(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  });

  // Recheck scroll when results change
  $effect(() => {
    if (results.length > 0) {
      setTimeout(checkScroll, 100);
    }
  });

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
    if (micBleed.new?.percentageConfirmedBleed < 0.5) return 'success';
    return 'warning';
  }

  function getMicBleedOldClass(micBleed: any): string {
    if (!micBleed?.old) return '';
    // Check if detected using the same logic as the display text
    const isDetected = (micBleed.old.leftChannelBleedDb > -60 || micBleed.old.rightChannelBleedDb > -60);
    if (isDetected) return 'warning';
    return 'success';
  }

  // Unified mic bleed detection using OR logic (either method detects = possible bleed)
  function getUnifiedMicBleedClass(micBleed: any): string {
    if (!micBleed) return '';

    // Check OLD method: > -60 dB means detected
    const oldDetected = micBleed.old &&
      (micBleed.old.leftChannelBleedDb > -60 || micBleed.old.rightChannelBleedDb > -60);

    // Check NEW method: > 0.5% confirmed bleed means detected
    const newDetected = micBleed.new &&
      (micBleed.new.percentageConfirmedBleed > 0.5);

    // OR logic: if either detects, show warning
    if (oldDetected || newDetected) return 'warning';
    return 'success';
  }

  function getUnifiedMicBleedLabel(micBleed: any): string {
    if (!micBleed) return 'N/A';

    // Check OLD method
    const oldDetected = micBleed.old &&
      (micBleed.old.leftChannelBleedDb > -60 || micBleed.old.rightChannelBleedDb > -60);

    // Check NEW method
    const newDetected = micBleed.new &&
      (micBleed.new.percentageConfirmedBleed > 0.5);

    // OR logic
    if (oldDetected || newDetected) return 'Possible bleed';
    return 'Not detected';
  }

  function getNoiseFloorClass(noiseFloorDb: number | undefined): string {
    if (noiseFloorDb === undefined || noiseFloorDb === -Infinity) return '';
    // Excellent/Good: <= -60 dB
    if (noiseFloorDb <= -60) return 'success';
    // Fair: -60 to -50 dB
    if (noiseFloorDb <= -50) return 'warning';
    // Poor: > -50 dB
    return 'error';
  }

  function getSilenceClass(seconds: number | undefined, type: 'lead-trail' | 'max'): string {
    if (seconds === undefined || seconds === null) return '';

    if (type === 'lead-trail') {
      // Leading/Trailing silence thresholds
      if (seconds < 1) return 'success';      // Good: < 1s
      if (seconds <= 3) return 'warning';     // Warning: 1-3s
      return 'error';                         // Issue: > 3s
    } else {
      // Max silence gap thresholds
      if (seconds < 2) return 'success';      // Good: < 2s
      if (seconds <= 5) return 'warning';     // Warning: 2-5s
      return 'error';                         // Issue: > 5s
    }
  }

  function formatTime(seconds: number | undefined): string {
    if (seconds === undefined || seconds === null) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Helper functions for conversational audio analysis
  function getOverlapClass(overlapPercentage: number | undefined): string {
    if (overlapPercentage === undefined) return '';
    if (overlapPercentage < 5) return 'success';      // Good: < 5%
    if (overlapPercentage <= 15) return 'warning';    // Warning: 5-15%
    return 'error';                                    // Issue: > 15%
  }

  function getConsistencyClass(consistencyPercentage: number | undefined): string {
    if (consistencyPercentage === undefined) return '';
    if (consistencyPercentage >= 100) return 'success';     // Perfect: 100%
    if (consistencyPercentage >= 90) return 'warning';      // Warning: 90-99%
    return 'error';                                          // Issue: < 90%
  }

  function getSyncClass(maxDiffMs: number | undefined): string {
    if (maxDiffMs === undefined) return '';
    if (maxDiffMs < 50) return 'success';       // Good: < 50ms
    if (maxDiffMs <= 100) return 'warning';     // Warning: 50-100ms
    return 'error';                              // Issue: > 100ms
  }
</script>

<style>
  .results-container {
    margin-top: 2rem;
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
    position: relative;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  /* Sticky header for experimental table */
  .experimental-table-wrapper thead {
    position: sticky;
    top: 0;
    z-index: 10;
  }

  /* Shadow indicator when there's more content to scroll */
  .experimental-table-wrapper::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 30px;
    background: linear-gradient(to left, rgba(0, 0, 0, 0.1), transparent);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .experimental-table-wrapper.has-scroll::after {
    opacity: 1;
  }

  /* Scroll hint */
  .scroll-hint {
    text-align: center;
    color: var(--text-secondary, #666);
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
    padding: 0.5rem;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(139, 92, 246, 0.1) 100%);
    border: 1px solid rgba(139, 92, 246, 0.2);
    border-radius: 6px;
  }

  .external-link-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: var(--primary, #2563eb);
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-size: 1.25rem;
    font-weight: 500;
    transition: all 0.2s ease;
    cursor: pointer;
  }

  .external-link-btn:hover {
    background: var(--primary-dark, #1d4ed8);
    transform: scale(1.05);
    box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
  }

  .external-link-btn:active {
    transform: scale(0.95);
  }

  .mic-bleed-cell {
    cursor: help;
  }

  .conversational-cell {
    cursor: help;
  }
</style>

<div class="results-container">
  {#if experimentalMode}
    <!-- EXPERIMENTAL MODE TABLE -->
    {#if hasHorizontalScroll}
      <div class="scroll-hint">
        ← Scroll horizontally to see all columns →
      </div>
    {/if}
    <div class="experimental-table-wrapper" class:has-scroll={hasHorizontalScroll} bind:this={tableWrapper}>
      <table class="results-table">
        <thead>
          <tr>
            <th>Filename</th>
            <th>Peak Level</th>
            <th>Normalization</th>
            <th>Noise Floor (Old)</th>
            <th>Noise Floor (New)</th>
            <th>Reverb (RT60)</th>
            <th>Silence</th>
            <th>Stereo Separation</th>
            <th>Speech Overlap</th>
            <th>Channel Consistency</th>
            <th>Channel Sync</th>
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
              <td>
                {#if result.noiseFloorDb !== undefined}
                  <span class="value-{getNoiseFloorClass(result.noiseFloorDb)}">
                    {result.noiseFloorDb === -Infinity ? '-∞' : result.noiseFloorDb.toFixed(1)} dB
                  </span>
                {:else}
                  N/A
                {/if}
              </td>
              <td>
                {#if result.noiseFloorDbHistogram !== undefined}
                  <span class="value-{getNoiseFloorClass(result.noiseFloorDbHistogram)}">
                    {result.noiseFloorDbHistogram === -Infinity ? '-∞' : result.noiseFloorDbHistogram.toFixed(1)} dB
                  </span>
                {:else}
                  N/A
                {/if}
              </td>
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
              <td>
                <div>
                  <span class="subtitle">Lead: <span class="value-{getSilenceClass(result.leadingSilence, 'lead-trail')}">{formatTime(result.leadingSilence)}</span></span>
                  <span class="subtitle">Trail: <span class="value-{getSilenceClass(result.trailingSilence, 'lead-trail')}">{formatTime(result.trailingSilence)}</span></span>
                  <span class="subtitle">Max: <span class="value-{getSilenceClass(result.longestSilence, 'max')}">{formatTime(result.longestSilence)}</span></span>
                </div>
              </td>
              <td>
                {#if result.stereoSeparation}
                  {result.stereoSeparation.stereoType}
                  <span class="subtitle">{Math.round(result.stereoSeparation.stereoConfidence * 100)}% conf</span>
                {:else}
                  Mono file
                {/if}
              </td>
              <!-- Speech Overlap -->
              <td
                class="conversational-cell"
                title={result.conversationalAnalysis?.overlap ? `Detects when both channels have active speech simultaneously. Based on noise floor + 20 dB threshold.` : 'Speech overlap analysis only runs for Conversational Stereo files'}
              >
                {#if result.conversationalAnalysis?.overlap}
                  <span class="value-{getOverlapClass(result.conversationalAnalysis.overlap.overlapPercentage)}">
                    {result.conversationalAnalysis.overlap.overlapPercentage.toFixed(1)}%
                  </span>
                {:else}
                  N/A
                {/if}
              </td>
              <!-- Channel Consistency -->
              <td
                class="conversational-cell"
                title={result.conversationalAnalysis?.consistency ? `Verifies speakers remain in same channels throughout. Detects mid-recording channel swaps.` : 'Channel consistency analysis only runs for Conversational Stereo files'}
              >
                {#if result.conversationalAnalysis?.consistency}
                  {#if result.conversationalAnalysis.consistency.isConsistent}
                    <span class="value-success">Consistent</span>
                  {:else}
                    <span class="value-{getConsistencyClass(result.conversationalAnalysis.consistency.consistencyPercentage)}">
                      Inconsistent ({result.conversationalAnalysis.consistency.consistencyPercentage.toFixed(0)}%)
                    </span>
                  {/if}
                {:else}
                  N/A
                {/if}
              </td>
              <!-- Channel Sync -->
              <td
                class="conversational-cell"
                title={result.conversationalAnalysis?.sync ? `Detects timing misalignment between channels. Start: ${result.conversationalAnalysis.sync.startDiffMs.toFixed(0)}ms, End: ${result.conversationalAnalysis.sync.endDiffMs.toFixed(0)}ms` : 'Channel sync analysis only runs for Conversational Stereo files'}
              >
                {#if result.conversationalAnalysis?.sync}
                  <span class="value-{getSyncClass(result.conversationalAnalysis.sync.maxDiffMs)}">
                    {result.conversationalAnalysis.sync.syncStatus}
                  </span>
                  {#if result.conversationalAnalysis.sync.maxDiffMs > 0}
                    <span class="subtitle">({result.conversationalAnalysis.sync.maxDiffMs.toFixed(0)}ms)</span>
                  {/if}
                {:else}
                  N/A
                {/if}
              </td>
              <td
                class="mic-bleed-cell"
                title={result.micBleed ? (() => {
                  let tooltip = '';
                  if (result.micBleed.old) {
                    tooltip += `Bleed Level: L: ${result.micBleed.old.leftChannelBleedDb === -Infinity ? '-∞' : result.micBleed.old.leftChannelBleedDb.toFixed(1)} dB, R: ${result.micBleed.old.rightChannelBleedDb === -Infinity ? '-∞' : result.micBleed.old.rightChannelBleedDb.toFixed(1)} dB`;
                  }
                  if (result.micBleed.old && result.micBleed.new) {
                    tooltip += '\n';
                  }
                  if (result.micBleed.new) {
                    tooltip += `Channel Separation: Median: ${result.micBleed.new.medianSeparation.toFixed(1)} dB, Worst 10%: ${result.micBleed.new.p10Separation.toFixed(1)} dB`;
                  }
                  return tooltip;
                })() : 'Mic bleed analysis only runs for Conversational Stereo files'}
              >
                {#if result.micBleed}
                  <span class="value-{getUnifiedMicBleedClass(result.micBleed)}">
                    {getUnifiedMicBleedLabel(result.micBleed)}
                  </span>
                {:else}
                  N/A
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
          <th>Play</th>
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
            <td>
              {#if result.audioUrl}
                <audio controls src={result.audioUrl}></audio>
              {:else if result.externalUrl}
                <a href={result.externalUrl} target="_blank" rel="noopener noreferrer" class="external-link-btn" title="View in Box/Google Drive">
                  ▶
                </a>
              {/if}
            </td>
          {/if}
        </tr>
      {/each}
    </tbody>
  </table>
  {/if}
</div>
