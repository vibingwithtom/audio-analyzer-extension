/**
 * Audio Criteria Validation
 * Validates audio files against target specifications
 */

export class CriteriaValidator {
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
    if (criteria.bitDepth) {
      const targetBitDepth = parseInt(criteria.bitDepth);
      const matches = results.bitDepth === targetBitDepth;
      validationResults.bitDepth = {
        matches: matches,
        target: targetBitDepth,
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
      const matches = results.fileType === criteria.fileType;
      validationResults.fileType = {
        matches: matches,
        target: criteria.fileType,
        actual: results.fileType,
        status: matches ? 'pass' : 'fail'
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