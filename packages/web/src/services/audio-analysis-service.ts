import { AudioAnalyzer, LevelAnalyzer, CriteriaValidator } from '@audio-analyzer/core';
import { FilenameValidator } from '../validation/filename-validator';
import type { AudioResults, ValidationResults, AnalysisMode } from '../types';
import type { Preset } from '../presets';
import { get } from 'svelte/store';
import { analysisMode, currentCriteria, currentPresetId, availablePresets } from '../stores/settings';

export interface AnalysisOptions {
  analysisMode: AnalysisMode;
  preset?: Preset | null;
  presetId?: string;
  criteria?: any; // AudioCriteria from core
  // Three Hour configuration (for script-match validation)
  scriptsList?: string[];
  speakerId?: string;
}

/**
 * Analyzes an audio file and returns comprehensive results.
 *
 * This service encapsulates all file analysis logic used by LocalFileTab,
 * GoogleDriveTab, and future BoxTab.
 *
 * @param file - The audio file to analyze (File or Blob)
 * @param options - Analysis configuration options
 * @returns Promise resolving to AudioResults
 * @throws Error if analysis fails (caller should handle errors)
 */
export async function analyzeAudioFile(
  file: File | Blob,
  options: AnalysisOptions
): Promise<AudioResults> {
  const { analysisMode: mode, preset, presetId, criteria, scriptsList, speakerId } = options;
  const filename = file instanceof File ? file.name : 'unknown';

  // For empty files (filename-only mode with Google Drive metadata)
  if (file.size === 0) {
    return await analyzeMetadataOnly(file, filename, preset, presetId, mode, scriptsList, speakerId);
  }

  // Full audio analysis
  return await analyzeFullFile(file, filename, mode, preset, presetId, criteria, scriptsList, speakerId);
}

/**
 * Analyzes only file metadata (no audio decoding).
 * Used in filename-only mode when file hasn't been downloaded.
 */
async function analyzeMetadataOnly(
  file: File | Blob,
  filename: string,
  preset?: Preset | null,
  presetId?: string,
  mode?: AnalysisMode,
  scriptsList?: string[],
  speakerId?: string
): Promise<AudioResults> {
  // Extract file type from filename extension
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  const fileType = extension || 'unknown';

  // Use actualSize if available (for partial downloads), otherwise use file.size
  const actualSize = (file as any).actualSize || file.size;

  const result: AudioResults = {
    filename,
    fileSize: actualSize,
    fileType,
    channels: 0,
    sampleRate: 0,
    bitDepth: 0,
    duration: 0,
    status: 'pass'
  };

  // Validate filename if preset supports it
  if (preset?.filenameValidationType && (mode === 'filename-only' || mode === 'full')) {
    const validation = validateFilename(filename, preset, presetId, scriptsList, speakerId);
    if (validation) {
      result.validation = { filename: validation };
      result.status = validation.status;
    }
  }

  return result;
}

/**
 * Performs full audio analysis including decoding and advanced metrics.
 */
async function analyzeFullFile(
  file: File | Blob,
  filename: string,
  mode: AnalysisMode,
  preset?: Preset | null,
  presetId?: string,
  criteria?: any,
  scriptsList?: string[],
  speakerId?: string
): Promise<AudioResults> {
  // Basic audio analysis
  const audioAnalyzer = new AudioAnalyzer();
  const basicResults = await audioAnalyzer.analyzeFile(file);

  // Use actualSize if available (for partial downloads), otherwise use file.size
  const actualSize = (file as any).actualSize || file.size;

  let result: AudioResults = {
    filename,
    ...basicResults,
    fileSize: actualSize, // Must come AFTER basicResults to override file.size from core
    status: 'pass'
  };

  // Advanced/Experimental analysis
  if (mode === 'experimental') {
    const arrayBuffer = await file.arrayBuffer();
    const advancedResults = await analyzeExperimental(arrayBuffer);
    result = { ...result, ...advancedResults };
  }

  // Validation against preset criteria
  if (criteria) {
    const skipAudioValidation = mode === 'filename-only';
    const validation = CriteriaValidator.validateResults(result, criteria, skipAudioValidation);

    // Add filename validation if preset supports it
    if (preset?.filenameValidationType && (mode === 'filename-only' || mode === 'full')) {
      const filenameValidation = validateFilename(filename, preset, presetId, scriptsList, speakerId);
      if (filenameValidation && validation) {
        validation.filename = filenameValidation;
      }
    }

    result.validation = validation;
    result.status = determineOverallStatus(validation);
  }

  return result;
}

/**
 * Runs experimental analysis: peak levels, reverb, noise floor, stereo separation, mic bleed.
 */
async function analyzeExperimental(arrayBuffer: ArrayBuffer): Promise<Partial<AudioResults>> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Create a new LevelAnalyzer instance to avoid concurrent analysis conflicts
  const levelAnalyzer = new LevelAnalyzer();

  // Run level analysis with experimental features (reverb, noise floor, silence)
  const advancedResults = await levelAnalyzer.analyzeAudioBuffer(audioBuffer, null, true);

  // Add stereo separation analysis
  const stereoSeparation = levelAnalyzer.analyzeStereoSeparation(audioBuffer);
  if (stereoSeparation) {
    advancedResults.stereoSeparation = stereoSeparation;
  }

  // Add mic bleed analysis (only meaningful for stereo files)
  const micBleed = levelAnalyzer.analyzeMicBleed(audioBuffer);
  if (micBleed) {
    advancedResults.micBleed = micBleed;
  }

  return advancedResults;
}

/**
 * Validates filename against preset rules.
 */
function validateFilename(
  filename: string,
  preset: Preset,
  presetId?: string,
  scriptsList?: string[],
  speakerId?: string
): { status: 'pass' | 'warning' | 'fail'; value: string; issue?: string } | null {
  if (!preset.filenameValidationType) return null;

  if (preset.filenameValidationType === 'bilingual-pattern') {
    const validation = FilenameValidator.validateBilingual(filename);
    return {
      status: validation.status as 'pass' | 'warning' | 'fail',
      value: filename,
      issue: validation.issue
    };
  }

  if (preset.filenameValidationType === 'script-match') {
    // Three Hour validation - requires scripts list and speaker ID
    if (!scriptsList || scriptsList.length === 0 || !speakerId) {
      return {
        status: 'fail',
        value: filename,
        issue: 'Three Hour validation requires configuration: scripts folder and speaker ID must be set'
      };
    }

    const validation = FilenameValidator.validateThreeHour(filename, scriptsList, speakerId);

    return {
      status: validation.status as 'pass' | 'warning' | 'fail',
      value: filename,
      issue: validation.issue
    };
  }

  return null;
}

/**
 * Determines overall status based on validation results.
 */
function determineOverallStatus(validation: ValidationResults): 'pass' | 'warning' | 'fail' {
  let hasFailure = false;
  let hasWarning = false;

  Object.values(validation).forEach((v: any) => {
    if (v.status === 'fail') hasFailure = true;
    if (v.status === 'warning') hasWarning = true;
  });

  if (hasFailure) return 'fail';
  if (hasWarning) return 'warning';
  return 'pass';
}
