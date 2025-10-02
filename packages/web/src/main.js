import { AudioAnalyzer } from '../../core/audio-analyzer.js';
import { CriteriaValidator } from '../../core/criteria-validator.js';
import { LevelAnalyzer } from '../../core/level-analyzer.js';
import { BatchProcessor } from '../../core/batch-processor.js';

// Simplified engine class to avoid circular import issues
class AudioAnalyzerEngine {
  constructor() {
    this.audioAnalyzer = new AudioAnalyzer();
    this.levelAnalyzer = new LevelAnalyzer();
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

  formatAdvancedResults(results) {
    return CriteriaValidator.formatAdvancedResults(results);
  }

  cancelAdvancedAnalysis() {
    this.levelAnalyzer.cancelAnalysis();
  }
}
import GoogleAuth from './google-auth.js';

class WebAudioAnalyzer {
  constructor() {
    this.engine = new AudioAnalyzerEngine();
    this.googleAuth = new GoogleAuth();
    this.batchProcessor = new BatchProcessor(CriteriaValidator);
    this.currentFile = null;
    this.audioBuffer = null;
    this.isAnalyzing = false;
    this.currentResults = null;
    this.processingFile = false;  // Prevent double file processing
    this.batchMode = false;
    this.batchResults = null;
    this.batchCancelled = false;

    this.initializeElements();
    this.attachEventListeners();
    this.loadSettings();
  }

  initializeElements() {
    // Tab elements
    this.tabButtons = document.querySelectorAll('.tab-button');
    this.tabContents = document.querySelectorAll('.tab-content');

    // Local file elements
    this.dropZone = document.getElementById('dropZone');
    this.browseBtn = document.getElementById('browseBtn');
    this.fileInput = document.getElementById('fileInput');

    // Google Drive elements
    this.driveUrl = document.getElementById('driveUrl');
    this.analyzeUrl = document.getElementById('analyzeUrl');
    this.authText = document.getElementById('authText');
    this.signInBtn = document.getElementById('signInBtn');
    this.signOutBtn = document.getElementById('signOutBtn');

    // Criteria elements
    this.presetSelector = document.getElementById('presetSelector');
    this.targetFileType = document.getElementById('targetFileType');
    this.targetSampleRate = document.getElementById('targetSampleRate');
    this.targetBitDepth = document.getElementById('targetBitDepth');
    this.targetChannels = document.getElementById('targetChannels');

    // Results elements
    this.playerSection = document.getElementById('playerSection');
    this.resultsSection = document.getElementById('resultsSection');
    this.advancedResultsSection = document.getElementById('advancedResultsSection');
    this.audioPlayer = document.getElementById('audioPlayer');
    this.playPause = document.getElementById('playPause');

    // Analysis elements
    this.advancedAnalysisBtn = document.getElementById('advancedAnalysisBtn');
    this.advancedProgress = document.getElementById('advancedProgress');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.cancelAnalysis = document.getElementById('cancelAnalysis');

    // Loading and error elements
    this.loading = document.getElementById('loading');
    this.error = document.getElementById('error');
    this.errorMessage = document.getElementById('errorMessage');

    // Batch processing elements
    this.batchProgress = document.getElementById('batchProgress');
    this.batchCurrentFile = document.getElementById('batchCurrentFile');
    this.batchProgressText = document.getElementById('batchProgressText');
    this.batchProgressBar = document.getElementById('batchProgressBar');
    this.cancelBatch = document.getElementById('cancelBatch');
    this.batchResultsSection = document.getElementById('batchResultsSection');
    this.batchPassCount = document.getElementById('batchPassCount');
    this.batchWarningCount = document.getElementById('batchWarningCount');
    this.batchFailCount = document.getElementById('batchFailCount');
    this.batchTableBody = document.getElementById('batchTableBody');
  }

  attachEventListeners() {
    // Tab switching
    this.tabButtons.forEach(button => {
      button.addEventListener('click', () => this.switchTab(button.dataset.tab));
    });

    // Local file handling
    this.browseBtn.addEventListener('click', (e) => {
      // Stop event from bubbling up to drag & drop zone (was causing double picker)
      e.stopPropagation();

      // Clear file input to allow same file re-selection
      this.fileInput.value = '';

      // Trigger file picker
      this.fileInput.click();
    });

    this.fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        this.handleFilesSelect(files);
      }
    });

    // Drag and drop
    this.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropZone.classList.add('drag-over');
    });

    this.dropZone.addEventListener('dragleave', () => {
      this.dropZone.classList.remove('drag-over');
    });

    this.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('drag-over');
      const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('audio/'));
      if (files.length > 0) {
        this.handleFilesSelect(files);
      }
    });

    this.dropZone.addEventListener('click', () => this.fileInput.click());

    // Google Drive URL and auth
    this.analyzeUrl.addEventListener('click', () => this.handleGoogleDriveUrl());
    this.driveUrl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleGoogleDriveUrl();
    });
    this.signInBtn.addEventListener('click', () => this.handleSignIn());
    this.signOutBtn.addEventListener('click', () => this.handleSignOut());

    // Preset functionality
    this.presetSelector.addEventListener('change', () => this.handlePresetChange());

    // Criteria changes
    [this.targetFileType, this.targetSampleRate, this.targetBitDepth, this.targetChannels].forEach(select => {
      select.addEventListener('change', () => this.saveCriteria());
    });

    // Audio player
    this.playPause.addEventListener('click', () => this.togglePlayback());
    this.audioPlayer.addEventListener('loadedmetadata', () => {
      this.playPause.textContent = 'Play';
    });

    // Advanced analysis
    this.advancedAnalysisBtn.addEventListener('click', () => this.runAdvancedAnalysis());
    this.cancelAnalysis.addEventListener('click', () => this.cancelAdvancedAnalysis());

    // Batch cancel
    this.cancelBatch.addEventListener('click', () => this.cancelBatchProcessing());
  }

  loadSettings() {
    // Load settings from localStorage
    const stored = localStorage.getItem('audio-analyzer-settings');
    if (stored) {
      try {
        const settings = JSON.parse(stored);
        if (settings.criteria) {
          this.targetFileType.value = settings.criteria.fileType || '';
          this.targetSampleRate.value = settings.criteria.sampleRate || '';
          // Handle bit depth - could be old array value or single value
          const bitDepthCriteria = settings.criteria.bitDepth;
          this.targetBitDepth.value = Array.isArray(bitDepthCriteria) ? (bitDepthCriteria[0] || '') : (bitDepthCriteria || '');
          this.targetChannels.value = settings.criteria.channels || '';
        }
      } catch (error) {
        console.warn('Failed to load settings from localStorage:', error);
      }
    }

    // Load and restore selected preset
    const selectedPreset = localStorage.getItem('audio-analyzer-selected-preset');
    if (selectedPreset) {
      this.presetSelector.value = selectedPreset;
      // Apply the preset settings
      this.handlePresetChange();
    } else {
      // Default to Auditions preset on first load
      this.presetSelector.value = 'auditions';
      this.handlePresetChange();
    }

    // Update auth status
    this.updateAuthStatus();
  }

  updateAuthStatus() {
    const isSignedIn = this.googleAuth.isSignedIn();

    if (isSignedIn) {
      const userInfo = this.googleAuth.getUserInfo();
      if (userInfo && userInfo.name) {
        this.authText.textContent = `✓ Signed in as ${userInfo.name}`;
      } else {
        this.authText.textContent = '✓ Signed in to Google Drive';
      }
      this.signInBtn.style.display = 'none';
      this.signOutBtn.style.display = 'inline-block';
    } else {
      this.authText.textContent = 'Not signed in to Google';
      this.signInBtn.style.display = 'inline-block';
      this.signOutBtn.style.display = 'none';
    }
  }

  async handleSignIn() {
    try {
      await this.googleAuth.signIn();
      this.updateAuthStatus();
    } catch (error) {
      console.error('Sign-in failed:', error);
      this.showError(`Google sign-in failed: ${error.message}`);
    }
  }

  handleSignOut() {
    this.googleAuth.signOut();
    this.updateAuthStatus();
  }

  getCriteria() {
    return {
      fileType: this.targetFileType.value,
      sampleRate: this.targetSampleRate.value,
      bitDepth: this.targetBitDepth.value,
      channels: this.targetChannels.value
    };
  }

  saveCriteria() {
    const criteria = this.getCriteria();

    // Save to localStorage
    const settings = { criteria };
    localStorage.setItem('audio-analyzer-settings', JSON.stringify(settings));

    // Re-validate current results if we have them
    if (this.currentResults) {
      this.validateAndDisplayResults(this.currentResults);
    }

    // Re-validate batch results if we have them
    if (this.batchResults && this.batchMode) {
      this.revalidateBatchResults();
    }
  }

  getPresetConfigurations() {
    return {
      'auditions': {
        name: 'Auditions',
        fileType: 'wav',
        sampleRate: '48000', // Min 48kHz
        bitDepth: '24', // Min 24-bit
        channels: '1'
      },
      'character-recordings': {
        name: 'Character Recordings',
        fileType: 'wav',
        sampleRate: '48000', // Min 48kHz
        bitDepth: '24', // Min 24-bit
        channels: '1'
      },
      'custom': {
        name: 'Custom',
        // Custom allows manual selection of individual criteria
      },
      'p2b2-pairs': {
        name: 'P2B2 Pairs',
        fileType: 'wav',
        sampleRate: '48000', // Min 48kHz
        bitDepth: '16', // Min 16-bit (allows 16, 24, 32)
        channels: '2'
      },
      'three-hour': {
        name: 'Three Hour',
        fileType: 'wav',
        sampleRate: '48000', // Min 48kHz
        bitDepth: '24', // Min 24-bit
        channels: '' // No channel requirement specified
      }
    };
  }

  handlePresetChange() {
    const selectedPreset = this.presetSelector.value;
    const customSection = document.getElementById('customCriteriaSection');

    if (!selectedPreset) return;

    if (selectedPreset === 'custom') {
      // Show custom criteria selectors
      customSection.style.display = 'block';
    } else {
      // Hide custom criteria selectors for preset options
      customSection.style.display = 'none';

      const presets = this.getPresetConfigurations();
      const config = presets[selectedPreset];

      if (config) {
        // Apply preset configuration
        this.targetFileType.value = config.fileType || '';
        this.targetSampleRate.value = config.sampleRate || '';
        this.targetBitDepth.value = config.bitDepth || '';
        this.targetChannels.value = config.channels || '';

        // Save the changes
        this.saveCriteria();

        // Re-validate current results if we have them
        if (this.currentResults) {
          this.validateAndDisplayResults(this.currentResults);
        }

        // Re-validate batch results if we have them
        if (this.batchResults && this.batchMode) {
          this.revalidateBatchResults();
        }
      }
    }

    // Save selected preset to localStorage for persistence
    localStorage.setItem('audio-analyzer-selected-preset', selectedPreset);
  }


  switchTab(tabName) {
    this.tabButtons.forEach(btn => btn.classList.remove('active'));
    this.tabContents.forEach(content => content.classList.remove('active'));

    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.querySelector(`.tab-content[data-tab="${tabName}"]`).classList.add('active');
  }

  async handleFilesSelect(files) {
    if (!files || files.length === 0) return;

    if (this.processingFile) {
      console.log('Already processing files, ignoring duplicate call');
      return;
    }

    // Detect mode: single file vs batch
    if (files.length === 1) {
      this.batchMode = false;
      await this.handleFileSelect(files[0]);
    } else {
      this.batchMode = true;
      await this.handleBatchFiles(files);
    }
  }

  async handleFileSelect(file) {
    console.log('handleFileSelect called with:', file);
    if (!file) {
      console.log('No file provided to handleFileSelect');
      return;
    }

    if (this.processingFile) {
      console.log('Already processing a file, ignoring duplicate call');
      return;
    }

    this.processingFile = true;
    console.log('Starting file processing...');

    // Clean up previous file data before processing new one (but preserve current file input)
    this.cleanupForNewFile();

    this.currentFile = file;
    console.log('Showing loading screen...');
    this.showLoading();

    try {
      console.log('Starting analysis with core engine...');
      // Analyze file using the shared core engine
      const results = await this.engine.analyzeFile(file);
      console.log('Analysis results:', results);
      this.currentResults = results;

      console.log('Setting up audio player...');
      // Setup audio player
      this.setupAudioPlayer(file);

      console.log('Validating and displaying results...');
      // Display results
      this.validateAndDisplayResults(results);
      this.showResults();
      console.log('Results displayed successfully');

    } catch (error) {
      console.error('Analysis error:', error);
      this.showError(`Failed to analyze file: ${error.message}`);
      this.cleanupForNewFile(); // Clean up on error too
    } finally {
      this.processingFile = false;
      console.log('File processing completed');
    }
  }

  async handleBatchFiles(files) {
    this.processingFile = true;
    this.batchCancelled = false;
    this.cleanupForNewFile();

    console.log(`Starting batch processing of ${files.length} files`);

    // Initialize batch mode and show empty table with progress
    this.batchMode = true;
    this.batchResults = [];
    this.showBatchProgress(0, files.length, 'Initializing...');
    this.initializeBatchResultsTable();

    try {
      const criteria = this.getCriteria();

      const results = await this.batchProcessor.processBatch(
        files,
        criteria,
        (progress) => {
          this.showBatchProgress(
            progress.current,
            progress.total,
            progress.currentFile
          );
        },
        (result) => {
          // Progressive callback - add result as each file completes
          this.batchResults.push(result);
          this.addBatchResultRow(result);
          this.updateBatchSummary();
        }
      );

      // Final update
      this.batchResults = results;
      this.updateBatchSummary();

      // Hide progress bar when complete
      if (!this.batchCancelled) {
        this.batchProgress.style.display = 'none';
      }

    } catch (error) {
      console.error('Batch processing error:', error);
      this.showError(`Failed to process batch: ${error.message}`);
      this.cleanupForNewFile();
    } finally {
      this.processingFile = false;
    }
  }

  async handleGoogleDriveUrl() {
    const url = this.driveUrl.value.trim();
    if (!url) return;

    if (this.processingFile) {
      console.log('Already processing a file, ignoring Google Drive request');
      return;
    }

    this.processingFile = true;

    // Clean up previous file data before processing new one
    this.cleanupForNewFile();

    this.showLoading();

    try {
      // Extract file/folder ID from Google Drive URL
      const parsed = this.extractFileIdFromUrl(url);
      if (!parsed) {
        throw new Error('Invalid Google Drive URL. Please ensure it\'s a valid Drive file or folder link.');
      }

      // Update auth status in case user was automatically signed in
      this.updateAuthStatus();

      if (parsed.isFolder) {
        // Handle folder - batch process all audio files
        await this.handleGoogleDriveFolder(parsed.id);
      } else {
        // Handle single file
        await this.handleGoogleDriveFile(parsed.id);
      }

    } catch (error) {
      console.error('Google Drive error:', error);
      this.cleanupForNewFile(); // Clean up on error too
      if (error.message.includes('sign-in') || error.message.includes('auth')) {
        this.showError('Please sign in to Google to access Drive files. Click "Analyze" to authenticate.');
      } else {
        this.showError(`Failed to process Google Drive: ${error.message}`);
      }
    } finally {
      this.processingFile = false;
    }
  }

  async handleGoogleDriveFile(fileId) {
    // Download file using Google Drive API
    const file = await this.googleAuth.downloadFile(fileId);
    this.currentFile = file;

    // Analyze the downloaded file
    const results = await this.engine.analyzeFile(file);
    this.currentResults = results;

    // Setup audio player and display results
    this.setupAudioPlayer(file);
    this.validateAndDisplayResults(results);
    this.showResults();
  }

  async handleGoogleDriveFolder(folderId) {
    // List all audio files in folder
    const audioFiles = await this.googleAuth.listAudioFilesInFolder(folderId);

    if (audioFiles.length === 0) {
      throw new Error('No audio files found in this folder');
    }

    console.log(`Found ${audioFiles.length} audio files in folder`);

    // Switch to batch mode
    this.batchMode = true;
    this.batchResults = [];
    this.batchCancelled = false;

    // Initialize table and show progress
    this.showBatchProgress(0, audioFiles.length, 'Initializing...');
    this.initializeBatchResultsTable();

    const criteria = this.getCriteria();

    // Process each file
    for (let i = 0; i < audioFiles.length; i++) {
      // Check for cancellation
      if (this.batchCancelled) {
        console.log('Batch processing cancelled');
        break;
      }

      const driveFile = audioFiles[i];
      let result;

      try {
        // Update progress
        this.showBatchProgress(i, audioFiles.length, driveFile.name);

        // Download file headers (first 100KB)
        const headerBlob = await this.googleAuth.downloadFileHeaders(driveFile.id);

        // Create a pseudo-File object for analysis (with header size for analysis)
        const file = new File([headerBlob], driveFile.name, {
          type: driveFile.mimeType,
          lastModified: new Date(driveFile.modifiedTime).getTime()
        });

        // Analyze headers
        const analysis = await this.batchProcessor.analyzer.analyzeHeaders(file);

        // Override fileSize with actual Drive file size (not header size)
        analysis.fileSize = parseInt(driveFile.size) || file.size;

        // Apply validation
        const validation = CriteriaValidator.validateResults(analysis, criteria);

        result = {
          filename: driveFile.name,
          file: null, // Can't play Drive files directly without downloading
          analysis,
          validation,
          status: this.getOverallStatus(validation)
        };

      } catch (error) {
        console.error(`Error processing ${driveFile.name}:`, error);
        result = {
          filename: driveFile.name,
          file: null,
          analysis: null,
          validation: null,
          status: 'error',
          error: error.message
        };
      }

      // Add result progressively
      this.batchResults.push(result);
      this.addBatchResultRow(result);
      this.updateBatchSummary();

      // Update progress
      this.showBatchProgress(i + 1, audioFiles.length, driveFile.name);
    }

    // Hide progress bar when complete
    if (!this.batchCancelled) {
      this.batchProgress.style.display = 'none';
    }
  }

  extractFileIdFromUrl(url) {
    // Handle various Google Drive URL formats
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9-_]+)/,  // Standard file sharing link
      /\/folders\/([a-zA-Z0-9-_]+)/,  // Folder sharing link
      /[?&]id=([a-zA-Z0-9-_]+)/,      // URL parameter
      /^([a-zA-Z0-9-_]+)$/            // Just the ID
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return { id: match[1], isFolder: pattern === patterns[1] };
    }

    return null;
  }

  setupAudioPlayer(file) {
    const url = URL.createObjectURL(file);
    this.audioPlayer.src = url;
    this.audioPlayer.load();
    this.playerSection.style.display = 'block';
  }

  togglePlayback() {
    if (this.audioPlayer.paused) {
      this.audioPlayer.play();
      this.playPause.textContent = 'Pause';
    } else {
      this.audioPlayer.pause();
      this.playPause.textContent = 'Play';
    }
  }

  validateAndDisplayResults(results) {
    const criteria = this.getCriteria();
    const validationResults = this.engine.validateCriteria(results, criteria);
    const formatted = this.engine.formatResults(results);

    // Update display
    document.getElementById('fileName').textContent = this.currentFile.name;
    document.getElementById('fileType').textContent = formatted.fileType;
    document.getElementById('sampleRate').textContent = formatted.sampleRate;
    document.getElementById('bitDepth').textContent = formatted.bitDepth;
    document.getElementById('channels').textContent = formatted.channels;
    document.getElementById('duration').textContent = formatted.duration;
    document.getElementById('fileSize').textContent = formatted.fileSize;

    // Apply validation styling
    this.applyValidationStyling(validationResults);
  }

  applyValidationStyling(validationResults) {
    const rows = {
      fileType: document.getElementById('fileTypeRow'),
      sampleRate: document.getElementById('sampleRateRow'),
      bitDepth: document.getElementById('bitDepthRow'),
      channels: document.getElementById('channelsRow'),
      duration: document.getElementById('durationRow')
    };

    Object.entries(validationResults).forEach(([key, validation]) => {
      const row = rows[key];
      if (row) {
        // Remove existing validation classes
        row.classList.remove('pass', 'fail', 'warning', 'unknown');
        // Add new validation class
        row.classList.add(validation.status);
      }
    });
  }

  async runAdvancedAnalysis() {
    if (!this.audioBuffer && this.currentFile) {
      // Need to decode audio first
      try {
        const arrayBuffer = await this.currentFile.arrayBuffer();
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      } catch (error) {
        this.showError(`Failed to decode audio: ${error.message}`);
        return;
      }
    }

    if (!this.audioBuffer) {
      this.showError('No audio data available for analysis');
      return;
    }

    this.isAnalyzing = true;
    this.advancedAnalysisBtn.style.display = 'none';
    this.advancedProgress.style.display = 'block';

    try {
      const results = await this.engine.analyzeAdvanced(this.audioBuffer, (message, progress) => {
        this.progressText.textContent = message;
        this.progressFill.style.width = `${progress * 100}%`;
      });

      // Display advanced results
      document.getElementById('peakLevel').textContent =
        results.peakDb === -Infinity ? '-∞ dB' : `${results.peakDb.toFixed(1)} dB`;
      document.getElementById('noiseFloor').textContent =
        results.noiseFloorDb === -Infinity ? '-∞ dB' : `${results.noiseFloorDb.toFixed(1)} dB`;
      document.getElementById('normalization').textContent = results.normalizationStatus.message;

      this.advancedResultsSection.style.display = 'block';

    } catch (error) {
      if (error.message !== 'Analysis cancelled') {
        console.error('Advanced analysis error:', error);
        this.showError(`Advanced analysis failed: ${error.message}`);
      }
    } finally {
      this.isAnalyzing = false;
      this.advancedProgress.style.display = 'none';
      this.advancedAnalysisBtn.style.display = 'block';
    }
  }

  cancelAdvancedAnalysis() {
    this.engine.cancelAdvancedAnalysis();
    this.isAnalyzing = false;
    this.advancedProgress.style.display = 'none';
    this.advancedAnalysisBtn.style.display = 'block';
  }

  cancelBatchProcessing() {
    this.batchCancelled = true;
    this.batchProcessor.cancel();
  }

  showLoading() {
    this.hideAllSections();
    this.loading.style.display = 'block';
  }

  showResults() {
    this.hideAllSections();
    this.resultsSection.style.display = 'block';
  }

  showError(message) {
    this.hideAllSections();
    this.errorMessage.textContent = message;
    this.error.style.display = 'block';
  }

  showBatchProgress(current, total, currentFile) {
    // Don't hide sections - just show progress
    // (batch results table should remain visible during processing)
    this.batchProgress.style.display = 'block';

    const percentage = Math.round((current / total) * 100);
    this.batchProgressBar.style.width = `${percentage}%`;
    this.batchProgressText.textContent = `${current}/${total} (${percentage}%)`;
    this.batchCurrentFile.textContent = currentFile || 'Processing...';
  }

  initializeBatchResultsTable() {
    // Show batch results section and clear table
    this.hideAllSections();
    this.batchProgress.style.display = 'block';
    this.batchResultsSection.style.display = 'block';
    this.batchTableBody.innerHTML = '';

    // Initialize summary stats to zero
    this.batchPassCount.textContent = '0';
    this.batchWarningCount.textContent = '0';
    this.batchFailCount.textContent = '0';
  }

  addBatchResultRow(result) {
    const index = this.batchResults.length - 1;
    const row = document.createElement('tr');
    row.className = `batch-row ${result.status}`;

    // Format the analysis data using the same formatter as single file view
    const formatted = result.analysis ? CriteriaValidator.formatDisplayText(result.analysis) : {};

    const fileTypeStatus = this.getValidationStatus(result.validation, 'fileType');
    const sampleRateStatus = this.getValidationStatus(result.validation, 'sampleRate');
    const bitDepthStatus = this.getValidationStatus(result.validation, 'bitDepth');
    const channelsStatus = this.getValidationStatus(result.validation, 'channels');
    const durationStatus = this.getValidationStatus(result.validation, 'duration');

    row.innerHTML = `
      <td class="filename">${result.filename}</td>
      <td><span class="status-badge ${result.status}">${result.status}</span></td>
      <td class="validation-${fileTypeStatus}">${formatted.fileType || 'Unknown'}</td>
      <td class="validation-${sampleRateStatus}">${formatted.sampleRate || '-'}</td>
      <td class="validation-${bitDepthStatus}">${formatted.bitDepth || '-'}</td>
      <td class="validation-${channelsStatus}">${formatted.channels || '-'}</td>
      <td class="validation-${durationStatus}">${formatted.duration || '-'}</td>
      <td>${formatted.fileSize || '-'}</td>
      <td><button class="play-btn-small" data-index="${index}">▶</button></td>
    `;

    this.batchTableBody.appendChild(row);

    // Add event listener to play button
    const playBtn = row.querySelector('.play-btn-small');
    if (playBtn) {
      playBtn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.index);
        this.playBatchFile(idx);
      });
    }
  }

  updateBatchSummary() {
    const passCount = this.batchResults.filter(r => r.status === 'pass').length;
    const warningCount = this.batchResults.filter(r => r.status === 'warning').length;
    const failCount = this.batchResults.filter(r => r.status === 'fail').length;

    this.batchPassCount.textContent = passCount;
    this.batchWarningCount.textContent = warningCount;
    this.batchFailCount.textContent = failCount;
  }

  showBatchResults(results) {
    // This is now only used for revalidation - rebuild entire table
    this.hideAllSections();
    this.batchResultsSection.style.display = 'block';

    // Update summary stats
    const passCount = results.filter(r => r.status === 'pass').length;
    const warningCount = results.filter(r => r.status === 'warning').length;
    const failCount = results.filter(r => r.status === 'fail').length;

    this.batchPassCount.textContent = passCount;
    this.batchWarningCount.textContent = warningCount;
    this.batchFailCount.textContent = failCount;

    // Rebuild table
    this.batchTableBody.innerHTML = '';
    results.forEach((result, index) => {
      const row = document.createElement('tr');
      row.className = `batch-row ${result.status}`;

      // Format the analysis data using the same formatter as single file view
      const formatted = result.analysis ? CriteriaValidator.formatDisplayText(result.analysis) : {};

      const fileTypeStatus = this.getValidationStatus(result.validation, 'fileType');
      const sampleRateStatus = this.getValidationStatus(result.validation, 'sampleRate');
      const bitDepthStatus = this.getValidationStatus(result.validation, 'bitDepth');
      const channelsStatus = this.getValidationStatus(result.validation, 'channels');
      const durationStatus = this.getValidationStatus(result.validation, 'duration');

      row.innerHTML = `
        <td class="filename">${result.filename}</td>
        <td><span class="status-badge ${result.status}">${result.status}</span></td>
        <td class="validation-${fileTypeStatus}">${formatted.fileType || 'Unknown'}</td>
        <td class="validation-${sampleRateStatus}">${formatted.sampleRate || '-'}</td>
        <td class="validation-${bitDepthStatus}">${formatted.bitDepth || '-'}</td>
        <td class="validation-${channelsStatus}">${formatted.channels || '-'}</td>
        <td class="validation-${durationStatus}">${formatted.duration || '-'}</td>
        <td>${formatted.fileSize || '-'}</td>
        <td><button class="play-btn-small" data-index="${index}">▶</button></td>
      `;

      this.batchTableBody.appendChild(row);
    });

    // Store results for playback access
    this.batchResults = results;

    // Add event listeners to play buttons
    this.batchTableBody.querySelectorAll('.play-btn-small').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.playBatchFile(index);
      });
    });
  }

  formatValue(value) {
    if (value === null || value === undefined || value === 'Unknown') {
      return '-';
    }
    return value;
  }

  formatDuration(seconds) {
    if (!seconds || seconds === 'Unknown') return '-';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  getValidationStatus(validation, field) {
    if (!validation || !validation[field]) return '';
    return validation[field].status; // 'pass', 'warning', or 'fail'
  }

  playBatchFile(index) {
    if (!this.batchResults || !this.batchResults[index]) return;

    const result = this.batchResults[index];
    if (!result.file) return;

    // Create a blob URL and open in new window
    const url = URL.createObjectURL(result.file);
    window.open(url, '_blank');

    // Revoke URL after a delay to allow it to load
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  revalidateBatchResults() {
    if (!this.batchResults) return;

    const criteria = this.getCriteria();

    // Re-run validation on all batch results
    this.batchResults.forEach(result => {
      if (result.analysis) {
        result.validation = CriteriaValidator.validateResults(result.analysis, criteria);
        result.status = this.getOverallStatus(result.validation);
      }
    });

    // Re-display the updated results
    this.showBatchResults(this.batchResults);
  }

  getOverallStatus(validation) {
    const statuses = Object.values(validation).map(v => v.status);

    if (statuses.includes('fail')) return 'fail';
    if (statuses.includes('warning')) return 'warning';
    return 'pass';
  }

  cleanupForNewFile() {
    // Clean up previous file data without touching current file input
    if (this.currentFile) {
      this.currentFile = null;
    }

    if (this.audioBuffer) {
      this.audioBuffer = null;
    }

    if (this.currentResults) {
      this.currentResults = null;
    }

    // Revoke any existing object URLs to prevent memory leaks
    if (this.audioPlayer && this.audioPlayer.src) {
      if (this.audioPlayer.src.startsWith('blob:')) {
        URL.revokeObjectURL(this.audioPlayer.src);
      }
      this.audioPlayer.src = '';
    }
  }

  cleanup() {
    // Full cleanup including file input (for page unload, etc.)
    this.cleanupForNewFile();

    // Don't automatically clear file input - let browser handle it
    // This prevents the double picker issue in Chrome

    // Close any existing audio context to free resources
    if (this.engine.audioAnalyzer.audioContext) {
      // Don't close the audio context immediately as it might be needed
      // Instead, let the browser's garbage collector handle it
    }

    // Force garbage collection hint (not guaranteed, but helps in some browsers)
    if (window.gc && typeof window.gc === 'function') {
      window.gc();
    }
  }

  hideAllSections() {
    this.loading.style.display = 'none';
    this.error.style.display = 'none';
    this.resultsSection.style.display = 'none';
    this.advancedResultsSection.style.display = 'none';
    this.batchProgress.style.display = 'none';
    this.batchResultsSection.style.display = 'none';
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new WebAudioAnalyzer();

  // Clean up when page is being unloaded
  window.addEventListener('beforeunload', () => {
    app.cleanup();
  });

  // Also clean up on visibility change (when tab becomes hidden)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      app.cleanup();
    }
  });
});