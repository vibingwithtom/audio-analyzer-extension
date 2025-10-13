/**
 * Three Hour Settings Store
 *
 * Manages configuration for Three Hour preset filename validation:
 * - Scripts folder URL (Google Drive folder containing script files)
 * - Speaker ID (expected speaker identifier for filename validation)
 *
 * Settings are persisted to localStorage and automatically restored on page load.
 */

import { writable } from 'svelte/store';

export interface ThreeHourSettings {
  scriptsFolderUrl: string;
  speakerId: string;
}

const STORAGE_KEY = 'threeHourSettings';

/**
 * Load settings from localStorage
 */
function loadSettings(): ThreeHourSettings {
  if (typeof window === 'undefined') {
    return {
      scriptsFolderUrl: '',
      speakerId: ''
    };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        scriptsFolderUrl: parsed.scriptsFolderUrl || '',
        speakerId: parsed.speakerId || ''
      };
    }
  } catch (error) {
    console.error('Failed to load Three Hour settings from localStorage:', error);
  }

  return {
    scriptsFolderUrl: '',
    speakerId: ''
  };
}

/**
 * Save settings to localStorage
 */
function saveSettings(settings: ThreeHourSettings): void {
  if (typeof window === 'undefined') return;

  try {
    // Trim whitespace from speaker ID before saving
    const trimmedSettings = {
      scriptsFolderUrl: settings.scriptsFolderUrl,
      speakerId: settings.speakerId.trim()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedSettings));
  } catch (error) {
    console.error('Failed to save Three Hour settings to localStorage:', error);
  }
}

/**
 * Create the Three Hour settings store with automatic localStorage persistence
 */
function createThreeHourSettingsStore() {
  const { subscribe, set, update } = writable<ThreeHourSettings>(loadSettings());

  return {
    subscribe,
    set: (value: ThreeHourSettings) => {
      saveSettings(value);
      set(value);
    },
    update: (updater: (value: ThreeHourSettings) => ThreeHourSettings) => {
      update(value => {
        const newValue = updater(value);
        saveSettings(newValue);
        return newValue;
      });
    },
    /**
     * Update just the scripts folder URL
     */
    setScriptsFolderUrl: (url: string) => {
      update(settings => {
        const newSettings = { ...settings, scriptsFolderUrl: url };
        saveSettings(newSettings);
        return newSettings;
      });
    },
    /**
     * Update just the speaker ID (with automatic trimming)
     */
    setSpeakerId: (id: string) => {
      update(settings => {
        const newSettings = { ...settings, speakerId: id.trim() };
        saveSettings(newSettings);
        return newSettings;
      });
    },
    /**
     * Reset to default values
     */
    reset: () => {
      const defaultSettings = { scriptsFolderUrl: '', speakerId: '' };
      saveSettings(defaultSettings);
      set(defaultSettings);
    }
  };
}

export const threeHourSettings = createThreeHourSettingsStore();
