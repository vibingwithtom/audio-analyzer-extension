import type { AudioResults } from '../types';
import type { AudioCriteria } from '../settings/types';
import { formatDuration } from './format-utils';
import { analyticsService } from '../services/analytics-service';

export interface ExportOptions {
  mode: 'standard' | 'experimental' | 'metadata-only';
  includeTimestamps?: boolean;
  dateFormat?: 'iso' | 'locale';
}

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
 * Static recommendation templates for different issue types
 */
const RECOMMENDATION_TEMPLATES = {
  filename: {
    unsupportedChars: "Use only allowed filename characters (letters, numbers, hyphens, underscores).",
    tooLong: "Shorten filename to under 255 characters.",
    invalidFormat: "Use standard filename format without special characters."
  },
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
  issueType: keyof typeof RECOMMENDATION_TEMPLATES,
  subType: string,
  actualValue: any,
  criteria: AudioCriteria | null | undefined
): string {
  const template = (RECOMMENDATION_TEMPLATES[issueType] as any)?.[subType] ||
                  (RECOMMENDATION_TEMPLATES[issueType] as any)?.generic;

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

  // 1. Filename Validation Issues
  if (options.includeFilenameValidation && result.validation?.filename) {
    const filenameValidation = result.validation.filename;
    if (filenameValidation.status === 'fail' || filenameValidation.status === 'warning') {
      analysis.filenameValidationIssues = `filename: ${filenameValidation.issue}`;
      issueCount++;

      let subType: string = 'invalidFormat';
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
      if (field === 'filename') return;

      if (validation.status === 'fail' || validation.status === 'warning') {
        validationIssues.push(`${field}: ${validation.issue}`);
        issueCount++;

        let subType: string = 'generic';
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
          field as keyof typeof RECOMMENDATION_TEMPLATES,
          subType,
          (result as any)[field],
          options.currentPresetCriteria
        ));
      }
    });
  }

  // 3. Quality/Experimental Issues
  const qualityIssues: string[] = [];

  // Clipping Analysis
  if (result.clippingAnalysis && result.clippingAnalysis.clippingEventCount > 0) {
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
  if (result.conversationalAnalysis?.overlap && result.conversationalAnalysis.overlap.overlapPercentage > 15) {
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

/**
 * Generates CSV headers for enhanced export
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

  // Experimental mode
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

/**
 * Extracts enhanced data row for a single AudioResults object
 */
function extractEnhancedDataRow(
  result: AudioResults,
  options: EnhancedExportOptions
): string[] {
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
      formatDuration(result.duration),
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

  // Experimental mode
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
    result.clippingAnalysis && result.clippingAnalysis.clippingEventCount > 0 ? 'Yes' : 'No',
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
 * Enhanced export function with failure analysis and recommendations
 * Generates CSV with detailed quality analysis and actionable recommendations
 */
export function exportResultsEnhanced(
  results: AudioResults[],
  options: ExportOptions,
  presetId?: string,
  analysisMode?: string,
  currentPresetCriteria?: AudioCriteria | null,
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

    // Determine if filename validation should be included
    // (include if preset supports it and presetId is provided)
    const includeFilenameValidation = Boolean(presetId && presetId !== 'custom');

    // Create enhanced export options
    const enhancedOptions: EnhancedExportOptions = {
      mode: options.mode as 'standard' | 'experimental' | 'metadata-only',
      includeTimestamps: options.includeTimestamps,
      dateFormat: options.dateFormat,
      includeFilenameValidation,
      currentPresetCriteria,
      analysisMode: options.mode as 'standard' | 'experimental' | 'metadata-only'
    };

    // Track export started
    analyticsService.track('csv_export_started', {
      totalFiles: results.length,
      exportMode: options.mode,
      analysisMode,
      presetId,
      source,
      enhanced: true,
      includeFilenameValidation
    });

    // Generate enhanced headers
    const headers = generateEnhancedHeaders(enhancedOptions);

    // Generate enhanced data rows
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
      enhanced: true,
      includeFilenameValidation
    });

  } catch (error) {
    console.error('Error exporting enhanced CSV:', error);

    // Track export failed
    analyticsService.track('csv_export_failed', {
      totalFiles: results.length,
      exportMode: options.mode,
      error: error instanceof Error ? error.message : 'Unknown error',
      source: determineSource(results),
      enhanced: true
    });

    throw new Error(`Failed to export enhanced CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
