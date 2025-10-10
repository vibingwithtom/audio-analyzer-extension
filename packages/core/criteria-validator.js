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
      if (actualType === 'WAV (PCM)' || actualType === 'WAV') {
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

  static validateResults(results, criteria, metadataOnly = false) {
    const validationResults = {};

    // Helper to normalize criteria to arrays
    const toArray = (value) => {
      if (!value) return [];
      return Array.isArray(value) ? value : [value];
    };

    // File Type Validation (Exact Match)
    const fileTypes = toArray(criteria.fileType);
    if (fileTypes.length > 0) {
      // Check if any of the target types match
      let bestMatch = { matches: false, status: 'fail' };

      for (const targetType of fileTypes) {
        const matchResult = this.matchesFileType(results.fileType, targetType);
        if (matchResult.status === 'pass') {
          bestMatch = matchResult;
          break; // Found perfect match
        } else if (matchResult.status === 'warning' && bestMatch.status === 'fail') {
          bestMatch = matchResult; // Partial match better than no match
        }
      }

      validationResults.fileType = {
        matches: bestMatch.matches,
        target: fileTypes,
        actual: results.fileType,
        status: bestMatch.status
      };
    }

    if (!metadataOnly) {
      // Sample Rate Validation (Exact Match)
      const sampleRates = toArray(criteria.sampleRate).map(sr => parseInt(sr)).filter(sr => !isNaN(sr));
      if (sampleRates.length > 0) {
        const actualSampleRate = results.sampleRate;

        let status;
        let matches;

        // Handle Unknown sample rate as warning
        if (actualSampleRate === 'Unknown' || typeof actualSampleRate !== 'number') {
          matches = false;
          status = 'warning';
        } else {
          matches = sampleRates.includes(actualSampleRate);
          status = matches ? 'pass' : 'fail';
        }

        validationResults.sampleRate = {
          matches: matches,
          target: sampleRates,
          actual: actualSampleRate,
          status: status
        };
      }

      // Bit Depth Validation (Exact Match)
      const bitDepths = toArray(criteria.bitDepth).map(bd => parseInt(bd)).filter(bd => !isNaN(bd));
      if (bitDepths.length > 0) {
        const actualBitDepth = results.bitDepth;

        let status;
        let matches;

        // Handle Unknown bit depth as warning
        if (actualBitDepth === 'Unknown' || typeof actualBitDepth !== 'number') {
          matches = false;
          status = 'warning';
        } else {
          matches = bitDepths.includes(actualBitDepth);
          status = matches ? 'pass' : 'fail';
        }

        validationResults.bitDepth = {
          matches: matches,
          target: bitDepths,
          actual: actualBitDepth,
          status: status
        };
      }

      // Channels Validation (Exact Match)
      const channels = toArray(criteria.channels).map(ch => parseInt(ch)).filter(ch => !isNaN(ch));
      if (channels.length > 0) {
        const actualChannels = results.channels;

        let status;
        let matches;

        // Handle Unknown channels as warning
        if (actualChannels === 'Unknown' || typeof actualChannels !== 'number') {
          matches = false;
          status = 'warning';
        } else {
          matches = channels.includes(actualChannels);
          status = matches ? 'pass' : 'fail';
        }

        validationResults.channels = {
          matches: matches,
          target: channels,
          actual: actualChannels,
          status: status
        };
      }

      // Duration Validation (Minimum - only if specified in criteria)
      if (criteria.minDuration) {
        const minDurationSeconds = parseInt(criteria.minDuration);
        const durationSeconds = results.duration;

        let status;
        let matches;

        // Handle Unknown duration as warning
        if (durationSeconds === 'Unknown' || typeof durationSeconds !== 'number') {
          matches = false;
          status = 'warning';
        } else {
          matches = durationSeconds >= minDurationSeconds;
          // Duration mismatches are warnings, not failures
          status = matches ? 'pass' : 'warning';
        }

        validationResults.duration = {
          matches: matches,
          target: `${minDurationSeconds}s minimum`,
          actual: durationSeconds,
          status: status
        };
      }
    }

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
      ? `${results.channels}${results.channels === 1 ? ' (Mono)' : results.channels === 2 ? ' (Stereo)' : ''}`
      : results.channels;
    formatted.duration = typeof results.duration === 'number'
      ? CriteriaValidator.formatDuration(results.duration)
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