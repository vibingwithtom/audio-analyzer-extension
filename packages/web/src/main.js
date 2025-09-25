import { AudioAnalyzer } from '../../core/audio-analyzer.js';
import { CriteriaValidator } from '../../core/criteria-validator.js';
import { LevelAnalyzer } from '../../core/level-analyzer.js';

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
    this.currentFile = null;
    this.audioBuffer = null;
    this.isAnalyzing = false;
    this.currentResults = null;

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
  }

  attachEventListeners() {
    // Tab switching
    this.tabButtons.forEach(button => {
      button.addEventListener('click', () => this.switchTab(button.dataset.tab));
    });

    // Local file handling
    this.browseBtn.addEventListener('click', () => {
      console.log('Browse button clicked, fileInput:', this.fileInput);
      this.fileInput.click();
    });
    this.fileInput.addEventListener('change', (e) => {
      console.log('File input change event fired!');
      console.log('Event:', e);
      console.log('Files:', e.target.files);
      console.log('First file:', e.target.files[0]);
      if (e.target.files[0]) {
        this.handleFileSelect(e.target.files[0]);
      } else {
        console.log('No files selected');
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
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('audio/')) {
        this.handleFileSelect(file);
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
          this.targetBitDepth.value = settings.criteria.bitDepth || '';
          this.targetChannels.value = settings.criteria.channels || '';
        }
      } catch (error) {
        console.warn('Failed to load settings from localStorage:', error);
      }
    }

    // Update auth status
    this.updateAuthStatus();
  }

  updateAuthStatus() {
    const isSignedIn = this.googleAuth.isSignedIn();

    if (isSignedIn) {
      this.authText.textContent = '✓ Signed in to Google Drive';
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

  saveCriteria() {
    const criteria = {
      fileType: this.targetFileType.value,
      sampleRate: this.targetSampleRate.value,
      bitDepth: this.targetBitDepth.value,
      channels: this.targetChannels.value
    };

    // Save to localStorage
    const settings = { criteria };
    localStorage.setItem('audio-analyzer-settings', JSON.stringify(settings));

    // Re-validate current results if we have them
    if (this.currentResults) {
      this.validateAndDisplayResults(this.currentResults);
    }
  }

  switchTab(tabName) {
    this.tabButtons.forEach(btn => btn.classList.remove('active'));
    this.tabContents.forEach(content => content.classList.remove('active'));

    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.querySelector(`.tab-content[data-tab="${tabName}"]`).classList.add('active');
  }

  async handleFileSelect(file) {
    console.log('handleFileSelect called with:', file);
    if (!file) {
      console.log('No file provided to handleFileSelect');
      return;
    }

    // Clean up previous file data before processing new one
    this.cleanup();

    this.currentFile = file;
    this.showLoading();

    try {
      // Analyze file using the shared core engine
      const results = await this.engine.analyzeFile(file);
      this.currentResults = results;

      // Setup audio player
      this.setupAudioPlayer(file);

      // Display results
      this.validateAndDisplayResults(results);
      this.showResults();

    } catch (error) {
      console.error('Analysis error:', error);
      this.showError(`Failed to analyze file: ${error.message}`);
      this.cleanup(); // Clean up on error too
    }
  }

  async handleGoogleDriveUrl() {
    const url = this.driveUrl.value.trim();
    if (!url) return;

    // Clean up previous file data before processing new one
    this.cleanup();

    this.showLoading();

    try {
      // Extract file ID from Google Drive URL
      const fileId = this.extractFileIdFromUrl(url);
      if (!fileId) {
        throw new Error('Invalid Google Drive URL. Please ensure it\'s a valid Drive file link.');
      }

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

    } catch (error) {
      console.error('Google Drive error:', error);
      this.cleanup(); // Clean up on error too
      if (error.message.includes('sign-in') || error.message.includes('auth')) {
        this.showError('Please sign in to Google to access Drive files. Click "Analyze" to authenticate.');
      } else {
        this.showError(`Failed to process Google Drive file: ${error.message}`);
      }
    }
  }

  extractFileIdFromUrl(url) {
    // Handle various Google Drive URL formats
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9-_]+)/,  // Standard sharing link
      /[?&]id=([a-zA-Z0-9-_]+)/,      // URL parameter
      /^([a-zA-Z0-9-_]+)$/            // Just the file ID
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
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
    const criteria = {
      fileType: this.targetFileType.value,
      sampleRate: this.targetSampleRate.value,
      bitDepth: this.targetBitDepth.value,
      channels: this.targetChannels.value
    };

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
      channels: document.getElementById('channelsRow')
    };

    Object.entries(validationResults).forEach(([key, validation]) => {
      const row = rows[key];
      if (row) {
        // Remove existing validation classes
        row.classList.remove('pass', 'fail', 'unknown');
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

  cleanup() {
    // Clean up previous file data to prevent memory accumulation
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

    // Clear file input to ensure change events fire for same file
    if (this.fileInput) {
      this.fileInput.value = '';
    }

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