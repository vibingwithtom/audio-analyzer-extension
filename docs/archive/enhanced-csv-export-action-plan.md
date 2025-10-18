# Enhanced CSV Export Action Plan - Dynamic Failure Reporting & Recommendations

## Overview
This plan enhances the existing CSV export functionality by adding dynamic failure reporting and actionable recommendations. The enhancement refines the export columns to provide streamlined, user-focused issue reporting that adapts to the current analysis mode and preset criteria.

**Implementation Approach**: User-controlled via settings toggle. When enabled in Settings, the single export button will automatically include failure analysis and recommendations. When disabled, behaves like the standard export.

---

## Phase 0: Settings Infrastructure

### 0.1 Update Settings Types

Update the settings types to include the enhanced export toggle:

```typescript
// File: packages/web/src/settings/types.ts

export interface AppSettings {
  criteria?: AudioCriteria;
  enableEnhancedCSVExport?: boolean; // NEW: Toggle for enhanced export
}

export const STORAGE_KEYS = {
  // ... existing keys
  ENHANCED_CSV_EXPORT: 'audio-analyzer-enhanced-csv-export'
} as const;
```

### 0.2 Create Settings Store

Add a new writable store for the enhanced export setting:

```typescript
// File: packages/web/src/stores/settings.ts (Enhancement)

import { writable } from 'svelte/store';

/**
 * Enhanced CSV Export Setting
 * When enabled, CSV exports include failure analysis and recommendations
 */
export const enableEnhancedCSVExport = writable<boolean>(false);

// Load from localStorage on initialization
if (typeof window !== 'undefined') {
  const saved = localStorage.getItem(STORAGE_KEYS.ENHANCED_CSV_EXPORT);
  if (saved !== null) {
    enableEnhancedCSVExport.set(JSON.parse(saved));
  }
}

// Persist to localStorage whenever setting changes
enableEnhancedCSVExport.subscribe((value) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.ENHANCED_CSV_EXPORT, JSON.stringify(value));

    // Track setting change in analytics
    analyticsService.track('enhanced_csv_export_toggled', {
      enabled: value
    });
  }
});
```

---

## Phase 1: Update Export Utility Core Functions

### 1.1 Enhanced Data Structure

Add new interfaces to support the enhanced export:

```typescript
// File: packages/web/src/utils/export-utils.ts (Enhancement)

export interface FailureAnalysis {
  filenameValidationIssues: string;
  qualityIssues: string;
  failureSummary: string;
  recommendations: string;
  hasFilenameValidation: boolean;
}

export interface EnhancedExportOptions extends ExportOptions {
  includeFilenameValidation: boolean;
  currentPresetCriteria?: AudioCriteria | null;
  analysisMode: 'standard' | 'experimental' | 'metadata-only';
}
```

### 1.2 Recommendation Mapping System

Create a comprehensive recommendation lookup system:

```typescript
// File: packages/web/src/utils/export-utils.ts (Enhancement)

/**
 * Static recommendation templates for different issue types
 */
const RECOMMENDATION_TEMPLATES = {
  // Filename validation issues
  filename: {
    unsupportedChars: "Use only allowed filename characters (letters, numbers, hyphens, underscores).",
    tooLong: "Shorten filename to under 255 characters.",
    invalidFormat: "Use standard filename format without special characters."
  },
  
  // Technical specification issues  
  sampleRate: {
    generic: "Convert file to accepted sample rate.",
    tooLow: "Increase sample rate to meet minimum requirements.",
    tooHigh: "Reduce sample rate to supported value."
  },
  
  bitDepth: {
    generic: "Convert to supported bit depth.",
    tooLow: "Increase bit depth for better quality.",
    unsupported: "Use standard bit depths (16, 24, or 32-bit)."
  },
  
  channels: {
    generic: "Adjust channel configuration.",
    needStereo: "Convert mono file to stereo format.",
    needMono: "Mix stereo file down to mono.",
    tooManyChannels: "Reduce number of audio channels."
  },
  
  fileType: {
    unsupported: "Convert to supported audio format (WAV, FLAC, etc.).",
    compressed: "Use uncompressed format for better quality.",
    generic: "Check file format compatibility."
  },
  
  // Quality/experimental issues
  clipping: {
    minor: "Reduce recording gain slightly to avoid clipping.",
    major: "Significantly reduce input levels and re-record.",
    critical: "Audio severely clipped - re-record with proper gain staging."
  },
  
  noiseFloor: {
    high: "Record in quieter environment or use noise reduction.",
    veryHigh: "Improve recording setup - check microphone and preamp settings.",
    critical: "Recording environment too noisy - find quieter location."
  },
  
  reverb: {
    excessive: "Record in more acoustically treated space.",
    poor: "Improve room acoustics or use closer microphone placement."
  },
  
  silence: {
    leadingExcess: "Trim leading silence to improve user experience.",
    trailingExcess: "Trim trailing silence.",
    gapsExcess: "Edit out long silent gaps in recording."
  },
  
  micBleed: {
    detected: "Improve microphone isolation or use directional microphones.",
    severe: "Increase physical separation between speakers and microphones."
  },
  
  speechOverlap: {
    high: "Encourage better turn-taking in conversations.",
    excessive: "Implement stricter speaking protocols to reduce simultaneous speech."
  }
};

/**
 * Generates context-aware recommendations based on criteria and failure types
 */
function generateDynamicRecommendation(
  issueType: string, 
  subType: string, 
  actualValue: any, 
  criteria: AudioCriteria | null
): string {
  const template = RECOMMENDATION_TEMPLATES[issueType]?.[subType] || 
                  RECOMMENDATION_TEMPLATES[issueType]?.generic;
  
  if (!template) return "Please review file properties.";
  
  // Add criteria-specific context without mentioning preset name
  if (issueType === 'sampleRate' && criteria?.sampleRate?.length) {
    const allowedRates = criteria.sampleRate.join(', ');
    return `${template} Supported rates: ${allowedRates} Hz.`;
  }
  
  if (issueType === 'bitDepth' && criteria?.bitDepth?.length) {
    const allowedDepths = criteria.bitDepth.join(', ');
    return `${template} Supported bit depths: ${allowedDepths}-bit.`;
  }
  
  if (issueType === 'channels' && criteria?.channels?.length) {
    const allowedChannels = criteria.channels.join(' or ');
    return `${template} Required: ${allowedChannels} channel${criteria.channels.length > 1 ? 's' : ''}.`;
  }
  
  if (issueType === 'fileType' && criteria?.fileType?.length) {
    const allowedTypes = criteria.fileType.join(', ');
    return `${template} Supported formats: ${allowedTypes}.`;
  }
  
  return template;
}
```

### 1.3 Enhanced Failure Analysis Function

Create comprehensive failure analysis logic:

```typescript
// File: packages/web/src/utils/export-utils.ts (Enhancement)

/**
 * Analyzes a single AudioResults object and extracts failure information with recommendations
 */
function analyzeFailuresWithRecommendations(
  result: AudioResults, 
  options: EnhancedExportOptions
): FailureAnalysis {
  const analysis: FailureAnalysis = {
    filenameValidationIssues: '',
    qualityIssues: '',
    failureSummary: '',
    recommendations: '',
    hasFilenameValidation: options.includeFilenameValidation
  };

  const issues: string[] = [];
  const recommendations: string[] = [];
  let issueCount = 0;

  // 1. Filename Validation Issues (only if supported by analysis mode)
  if (options.includeFilenameValidation && result.validation?.filename) {
    const filenameValidation = result.validation.filename;
    if (filenameValidation.status === 'fail' || filenameValidation.status === 'warning') {
      analysis.filenameValidationIssues = `filename: ${filenameValidation.issue}`;
      issueCount++;
      
      // Determine recommendation subtype based on issue content
      let subType = 'invalidFormat';
      if (filenameValidation.issue?.includes('characters')) subType = 'unsupportedChars';
      if (filenameValidation.issue?.includes('long')) subType = 'tooLong';
      
      recommendations.push(generateDynamicRecommendation(
        'filename', subType, result.filename, options.currentPresetCriteria
      ));
    }
  }

  // 2. Technical Specification Issues
  const validationIssues: string[] = [];
  
  if (result.validation) {
    Object.entries(result.validation).forEach(([field, validation]) => {
      if (field === 'filename') return; // Already handled above
      
      if (validation.status === 'fail' || validation.status === 'warning') {
        validationIssues.push(`${field}: ${validation.issue}`);
        issueCount++;
        
        // Generate field-specific recommendations
        let subType = 'generic';
        const issue = validation.issue?.toLowerCase() || '';
        
        if (field === 'sampleRate') {
          if (issue.includes('low') || issue.includes('minimum')) subType = 'tooLow';
          if (issue.includes('high') || issue.includes('maximum')) subType = 'tooHigh';
        } else if (field === 'channels') {
          if (issue.includes('mono') || issue.includes('stereo')) {
            subType = result.channels === 1 ? 'needStereo' : 'needMono';
          }
        } else if (field === 'fileType') {
          if (issue.includes('compressed')) subType = 'compressed';
          else subType = 'unsupported';
        }
        
        recommendations.push(generateDynamicRecommendation(
          field, subType, result[field], options.currentPresetCriteria
        ));
      }
    });
  }

  // 3. Quality/Experimental Issues
  const qualityIssues: string[] = [];

  // Clipping Analysis
  if (result.clippingAnalysis?.clippingEventCount > 0) {
    const percentage = result.clippingAnalysis.clippedPercentage;
    const severity = percentage > 5 ? 'critical' : percentage > 1 ? 'major' : 'minor';
    qualityIssues.push(`Clipping: ${percentage.toFixed(2)}% (${severity})`);
    issueCount++;
    recommendations.push(generateDynamicRecommendation('clipping', severity, percentage, null));
  }

  // Noise Floor Analysis
  if (result.noiseFloorDb !== undefined && result.noiseFloorDb > -50) {
    const severity = result.noiseFloorDb > -40 ? 'critical' : 
                    result.noiseFloorDb > -45 ? 'veryHigh' : 'high';
    qualityIssues.push(`High noise floor: ${result.noiseFloorDb.toFixed(1)} dB (${severity})`);
    issueCount++;
    recommendations.push(generateDynamicRecommendation('noiseFloor', severity, result.noiseFloorDb, null));
  }

  // Reverb Analysis
  if (result.reverbInfo?.label && 
      (result.reverbInfo.label.includes('Poor') || result.reverbInfo.time > 1.5)) {
    const severity = result.reverbInfo.time > 2.0 ? 'excessive' : 'poor';
    qualityIssues.push(`${result.reverbInfo.label}: ${result.reverbInfo.time.toFixed(2)}s RT60`);
    issueCount++;
    recommendations.push(generateDynamicRecommendation('reverb', severity, result.reverbInfo.time, null));
  }

  // Silence Analysis
  if (result.leadingSilence !== undefined && result.leadingSilence > 10) {
    qualityIssues.push(`Excessive leading silence: ${result.leadingSilence.toFixed(1)}s`);
    issueCount++;
    recommendations.push(generateDynamicRecommendation('silence', 'leadingExcess', result.leadingSilence, null));
  }

  if (result.trailingSilence !== undefined && result.trailingSilence > 10) {
    qualityIssues.push(`Excessive trailing silence: ${result.trailingSilence.toFixed(1)}s`);
    issueCount++;
    recommendations.push(generateDynamicRecommendation('silence', 'trailingExcess', result.trailingSilence, null));
  }

  if (result.longestSilence !== undefined && result.longestSilence > 15) {
    qualityIssues.push(`Long silent gap: ${result.longestSilence.toFixed(1)}s`);
    issueCount++;
    recommendations.push(generateDynamicRecommendation('silence', 'gapsExcess', result.longestSilence, null));
  }

  // Mic Bleed Analysis
  const micBleedDetected = result.micBleed && (
    (result.micBleed.old?.leftChannelBleedDb > -60 || result.micBleed.old?.rightChannelBleedDb > -60) ||
    (result.micBleed.new?.percentageConfirmedBleed > 0.5)
  );
  if (micBleedDetected) {
    const severity = (result.micBleed.new?.severityScore || 0) > 70 ? 'severe' : 'detected';
    qualityIssues.push(`Mic bleed detected`);
    issueCount++;
    recommendations.push(generateDynamicRecommendation('micBleed', severity, null, null));
  }

  // Speech Overlap Analysis
  if (result.conversationalAnalysis?.overlap?.overlapPercentage > 15) {
    const percentage = result.conversationalAnalysis.overlap.overlapPercentage;
    const severity = percentage > 25 ? 'excessive' : 'high';
    qualityIssues.push(`Speech overlap: ${percentage.toFixed(1)}% (${severity})`);
    issueCount++;
    recommendations.push(generateDynamicRecommendation('speechOverlap', severity, percentage, null));
  }

  // Compile results
  analysis.qualityIssues = qualityIssues.join(' | ');

  // Generate failure summary
  if (issueCount === 0) {
    analysis.failureSummary = 'No issues detected';
  } else {
    const issueTypes: string[] = [];
    const criticalCount = qualityIssues.filter(q => q.includes('critical')).length +
                         validationIssues.filter(v => result.validation && 
                           Object.values(result.validation).some(val => val.status === 'fail')).length;
    const warningCount = issueCount - criticalCount;

    if (criticalCount > 0) issueTypes.push(`${criticalCount} critical`);
    if (warningCount > 0) issueTypes.push(`${warningCount} warning`);

    analysis.failureSummary = issueTypes.length > 0 ? 
      `${issueTypes.join(', ')} issue${issueCount > 1 ? 's' : ''}` :
      `${issueCount} issue${issueCount > 1 ? 's' : ''} detected`;
  }

  // Compile unique recommendations
  analysis.recommendations = Array.from(new Set(recommendations)).join(' ');

  return analysis;
}
```

### 1.4 Updated Header Generation

Modify header generation to support conditional columns:

```typescript
// File: packages/web/src/utils/export-utils.ts (Enhancement)

/**
 * Generates CSV headers for enhanced export with conditional filename validation
 */
function generateEnhancedHeaders(options: EnhancedExportOptions): string[] {
  const baseHeaders = ['Filename', 'Overall Status'];
  
  if (options.mode === 'metadata-only') {
    const headers = [...baseHeaders];
    if (options.includeFilenameValidation) {
      headers.push('Filename Validation Issues');
    }
    headers.push('Failure Summary', 'Recommendations');
    return headers;
  }
  
  if (options.mode === 'standard') {
    const headers = [
      ...baseHeaders,
      'File Type',
      'Sample Rate (Hz)',
      'Bit Depth',
      'Channels', 
      'Duration',
      'File Size (Bytes)'
    ];
    
    if (options.includeFilenameValidation) {
      headers.push('Filename Validation Issues');
    }
    
    headers.push('Quality Issues', 'Failure Summary', 'Recommendations');
    return headers;
  }
  
  // Experimental mode - comprehensive headers
  const headers = [
    'Filename',
    'Overall Status',
    'File Type',
    'Sample Rate (Hz)',
    'Bit Depth', 
    'Channels',
    'Duration (s)',
    'File Size (Bytes)',
    'Peak Level (dB)',
    'Noise Floor (dB)',
    'Normalization Status',
    'Clipping Detected',
    'Clipping Percentage (%)',
    'Reverb RT60 (s)',
    'Leading Silence (s)',
    'Trailing Silence (s)',
    'Longest Silence (s)',
    'Stereo Type',
    'Speech Overlap (%)',
    'Mic Bleed Detected'
  ];

  if (options.includeFilenameValidation) {
    headers.push('Filename Validation Issues');
  }
  
  headers.push('Quality Issues', 'Failure Summary', 'Recommendations');
  return headers;
}
```

### 1.5 Updated Row Extraction

Modify row extraction to include new analysis data:

```typescript
// File: packages/web/src/utils/export-utils.ts (Enhancement)

/**
 * Extracts enhanced data row for a single AudioResults object
 */
function extractEnhancedDataRow(
  result: AudioResults, 
  options: EnhancedExportOptions
): string[] {
  // Perform failure analysis
  const failureAnalysis = analyzeFailuresWithRecommendations(result, options);
  
  const baseRow = [result.filename, result.status];
  
  if (options.mode === 'metadata-only') {
    const row = [...baseRow];
    if (options.includeFilenameValidation) {
      row.push(failureAnalysis.filenameValidationIssues || '');
    }
    row.push(failureAnalysis.failureSummary, failureAnalysis.recommendations);
    return row;
  }
  
  if (options.mode === 'standard') {
    const row = [
      ...baseRow,
      result.fileType || 'Unknown',
      formatNumber(result.sampleRate, 0),
      formatNumber(result.bitDepth, 0),
      formatNumber(result.channels, 0),
      formatDurationSeconds(result.duration),
      formatNumber(result.fileSize, 0)
    ];
    
    if (options.includeFilenameValidation) {
      row.push(failureAnalysis.filenameValidationIssues || '');
    }
    
    row.push(
      failureAnalysis.qualityIssues || '',
      failureAnalysis.failureSummary,
      failureAnalysis.recommendations
    );
    return row;
  }
  
  // Experimental mode - comprehensive data
  const row = [
    result.filename,
    result.status,
    result.fileType || 'Unknown',
    formatNumber(result.sampleRate, 0),
    formatNumber(result.bitDepth, 0),
    formatNumber(result.channels, 0),
    formatNumber(result.duration, 2),
    formatNumber(result.fileSize, 0),
    formatNumber(result.peakDb),
    formatNumber(result.noiseFloorDb),
    result.normalizationStatus?.status || 'N/A',
    result.clippingAnalysis?.clippingEventCount > 0 ? 'Yes' : 'No',
    formatNumber(result.clippingAnalysis?.clippedPercentage),
    formatNumber(result.reverbInfo?.time),
    formatNumber(result.leadingSilence),
    formatNumber(result.trailingSilence),
    formatNumber(result.longestSilence),
    result.stereoSeparation?.stereoType || 'N/A',
    formatNumber(result.conversationalAnalysis?.overlap?.overlapPercentage, 1),
    getMicBleedDetected(result)
  ];

  if (options.includeFilenameValidation) {
    row.push(failureAnalysis.filenameValidationIssues || '');
  }
  
  row.push(
    failureAnalysis.qualityIssues || '',
    failureAnalysis.failureSummary,
    failureAnalysis.recommendations
  );
  
  return row;
}
```

## Phase 2: Update Main Export Function

### 2.1 Enhanced Export Function

Add a new export function alongside the existing `exportResultsToCsv()`. Both will coexist:

```typescript
// File: packages/web/src/utils/export-utils.ts (Enhancement)

/**
 * Enhanced export function with dynamic failure analysis and recommendations
 *
 * Usage: Called when user has enabled enhanced CSV export in settings
 * Maintains same interface as exportResultsToCsv for easy switching
 */
export function exportResultsEnhanced(
  results: AudioResults[],
  options: ExportOptions,
  presetId?: string,
  analysisMode?: string,
  currentPresetCriteria?: AudioCriteria | null,
  filename?: string
): void {
  if (!results || results.length === 0) {
    throw new Error('No results to export');
  }

  try {
    const source = determineSource(results);
    const stats = getExportStats(results);

    // Track export started
    analyticsService.track('csv_export_enhanced_started', {
      totalFiles: results.length,
      exportMode: options.mode,
      analysisMode,
      presetId,
      source,
    });

    // Determine if filename validation should be included
    const includeFilenameValidation = options.mode !== 'metadata-only' &&
      results.some(r => r.validation?.filename);

    const enhancedOptions: EnhancedExportOptions = {
      mode: options.mode,
      includeFilenameValidation,
      currentPresetCriteria: currentPresetCriteria || null,
      analysisMode: options.mode
    };

    // Generate headers
    const headers = generateEnhancedHeaders(enhancedOptions);

    // Generate data rows
    const dataRows = results.map(result => extractEnhancedDataRow(result, enhancedOptions));

    // Escape all values
    const csvHeaders = headers.map(escapeCsvValue).join(',');
    const csvRows = dataRows.map(row =>
      row.map(escapeCsvValue).join(',')
    );

    // Combine into final CSV string
    const csvContent = [csvHeaders, ...csvRows].join('\n');

    // Add BOM for better Excel compatibility
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;

    // Create blob and download
    const blob = new Blob([csvWithBOM], {
      type: 'text/csv;charset=utf-8;'
    });

    const finalFilename = filename || generateFilename('audio_analysis_enhanced');

    // Create download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.href = url;
    link.download = finalFilename;
    link.style.display = 'none';

    // Append, click, and cleanup
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup blob URL after 1 second
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    // Track export completed
    const exportTime = Date.now() - exportStartTime;
    analyticsService.track('csv_export_enhanced_completed', {
      totalFiles: results.length,
      exportMode: options.mode,
      fileSize: blob.size,
      passCount: stats.passCount,
      warnCount: stats.warningCount,
      failCount: stats.failCount,
      errorCount: stats.errorCount,
      exportTime,
      source,
    });

  } catch (error) {
    console.error('Error exporting enhanced CSV:', error);

    // Track export failed
    analyticsService.track('csv_export_enhanced_failed', {
      totalFiles: results.length,
      exportMode: options.mode,
      error: error instanceof Error ? error.message : 'Unknown error',
      source: determineSource(results),
    });

    throw new Error(`Failed to export enhanced CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

## Phase 3: Update UI Integration

### 3.1 Update Export Handler in ResultsDisplay

Modify the existing export handler to use the setting to decide which export function to call:

```typescript
// File: packages/web/src/components/ResultsDisplay.svelte (Enhancement)

<script lang="ts">
  import { exportResultsToCsv, exportResultsEnhanced, type ExportOptions } from '../utils/export-utils';
  import { enableEnhancedCSVExport } from '../stores/settings';
  import { analysisMode } from '../stores/analysisMode';
  import { currentCriteria } from '../stores/settings';

  // Updated export handler - uses setting to decide format
  function handleExport() {
    if (!isBatchMode || batchResults.length === 0) {
      return;
    }

    isExporting = true;
    exportError = null;
    exportSuccess = false;

    try {
      const exportOptions: ExportOptions = {
        mode: $analysisMode === 'filename-only' ? 'metadata-only' :
              $analysisMode === 'experimental' ? 'experimental' : 'standard'
      };

      // Use setting to decide which export format to use
      if ($enableEnhancedCSVExport) {
        exportResultsEnhanced(
          batchResults,
          exportOptions,
          $currentPresetId,
          $analysisMode,
          $currentCriteria
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
```

### 3.2 Optional: Visual Button Indicator

Optionally update the button to show a subtle indicator when enhanced export is enabled:

```svelte
<!-- File: packages/web/src/components/ResultsDisplay.svelte (Optional Enhancement) -->

<button
  class="export-button"
  class:enhanced={$enableEnhancedCSVExport}
  on:click={handleExport}
  disabled={isExporting || batchResults.length === 0}
  title={$enableEnhancedCSVExport
    ? "Export CSV with failure analysis & recommendations (enabled in Settings)"
    : "Export CSV"}
>
  {#if isExporting}
    <span class="loading-spinner"></span>
    Exporting...
  {:else}
    📊 Export CSV{$enableEnhancedCSVExport ? ' ✨' : ''}
  {/if}
</button>
```

Optional CSS for enhanced indicator:

```css
/* File: packages/web/src/components/ResultsDisplay.svelte (Optional) */

.export-button.enhanced {
  background: linear-gradient(135deg, var(--primary, #2563eb) 0%, #3b82f6 100%);
}

.export-button.enhanced:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--primary-dark, #1d4ed8) 0%, #2563eb 100%);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
}
```

### 3.3 Add Setting Toggle to SettingsTab

Add the enhanced export toggle to the Settings UI:

```svelte
<!-- File: packages/web/src/components/SettingsTab.svelte (Addition) -->

<div class="settings-section">
  <h3>CSV Export Options</h3>

  <label class="checkbox-label">
    <input
      type="checkbox"
      bind:checked={$enableEnhancedCSVExport}
    />
    <span class="label-text">
      Include failure analysis & recommendations
      <span class="hint">
        When enabled, CSV exports will include columns for issue summaries and actionable recommendations to fix problems
      </span>
    </span>
  </label>

  <p class="setting-description">
    This setting controls whether the CSV export includes advanced analysis features. When enabled, exports will have additional columns showing detected issues and specific recommendations for resolution.
  </p>
</div>
```

Example CSS for settings:

```css
/* File: packages/web/src/components/SettingsTab.svelte */

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 6px;
  transition: background 0.2s ease;
}

.checkbox-label:hover {
  background: var(--bg-secondary, #f5f5f5);
}

.checkbox-label input[type="checkbox"] {
  margin-top: 0.25rem;
  cursor: pointer;
  accent-color: var(--primary, #2563eb);
}

.label-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.label-text .hint {
  font-size: 0.8125rem;
  color: var(--text-secondary, #666666);
  font-weight: normal;
}

.setting-description {
  margin: 0.5rem 0 0 2.25rem;
  font-size: 0.8125rem;
  color: var(--text-secondary, #666666);
  line-height: 1.4;
}
```

## Phase 4: Testing & Validation

### 4.1 Unit Tests

Create comprehensive tests for the new functionality:

```typescript
// File: packages/web/src/utils/__tests__/export-utils-enhanced.test.ts

import { 
  analyzeFailuresWithRecommendations, 
  generateDynamicRecommendation,
  exportResultsWithEnhancedFailureReporting 
} from '../export-utils';
import type { AudioResults, AudioCriteria } from '../../types';

describe('Enhanced Export Utils', () => {
  describe('generateDynamicRecommendation', () => {
    it('should generate sample rate recommendations with criteria context', () => {
      const criteria: AudioCriteria = { sampleRate: [44100, 48000] };
      const recommendation = generateDynamicRecommendation(
        'sampleRate', 'tooLow', 22050, criteria
      );
      expect(recommendation).toContain('44100, 48000 Hz');
    });

    it('should generate generic recommendations without criteria', () => {
      const recommendation = generateDynamicRecommendation(
        'clipping', 'major', 2.5, null
      );
      expect(recommendation).toBe('Significantly reduce input levels and re-record.');
    });
  });

  describe('analyzeFailuresWithRecommendations', () => {
    it('should detect multiple issues and generate appropriate recommendations', () => {
      const result: AudioResults = {
        filename: 'test_file.wav',
        status: 'fail',
        sampleRate: 22050,
        clippingAnalysis: { clippingEventCount: 5, clippedPercentage: 2.3 },
        noiseFloorDb: -35,
        validation: {
          sampleRate: { status: 'fail', issue: 'Below minimum 44.1kHz', value: '22050' }
        }
      };

      const options = {
        mode: 'experimental' as const,
        includeFilenameValidation: false,
        currentPresetCriteria: { sampleRate: [44100, 48000] },
        analysisMode: 'experimental' as const
      };

      const analysis = analyzeFailuresWithRecommendations(result, options);
      
      expect(analysis.qualityIssues).toContain('Clipping: 2.30% (major)');
      expect(analysis.qualityIssues).toContain('High noise floor: -35.0 dB');
      expect(analysis.recommendations).toContain('reduce input levels');
      expect(analysis.recommendations).toContain('44100, 48000 Hz');
      expect(analysis.failureSummary).toContain('issue');
    });

    it('should handle files with no issues', () => {
      const result: AudioResults = {
        filename: 'clean_file.wav',
        status: 'pass',
        sampleRate: 48000,
        noiseFloorDb: -65,
        clippingAnalysis: { clippingEventCount: 0, clippedPercentage: 0 }
      };

      const options = {
        mode: 'experimental' as const,
        includeFilenameValidation: false,
        currentPresetCriteria: null,
        analysisMode: 'experimental' as const
      };

      const analysis = analyzeFailuresWithRecommendations(result, options);
      
      expect(analysis.failureSummary).toBe('No issues detected');
      expect(analysis.recommendations).toBe('');
      expect(analysis.qualityIssues).toBe('');
    });
  });
});
```

### 4.2 Integration Tests

Test the complete export flow:

```typescript
// File: packages/web/src/utils/__tests__/export-integration.test.ts

describe('Enhanced Export Integration', () => {
  it('should export CSV with enhanced columns for experimental mode', async () => {
    const mockResults: AudioResults[] = [
      {
        filename: 'test1.wav',
        status: 'pass',
        sampleRate: 48000,
        bitDepth: 24,
        channels: 2,
        noiseFloorDb: -65,
        clippingAnalysis: { clippingEventCount: 0, clippedPercentage: 0 }
      },
      {
        filename: 'test2.wav',
        status: 'fail',
        sampleRate: 22050,
        bitDepth: 16,
        channels: 1,
        noiseFloorDb: -35,
        clippingAnalysis: { clippingEventCount: 3, clippedPercentage: 1.5 },
        validation: {
          sampleRate: { status: 'fail', issue: 'Below minimum', value: '22050' },
          channels: { status: 'fail', issue: 'Mono not allowed', value: '1' }
        }
      }
    ];

    // Mock DOM methods
    const mockCreateElement = jest.fn(() => ({
      href: '',
      download: '',
      style: { display: '' },
      click: jest.fn()
    }));
    const mockCreateObjectURL = jest.fn(() => 'mock-url');
    
    global.document.createElement = mockCreateElement;
    global.URL.createObjectURL = mockCreateObjectURL;
    global.document.body.appendChild = jest.fn();
    global.document.body.removeChild = jest.fn();

    const criteria: AudioCriteria = { 
      sampleRate: [44100, 48000], 
      channels: [2] 
    };

    await exportResultsWithEnhancedFailureReporting(
      mockResults,
      'experimental',
      criteria,
      'test-export.csv'
    );

    // Verify blob creation with enhanced content
    const blobCall = mockCreateObjectURL.mock.calls[0][0];
    const csvContent = await blobCall.text();
    
    expect(csvContent).toContain('Quality Issues');
    expect(csvContent).toContain('Failure Summary');
    expect(csvContent).toContain('Recommendations');
    expect(csvContent).toContain('No issues detected');
    expect(csvContent).toContain('Clipping: 1.50% (major)');
    expect(csvContent).toContain('Supported rates: 44100, 48000 Hz');
  });
});
```

## Phase 5: Documentation & Rollout

### 5.1 Update Documentation

Create user-facing documentation:

```markdown
# Enhanced CSV Export Feature

## Overview
The enhanced CSV export provides detailed failure analysis and actionable recommendations for each audio file.

## New Columns
- **Filename Validation Issues**: Shows filename-related problems (when applicable)
- **Quality Issues**: Lists technical quality problems with severity levels
- **Failure Summary**: Provides a quick overview of issue counts and types
- **Recommendations**: Offers specific, actionable steps to resolve detected issues

## Recommendations System
Recommendations are dynamically generated based on:
- Current preset/analysis mode requirements
- Detected validation failures
- Quality metric thresholds
- File-specific issues

Examples:
- "Convert file to accepted sample rate. Supported rates: 44100, 48000 Hz."
- "Reduce recording gain slightly to avoid clipping."
- "Record in quieter environment or use noise reduction."
```

### 5.2 Release Notes

```markdown
## Enhanced CSV Export v2.0

### New Features
- **Dynamic Failure Analysis**: Automatically detects and categorizes issues
- **Actionable Recommendations**: Provides specific steps to resolve problems
- **Context-Aware Suggestions**: Recommendations adapt to current preset requirements
- **Streamlined Issue Reporting**: Simplified failure summary without redundant information

### Improvements
- Conditional filename validation column (only shown when relevant)
- Better organization of technical vs. quality issues
- Excel-optimized formatting and compatibility
- Comprehensive test coverage

### Migration
Existing export functionality remains unchanged. Enhanced export is available as a new option alongside the standard export.
```

## Phase 6: Performance & Optimization

### 6.1 Performance Considerations

```typescript
// File: packages/web/src/utils/export-utils.ts (Optimization)

/**
 * Optimized batch processing for large datasets
 */
export async function exportLargeDatasetWithEnhancedReporting(
  results: AudioResults[],
  analysisMode: 'standard' | 'experimental' | 'metadata-only',
  currentPresetCriteria: AudioCriteria | null,
  chunkSize: number = 1000
): Promise<void> {
  if (results.length <= chunkSize) {
    return exportResultsWithEnhancedFailureReporting(
      results, analysisMode, currentPresetCriteria
    );
  }

  // Process in chunks to avoid blocking UI
  const processChunk = (chunk: AudioResults[], index: number): Promise<string[][]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const options: EnhancedExportOptions = {
          mode: analysisMode,
          includeFilenameValidation: chunk.some(r => r.validation?.filename),
          currentPresetCriteria,
          analysisMode
        };
        
        const rows = chunk.map(result => extractEnhancedDataRow(result, options));
        resolve(rows);
      }, 0);
    });
  };

  // Process all chunks
  const allRows: string[][] = [];
  for (let i = 0; i < results.length; i += chunkSize) {
    const chunk = results.slice(i, i + chunkSize);
    const chunkRows = await processChunk(chunk, i / chunkSize);
    allRows.push(...chunkRows);
  }

  // Generate final CSV
  const options: EnhancedExportOptions = {
    mode: analysisMode,
    includeFilenameValidation: results.some(r => r.validation?.filename),
    currentPresetCriteria,
    analysisMode
  };

  const headers = generateEnhancedHeaders(options);
  const csvHeaders = headers.map(escapeCsvValue).join(',');
  const csvRows = allRows.map(row => row.map(escapeCsvValue).join(','));
  
  const csvContent = [csvHeaders, ...csvRows].join('\n');
  const BOM = '\uFEFF';
  const csvWithBOM = BOM + csvContent;
  
  // Create and download
  const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
  const filename = generateFilename('audio_analysis_enhanced_large');
  
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
```

## Summary

This comprehensive enhancement plan provides:

1. **Enhanced Data Structure**: New interfaces and types for failure analysis
2. **Dynamic Recommendation System**: Context-aware suggestions based on preset criteria
3. **Comprehensive Failure Analysis**: Multi-level issue detection and categorization
4. **Improved User Experience**: Streamlined export with actionable guidance
5. **Settings-Based Control**: User preferences stored in localStorage for easy toggling
6. **Performance Optimization**: Efficient analysis and chunk processing for large datasets
7. **Thorough Testing**: Unit and integration test coverage
8. **Detailed Analytics**: Track usage of enhanced export feature
9. **Documentation**: User guides and migration notes

## Implementation Highlights

**Settings-Based Approach Benefits:**
- Single export button, cleaner UI
- Non-breaking change (defaults to standard export)
- Power users discover enhanced export in settings
- Easy to toggle between formats
- Preferences persist across sessions

**Backward Compatibility:**
- Original `exportResultsToCsv()` function unchanged
- New `exportResultsEnhanced()` function coexists
- Existing exports continue to work exactly as before
- No breaking changes to API or data structures

**Estimated Implementation Time**: 5-6 hours
- Settings infrastructure (Phase 0): 30 min
- Enhanced utility functions (Phase 1): 2 hours
- Updated export function (Phase 2): 1 hour
- UI integration (Phase 3): 1 hour
- Testing & validation (Phase 4): 30-60 min

The enhancement maintains backward compatibility while providing significantly improved value through dynamic failure analysis and actionable user recommendations. Users control whether to use the standard or enhanced format via a Settings toggle.

---

## Integration Overview

### User Flow

```
User in Settings
    ↓
Enable "Include failure analysis & recommendations" toggle
    ↓
Toggle stored in localStorage (persists)
    ↓
User exports CSV from batch results
    ↓
Export handler checks enableEnhancedCSVExport store
    ↓
If enabled: exportResultsEnhanced() called
If disabled: exportResultsToCsv() called (existing behavior)
    ↓
Download appropriate CSV format
```

### File Structure

```
packages/web/src/
├── settings/
│   └── types.ts (add enableEnhancedCSVExport to AppSettings)
├── stores/
│   └── settings.ts (add enableEnhancedCSVExport store)
├── utils/
│   ├── export-utils.ts (enhanced with new functions)
│   └── format-utils.ts (existing, used by both exports)
└── components/
    ├── ResultsDisplay.svelte (updated handleExport)
    └── SettingsTab.svelte (add CSV export settings section)
```

### Data Flow

```
AudioResults[] (from batch analysis)
    ↓
exportResultsEnhanced() or exportResultsToCsv()
    ↓
Determine source (local/Box/Google Drive)
    ↓
Generate appropriate headers
    ↓
For each result: extract data + analyze failures (if enhanced)
    ↓
Generate recommendations (if enhanced)
    ↓
Escape CSV values
    ↓
Create blob with BOM
    ↓
Download to user's computer
```

### Key Integration Points

1. **Settings Store**: Readable/writable boolean that persists preference
2. **Export Handler**: Single decision point based on setting
3. **Utility Functions**: Two parallel implementations (standard & enhanced)
4. **Analytics**: Track which format users prefer over time
5. **Settings UI**: Simple checkbox toggle with helpful description