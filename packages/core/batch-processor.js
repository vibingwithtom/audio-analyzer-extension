/**
 * Batch Audio Processing Engine
 * Header-only analysis for processing large numbers of files efficiently
 */

export class StreamingAudioAnalyzer {
  /**
   * Analyze only file headers (first ~100KB) for quick batch processing
   * @param {File} file - The audio file to analyze
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeHeaders(file) {
    // Only read first 100KB containing metadata
    const headerChunk = file.slice(0, 100 * 1024);
    const arrayBuffer = await headerChunk.arrayBuffer();
    const view = new DataView(arrayBuffer);

    const result = {
      filename: file.name,
      fileSize: file.size,
      fileType: this.getFileType(file.name)
    };

    // Parse based on file type
    if (file.name.toLowerCase().endsWith('.wav')) {
      Object.assign(result, this.parseWavHeaders(view));
    } else if (file.name.toLowerCase().endsWith('.mp3')) {
      Object.assign(result, this.parseMp3Headers(view));
    } else if (file.name.toLowerCase().endsWith('.flac')) {
      Object.assign(result, this.parseFlacHeaders(view));
    } else {
      // Unknown format - set defaults
      result.sampleRate = 'Unknown';
      result.bitDepth = 'Unknown';
      result.channels = 'Unknown';
      result.duration = 'Unknown';
    }

    return result;
  }

  parseWavHeaders(view) {
    try {
      // Check for RIFF header
      const riffHeader = String.fromCharCode(
        view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)
      );
      if (riffHeader !== 'RIFF') {
        throw new Error('Not a valid WAV file');
      }

      // Check for WAVE format
      const waveHeader = String.fromCharCode(
        view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11)
      );
      if (waveHeader !== 'WAVE') {
        throw new Error('Not a valid WAV file');
      }

      // Find fmt chunk
      let offset = 12;
      while (offset < view.byteLength - 8) {
        const chunkId = String.fromCharCode(
          view.getUint8(offset), view.getUint8(offset + 1),
          view.getUint8(offset + 2), view.getUint8(offset + 3)
        );
        const chunkSize = view.getUint32(offset + 4, true);

        if (chunkId === 'fmt ') {
          const audioFormat = view.getUint16(offset + 8, true);
          const channels = view.getUint16(offset + 10, true);
          const sampleRate = view.getUint32(offset + 12, true);
          const bitsPerSample = view.getUint16(offset + 22, true);

          // Calculate duration from file size (estimate)
          const byteRate = view.getUint32(offset + 16, true);
          const duration = byteRate > 0 ? view.byteLength / byteRate : 'Unknown';

          return {
            sampleRate,
            channels,
            bitDepth: bitsPerSample,
            duration: typeof duration === 'number' ? duration : 'Unknown',
            audioFormat
          };
        }

        offset += 8 + chunkSize;
      }

      throw new Error('fmt chunk not found');
    } catch (error) {
      return {
        sampleRate: 'Unknown',
        channels: 'Unknown',
        bitDepth: 'Unknown',
        duration: 'Unknown'
      };
    }
  }

  parseMp3Headers(view) {
    try {
      // Look for MP3 frame header
      let offset = 0;
      while (offset < view.byteLength - 4) {
        if (view.getUint8(offset) === 0xFF && (view.getUint8(offset + 1) & 0xE0) === 0xE0) {
          // Found frame sync
          const header = view.getUint32(offset, false);

          // Parse version (MPEG version)
          const version = (header >> 19) & 0x03;

          // Parse layer
          const layer = (header >> 17) & 0x03;

          // Parse bitrate index
          const bitrateIndex = (header >> 12) & 0x0F;

          // Parse sample rate index
          const sampleRateIndex = (header >> 10) & 0x03;

          // Parse channel mode
          const channelMode = (header >> 6) & 0x03;

          const sampleRates = [44100, 48000, 32000];
          const channels = channelMode === 3 ? 1 : 2;

          return {
            sampleRate: sampleRates[sampleRateIndex] || 'Unknown',
            channels,
            bitDepth: 'Compressed (variable)',
            duration: 'Unknown' // Would need full file scan
          };
        }
        offset++;
      }

      throw new Error('No MP3 frame found');
    } catch (error) {
      return {
        sampleRate: 'Unknown',
        channels: 'Unknown',
        bitDepth: 'Compressed (variable)',
        duration: 'Unknown'
      };
    }
  }

  parseFlacHeaders(view) {
    try {
      // Check for fLaC marker
      const flacMarker = String.fromCharCode(
        view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)
      );

      if (flacMarker !== 'fLaC') {
        throw new Error('Not a valid FLAC file');
      }

      // Read STREAMINFO block (first metadata block)
      const blockHeader = view.getUint8(4);
      const isLast = (blockHeader & 0x80) !== 0;
      const blockType = blockHeader & 0x7F;

      if (blockType === 0) { // STREAMINFO
        const minBlockSize = view.getUint16(5, false);
        const maxBlockSize = view.getUint16(7, false);

        // Sample rate is 20 bits starting at byte 18
        const sampleRateHigh = view.getUint16(18, false);
        const sampleRateLow = view.getUint8(20);
        const sampleRate = (sampleRateHigh << 4) | (sampleRateLow >> 4);

        // Channels: 3 bits
        const channels = ((sampleRateLow >> 1) & 0x07) + 1;

        // Bits per sample: 5 bits
        const bitsPerSample = (((sampleRateLow & 0x01) << 4) | (view.getUint8(21) >> 4)) + 1;

        return {
          sampleRate,
          channels,
          bitDepth: bitsPerSample,
          duration: 'Unknown' // Would need to calculate from total samples
        };
      }

      throw new Error('STREAMINFO block not found');
    } catch (error) {
      return {
        sampleRate: 'Unknown',
        channels: 'Unknown',
        bitDepth: 'Unknown',
        duration: 'Unknown'
      };
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
      'ogg': 'OGG'
    };
    return typeMap[extension] || extension.toUpperCase();
  }
}

export class BatchProcessor {
  constructor(validator) {
    this.analyzer = new StreamingAudioAnalyzer();
    this.validator = validator;
    this.cancelled = false;
  }

  /**
   * Process multiple files in batch
   * @param {File[]} files - Array of files to process
   * @param {Object} criteria - Validation criteria
   * @param {Function} progressCallback - Called with progress updates
   * @returns {Promise<Array>} Array of results
   */
  async processBatch(files, criteria, progressCallback) {
    this.cancelled = false;
    const results = [];
    const startTime = Date.now();

    for (let i = 0; i < files.length; i++) {
      if (this.cancelled) {
        break;
      }

      const file = files[i];

      try {
        // Quick header analysis
        const analysis = await this.analyzer.analyzeHeaders(file);

        // Apply validation criteria
        const validation = this.validator.validateResults(analysis, criteria);

        results.push({
          filename: file.name,
          analysis,
          validation,
          status: this.getOverallStatus(validation)
        });

        // Report progress
        if (progressCallback) {
          progressCallback({
            current: i + 1,
            total: files.length,
            currentFile: file.name,
            percentage: ((i + 1) / files.length) * 100,
            elapsedTime: Date.now() - startTime
          });
        }
      } catch (error) {
        results.push({
          filename: file.name,
          analysis: null,
          validation: null,
          status: 'error',
          error: error.message
        });
      }
    }

    return results;
  }

  getOverallStatus(validation) {
    const statuses = Object.values(validation).map(v => v.status);

    if (statuses.includes('fail')) return 'fail';
    if (statuses.includes('warning')) return 'warning';
    return 'pass';
  }

  cancel() {
    this.cancelled = true;
  }
}
