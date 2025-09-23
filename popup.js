class AudioAnalyzer {
  constructor() {
    this.audioFile = null;
    this.audioContext = null;
    this.audioBuffer = null;
    this.audioPlayer = document.getElementById('audioPlayer');
    this.fileInput = document.getElementById('audioFile');
    this.playPauseBtn = document.getElementById('playPause');
    this.currentResults = null; // Store current analysis results

    this.initializeEventListeners();
    this.loadSavedCriteria();
  }

  initializeEventListeners() {
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
    this.audioPlayer.addEventListener('loadedmetadata', () => this.updatePlayButton());
    this.audioPlayer.addEventListener('play', () => this.updatePlayButton());
    this.audioPlayer.addEventListener('pause', () => this.updatePlayButton());

    // Add listeners for criteria changes
    document.getElementById('targetSampleRate').addEventListener('change', () => {
      this.saveCriteria();
      this.revalidateCriteria();
    });
    document.getElementById('targetBitDepth').addEventListener('change', () => {
      this.saveCriteria();
      this.revalidateCriteria();
    });
    document.getElementById('targetChannels').addEventListener('change', () => {
      this.saveCriteria();
      this.revalidateCriteria();
    });
    document.getElementById('targetFileType').addEventListener('change', () => {
      this.saveCriteria();
      this.revalidateCriteria();
    });

    // Listen for changes in storage from other parts of the extension
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.targetCriteria) {
        console.log('Popup: Storage changed, reloading criteria...');
        this.loadSavedCriteria();
        this.revalidateCriteria();
      }
    });
  }

  async handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    this.audioFile = file;

    try {
      await this.analyzeFile(file);
      this.setupAudioPlayer(file);
      this.showResults();
    } catch (error) {
      console.error('Error analyzing file:', error);
      alert('Error analyzing audio file. Please try a different file.');
    }
  }

  async analyzeFile(file) {
    const arrayBuffer = await file.arrayBuffer();

    // For WAV files, always parse headers first to get accurate bit depth
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

      const results = {
        fileType: fileType,
        sampleRate: wavInfo.sampleRate,
        channels: wavInfo.channels,
        bitDepth: wavInfo.bitDepth,
        duration: wavInfo.duration,
        fileSize: file.size
      };

      this.currentResults = results; // Store results
      this.displayResults(results);
      this.validateCriteria(results);
      return;
    }

    // Initialize audio context if not already done
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    try {
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      // Get basic audio properties
      const results = {
        fileType: this.getFileType(file.name),
        sampleRate: this.audioBuffer.sampleRate,
        channels: this.audioBuffer.numberOfChannels,
        duration: this.audioBuffer.duration,
        fileSize: file.size,
        bitDepth: this.estimateBitDepth(arrayBuffer, file.name)
      };

      this.currentResults = results; // Store results
      this.displayResults(results);
      this.validateCriteria(results);
    } catch (error) {
      // If decoding fails, try to extract info from file headers
      await this.analyzeFileHeaders(arrayBuffer);
    }
  }

  async analyzeFileHeaders(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    const results = {
      fileType: this.getFileType(this.audioFile.name),
      fileSize: this.audioFile.size
    };

    if (this.audioFile.name.toLowerCase().endsWith('.wav')) {
      // Parse WAV file headers
      const wavInfo = this.parseWavHeaders(view);
      Object.assign(results, wavInfo);
    } else {
      // For other formats, show limited info
      results.sampleRate = 'Unknown';
      results.bitDepth = 'Unknown';
      results.channels = 'Unknown';
      results.duration = 'Unknown';
    }

    this.displayResults(results);
    this.validateCriteria(results);
  }

  parseWavHeaders(view) {
    try {
      // Check for RIFF header
      const riffHeader = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
      if (riffHeader !== 'RIFF') {
        throw new Error('Not a valid WAV file');
      }

      // Check for WAVE format
      const waveHeader = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
      if (waveHeader !== 'WAVE') {
        throw new Error('Not a valid WAV file');
      }

      // Find fmt chunk
      let offset = 12;
      while (offset < view.byteLength - 8) {
        const chunkId = String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
        const chunkSize = view.getUint32(offset + 4, true);

        if (chunkId === 'fmt ') {
          const audioFormat = view.getUint16(offset + 8, true); // This is the field we need!
          const channels = view.getUint16(offset + 10, true);
          const sampleRate = view.getUint32(offset + 12, true);
          const bitsPerSample = view.getUint16(offset + 22, true);

          // Calculate duration from data chunk
          const duration = this.calculateWavDuration(view, sampleRate, channels, bitsPerSample);

          return {
            sampleRate: sampleRate,
            channels: channels,
            bitDepth: bitsPerSample,
            duration: duration,
            audioFormat: audioFormat // Add this to the returned object
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
        audioFormat: 'Unknown' // Add this for error case
      };
    }
  }

  calculateWavDuration(view, sampleRate, channels, bitsPerSample) {
    try {
      // Find data chunk
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

    // For compressed formats, bit depth is complex to determine
    const extension = filename.split('.').pop().toLowerCase();
    if (['mp3', 'aac', 'm4a'].includes(extension)) {
      return 'Compressed (variable)';
    }

    return 'Unknown';
  }

  setupAudioPlayer(file) {
    const url = URL.createObjectURL(file);
    this.audioPlayer.src = url;
    document.getElementById('playerSection').style.display = 'block';
  }

  displayResults(results) {
    document.getElementById('fileType').textContent = results.fileType;
    document.getElementById('sampleRate').textContent = typeof results.sampleRate === 'number'
      ? `${(results.sampleRate / 1000).toFixed(1)} kHz`
      : results.sampleRate;
    document.getElementById('bitDepth').textContent = typeof results.bitDepth === 'number'
      ? `${results.bitDepth}-bit`
      : results.bitDepth;
    document.getElementById('channels').textContent = typeof results.channels === 'number'
      ? `${results.channels} channel${results.channels !== 1 ? 's' : ''}${results.channels === 1 ? ' (Mono)' : results.channels === 2 ? ' (Stereo)' : ''}`
      : results.channels;
    document.getElementById('duration').textContent = typeof results.duration === 'number'
      ? `${results.duration.toFixed(2)} seconds`
      : results.duration;
    document.getElementById('fileSize').textContent = `${(results.fileSize / 1024 / 1024).toFixed(2)} MB`;
  }

  validateCriteria(results) {
    const targetSampleRate = document.getElementById('targetSampleRate').value;
    const targetBitDepth = document.getElementById('targetBitDepth').value;
    const targetChannels = document.getElementById('targetChannels').value;
    const targetFileType = document.getElementById('targetFileType').value;

    // Reset all row styling
    const sampleRateRow = document.getElementById('sampleRateRow');
    const bitDepthRow = document.getElementById('bitDepthRow');
    const channelsRow = document.getElementById('channelsRow');
    const fileTypeRow = document.getElementById('fileTypeRow');

    sampleRateRow.classList.remove('criteria-pass', 'criteria-fail');
    bitDepthRow.classList.remove('criteria-pass', 'criteria-fail');
    channelsRow.classList.remove('criteria-pass', 'criteria-fail');
    fileTypeRow.classList.remove('criteria-pass', 'criteria-fail');

    // Apply validation styling to matching criteria
    if (targetSampleRate) {
      const matches = results.sampleRate === parseInt(targetSampleRate);
      sampleRateRow.classList.add(matches ? 'criteria-pass' : 'criteria-fail');
    }

    if (targetBitDepth) {
      const matches = results.bitDepth === parseInt(targetBitDepth);
      bitDepthRow.classList.add(matches ? 'criteria-pass' : 'criteria-fail');
    }

    if (targetChannels) {
      const matches = results.channels === parseInt(targetChannels);
      channelsRow.classList.add(matches ? 'criteria-pass' : 'criteria-fail');
    }

    if (targetFileType) {
      const matches = results.fileType === targetFileType;
      fileTypeRow.classList.add(matches ? 'criteria-pass' : 'criteria-fail');
    }
  }

  showResults() {
    document.getElementById('resultsSection').style.display = 'block';
  }

  togglePlayPause() {
    if (this.audioPlayer.paused) {
      this.audioPlayer.play();
    } else {
      this.audioPlayer.pause();
    }
  }

  updatePlayButton() {
    this.playPauseBtn.textContent = this.audioPlayer.paused ? 'Play' : 'Pause';
  }

  revalidateCriteria() {
    if (this.currentResults) {
      this.validateCriteria(this.currentResults);
    }
  }



  saveCriteria() {
    const criteria = {
      sampleRate: document.getElementById('targetSampleRate').value,
      bitDepth: document.getElementById('targetBitDepth').value,
      channels: document.getElementById('targetChannels').value,
      fileType: document.getElementById('targetFileType').value
    };

    console.log('Popup: Saving criteria:', criteria);
    chrome.storage.local.set({ targetCriteria: criteria }, () => {
      if (chrome.runtime.lastError) {
        console.error('Popup: Error saving criteria:', chrome.runtime.lastError);
      } else {
        console.log('Popup: Criteria saved successfully.');
      }
    });
  }

  loadSavedCriteria() {
    console.log('Popup: Loading saved criteria...');
    chrome.storage.local.get(['targetCriteria'], (result) => {
      console.log('Popup: Loaded criteria result:', result);
      if (chrome.runtime.lastError) {
        console.error('Popup: Error loading criteria:', chrome.runtime.lastError);
        return;
      }

      if (result.targetCriteria) {
        const criteria = result.targetCriteria;
        console.log('Popup: Setting criteria values:', criteria);

        if (criteria.sampleRate) {
          document.getElementById('targetSampleRate').value = criteria.sampleRate;
          console.log('Popup: Set sample rate to:', criteria.sampleRate);
        }
        if (criteria.bitDepth) {
          document.getElementById('targetBitDepth').value = criteria.bitDepth;
          console.log('Popup: Set bit depth to:', criteria.bitDepth);
        }
        if (criteria.channels) {
          document.getElementById('targetChannels').value = criteria.channels;
          console.log('Popup: Set channels to:', criteria.channels);
        }
        if (criteria.fileType) {
          document.getElementById('targetFileType').value = criteria.fileType;
          console.log('Popup: Set file type to:', criteria.fileType);
        }
      } else {
        console.log('Popup: No saved criteria found');
      }
    });
  }
}

// Initialize the analyzer when the popup loads
document.addEventListener('DOMContentLoaded', () => {
  new AudioAnalyzer();
});