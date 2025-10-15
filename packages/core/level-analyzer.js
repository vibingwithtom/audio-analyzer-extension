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
      let peakFound = false; // Flag to break outer loop

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

          // EMERGENCY BRAKE: If peak is already 1.0, no need to scan further.
          if (globalPeak >= 0.99999) { // Use a very close value to 1.0 for float precision
            peakFound = true;
            break; // Break inner loop
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
        if (peakFound) { // Break outer loop if peak found
          break;
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
        if (progressCallback) progressCallback('Estimating reverb...', 0.93);
        const reverbAnalysisResults = await this.estimateReverb(channelData, channels, length, sampleRate, noiseFloorDbHistogram);
        const reverbInfo = this.interpretReverb(reverbAnalysisResults.overallMedianRt60);

        // Silence Analysis
        if (progressCallback) progressCallback('Analyzing silence...', 0.95);
        const { leadingSilence, trailingSilence, longestSilence, silenceSegments } = this.analyzeSilence(channelData, channels, length, sampleRate, noiseFloorDbHistogram, peakDb);

        // Clipping Analysis
        if (progressCallback) progressCallback('Detecting clipping...', 0.97);
        const clippingAnalysis = await this.analyzeClipping(audioBuffer, sampleRate, progressCallback);

        // Add experimental results
        results.noiseFloorDbHistogram = noiseFloorDbHistogram;
        results.reverbInfo = reverbInfo; // This is the interpreted text
        results.reverbAnalysis = reverbAnalysisResults; // This is the raw data including per-channel
        results.leadingSilence = leadingSilence;
        results.trailingSilence = trailingSilence;
        results.longestSilence = longestSilence;
        results.silenceSegments = silenceSegments;
        results.clippingAnalysis = clippingAnalysis;
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
  }

  analyzeSilence(channelData, channels, length, sampleRate, noiseFloorDb, peakDb) {
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
    }

    // Step 2: Filter out small "islands" of sound
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

    // Step 3: Find all silence segments *after* filtering (not counting leading/trailing)
    const silenceSegments = [];
    let longestSilenceStreak = 0;
    let currentSilenceStreak = 0;
    let currentSilenceStart = -1;

    // Find first and last sound index for excluding leading/trailing
    const firstSoundIndex = chunks.indexOf(1);
    const lastSoundIndex = chunks.lastIndexOf(1);

    for (let i = 0; i < numChunks; i++) {
      if (chunks[i] === 0) {
        if (currentSilenceStreak === 0) {
          currentSilenceStart = i;
        }
        currentSilenceStreak++;
      } else {
        if (currentSilenceStreak > 0) {
          // Only record silence segments that are NOT leading or trailing
          if (i > firstSoundIndex && currentSilenceStart < lastSoundIndex) {
            const duration = currentSilenceStreak * (chunkSizeMs / 1000);
            const startTime = currentSilenceStart * (chunkSizeMs / 1000);
            const endTime = i * (chunkSizeMs / 1000);

            silenceSegments.push({
              startTime,
              endTime,
              duration
            });
          }

          if (currentSilenceStreak > longestSilenceStreak) {
            longestSilenceStreak = currentSilenceStreak;
          }
          currentSilenceStreak = 0;
          currentSilenceStart = -1;
        }
      }
    }

    // Check trailing silence for longest streak
    if (currentSilenceStreak > longestSilenceStreak) {
      longestSilenceStreak = currentSilenceStreak;
    }

    const longestSilence = longestSilenceStreak * (chunkSizeMs / 1000);

    // Step 4: Find leading and trailing silence from the *filtered* chunks
    let leadingSilence = 0;
    let trailingSilence = 0;

    if (firstSoundIndex === -1) {
      // Entire file is silent
      leadingSilence = length / sampleRate;
      trailingSilence = length / sampleRate;
    } else {
      leadingSilence = firstSoundIndex * (chunkSizeMs / 1000);
      trailingSilence = (numChunks - 1 - lastSoundIndex) * (chunkSizeMs / 1000);

      // Add leading silence to segments if significant
      if (leadingSilence > 0) {
        silenceSegments.push({
          startTime: 0,
          endTime: leadingSilence,
          duration: leadingSilence,
          type: 'leading'
        });
      }

      // Add trailing silence to segments if significant
      if (trailingSilence > 0) {
        const fileEndTime = (numChunks * chunkSizeMs) / 1000;
        silenceSegments.push({
          startTime: fileEndTime - trailingSilence,
          endTime: fileEndTime,
          duration: trailingSilence,
          type: 'trailing'
        });
      }
    }

    // Sort silence segments by duration (longest first) - now includes leading/trailing
    silenceSegments.sort((a, b) => b.duration - a.duration);

    return {
      leadingSilence: leadingSilence,
      trailingSilence: trailingSilence,
      longestSilence: longestSilence,
      silenceSegments: silenceSegments
    };
  }

  async estimateReverb(channelDataArray, channels, length, sampleRate, noiseFloorDb) { // Renamed channelData to channelDataArray
    const minDbAboveNoise = 10;
    const onsetThreshold = 1.5;
    const onsetWindowSize = 1024;
    const decayWindowSize = Math.floor(sampleRate * 0.02); // 20ms windows for decay
    const decayThresholdDb = -25;

            let allDecayTimes = []; // Collect decay times from all channels for overall median
            let perChannelResults = []; // Collect per-channel results
    
            for (let channelIndex = 0; channelIndex < channels; channelIndex++) { // Loop through all channels
              const data = channelDataArray[channelIndex]; // Get data for current channel
              let decayTimesForChannel = []; // Collect decay times for this specific channel
              let prevRms = 0; // Reset prevRms for each channel
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
          const MAX_DECAY_LOOP_ITERATIONS = 1000; // Emergency brake
          let decayLoopCount = 0; // New counter

          // New decay logic: Use RMS windows instead of raw samples
          for (let j = peakIndex; j < length - decayWindowSize; j += decayWindowSize) {
            if (decayLoopCount++ > MAX_DECAY_LOOP_ITERATIONS) {
              break; // Emergency brake
            }
            let decaySumSquares = 0;
            for (let k = j; k < j + decayWindowSize; k++) {
              decaySumSquares += data[k] * data[k];
            }
            const decayRms = Math.sqrt(decaySumSquares / decayWindowSize);
            const currentDecayDb = decayRms > 0 ? 20 * Math.log10(decayRms) : -120;

            // Allow UI to update in this deep loop
            if (j % 100000 === 0) { // Yield every 100K samples
              await new Promise(resolve => setTimeout(resolve, 1));
            }

            if (currentDecayDb < peakDb + decayThresholdDb) {
              decayEndSample = j;
              break;
            }
          }

          if (decayEndSample !== -1) {
            const decayDurationSeconds = (decayEndSample - peakIndex) / sampleRate;
            if (decayDurationSeconds > 0) {
              const rt60 = decayDurationSeconds * (60 / Math.abs(decayThresholdDb));
              decayTimesForChannel.push(rt60); // Push to this channel's decay times
            }
          }
        }
      }
      prevRms = currentRms;

          // Allow UI to update
          if (i % 100000 === 0) { // Yield every 100K samples
            await new Promise(resolve => setTimeout(resolve, 1));
          }
        }

        // Calculate median RT60 for the current channel
        let medianRt60ForChannel = 0;
        if (decayTimesForChannel.length > 0) {
          decayTimesForChannel.sort((a, b) => a - b);
          const mid = Math.floor(decayTimesForChannel.length / 2);
          medianRt60ForChannel = decayTimesForChannel.length % 2 !== 0
            ? decayTimesForChannel[mid]
            : (decayTimesForChannel[mid - 1] + decayTimesForChannel[mid]) / 2;
        }
        perChannelResults.push({
          channelIndex,
          channelName: ['left', 'right'][channelIndex] || `channel ${channelIndex}`,
          medianRt60: medianRt60ForChannel
        });
        allDecayTimes.push(...decayTimesForChannel); // Aggregate for overall median
      } // Close the outer loop for channels

    if (allDecayTimes.length < 1) {
      return 0;
    }

    allDecayTimes.sort((a, b) => a - b);
    const mid = Math.floor(allDecayTimes.length / 2);
    const medianRt60 = allDecayTimes.length % 2 !== 0
      ? allDecayTimes[mid]
      : (allDecayTimes[mid - 1] + allDecayTimes[mid]) / 2;

    return {
      overallMedianRt60: medianRt60,
      perChannelRt60: perChannelResults
    };
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

    // Group consecutive blocks into segments for cleaner display
    const bleedSegments = [];
    if (confirmedBleedBlocks.length > 0) {
      // Sort by timestamp
      const sortedBlocks = [...confirmedBleedBlocks].sort((a, b) => a.timestamp - b.timestamp);

      let currentSegment = {
        startTime: sortedBlocks[0].timestamp,
        endTime: sortedBlocks[0].endSample / sampleRate,
        maxCorrelation: sortedBlocks[0].correlation,
        minSeparation: sortedBlocks[0].separation,
        blockCount: 1
      };

      for (let i = 1; i < sortedBlocks.length; i++) {
        const block = sortedBlocks[i];
        const prevBlock = sortedBlocks[i - 1];

        // If blocks are consecutive (within 1 second), merge into same segment
        if (block.timestamp - prevBlock.endSample / sampleRate < 1.0) {
          currentSegment.endTime = block.endSample / sampleRate;
          currentSegment.maxCorrelation = Math.max(currentSegment.maxCorrelation, block.correlation);
          currentSegment.minSeparation = Math.min(currentSegment.minSeparation, block.separation);
          currentSegment.blockCount++;
        } else {
          // Start a new segment
          bleedSegments.push(currentSegment);
          currentSegment = {
            startTime: block.timestamp,
            endTime: block.endSample / sampleRate,
            maxCorrelation: block.correlation,
            minSeparation: block.separation,
            blockCount: 1
          };
        }
      }

      // Push the last segment
      bleedSegments.push(currentSegment);

      // Sort by worst correlation first
      bleedSegments.sort((a, b) => b.maxCorrelation - a.maxCorrelation);
    }

    // Calculate severity score (similar to Channel Consistency)
    // Normalize correlation (0.3-1.0 range) to 0-100 scale
    const avgCorrelation = confirmedBleedBlocks.length > 0
      ? confirmedBleedBlocks.reduce((sum, block) => sum + block.correlation, 0) / confirmedBleedBlocks.length
      : 0;

    // Severity = (percentage of blocks affected) * (normalized correlation score)
    // Higher correlation = worse bleed
    const normalizedCorrelation = Math.min(100, ((avgCorrelation - 0.3) / 0.7) * 100);
    const severityScore = (percentageConfirmedBleed / 100) * normalizedCorrelation;

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
        worstBlocks: confirmedBleedBlocks.slice(0, 5), // Top 5 worst instances
        // NEW: Segment-level details
        bleedSegments: bleedSegments,
        severityScore: severityScore,
        avgCorrelation: avgCorrelation,
        peakCorrelation: confirmedBleedBlocks.length > 0
          ? Math.max(...confirmedBleedBlocks.map(b => b.correlation))
          : 0
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

  /**
   * Unified conversational audio analysis (single-pass optimization).
   * Analyzes overlapping speech and channel consistency.
   * @param {AudioBuffer} audioBuffer The audio buffer to analyze.
   * @param {number} noiseFloorDb Noise floor in dB.
   * @param {number} peakDb Peak level in dB.
   * @returns {object|null} Combined analysis results, or null if not stereo.
   */
  analyzeConversationalAudio(audioBuffer, noiseFloorDb, peakDb) {
    // Validate inputs
    if (!audioBuffer || audioBuffer.numberOfChannels !== 2) {
      return null;
    }

    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = audioBuffer.getChannelData(1);
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;

    // Skip very short files (< 1 second)
    if (length < sampleRate) {
      return null;
    }

    // Single pass: calculate RMS blocks once for efficiency
    const blockSize = Math.floor(sampleRate * 0.25); // 250ms blocks
    const rmsBlocks = [];

    for (let i = 0; i < length; i += blockSize) {
      const blockEnd = Math.min(i + blockSize, length);
      const currentBlockSize = blockEnd - i;

      let sumSquaresLeft = 0;
      let sumSquaresRight = 0;

      for (let j = i; j < blockEnd; j++) {
        sumSquaresLeft += leftChannel[j] * leftChannel[j];
        sumSquaresRight += rightChannel[j] * rightChannel[j];
      }

      const rmsLeft = Math.sqrt(sumSquaresLeft / currentBlockSize);
      const rmsRight = Math.sqrt(sumSquaresRight / currentBlockSize);

      rmsBlocks.push({ rmsLeft, rmsRight, startSample: i, endSample: blockEnd });
    }

    // Run both analyses using the same RMS data
    const overlap = this.analyzeOverlappingSpeech(noiseFloorDb, rmsBlocks);
    const consistency = this.analyzeChannelConsistency(rmsBlocks);

    return {
      overlap,
      consistency
    };
  }

  /**
   * Analyzes overlapping speech in conversational stereo audio.
   * @param {number} noiseFloorDb Noise floor in dB.
   * @param {Array} rmsBlocks Pre-calculated RMS blocks.
   * @returns {object} Overlap analysis results.
   */
  analyzeOverlappingSpeech(noiseFloorDb, rmsBlocks) {
    // Speech threshold: noise floor + 20 dB (active speech level)
    const speechThresholdDb = noiseFloorDb + 20;
    const speechThresholdLinear = Math.pow(10, speechThresholdDb / 20);
    const blockDuration = 0.25; // 250ms per block
    const minOverlapDuration = 0.5; // 500ms minimum to count as significant overlap (filters brief interjections)
    const minOverlapBlocks = Math.ceil(minOverlapDuration / blockDuration); // 2 blocks

    // Calculate sample rate from first block
    const sampleRate = rmsBlocks.length > 0
      ? (rmsBlocks[0].endSample - rmsBlocks[0].startSample) / blockDuration
      : 44100; // fallback

    let totalActiveBlocks = 0;
    let overlapBlocks = 0;
    const overlapSegments = [];

    let currentOverlapSegment = null;

    for (let i = 0; i < rmsBlocks.length; i++) {
      const block = rmsBlocks[i];
      const { rmsLeft, rmsRight, startSample, endSample } = block;

      // Check if BOTH channels have active speech
      const leftActive = rmsLeft > speechThresholdLinear;
      const rightActive = rmsRight > speechThresholdLinear;

      if (leftActive || rightActive) {
        totalActiveBlocks++;

        if (leftActive && rightActive) {
          // Overlap detected in this block
          if (currentOverlapSegment === null) {
            // Start a new overlap segment
            currentOverlapSegment = {
              startBlock: i,
              startSample: startSample,
              blockCount: 1
            };
          } else {
            // Continue current overlap segment
            currentOverlapSegment.blockCount++;
          }
        } else {
          // No overlap in this block - end current segment if exists
          if (currentOverlapSegment !== null) {
            // Only count overlaps that meet minimum duration
            if (currentOverlapSegment.blockCount >= minOverlapBlocks) {
              const prevBlock = rmsBlocks[i - 1];
              overlapBlocks += currentOverlapSegment.blockCount;
              overlapSegments.push({
                startTime: currentOverlapSegment.startSample / sampleRate,
                endTime: prevBlock.endSample / sampleRate,
                blockCount: currentOverlapSegment.blockCount,
                duration: currentOverlapSegment.blockCount * blockDuration
              });
            }
            currentOverlapSegment = null;
          }
        }
      } else {
        // No active speech - end overlap segment if exists
        if (currentOverlapSegment !== null) {
          if (currentOverlapSegment.blockCount >= minOverlapBlocks) {
            const prevBlock = rmsBlocks[i - 1];
            overlapBlocks += currentOverlapSegment.blockCount;
            overlapSegments.push({
              startTime: currentOverlapSegment.startSample / sampleRate,
              endTime: prevBlock.endSample / sampleRate,
              blockCount: currentOverlapSegment.blockCount,
              duration: currentOverlapSegment.blockCount * blockDuration
            });
          }
          currentOverlapSegment = null;
        }
      }
    }

    // Handle final overlap segment if file ends during overlap
    if (currentOverlapSegment !== null && currentOverlapSegment.blockCount >= minOverlapBlocks) {
      const lastBlock = rmsBlocks[rmsBlocks.length - 1];
      overlapBlocks += currentOverlapSegment.blockCount;
      overlapSegments.push({
        startTime: currentOverlapSegment.startSample / sampleRate,
        endTime: lastBlock.endSample / sampleRate,
        blockCount: currentOverlapSegment.blockCount,
        duration: currentOverlapSegment.blockCount * blockDuration
      });
    }

    const overlapPercentage = totalActiveBlocks > 0
      ? (overlapBlocks / totalActiveBlocks) * 100
      : 0;

    return {
      totalActiveBlocks,
      overlapBlocks,
      overlapPercentage,
      speechThresholdDb,
      overlapSegments,
      minOverlapDuration
    };
  }

  /**
   * Helper function to calculate median of an array.
   * @param {Array} arr Array of numbers.
   * @returns {number} Median value.
   */
  median(arr) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Analyzes channel consistency (detects channel swapping).
   * @param {Array} rmsBlocks Pre-calculated RMS blocks.
   * @returns {object} Consistency analysis results.
   */
  analyzeChannelConsistency(rmsBlocks) {
    const dominanceRatioThreshold = 2.0;
    const silenceThreshold = 0.001;
    const swapConfidenceThreshold = 0.5;
    const segmentDuration = 15; // 15 seconds per segment
    const blockDuration = 0.25; // 250ms per block
    const blocksPerSegment = Math.floor(segmentDuration / blockDuration); // 60 blocks

    // Pass 1: Collect volume profiles from all segments
    // Segment by TIME, not by active speech blocks
    const segmentProfiles = [];
    const allSegmentsStatus = [];

    for (let segmentStart = 0; segmentStart < rmsBlocks.length; segmentStart += blocksPerSegment) {
      const segmentEnd = Math.min(segmentStart + blocksPerSegment, rmsBlocks.length);
      const leftRms = [];
      const rightRms = [];

      // Process all blocks in this time segment
      for (let i = segmentStart; i < segmentEnd; i++) {
        const block = rmsBlocks[i];
        const { rmsLeft, rmsRight } = block;

        // Skip silent blocks when collecting RMS
        if (rmsLeft < silenceThreshold && rmsRight < silenceThreshold) {
          continue;
        }

        // Check dominance and collect RMS values
        const ratio = rmsLeft > 0 && rmsRight > 0 ? rmsLeft / rmsRight : 0;
        if (ratio > dominanceRatioThreshold) {
          leftRms.push(rmsLeft);
        } else if (ratio > 0 && ratio < 1 / dominanceRatioThreshold) {
          rightRms.push(rmsRight);
        }
      }

      // Add segment status
      allSegmentsStatus.push({ status: 'NoClearDominance' });

      // Only create profile if segment has speech
      if (leftRms.length > 0 || rightRms.length > 0) {
        segmentProfiles.push({
          l: this.median(leftRms),
          r: this.median(rightRms),
          segmentIndex: allSegmentsStatus.length - 1,
          startBlock: segmentStart,
          endBlock: segmentEnd - 1
        });
      }
    }

    // Need at least 2 segments to compare
    if (segmentProfiles.length < 2) {
      return {
        isConsistent: true,
        consistencyPercentage: 100,
        totalSegments: allSegmentsStatus.length,
        totalSegmentsChecked: 0,
        inconsistentSegments: 0,
        severityScore: 0,
        avgConfidence: 0,
        baselineProfile: { left: 0, right: 0 },
        segments: allSegmentsStatus,
        inconsistentSegmentDetails: []
      };
    }

    // Pass 2: Determine majority baseline (voting between two hypotheses)
    let totalL = 0, totalR = 0;
    segmentProfiles.forEach(p => {
      totalL += p.l;
      totalR += p.r;
    });
    const avgL = totalL / segmentProfiles.length;
    const avgR = totalR / segmentProfiles.length;

    const hypothesisA = { l: avgL, r: avgR };
    const hypothesisB = { l: avgR, r: avgL }; // Swapped

    let votesA = 0, votesB = 0;
    segmentProfiles.forEach(p => {
      const distA = Math.abs(p.l - hypothesisA.l) + Math.abs(p.r - hypothesisA.r);
      const distB = Math.abs(p.l - hypothesisB.l) + Math.abs(p.r - hypothesisB.r);
      if (distA < distB) {
        votesA++;
      } else {
        votesB++;
      }
    });

    const majorityBaseline = votesA > votesB ? hypothesisA : hypothesisB;
    const minorityBaseline = votesA > votesB ? hypothesisB : hypothesisA;

    // Pass 3: Identify inconsistent segments
    let inconsistentSegments = 0;
    const inconsistentSegmentDetails = [];

    segmentProfiles.forEach(p => {
      const distMajority = Math.abs(p.l - majorityBaseline.l) + Math.abs(p.r - majorityBaseline.r);
      const distMinority = Math.abs(p.l - minorityBaseline.l) + Math.abs(p.r - minorityBaseline.r);

      if (distMinority < distMajority * swapConfidenceThreshold) {
        // Calculate confidence
        const distRatio = distMinority / distMajority;
        const confidence = Math.min(100, ((swapConfidenceThreshold - distRatio) / swapConfidenceThreshold) * 100);

        // Calculate timestamps (approximate based on block positions)
        const startTime = p.startBlock * blockDuration;
        const endTime = p.endBlock * blockDuration;

        allSegmentsStatus[p.segmentIndex].status = 'Inconsistent';
        allSegmentsStatus[p.segmentIndex].confidence = confidence;
        allSegmentsStatus[p.segmentIndex].startTime = startTime;
        allSegmentsStatus[p.segmentIndex].endTime = endTime;

        inconsistentSegments++;
        inconsistentSegmentDetails.push({
          segmentNumber: p.segmentIndex + 1,
          startTime,
          endTime,
          confidence,
          profile: { left: p.l, right: p.r }
        });
      } else {
        allSegmentsStatus[p.segmentIndex].status = 'Consistent';
      }
    });

    const totalSegmentsChecked = segmentProfiles.length;
    const consistencyPercentage = totalSegmentsChecked > 0
      ? ((totalSegmentsChecked - inconsistentSegments) / totalSegmentsChecked) * 100
      : 100;

    // Calculate overall severity score
    const avgConfidence = inconsistentSegmentDetails.length > 0
      ? inconsistentSegmentDetails.reduce((sum, seg) => sum + seg.confidence, 0) / inconsistentSegmentDetails.length
      : 0;
    const severityScore = (inconsistentSegments / totalSegmentsChecked) * avgConfidence;

    return {
      isConsistent: inconsistentSegments === 0,
      consistencyPercentage,
      totalSegments: allSegmentsStatus.length,
      totalSegmentsChecked,
      inconsistentSegments,
      severityScore,
      avgConfidence,
      baselineProfile: {
        left: majorityBaseline.l,
        right: majorityBaseline.r
      },
      segments: allSegmentsStatus,
      inconsistentSegmentDetails
    };
  }

  /**
   * Analyzes clipping in an audio buffer.
   * Detects hard clipping (±1.0) and near-clipping (0.98-0.999) with gap tolerance.
   * @param {AudioBuffer} audioBuffer The audio buffer to analyze.
   * @param {number} sampleRate Sample rate of the audio.
   * @param {function} progressCallback Optional progress callback.
   * @returns {object} Clipping analysis results with per-channel breakdown.
   */
  async analyzeClipping(audioBuffer, sampleRate, progressCallback = null) {
    const channels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;

    // Calculate adaptive threshold based on sample rate
    const minConsecutiveSamples = Math.max(2, Math.floor(sampleRate / 20000));
    const maxGapSamples = 3; // Allow up to 3 samples below threshold in a region

    // Thresholds
    // Hard clipping: >= 0.985 (catches severe distortion from over-driven recordings)
    // This is approximately -0.13 dB from full scale
    // Catches clipped audio that was normalized/limited slightly below 0 dB
    const hardClippingThreshold = 0.985;
    const nearClippingThreshold = 0.98;

    // Safety limit: Cap number of regions to prevent memory issues
    const MAX_REGIONS_PER_CHANNEL = 5000; // Reasonable limit for even extreme cases
    const MAX_TOTAL_REGIONS = 10000; // Total regions across all channels
    const MAX_CLIPPED_SAMPLES_PER_CHANNEL = 20000000; // Emergency brake for extreme files

    // Channel names
    const channelNames = ['left', 'right', 'center', 'LFE', 'surroundLeft', 'surroundRight'];

    // Overall statistics
    let totalClippedSamples = 0;
    let totalNearClippingSamples = 0;
    const allRegions = [];
    const perChannelStats = [];
    let regionsLimitReached = false;

    // Process each channel
    for (let channel = 0; channel < channels; channel++) {
      const data = audioBuffer.getChannelData(channel);
      const channelName = channelNames[channel] || `channel${channel}`;

      // Channel-specific counters
      let channelClippedSamples = 0;
      let channelNearClippingSamples = 0;
      const channelRegions = [];

      // Separate counters for region counts (continue counting even after hitting storage limit)
      let channelHardRegionCount = 0;
      let channelNearRegionCount = 0;

      // Tracking variables for region detection
      let currentHardRegion = null;
      let currentNearRegion = null;
      let gapCounter = 0;

      // Iterate through all samples
      for (let i = 0; i < length; i++) {
        // Cancellation support
        if (!this.analysisInProgress) {
          throw new Error('Analysis cancelled');
        }

        const absSample = Math.abs(data[i]);

        // Check for hard clipping (samples >= 0.9999)
        if (absSample >= hardClippingThreshold) {
          if (currentHardRegion === null) {
            // Start new hard clipping region
            currentHardRegion = {
              startSample: i,
              endSample: i,
              sampleCount: 1,
              peakSample: absSample,
              type: 'hard',
              channel,
              channelName,
              gapCount: 0
            };
          } else {
            // Continue current region
            currentHardRegion.endSample = i;
            currentHardRegion.sampleCount++;
            currentHardRegion.peakSample = Math.max(currentHardRegion.peakSample, absSample);
            gapCounter = 0; // Reset gap counter
          }
          channelClippedSamples++;

          // EMERGENCY BRAKE: Bail out if a channel has an excessive number of clipped samples.
          if (channelClippedSamples > MAX_CLIPPED_SAMPLES_PER_CHANNEL) {
            regionsLimitReached = true;
            break;
          }
        } else if (currentHardRegion !== null) {
          // We're in a region but this sample isn't clipped
          gapCounter++;

          if (gapCounter <= maxGapSamples) {
            // Within gap tolerance, continue region
            currentHardRegion.endSample = i;
            currentHardRegion.gapCount++;
          } else {
            // Gap too large, end region
            if (currentHardRegion.sampleCount >= minConsecutiveSamples) {
              // Region is significant enough to record
              channelHardRegionCount++; // Always increment counter

              // Only store region object if we haven't reached the limit
              if (channelRegions.length < MAX_REGIONS_PER_CHANNEL) {
                channelRegions.push({...currentHardRegion});
              } else {
                regionsLimitReached = true;
              }
            }
            currentHardRegion = null;
            gapCounter = 0;
          }
        }

        // Check for near-clipping (0.98 <= |sample| < 1.0)
        if (absSample >= nearClippingThreshold && absSample < hardClippingThreshold) {
          if (currentNearRegion === null) {
            // Start new near-clipping region
            currentNearRegion = {
              startSample: i,
              endSample: i,
              sampleCount: 1,
              peakSample: absSample,
              type: 'near',
              channel,
              channelName,
              gapCount: 0
            };
          } else {
            // Continue current region
            currentNearRegion.endSample = i;
            currentNearRegion.sampleCount++;
            currentNearRegion.peakSample = Math.max(currentNearRegion.peakSample, absSample);
          }
          channelNearClippingSamples++;

          // EMERGENCY BRAKE: Bail out for excessive near-clipping as well.
          if (channelNearClippingSamples > MAX_CLIPPED_SAMPLES_PER_CHANNEL) {
            regionsLimitReached = true;
            break;
          }
        } else if (currentNearRegion !== null && absSample < nearClippingThreshold) {
          // End near-clipping region (no gap tolerance for near-clipping)
          if (currentNearRegion.sampleCount >= minConsecutiveSamples) {
            channelNearRegionCount++; // Always increment counter

            // Only store region object if we haven't reached the limit
            if (channelRegions.length < MAX_REGIONS_PER_CHANNEL) {
              channelRegions.push({...currentNearRegion});
            } else {
              regionsLimitReached = true;
            }
          }
          currentNearRegion = null;
        }

        // Progress updates
        if (i % 10000 === 0) {
          // OPTIMIZATION: Bail out early if the region limit is hit.
          if (regionsLimitReached) {
            break;
          }

          const progress = (channel * length + i) / (channels * length);
          if (progressCallback) {
            progressCallback('Detecting clipping...', progress);
          }

          // UI yield every 100K samples
          if (i % 100000 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1));
          }
        }
      }

      // Handle any remaining regions at end of file
      if (currentHardRegion !== null && currentHardRegion.sampleCount >= minConsecutiveSamples) {
        channelHardRegionCount++; // Always increment counter

        if (channelRegions.length < MAX_REGIONS_PER_CHANNEL) {
          channelRegions.push(currentHardRegion);
        } else {
          regionsLimitReached = true;
        }
      }
      if (currentNearRegion !== null && currentNearRegion.sampleCount >= minConsecutiveSamples) {
        channelNearRegionCount++; // Always increment counter

        if (channelRegions.length < MAX_REGIONS_PER_CHANNEL) {
          channelRegions.push(currentNearRegion);
        } else {
          regionsLimitReached = true;
        }
      }

      // Add timestamps to regions
      channelRegions.forEach(region => {
        region.startTime = region.startSample / sampleRate;
        region.endTime = region.endSample / sampleRate;
        region.duration = region.endTime - region.startTime;
      });

      // Accumulate totals
      totalClippedSamples += channelClippedSamples;
      totalNearClippingSamples += channelNearClippingSamples;

      // Use concat instead of spread operator to avoid stack overflow with large arrays
      // Check total regions limit before adding
      if (allRegions.length < MAX_TOTAL_REGIONS) {
        const remainingSpace = MAX_TOTAL_REGIONS - allRegions.length;
        const regionsToAdd = channelRegions.slice(0, remainingSpace);
        allRegions.push(...regionsToAdd);

        if (channelRegions.length > remainingSpace) {
          regionsLimitReached = true;
        }
      } else {
        regionsLimitReached = true;
      }

      // Per-channel statistics (use dedicated counters, not filtered array)
      perChannelStats.push({
        channel,
        name: channelName,
        clippedSamples: channelClippedSamples,
        clippedPercentage: (channelClippedSamples / length) * 100,
        nearClippingSamples: channelNearClippingSamples,
        nearClippingPercentage: (channelNearClippingSamples / length) * 100,
        regionCount: channelHardRegionCount + channelNearRegionCount,
        hardClippingRegions: channelHardRegionCount,
        nearClippingRegions: channelNearRegionCount
      });
    }

    // Calculate overall statistics
    const totalSamples = channels * length;
    const clippedPercentage = (totalClippedSamples / totalSamples) * 100;
    const nearClippingPercentage = (totalNearClippingSamples / totalSamples) * 100;

    // Separate hard and near clipping regions
    const hardClippingRegions = allRegions.filter(r => r.type === 'hard');
    const nearClippingRegions = allRegions.filter(r => r.type === 'near');

    // Sort regions by duration (longest first)
    hardClippingRegions.sort((a, b) => b.duration - a.duration);
    nearClippingRegions.sort((a, b) => b.duration - a.duration);

    // Calculate density metrics using dedicated counters (not capped arrays)
    const clippingEventCount = perChannelStats.reduce((sum, ch) => sum + ch.hardClippingRegions, 0);
    const nearClippingEventCount = perChannelStats.reduce((sum, ch) => sum + ch.nearClippingRegions, 0);

    const maxConsecutiveClipped = hardClippingRegions.reduce((max, r) => Math.max(max, r.sampleCount), 0);

    const avgClippingDuration = hardClippingRegions.length > 0
      ? hardClippingRegions.reduce((sum, r) => sum + r.duration, 0) / hardClippingRegions.length
      : 0;

    // Combine regions for sorted list (prioritize hard clipping)
    const clippingRegions = [
      ...hardClippingRegions.slice(0, 10), // Top 10 hard clipping
      ...nearClippingRegions.slice(0, 5)   // Top 5 near clipping
    ].sort((a, b) => {
      // Hard clipping always comes first
      if (a.type === 'hard' && b.type === 'near') return -1;
      if (a.type === 'near' && b.type === 'hard') return 1;
      // Within same type, sort by duration
      return b.duration - a.duration;
    });

    return {
      // Overall statistics
      clippedSamples: totalClippedSamples,
      clippedPercentage,
      nearClippingSamples: totalNearClippingSamples,
      nearClippingPercentage,

      // Density metrics
      clippingEventCount,
      nearClippingEventCount,
      maxConsecutiveClipped,
      avgClippingDuration,

      // Per-channel breakdown
      perChannel: perChannelStats,

      // Detailed regions (top instances only)
      clippingRegions,

      // Separate lists for detailed analysis if needed
      hardClippingRegions,
      nearClippingRegions,

      // Warning flag for extreme clipping cases
      regionsLimitReached,
      maxRegionsPerChannel: MAX_REGIONS_PER_CHANNEL,
      maxTotalRegions: MAX_TOTAL_REGIONS
    };
  }

}