class FileHandlerAnalyzer {
  constructor() {
    this.audioFile = null;
    this.audioContext = null;
    this.audioBuffer = null;
    this.audioPlayer = document.getElementById('audioPlayer');
    this.playPauseBtn = document.getElementById('playPause');
    this.currentResults = null;

    this.initializeEventListeners();

    // Load criteria after a small delay to ensure DOM is fully ready
    setTimeout(() => {
      this.loadSavedCriteria();
    }, 100);

    this.handleLaunchedFiles();
  }

  initializeEventListeners() {
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
        console.log('FileHandler: Storage changed, reloading criteria...');
        setTimeout(() => {
          this.loadSavedCriteria();
          this.revalidateCriteria();
        }, 50);
      }
    });
  }

  async handleLaunchedFiles() {
    console.log('Checking for launched files...');

    // First check for local file data from popup
    await this.checkForLocalFile();

    // Then check for Google Drive files

    const urlParams = new URLSearchParams(window.location.search);
    const fileId = urlParams.get('fileId');
    const fileName = urlParams.get('fileName');
    const token = urlParams.get('token');

    if (fileId && token) {
      console.log(`Fetching file from Google Drive API: ${fileName} (${fileId})`);
      try {
        const fileUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
        const response = await fetch(fileUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`Google Drive API request failed: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        const file = new File([blob], fileName, { type: blob.type });

        await this.processFile(file);
        return; // End execution here as we have the file

      } catch (error) {
        this.showError(`Failed to load file from Google Drive: ${error.message}`);
        return;
      }
    }

    // Check URL parameters for captured data flag
    const isCaptured = urlParams.get('captured') === 'true';
    console.log('Is captured data:', isCaptured);

    // Check for file data from content script (session storage first)
    let storedFileInfo = sessionStorage.getItem('audioAnalyzerFile');
    let storedFileData = sessionStorage.getItem('audioAnalyzerFileData');

    console.log('Session storage - File info:', storedFileInfo);
    console.log('Session storage - File data exists:', !!storedFileData);

    // If session storage is empty but we expect captured data, check chrome storage
    if (!storedFileInfo && isCaptured) {
      console.log('Session storage empty, checking chrome storage...');
      try {
        const result = await new Promise((resolve, reject) => {
          chrome.storage.local.get(['capturedAudioData'], (result) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(result);
            }
          });
        });

        if (result.capturedAudioData) {
          console.log('Found data in chrome storage:', result.capturedAudioData);
          storedFileInfo = JSON.stringify(result.capturedAudioData);
          storedFileData = result.capturedAudioData.dataUrl;

          // Clear the chrome storage after use
          chrome.storage.local.remove(['capturedAudioData']);
        }
      } catch (error) {
        console.error('Error accessing chrome storage:', error);
      }
    }

    if (storedFileInfo) {
      try {
        const fileInfo = JSON.parse(storedFileInfo);
        console.log('Processing stored file info:', fileInfo);

        if (storedFileData) {
          // Convert data URL back to file
          const response = await fetch(storedFileData);
          const blob = await response.blob();
          const file = new File([blob], fileInfo.fileName, { type: blob.type });

          console.log('Reconstructed file:', file.name, file.size, 'bytes');

          // Clean up session storage
          sessionStorage.removeItem('audioAnalyzerFile');
          sessionStorage.removeItem('audioAnalyzerFileData');

          // Check if this is complete API data from Google Drive
          if (fileInfo.complete && fileInfo.apiMetadata) {
            console.log('Using complete Google Drive API data');
            await this.processFileWithAPIData(file, fileInfo.apiMetadata);
          } else if (fileInfo.directAccess && fileInfo.metadata) {
            console.log('Using direct access with enhanced metadata');
            await this.processFileWithMetadata(file, fileInfo.metadata);
          } else if (fileInfo.preAnalyzed && fileInfo.results) {
            console.log('Using pre-analyzed results from Web Audio API capture');
            await this.processFileWithPreAnalysis(file, fileInfo.results);
          } else {
            await this.processFile(file);
          }
        } else if (fileInfo.audioSrc) {
          // Handle audio source URL
          try {
            const response = await fetch(fileInfo.audioSrc);
            const blob = await response.blob();
            const file = new File([blob], fileInfo.fileName, { type: blob.type });

            sessionStorage.removeItem('audioAnalyzerFile');

            await this.processFile(file);
          } catch (error) {
            this.showError('Could not load audio file: ' + error.message);
          }
        }
      } catch (error) {
        this.showError('Error processing file data: ' + error.message);
      }
    }

    // Handle native file launch queue
    if ('launchQueue' in window) {
      console.log('LaunchQueue is available, setting up consumer...');
      window.launchQueue.setConsumer(async (launchParams) => {
        console.log('LaunchQueue consumer called with:', launchParams);
        if (launchParams.files && launchParams.files.length > 0) {
          console.log('Processing', launchParams.files.length, 'files from launch queue');
          const fileHandle = launchParams.files[0];
          try {
            const file = await fileHandle.getFile();
            console.log('Successfully got file from handle:', file.name, file.size, 'bytes');
            await this.processFile(file);
          } catch (error) {
            console.error('Failed to get file from handle:', error);
            this.showError('Failed to open file: ' + error.message);
          }
        } else {
          console.log('No files in launch params');
        }
      });
    } else {
      console.log('LaunchQueue not available in this browser');
    }

    // If no file was launched, hide loading and show file input
    setTimeout(() => {
      if (!this.audioFile) {
        console.log('No file was launched, showing manual file input');
        document.getElementById('loading').style.display = 'none';
        this.showManualFileInput();
      }
    }, 2000);
  }

  showManualFileInput() {
    // Check if we're in download mode with an expected filename
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const expectedFilename = urlParams.get('filename');

    let fileInputHtml;
    if (mode === 'download' && expectedFilename) {
      // Show download-specific instructions
      fileInputHtml = `
        <div class="manual-input-section">
          <h3>🎵 Ready to Analyze "${decodeURIComponent(expectedFilename)}"</h3>
          <p><strong>Waiting for download to complete...</strong></p>
          <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0; font-size: 14px;">
            <strong>Quick Steps:</strong><br>
            1. ✅ Download should be starting automatically<br>
            2. 📁 Once download completes, drag the file here<br>
            3. 🎯 Get instant analysis with your saved criteria!
          </div>
          <input type="file" id="manualFileInput" accept="audio/*" style="display: none;" />
          <label for="manualFileInput" class="upload-btn">Or Click to Select Downloaded File</label>
          <p style="font-size: 12px; color: #666; margin-top: 10px;">
            You can also drag and drop the downloaded file anywhere in this window
          </p>
        </div>
      `;
    } else {
      // Standard file input
      fileInputHtml = `
        <div class="manual-input-section">
          <h3>No File Launched</h3>
          <p>You can manually select an audio file to analyze:</p>
          <input type="file" id="manualFileInput" accept="audio/*" style="display: none;" />
          <label for="manualFileInput" class="upload-btn">Select Audio File</label>
          <p style="font-size: 12px; color: #666; margin-top: 10px;">
            Or try using the "Analyze Audio" button in Google Drive
          </p>
        </div>
      `;
    }

    const loadingDiv = document.getElementById('loading');
    loadingDiv.innerHTML = fileInputHtml;
    loadingDiv.style.display = 'block';

    // Add event listener for manual file selection
    document.getElementById('manualFileInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        document.querySelector('.manual-input-section').style.display = 'none';
        await this.processFile(file);
      }
    });

    // Add drag and drop functionality to the entire window
    this.addDragAndDropSupport();
  }

  async processFile(file) {
    this.audioFile = file;

    try {
      // Show file info
      document.getElementById('fileName').textContent = file.name;
      document.getElementById('fileInfo').style.display = 'block';

      // Hide loading, show processing
      document.getElementById('loading').style.display = 'none';

      await this.analyzeFile(file);
      this.setupAudioPlayer(file);
      this.showResults();
    } catch (error) {
      this.showError('Error analyzing file: ' + error.message);
    }
  }

  async processFileWithAPIData(file, apiMetadata) {
    console.log('Processing file with complete Google Drive API data:', apiMetadata);
    this.audioFile = file;

    try {
      // Show file info with API metadata
      document.getElementById('fileName').textContent = apiMetadata.name || file.name;
      document.getElementById('fileInfo').style.display = 'block';

      // Hide loading
      document.getElementById('loading').style.display = 'none';

      // Analyze the complete file normally
      await this.analyzeFile(file);

      // Override results with API metadata for perfect accuracy
      if (this.currentResults) {
        // Use actual file size from API
        this.currentResults.fileSize = apiMetadata.size;
        this.currentResults.totalBytes = apiMetadata.downloadedBytes;

        // Add API metadata
        this.currentResults.source = apiMetadata.source;
        this.currentResults.mimeType = apiMetadata.mimeType;
        this.currentResults.createdTime = apiMetadata.createdTime;
        this.currentResults.modifiedTime = apiMetadata.modifiedTime;

        // Re-display with complete metadata
        this.displayResults(this.currentResults);
        this.validateCriteria(this.currentResults);
      }

      this.setupAudioPlayer(file);
      this.showResults();

      console.log('File processed successfully with complete API data');
    } catch (error) {
      console.error('Error processing file with API data:', error);
      this.showError('Error processing file: ' + error.message);
    }
  }

  async processFileWithMetadata(file, metadata) {
    console.log('Processing file with direct Google Drive metadata:', metadata);
    this.audioFile = file;

    try {
      // Show file info
      document.getElementById('fileName').textContent = file.name;
      document.getElementById('fileInfo').style.display = 'block';

      // Hide loading
      document.getElementById('loading').style.display = 'none';

      // Analyze the file normally but enhance with metadata
      await this.analyzeFile(file);

      // Override certain results with the real metadata from Google Drive
      if (this.currentResults) {
        if (metadata.duration && !isNaN(metadata.duration)) {
          this.currentResults.duration = metadata.duration;
        }
        if (metadata.fileSize) {
          this.currentResults.fileSize = metadata.fileSize;
        }
        if (metadata.totalBytes) {
          this.currentResults.totalBytes = metadata.totalBytes;
        }

        // Re-display with enhanced metadata
        this.displayResults(this.currentResults);
        this.validateCriteria(this.currentResults);
      }

      this.setupAudioPlayer(file);
      this.showResults();

      console.log('File processed successfully with enhanced metadata');
    } catch (error) {
      console.error('Error processing file with metadata:', error);
      this.showError('Error processing file: ' + error.message);
    }
  }

  async processFileWithPreAnalysis(file, preAnalyzedResults) {
    console.log('Processing file with pre-analyzed results:', preAnalyzedResults);
    this.audioFile = file;

    try {
      // Show file info with the original filename
      const displayName = preAnalyzedResults.originalFileName || file.name;
      document.getElementById('fileName').textContent = displayName;
      document.getElementById('fileInfo').style.display = 'block';

      // Hide loading
      document.getElementById('loading').style.display = 'none';

      // Use the pre-analyzed results from Web Audio API capture
      this.currentResults = preAnalyzedResults;
      this.displayResults(preAnalyzedResults);
      this.validateCriteria(preAnalyzedResults);

      this.setupAudioPlayer(file);
      this.showResults();

      console.log('File processed successfully with pre-analyzed data');
    } catch (error) {
      console.error('Error processing pre-analyzed file:', error);
      this.showError('Error processing file: ' + error.message);
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

      this.currentResults = results;
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

      this.currentResults = results;
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

    this.currentResults = results;
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

  showError(message) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('error').style.display = 'block';
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

    console.log('FileHandler: Saving criteria:', criteria);
    chrome.storage.local.set({ targetCriteria: criteria }, () => {
      if (chrome.runtime.lastError) {
        console.error('FileHandler: Error saving criteria:', chrome.runtime.lastError);
      } else {
        console.log('FileHandler: Criteria saved successfully.');
      }
    });
  }

  loadSavedCriteria() {
    console.log('FileHandler: Loading saved criteria...');
    chrome.storage.local.get(['targetCriteria'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error loading criteria:', chrome.runtime.lastError);
        return;
      }

      console.log('FileHandler: Loaded criteria result:', result);
      if (result.targetCriteria) {
        const criteria = result.targetCriteria;
        console.log('FileHandler: Setting criteria values:', criteria);

        if (criteria.sampleRate) {
          const sampleRateEl = document.getElementById('targetSampleRate');
          if (sampleRateEl) {
            sampleRateEl.value = criteria.sampleRate;
            console.log('FileHandler: Set sample rate to:', criteria.sampleRate);
          }
        }
        if (criteria.bitDepth) {
          const bitDepthEl = document.getElementById('targetBitDepth');
          if (bitDepthEl) {
            bitDepthEl.value = criteria.bitDepth;
            console.log('FileHandler: Set bit depth to:', criteria.bitDepth);
          }
        }
        if (criteria.channels) {
          const channelsEl = document.getElementById('targetChannels');
          if (channelsEl) {
            channelsEl.value = criteria.channels;
            console.log('FileHandler: Set channels to:', criteria.channels);
          }
        }
        if (criteria.fileType) {
          const fileTypeEl = document.getElementById('targetFileType');
          if (fileTypeEl) {
            fileTypeEl.value = criteria.fileType;
            console.log('FileHandler: Set file type to:', criteria.fileType);
          }
        }

        // Trigger revalidation if we have current results
        if (this.currentResults) {
          this.revalidateCriteria();
        }
      } else {
        console.log('FileHandler: No saved criteria found');
      }
    });
  }

  addDragAndDropSupport() {
    const container = document.querySelector('.container');

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      container.addEventListener(eventName, this.preventDefaults, false);
      document.body.addEventListener(eventName, this.preventDefaults, false);
    });

    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
      container.addEventListener(eventName, () => this.highlight(container), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      container.addEventListener(eventName, () => this.unhighlight(container), false);
    });

    // Handle dropped files
    container.addEventListener('drop', (e) => this.handleDrop(e), false);
  }

  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  highlight(element) {
    element.style.border = '2px dashed #667eea';
    element.style.backgroundColor = '#f0f8ff';
  }

  unhighlight(element) {
    element.style.border = '';
    element.style.backgroundColor = '';
  }

  async handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;

    console.log('Files dropped:', files.length);

    if (files.length > 0) {
      const file = files[0];
      console.log('Processing dropped file:', file.name);

      // Hide the manual input section
      const manualSection = document.querySelector('.manual-input-section');
      if (manualSection) {
        manualSection.style.display = 'none';
      }

      // Process the file
      await this.processFile(file);
    }
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

  // Local file handling methods
  async checkForLocalFile() {
    return new Promise((resolve) => {
      chrome.storage.session.get(['localFileData'], async (result) => {
        if (chrome.runtime.lastError) {
          console.error('Error checking for local file:', chrome.runtime.lastError);
          resolve();
          return;
        }

        if (result.localFileData) {
          console.log('Found local file data:', result.localFileData.name);

          try {
            // Convert data URL back to file
            const file = await this.dataUrlToFile(
              result.localFileData.dataUrl,
              result.localFileData.name,
              result.localFileData.type
            );

            // Hide manual input section since we have a file
            const manualSection = document.querySelector('.manual-input-section');
            if (manualSection) {
              manualSection.style.display = 'none';
            }

            // Process the local file
            await this.processFile(file);

            // Clean up session storage
            chrome.storage.session.remove(['localFileData']);

          } catch (error) {
            console.error('Error processing local file:', error);
            alert('Error processing transferred file: ' + error.message);
          }
        }

        resolve();
      });
    });
  }

  dataUrlToFile(dataUrl, filename, mimeType) {
    return new Promise((resolve, reject) => {
      try {
        // Extract base64 data
        const arr = dataUrl.split(',');
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);

        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }

        const file = new File([u8arr], filename, { type: mimeType });
        resolve(file);
      } catch (error) {
        reject(error);
      }
    });
  }
}

// Initialize the analyzer when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new FileHandlerAnalyzer();
});