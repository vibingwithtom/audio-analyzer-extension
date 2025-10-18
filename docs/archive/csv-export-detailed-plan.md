# Detailed CSV Export Implementation Plan (REVISED)

## Overview
This plan provides detailed code recommendations for implementing CSV export functionality in the audio-analyzer project. It has been reviewed and updated to fix critical issues and follow project standards.

## Critical Requirements

### Feature Branch Workflow (REQUIRED)
Per CLAUDE.md guidelines:
- **NEVER push directly to main**
- All work must be done in feature branch
- CI must pass before merging
- Beta deployment for manual testing before PR

### Type Safety
- Update AudioResults type definitions to fix TypeScript errors
- All 768 tests must pass
- `npm run typecheck` must pass

### Analytics Tracking
- Track export started, completed, and failed events
- Follow existing Umami analytics patterns
- Include detailed properties for analysis

---

## Phase 0: Setup & Type Definitions (10 minutes)

### 1. Create Feature Branch
```bash
git checkout -b feature/csv-export
```

### 2. Update Type Definitions

Update `/packages/web/src/types/index.ts` to add missing properties:

```typescript
export interface ClippingAnalysis {
  clippedPercentage: number;
  clippingEventCount: number;
  nearClippingPercentage: number;
}

export interface ConversationalAnalysis {
  overlap?: {
    overlapPercentage: number;
  };
  consistency?: {
    consistencyPercentage: number;
  };
}

export interface AudioResults {
  filename: string;
  status: 'pass' | 'fail' | 'warning' | 'error';
  fileType?: string;
  sampleRate: number | 'Unknown';
  bitDepth: number | 'Unknown';
  channels: number | 'Unknown';
  duration: number | 'Unknown';
  fileSize: number;
  audioUrl?: string;
  externalUrl?: string;
  validation?: ValidationResults;
  isMetadataOnly?: boolean;

  // Experimental analysis properties (properly typed)
  peakDb?: number;
  noiseFloor?: number;
  noiseFloorDb?: number;
  reverbInfo?: any;
  silenceInfo?: any;
  normalizationStatus?: any;
  stereoSeparation?: any;
  micBleed?: any;

  // Add missing properties for CSV export
  clippingAnalysis?: ClippingAnalysis;
  conversationalAnalysis?: ConversationalAnalysis;
  leadingSilence?: number;
  trailingSilence?: number;
  longestSilence?: number;
  digitalSilencePercentage?: number;
}
```

---

## Phase 1: Create Export Utility (1-2 hours)

### File Location
Create `packages/web/src/utils/export-utils.ts`

### Core Implementation

```typescript
import type { AudioResults } from '../types';
import { analyticsService } from '../services/analytics-service';

export interface ExportOptions {
  mode: 'standard' | 'experimental' | 'metadata-only';
  includeTimestamps?: boolean;
  dateFormat?: 'iso' | 'locale';
}

/**
 * Escapes CSV values that contain commas, quotes, or newlines
 */
function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // If the value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Formats numeric values with consistent precision
 * Fixed: -Infinity returns 'N/A' for better compatibility
 */
function formatNumber(value: number | 'Unknown' | undefined, precision: number = 2): string {
  if (value === undefined || value === null || value === 'Unknown') {
    return 'N/A';
  }

  if (value === -Infinity) {
    return 'N/A';  // Changed from '-∞' for Excel compatibility
  }

  if (typeof value === 'number') {
    return value.toFixed(precision);
  }

  return String(value);
}

/**
 * Formats duration in seconds to "Xm Ys" format (matches existing app format)
 */
function formatDuration(seconds: number | 'Unknown' | undefined): string {
  if (seconds === undefined || seconds === null || seconds === 'Unknown') {
    return 'N/A';
  }

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s`;
}

/**
 * Generates CSV headers based on export mode
 */
function generateHeaders(mode: ExportOptions['mode']): string[] {
  const baseHeaders = ['Filename', 'Status'];

  if (mode === 'metadata-only') {
    return [...baseHeaders, 'Error Details'];
  }

  if (mode === 'standard') {
    return [
      ...baseHeaders,
      'File Type',
      'Sample Rate (Hz)',
      'Bit Depth',
      'Channels',
      'Duration',
      'File Size (Bytes)',
      'Has Audio URL',
      'Has External URL'
    ];
  }

  // Experimental mode - comprehensive data
  return [
    'Filename',
    'Status',
    'File Type',
    'Sample Rate (Hz)',
    'Bit Depth',
    'Channels',
    'Duration',
    'File Size (Bytes)',
    'Peak Level (dB)',
    'Noise Floor (dB)',
    'Normalization Status',
    'Normalization Peak (dB)',
    'Normalization Target (dB)',
    'Clipping Detected',
    'Clipping Percentage (%)',
    'Clipping Events',
    'Near Clipping Percentage (%)',
    'Reverb RT60 (s)',
    'Reverb Label',
    'Leading Silence (s)',
    'Trailing Silence (s)',
    'Longest Silence (s)',
    'Stereo Type',
    'Stereo Confidence (%)',
    'Speech Overlap (%)',
    'Channel Consistency (%)',
    'Mic Bleed Detected',
    'Mic Bleed Severity',
    'Digital Silence (%)'
  ];
}

/**
 * Extracts data row for a single AudioResults object
 */
function extractDataRow(result: AudioResults, mode: ExportOptions['mode']): string[] {
  const baseRow = [
    result.filename,
    result.status
  ];

  if (mode === 'metadata-only') {
    // Extract validation issues for metadata-only mode
    const validationIssues: string[] = [];
    if (result.validation) {
      Object.entries(result.validation).forEach(([field, validation]) => {
        if (validation.issue) {
          validationIssues.push(`${field}: ${validation.issue}`);
        }
      });
    }
    return [...baseRow, validationIssues.join('; ') || '—'];
  }

  if (mode === 'standard') {
    return [
      ...baseRow,
      result.fileType || 'Unknown',
      formatNumber(result.sampleRate, 0),
      formatNumber(result.bitDepth, 0),
      formatNumber(result.channels, 0),
      formatDuration(result.duration),
      formatNumber(result.fileSize, 0),
      result.audioUrl ? 'Yes' : 'No',
      result.externalUrl ? 'Yes' : 'No'
    ];
  }

  // Experimental mode - comprehensive data extraction
  return [
    result.filename,
    result.status,
    result.fileType || 'Unknown',
    formatNumber(result.sampleRate, 0),
    formatNumber(result.bitDepth, 0),
    formatNumber(result.channels, 0),
    formatDuration(result.duration),
    formatNumber(result.fileSize, 0),
    formatNumber(result.peakDb),
    formatNumber(result.noiseFloorDb),
    result.normalizationStatus?.status || 'N/A',
    formatNumber(result.normalizationStatus?.peakDb),
    formatNumber(result.normalizationStatus?.targetDb),
    result.clippingAnalysis?.clippingEventCount > 0 ? 'Yes' : 'No',
    formatNumber(result.clippingAnalysis?.clippedPercentage),
    formatNumber(result.clippingAnalysis?.clippingEventCount, 0),
    formatNumber(result.clippingAnalysis?.nearClippingPercentage),
    formatNumber(result.reverbInfo?.time),
    result.reverbInfo?.label || 'N/A',
    formatNumber(result.leadingSilence),
    formatNumber(result.trailingSilence),
    formatNumber(result.longestSilence),
    result.stereoSeparation?.stereoType || 'N/A',
    formatNumber(result.stereoSeparation?.stereoConfidence ? result.stereoSeparation.stereoConfidence * 100 : undefined, 1),
    formatNumber(result.conversationalAnalysis?.overlap?.overlapPercentage, 1),
    formatNumber(result.conversationalAnalysis?.consistency?.consistencyPercentage, 1),
    getMicBleedDetected(result),
    formatNumber(result.micBleed?.new?.severityScore, 1),
    formatNumber(result.digitalSilencePercentage, 1)
  ];
}

/**
 * Helper to determine mic bleed detection status
 */
function getMicBleedDetected(result: AudioResults): string {
  if (!result.micBleed) return 'N/A';

  const oldDetected = result.micBleed.old &&
    (result.micBleed.old.leftChannelBleedDb > -60 || result.micBleed.old.rightChannelBleedDb > -60);
  const newDetected = result.micBleed.new &&
    (result.micBleed.new.percentageConfirmedBleed > 0.5);

  if (oldDetected || newDetected) return 'Yes';
  return 'No';
}

/**
 * Determines the source of the results (for analytics)
 */
function determineSource(results: AudioResults[]): 'local' | 'box' | 'google-drive' | 'unknown' {
  if (!results || results.length === 0) return 'unknown';

  const firstResult = results[0];
  if (firstResult.externalUrl?.includes('box.com')) return 'box';
  if (firstResult.externalUrl?.includes('drive.google.com')) return 'google-drive';
  if (firstResult.audioUrl) return 'local'; // Blob URLs are local files

  return 'unknown';
}

/**
 * Generates filename with timestamp
 */
function generateFilename(baseName: string = 'audio_analysis_results'): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${baseName}_${timestamp}.csv`;
}

/**
 * Main export function
 * Note: NOT async - synchronous operation
 */
export function exportResultsToCsv(
  results: AudioResults[],
  options: ExportOptions,
  presetId?: string,
  analysisMode?: string,
  filename?: string
): void {
  const exportStartTime = Date.now();

  if (!results) {
    throw new Error('Results are null');
  }

  if (results.length === 0) {
    throw new Error('No results available to export');
  }

  try {
    const source = determineSource(results);
    const stats = getExportStats(results);

    // Track export started
    analyticsService.track('csv_export_started', {
      totalFiles: results.length,
      exportMode: options.mode,
      analysisMode,
      presetId,
      source,
    });

    // Generate headers
    const headers = generateHeaders(options.mode);

    // Generate data rows
    const dataRows = results.map(result => extractDataRow(result, options.mode));

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

    const finalFilename = filename || generateFilename();

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

    // Cleanup blob URL after 1 second (safer for slow browsers)
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    // Track export completed
    const exportTime = Date.now() - exportStartTime;
    analyticsService.track('csv_export_completed', {
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
    console.error('Error exporting CSV:', error);

    // Track export failed
    analyticsService.track('csv_export_failed', {
      totalFiles: results.length,
      exportMode: options.mode,
      error: error instanceof Error ? error.message : 'Unknown error',
      source: determineSource(results),
    });

    throw new Error(`Failed to export CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Utility to get export statistics
 */
export function getExportStats(results: AudioResults[]): {
  totalFiles: number;
  passCount: number;
  warningCount: number;
  failCount: number;
  errorCount: number;
} {
  return {
    totalFiles: results.length,
    passCount: results.filter(r => r.status === 'pass').length,
    warningCount: results.filter(r => r.status === 'warning').length,
    failCount: results.filter(r => r.status === 'fail').length,
    errorCount: results.filter(r => r.status === 'error').length
  };
}
```

---

## Phase 2: UI Integration in ResultsDisplay.svelte (1 hour)

### Button Placement
Add the export button in the batch summary header section, creating a new header-top layout to accommodate it alongside the title.

### Implementation Code

Add to the script section:
```typescript
import { exportResultsToCsv, getExportStats, type ExportOptions } from '../utils/export-utils';

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
    // FIXED: Handle all 4 analysis modes correctly
    const exportOptions: ExportOptions = {
      mode: $analysisMode === 'filename-only' ? 'metadata-only' :
            $analysisMode === 'experimental' ? 'experimental' : 'standard'
            // 'full' and 'audio-only' both map to 'standard'
    };

    exportResultsToCsv(
      batchResults,
      exportOptions,
      $currentPresetId,
      $analysisMode
    );

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
```

Update the HTML template in the batch-header section:
```svelte
<div class="batch-header">
  <div class="header-top">
    <h2>Batch Analysis Results</h2>
    <div class="header-actions">
      <button
        class="export-button"
        on:click={handleExport}
        disabled={isExporting || batchResults.length === 0}
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
```

### CSS Styles
Add to the styles section:
```css
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
```

---

## Phase 3: Integration Testing (1 hour)

### Test Cases
1. **Empty Results**: Verify error handling when no results exist
2. **Large Datasets**: Test with 100+ files to ensure performance
3. **Special Characters**: Test filenames with commas, quotes, Unicode
4. **All Analysis Modes**: Test all 4 modes (full, audio-only, filename-only, experimental)
5. **All Sources**: Test local files, Box, Google Drive
6. **Cross-browser**: Verify download works in Chrome, Firefox, Safari
7. **Excel Compatibility**: Open exported CSV in Excel to verify formatting
8. **Analytics Tracking**: Verify events in browser console

### Manual Testing Checklist
- [ ] Local file upload (single file)
- [ ] Local file upload (batch)
- [ ] Box folder analysis
- [ ] Google Drive folder analysis
- [ ] Filename-only mode export
- [ ] Audio-only mode export
- [ ] Full mode export
- [ ] Experimental mode export
- [ ] Files with commas in names
- [ ] Files with special characters
- [ ] Large batch (100+ files)
- [ ] Success message appears
- [ ] Error handling works
- [ ] Analytics events fire correctly

### CI/CD Verification
```bash
# Run before committing
npm test              # All 768 tests must pass
npm run typecheck     # No TypeScript errors
npm run lint          # No linting errors
```

---

## Phase 4: Deployment & PR (30 minutes)

### Beta Deployment
```bash
cd packages/web
npm run deploy:beta
```

### Testing in Beta
1. Visit https://audio-analyzer.tinytech.site/beta/
2. Test all scenarios from Phase 3
3. Verify analytics in production environment
4. Check browser console for errors

### Create Pull Request
```bash
gh pr create --base main --head feature/csv-export --title "feat: Add CSV export functionality for batch results" --body "$(cat <<'EOF'
## Summary
- Added CSV export button to batch results display
- Supports all analysis modes (standard, experimental, metadata-only)
- Proper TypeScript types for AudioResults
- Analytics tracking for export events
- Excel-compatible CSV format with BOM

## Changes
- Updated AudioResults type definitions with missing properties
- Created export-utils.ts with CSV generation logic
- Updated ResultsDisplay.svelte with export button
- Added analytics tracking (csv_export_started, csv_export_completed, csv_export_failed)

## Test Plan
- [x] Tested all analysis modes
- [x] Tested all sources (local, Box, Google Drive)
- [x] Verified Excel compatibility
- [x] All 768 tests passing
- [x] TypeScript compilation successful
- [x] Beta deployment tested

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Phase 5: Unit Tests (Future - Separate PR)

### Test File: `packages/web/tests/unit/export-utils.test.ts`

Focus areas for unit tests:
1. CSV escaping edge cases (commas, quotes, newlines)
2. Number formatting (infinity, undefined, null)
3. Duration formatting
4. Header generation for each mode
5. Data extraction for each mode
6. Source detection logic
7. Error handling

---

## Analytics Events Reference

### csv_export_started
```typescript
{
  totalFiles: number,
  exportMode: 'standard' | 'experimental' | 'metadata-only',
  analysisMode: string,
  presetId: string,
  source: 'local' | 'box' | 'google-drive' | 'unknown',
  environment: 'development' | 'beta' | 'production'
}
```

### csv_export_completed
```typescript
{
  totalFiles: number,
  exportMode: string,
  fileSize: number,          // CSV file size in bytes
  passCount: number,
  warnCount: number,
  failCount: number,
  errorCount: number,
  exportTime: number,        // milliseconds
  source: string,
  environment: string
}
```

### csv_export_failed
```typescript
{
  totalFiles: number,
  exportMode: string,
  error: string,
  source: string,
  environment: string
}
```

---

## Implementation Timeline

| Phase | Task | Duration |
|-------|------|----------|
| 0 | Setup & Type Definitions | 10 min |
| 1 | Core Export Utility | 1-2 hours |
| 2 | UI Integration | 1 hour |
| 3 | Integration Testing | 1 hour |
| 4 | Deployment & PR | 30 min |
| **Total** | | **3-4 hours** |

Phase 5 (Unit Tests) can be done in a future PR after the feature is validated in production.

---

## Critical Review Fixes Applied

### Fixed Issues:
1. ✅ Complete analysis mode handling (all 4 modes)
2. ✅ Added missing TypeScript type definitions
3. ✅ Removed unnecessary `async` keyword
4. ✅ Added feature branch workflow
5. ✅ Added analytics tracking (3 events)
6. ✅ Duration format matches existing app format
7. ✅ `-Infinity` returns 'N/A' for Excel compatibility
8. ✅ Blob cleanup timeout increased to 1 second
9. ✅ Differentiated error messages (null vs empty)
10. ✅ Added success feedback message
11. ✅ Source detection for analytics
12. ✅ Fixed HTML structure to match existing component

This revised plan addresses all critical issues and follows project standards for development workflow, testing, and deployment.
