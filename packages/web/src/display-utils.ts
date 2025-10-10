/**
 * Display Utilities Module
 *
 * Unified display logic for single file and batch results.
 * Eliminates duplication between validateAndDisplayResults() and addBatchResultRow().
 */

/**
 * Configuration for rendering a table row
 */
export interface RowRenderConfig {
  filename: string;
  overallStatus: string;
  filenameValidation: {
    status: 'pass' | 'fail';
    issue?: string;
    expectedFormat?: string;
  } | null;
  validation: any; // CriteriaValidator validation results
  analysis: any; // Audio analysis results
  isMetadataOnly: boolean;
  playButtonHtml: string;
}

/**
 * Configuration for column visibility
 */
export interface ColumnVisibilityConfig {
  hasFilenameValidation: boolean;
  isMetadataOnly: boolean;
}

/**
 * Escapes HTML special characters to prevent XSS attacks
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Gets the validation status CSS class for a field
 * Returns 'pass', 'fail', 'warning', or 'none'
 */
export function getValidationStatus(
  validationResults: any,
  field: string,
  actualValue: any
): string {
  // If there's a validation result, use it
  if (validationResults && validationResults[field]) {
    const status = validationResults[field].status;
    // Handle 'unknown' status as 'none' for CSS classes
    if (status === 'unknown') {
      return 'none';
    }
    return status; // 'pass', 'warning', or 'fail'
  }

  // No validation for this field - check if actual value is Unknown
  if (actualValue === 'Unknown') {
    return 'none';
  }

  return 'none';
}

/**
 * Renders the filename validation cell HTML
 */
export function renderFilenameCheckCell(filenameValidation: {
  status: 'pass' | 'fail';
  issue?: string;
  expectedFormat?: string;
} | null): string {
  if (!filenameValidation) {
    return '<td style="display: none;"></td>';
  }

  const icon = filenameValidation.status === 'pass' ? '✅' : '❌';
  let tooltipText = '';

  if (filenameValidation.status === 'pass') {
    tooltipText = 'Filename is valid';
  } else {
    tooltipText = filenameValidation.issue || 'Invalid filename';
    if (filenameValidation.expectedFormat) {
      tooltipText += `\n\nExpected: ${filenameValidation.expectedFormat}`;
    }
  }

  return `<td class="filename-check-${filenameValidation.status}" title="${tooltipText}">${icon}</td>`;
}

/**
 * Renders audio-specific cells (sample rate, bit depth, channels, duration)
 * Returns empty string if in metadata-only mode
 */
export function renderAudioCells(
  formatted: any,
  validation: any,
  analysis: any,
  isMetadataOnly: boolean,
  getValidationStatusFn: typeof getValidationStatus
): {
  sampleRate: string;
  bitDepth: string;
  channels: string;
  duration: string;
} {
  if (isMetadataOnly) {
    return {
      sampleRate: '',
      bitDepth: '',
      channels: '',
      duration: ''
    };
  }

  const sampleRateStatus = getValidationStatusFn(validation, 'sampleRate', analysis?.sampleRate);
  const bitDepthStatus = getValidationStatusFn(validation, 'bitDepth', analysis?.bitDepth);
  const channelsStatus = getValidationStatusFn(validation, 'channels', analysis?.channels);
  const durationStatus = getValidationStatusFn(validation, 'duration', analysis?.duration);

  return {
    sampleRate: `<td class="validation-${sampleRateStatus}">${formatted.sampleRate || '-'}</td>`,
    bitDepth: `<td class="validation-${bitDepthStatus}">${formatted.bitDepth || '-'}</td>`,
    channels: `<td class="validation-${channelsStatus}">${formatted.channels || '-'}</td>`,
    duration: `<td class="validation-${durationStatus}">${formatted.duration || '-'}</td>`
  };
}

/**
 * Renders a complete table row for audio analysis results
 */
export function renderResultRow(
  config: RowRenderConfig,
  formatDisplayTextFn: (analysis: any) => any,
  getValidationStatusFn: typeof getValidationStatus
): string {
  const { filename, overallStatus, filenameValidation, validation, analysis, isMetadataOnly, playButtonHtml } = config;

  // Format the analysis data
  const formatted = formatDisplayTextFn(analysis);

  // Get file type validation status
  const fileTypeStatus = getValidationStatusFn(validation, 'fileType', analysis?.fileType);

  // Render filename validation cell
  const filenameCheckCell = renderFilenameCheckCell(filenameValidation);

  // Render audio-specific cells
  const audioCells = renderAudioCells(formatted, validation, analysis, isMetadataOnly, getValidationStatusFn);

  // Escape filename for safe HTML rendering
  const escapedFilename = escapeHtml(filename);

  // Build the complete row HTML
  return `
    <td class="filename" title="${escapedFilename}">${escapedFilename}</td>
    <td><span class="status-badge ${overallStatus}">${overallStatus}</span></td>
    ${filenameCheckCell}
    <td class="validation-${fileTypeStatus}">${formatted.fileType || 'Unknown'}</td>
    ${audioCells.sampleRate}
    ${audioCells.bitDepth}
    ${audioCells.channels}
    ${audioCells.duration}
    <td>${formatted.fileSize || '-'}</td>
    <td>${playButtonHtml}</td>
  `.trim();
}

/**
 * Updates column visibility for a table based on configuration
 */
export function updateColumnVisibility(
  headerIds: {
    filenameCheck: string;
    sampleRate: string;
    bitDepth: string;
    channels: string;
    duration: string;
  },
  config: ColumnVisibilityConfig
): void {
  // Show/hide filename check column
  const filenameCheckHeader = document.getElementById(headerIds.filenameCheck);
  if (filenameCheckHeader) {
    filenameCheckHeader.style.display = config.hasFilenameValidation ? '' : 'none';
  }

  // Hide audio-specific columns in metadata-only mode
  const audioHeaderIds = [
    headerIds.sampleRate,
    headerIds.bitDepth,
    headerIds.channels,
    headerIds.duration
  ];

  audioHeaderIds.forEach(headerId => {
    const header = document.getElementById(headerId);
    if (header) {
      header.style.display = config.isMetadataOnly ? 'none' : '';
    }
  });
}

/**
 * Sets up tooltip behavior for filename check cells
 * Replaces default browser tooltips with custom styled tooltips
 */
export function setupFilenameCheckTooltip(cell: HTMLElement): void {
  let tooltip: HTMLDivElement | null = null;

  cell.addEventListener('mouseenter', (e) => {
    const text = cell.getAttribute('title');
    if (!text) return;

    // Remove title to prevent default browser tooltip
    cell.removeAttribute('title');
    cell.dataset.originalTitle = text;

    // Create tooltip element
    tooltip = document.createElement('div');
    tooltip.className = 'filename-tooltip';
    tooltip.textContent = text;
    document.body.appendChild(tooltip);

    // Position tooltip below the cell
    const rect = cell.getBoundingClientRect();
    tooltip.style.left = rect.left + rect.width / 2 + 'px';
    tooltip.style.top = rect.bottom + 5 + 'px';
  });

  cell.addEventListener('mouseleave', () => {
    if (tooltip) {
      tooltip.remove();
      tooltip = null;
    }
    // Restore title
    if (cell.dataset.originalTitle) {
      cell.setAttribute('title', cell.dataset.originalTitle);
    }
  });
}
