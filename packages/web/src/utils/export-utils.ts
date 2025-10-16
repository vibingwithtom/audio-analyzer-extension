import type { AudioResults } from '../types';
import { formatDuration } from './format-utils';
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
    result.clippingAnalysis && result.clippingAnalysis.clippingEventCount > 0 ? 'Yes' : 'No',
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
