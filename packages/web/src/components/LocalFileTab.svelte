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

  // Batch processing state
  let batchResults: AudioResults[] = [];
  let totalFiles = 0;
  let processedFiles = 0;
  let isBatchMode = false;
  let cancelRequested = false;
  let batchFiles: File[] = []; // Store files for reprocessing

  const audioAnalyzer = new AudioAnalyzer();
  const levelAnalyzer = new LevelAnalyzer();

  // Reuse a single AudioContext for performance
  let audioContext: AudioContext | null = null;
  function getAudioContext(): AudioContext {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContext;
  }

  // Cleanup blob URL when component is destroyed
  function cleanup() {
    if (currentAudioUrl) {
      URL.revokeObjectURL(currentAudioUrl);
      currentAudioUrl = null;
    }
  }

  function cleanupAudioContext() {
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
  }

  onDestroy(() => {
    cleanup();
    cleanupAudioContext();
  });

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
      // Basic file analysis
      const basicResults = await audioAnalyzer.analyzeFile(file);

      // Advanced analysis (ONLY in experimental mode)
      let advancedResults = null;
      if ($analysisMode === 'experimental') {
        // Decode audio for advanced analysis
        const ctx = getAudioContext();
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

        // Run level analysis with experimental features
        advancedResults = await levelAnalyzer.analyzeAudioBuffer(audioBuffer, null, true);

        // Add stereo separation analysis
        const stereoSeparation = levelAnalyzer.analyzeStereoSeparation(audioBuffer);
        if (stereoSeparation) {
          advancedResults.stereoSeparation = stereoSeparation;
        }

        // Add mic bleed analysis (only for stereo files)
        const micBleed = levelAnalyzer.analyzeMicBleed(audioBuffer);
        if (micBleed) {
          advancedResults.micBleed = micBleed;
        }
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

        // Add filename validation if the preset supports it (only for filename-only and full modes)
        const currentPreset = availablePresets[$currentPresetId];
        if (currentPreset?.filenameValidationType && (mode === 'filename-only' || mode === 'full')) {
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
    // Basic file analysis
    const basicResults = await audioAnalyzer.analyzeFile(file);

    // Advanced analysis (ONLY in experimental mode)
    let advancedResults = null;
    if ($analysisMode === 'experimental') {
      // Decode audio for advanced analysis
      const ctx = getAudioContext();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      // Run level analysis with experimental features
      advancedResults = await levelAnalyzer.analyzeAudioBuffer(audioBuffer, null, true);

      // Add stereo separation analysis
      const stereoSeparation = levelAnalyzer.analyzeStereoSeparation(audioBuffer);
      if (stereoSeparation) {
        advancedResults.stereoSeparation = stereoSeparation;
      }

      // Add mic bleed analysis (only for stereo files)
      const micBleed = levelAnalyzer.analyzeMicBleed(audioBuffer);
      if (micBleed) {
        advancedResults.micBleed = micBleed;
      }
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

      return {
        ...analysisResults,
        status: overallStatus,
        validation
      };
    } else {
      // No validation - just show results
      return {
        ...analysisResults,
        status: 'pass'
      };
    }
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

  /* Batch Processing Styles */
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

  .batch-summary {
    margin: 1.5rem 0;
    padding: 1.5rem;
    background: var(--bg-secondary, #f5f5f5);
    border: 1px solid var(--bg-tertiary, #e0e0e0);
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .batch-summary h2 {
    margin: 0 0 1.25rem 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-primary, #333333);
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
  }

  .mode-switcher a:hover {
    text-decoration: underline;
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
    multiple={true}
    on:change={handleFileChange}
  />

  <!-- Analysis Mode Selection (only show for non-auditions presets) -->
  {#if !$currentPresetId?.startsWith('auditions-')}
    <div class="analysis-mode-section">
      <h3>Analysis Mode:</h3>
      <div class="radio-group">

        {#if availablePresets[$currentPresetId]?.supportsFilenameValidation}
          <!-- Filename validation presets: Show all 4 options (Audio Only, Filename Only, Full, Experimental) -->
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
          <!-- Non-filename presets: Show 2 options (Audio Analysis, Experimental) -->
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
          ℹ️ <strong>Note:</strong> Three Hour filename validation requires Google Drive tab configuration (Phase 5.7).
        </div>
      {/if}
    </div>
  {/if}

  {#if error}
    <div class="error-message">{error}</div>
  {/if}

  {#if processing}
    {#if isBatchMode && totalFiles > 1}
      <div class="batch-progress-section">
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: {(processedFiles / totalFiles) * 100}%"></div>
        </div>
        <div class="progress-text">
          Processing {processedFiles} of {totalFiles} files... ({Math.round((processedFiles / totalFiles) * 100)}%)
        </div>
        <button class="cancel-button" on:click={handleCancelBatch} disabled={cancelRequested}>
          {cancelRequested ? 'Cancelling...' : '✕ Cancel'}
        </button>
      </div>
    {:else}
      <div class="processing-indicator">Processing file...</div>
    {/if}
  {/if}

  {#if isBatchMode && batchResults.length > 0}
    {#if resultsStale}
      <div class="stale-indicator">
        <span class="stale-indicator-text">
          ⚠️ Results are from {resultsMode === 'full' ? 'Full Analysis' : resultsMode === 'audio-only' ? 'Audio Only' : resultsMode === 'experimental' ? 'Experimental Analysis' : 'Filename Only'} mode
        </span>
        <button
          class="reprocess-button"
          on:click={handleReprocess}
          disabled={processing}
        >
          ⟳ Reprocess Batch with {$analysisMode === 'full' ? 'Full Analysis' : $analysisMode === 'audio-only' ? 'Audio Only' : $analysisMode === 'experimental' ? 'Experimental Analysis' : 'Filename Only'}
        </button>
      </div>
    {/if}

    <!-- Batch Summary and Results -->
    <div class:stale-results-overlay={resultsStale}>
      <div class="batch-summary">
        <h2>Batch Analysis Results</h2>
        <div class="summary-content">
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
            <div class="duration-stat">
              <div class="duration-label">Total Duration (Pass + Warning):</div>
              <div class="duration-value">
                {(() => {
                  // Only count pass and warning files (exclude failed and errors)
                  const total = batchResults
                    .filter(r => r.status === 'pass' || r.status === 'warning')
                    .reduce((sum, r) => sum + (r.duration || 0), 0);
                  const minutes = Math.floor(total / 60);
                  const seconds = Math.floor(total % 60);
                  return `${minutes}m ${seconds}s`;
                })()}
              </div>
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

      <!-- Mode Switcher Hints (only for non-auditions presets) -->
      {#if !$currentPresetId?.startsWith('auditions-')}
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
  {:else if results}
    <!-- Single File Results -->
    {#if resultsStale}
      <div class="stale-indicator">
        <span class="stale-indicator-text">
          ⚠️ Results are from {resultsMode === 'full' ? 'Full Analysis' : resultsMode === 'audio-only' ? 'Audio Only' : resultsMode === 'experimental' ? 'Experimental Analysis' : 'Filename Only'} mode
        </span>
        <button
          class="reprocess-button"
          on:click={handleReprocess}
          disabled={processing}
        >
          ⟳ Reprocess with {$analysisMode === 'full' ? 'Full Analysis' : $analysisMode === 'audio-only' ? 'Audio Only' : $analysisMode === 'experimental' ? 'Experimental Analysis' : 'Filename Only'}
        </button>
      </div>
    {/if}

    <div class:stale-results-overlay={resultsStale}>
      <ResultsTable
        results={[results]}
        mode="single"
        metadataOnly={$analysisMode === 'filename-only'}
        experimentalMode={$analysisMode === 'experimental'}
      />

      <!-- Mode Switcher Hints (only for non-auditions presets) -->
      {#if !$currentPresetId?.startsWith('auditions-')}
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
