/**
 * Formatting utilities for displaying audio properties
 */

/**
 * Format sample rate to kHz
 * @example 48000 → "48.0 kHz"
 * @example 44100 → "44.1 kHz"
 * @example "Unknown" → "Unknown"
 */
export function formatSampleRate(sampleRate: number | string): string {
  if (typeof sampleRate === 'string' || isNaN(sampleRate)) {
    return 'Unknown';
  }
  const kHz = sampleRate / 1000;
  return `${kHz.toFixed(1)} kHz`;
}

/**
 * Format duration to human-readable format
 * @example 65.5 → "1m 05s"
 * @example 120 → "2m 00s"
 * @example 45 → "45s"
 * @example 3665 → "1h 01m 05s"
 * @example "Unknown" → "Unknown"
 */
export function formatDuration(seconds: number | string): string {
  if (typeof seconds === 'string' || isNaN(seconds)) {
    return 'Unknown';
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs.toString().padStart(2, '0')}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * Format bit depth
 * @example 16 → "16-bit"
 * @example 24 → "24-bit"
 * @example "Unknown" → "Unknown"
 * @example "Compressed (variable)" → "Compressed (variable)"
 */
export function formatBitDepth(bitDepth: number | string): string {
  if (typeof bitDepth === 'string' || isNaN(bitDepth)) {
    return bitDepth.toString();
  }
  return `${bitDepth}-bit`;
}

/**
 * Format channels to descriptive text
 * @example 1 → "Mono"
 * @example 2 → "Stereo"
 * @example 6 → "6 channels"
 * @example "Unknown" → "Unknown"
 */
export function formatChannels(channels: number | string): string {
  if (typeof channels === 'string' || isNaN(channels)) {
    return 'Unknown';
  }
  switch (channels) {
    case 1:
      return 'Mono';
    case 2:
      return 'Stereo';
    default:
      return `${channels} channels`;
  }
}

/**
 * Format file size to human-readable format
 * @example 1024 → "1.00 KB"
 * @example 1048576 → "1.00 MB"
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
