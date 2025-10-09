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

  analyzeStereoSeparation(audioBuffer) {
    return this.levelAnalyzer.analyzeStereoSeparation(audioBuffer);
  }

  analyzeMicBleed(audioBuffer) {
    return this.levelAnalyzer.analyzeMicBleed(audioBuffer);
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

// HTML escape utility to prevent XSS and HTML structure issues
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

import GoogleAuth from './google-auth.js';
import BoxAuth from './box-auth.js';
import bilingualValidationData from './bilingual-validation-data.json';

class WebAudioAnalyzer {
  constructor() {
    this.engine = new AudioAnalyzerEngine();
    this.googleAuth = new GoogleAuth();
    this.boxAuth = new BoxAuth();
    this.batchProcessor = new BatchProcessor(CriteriaValidator);
    this.currentFile = null;
    this.audioBuffer = null;
    this.isAnalyzing = false;
    this.currentResults = null;
    this.processingFile = false;  // Prevent double file processing
    this.batchMode = false;
    this.batchResults = null;
    this.batchCancelled = false;
    this.currentBatchSource = null; // Track whether batch is from 'drive', 'box', or 'local'

    this.initializeElements();
    this.attachEventListeners();
    this.loadSettings();
    this.initializeDarkMode();
    this.updateBuildInfo();
  }

  initializeElements() {
    // Tab elements
    this.tabButtons = document.querySelectorAll('.tab-button');
    this.tabContents = document.querySelectorAll('.tab-content');

    // Dark mode toggle
    this.darkModeToggle = document.getElementById('darkModeToggle');

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

    // Box elements
    this.boxUrl = document.getElementById('boxUrl');
    this.analyzeBoxUrl = document.getElementById('analyzeBoxUrl');
    this.boxAuthText = document.getElementById('boxAuthText');
    this.boxSignInBtn = document.getElementById('boxSignInBtn');
    this.boxSignOutBtn = document.getElementById('boxSignOutBtn');

    // Analysis type elements (for filename validation)
    this.analysisTypeSection = document.getElementById('analysisTypeSection');
    this.enableAudioAnalysis = document.getElementById('enableAudioAnalysis');
    this.enableFilenameValidation = document.getElementById('enableFilenameValidation');
    this.filenameValidationFields = document.getElementById('filenameValidationFields');
    this.speakerId = document.getElementById('speakerId');
    this.scriptsFolderUrl = document.getElementById('scriptsFolderUrl');

    // Box analysis type elements
    this.boxAnalysisTypeSection = document.getElementById('boxAnalysisTypeSection');
    this.boxEnableAudioAnalysis = document.getElementById('boxEnableAudioAnalysis');
    this.boxEnableFilenameValidation = document.getElementById('boxEnableFilenameValidation');
    this.boxFilenameValidationFields = document.getElementById('boxFilenameValidationFields');

    // Local analysis type elements
    this.localAnalysisTypeSection = document.getElementById('localAnalysisTypeSection');
    this.localEnableAudioAnalysis = document.getElementById('localEnableAudioAnalysis');
    this.localEnableFilenameValidation = document.getElementById('localEnableFilenameValidation');
    this.localFilenameValidationFields = document.getElementById('localFilenameValidationFields');

    // Criteria elements
    this.presetSelector = document.getElementById('presetSelector');
    this.targetFileType = document.getElementById('targetFileType');
    this.targetSampleRate = document.getElementById('targetSampleRate');
    this.targetBitDepth = document.getElementById('targetBitDepth');
    this.targetChannels = document.getElementById('targetChannels');
    this.targetMinDuration = document.getElementById('targetMinDuration');

    // Results elements
    this.playerSection = document.getElementById('playerSection');
    this.resultsSection = document.getElementById('resultsSection');
    this.advancedResultsSection = document.getElementById('advancedResultsSection');
    this.advancedResultsDynamicSection = document.getElementById('advanced-results-section');
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
    this.batchErrorCount = document.getElementById('batchErrorCount');
    this.batchTotalDuration = document.getElementById('batchTotalDuration');
    this.batchTotalDurationContainer = document.querySelector('.total-duration');
    this.batchTableBody = document.getElementById('batchTableBody');
  }

  attachEventListeners() {
    // Dark mode toggle
    this.darkModeToggle.addEventListener('click', () => this.toggleDarkMode());

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

    // Box URL and auth
    this.analyzeBoxUrl.addEventListener('click', () => this.handleBoxUrl());
    this.boxUrl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleBoxUrl();
    });
    this.boxSignInBtn.addEventListener('click', () => this.handleBoxSignIn());
    this.boxSignOutBtn.addEventListener('click', () => this.handleBoxSignOut());

    // Preset functionality
    this.presetSelector.addEventListener('change', () => this.handlePresetChange());

    // Filename validation checkboxes (Google Drive)
    this.enableFilenameValidation.addEventListener('change', () => this.toggleFilenameValidationFields());
    this.enableAudioAnalysis.addEventListener('change', () => this.validateAnalysisTypeSelection());

    // Filename validation inputs (Google Drive)
    this.speakerId.addEventListener('input', () => this.saveFilenameValidationSettings());
    this.scriptsFolderUrl.addEventListener('input', () => this.saveFilenameValidationSettings());

    // Filename validation checkboxes (Box)
    this.boxEnableFilenameValidation.addEventListener('change', () => this.toggleBoxFilenameValidationFields());
    this.boxEnableAudioAnalysis.addEventListener('change', () => this.validateBoxAnalysisTypeSelection());

    // Filename validation checkboxes (Local)
    this.localEnableFilenameValidation.addEventListener('change', () => this.toggleLocalFilenameValidationFields());
    this.localEnableAudioAnalysis.addEventListener('change', () => this.validateLocalAnalysisTypeSelection());

    // Criteria changes
    [this.targetFileType, this.targetSampleRate, this.targetBitDepth, this.targetChannels].forEach(select => {
      select.addEventListener('change', () => this.saveCriteria());
    });
    this.targetMinDuration.addEventListener('input', () => this.saveCriteria());

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
          // Helper to set multi-select values
          const setMultiSelect = (selectElement, values) => {
            Array.from(selectElement.options).forEach(option => {
              option.selected = false;
            });
            const valuesArray = Array.isArray(values) ? values : (values ? [values] : []);
            valuesArray.forEach(value => {
              const option = Array.from(selectElement.options).find(opt => opt.value === value);
              if (option) option.selected = true;
            });
          };

          setMultiSelect(this.targetFileType, settings.criteria.fileType || []);
          setMultiSelect(this.targetSampleRate, settings.criteria.sampleRate || []);
          setMultiSelect(this.targetBitDepth, settings.criteria.bitDepth || []);
          setMultiSelect(this.targetChannels, settings.criteria.channels || []);
          this.targetMinDuration.value = settings.criteria.minDuration || '';
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
      this.presetSelector.value = 'auditions-character-recordings';
      this.handlePresetChange();
    }

    // Load filename validation settings
    this.loadFilenameValidationSettings();
    this.loadBoxFilenameValidationSettings();
    this.loadLocalFilenameValidationSettings();

    // Initialize and update auth status
    this.googleAuth.init().catch(err => console.error('Google Auth init error:', err));
    this.updateAuthStatus();

    // Initialize Box auth and handle post-OAuth callback
    this.boxAuth.init().then(() => {
      this.updateBoxAuthStatus();

      // Check if we just authenticated with Box and switch to Box tab
      if (localStorage.getItem('box_just_authenticated') === 'true') {
        localStorage.removeItem('box_just_authenticated');
        this.switchTab('box');
      }
    }).catch(err => console.error('Box Auth init error:', err));
  }

  updateAuthStatus() {
    const isSignedIn = this.googleAuth.isSignedIn();
    console.log('updateAuthStatus called, isSignedIn:', isSignedIn);
    console.log('signInBtn element:', this.signInBtn);

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
      console.log('Set signInBtn display to inline-block');
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

  updateBoxAuthStatus() {
    const isSignedIn = this.boxAuth.isSignedIn();

    if (isSignedIn) {
      const userInfo = this.boxAuth.userInfo;
      if (userInfo && userInfo.name) {
        this.boxAuthText.textContent = `✓ Signed in as ${userInfo.name}`;
      } else {
        this.boxAuthText.textContent = '✓ Signed in to Box';
      }
      this.boxSignInBtn.style.display = 'none';
      this.boxSignOutBtn.style.display = 'inline-block';
    } else {
      this.boxAuthText.textContent = 'Not signed in to Box';
      this.boxSignInBtn.style.display = 'inline-block';
      this.boxSignOutBtn.style.display = 'none';
    }
  }

  async handleBoxSignIn() {
    try {
      await this.boxAuth.signIn();
      this.updateBoxAuthStatus();
    } catch (error) {
      console.error('Box sign-in failed:', error);
      this.showError(`Box sign-in failed: ${error.message}`);
    }
  }

  handleBoxSignOut() {
    this.boxAuth.signOut();
    this.updateBoxAuthStatus();
  }

  getCriteria() {
    // Helper to get selected values from multi-select
    const getSelectedValues = (selectElement) => {
      return Array.from(selectElement.selectedOptions).map(option => option.value);
    };

    const criteria = {
      fileType: getSelectedValues(this.targetFileType),
      sampleRate: getSelectedValues(this.targetSampleRate),
      bitDepth: getSelectedValues(this.targetBitDepth),
      channels: getSelectedValues(this.targetChannels),
      minDuration: this.targetMinDuration.value || ''
    };

    return criteria;
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
      'auditions-character-recordings': {
        name: 'Auditions: Character Recordings',
        fileType: ['wav'],
        sampleRate: ['48000'],
        bitDepth: ['24'],
        channels: ['1'],
        minDuration: '120' // 2 minutes
      },
      'auditions-emotional-voice': {
        name: 'Auditions: Emotional Voice',
        fileType: ['wav'],
        sampleRate: ['48000'],
        bitDepth: ['16', '24'],
        channels: ['1', '2'],
        minDuration: '30'
      },
      'character-recordings': {
        name: 'Character Recordings',
        fileType: ['wav'],
        sampleRate: ['48000'],
        bitDepth: ['24'],
        channels: ['1'],
        minDuration: '' // No requirement
      },
      'p2b2-pairs-mono': {
        name: 'P2B2 Pairs (Mono)',
        fileType: ['wav'],
        sampleRate: ['44100', '48000'],
        bitDepth: ['16', '24'],
        channels: ['1'],
        minDuration: ''
      },
      'p2b2-pairs-stereo': {
        name: 'P2B2 Pairs (Stereo)',
        fileType: ['wav'],
        sampleRate: ['44100', '48000'],
        bitDepth: ['16', '24'],
        channels: ['2'],
        minDuration: ''
      },
      'p2b2-pairs-mixed': {
        name: 'P2B2 Pairs (Mixed)',
        fileType: ['wav'],
        sampleRate: ['44100', '48000'],
        bitDepth: ['16', '24'],
        channels: ['1', '2'],
        minDuration: ''
      },
      'three-hour': {
        name: 'Three Hour',
        fileType: ['wav'],
        sampleRate: ['48000'],
        bitDepth: ['24'],
        channels: ['1'],
        minDuration: '',
        supportsFilenameValidation: true,
        filenameValidationType: 'script-match', // Requires matching .txt script file
        gdriveOnly: true // Only available on Google Drive tab
      },
      'bilingual-conversational': {
        name: 'Bilingual Conversational',
        fileType: ['wav'],
        sampleRate: ['48000'],
        bitDepth: ['16', '24'],
        channels: ['2'],
        minDuration: '',
        supportsFilenameValidation: true,
        filenameValidationType: 'bilingual-pattern' // Validates [ConversationID]-[LangCode]-user-[UserID]-agent-[AgentID]
      },
      'custom': {
        name: 'Custom',
        // Custom allows manual selection of individual criteria
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
        // Helper to set multi-select values
        const setMultiSelect = (selectElement, values) => {
          // Clear all selections first
          Array.from(selectElement.options).forEach(option => {
            option.selected = false;
          });
          // Select the values from config
          const valuesArray = Array.isArray(values) ? values : (values ? [values] : []);
          valuesArray.forEach(value => {
            const option = Array.from(selectElement.options).find(opt => opt.value === value);
            if (option) option.selected = true;
          });
        };

        // Apply preset configuration
        setMultiSelect(this.targetFileType, config.fileType || []);
        setMultiSelect(this.targetSampleRate, config.sampleRate || []);
        setMultiSelect(this.targetBitDepth, config.bitDepth || []);
        setMultiSelect(this.targetChannels, config.channels || []);
        this.targetMinDuration.value = config.minDuration || '';

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

        // Update validation sections visibility based on current tab and preset
        this.updateValidationSectionsVisibility();
      }
    }

    // Save selected preset to localStorage for persistence
    localStorage.setItem('audio-analyzer-selected-preset', selectedPreset);
  }

  toggleFilenameValidationFields() {
    if (this.enableFilenameValidation.checked) {
      this.filenameValidationFields.style.display = 'block';
    } else {
      this.filenameValidationFields.style.display = 'none';
    }
    this.saveFilenameValidationSettings();
  }

  validateAnalysisTypeSelection() {
    // Ensure at least one analysis type is selected
    if (!this.enableAudioAnalysis.checked && !this.enableFilenameValidation.checked) {
      // If user unchecked the last option, re-check it
      this.enableAudioAnalysis.checked = true;
      alert('At least one analysis type must be selected');
    }
    this.saveFilenameValidationSettings();
  }

  saveFilenameValidationSettings() {
    const settings = {
      enableAudioAnalysis: this.enableAudioAnalysis.checked,
      enableFilenameValidation: this.enableFilenameValidation.checked,
      speakerId: this.speakerId.value,
      scriptsFolderUrl: this.scriptsFolderUrl.value
    };
    localStorage.setItem('audio-analyzer-filename-validation', JSON.stringify(settings));
  }

  loadFilenameValidationSettings() {
    const saved = localStorage.getItem('audio-analyzer-filename-validation');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        this.enableAudioAnalysis.checked = settings.enableAudioAnalysis !== false; // Default true
        this.enableFilenameValidation.checked = settings.enableFilenameValidation || false;
        this.speakerId.value = settings.speakerId || '';
        this.scriptsFolderUrl.value = settings.scriptsFolderUrl || '';

        // Show fields only if checkbox is checked AND current preset supports filename validation
        const selectedPreset = this.presetSelector.value;
        const presets = this.getPresetConfigurations();
        const config = presets[selectedPreset];

        if (this.enableFilenameValidation.checked && config && config.supportsFilenameValidation) {
          this.filenameValidationFields.style.display = 'block';
        } else {
          this.filenameValidationFields.style.display = 'none';
        }
      } catch (e) {
        console.error('Error loading filename validation settings:', e);
      }
    }
  }

  // Box filename validation methods
  toggleBoxFilenameValidationFields() {
    if (this.boxEnableFilenameValidation.checked) {
      this.boxFilenameValidationFields.style.display = 'block';
    } else {
      this.boxFilenameValidationFields.style.display = 'none';
    }
    this.saveBoxFilenameValidationSettings();
  }

  validateBoxAnalysisTypeSelection() {
    // Ensure at least one analysis type is selected
    if (!this.boxEnableAudioAnalysis.checked && !this.boxEnableFilenameValidation.checked) {
      // If user unchecked the last option, re-check it
      this.boxEnableAudioAnalysis.checked = true;
      alert('At least one analysis type must be selected');
    }
    this.saveBoxFilenameValidationSettings();
  }

  saveBoxFilenameValidationSettings() {
    const settings = {
      enableAudioAnalysis: this.boxEnableAudioAnalysis.checked,
      enableFilenameValidation: this.boxEnableFilenameValidation.checked
    };
    localStorage.setItem('audio-analyzer-box-filename-validation', JSON.stringify(settings));
  }

  loadBoxFilenameValidationSettings() {
    const saved = localStorage.getItem('audio-analyzer-box-filename-validation');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        this.boxEnableAudioAnalysis.checked = settings.enableAudioAnalysis !== false; // Default true
        this.boxEnableFilenameValidation.checked = settings.enableFilenameValidation || false;

        // Visibility controlled by preset configuration in handlePresetChange()
      } catch (e) {
        console.error('Error loading Box filename validation settings:', e);
      }
    }
  }

  // Local filename validation methods
  toggleLocalFilenameValidationFields() {
    if (this.localEnableFilenameValidation.checked) {
      // Only show fields if current preset is bilingual
      const presets = this.getPresetConfigurations();
      const selectedPreset = this.presetSelector.value;
      const config = presets[selectedPreset];
      const validationType = config?.filenameValidationType;

      if (validationType === 'bilingual-pattern') {
        this.localFilenameValidationFields.style.display = 'block';
      } else {
        this.localFilenameValidationFields.style.display = 'none';
      }
    } else {
      this.localFilenameValidationFields.style.display = 'none';
    }
    this.saveLocalFilenameValidationSettings();
  }

  validateLocalAnalysisTypeSelection() {
    // Ensure at least one analysis type is selected
    if (!this.localEnableAudioAnalysis.checked && !this.localEnableFilenameValidation.checked) {
      // If user unchecked the last option, re-check it
      this.localEnableAudioAnalysis.checked = true;
      alert('At least one analysis type must be selected');
    }
    this.saveLocalFilenameValidationSettings();
  }

  saveLocalFilenameValidationSettings() {
    const settings = {
      enableAudioAnalysis: this.localEnableAudioAnalysis.checked,
      enableFilenameValidation: this.localEnableFilenameValidation.checked
    };
    localStorage.setItem('audio-analyzer-local-filename-validation', JSON.stringify(settings));
  }

  loadLocalFilenameValidationSettings() {
    const saved = localStorage.getItem('audio-analyzer-local-filename-validation');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        this.localEnableAudioAnalysis.checked = settings.enableAudioAnalysis !== false; // Default true
        this.localEnableFilenameValidation.checked = settings.enableFilenameValidation || false;

        // Visibility controlled by preset configuration in handlePresetChange()
      } catch (e) {
        console.error('Error loading local filename validation settings:', e);
      }
    }
  }

  switchTab(tabName) {
    this.tabButtons.forEach(btn => btn.classList.remove('active'));
    this.tabContents.forEach(content => content.classList.remove('active'));

    // Activate the tab button
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Activate ALL tab content sections for this tab (there may be multiple)
    document.querySelectorAll(`.tab-content[data-tab="${tabName}"]`).forEach(content => {
      content.classList.add('active');
    });

    // Clear any existing results to avoid confusion between tabs
    this.cleanupForNewFile();
    this.hideAllSections();

    // Re-run preset logic to update validation section visibility based on current tab
    this.updateValidationSectionsVisibility();
  }

  // Dark mode methods
  toggleDarkMode() {
    const root = document.documentElement;
    const isDark = root.classList.contains('dark-mode');

    if (isDark) {
      root.classList.remove('dark-mode');
      localStorage.setItem('darkMode', 'false');
    } else {
      root.classList.add('dark-mode');
      localStorage.setItem('darkMode', 'true');
    }
  }

  initializeDarkMode() {
    const savedPreference = localStorage.getItem('darkMode');

    // If user has saved a preference, use that
    if (savedPreference !== null) {
      if (savedPreference === 'true') {
        document.documentElement.classList.add('dark-mode');
      }
    } else {
      // Otherwise, check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark-mode');
      }
    }
  }

  updateBuildInfo() {
    const buildInfoElement = document.getElementById('buildInfo');
    if (buildInfoElement) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const buildNumber = `${year}.${month}.${day}-${hours}${minutes}`;
      buildInfoElement.textContent = `Audio Analyzer build-${buildNumber}`;
    }
  }

  updateValidationSectionsVisibility() {
    // Get current active tab
    const activeTabButton = document.querySelector('.tab-button.active');
    const currentTab = activeTabButton ? activeTabButton.dataset.tab : 'local';

    const presets = this.getPresetConfigurations();
    const selectedPreset = this.presetSelector.value;
    const config = presets[selectedPreset];

    if (!config) return;

    const validationType = config.filenameValidationType;

    // Google Drive validation - show for presets that support validation
    if (currentTab === 'gdrive' && config.supportsFilenameValidation) {
      this.analysisTypeSection.style.display = 'block';

      // Show appropriate fields based on validation type
      if (this.enableFilenameValidation.checked) {
        this.filenameValidationFields.style.display = 'block';

        const driveThreeHourFields = document.getElementById('driveThreeHourFields');
        const driveBilingualFields = document.getElementById('driveBilingualFields');

        if (validationType === 'script-match') {
          // Three Hour validation - show speaker ID and scripts folder fields
          if (driveThreeHourFields) driveThreeHourFields.style.display = 'block';
          if (driveBilingualFields) driveBilingualFields.style.display = 'none';
        } else if (validationType === 'bilingual-pattern') {
          // Bilingual validation - show pattern info
          if (driveThreeHourFields) driveThreeHourFields.style.display = 'none';
          if (driveBilingualFields) driveBilingualFields.style.display = 'block';
        } else {
          if (driveThreeHourFields) driveThreeHourFields.style.display = 'none';
          if (driveBilingualFields) driveBilingualFields.style.display = 'none';
        }
      } else {
        this.filenameValidationFields.style.display = 'none';
      }
    } else {
      this.analysisTypeSection.style.display = 'none';
      this.filenameValidationFields.style.display = 'none';
    }

    // Box validation - show for presets that support validation (exclude gdrive-only presets)
    if (currentTab === 'box' && config.supportsFilenameValidation && !config.gdriveOnly) {
      this.boxAnalysisTypeSection.style.display = 'block';

      if (this.boxEnableFilenameValidation.checked) {
        if (validationType === 'bilingual-pattern') {
          // Bilingual validation - show pattern info
          this.boxFilenameValidationFields.style.display = 'block';
        } else {
          this.boxFilenameValidationFields.style.display = 'none';
        }
      } else {
        this.boxFilenameValidationFields.style.display = 'none';
      }
    } else {
      this.boxAnalysisTypeSection.style.display = 'none';
      this.boxFilenameValidationFields.style.display = 'none';
    }

    // Local validation - show for presets that support validation (exclude gdrive-only presets)
    if (currentTab === 'local' && config.supportsFilenameValidation && !config.gdriveOnly) {
      this.localAnalysisTypeSection.style.display = 'block';

      if (this.localEnableFilenameValidation.checked) {
        if (validationType === 'bilingual-pattern') {
          // Bilingual validation - show pattern info
          this.localFilenameValidationFields.style.display = 'block';
        } else {
          this.localFilenameValidationFields.style.display = 'none';
        }
      } else {
        this.localFilenameValidationFields.style.display = 'none';
      }
    } else {
      this.localAnalysisTypeSection.style.display = 'none';
      this.localFilenameValidationFields.style.display = 'none';
    }
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

      // Check if filename validation is needed for local files
      let filenameValidation = null;
      const presets = this.getPresetConfigurations();
      const config = presets[this.presetSelector.value];
      const validationType = config?.filenameValidationType;

      if (validationType && this.localEnableFilenameValidation.checked) {
        if (validationType === 'script-match') {
          // Three Hour validation - would need speaker ID, but not typically used for local files
          console.log('Three Hour filename validation not supported for local files');
        } else if (validationType === 'bilingual-pattern') {
          // Bilingual validation
          filenameValidation = this.validateBilingualFilename(file.name);
        }
      }

      // Display results
      this.validateAndDisplayResults(results, filenameValidation);
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
    this.currentBatchSource = 'local';
    this.batchResults = [];
    this.showBatchProgress(0, files.length, 'Initializing...');
    this.initializeBatchResultsTable();

    try {
      const results = await this.batchProcessor.processBatch(
        files,
        () => this.getCriteria(), // Pass function to get fresh criteria
        (progress) => {
          this.showBatchProgress(
            progress.current,
            progress.total,
            progress.currentFile
          );
        },
        (result) => {
          // Progressive callback - add result as each file completes

          // Add filename validation if enabled for bilingual preset
          if (this.localEnableFilenameValidation && this.localEnableFilenameValidation.checked) {
            const presets = this.getPresetConfigurations();
            const selectedPreset = this.presetSelector.value;
            const config = presets[selectedPreset];
            const validationType = config?.filenameValidationType;

            if (validationType === 'bilingual-pattern') {
              result.filenameValidation = this.validateBilingualFilename(result.filename);
              // Recalculate overall status including filename validation
              result.status = this.getOverallStatus(result.validation, false, result.filenameValidation);
            }

            // Check duration for SPONTANEOUS files (must be ≤10 minutes) - works even if filename validation is off
            if (validationType === 'bilingual-pattern' && result.analysis && result.analysis.duration) {
              const isSpontaneous = result.filename.replace(/\.\w+$/i, '').startsWith('SPONTANEOUS');
              if (isSpontaneous) {
                const durationInSeconds = result.analysis.duration;
                if (durationInSeconds > 600) {
                  // Create or update duration validation
                  if (!result.validation) {
                    result.validation = {};
                  }
                  result.validation.duration = {
                    status: 'warning',
                    issue: `SPONTANEOUS recordings must be ≤10 minutes (current: ${Math.round(durationInSeconds / 60)} min)`
                  };
                  // Recalculate status with duration warning
                  result.status = this.getOverallStatus(result.validation, false, result.filenameValidation);
                }
              }
            }
          }

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

    // Check if filename validation is needed for Google Drive single files
    let filenameValidation = null;
    const presets = this.getPresetConfigurations();
    const config = presets[this.presetSelector.value];
    const validationType = config?.filenameValidationType;

    if (validationType && this.enableFilenameValidation.checked) {
      if (validationType === 'script-match') {
        // Three Hour validation
        const speakerId = this.speakerId.value.trim();
        if (this.scriptBaseNames && this.scriptBaseNames.length > 0) {
          filenameValidation = this.validateFilename(file.name, this.scriptBaseNames, speakerId);
        }
      } else if (validationType === 'bilingual-pattern') {
        // Bilingual validation
        filenameValidation = this.validateBilingualFilename(file.name);
      }
    }

    this.validateAndDisplayResults(results, filenameValidation);
    this.showResults();
  }

  async fetchScriptFiles(scriptsFolderId) {
    // Fetch all .txt files from scripts folder
    try {
      const scriptFiles = await this.googleAuth.listFilesInFolder(scriptsFolderId, '.txt');
      // Extract base names (without .txt extension)
      const scriptBaseNames = scriptFiles.map(file =>
        file.name.trim().replace(/\.txt$/i, '')
      );
      console.log(`Found ${scriptBaseNames.length} script files:`, scriptBaseNames);
      return scriptBaseNames;
    } catch (error) {
      console.error('Error fetching script files:', error);
      throw new Error('Failed to fetch script files. Check the scripts folder URL.');
    }
  }

  validateFilename(filename, scriptBaseNames, speakerId) {
    // Based on Google Apps Script logic
    const wavName = filename.trim();
    const nameWithoutExt = wavName.replace(/\.wav$/i, '');

    // Get what's before the speaker ID
    const possibleBase = nameWithoutExt.split(`_${speakerId}`)[0];
    const expectedName = `${possibleBase}_${speakerId}.wav`;

    if (!scriptBaseNames.includes(possibleBase)) {
      return {
        status: 'fail',
        expectedFormat: '-',
        issue: 'No matching script file found'
      };
    } else if (wavName === expectedName) {
      return {
        status: 'pass',
        expectedFormat: expectedName,
        issue: ''
      };
    } else {
      return {
        status: 'fail',
        expectedFormat: `${possibleBase}_${speakerId}.wav`,
        issue: 'Incorrect filename for existing script'
      };
    }
  }

  validateBilingualFilename(filename) {
    // Validate bilingual filename pattern:
    // Regular: [ConversationID]-[LanguageCode]-user-[UserID]-agent-[AgentID].wav
    // Spontaneous: SPONTANEOUS_[number]-[LanguageCode]-user-[UserID]-agent-[AgentID].wav
    // Example regular: vdlg1_001_budgeting_app-en_us-user-10101-agent-10102.wav
    // Example spontaneous: SPONTANEOUS_1-en_us-user-10101-agent-10102.wav

    // Collect all validation issues
    const issues = [];

    // Check for leading/trailing whitespace (DO NOT trim - we want to catch this as an error)
    if (filename !== filename.trim()) {
      issues.push('Filename has leading or trailing whitespace');
    }

    // Check for embedded whitespace
    if (/\s/.test(filename)) {
      issues.push('Filename contains whitespace characters');
    }

    // Check file extension - must end with exactly .wav (case insensitive)
    const hasWavExtension = /\.wav$/i.test(filename);
    if (!hasWavExtension) {
      issues.push('Filename must end with .wav extension');
    }

    // Check for double extensions like .mp3.wav or .wav.wav (only if .wav extension exists)
    if (hasWavExtension) {
      const nameWithoutWav = filename.replace(/\.wav$/i, '');
      if (/\.\w+$/.test(nameWithoutWav)) {
        issues.push('Filename has multiple extensions (e.g., .mp3.wav or .wav.wav)');
      }
    }

    // Remove any extension for parsing
    const nameWithoutExt = filename.replace(/\.\w+$/i, '');

    // Check if this is a spontaneous recording
    const isSpontaneous = nameWithoutExt.startsWith('SPONTANEOUS_');

    if (isSpontaneous) {
      // Validate spontaneous format: SPONTANEOUS_[number]-[rest]

      // Check that SPONTANEOUS is all caps
      if (!nameWithoutExt.startsWith('SPONTANEOUS_')) {
        issues.push('Unscripted recordings must start with "SPONTANEOUS_" (all caps)');
      }

      // Extract the spontaneous ID and rest of filename
      const spontaneousMatch = nameWithoutExt.match(/^SPONTANEOUS_(\d+)-(.+)$/);
      if (!spontaneousMatch) {
        issues.push('Invalid unscripted format: expected SPONTANEOUS_[number]-[LanguageCode]-user-[UserID]-agent-[AgentID]');
        return {
          status: 'fail',
          expectedFormat: 'SPONTANEOUS_[number]-[LanguageCode]-user-[UserID]-agent-[AgentID].wav',
          issue: issues.join('\n'),
          isSpontaneous: true
        };
      }

      const spontaneousId = spontaneousMatch[1];
      const restOfFilename = spontaneousMatch[2];

      // Validate that rest of filename (after SPONTANEOUS_[number]-) is lowercase
      if (restOfFilename !== restOfFilename.toLowerCase()) {
        issues.push('All text after "SPONTANEOUS_[number]-" must be lowercase');
      }

      // Parse the rest of the filename
      const parts = restOfFilename.toLowerCase().split('-');

      // Expected: [LanguageCode]-user-[UserID]-agent-[AgentID]
      if (parts.length !== 5) {
        issues.push(`Invalid format: expected 5 parts after SPONTANEOUS_[number]-, got ${parts.length}`);
        return {
          status: 'fail',
          expectedFormat: 'SPONTANEOUS_[number]-[LanguageCode]-user-[UserID]-agent-[AgentID].wav',
          issue: issues.join('\n'),
          isSpontaneous: true
        };
      }

      const languageCode = parts[0];
      const userLabel = parts[1];
      const userId = parts[2];
      const agentLabel = parts[3];
      const agentId = parts[4];

      // Validate labels
      if (userLabel !== 'user') {
        issues.push(`Expected 'user' label, got '${userLabel}'`);
      }

      if (agentLabel !== 'agent') {
        issues.push(`Expected 'agent' label, got '${agentLabel}'`);
      }

      // Validate language code
      if (!bilingualValidationData.languageCodes.includes(languageCode)) {
        issues.push(`Invalid language code: '${languageCode}'`);
      }

      // Validate contributor pair (order doesn't matter)
      const isValidPair = bilingualValidationData.contributorPairs.some(pair =>
        (pair[0] === userId && pair[1] === agentId) ||
        (pair[0] === agentId && pair[1] === userId)
      );

      if (!isValidPair) {
        issues.push(`Invalid contributor pair: user-${userId}, agent-${agentId}`);
      }

      // If there are any issues, return failure with all issues
      if (issues.length > 0) {
        return {
          status: 'fail',
          expectedFormat: 'SPONTANEOUS_[number]-[LanguageCode]-user-[UserID]-agent-[AgentID].wav',
          issue: issues.join('\n'),
          isSpontaneous: true
        };
      }

      // All validations passed
      const expectedFormat = `SPONTANEOUS_${spontaneousId}-${languageCode}-user-${userId}-agent-${agentId}.wav`;
      return {
        status: 'pass',
        expectedFormat: expectedFormat,
        issue: '',
        isSpontaneous: true
      };

    } else {
      // Regular (non-spontaneous) recording validation

      // Check that filename is lowercase (except .wav extension)
      if (nameWithoutExt !== nameWithoutExt.toLowerCase()) {
        issues.push('Filename must be all lowercase');
      }

      // Use lowercase version for parsing to extract parts even if original wasn't lowercase
      const parts = nameWithoutExt.toLowerCase().split('-');

      // Expected format: [ConversationID]-[LanguageCode]-user-[UserID]-agent-[AgentID]
      // This should result in exactly 6 parts when split by '-'
      if (parts.length !== 6) {
        issues.push(`Invalid format: expected 6 parts separated by '-', got ${parts.length}`);
        // Can't continue validation without proper parts
        return {
          status: 'fail',
          expectedFormat: '[ConversationID]-[LanguageCode]-user-[UserID]-agent-[AgentID].wav',
          issue: issues.join('\n'),
          isSpontaneous: false
        };
      }

      const conversationId = parts[0];
      const languageCode = parts[1];
      const userLabel = parts[2];
      const userId = parts[3];
      const agentLabel = parts[4];
      const agentId = parts[5];

      // Validate "user" and "agent" labels
      if (userLabel !== 'user') {
        issues.push(`Expected 'user' label, got '${userLabel}'`);
      }

      if (agentLabel !== 'agent') {
        issues.push(`Expected 'agent' label, got '${agentLabel}'`);
      }

      // Validate language code
      if (!bilingualValidationData.languageCodes.includes(languageCode)) {
        issues.push(`Invalid language code: '${languageCode}'`);
      }

      // Validate conversation ID for this language (only if language code is valid)
      if (bilingualValidationData.languageCodes.includes(languageCode)) {
        const validConversations = bilingualValidationData.conversationsByLanguage[languageCode] || [];
        if (!validConversations.includes(conversationId)) {
          issues.push(`Invalid conversation ID: '${conversationId}' for language '${languageCode}'`);
        }
      }

      // Validate contributor pair (order doesn't matter)
      const isValidPair = bilingualValidationData.contributorPairs.some(pair =>
        (pair[0] === userId && pair[1] === agentId) ||
        (pair[0] === agentId && pair[1] === userId)
      );

      if (!isValidPair) {
        issues.push(`Invalid contributor pair: user-${userId}, agent-${agentId}`);
      }

      // If there are any issues, return failure with all issues
      if (issues.length > 0) {
        return {
          status: 'fail',
          expectedFormat: '[ConversationID]-[LanguageCode]-user-[UserID]-agent-[AgentID].wav',
          issue: issues.join('\n'),
          isSpontaneous: false
        };
      }

      // All validations passed
      const expectedFormat = `${conversationId}-${languageCode}-user-${userId}-agent-${agentId}.wav`;
      return {
        status: 'pass',
        expectedFormat: expectedFormat,
        issue: '',
        isSpontaneous: false
      };
    }
  }

  async handleGoogleDriveFolder(folderId) {
    // List all audio files in folder
    const audioFiles = await this.googleAuth.listAudioFilesInFolder(folderId);

    if (audioFiles.length === 0) {
      throw new Error('No audio files found in this folder');
    }

    console.log(`Found ${audioFiles.length} audio files in folder`);

    // Determine validation type and fetch necessary data
    const presets = this.getPresetConfigurations();
    const selectedPreset = this.presetSelector.value;
    const config = presets[selectedPreset];
    const validationType = config?.filenameValidationType;

    let scriptBaseNames = [];
    if (this.enableFilenameValidation.checked) {
      if (validationType === 'script-match') {
        // Three Hour validation - fetch script files
        const scriptsFolderUrl = this.scriptsFolderUrl.value.trim();
        const speakerId = this.speakerId.value.trim();

        if (!speakerId) {
          throw new Error('Speaker ID is required for filename validation');
        }

        if (scriptsFolderUrl) {
          const scriptsFolderId = this.extractFolderId(scriptsFolderUrl);
          if (scriptsFolderId) {
            scriptBaseNames = await this.fetchScriptFiles(scriptsFolderId);
          } else {
            throw new Error('Invalid scripts folder URL');
          }
        } else {
          throw new Error('Scripts folder URL is required for filename validation');
        }
      }
      // For bilingual-pattern validation, no additional data needed (uses bundled data)
    }

    // Switch to batch mode
    this.batchMode = true;
    this.currentBatchSource = 'drive';
    this.batchResults = [];
    this.batchCancelled = false;
    this.scriptBaseNames = scriptBaseNames; // Store for use in validation
    this.currentValidationType = validationType; // Store validation type

    // Initialize table and show progress
    this.showBatchProgress(0, audioFiles.length, 'Initializing...');
    this.initializeBatchResultsTable();

    // Process files in parallel (3 at a time)
    const PARALLEL_LIMIT = 3;
    let completed = 0;

    for (let i = 0; i < audioFiles.length; i += PARALLEL_LIMIT) {
      // Check for cancellation
      if (this.batchCancelled) {
        console.log('Batch processing cancelled');
        break;
      }

      // Get batch of files to process in parallel
      const batch = audioFiles.slice(i, i + PARALLEL_LIMIT);

      // Process batch in parallel
      const promises = batch.map(async (driveFile) => {
        if (this.batchCancelled) return null;

        try {
          const validationType = this.currentValidationType;
          let analysis;
          let usedFallback = false;
          const useMetadataOnly = this.enableFilenameValidation.checked && !this.enableAudioAnalysis.checked;

          if (useMetadataOnly) {
            // Metadata-only mode: faster, but less detailed analysis
            const metadata = await this.googleAuth.getFileMetadata(driveFile);
            console.log('Full metadata for', metadata.name, ':', metadata);
            analysis = {
              filename: metadata.name,
              fileSize: parseInt(metadata.size) || 0,
              fileType: this.getFileTypeFromName(metadata.name),
              sampleRate: 'Unknown',
              bitDepth: 'Unknown',
              channels: 'Unknown',
              duration: metadata.videoMediaMetadata?.durationMillis
                ? metadata.videoMediaMetadata.durationMillis / 1000
                : 'Unknown'
            };
            usedFallback = true; // Indicate that this is a limited analysis
          } else {
            // Existing logic: download headers for more detailed analysis
            const maxRetries = 3;
            let lastError = null;
            for (let attempt = 0; attempt < maxRetries; attempt++) {
              try {
                // Try to download file headers (first 100KB) for detailed analysis
                const headerBlob = await this.googleAuth.downloadFileHeaders(driveFile.id);

                // Create a pseudo-File object for analysis
                const fileSize = parseInt(driveFile.size) || headerBlob.size;
                const file = new File([headerBlob], driveFile.name, {
                  type: driveFile.mimeType,
                  lastModified: new Date(driveFile.modifiedTime).getTime()
                });

                // Add a custom size property that overrides the blob size
                Object.defineProperty(file, 'size', {
                  value: fileSize,
                  writable: false
                });

                // Analyze headers (will use the overridden file.size)
                analysis = await this.batchProcessor.analyzer.analyzeHeaders(file);

                // Success! Break out of retry loop
                break;

              } catch (downloadError) {
                lastError = downloadError;

                // Check if it's a retryable error (5xx server errors)
                const isRetryable = downloadError.message.includes('500') ||
                                    downloadError.message.includes('502') ||
                                    downloadError.message.includes('503') ||
                                    downloadError.message.includes('504');

                if (isRetryable && attempt < maxRetries - 1) {
                  // Wait with exponential backoff before retrying
                  const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Max 5 seconds
                  console.log(`Retry ${attempt + 1}/${maxRetries} for ${driveFile.name} after ${delay}ms...`);
                  await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                  // All retries failed, so we throw the last error
                  throw lastError;
                }
              }
            }
          }

          // Use Google's duration if available (more accurate than our calculation)
          if (driveFile.videoMediaMetadata?.durationMillis) {
            analysis.duration = driveFile.videoMediaMetadata.durationMillis / 1000; // Convert ms to seconds
          }

          // Apply validation - get fresh criteria in case user changed it during processing
          const validation = CriteriaValidator.validateResults(analysis, this.getCriteria(), useMetadataOnly);

          // Apply filename validation if enabled
          let filenameValidation = null;
          if (this.enableFilenameValidation.checked) {
            if (validationType === 'script-match' && this.scriptBaseNames.length > 0) {
              // Three Hour validation
              const speakerId = this.speakerId.value.trim();
              filenameValidation = this.validateFilename(driveFile.name, this.scriptBaseNames, speakerId);
            } else if (validationType === 'bilingual-pattern') {
              // Bilingual validation
              filenameValidation = this.validateBilingualFilename(driveFile.name);
            }

            // Check duration for SPONTANEOUS files (must be ≤10 minutes) - works even if filename validation is off
            if (validationType === 'bilingual-pattern' && analysis && analysis.duration) {
              const isSpontaneous = driveFile.name.replace(/\.\w+$/i, '').startsWith('SPONTANEOUS');
              if (isSpontaneous && analysis.duration > 600) {
                // Create or update duration validation
                if (!validation) {
                  validation = {};
                }
                validation.duration = {
                  status: 'warning',
                  issue: `SPONTANEOUS recordings must be ≤10 minutes (current: ${Math.round(analysis.duration / 60)} min)`
                };
              }
            }
          }

          return {
            filename: driveFile.name,
            file: null, // Don't have local file
            driveFileId: driveFile.id, // Store Drive file ID for playback
            analysis,
            validation,
            filenameValidation, // Add filename validation results
            status: this.getOverallStatus(validation, useMetadataOnly, filenameValidation),
            warning: usedFallback ? 'Limited analysis (Google Drive error)' : null
          };

        } catch (error) {
          console.error(`Error processing ${driveFile.name}:`, error);
          return {
            filename: driveFile.name,
            file: null,
            driveFileId: driveFile.id, // Still store ID for playback
            analysis: null,
            validation: null,
            status: 'error',
            error: error.message
          };
        }
      });

      // Wait for all in batch to complete
      const results = await Promise.all(promises);

      // Add results progressively
      results.forEach(result => {
        if (result) {
          this.batchResults.push(result);
          this.addBatchResultRow(result);
          completed++;

          // Update progress (only if not cancelled)
          if (!this.batchCancelled) {
            this.showBatchProgress(completed, audioFiles.length, result.filename);
          }
        }
      });

      this.updateBatchSummary();
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

  extractFolderId(url) {
    // Extract folder ID from Google Drive URL (based on Apps Script logic)
    const match = url.match(/[-\w]{25,}/);
    return match ? match[0] : null;
  }

  // Box URL handlers
  async handleBoxUrl() {
    const url = this.boxUrl.value.trim();
    if (!url) return;

    if (this.processingFile) {
      console.log('Already processing a file, ignoring Box request');
      return;
    }

    // Check if user is signed in to Box
    if (!this.boxAuth.isSignedIn()) {
      // Trigger sign-in flow
      await this.handleBoxSignIn();
      // After sign-in redirect, they'll need to click Analyze again
      return;
    }

    this.processingFile = true;
    this.cleanupForNewFile();
    this.showLoading();

    try {
      const parsed = this.extractBoxIdFromUrl(url);
      if (!parsed) {
        throw new Error('Invalid Box URL. Please ensure it\'s a valid Box file or folder link.');
      }

      // Store the shared link for API calls
      this.currentBoxSharedLink = url;

      this.updateBoxAuthStatus();

      // Always use authenticated access (null for sharedLink parameter)
      const useSharedLink = null;

      if (parsed.isFolder) {
        await this.handleBoxFolder(parsed.id, useSharedLink);
      } else {
        await this.handleBoxFile(parsed.id, useSharedLink);
      }

    } catch (error) {
      console.error('Box error:', error);
      this.cleanupForNewFile();

      // For shared links, don't prompt for sign-in
      if (error.message.includes('sign-in') || error.message.includes('auth') || error.message.includes('Session expired')) {
        if (!this.currentBoxSharedLink) {
          this.showError('Please sign in to Box to access files. Click "Analyze" to authenticate.');
        } else {
          this.showError(`Failed to access Box file: ${error.message}. The file may not be publicly shared.`);
        }
      } else {
        this.showError(`Failed to process Box: ${error.message}`);
      }
    } finally {
      this.processingFile = false;
      this.currentBoxSharedLink = null;
    }
  }

  async handleBoxFile(fileId, sharedLink = null) {
    // Check if filename validation is available and enabled
    const isFilenameValidationAvailable = this.boxAnalysisTypeSection.style.display !== 'none';
    const useFilenameValidation = isFilenameValidationAvailable && this.boxEnableFilenameValidation.checked;
    const useMetadataOnly = useFilenameValidation && !this.boxEnableAudioAnalysis.checked;

    // Get file metadata first (for filename and size)
    const metadata = await this.boxAuth.getFileMetadata({ id: fileId }, sharedLink);
    const filename = metadata.name;

    let filenameValidation = null;
    if (useFilenameValidation) {
      // Validate bilingual filename pattern
      filenameValidation = this.validateBilingualFilename(filename);
    }

    let results;
    if (useMetadataOnly) {
      // Metadata-only mode: skip audio analysis
      results = {
        filename: filename,
        fileSize: parseInt(metadata.size) || 0,
        fileType: this.getFileTypeFromName(filename),
        sampleRate: 'Unknown',
        bitDepth: 'Unknown',
        channels: 'Unknown',
        duration: 'Unknown'
      };

      // Don't need to download file or setup audio player in metadata-only mode
      this.currentFile = null;
      this.currentResults = results;

      // Validate and display
      const criteria = this.getCriteria();
      const validationResults = this.engine.validateCriteria(results, criteria);

      // Check duration for SPONTANEOUS files (must be ≤10 minutes) for bilingual preset
      const isSpontaneous = filename.replace(/\.\w+$/i, '').startsWith('SPONTANEOUS');
      const isBilingual = useFilenameValidation; // useFilenameValidation is only true for bilingual in this context
      if (isBilingual && isSpontaneous && results && results.duration && results.duration !== 'Unknown') {
        const durationInSeconds = results.duration;
        if (durationInSeconds > 600) {
          // Create or update duration validation
          if (!validationResults) {
            validationResults = {};
          }
          validationResults.duration = {
            status: 'warning',
            issue: `SPONTANEOUS recordings must be ≤10 minutes (current: ${Math.round(durationInSeconds / 60)} min)`
          };
        }
      }

      this.currentResults.validation = validationResults;
      this.currentResults.filenameValidation = filenameValidation;

      this.validateAndDisplayResults(results, filenameValidation);
      this.showResults();
    } else {
      // Full audio analysis mode
      const file = await this.boxAuth.downloadFile(fileId, sharedLink);
      this.currentFile = file;

      results = await this.engine.analyzeFile(file);

      // Override file size with actual size from metadata
      if (results && metadata && metadata.size) {
        results.fileSize = metadata.size;
      }

      this.currentResults = results;
      this.currentResults.filenameValidation = filenameValidation;

      this.setupAudioPlayer(file);
      this.validateAndDisplayResults(results, filenameValidation);
      this.showResults();
    }
  }

  async handleBoxFolder(folderId, sharedLink = null) {
    // Similar to Google Drive folder handling
    const audioFiles = await this.boxAuth.listAudioFilesInFolder(folderId, sharedLink);

    if (audioFiles.length === 0) {
      throw new Error('No audio files found in the Box folder');
    }

    this.batchMode = true;
    this.currentBatchSource = 'box';
    this.batchCancelled = false;
    this.showBatchProgress();

    // Only use filename validation if the UI section is visible (meaning preset supports it)
    const isFilenameValidationAvailable = this.boxAnalysisTypeSection.style.display !== 'none';
    const useMetadataOnly = isFilenameValidationAvailable && this.boxEnableFilenameValidation.checked && !this.boxEnableAudioAnalysis.checked;

    try {
      this.batchResults = [];
      let passCount = 0;
      let warningCount = 0;
      let failCount = 0;
      let errorCount = 0;
      let totalDuration = 0;

      this.initializeBatchResultsTable();

      for (let i = 0; i < audioFiles.length; i++) {
        if (this.batchCancelled) {
          console.log('Batch processing cancelled by user');
          break;
        }

        const boxFile = audioFiles[i];
        this.showBatchProgress(i + 1, audioFiles.length, boxFile.name);

        try {
          let analysisResults = null;
          let filenameValidation = null;

          if (isFilenameValidationAvailable && this.boxEnableFilenameValidation.checked) {
            // Validate bilingual filename pattern
            filenameValidation = this.validateBilingualFilename(boxFile.name);
          }

          let metadata = null;
          if (useMetadataOnly) {
            // Metadata-only mode: faster, skip audio analysis
            metadata = await this.boxAuth.getFileMetadata(boxFile, sharedLink);
            analysisResults = {
              filename: boxFile.name,
              fileSize: parseInt(metadata.size) || 0,
              fileType: this.getFileTypeFromName(boxFile.name),
              sampleRate: 'Unknown',
              bitDepth: 'Unknown',
              channels: 'Unknown',
              duration: 'Unknown'
            };
          } else {
            // Full audio analysis mode - use header-only analysis for batch processing
            metadata = await this.boxAuth.getFileMetadata(boxFile, sharedLink);
            const headerBlob = await this.boxAuth.downloadFileHeaders(boxFile.id, 102400, sharedLink);
            const headerFile = new File([headerBlob], boxFile.name);

            // Override file size property to be the actual file size (for duration calculation)
            const fileSize = parseInt(metadata.size) || headerFile.size;
            Object.defineProperty(headerFile, 'size', {
              value: fileSize,
              writable: false
            });

            // Use batch processor for header-only analysis
            analysisResults = await this.batchProcessor.analyzer.analyzeHeaders(headerFile);

            if (analysisResults && analysisResults.duration && analysisResults.duration !== 'Unknown') {
              totalDuration += analysisResults.duration;
            }
          }

          const criteria = this.getCriteria();
          const validationResults = analysisResults
            ? this.engine.validateCriteria(analysisResults, criteria)
            : {};

          // Check duration for SPONTANEOUS files (must be ≤10 minutes) for bilingual preset
          const isSpontaneous = boxFile.name.replace(/\.\w+$/i, '').startsWith('SPONTANEOUS');
          const isBilingual = isFilenameValidationAvailable; // Only true for bilingual in this context
          if (isBilingual && isSpontaneous && analysisResults && analysisResults.duration && analysisResults.duration !== 'Unknown') {
            const durationInSeconds = analysisResults.duration;
            if (durationInSeconds > 600) {
              // Create or update duration validation
              if (!validationResults) {
                validationResults = {};
              }
              validationResults.duration = {
                status: 'warning',
                issue: `SPONTANEOUS recordings must be ≤10 minutes (current: ${Math.round(durationInSeconds / 60)} min)`
              };
            }
          }

          const overallStatus = this.getOverallStatus(validationResults, useMetadataOnly, filenameValidation);

          if (overallStatus === 'pass') passCount++;
          else if (overallStatus === 'warning') warningCount++;
          else if (overallStatus === 'fail') failCount++;

          const result = {
            name: boxFile.name,
            filename: boxFile.name,
            analysis: analysisResults,
            validation: validationResults,
            filenameValidation: filenameValidation,
            status: overallStatus,
            error: null,
            boxFileId: boxFile.id  // Store Box file ID for potential future use, but don't show play button
          };
          this.batchResults.push(result);

          this.addBatchResultRow(result);

        } catch (error) {
          console.error(`Error processing ${boxFile.name}:`, error);
          errorCount++;
          const errorResult = {
            name: boxFile.name,
            filename: boxFile.name,
            analysis: null,
            validation: {},
            filenameValidation: null,
            status: 'error',
            error: error.message
          };
          this.batchResults.push(errorResult);

          this.addBatchResultRow(errorResult);
        }
      }

      this.updateBatchSummary(passCount, warningCount, failCount, errorCount, totalDuration);

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

  async fetchBoxScriptFiles(scriptsFolderId, scriptsSharedLink = null) {
    try {
      const scriptFiles = await this.boxAuth.listFilesInFolder(scriptsFolderId, '.txt', scriptsSharedLink);
      const scriptBaseNames = scriptFiles.map(file =>
        file.name.trim().replace(/\.txt$/i, '')
      );
      console.log(`Found ${scriptBaseNames.length} Box script files:`, scriptBaseNames);
      return scriptBaseNames;
    } catch (error) {
      console.error('Error fetching Box script files:', error);
      throw new Error('Failed to fetch script files. Check the scripts folder URL.');
    }
  }

  extractBoxIdFromUrl(url) {
    // Handle Box URL formats
    // Shared file: https://voices.app.box.com/s/v1rhafzrznsebbgwubst5ewbu4hlh0ej/file/2001196103399
    // Shared folder: https://voices.app.box.com/s/v1rhafzrznsebbgwubst5ewbu4hlh0ej/folder/343278172663
    // Direct links: https://app.box.com/file/123456789 or /folder/123456789

    // Check for shared link format first
    const sharedFileMatch = url.match(/\/s\/[^/]+\/file\/(\d+)/);
    if (sharedFileMatch) {
      return { id: sharedFileMatch[1], isFolder: false, sharedLink: url };
    }

    const sharedFolderMatch = url.match(/\/s\/[^/]+\/folder\/(\d+)/);
    if (sharedFolderMatch) {
      return { id: sharedFolderMatch[1], isFolder: true, sharedLink: url };
    }

    // Fallback to direct link patterns
    const patterns = [
      /\/file\/(\d+)/,    // File link
      /\/folder\/(\d+)/,  // Folder link
      /^(\d+)$/           // Just the ID
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return { id: match[1], isFolder: pattern === patterns[1], sharedLink: null };
    }

    return null;
  }

  extractBoxFolderId(url) {
    const match = url.match(/\/folder\/(\d+)/);
    return match ? match[1] : null;
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

  validateAndDisplayResults(results, filenameValidation = null) {
    const criteria = this.getCriteria();
    let validationResults = this.engine.validateCriteria(results, criteria);

    // Check duration for SPONTANEOUS files (must be ≤10 minutes) for bilingual preset
    const presets = this.getPresetConfigurations();
    const selectedPreset = this.presetSelector.value;
    const presetConfig = presets[selectedPreset];
    const validationType = presetConfig?.filenameValidationType;

    const currentFilename = this.currentFile ? this.currentFile.name : (results.filename || '');
    const isSpontaneous = currentFilename.replace(/\.\w+$/i, '').startsWith('SPONTANEOUS');

    if (validationType === 'bilingual-pattern' && isSpontaneous && results && results.duration && results.duration !== 'Unknown') {
      const durationInSeconds = results.duration;
      if (durationInSeconds > 600) {
        // Create or update duration validation
        if (!validationResults) {
          validationResults = {};
        }
        validationResults.duration = {
          status: 'warning',
          issue: `SPONTANEOUS recordings must be ≤10 minutes (current: ${Math.round(durationInSeconds / 60)} min)`
        };
      }
    }

    const formatted = this.engine.formatResults(results);
    const filename = this.currentFile ? this.currentFile.name : (results.filename || '-');

    // Get overall status
    const overallStatus = this.getOverallStatus(validationResults, false, filenameValidation);

    // Get validation statuses for each field
    const fileTypeStatus = this.getValidationStatus(validationResults, 'fileType', results.fileType);
    const sampleRateStatus = this.getValidationStatus(validationResults, 'sampleRate', results.sampleRate);
    const bitDepthStatus = this.getValidationStatus(validationResults, 'bitDepth', results.bitDepth);
    const channelsStatus = this.getValidationStatus(validationResults, 'channels', results.channels);
    const durationStatus = this.getValidationStatus(validationResults, 'duration', results.duration);

    // Update column headers visibility based on criteria
    this.updateSingleFileColumnVisibility(criteria, filenameValidation);

    // Create table row
    const row = document.createElement('tr');
    row.className = `batch-row ${overallStatus}`;

    // Filename validation cell
    let filenameCheckCell = '';
    if (filenameValidation) {
      const icon = filenameValidation.status === 'pass' ? '✅' : '❌';
      let tooltipText = '';
      if (filenameValidation.status === 'pass') {
        tooltipText = 'Filename is valid';
      } else {
        tooltipText = filenameValidation.issue;
        if (filenameValidation.expectedFormat) {
          tooltipText += `\n\nExpected: ${filenameValidation.expectedFormat}`;
        }
      }
      filenameCheckCell = `<td class="filename-check-${filenameValidation.status}" title="${tooltipText}">${icon}</td>`;
    } else {
      filenameCheckCell = `<td style="display: none;"></td>`;
    }

    // Play button - always show for single file
    const playButton = `<button class="play-btn-small" id="singleFilePlayBtn">▶</button>`;

    const escapedFilename = escapeHtml(filename);
    row.innerHTML = `
      <td class="filename" title="${escapedFilename}">${escapedFilename}</td>
      <td><span class="status-badge ${overallStatus}">${overallStatus}</span></td>
      ${filenameCheckCell}
      <td class="validation-${fileTypeStatus}">${formatted.fileType || 'Unknown'}</td>
      <td class="validation-${sampleRateStatus}">${formatted.sampleRate || '-'}</td>
      <td class="validation-${bitDepthStatus}">${formatted.bitDepth || '-'}</td>
      <td class="validation-${channelsStatus}">${formatted.channels || '-'}</td>
      <td class="validation-${durationStatus}">${formatted.duration || '-'}</td>
      <td>${formatted.fileSize || '-'}</td>
      <td>${playButton}</td>
    `;

    // Clear and append row
    const singleTableBody = document.getElementById('singleTableBody');
    singleTableBody.innerHTML = '';
    singleTableBody.appendChild(row);

    // Add event listener to play button
    const playBtn = row.querySelector('#singleFilePlayBtn');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        this.playSingleFile();
      });
    }

    // Add tooltip listener for filename check cell
    const checkCell = row.querySelector('.filename-check-pass, .filename-check-fail');
    if (checkCell) {
      this.setupFilenameCheckTooltip(checkCell);
    }

    // Add tooltip listener for filename cell
    const filenameCell = row.querySelector('.filename');
    if (filenameCell) {
      this.setupFilenameCheckTooltip(filenameCell);
    }
  }

  updateSingleFileColumnVisibility(criteria, filenameValidation) {
    // Show/hide filename check column based on whether filename validation is provided
    const filenameCheckHeader = document.getElementById('singleFilenameCheckHeader');
    if (filenameCheckHeader) {
      filenameCheckHeader.style.display = filenameValidation ? '' : 'none';
    }

    // Always show all other columns for single file view
    const headers = ['singleFormatHeader', 'singleSampleRateHeader', 'singleBitDepthHeader', 'singleChannelsHeader', 'singleDurationHeader'];
    headers.forEach(headerId => {
      const header = document.getElementById(headerId);
      if (header) {
        header.style.display = '';
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

      // Display advanced results with color coding
      const peakEl = document.getElementById('peakLevel');
      peakEl.textContent = results.peakDb === -Infinity ? '-∞ dB' : `${results.peakDb.toFixed(1)} dB`;
      // Peak Level is informational only - no color coding
      peakEl.className = '';

      const noiseFloorEl = document.getElementById('noiseFloor');
      noiseFloorEl.textContent = results.noiseFloorDb === -Infinity ? '-∞ dB' : `${results.noiseFloorDb.toFixed(1)} dB`;
      // Noise Floor (Old): pass <= -60, warning <= -50, fail > -50
      if (results.noiseFloorDb <= -60.0 || results.noiseFloorDb === -Infinity) {
        noiseFloorEl.className = 'validation-pass';
      } else if (results.noiseFloorDb <= -50.0) {
        noiseFloorEl.className = 'validation-warning';
      } else {
        noiseFloorEl.className = 'validation-fail';
      }

      const noiseFloorHistEl = document.getElementById('noiseFloorHistogram');
      noiseFloorHistEl.textContent = results.noiseFloorDbHistogram === -Infinity ? '-∞ dB' : `${results.noiseFloorDbHistogram.toFixed(1)} dB`;
      // Noise Floor (New): pass <= -60, warning <= -50, fail > -50
      if (results.noiseFloorDbHistogram <= -60.0 || results.noiseFloorDbHistogram === -Infinity) {
        noiseFloorHistEl.className = 'validation-pass';
      } else if (results.noiseFloorDbHistogram <= -50.0) {
        noiseFloorHistEl.className = 'validation-warning';
      } else {
        noiseFloorHistEl.className = 'validation-fail';
      }

      const normEl = document.getElementById('normalization');
      const normStatus = results.normalizationStatus;
      normEl.innerHTML = `${normStatus.message}<br><small>Peak: ${normStatus.peakDb.toFixed(1)}dB (Target: ${normStatus.targetDb.toFixed(1)}dB)</small>`;
      // Normalization: pass if normalized
      if (normStatus.status === 'normalized') {
        normEl.className = 'validation-pass';
      } else {
        normEl.className = 'validation-fail';
      }

      this.advancedResultsDynamicSection.innerHTML = ''; // Clear previous results

      // Display stereo separation for stereo files
      const stereoEl = document.getElementById('stereoSeparation');
      const micBleedOldEl = document.getElementById('micBleedOld');
      const micBleedNewEl = document.getElementById('micBleedNew');
      const micBleedOldResult = document.getElementById('micBleedOldResult');
      const micBleedNewResult = document.getElementById('micBleedNewResult');

      if (this.audioBuffer.numberOfChannels === 2) {
        const stereoResults = this.engine.analyzeStereoSeparation(this.audioBuffer);
        if (stereoResults) {
          this.currentResults.stereoAnalysis = stereoResults;
          stereoEl.innerHTML = `${stereoResults.stereoType}<br><small>${(stereoResults.stereoConfidence * 100).toFixed(0)}% confidence</small>`;

          // Only run mic bleed analysis for conversational stereo
          if (stereoResults.stereoType === 'Conversational Stereo') {
            const micBleedResults = this.engine.analyzeMicBleed(this.audioBuffer);
            if (micBleedResults) {
              this.currentResults.micBleedAnalysis = micBleedResults;
              micBleedOldEl.style.display = 'block';
              micBleedNewEl.style.display = 'block';

              // OLD METHOD display - compact format
              const oldResults = micBleedResults.old;
              const leftBleed = oldResults.leftChannelBleedDb;
              const rightBleed = oldResults.rightChannelBleedDb;
              const bleedThreshold = -40;

              let oldConclusion, oldStatusClass;
              if (leftBleed > bleedThreshold || rightBleed > bleedThreshold) {
                oldConclusion = 'Likely present';
                oldStatusClass = 'validation-fail';
              } else {
                oldConclusion = 'Not detected';
                oldStatusClass = 'validation-pass';
              }

              const leftBleedStr = leftBleed === -Infinity ? '-∞' : leftBleed.toFixed(1);
              const rightBleedStr = rightBleed === -Infinity ? '-∞' : rightBleed.toFixed(1);
              micBleedOldResult.innerHTML = `${oldConclusion}<br><small>L: ${leftBleedStr}dB, R: ${rightBleedStr}dB</small>`;
              micBleedOldResult.className = oldStatusClass;

              // NEW METHOD display - compact format
              const newResults = micBleedResults.new;
              const medianSep = newResults.medianSeparation;
              const p10Sep = newResults.p10Separation;
              const percentageBleed = newResults.percentageConfirmedBleed;

              let newConclusion, newStatusClass;
              if (percentageBleed > 10 || p10Sep < 10) {
                newConclusion = 'Likely present';
                newStatusClass = 'validation-fail';
              } else if (percentageBleed > 5 || p10Sep < 15) {
                newConclusion = 'Some detected';
                newStatusClass = 'validation-warning';
              } else {
                newConclusion = 'Not detected';
                newStatusClass = 'validation-pass';
              }

              const medianSepStr = medianSep === -Infinity ? '-∞' : medianSep.toFixed(1);
              const p10SepStr = p10Sep === -Infinity ? '-∞' : p10Sep.toFixed(1);
              micBleedNewResult.innerHTML = `${newConclusion}<br><small>Med: ${medianSepStr}dB, P10: ${p10SepStr}dB, Bleed: ${percentageBleed.toFixed(1)}%</small>`;
              micBleedNewResult.className = newStatusClass;
            }
          } else {
            micBleedOldEl.style.display = 'none';
            micBleedNewEl.style.display = 'none';
          }
        } else {
          stereoEl.textContent = '-';
          stereoEl.className = '';
          micBleedOldEl.style.display = 'none';
          micBleedNewEl.style.display = 'none';
        }
      } else {
        stereoEl.textContent = 'Mono file';
        stereoEl.className = '';
        micBleedOldEl.style.display = 'none';
        micBleedNewEl.style.display = 'none';
      }

      // Display reverb estimation with color coding
      const reverbEl = document.getElementById('reverbEstimation');
      if (results.reverbInfo && results.reverbInfo.time > 0) {
        reverbEl.innerHTML = `~${results.reverbInfo.time.toFixed(2)} s<br><small>${results.reverbInfo.label}</small>`;
        reverbEl.title = results.reverbInfo.description;
        // Color code based on quality: Excellent/Good = pass, Fair = warning, Poor/Very Poor = fail
        const label = results.reverbInfo.label.toLowerCase();
        if (label.includes('excellent') || label.includes('good')) {
          reverbEl.className = 'validation-pass';
        } else if (label.includes('fair')) {
          reverbEl.className = 'validation-warning';
        } else if (label.includes('poor')) {
          reverbEl.className = 'validation-fail';
        } else {
          reverbEl.className = '';
        }
      } else {
        reverbEl.textContent = '-';
        reverbEl.title = '';
        reverbEl.className = '';
      }

      // Display silence analysis with time format and color coding
      const leadingSilenceEl = document.getElementById('leadingSilence');
      leadingSilenceEl.textContent = this.formatDuration(results.leadingSilence);
      if (results.leadingSilence >= 10) {
        leadingSilenceEl.className = 'validation-fail';
      } else if (results.leadingSilence > 5) {
        leadingSilenceEl.className = 'validation-warning';
      } else {
        leadingSilenceEl.className = '';
      }

      const trailingSilenceEl = document.getElementById('trailingSilence');
      trailingSilenceEl.textContent = this.formatDuration(results.trailingSilence);
      if (results.trailingSilence >= 10) {
        trailingSilenceEl.className = 'validation-fail';
      } else if (results.trailingSilence > 5) {
        trailingSilenceEl.className = 'validation-warning';
      } else {
        trailingSilenceEl.className = '';
      }

      const longestSilenceEl = document.getElementById('longestSilence');
      longestSilenceEl.textContent = this.formatDuration(results.longestSilence);
      if (results.longestSilence >= 10) {
        longestSilenceEl.className = 'validation-fail';
      } else if (results.longestSilence > 5) {
        longestSilenceEl.className = 'validation-warning';
      } else {
        longestSilenceEl.className = '';
      }



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

    // Hide progress and show cancelled message
    this.batchProgress.style.display = 'none';
    this.batchProgressText.textContent = 'Processing cancelled';
  }

  showLoading() {
    this.hideAllSections();
    this.loading.style.display = 'block';
  }

  showResults() {
    this.hideAllSections();
    this.resultsSection.style.display = 'block';

    // Show validation legend (needs to be after resultsSection is visible)
    const legend = document.getElementById('validationLegend');
    if (legend) {
      legend.style.display = 'block';
    }
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

    // Check if current preset supports filename validation
    const presets = this.getPresetConfigurations();
    const selectedPreset = this.presetSelector.value;
    const presetConfig = presets[selectedPreset];
    const presetSupportsFilenameValidation = presetConfig?.supportsFilenameValidation || false;

    // Get the appropriate checkboxes based on source
    // Only enable filename validation if both: (1) preset supports it AND (2) checkbox is checked
    const enableFilenameValidation = this.currentBatchSource === 'box'
      ? (presetSupportsFilenameValidation && this.boxEnableFilenameValidation.checked)
      : (this.currentBatchSource === 'drive'
          ? (presetSupportsFilenameValidation && this.enableFilenameValidation.checked)
          : (this.currentBatchSource === 'local'
              ? (presetSupportsFilenameValidation && this.localEnableFilenameValidation.checked)
              : false));
    const enableAudioAnalysis = this.currentBatchSource === 'box'
      ? this.boxEnableAudioAnalysis.checked
      : (this.currentBatchSource === 'drive'
          ? this.enableAudioAnalysis.checked
          : (this.currentBatchSource === 'local'
              ? this.localEnableAudioAnalysis.checked
              : true));

    // Detect metadata-only mode
    const isMetadataOnly = enableFilenameValidation && !enableAudioAnalysis;

    // Add metadata-only class to table for wider filename column
    const table = document.querySelector('.batch-results-table');
    if (table) {
      if (isMetadataOnly) {
        table.classList.add('metadata-only');
      } else {
        table.classList.remove('metadata-only');
      }
    }

    // Show/hide filename check column based on whether filename validation is enabled
    const filenameCheckHeader = document.getElementById('filenameCheckHeader');
    if (filenameCheckHeader) {
      filenameCheckHeader.style.display = enableFilenameValidation ? '' : 'none';
    }

    // Hide audio-specific columns in metadata-only mode
    const audioHeaders = ['sampleRateHeader', 'bitDepthHeader', 'channelsHeader', 'durationHeader'];
    audioHeaders.forEach(headerId => {
      const header = document.getElementById(headerId);
      if (header) {
        header.style.display = isMetadataOnly ? 'none' : '';
      }
    });

    // Hide total duration in metadata-only mode
    if (this.batchTotalDurationContainer) {
      this.batchTotalDurationContainer.style.display = isMetadataOnly ? 'none' : '';
    }

    // Initialize summary stats to zero
    this.batchPassCount.textContent = '0';
    this.batchWarningCount.textContent = '0';
    this.batchFailCount.textContent = '0';
    this.batchErrorCount.textContent = '0';
    this.batchTotalDuration.textContent = '0h 0m';

    // Show batch validation legend (needs to be after batchResultsSection is visible)
    const batchLegend = document.getElementById('batchValidationLegend');
    if (batchLegend) {
      batchLegend.style.display = 'block';
    }
  }

  addBatchResultRow(result) {
    // Check if current preset supports filename validation
    const presets = this.getPresetConfigurations();
    const selectedPreset = this.presetSelector.value;
    const presetConfig = presets[selectedPreset];
    const presetSupportsFilenameValidation = presetConfig?.supportsFilenameValidation || false;

    // Get the appropriate checkboxes based on source
    // Only enable filename validation if both: (1) preset supports it AND (2) checkbox is checked
    const enableFilenameValidation = this.currentBatchSource === 'box'
      ? (presetSupportsFilenameValidation && this.boxEnableFilenameValidation.checked)
      : (this.currentBatchSource === 'drive'
          ? (presetSupportsFilenameValidation && this.enableFilenameValidation.checked)
          : (this.currentBatchSource === 'local'
              ? (presetSupportsFilenameValidation && this.localEnableFilenameValidation.checked)
              : false));
    const enableAudioAnalysis = this.currentBatchSource === 'box'
      ? this.boxEnableAudioAnalysis.checked
      : (this.currentBatchSource === 'drive'
          ? this.enableAudioAnalysis.checked
          : (this.currentBatchSource === 'local'
              ? this.localEnableAudioAnalysis.checked
              : true));

    // Re-validate with current criteria before displaying (in case criteria changed during processing)
    if (result.analysis && !result.error) {
      const currentCriteria = this.getCriteria();
      const useMetadataOnly = enableFilenameValidation && !enableAudioAnalysis;

      // Save SPONTANEOUS duration validation if it exists
      const spontaneousDurationValidation = result.validation?.duration?.issue?.includes('SPONTANEOUS')
        ? result.validation.duration
        : null;

      result.validation = CriteriaValidator.validateResults(result.analysis, currentCriteria, useMetadataOnly);

      // If in metadata-only mode, override status for audio-specific fields to 'unknown'
      if (useMetadataOnly) {
        if (result.validation.sampleRate) result.validation.sampleRate.status = 'unknown';
        if (result.validation.bitDepth) result.validation.bitDepth.status = 'unknown';
        if (result.validation.channels) result.validation.channels.status = 'unknown';
        if (result.validation.duration) result.validation.duration.status = 'unknown';
      }

      // Restore SPONTANEOUS duration validation if it was set
      if (spontaneousDurationValidation) {
        result.validation.duration = spontaneousDurationValidation;
      }

      result.status = this.getOverallStatus(result.validation, false, result.filenameValidation);
    }

    const index = this.batchResults.length - 1;
    const row = document.createElement('tr');
    row.className = `batch-row ${result.status}`;

    // Format the analysis data using the same formatter as single file view
    const formatted = result.analysis ? CriteriaValidator.formatDisplayText(result.analysis) : {};

    const fileTypeStatus = this.getValidationStatus(result.validation, 'fileType', result.analysis?.fileType);
    const sampleRateStatus = this.getValidationStatus(result.validation, 'sampleRate', result.analysis?.sampleRate);
    const bitDepthStatus = this.getValidationStatus(result.validation, 'bitDepth', result.analysis?.bitDepth);
    const channelsStatus = this.getValidationStatus(result.validation, 'channels', result.analysis?.channels);
    const durationStatus = this.getValidationStatus(result.validation, 'duration', result.analysis?.duration);

    // Detect metadata-only mode
    const isMetadataOnly = enableFilenameValidation && !enableAudioAnalysis;

    // Filename validation cell (only show if filename validation is enabled)
    let filenameCheckCell = '';
    if (enableFilenameValidation) {
      if (result.filenameValidation) {
        const icon = result.filenameValidation.status === 'pass' ? '✅' : '❌';
        let tooltipText = '';
        if (result.filenameValidation.status === 'pass') {
          tooltipText = 'Filename is valid';
        } else {
          // Show issue and expected format for failures
          tooltipText = result.filenameValidation.issue;
          if (result.filenameValidation.expectedFormat) {
            tooltipText += `\n\nExpected: ${result.filenameValidation.expectedFormat}`;
          }
        }
        filenameCheckCell = `<td class="filename-check-${result.filenameValidation.status}" title="${tooltipText}">${icon}</td>`;
      } else {
        filenameCheckCell = `<td style="display: none;"></td>`;
      }
    } else {
      filenameCheckCell = `<td style="display: none;"></td>`;
    }

    // Audio-specific cells (hide in metadata-only mode)
    const sampleRateCell = isMetadataOnly ? '' : `<td class="validation-${sampleRateStatus}">${formatted.sampleRate || '-'}</td>`;
    const bitDepthCell = isMetadataOnly ? '' : `<td class="validation-${bitDepthStatus}">${formatted.bitDepth || '-'}</td>`;
    const channelsCell = isMetadataOnly ? '' : `<td class="validation-${channelsStatus}">${formatted.channels || '-'}</td>`;
    const durationCell = isMetadataOnly ? '' : `<td class="validation-${durationStatus}">${formatted.duration || '-'}</td>`;

    // Show play button/link based on source
    let playButton = '-';
    if (result.file || result.driveFileId) {
      // Local file or Google Drive - show play button
      playButton = `<button class="play-btn-small" data-index="${index}">▶</button>`;
    } else if (result.boxFileId) {
      // Box file - show link to open in Box (styled as button)
      playButton = `<a href="https://app.box.com/file/${result.boxFileId}" target="_blank" title="Open in Box" class="play-btn-small box-link">▶</a>`;
    }

    const escapedFilename = escapeHtml(result.filename);
    row.innerHTML = `
      <td class="filename" title="${escapedFilename}">${escapedFilename}</td>
      <td><span class="status-badge ${result.status}">${result.status}</span></td>
      ${filenameCheckCell}
      <td class="validation-${fileTypeStatus}">${formatted.fileType || 'Unknown'}</td>
      ${sampleRateCell}
      ${bitDepthCell}
      ${channelsCell}
      ${durationCell}
      <td>${formatted.fileSize || '-'}</td>
      <td>${playButton}</td>
    `;

    this.batchTableBody.appendChild(row);

    // Add event listener to play button
    if (result.file || result.driveFileId) {
      const playBtn = row.querySelector('.play-btn-small');
      if (playBtn) {
        playBtn.addEventListener('click', (e) => {
          const idx = parseInt(e.target.dataset.index);
          this.playBatchFile(idx);
        });
      }
    }

    // Add tooltip listeners for filename check cells
    const checkCell = row.querySelector('.filename-check-pass, .filename-check-fail');
    if (checkCell) {
      this.setupFilenameCheckTooltip(checkCell);
    }

    // Add tooltip listener for filename cell
    const filenameCell = row.querySelector('.filename');
    if (filenameCell) {
      this.setupFilenameCheckTooltip(filenameCell);
    }
  }

  setupFilenameCheckTooltip(cell) {
    let tooltip = null;

    cell.addEventListener('mouseenter', (e) => {
      const text = cell.getAttribute('title');
      if (!text) return;

      // Remove title to prevent default browser tooltip
      cell.removeAttribute('title');
      cell.dataset.originalTitle = text;

      // Create tooltip element
      tooltip = document.createElement('div');
      tooltip.className = 'filename-tooltip';
      tooltip.textContent = text;
      document.body.appendChild(tooltip);

      // Position tooltip below the cell
      const rect = cell.getBoundingClientRect();
      tooltip.style.left = rect.left + rect.width / 2 + 'px';
      tooltip.style.top = rect.bottom + 5 + 'px';
    });

    cell.addEventListener('mouseleave', () => {
      if (tooltip) {
        tooltip.remove();
        tooltip = null;
      }
      // Restore title
      if (cell.dataset.originalTitle) {
        cell.setAttribute('title', cell.dataset.originalTitle);
      }
    });
  }

  updateBatchSummary() {
    const passCount = this.batchResults.filter(r => r.status === 'pass').length;
    const warningCount = this.batchResults.filter(r => r.status === 'warning').length;
    const failCount = this.batchResults.filter(r => r.status === 'fail').length;
    const errorCount = this.batchResults.filter(r => r.status === 'error').length;

    this.batchPassCount.textContent = passCount;
    this.batchWarningCount.textContent = warningCount;
    this.batchFailCount.textContent = failCount;
    this.batchErrorCount.textContent = errorCount;

    // Calculate total duration for passed and warning files (exclude fail/error)
    const totalSeconds = this.batchResults
      .filter(r => r.status === 'pass' || r.status === 'warning')
      .reduce((sum, r) => {
        const duration = r.analysis?.duration;
        if (typeof duration === 'number' && !isNaN(duration)) {
          return sum + duration;
        }
        return sum;
      }, 0);

    this.batchTotalDuration.textContent = this.formatTotalDuration(totalSeconds);
  }

  showBatchResults(results) {
    // This is now only used for revalidation - rebuild entire table
    this.hideAllSections();
    this.batchResultsSection.style.display = 'block';

    // Update summary stats
    const passCount = results.filter(r => r.status === 'pass').length;
    const warningCount = results.filter(r => r.status === 'warning').length;
    const failCount = results.filter(r => r.status === 'fail').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    this.batchPassCount.textContent = passCount;
    this.batchWarningCount.textContent = warningCount;
    this.batchFailCount.textContent = failCount;
    this.batchErrorCount.textContent = errorCount;

    // Calculate total duration for passed and warning files (exclude fail/error)
    const totalSeconds = results
      .filter(r => r.status === 'pass' || r.status === 'warning')
      .reduce((sum, r) => {
        const duration = r.analysis?.duration;
        if (typeof duration === 'number' && !isNaN(duration)) {
          return sum + duration;
        }
        return sum;
      }, 0);

    this.batchTotalDuration.textContent = this.formatTotalDuration(totalSeconds);

    // Check if current preset supports filename validation
    const presets = this.getPresetConfigurations();
    const selectedPreset = this.presetSelector.value;
    const presetConfig = presets[selectedPreset];
    const presetSupportsFilenameValidation = presetConfig?.supportsFilenameValidation || false;

    const enableFilenameValidation = this.currentBatchSource === 'box'
      ? false
      : (this.currentBatchSource === 'drive'
          ? (presetSupportsFilenameValidation && this.enableFilenameValidation.checked)
          : (this.currentBatchSource === 'local'
              ? (presetSupportsFilenameValidation && this.localEnableFilenameValidation.checked)
              : false));
    const enableAudioAnalysis = this.currentBatchSource === 'box'
      ? this.boxEnableAudioAnalysis.checked
      : (this.currentBatchSource === 'drive'
          ? this.enableAudioAnalysis.checked
          : (this.currentBatchSource === 'local'
              ? this.localEnableAudioAnalysis.checked
              : true));

    const isMetadataOnly = enableFilenameValidation && !enableAudioAnalysis;

    // Rebuild table
    this.batchTableBody.innerHTML = '';
    results.forEach((result, index) => {
      const row = document.createElement('tr');
      row.className = `batch-row ${result.status}`;

      // Format the analysis data using the same formatter as single file view
      const formatted = result.analysis ? CriteriaValidator.formatDisplayText(result.analysis) : {};

      const fileTypeStatus = this.getValidationStatus(result.validation, 'fileType', result.analysis?.fileType);
      const sampleRateStatus = this.getValidationStatus(result.validation, 'sampleRate', result.analysis?.sampleRate);
      const bitDepthStatus = this.getValidationStatus(result.validation, 'bitDepth', result.analysis?.bitDepth);
      const channelsStatus = this.getValidationStatus(result.validation, 'channels', result.analysis?.channels);
      const durationStatus = this.getValidationStatus(result.validation, 'duration', result.analysis?.duration);

      // Filename validation cell (only show if filename validation is enabled)
      let filenameCheckCell = '';
      if (enableFilenameValidation) {
        if (result.filenameValidation) {
          const icon = result.filenameValidation.status === 'pass' ? '✅' : '❌';
          let tooltipText = '';
          if (result.filenameValidation.status === 'pass') {
            tooltipText = 'Filename is valid';
          } else {
            // Show issue and expected format for failures
            tooltipText = result.filenameValidation.issue;
            if (result.filenameValidation.expectedFormat) {
              tooltipText += `\n\nExpected: ${result.filenameValidation.expectedFormat}`;
            }
          }
          filenameCheckCell = `<td class="filename-check-${result.filenameValidation.status}" title="${tooltipText}">${icon}</td>`;
        } else {
          filenameCheckCell = `<td style="display: none;"></td>`;
        }
      } else {
        filenameCheckCell = `<td style="display: none;"></td>`;
      }

      // Audio-specific cells (hide in metadata-only mode)
      const sampleRateCell = isMetadataOnly ? '' : `<td class="validation-${sampleRateStatus}">${formatted.sampleRate || '-'}</td>`;
      const bitDepthCell = isMetadataOnly ? '' : `<td class="validation-${bitDepthStatus}">${formatted.bitDepth || '-'}</td>`;
      const channelsCell = isMetadataOnly ? '' : `<td class="validation-${channelsStatus}">${formatted.channels || '-'}</td>`;
      const durationCell = isMetadataOnly ? '' : `<td class="validation-${durationStatus}">${formatted.duration || '-'}</td>`;

      const escapedFilename = escapeHtml(result.filename);
      row.innerHTML = `
        <td class="filename" title="${escapedFilename}">${escapedFilename}</td>
        <td><span class="status-badge ${result.status}">${result.status}</span></td>
        ${filenameCheckCell}
        <td class="validation-${fileTypeStatus}">${formatted.fileType || 'Unknown'}</td>
        ${sampleRateCell}
        ${bitDepthCell}
        ${channelsCell}
        ${durationCell}
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

    // Add tooltip listeners for filename cells
    this.batchTableBody.querySelectorAll('.filename').forEach(cell => {
      this.setupFilenameCheckTooltip(cell);
    });

    // Show validation legend (batch)
    document.getElementById('batchValidationLegend').style.display = 'block';
  }

  formatValue(value) {
    if (value === null || value === undefined || value === 'Unknown') {
      return '-';
    }
    return value;
  }

  formatDuration(seconds) {
    if (seconds === null || seconds === undefined || seconds === 'Unknown') return '-';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  formatTotalDuration(totalSeconds) {
    if (!totalSeconds || totalSeconds === 0) return '0h 0m 0s';

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  getValidationStatus(validation, field, actualValue) {
    // If there's a validation result, use it
    if (validation && validation[field]) {
      return validation[field].status; // 'pass', 'warning', or 'fail'
    }

    // No validation for this field - check if actual value is Unknown
    if (actualValue === 'Unknown') {
      return 'warning';
    }

    return 'pass';
  }

  playBatchFile(index) {
    if (!this.batchResults || !this.batchResults[index]) return;

    const result = this.batchResults[index];

    if (result.file) {
      // Local file - create blob URL and open
      const url = URL.createObjectURL(result.file);
      window.open(url, '_blank');
      // Revoke URL after a delay to allow it to load
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else if (result.driveFileId) {
      // Google Drive file - open Drive preview URL
      const driveUrl = `https://drive.google.com/file/d/${result.driveFileId}/view`;
      window.open(driveUrl, '_blank');
    }
  }

  playSingleFile() {
    if (!this.currentFile) return;

    // Create blob URL and open in new tab
    const url = URL.createObjectURL(this.currentFile);
    window.open(url, '_blank');
    // Revoke URL after a delay to allow it to load
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  revalidateBatchResults() {
    if (!this.batchResults) return;

    const criteria = this.getCriteria();

    // Update table headers based on current preset
    const presets = this.getPresetConfigurations();
    const selectedPreset = this.presetSelector.value;
    const presetConfig = presets[selectedPreset];
    const presetSupportsFilenameValidation = presetConfig?.supportsFilenameValidation || false;

    const enableFilenameValidation = this.currentBatchSource === 'box'
      ? (presetSupportsFilenameValidation && this.boxEnableFilenameValidation.checked)
      : (this.currentBatchSource === 'drive'
          ? (presetSupportsFilenameValidation && this.enableFilenameValidation.checked)
          : (this.currentBatchSource === 'local'
              ? (presetSupportsFilenameValidation && this.localEnableFilenameValidation.checked)
              : false));
    const enableAudioAnalysis = this.currentBatchSource === 'box'
      ? this.boxEnableAudioAnalysis.checked
      : (this.currentBatchSource === 'drive'
          ? this.enableAudioAnalysis.checked
          : (this.currentBatchSource === 'local'
              ? this.localEnableAudioAnalysis.checked
              : true));

    const isMetadataOnly = enableFilenameValidation && !enableAudioAnalysis;

    // Update table structure (headers)
    const filenameCheckHeader = document.getElementById('filenameCheckHeader');
    if (filenameCheckHeader) {
      filenameCheckHeader.style.display = enableFilenameValidation ? '' : 'none';
    }

    const audioHeaders = ['sampleRateHeader', 'bitDepthHeader', 'channelsHeader', 'durationHeader'];
    audioHeaders.forEach(headerId => {
      const header = document.getElementById(headerId);
      if (header) {
        header.style.display = isMetadataOnly ? 'none' : '';
      }
    });

    // Re-run validation on all batch results
    this.batchResults.forEach(result => {
      if (result.analysis) {
        result.validation = CriteriaValidator.validateResults(result.analysis, criteria);
        result.status = this.getOverallStatus(result.validation, false, result.filenameValidation);
      }
    });

    // Re-display the updated results
    this.showBatchResults(this.batchResults);
  }

  getOverallStatus(validation, useMetadataOnly = false, filenameValidation = null) {
    let statuses = Object.values(validation).map(v => v.status);

    if (useMetadataOnly) {
      // In metadata-only mode, we don't care about these fields
      const fieldsToIgnore = ['sampleRate', 'bitDepth', 'channels'];
      statuses = Object.entries(validation)
        .filter(([key]) => !fieldsToIgnore.includes(key))
        .map(([, v]) => v.status);
    }

    // Add filename validation status if present
    if (filenameValidation && filenameValidation.status) {
      statuses.push(filenameValidation.status);
    }

    if (statuses.includes('fail')) return 'fail';
    if (statuses.includes('warning')) return 'warning';
    return 'pass';
  }

  getFileTypeFromName(filename) {
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
    document.getElementById('validationLegend').style.display = 'none';
    document.getElementById('batchValidationLegend').style.display = 'none';
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