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

    // Sample Rate Validation
    if (criteria.sampleRate) {
      const targetSampleRate = parseInt(criteria.sampleRate);
      const matches = results.sampleRate === targetSampleRate;
      validationResults.sampleRate = {
        matches: matches,
        target: targetSampleRate,
        actual: results.sampleRate,
        status: matches ? 'pass' : 'fail'
      };
    }

    // Bit Depth Validation
    if (criteria.bitDepth && criteria.bitDepth.length > 0) {
      const targetBitDepths = Array.isArray(criteria.bitDepth) ? criteria.bitDepth : [criteria.bitDepth];
      const targetValues = targetBitDepths.map(bd => parseInt(bd));
      const matches = targetValues.includes(results.bitDepth);

      validationResults.bitDepth = {
        matches: matches,
        target: targetValues.length === 1 ? targetValues[0] : targetValues,
        actual: results.bitDepth,
        status: matches ? 'pass' : 'fail'
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

    return validationResults;
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
      ? `${results.duration.toFixed(2)} seconds`
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