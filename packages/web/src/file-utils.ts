/**
 * File Utilities Module
 *
 * Utilities for working with audio files, including type detection
 * and file metadata extraction.
 */

/**
 * Map of file extensions to standard file type labels
 */
const FILE_TYPE_MAP: Record<string, string> = {
  'wav': 'WAV',
  'mp3': 'MP3',
  'flac': 'FLAC',
  'aac': 'AAC',
  'm4a': 'M4A',
  'ogg': 'OGG'
};

/**
 * Extracts the file type from a filename based on its extension
 *
 * @param filename - The full filename including extension
 * @returns The standardized file type (e.g., "WAV", "MP3") or the uppercased extension if unknown
 *
 * @example
 * getFileTypeFromExtension('audio.wav') // Returns 'WAV'
 * getFileTypeFromExtension('song.mp3') // Returns 'MP3'
 * getFileTypeFromExtension('file.xyz') // Returns 'XYZ'
 */
export function getFileTypeFromExtension(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  if (!extension) {
    return 'Unknown';
  }
  return FILE_TYPE_MAP[extension] || extension.toUpperCase();
}

/**
 * Checks if a filename has a valid audio file extension
 *
 * @param filename - The filename to check
 * @returns True if the file has a known audio extension
 */
export function isAudioFile(filename: string): boolean {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? extension in FILE_TYPE_MAP : false;
}

/**
 * Gets the file extension from a filename
 *
 * @param filename - The filename
 * @returns The extension (without the dot) in lowercase, or empty string if no extension
 *
 * @example
 * getFileExtension('audio.wav') // Returns 'wav'
 * getFileExtension('file') // Returns ''
 */
export function getFileExtension(filename: string): string {
  const extension = filename.split('.').pop();
  if (!extension || extension === filename) {
    return '';
  }
  return extension.toLowerCase();
}
