<script lang="ts">
  import ResultsTable from './ResultsTable.svelte';
  import { analysisMode, setAnalysisMode, type AnalysisMode } from '../stores/analysisMode';
  import { currentPresetId, currentCriteria, selectedPreset, enableIncludeFailureAnalysis, enableIncludeRecommendations } from '../stores/settings';
  import { isSimplifiedMode } from '../stores/simplifiedMode';
  import type { AudioResults } from '../types';
  import { exportResultsToCsv, exportResultsEnhanced, type ExportOptions } from '../utils/export-utils';

  // Props
  export let results: AudioResults | AudioResults[] | null = null;
  export let isProcessing = false;
  export let error: string | null = null;
  export let resultsMode: AnalysisMode | null = null;
  export let resultsStale = false;
  export let processedFiles = 0;
  export let totalFiles = 0;
  export let onReprocess: (() => void) | null = null;
  export let onCancel: (() => void) | null = null;
  export let cancelRequested = false;
  export let folderName: string | null = null; // Name of folder being processed
  export let folderUrl: string | null = null; // URL of folder being processed
  export let showBuiltInProgress = true; // Controls whether to show the built-in progress bar

  // Determine if we're in batch mode
  $: isBatchMode = Array.isArray(results);
  $: batchResults = isBatchMode ? results as AudioResults[] : [];
  $: singleResult = !isBatchMode && results ? results as AudioResults : null;

  // Helper function to get experimental metric status
  function getExperimentalStatus(result: AudioResults): 'pass' | 'warning' | 'fail' | 'error' {
    const statuses: string[] = [];

    // Check normalization
    if (result.normalizationStatus) {
      statuses.push(result.normalizationStatus.status === 'normalized' ? 'success' : 'warning');
    }

    // Check noise floor
    if (result.noiseFloorDb !== undefined && result.noiseFloorDb !== -Infinity) {
      if (result.noiseFloorDb <= -60) statuses.push('success');
      else if (result.noiseFloorDb <= -50) statuses.push('warning');
      else statuses.push('error');
    }

    // Check reverb
    if (result.reverbInfo?.label) {
      if (result.reverbInfo.label.includes('Excellent') || result.reverbInfo.label.includes('Good')) {
        statuses.push('success');
      } else if (result.reverbInfo.label.includes('Fair')) {
        statuses.push('warning');
      } else {
        statuses.push('error');
      }
    }

    // Check silence metrics
    if (result.leadingSilence !== undefined) {
      if (result.leadingSilence < 1) statuses.push('success');
      else if (result.leadingSilence <= 3) statuses.push('warning');
      else statuses.push('error');
    }
    if (result.trailingSilence !== undefined) {
      if (result.trailingSilence < 1) statuses.push('success');
      else if (result.trailingSilence <= 3) statuses.push('warning');
      else statuses.push('error');
    }
    if (result.longestSilence !== undefined) {
      if (result.longestSilence < 2) statuses.push('success');
      else if (result.longestSilence <= 5) statuses.push('warning');
      else statuses.push('error');
    }

    // Check mic bleed
    if (result.micBleed) {
      const oldDetected = result.micBleed.old &&
        (result.micBleed.old.leftChannelBleedDb > -60 || result.micBleed.old.rightChannelBleedDb > -60);
      const newDetected = result.micBleed.new &&
        (result.micBleed.new.percentageConfirmedBleed > 0.5);

      if (oldDetected || newDetected) {
        statuses.push('warning');
      } else {
        statuses.push('success');
      }
    }

    // Check clipping analysis
    if (result.clippingAnalysis) {
      const { clippedPercentage, clippingEventCount, nearClippingPercentage } = result.clippingAnalysis;

      // Hard clipping > 1% OR > 50 events → error
      if (clippedPercentage > 1 || clippingEventCount > 50) {
        statuses.push('error');
      }
      // Hard clipping 0.1-1% OR 10-50 events → warning
      else if (clippedPercentage > 0.1 || clippingEventCount > 10) {
        statuses.push('warning');
      }
      // Any hard clipping → warning
      else if (clippedPercentage > 0 && clippingEventCount > 0) {
        statuses.push('warning');
      }
      // Near clipping > 1% → warning
      else if (nearClippingPercentage > 1) {
        statuses.push('warning');
      }
      // All clear
      else {
        statuses.push('success');
      }
    }

    // Check conversational audio metrics (only for conversational stereo)
    if (result.conversationalAnalysis) {
      // Check speech overlap
      if (result.conversationalAnalysis.overlap) {
        const overlapPct = result.conversationalAnalysis.overlap.overlapPercentage;
        if (overlapPct < 5) statuses.push('success');
        else if (overlapPct <= 15) statuses.push('warning');
        else statuses.push('error');
      }

      // Check channel consistency
      if (result.conversationalAnalysis.consistency) {
        const consistencyPct = result.conversationalAnalysis.consistency.consistencyPercentage;
        if (consistencyPct >= 100) statuses.push('success');
        else if (consistencyPct >= 90) statuses.push('warning');
        else statuses.push('error');
      }
    }

    // Determine worst status
    if (statuses.includes('error')) return 'fail';
    if (statuses.includes('warning')) return 'warning';
    return 'pass';
  }

  // Calculate batch statistics
  $: passCount = $analysisMode === 'experimental'
    ? batchResults.filter(r => r.status !== 'error' && getExperimentalStatus(r) === 'pass').length
    : batchResults.filter(r => r.status === 'pass').length;

  $: warningCount = $analysisMode === 'experimental'
    ? batchResults.filter(r => r.status !== 'error' && getExperimentalStatus(r) === 'warning').length
    : batchResults.filter(r => r.status === 'warning').length;

  $: failCount = $analysisMode === 'experimental'
    ? batchResults.filter(r => r.status !== 'error' && getExperimentalStatus(r) === 'fail').length
    : batchResults.filter(r => r.status === 'fail').length;

  $: errorCount = batchResults.filter(r => r.status === 'error').length;

  // Calculate total duration (not shown in experimental mode)
  $: totalDuration = (() => {
    if (!isBatchMode || $analysisMode === 'filename-only' || $analysisMode === 'experimental') return null;

    // Only for pass+warning files in standard modes
    const filesToInclude = batchResults.filter(r => r.status === 'pass' || r.status === 'warning');
    const total = filesToInclude.reduce((sum, r) => sum + (r.duration || 0), 0);

    const minutes = Math.floor(total / 60);
    const seconds = Math.floor(total % 60);
    return `${minutes}m ${seconds}s`;
  })();

  // Format results mode for display
  function formatResultsMode(mode: AnalysisMode | null): string {
    if (!mode) return 'Unknown';
    switch (mode) {
      case 'full': return 'Full Analysis';
      case 'audio-only': return 'Audio Only';
      case 'experimental': return 'Experimental Analysis';
      case 'filename-only': return 'Filename Only';
      default: return mode;
    }
  }

  function formatAnalysisMode(mode: AnalysisMode): string {
    switch (mode) {
      case 'full': return 'Full Analysis';
      case 'audio-only': return 'Audio Only';
      case 'experimental': return 'Experimental Analysis';
      case 'filename-only': return 'Filename Only';
      default: return mode;
    }
  }

  // Export state
  let isExporting = false;
  let exportError: string | null = null;
  let exportSuccess = false;

  // Export handler
  function handleExport() {
    if (!isBatchMode || batchResults.length === 0) {
      return;
    }

    isExporting = true;
    exportError = null;
    exportSuccess = false;

    try {
      // Handle all 4 analysis modes correctly
      const exportOptions: ExportOptions = {
        mode: $analysisMode === 'filename-only' ? 'metadata-only' :
              $analysisMode === 'experimental' ? 'experimental' : 'standard'
              // 'full' and 'audio-only' both map to 'standard'
      };

      // Use enhanced export if either failure analysis or recommendations is enabled
      const useEnhancedExport = $enableIncludeFailureAnalysis || $enableIncludeRecommendations;

      if (useEnhancedExport) {
        // Add export options for failure analysis and recommendations
        const exportOpts = {
          ...exportOptions,
          includeFailureAnalysis: $enableIncludeFailureAnalysis,
          includeRecommendations: $enableIncludeRecommendations
        };

        exportResultsEnhanced(
          batchResults,
          exportOpts,
          $currentPresetId,
          $analysisMode,
          $currentCriteria,
          undefined, // filename - use default
          $selectedPreset
        );
      } else {
        exportResultsToCsv(
          batchResults,
          exportOptions,
          $currentPresetId,
          $analysisMode
        );
      }

      // Show success feedback
      exportSuccess = true;
      setTimeout(() => {
        exportSuccess = false;
      }, 3000);

    } catch (error) {
      exportError = error instanceof Error ? error.message : 'Export failed';
      console.error('Export failed:', error);
    } finally {
      isExporting = false;
    }
  }
</script>

<style>
  .results-display {
    margin-top: 1rem;
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

  /* Batch Progress Styles */
  .batch-progress-section {
    margin: 1.5rem 0;
    padding: 1.25rem;
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.05) 0%, rgba(76, 175, 80, 0.1) 100%);
    border: 1px solid rgba(76, 175, 80, 0.2);
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .progress-bar-container {
    width: 100%;
    height: 24px;
    background: var(--bg-tertiary, #e0e0e0);
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 0.75rem;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--success, #4CAF50) 0%, #66BB6A 100%);
    transition: width 0.3s ease;
    border-radius: 12px;
  }

  .progress-text {
    text-align: center;
    font-weight: 500;
    color: var(--success, #4CAF50);
    font-size: 0.95rem;
    margin-bottom: 0.75rem;
  }

  .cancel-button {
    display: block;
    margin: 0 auto;
    padding: 0.5rem 1.25rem;
    background: var(--danger, #f44336);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .cancel-button:hover:not(:disabled) {
    background: #d32f2f;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(244, 67, 54, 0.3);
  }

  .cancel-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  /* Stale Results Indicator */
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

  :global([data-theme="dark"]) .stale-results-overlay::after {
    background: rgba(15, 23, 42, 0.7);
  }

  /* Batch Summary Styles */
  .batch-summary {
    margin: 1.5rem 0;
    padding: 1.5rem;
    background: var(--bg-secondary, #f5f5f5);
    border: 1px solid var(--bg-tertiary, #e0e0e0);
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .batch-header {
    display: flex;
    flex-direction: column;
    margin-bottom: 1.25rem;
  }

  .batch-summary h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-primary, #333333);
  }

  .folder-name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    color: var(--text-secondary, #666666);
  }

  .folder-name .folder-icon {
    font-size: 1rem;
  }

  .folder-link {
    color: var(--primary, #2563eb);
    text-decoration: none;
    transition: all 0.2s ease;
    font-weight: 500;
  }

  .folder-link:hover {
    text-decoration: underline;
    color: var(--primary-dark, #1d4ed8);
  }

  .summary-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
    flex-wrap: wrap;
  }

  .summary-stats {
    display: flex;
    gap: 0;
    flex: 1;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0;
    min-width: 80px;
  }

  .stat-value {
    font-size: 2.5rem;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 0.25rem;
  }

  .stat-label {
    font-size: 0.875rem;
    color: var(--text-secondary, #666666);
    font-weight: 500;
  }

  .stat.pass .stat-value {
    color: var(--success, #4CAF50);
  }

  .stat.warning .stat-value {
    color: var(--warning, #ff9800);
  }

  .stat.fail .stat-value {
    color: var(--danger, #f44336);
  }

  .stat.error .stat-value {
    color: var(--danger, #f44336);
  }

  .duration-stat {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    min-width: 200px;
  }

  .duration-label {
    font-size: 0.875rem;
    color: var(--text-secondary, #666666);
    font-weight: 500;
    margin-bottom: 0.5rem;
  }

  .duration-value {
    font-size: 2rem;
    font-weight: 700;
    color: var(--primary, #2563eb);
    line-height: 1;
  }

  /* Mode Switcher Hints */
  .mode-switcher {
    margin: 1rem 0;
    padding: 1rem;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(139, 92, 246, 0.1) 100%);
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 6px;
    text-align: center;
    font-size: 0.875rem;
    color: var(--text-secondary, #666);
  }

  .mode-switcher a {
    color: #7c3aed;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
  }

  .mode-switcher a:hover {
    text-decoration: underline;
  }

  /* Export Button Styles */
  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
  }

  .export-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
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

  .export-button:hover:not(:disabled) {
    background: var(--primary-dark, #1d4ed8);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);
  }

  .export-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .loading-spinner {
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .export-error {
    padding: 0.5rem;
    background: rgba(244, 67, 54, 0.1);
    border: 1px solid rgba(244, 67, 54, 0.3);
    color: var(--danger, #f44336);
    border-radius: 4px;
    font-size: 0.875rem;
    margin-top: 0.5rem;
  }

  .export-success {
    padding: 0.5rem;
    background: rgba(76, 175, 80, 0.1);
    border: 1px solid rgba(76, 175, 80, 0.3);
    color: var(--success, #4CAF50);
    border-radius: 4px;
    font-size: 0.875rem;
    margin-top: 0.5rem;
  }
</style>

<div class="results-display">
  <!-- Error Message -->
  {#if error}
    <div class="error-message">{error}</div>
  {/if}

  <!-- Processing Indicator (only show if showBuiltInProgress is true) -->
  {#if isProcessing && showBuiltInProgress}
    {#if isBatchMode && totalFiles > 1}
      <div class="batch-progress-section">
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: {(processedFiles / totalFiles) * 100}%"></div>
        </div>
        <div class="progress-text">
          Processing {processedFiles} of {totalFiles} files... ({Math.round((processedFiles / totalFiles) * 100)}%)
        </div>
        {#if onCancel}
          <button class="cancel-button" on:click={onCancel} disabled={cancelRequested}>
            {cancelRequested ? 'Cancelling...' : '✕ Cancel'}
          </button>
        {/if}
      </div>
    {:else}
      <div class="processing-indicator">Processing file...</div>
    {/if}
  {/if}

  <!-- Batch Mode Results -->
  {#if isBatchMode && batchResults.length > 0}
    <!-- Stale Results Indicator -->
    {#if resultsStale && onReprocess}
      <div class="stale-indicator">
        <span class="stale-indicator-text">
          ⚠️ Results are from {formatResultsMode(resultsMode)} mode
        </span>
        <button
          class="reprocess-button"
          on:click={onReprocess}
          disabled={isProcessing}
        >
          ⟳ Reprocess Batch with {formatAnalysisMode($analysisMode)}
        </button>
      </div>
    {/if}

    <!-- Batch Summary and Results -->
    <div class:stale-results-overlay={resultsStale}>
      <div class="batch-summary">
        <div class="batch-header">
          <div class="header-top">
            <h2>Batch Analysis Results</h2>
            <div class="header-actions">
              <button
                class="export-button"
                on:click={handleExport}
                disabled={isExporting || batchResults.length === 0 || isProcessing}
                title="Export results to CSV file"
              >
                {#if isExporting}
                  <span class="loading-spinner"></span>
                  Exporting...
                {:else}
                  📊 Export CSV
                {/if}
              </button>
            </div>
          </div>
          {#if folderName}
            <div class="folder-name">
              <span class="folder-icon">📁</span>
              {#if folderUrl}
                <a href={folderUrl} target="_blank" rel="noopener noreferrer" class="folder-link">{folderName}</a>
              {:else}
                <span>{folderName}</span>
              {/if}
            </div>
          {/if}
          {#if exportError}
            <div class="export-error">
              ❌ Failed to export: {exportError}
            </div>
          {/if}
          {#if exportSuccess}
            <div class="export-success">
              ✓ CSV file downloaded successfully
            </div>
          {/if}
        </div>
        <div class="summary-content">
          <div class="summary-stats">
            <div class="stat pass">
              <div class="stat-value">{passCount}</div>
              <div class="stat-label">Pass</div>
            </div>
            <div class="stat warning">
              <div class="stat-value">{warningCount}</div>
              <div class="stat-label">Warnings</div>
            </div>
            <div class="stat fail">
              <div class="stat-value">{failCount}</div>
              <div class="stat-label">Failed</div>
            </div>
            <div class="stat error">
              <div class="stat-value">{errorCount}</div>
              <div class="stat-label">Errors</div>
            </div>
          </div>
          {#if totalDuration}
            <div class="duration-stat">
              <div class="duration-label">Total Duration (Pass + Warning):</div>
              <div class="duration-value">{totalDuration}</div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Batch Results Table -->
      <ResultsTable
        results={batchResults}
        mode="batch"
        metadataOnly={$analysisMode === 'filename-only'}
        experimentalMode={$analysisMode === 'experimental'}
      />

      <!-- Mode Switcher Hints (only for non-auditions presets and not in simplified mode) -->
      {#if !$currentPresetId?.startsWith('auditions-') && !$isSimplifiedMode}
        {#if $analysisMode === 'experimental'}
          <div class="mode-switcher">
            💡 Want to see basic file properties? Switch to
            <a href="#" on:click|preventDefault={() => setAnalysisMode('audio-only')}>
              Audio Analysis
            </a> mode
          </div>
        {:else if $analysisMode === 'audio-only'}
          <div class="mode-switcher">
            💡 Want to check reverb, noise floor, or silence issues? Switch to
            <a href="#" on:click|preventDefault={() => setAnalysisMode('experimental')}>
              Experimental Analysis
            </a> mode
          </div>
        {/if}
      {/if}
    </div>

  <!-- Single File Mode Results -->
  {:else if singleResult}
    <!-- Stale Results Indicator -->
    {#if resultsStale && onReprocess}
      <div class="stale-indicator">
        <span class="stale-indicator-text">
          ⚠️ Results are from {formatResultsMode(resultsMode)} mode
        </span>
        <button
          class="reprocess-button"
          on:click={onReprocess}
          disabled={isProcessing}
        >
          ⟳ Reprocess with {formatAnalysisMode($analysisMode)}
        </button>
      </div>
    {/if}

    <div class:stale-results-overlay={resultsStale}>
      <ResultsTable
        results={[singleResult]}
        mode="single"
        metadataOnly={$analysisMode === 'filename-only'}
        experimentalMode={$analysisMode === 'experimental'}
      />

      <!-- Mode Switcher Hints (only for non-auditions presets and not in simplified mode) -->
      {#if !$currentPresetId?.startsWith('auditions-') && !$isSimplifiedMode}
        {#if $analysisMode === 'experimental'}
          <div class="mode-switcher">
            💡 Want to see basic file properties? Switch to
            <a href="#" on:click|preventDefault={() => setAnalysisMode('audio-only')}>
              Audio Analysis
            </a> mode
          </div>
        {:else if $analysisMode === 'audio-only'}
          <div class="mode-switcher">
            💡 Want to check reverb, noise floor, or silence issues? Switch to
            <a href="#" on:click|preventDefault={() => setAnalysisMode('experimental')}>
              Experimental Analysis
            </a> mode
          </div>
        {/if}
      {/if}
    </div>
  {/if}
</div>
