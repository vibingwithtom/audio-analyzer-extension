/**
 * Advanced Audio Level Analysis
 * Peak detection, noise floor estimation, and normalization checks
 */

export class LevelAnalyzer {
  constructor() {
    this.analysisInProgress = false;
  }

  async analyzeAudioBuffer(audioBuffer, progressCallback = null, includeExperimental = false) {
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

      // 2. Noise Floor Analysis (Old Method - always included)
      if (progressCallback) progressCallback('Analyzing noise floor...', 0.5);
      const noiseFloorDb = await this.analyzeNoiseFloor(channelData, channels, length, progressCallback);

      // 3. Normalization Check
      if (progressCallback) progressCallback('Checking normalization...', 0.9);
      const normalizationStatus = this.checkNormalization(peakDb);

      // Base results (always included)
      const results = {
        peakDb: peakDb,
        noiseFloorDb: noiseFloorDb,
        normalizationStatus: normalizationStatus
      };

      // Experimental analysis (only when requested)
      if (includeExperimental) {
        // Histogram-based noise floor
        const noiseFloorDbHistogram = await this.analyzeNoiseFloorHistogram(channelData, channels, length);

        // Reverb Estimation
        if (progressCallback) progressCallback('Estimating reverb...', 0.95);
        const reverbTime = await this.estimateReverb(channelData, channels, length, sampleRate, noiseFloorDbHistogram);
        const reverbInfo = this.interpretReverb(reverbTime);

        // Silence Analysis
        if (progressCallback) progressCallback('Analyzing silence...', 0.98);
        const { leadingSilence, trailingSilence, longestSilence } = this.analyzeSilence(channelData, channels, length, sampleRate, noiseFloorDbHistogram, peakDb);

        // Add experimental results
        results.noiseFloorDbHistogram = noiseFloorDbHistogram;
        results.reverbInfo = reverbInfo;
        results.leadingSilence = leadingSilence;
        results.trailingSilence = trailingSilence;
        results.longestSilence = longestSilence;
      }

      if (progressCallback) progressCallback('Analysis complete!', 1.0);

      return results;
    } finally {
      this.analysisInProgress = false;
    }
  }
      
          interpretReverb(rt60) {
            if (rt60 <= 0) {
              return { time: rt60, label: 'N/A', description: 'No reverb detected.' };
            }
            if (rt60 < 0.3) {
              return { time: rt60, label: 'Excellent (Dry)', description: 'Ideal for voiceover. Matches a vocal booth or well-treated studio environment.' };
            }
            if (rt60 < 0.5) {
              return { time: rt60, label: 'Good (Controlled)', description: 'A well-controlled room with minimal reflections. Acceptable for most recording.' };
            }
            if (rt60 < 0.8) {
              return { time: rt60, label: 'Fair (Slightly Live)', description: 'Noticeable room reflections. May reduce clarity for voiceover work.' };
            }
            if (rt60 < 1.2) {
              return { time: rt60, label: 'Poor (Reverberant)', description: 'Significant reverb is present, making the recording sound distant and unprofessional.' };
            }
            return { time: rt60, label: 'Very Poor (Echoey)', description: 'Excessive echo and reverb. Unsuitable for professional voice recording.' };
          }        analyzeSilence(channelData, channels, length, sampleRate, noiseFloorDb, peakDb) {
          // Set threshold 25% of the way between the noise floor and the peak
          const dynamicRange = peakDb - noiseFloorDb;
          const thresholdRatio = 0.25;
          // Handle case where peak is quieter than noise floor (unlikely but possible)
          const effectiveDynamicRange = Math.max(0, dynamicRange);
          const silenceThresholdDb = noiseFloorDb + (effectiveDynamicRange * thresholdRatio);
          const silenceThresholdLinear = Math.pow(10, silenceThresholdDb / 20);
      
          const chunkSizeMs = 50; // 50ms chunks
          const chunkSamples = Math.floor(sampleRate * (chunkSizeMs / 1000));
          const numChunks = Math.ceil(length / chunkSamples);
      
          const minSoundDurationMs = 150; // Minimum duration for a sound to not be considered a tick
          const minSoundChunks = Math.ceil(minSoundDurationMs / chunkSizeMs);
      
          const chunks = new Array(numChunks).fill(0); // 0 for silence, 1 for sound
      
          // Step 1: Classify chunks as sound or silence
          for (let i = 0; i < numChunks; i++) {
            const start = i * chunkSamples;
            const end = Math.min(start + chunkSamples, length);
            let maxSampleInChunk = 0;
      
            // Find the absolute max sample in this chunk across all channels
            for (let channel = 0; channel < channels; channel++) {
              const data = channelData[channel];
              for (let j = start; j < end; j++) {
                const sample = Math.abs(data[j]);
                if (sample > maxSampleInChunk) {
                  maxSampleInChunk = sample;
                }
              }
            }
      
            if (maxSampleInChunk > silenceThresholdLinear) {
              chunks[i] = 1; // Sound
            }
          }    // Step 2: Filter out small "islands" of sound
    let currentSoundStreak = 0;
    for (let i = 0; i < numChunks; i++) {
      if (chunks[i] === 1) {
        currentSoundStreak++;
      } else {
        if (currentSoundStreak > 0 && currentSoundStreak < minSoundChunks) {
          // This was an insignificant sound island, so revert it to silence
          for (let j = 1; j <= currentSoundStreak; j++) {
            chunks[i - j] = 0;
          }
        }
        currentSoundStreak = 0;
      }
    }
    // Check for trailing sound island
    if (currentSoundStreak > 0 && currentSoundStreak < minSoundChunks) {
      for (let j = 1; j <= currentSoundStreak; j++) {
        chunks[numChunks - j] = 0;
      }
    }

    // Step 3: Find longest silence streak *after* filtering
    let longestSilenceStreak = 0;
    let currentSilenceStreak = 0;
    for (let i = 0; i < numChunks; i++) {
      if (chunks[i] === 0) {
        currentSilenceStreak++;
      } else {
        if (currentSilenceStreak > longestSilenceStreak) {
          longestSilenceStreak = currentSilenceStreak;
        }
        currentSilenceStreak = 0;
      }
    }
    if (currentSilenceStreak > longestSilenceStreak) {
      longestSilenceStreak = currentSilenceStreak; // Check trailing silence
    }
    const longestSilence = longestSilenceStreak * (chunkSizeMs / 1000);

    // Step 4: Find leading and trailing silence from the *filtered* chunks
    const firstSoundIndex = chunks.indexOf(1);
    const lastSoundIndex = chunks.lastIndexOf(1);

    let leadingSilence = 0;
    let trailingSilence = 0;

    if (firstSoundIndex === -1) {
      // Entire file is silent
      leadingSilence = length / sampleRate;
      trailingSilence = length / sampleRate;
    } else {
      leadingSilence = firstSoundIndex * (chunkSizeMs / 1000);
      trailingSilence = (numChunks - 1 - lastSoundIndex) * (chunkSizeMs / 1000);
    }

    return {
      leadingSilence: leadingSilence,
      trailingSilence: trailingSilence,
      longestSilence: longestSilence
    };
  }

  async estimateReverb(channelData, channels, length, sampleRate, noiseFloorDb) {
    const minDbAboveNoise = 10;
    const onsetThreshold = 1.5;
    const onsetWindowSize = 1024;
    const decayWindowSize = Math.floor(sampleRate * 0.02); // 20ms windows for decay
    const decayThresholdDb = -25;

    let decayTimes = [];
    const data = channelData[0];

    let prevRms = 0;

    for (let i = 0; i < length - onsetWindowSize; i += onsetWindowSize) {
      let sumSquares = 0;
      for (let j = i; j < i + onsetWindowSize; j++) {
        sumSquares += data[j] * data[j];
      }
      const currentRms = Math.sqrt(sumSquares / onsetWindowSize);

      if (currentRms > prevRms * onsetThreshold && currentRms > 0.01) {
        let peakAmplitude = 0;
        let peakIndex = i;
        for (let j = i; j < i + onsetWindowSize; j++) {
          if (Math.abs(data[j]) > peakAmplitude) {
            peakAmplitude = Math.abs(data[j]);
            peakIndex = j;
          }
        }

        const peakDb = 20 * Math.log10(peakAmplitude);

        if (peakDb > noiseFloorDb + minDbAboveNoise) {
          let decayEndSample = -1;

          // New decay logic: Use RMS windows instead of raw samples
          for (let j = peakIndex; j < length - decayWindowSize; j += decayWindowSize) {
            let decaySumSquares = 0;
            for (let k = j; k < j + decayWindowSize; k++) {
              decaySumSquares += data[k] * data[k];
            }
            const decayRms = Math.sqrt(decaySumSquares / decayWindowSize);
            const currentDecayDb = decayRms > 0 ? 20 * Math.log10(decayRms) : -120;

            if (currentDecayDb < peakDb + decayThresholdDb) {
              decayEndSample = j;
              break;
            }
          }

          if (decayEndSample !== -1) {
            const decayDurationSeconds = (decayEndSample - peakIndex) / sampleRate;
            if (decayDurationSeconds > 0) {
              const rt60 = decayDurationSeconds * (60 / Math.abs(decayThresholdDb));
              decayTimes.push(rt60);
            }
          }
        }
      }
      prevRms = currentRms;
    }

    if (decayTimes.length < 1) {
      return 0;
    }

    decayTimes.sort((a, b) => a - b);
    const mid = Math.floor(decayTimes.length / 2);
    const medianRt60 = decayTimes.length % 2 !== 0
      ? decayTimes[mid]
      : (decayTimes[mid - 1] + decayTimes[mid]) / 2;

    return medianRt60;
  }

  async analyzeNoiseFloorHistogram(channelData, channels, length) {
    // This method uses a histogram to find the most common quiet level.
    const numBins = 100; // Bins for levels from -100dB to 0dB
    const histogram = new Array(numBins).fill(0);
    const minDb = -100.0;
    const dbRange = 100.0;

    const windowSize = Math.floor(44100 * 0.05); // 50ms windows, assuming at least 44.1kHz

    for (let channel = 0; channel < channels; channel++) {
      const data = channelData[channel];
      for (let i = 0; i < length; i += windowSize) {
        const end = Math.min(i + windowSize, length);
        let sumSquares = 0;
        for (let j = i; j < end; j++) {
          sumSquares += data[j] * data[j];
        }
        const rms = Math.sqrt(sumSquares / (end - i));
        const db = rms > 0 ? 20 * Math.log10(rms) : minDb;

        if (db >= minDb) {
          const bin = Math.min(
            Math.floor(((db - minDb) / dbRange) * numBins),
            numBins - 1
          );
          histogram[bin]++;
        }
      }
    }

    // Find the peak of the histogram (the mode)
    let modeBin = -1;
    let maxCount = 0;
    for (let i = 0; i < numBins; i++) {
      if (histogram[i] > maxCount) {
        maxCount = histogram[i];
        modeBin = i;
      }
    }

    if (modeBin === -1) {
      return -Infinity;
    }

    // Convert the bin index back to a dB value
    const noiseFloor = modeBin * (dbRange / numBins) + minDb;
    return noiseFloor;
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

    let status, message;

    if (Math.abs(peakDb - targetDb) <= tolerance) {
      status = 'normalized';
      message = 'Properly normalized';
    } else if (peakDb > targetDb) {
      status = 'too_loud';
      message = 'Too loud';
    } else {
      status = 'too_quiet';
      message = 'Too quiet';
    }

    return {
      status: status,
      message: message,
      peakDb: peakDb,
      targetDb: targetDb
    };
  }

  cancelAnalysis() {
    this.analysisInProgress = false;
  }

  /**
   * Analyzes the stereo separation of an audio buffer.
   * @param {AudioBuffer} audioBuffer The audio buffer to analyze.
   * @returns {object|null} An object with stereo analysis results, or null if not stereo.
   */
  analyzeStereoSeparation(audioBuffer) {
    if (audioBuffer.numberOfChannels !== 2) {
      return null; // Not a stereo file
    }

    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = audioBuffer.getChannelData(1);
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;

    const blockSize = Math.floor(sampleRate * 0.25); // 250ms blocks
    const dominanceRatioThreshold = 1.1; // How much louder one channel must be to be "dominant"
    const silenceThreshold = 0.001; // RMS threshold for silence

    let leftDominantBlocks = 0;
    let rightDominantBlocks = 0;
    let balancedBlocks = 0;
    let silentBlocks = 0;
    let totalBlocks = 0;

    for (let i = 0; i < length; i += blockSize) {
      let sumSquaresLeft = 0;
      let sumSquaresRight = 0;
      const blockEnd = Math.min(i + blockSize, length);
      const currentBlockSize = blockEnd - i;

      for (let j = i; j < blockEnd; j++) {
        sumSquaresLeft += leftChannel[j] * leftChannel[j];
        sumSquaresRight += rightChannel[j] * rightChannel[j];
      }

      const rmsLeft = Math.sqrt(sumSquaresLeft / currentBlockSize);
      const rmsRight = Math.sqrt(sumSquaresRight / currentBlockSize);

      totalBlocks++;

      if (rmsLeft < silenceThreshold && rmsRight < silenceThreshold) {
        silentBlocks++;
        continue;
      }

      const ratio = rmsLeft / rmsRight;

      if (ratio > dominanceRatioThreshold) {
        leftDominantBlocks++;
      } else if (ratio < 1 / dominanceRatioThreshold) {
        rightDominantBlocks++;
      } else {
        balancedBlocks++;
      }
    }

    const activeBlocks = totalBlocks - silentBlocks;
    let stereoType = 'Undetermined';
    let stereoConfidence = 0;
    let leftPct = 0, rightPct = 0, balancedPct = 0;

    if (activeBlocks > 0) {
      balancedPct = balancedBlocks / activeBlocks;
      leftPct = leftDominantBlocks / activeBlocks;
      rightPct = rightDominantBlocks / activeBlocks;

      if (balancedPct > 0.9) {
        stereoType = 'Mono as Stereo';
        stereoConfidence = balancedPct;
      } else if (leftPct > 0.1 && rightPct > 0.1) {
        stereoType = 'Conversational Stereo';
        // Confidence is based on how much of the audio is separated
        stereoConfidence = leftPct + rightPct;
      } else if (leftPct > 0.9) {
        stereoType = 'Mono in Left Channel';
        stereoConfidence = leftPct;
      } else if (rightPct > 0.9) {
        stereoType = 'Mono in Right Channel';
        stereoConfidence = rightPct;
      } else {
        stereoType = 'Mixed Stereo';
        stereoConfidence = 1 - balancedPct;
      }
    } else {
      stereoType = 'Silent';
      stereoConfidence = 1;
    }

    return {
      totalBlocks,
      activeBlocks,
      silentBlocks,
      leftDominantBlocks,
      rightDominantBlocks,
      balancedBlocks,
      stereoType,
      stereoConfidence: Math.min(stereoConfidence, 1.0) // Cap at 1.0
    };
  }

  /**
   * Analyzes mic bleed in a stereo audio file with conversational audio.
   * Uses hybrid approach: separation ratio + cross-correlation for suspected bleed.
   * @param {AudioBuffer} audioBuffer The audio buffer to analyze.
   * @returns {object|null} An object with mic bleed analysis results, or null if not stereo.
   */
  analyzeMicBleed(audioBuffer) {
    if (audioBuffer.numberOfChannels !== 2) {
      return null; // Not a stereo file
    }

    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = audioBuffer.getChannelData(1);
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;

    const blockSize = Math.floor(sampleRate * 0.25); // 250ms blocks
    const dominanceRatioThreshold = 1.5; // How much louder one channel must be to be "dominant"
    const silenceThreshold = 0.001; // RMS threshold for silence
    const separationThreshold = 15; // dB separation threshold for concern

    // OLD METHOD: Track bleed levels for averaging
    const leftBleedLevels = [];
    const rightBleedLevels = [];

    // NEW METHOD: Track separation ratios and concerning blocks
    const separationRatios = [];
    const concerningBlocks = [];

    for (let i = 0; i < length; i += blockSize) {
      let sumSquaresLeft = 0;
      let sumSquaresRight = 0;
      const blockEnd = Math.min(i + blockSize, length);
      const currentBlockSize = blockEnd - i;

      for (let j = i; j < blockEnd; j++) {
        sumSquaresLeft += leftChannel[j] * leftChannel[j];
        sumSquaresRight += rightChannel[j] * rightChannel[j];
      }

      const rmsLeft = Math.sqrt(sumSquaresLeft / currentBlockSize);
      const rmsRight = Math.sqrt(sumSquaresRight / currentBlockSize);

      if (rmsLeft < silenceThreshold && rmsRight < silenceThreshold) {
        continue; // Skip silent blocks
      }

      const ratio = rmsLeft / rmsRight;

      if (ratio > dominanceRatioThreshold) {
        // Left channel is dominant, measure bleed in the right channel
        const dominantDb = 20 * Math.log10(rmsLeft);
        const bleedDb = rmsRight > 0 ? 20 * Math.log10(rmsRight) : -Infinity;
        const separation = dominantDb - bleedDb;

        // OLD METHOD
        rightBleedLevels.push(rmsRight);

        // NEW METHOD
        separationRatios.push(separation);

        if (separation < separationThreshold) {
          concerningBlocks.push({
            startSample: i,
            endSample: blockEnd,
            dominantChannel: 'left',
            separation: separation,
            dominantRms: rmsLeft,
            bleedRms: rmsRight
          });
        }
      } else if (ratio < 1 / dominanceRatioThreshold) {
        // Right channel is dominant, measure bleed in the left channel
        const dominantDb = 20 * Math.log10(rmsRight);
        const bleedDb = rmsLeft > 0 ? 20 * Math.log10(rmsLeft) : -Infinity;
        const separation = dominantDb - bleedDb;

        // OLD METHOD
        leftBleedLevels.push(rmsLeft);

        // NEW METHOD
        separationRatios.push(separation);

        if (separation < separationThreshold) {
          concerningBlocks.push({
            startSample: i,
            endSample: blockEnd,
            dominantChannel: 'right',
            separation: separation,
            dominantRms: rmsRight,
            bleedRms: rmsLeft
          });
        }
      }
    }

    // OLD METHOD: Calculate average bleed levels
    const calculateAverageDb = (levels) => {
      if (levels.length === 0) {
        return -Infinity;
      }
      const sum = levels.reduce((acc, val) => acc + val, 0);
      const averageRms = sum / levels.length;
      return 20 * Math.log10(averageRms);
    };

    const leftChannelBleedDb = calculateAverageDb(leftBleedLevels);
    const rightChannelBleedDb = calculateAverageDb(rightBleedLevels);

    // NEW METHOD: Calculate separation statistics
    let medianSeparation = -Infinity;
    let p10Separation = -Infinity; // Worst 10%
    let percentagePoorSeparation = 0;

    if (separationRatios.length > 0) {
      const sorted = [...separationRatios].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      medianSeparation = sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;

      const p10Index = Math.floor(sorted.length * 0.1);
      p10Separation = sorted[p10Index];

      const poorCount = separationRatios.filter(s => s < 15).length;
      percentagePoorSeparation = (poorCount / separationRatios.length) * 100;
    }

    // NEW METHOD: Cross-correlation for concerning blocks
    const confirmedBleedBlocks = [];
    const correlationThreshold = 0.3; // Lower threshold for speech correlation

    for (const block of concerningBlocks) {
      const correlation = this.calculateCrossCorrelation(
        leftChannel,
        rightChannel,
        block.startSample,
        block.endSample,
        block.dominantChannel
      );

      if (correlation > correlationThreshold) {
        confirmedBleedBlocks.push({
          ...block,
          correlation: correlation,
          timestamp: block.startSample / sampleRate
        });
      }
    }

    const percentageConfirmedBleed = separationRatios.length > 0
      ? (confirmedBleedBlocks.length / separationRatios.length) * 100
      : 0;

    return {
      // OLD METHOD results
      old: {
        leftChannelBleedDb,
        rightChannelBleedDb,
        leftBleedSamples: leftBleedLevels.length,
        rightBleedSamples: rightBleedLevels.length,
      },
      // NEW METHOD results
      new: {
        medianSeparation,
        p10Separation,
        percentagePoorSeparation,
        percentageConfirmedBleed,
        totalBlocks: separationRatios.length,
        concerningBlocks: concerningBlocks.length,
        confirmedBleedBlocks: confirmedBleedBlocks.length,
        worstBlocks: confirmedBleedBlocks.slice(0, 5) // Top 5 worst instances
      }
    };
  }

  /**
   * Calculates cross-correlation between channels to detect actual bleed vs room noise.
   * @param {Float32Array} leftChannel Left channel audio data
   * @param {Float32Array} rightChannel Right channel audio data
   * @param {number} startSample Start sample index
   * @param {number} endSample End sample index
   * @param {string} dominantChannel Which channel is dominant ('left' or 'right')
   * @returns {number} Correlation coefficient (0-1)
   */
  calculateCrossCorrelation(leftChannel, rightChannel, startSample, endSample, dominantChannel) {
    const blockLength = endSample - startSample;

    // Calculate means
    let sumDominant = 0;
    let sumBleed = 0;
    for (let i = startSample; i < endSample; i++) {
      if (dominantChannel === 'left') {
        sumDominant += leftChannel[i];
        sumBleed += rightChannel[i];
      } else {
        sumDominant += rightChannel[i];
        sumBleed += leftChannel[i];
      }
    }
    const meanDominant = sumDominant / blockLength;
    const meanBleed = sumBleed / blockLength;

    // Calculate correlation
    let numerator = 0;
    let sumSqDominant = 0;
    let sumSqBleed = 0;

    for (let i = startSample; i < endSample; i++) {
      const dominant = dominantChannel === 'left' ? leftChannel[i] : rightChannel[i];
      const bleed = dominantChannel === 'left' ? rightChannel[i] : leftChannel[i];

      const diffDominant = dominant - meanDominant;
      const diffBleed = bleed - meanBleed;

      numerator += diffDominant * diffBleed;
      sumSqDominant += diffDominant * diffDominant;
      sumSqBleed += diffBleed * diffBleed;
    }

    const denominator = Math.sqrt(sumSqDominant * sumSqBleed);

    if (denominator === 0) {
      return 0;
    }

    // Return absolute correlation (we care about correlation regardless of phase)
    return Math.abs(numerator / denominator);
  }
}