/**
 * Core Adapter for Chrome Extension
 * Bridges the shared core functionality to Chrome extension environment
 * Note: Chrome extensions can't use ES6 modules, so we inline the functionality
 */

// Audio Analyzer functionality (from core/audio-analyzer.js)
class AudioAnalyzer {
  constructor() {
    this.audioContext = null;
    this.audioBuffer = null;
  }

  async analyzeFile(file) {
    const arrayBuffer = await file.arrayBuffer();

    // For WAV files, parse headers first for accurate bit depth
    if (file.name.toLowerCase().endsWith('.wav')) {
      const view = new DataView(arrayBuffer);
      const wavInfo = this.parseWavHeaders(view);

      let fileType = this.getFileType(file.name);
      if (fileType === 'WAV') {
        if (wavInfo.audioFormat === 1) {
          fileType = 'WAV (PCM)';
        } else if (typeof wavInfo.audioFormat === 'number') {
          fileType = `WAV (Compressed - Format ${wavInfo.audioFormat})`;
        } else {
          fileType = 'WAV (Unknown Format)';
        }
      }

      return {
        fileType: fileType,
        sampleRate: wavInfo.sampleRate,
        channels: wavInfo.channels,
        bitDepth: wavInfo.bitDepth,
        duration: wavInfo.duration,
        fileSize: file.size
      };
    }

    // Initialize audio context if needed
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    try {
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      return {
        fileType: this.getFileType(file.name),
        sampleRate: this.audioBuffer.sampleRate,
        channels: this.audioBuffer.numberOfChannels,
        duration: this.audioBuffer.duration,
        fileSize: file.size,
        bitDepth: this.estimateBitDepth(arrayBuffer, file.name)
      };
    } catch (error) {
      // Fallback to header analysis
      return await this.analyzeFileHeaders(arrayBuffer, file.name, file.size);
    }
  }

  async analyzeFileHeaders(arrayBuffer, fileName, fileSize) {
    const view = new DataView(arrayBuffer);
    const results = {
      fileType: this.getFileType(fileName),
      fileSize: fileSize
    };

    if (fileName.toLowerCase().endsWith('.wav')) {
      const wavInfo = this.parseWavHeaders(view);
      Object.assign(results, wavInfo);
    } else {
      results.sampleRate = 'Unknown';
      results.bitDepth = 'Unknown';
      results.channels = 'Unknown';
      results.duration = 'Unknown';
    }

    return results;
  }

  parseWavHeaders(view) {
    try {
      const riffHeader = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
      if (riffHeader !== 'RIFF') {
        throw new Error('Not a valid WAV file');
      }

      const waveHeader = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
      if (waveHeader !== 'WAVE') {
        throw new Error('Not a valid WAV file');
      }

      let offset = 12;
      while (offset < view.byteLength - 8) {
        const chunkId = String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
        const chunkSize = view.getUint32(offset + 4, true);

        if (chunkId === 'fmt ') {
          const audioFormat = view.getUint16(offset + 8, true);
          const channels = view.getUint16(offset + 10, true);
          const sampleRate = view.getUint32(offset + 12, true);
          const bitsPerSample = view.getUint16(offset + 22, true);

          const duration = this.calculateWavDuration(view, sampleRate, channels, bitsPerSample);

          return {
            sampleRate: sampleRate,
            channels: channels,
            bitDepth: bitsPerSample,
            duration: duration,
            audioFormat: audioFormat
          };
        }

        offset += 8 + chunkSize;
      }

      throw new Error('fmt chunk not found');
    } catch (error) {
      console.error('Error parsing WAV headers:', error);
      return {
        sampleRate: 'Unknown',
        channels: 'Unknown',
        bitDepth: 'Unknown',
        duration: 'Unknown',
        audioFormat: 'Unknown'
      };
    }
  }

  calculateWavDuration(view, sampleRate, channels, bitsPerSample) {
    try {
      let offset = 12;
      while (offset < view.byteLength - 8) {
        const chunkId = String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
        const chunkSize = view.getUint32(offset + 4, true);

        if (chunkId === 'data') {
          const bytesPerSample = bitsPerSample / 8;
          const totalSamples = chunkSize / (channels * bytesPerSample);
          return totalSamples / sampleRate;
        }

        offset += 8 + chunkSize;
      }
      return 'Unknown';
    } catch (error) {
      return 'Unknown';
    }
  }

  getFileType(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    const typeMap = {
      'wav': 'WAV',
      'mp3': 'MP3',
      'flac': 'FLAC',
      'aac': 'AAC',
      'm4a': 'M4A',
      'ogg': 'OGG',
      'webm': 'WebM'
    };
    return typeMap[extension] || extension.toUpperCase();
  }

  estimateBitDepth(arrayBuffer, filename) {
    if (filename.toLowerCase().endsWith('.wav')) {
      return 'See WAV analysis';
    }

    const extension = filename.split('.').pop().toLowerCase();
    if (['mp3', 'aac', 'm4a'].includes(extension)) {
      return 'Compressed (variable)';
    }

    return 'Unknown';
  }
}

// Level Analyzer functionality (from core/level-analyzer.js)
class LevelAnalyzer {
  constructor() {
    this.analysisInProgress = false;
  }

  async analyzeAudioBuffer(audioBuffer, progressCallback = null) {
    const sampleRate = audioBuffer.sampleRate;
    const channels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;

    const channelData = [];
    for (let channel = 0; channel < channels; channel++) {
      channelData.push(audioBuffer.getChannelData(channel));
    }

    this.analysisInProgress = true;

    try {
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

          if (i % 10000 === 0) {
            const progress = (channel * length + i) / (channels * length) * 0.5;
            if (progressCallback) progressCallback('Analyzing peak levels...', progress);

            if (i % 100000 === 0) {
              await new Promise(resolve => setTimeout(resolve, 1));
            }
          }
        }
      }

      const peakDb = globalPeak > 0 ? 20 * Math.log10(globalPeak) : -Infinity;

      if (progressCallback) progressCallback('Analyzing noise floor...', 0.5);
      const noiseFloorDb = await this.analyzeNoiseFloor(channelData, channels, length);

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

  async analyzeNoiseFloor(channelData, channels, length) {
    const windowSize = Math.floor(length / 100);
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

    rmsValues.sort((a, b) => a - b);
    const quietSectionCount = Math.floor(rmsValues.length * 0.2);
    const quietRmsValues = rmsValues.slice(0, quietSectionCount);

    const avgQuietRms = quietRmsValues.reduce((sum, rms) => sum + rms, 0) / quietRmsValues.length;
    return avgQuietRms > 0 ? 20 * Math.log10(avgQuietRms) : -Infinity;
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

// Criteria Validator functionality (from core/criteria-validator.js)
class CriteriaValidator {
  static validateResults(results, criteria) {
    const validationResults = {};

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
}

// Google Drive Handler (simplified for Chrome extension)
class GoogleDriveHandler {
  constructor() {
    this.accessToken = null;
  }

  parseGoogleDriveUrl(url) {
    const fileIdPatterns = [
      /\/d\/([a-zA-Z0-9-_]+)/,
      /[?&]id=([a-zA-Z0-9-_]+)/,
      /\/document\/d\/([a-zA-Z0-9-_]+)/,
    ];

    for (const pattern of fileIdPatterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  setAccessToken(token) {
    this.accessToken = token;
  }

  async processUrl(url) {
    const fileId = this.parseGoogleDriveUrl(url);
    if (!fileId) {
      throw new Error('Invalid Google Drive URL');
    }

    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    // Get metadata first
    const metadataResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,size,mimeType`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      }
    );

    if (!metadataResponse.ok) {
      throw new Error(`Google Drive API error: ${metadataResponse.status}`);
    }

    const metadata = await metadataResponse.json();

    // Download file
    const downloadResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      }
    );

    if (!downloadResponse.ok) {
      throw new Error(`Google Drive download error: ${downloadResponse.status}`);
    }

    const blob = await downloadResponse.blob();
    const file = new File([blob], metadata.name, { type: blob.type || metadata.mimeType });

    return { file: file, metadata: metadata };
  }
}

// Combined Engine (from core/index.js)
class AudioAnalyzerEngine {
  constructor() {
    this.audioAnalyzer = new AudioAnalyzer();
    this.levelAnalyzer = new LevelAnalyzer();
    this.googleDrive = new GoogleDriveHandler();
  }

  async analyzeFile(file) {
    return await this.audioAnalyzer.analyzeFile(file);
  }

  async analyzeAdvanced(audioBuffer, progressCallback) {
    return await this.levelAnalyzer.analyzeAudioBuffer(audioBuffer, progressCallback);
  }

  validateCriteria(results, criteria) {
    return CriteriaValidator.validateResults(results, criteria);
  }

  formatResults(results) {
    return CriteriaValidator.formatDisplayText(results);
  }

  cancelAdvancedAnalysis() {
    this.levelAnalyzer.cancelAnalysis();
  }

  async downloadGoogleDriveFile(url, accessToken) {
    this.googleDrive.setAccessToken(accessToken);
    const result = await this.googleDrive.processUrl(url);
    return result.file;
  }

  setGoogleDriveToken(token) {
    this.googleDrive.setAccessToken(token);
  }
}

// Export for Chrome Extension usage
window.AudioAnalyzerCore = {
  AudioAnalyzer,
  LevelAnalyzer,
  CriteriaValidator,
  GoogleDriveHandler,
  AudioAnalyzerEngine
};