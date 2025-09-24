/**
 * Advanced Audio Level Analysis
 * Peak detection, noise floor estimation, and normalization checks
 */

export class LevelAnalyzer {
  constructor() {
    this.analysisInProgress = false;
  }

  async analyzeAudioBuffer(audioBuffer, progressCallback = null) {
    const sampleRate = audioBuffer.sampleRate;
    const channels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;

    // Get all channel data
    const channelData = [];
    for (let channel = 0; channel < channels; channel++) {
      channelData.push(audioBuffer.getChannelData(channel));
    }

    this.analysisInProgress = true;

    try {
      // 1. Peak Level Analysis
      if (progressCallback) progressCallback('Analyzing peak levels...', 0);
      let globalPeak = 0;

      for (let channel = 0; channel < channels; channel++) {
        const data = channelData[channel];
        for (let i = 0; i < length; i++) {
          if (!this.analysisInProgress) {
            throw new Error('Analysis cancelled');
          }

          const sample = Math.abs(data[i]);
          if (sample > globalPeak) {
            globalPeak = sample;
          }

          // Update progress every 10000 samples
          if (i % 10000 === 0) {
            const progress = (channel * length + i) / (channels * length) * 0.5; // First 50% for peak
            if (progressCallback) progressCallback('Analyzing peak levels...', progress);

            // Allow UI to update
            if (i % 100000 === 0) {
              await new Promise(resolve => setTimeout(resolve, 1));
            }
          }
        }
      }

      const peakDb = globalPeak > 0 ? 20 * Math.log10(globalPeak) : -Infinity;

      // 2. Noise Floor Analysis
      if (progressCallback) progressCallback('Analyzing noise floor...', 0.5);
      const noiseFloorDb = await this.analyzeNoiseFloor(channelData, channels, length, progressCallback);

      // 3. Normalization Check
      if (progressCallback) progressCallback('Checking normalization...', 0.9);
      const normalizationStatus = this.checkNormalization(peakDb);

      if (progressCallback) progressCallback('Analysis complete!', 1.0);

      return {
        peakDb: peakDb,
        noiseFloorDb: noiseFloorDb,
        normalizationStatus: normalizationStatus
      };
    } finally {
      this.analysisInProgress = false;
    }
  }

  async analyzeNoiseFloor(channelData, channels, length, progressCallback) {
    // Collect samples from quieter sections (bottom 20% of RMS values)
    const windowSize = Math.floor(length / 100); // 1% windows
    const rmsValues = [];

    for (let channel = 0; channel < channels; channel++) {
      const data = channelData[channel];

      for (let windowStart = 0; windowStart < length - windowSize; windowStart += windowSize) {
        let sumSquares = 0;

        for (let i = windowStart; i < windowStart + windowSize && i < length; i++) {
          sumSquares += data[i] * data[i];
        }

        const rms = Math.sqrt(sumSquares / windowSize);
        rmsValues.push(rms);
      }
    }

    // Sort RMS values and take bottom 20% as quiet sections
    rmsValues.sort((a, b) => a - b);
    const quietSectionCount = Math.floor(rmsValues.length * 0.2);
    const quietRmsValues = rmsValues.slice(0, quietSectionCount);

    // Calculate average noise floor from quiet sections
    const avgQuietRms = quietRmsValues.reduce((sum, rms) => sum + rms, 0) / quietRmsValues.length;
    const noiseFloorDb = avgQuietRms > 0 ? 20 * Math.log10(avgQuietRms) : -Infinity;

    return noiseFloorDb;
  }

  checkNormalization(peakDb) {
    const targetDb = -6.0;
    const tolerance = 0.1;

    if (Math.abs(peakDb - targetDb) <= tolerance) {
      return { status: 'normalized', message: 'Properly normalized to -6dB' };
    } else if (peakDb > targetDb) {
      return { status: 'too_loud', message: `Too loud: ${peakDb.toFixed(1)}dB (target: -6dB)` };
    } else {
      return { status: 'too_quiet', message: `Too quiet: ${peakDb.toFixed(1)}dB (target: -6dB)` };
    }
  }

  cancelAnalysis() {
    this.analysisInProgress = false;
  }
}