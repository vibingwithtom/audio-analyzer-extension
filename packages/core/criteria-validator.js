/**
 * Audio Criteria Validation
 * Validates audio files against target specifications
 */

export class CriteriaValidator {
  static matchesFileType(actualType, targetType) {
    // Return object with match status instead of boolean
    const result = {
      matches: false,
      status: 'fail'
    };

    // Direct match - perfect
    if (actualType === targetType) {
      result.matches = true;
      result.status = 'pass';
      return result;
    }

    // Handle WAV variations when WAV is the target
    if (targetType === 'wav' || targetType === 'WAV') {
      if (actualType === 'WAV (PCM)') {
        // Perfect WAV match
        result.matches = true;
        result.status = 'pass';
        return result;
      } else if (actualType.startsWith('WAV')) {
        // WAV variant (compressed, etc.) - partial match
        result.matches = true;
        result.status = 'warning';
        return result;
      }
      // Not WAV at all - fail
      return result;
    }

    // Handle other potential format variations
    const normalizedActual = actualType.replace(/\s*\(.*\)/, '').trim();
    const normalizedTarget = targetType.toUpperCase();

    if (normalizedActual === normalizedTarget) {
      result.matches = true;
      result.status = 'pass';
    }

    return result;
  }

  static validateResults(results, criteria) {
    const validationResults = {};

    // Sample Rate Validation (Minimum)
    if (criteria.sampleRate) {
      const minSampleRate = parseInt(criteria.sampleRate);
      const actualSampleRate = results.sampleRate;

      let status = 'fail';
      if (actualSampleRate === minSampleRate) {
        status = 'pass'; // Exact match - green
      } else if (actualSampleRate > minSampleRate) {
        status = 'warning'; // Above minimum - yellow
      }
      // Below minimum stays 'fail' - red

      validationResults.sampleRate = {
        matches: actualSampleRate >= minSampleRate,
        target: minSampleRate,
        actual: actualSampleRate,
        status: status
      };
    }

    // Bit Depth Validation (Minimum)
    if (criteria.bitDepth) {
      const minBitDepth = parseInt(criteria.bitDepth);
      const actualBitDepth = results.bitDepth;

      let status = 'fail';
      if (actualBitDepth === minBitDepth) {
        status = 'pass'; // Exact match - green
      } else if (actualBitDepth > minBitDepth) {
        status = 'warning'; // Above minimum - yellow
      }
      // Below minimum stays 'fail' - red

      validationResults.bitDepth = {
        matches: actualBitDepth >= minBitDepth,
        target: minBitDepth,
        actual: actualBitDepth,
        status: status
      };
    }

    // Channels Validation
    if (criteria.channels) {
      const targetChannels = parseInt(criteria.channels);
      const matches = results.channels === targetChannels;
      validationResults.channels = {
        matches: matches,
        target: targetChannels,
        actual: results.channels,
        status: matches ? 'pass' : 'fail'
      };
    }

    // File Type Validation
    if (criteria.fileType) {
      const matchResult = this.matchesFileType(results.fileType, criteria.fileType);
      validationResults.fileType = {
        matches: matchResult.matches,
        target: criteria.fileType,
        actual: results.fileType,
        status: matchResult.status
      };
    }

    // Duration Validation (always performed)
    const durationSeconds = results.duration;
    let durationStatus = 'fail';
    let durationMatches = false;

    if (durationSeconds >= 120) { // 2 minutes or more
      durationStatus = 'pass';
      durationMatches = true;
    } else if (durationSeconds >= 60) { // 1-2 minutes
      durationStatus = 'warning';
      durationMatches = false; // Not ideal but acceptable
    }
    // Under 1 minute stays 'fail'

    validationResults.duration = {
      matches: durationMatches,
      target: '2+ minutes',
      actual: durationSeconds,
      status: durationStatus
    };

    return validationResults;
  }

  static formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h:${minutes.toString().padStart(2, '0')}m:${secs.toString().padStart(2, '0')}s`;
    } else {
      return `${minutes}m:${secs.toString().padStart(2, '0')}s`;
    }
  }

  static formatDisplayText(results) {
    const formatted = {};

    formatted.fileType = results.fileType;
    formatted.sampleRate = typeof results.sampleRate === 'number'
      ? `${(results.sampleRate / 1000).toFixed(1)} kHz`
      : results.sampleRate;
    formatted.bitDepth = typeof results.bitDepth === 'number'
      ? `${results.bitDepth}-bit`
      : results.bitDepth;
    formatted.channels = typeof results.channels === 'number'
      ? `${results.channels} channel${results.channels !== 1 ? 's' : ''}${results.channels === 1 ? ' (Mono)' : results.channels === 2 ? ' (Stereo)' : ''}`
      : results.channels;
    formatted.duration = typeof results.duration === 'number'
      ? this.formatDuration(results.duration)
      : results.duration;
    formatted.fileSize = `${(results.fileSize / 1024 / 1024).toFixed(2)} MB`;

    return formatted;
  }

  static formatAdvancedResults(results) {
    const formatted = {};

    // Peak Level
    formatted.peakLevel = results.peakDb === -Infinity ? 'Silent' : `${results.peakDb.toFixed(1)} dB`;
    formatted.peakStatus = results.peakDb <= -6.0 ? 'pass' : (results.peakDb <= -3.0 ? 'warning' : 'fail');

    // Noise Floor
    formatted.noiseFloor = results.noiseFloorDb === -Infinity ? 'Silent' : `${results.noiseFloorDb.toFixed(1)} dB`;
    formatted.noiseStatus = results.noiseFloorDb <= -60.0 ? 'pass' : 'fail';

    // Normalization
    formatted.normalization = results.normalizationStatus.message;
    formatted.normalizationStatus = results.normalizationStatus.status === 'normalized' ? 'pass' : 'fail';

    return formatted;
  }
}