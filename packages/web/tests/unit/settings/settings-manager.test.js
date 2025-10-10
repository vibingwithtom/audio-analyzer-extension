import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SettingsManager } from '../../../src/settings/settings-manager.ts';

/**
 * Unit tests for SettingsManager
 *
 * Tests settings persistence, retrieval, and management
 */

describe('SettingsManager', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Criteria Management', () => {
    it('should return null when no criteria exists', () => {
      const criteria = SettingsManager.getCriteria();
      expect(criteria).toBeNull();
    });

    it('should save and retrieve criteria', () => {
      const testCriteria = {
        fileType: ['WAV'],
        sampleRate: ['48000'],
        bitDepth: ['16'],
        channels: ['2'],
        minDuration: '30'
      };

      SettingsManager.saveCriteria(testCriteria);
      const retrieved = SettingsManager.getCriteria();

      expect(retrieved).toEqual(testCriteria);
    });

    it('should overwrite existing criteria', () => {
      const firstCriteria = {
        fileType: ['WAV'],
        sampleRate: ['48000'],
        bitDepth: ['16'],
        channels: ['2'],
        minDuration: '30'
      };

      const secondCriteria = {
        fileType: ['MP3'],
        sampleRate: ['44100'],
        bitDepth: ['24'],
        channels: ['1'],
        minDuration: '60'
      };

      SettingsManager.saveCriteria(firstCriteria);
      SettingsManager.saveCriteria(secondCriteria);

      const retrieved = SettingsManager.getCriteria();
      expect(retrieved).toEqual(secondCriteria);
      expect(retrieved).not.toEqual(firstCriteria);
    });

    it('should handle corrupt criteria gracefully', () => {
      localStorage.setItem('audio-analyzer-settings', 'invalid json');

      const criteria = SettingsManager.getCriteria();
      expect(criteria).toBeNull();
    });
  });

  describe('Preset Management', () => {
    it('should return null when no preset is selected', () => {
      const preset = SettingsManager.getSelectedPreset();
      expect(preset).toBeNull();
    });

    it('should save and retrieve selected preset', () => {
      SettingsManager.saveSelectedPreset('auditions-character-recordings');

      const preset = SettingsManager.getSelectedPreset();
      expect(preset).toBe('auditions-character-recordings');
    });

    it('should overwrite previous preset selection', () => {
      SettingsManager.saveSelectedPreset('three-hour');
      SettingsManager.saveSelectedPreset('bilingual-conversational');

      const preset = SettingsManager.getSelectedPreset();
      expect(preset).toBe('bilingual-conversational');
    });
  });

  describe('Filename Validation Settings (Google Drive)', () => {
    it('should return defaults when no settings exist', () => {
      const settings = SettingsManager.loadFilenameValidationSettings();

      expect(settings).toEqual({
        enableAudioAnalysis: true,
        enableFilenameValidation: false,
        speakerId: '',
        scriptsFolderUrl: ''
      });
    });

    it('should save and retrieve filename validation settings', () => {
      const testSettings = {
        enableAudioAnalysis: false,
        enableFilenameValidation: true,
        speakerId: 'SPEAKER123',
        scriptsFolderUrl: 'https://drive.google.com/folders/abc123'
      };

      SettingsManager.saveFilenameValidationSettings(testSettings);
      const retrieved = SettingsManager.loadFilenameValidationSettings();

      expect(retrieved).toEqual(testSettings);
    });

    it('should merge saved settings with defaults', () => {
      // Save partial settings
      localStorage.setItem('audio-analyzer-filename-validation', JSON.stringify({
        enableAudioAnalysis: false
      }));

      const settings = SettingsManager.loadFilenameValidationSettings();

      expect(settings.enableAudioAnalysis).toBe(false);
      expect(settings.enableFilenameValidation).toBe(false); // default
      expect(settings.speakerId).toBe(''); // default
      expect(settings.scriptsFolderUrl).toBe(''); // default
    });
  });

  describe('Filename Validation Settings (Box)', () => {
    it('should return defaults when no Box settings exist', () => {
      const settings = SettingsManager.loadBoxFilenameValidationSettings();

      expect(settings).toEqual({
        enableAudioAnalysis: true,
        enableFilenameValidation: false
      });
    });

    it('should save and retrieve Box filename validation settings', () => {
      const testSettings = {
        enableAudioAnalysis: false,
        enableFilenameValidation: true
      };

      SettingsManager.saveBoxFilenameValidationSettings(testSettings);
      const retrieved = SettingsManager.loadBoxFilenameValidationSettings();

      expect(retrieved).toEqual(testSettings);
    });

    it('should be independent from Google Drive settings', () => {
      SettingsManager.saveFilenameValidationSettings({
        enableAudioAnalysis: true,
        enableFilenameValidation: true,
        speakerId: 'TEST',
        scriptsFolderUrl: 'url'
      });

      SettingsManager.saveBoxFilenameValidationSettings({
        enableAudioAnalysis: false,
        enableFilenameValidation: false
      });

      const driveSettings = SettingsManager.loadFilenameValidationSettings();
      const boxSettings = SettingsManager.loadBoxFilenameValidationSettings();

      expect(driveSettings.enableAudioAnalysis).toBe(true);
      expect(boxSettings.enableAudioAnalysis).toBe(false);
    });
  });

  describe('Filename Validation Settings (Local)', () => {
    it('should return defaults when no local settings exist', () => {
      const settings = SettingsManager.loadLocalFilenameValidationSettings();

      expect(settings).toEqual({
        enableAudioAnalysis: true,
        enableFilenameValidation: false
      });
    });

    it('should save and retrieve local filename validation settings', () => {
      const testSettings = {
        enableAudioAnalysis: false,
        enableFilenameValidation: true
      };

      SettingsManager.saveLocalFilenameValidationSettings(testSettings);
      const retrieved = SettingsManager.loadLocalFilenameValidationSettings();

      expect(retrieved).toEqual(testSettings);
    });

    it('should be independent from other sources', () => {
      SettingsManager.saveFilenameValidationSettings({
        enableAudioAnalysis: true,
        enableFilenameValidation: true,
        speakerId: '',
        scriptsFolderUrl: ''
      });

      SettingsManager.saveLocalFilenameValidationSettings({
        enableAudioAnalysis: false,
        enableFilenameValidation: false
      });

      const driveSettings = SettingsManager.loadFilenameValidationSettings();
      const localSettings = SettingsManager.loadLocalFilenameValidationSettings();

      expect(driveSettings.enableAudioAnalysis).toBe(true);
      expect(localSettings.enableAudioAnalysis).toBe(false);
    });
  });

  describe('Dark Mode Preferences', () => {
    it('should return null when no preference is saved', () => {
      const darkMode = SettingsManager.getDarkModePreference();
      expect(darkMode).toBeNull();
    });

    it('should save and retrieve dark mode preference (enabled)', () => {
      SettingsManager.saveDarkModePreference(true);

      const darkMode = SettingsManager.getDarkModePreference();
      expect(darkMode).toBe(true);
    });

    it('should save and retrieve dark mode preference (disabled)', () => {
      SettingsManager.saveDarkModePreference(false);

      const darkMode = SettingsManager.getDarkModePreference();
      expect(darkMode).toBe(false);
    });

    it('should overwrite previous preference', () => {
      SettingsManager.saveDarkModePreference(true);
      SettingsManager.saveDarkModePreference(false);

      const darkMode = SettingsManager.getDarkModePreference();
      expect(darkMode).toBe(false);
    });
  });

  describe('Box Authentication Flag', () => {
    it('should return false when no flag is set', () => {
      const authenticated = SettingsManager.wasBoxJustAuthenticated();
      expect(authenticated).toBe(false);
    });

    it('should set and retrieve authentication flag', () => {
      SettingsManager.setBoxAuthenticationFlag();

      const authenticated = SettingsManager.wasBoxJustAuthenticated();
      expect(authenticated).toBe(true);
    });

    it('should clear authentication flag', () => {
      SettingsManager.setBoxAuthenticationFlag();
      expect(SettingsManager.wasBoxJustAuthenticated()).toBe(true);

      SettingsManager.clearBoxAuthenticationFlag();
      expect(SettingsManager.wasBoxJustAuthenticated()).toBe(false);
    });

    it('should handle flag lifecycle correctly', () => {
      // Initially false
      expect(SettingsManager.wasBoxJustAuthenticated()).toBe(false);

      // Set flag
      SettingsManager.setBoxAuthenticationFlag();
      expect(SettingsManager.wasBoxJustAuthenticated()).toBe(true);

      // Clear flag
      SettingsManager.clearBoxAuthenticationFlag();
      expect(SettingsManager.wasBoxJustAuthenticated()).toBe(false);

      // Should still be false after clearing
      expect(SettingsManager.wasBoxJustAuthenticated()).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values in criteria', () => {
      SettingsManager.saveCriteria({
        fileType: null,
        sampleRate: null,
        bitDepth: null,
        channels: null,
        minDuration: null
      });

      const criteria = SettingsManager.getCriteria();
      expect(criteria).toBeDefined();
      expect(criteria.fileType).toBeNull();
    });

    it('should handle empty strings in settings', () => {
      SettingsManager.saveFilenameValidationSettings({
        enableAudioAnalysis: true,
        enableFilenameValidation: false,
        speakerId: '',
        scriptsFolderUrl: ''
      });

      const settings = SettingsManager.loadFilenameValidationSettings();
      expect(settings.speakerId).toBe('');
      expect(settings.scriptsFolderUrl).toBe('');
    });

    it('should handle very long values', () => {
      const longUrl = 'https://drive.google.com/' + 'x'.repeat(1000);
      SettingsManager.saveFilenameValidationSettings({
        enableAudioAnalysis: true,
        enableFilenameValidation: false,
        speakerId: 'ID',
        scriptsFolderUrl: longUrl
      });

      const settings = SettingsManager.loadFilenameValidationSettings();
      expect(settings.scriptsFolderUrl).toBe(longUrl);
    });

    it('should handle corrupt JSON gracefully', () => {
      // getSelectedPreset() reads a simple string, not JSON, so corrupt JSON is just returned as-is
      // This tests that corrupt criteria JSON returns null
      localStorage.setItem('audio-analyzer-settings', '{invalid json}');

      const criteria = SettingsManager.getCriteria();
      expect(criteria).toBeNull();
    });

    it('should handle missing localStorage gracefully', () => {
      // Mock localStorage to throw
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = () => { throw new Error('Storage error'); };

      const criteria = SettingsManager.getCriteria();
      expect(criteria).toBeNull();

      // Restore
      localStorage.getItem = originalGetItem;
    });
  });

  describe('Multiple Settings Isolation', () => {
    it('should keep all settings independent', () => {
      // Save different values to each setting type
      SettingsManager.saveCriteria({
        fileType: ['WAV'],
        sampleRate: ['48000'],
        bitDepth: ['16'],
        channels: ['2'],
        minDuration: '30'
      });

      SettingsManager.saveSelectedPreset('bilingual-conversational');

      SettingsManager.saveFilenameValidationSettings({
        enableAudioAnalysis: false,
        enableFilenameValidation: true,
        speakerId: 'TEST',
        scriptsFolderUrl: 'url'
      });

      SettingsManager.saveDarkModePreference(true);

      // Retrieve and verify all are independent
      const criteria = SettingsManager.getCriteria();
      const preset = SettingsManager.getSelectedPreset();
      const filenameSettings = SettingsManager.loadFilenameValidationSettings();
      const darkMode = SettingsManager.getDarkModePreference();

      expect(criteria.fileType).toEqual(['WAV']);
      expect(preset).toBe('bilingual-conversational');
      expect(filenameSettings.enableAudioAnalysis).toBe(false);
      expect(darkMode).toBe(true);
    });
  });
});
