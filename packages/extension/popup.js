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

    // Advanced analysis event listeners
    document.getElementById('advancedAnalysisBtn').addEventListener('click', () => {
      this.startAdvancedAnalysis();
    });
    document.getElementById('cancelAnalysis').addEventListener('click', () => {
      this.cancelAdvancedAnalysis();
    });

    // Toggle preference listener


    document.getElementById('openFileHandlerBtn').addEventListener('click', () => {
      chrome.windows.create({
        url: chrome.runtime.getURL('file-handler.html'),
        type: 'popup',
        width: 800,
        height: 700
      }, (window) => {
        console.log('Opened file-handler window.');
      });
    });
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

    // Analyze in popup
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

  // Advanced Audio Level Analysis Methods
  async startAdvancedAnalysis() {
    if (!this.audioBuffer && !this.audioFile) {
      alert('No audio file loaded for analysis');
      return;
    }

    // Show progress, hide button
    document.getElementById('advancedAnalysisBtn').style.display = 'none';
    document.getElementById('advancedProgress').style.display = 'block';

    this.analysisInProgress = true;

    try {
      // If we don't have audioBuffer, create it from the file
      let audioBuffer = this.audioBuffer;
      if (!audioBuffer && this.audioFile) {
        await this.loadAudioBufferForAnalysis();
        audioBuffer = this.audioBuffer;
      }

      if (!audioBuffer) {
        throw new Error('Unable to load audio data for analysis');
      }

      const results = await this.performLevelAnalysis(audioBuffer);
      this.displayAdvancedResults(results);

      // Hide progress, show results
      document.getElementById('advancedProgress').style.display = 'none';
      document.getElementById('advancedResultsSection').style.display = 'block';

    } catch (error) {
      console.error('Advanced analysis failed:', error);
      alert('Advanced analysis failed: ' + error.message);
      this.resetAdvancedAnalysis();
    }

    this.analysisInProgress = false;
  }

  async loadAudioBufferForAnalysis() {
    if (!this.audioFile) return;

    // Initialize audio context if needed
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Read and decode the audio file
    const arrayBuffer = await this.audioFile.arrayBuffer();
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
  }

  async performLevelAnalysis(audioBuffer) {
    const sampleRate = audioBuffer.sampleRate;
    const channels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;

    // Get all channel data
    const channelData = [];
    for (let channel = 0; channel < channels; channel++) {
      channelData.push(audioBuffer.getChannelData(channel));
    }

    let progress = 0;
    const progressElement = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    // 1. Peak Level Analysis
    progressText.textContent = 'Analyzing peak levels...';
    let globalPeak = 0;

    for (let channel = 0; channel < channels; channel++) {
      const data = channelData[channel];
      for (let i = 0; i < length; i++) {
        if (this.analysisInProgress === false) {
          throw new Error('Analysis cancelled');
        }

        const sample = Math.abs(data[i]);
        if (sample > globalPeak) {
          globalPeak = sample;
        }

        // Update progress every 10000 samples
        if (i % 10000 === 0) {
          progress = (channel * length + i) / (channels * length) * 0.5; // First 50% for peak
          progressElement.style.width = (progress * 100) + '%';

          // Allow UI to update
          if (i % 100000 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1));
          }
        }
      }
    }

    // Convert peak to dB
    const peakDb = globalPeak > 0 ? 20 * Math.log10(globalPeak) : -Infinity;

    // 2. Noise Floor Analysis
    progressText.textContent = 'Analyzing noise floor...';
    const noiseFloorDb = await this.analyzeNoiseFloor(channelData, channels, length, progressElement, progress);

    // 3. Normalization Check
    progressText.textContent = 'Checking normalization...';
    const normalizationStatus = this.checkNormalization(peakDb);

    progressElement.style.width = '100%';
    progressText.textContent = 'Analysis complete!';

    return {
      peakDb: peakDb,
      noiseFloorDb: noiseFloorDb,
      normalizationStatus: normalizationStatus
    };
  }

  async analyzeNoiseFloor(channelData, channels, length, progressElement, startProgress) {
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

    // Update progress to 90%
    progressElement.style.width = '90%';

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

  displayAdvancedResults(results) {
    // Peak Level
    const peakElement = document.getElementById('peakLevel');
    const peakRow = document.getElementById('peakLevelRow');

    let peakText = results.peakDb === -Infinity ? 'Silent' : `${results.peakDb.toFixed(1)} dB`;
    peakElement.textContent = peakText;

    // Color coding for peak level
    peakRow.classList.remove('level-pass', 'level-warning', 'level-fail');
    if (results.peakDb <= -6.0) {
      peakRow.classList.add('level-pass');
    } else if (results.peakDb <= -3.0) {
      peakRow.classList.add('level-warning');
    } else {
      peakRow.classList.add('level-fail');
    }

    // Noise Floor
    const noiseElement = document.getElementById('noiseFloor');
    const noiseRow = document.getElementById('noiseFloorRow');

    let noiseText = results.noiseFloorDb === -Infinity ? 'Silent' : `${results.noiseFloorDb.toFixed(1)} dB`;
    noiseElement.textContent = noiseText;

    // Color coding for noise floor
    noiseRow.classList.remove('level-pass', 'level-warning', 'level-fail');
    if (results.noiseFloorDb <= -60.0) {
      noiseRow.classList.add('level-pass');
    } else {
      noiseRow.classList.add('level-fail');
    }

    // Normalization
    const normElement = document.getElementById('normalization');
    const normRow = document.getElementById('normalizationRow');

    normElement.textContent = results.normalizationStatus.message;

    // Color coding for normalization
    normRow.classList.remove('level-pass', 'level-warning', 'level-fail');
    if (results.normalizationStatus.status === 'normalized') {
      normRow.classList.add('level-pass');
    } else {
      normRow.classList.add('level-fail');
    }
  }

  cancelAdvancedAnalysis() {
    this.analysisInProgress = false;
    this.resetAdvancedAnalysis();
  }

  resetAdvancedAnalysis() {
    document.getElementById('advancedAnalysisBtn').style.display = 'block';
    document.getElementById('advancedProgress').style.display = 'none';
    document.getElementById('advancedResultsSection').style.display = 'none';
    document.getElementById('progressFill').style.width = '0%';
  }

  // File transfer and toggle preference methods


  fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }


}

// Initialize the analyzer when the popup loads
document.addEventListener('DOMContentLoaded', () => {
  new AudioAnalyzer();
});