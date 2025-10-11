import { writable, derived, type Readable } from 'svelte/store';
import { SettingsManager } from '../settings/settings-manager';
import type { AudioCriteria, PresetConfig } from '../settings/types';

/**
 * Settings Store
 *
 * Provides reactive access to application settings including
 * selected preset and criteria configuration.
 */

// Selected preset ID
const selectedPresetId = writable<string>(
  SettingsManager.getSelectedPreset() || 'custom'
);

// Subscribe to changes and persist to localStorage
selectedPresetId.subscribe((presetId) => {
  if (presetId) {
    SettingsManager.saveSelectedPreset(presetId);

    // When preset changes, load its criteria
    if (presetId !== 'custom') {
      const presetConfig = SettingsManager.getPresetConfig(presetId);
      if (presetConfig) {
        const criteria: AudioCriteria = {
          fileType: presetConfig.fileType || [],
          sampleRate: presetConfig.sampleRate || [],
          bitDepth: presetConfig.bitDepth || [],
          channels: presetConfig.channels || [],
          minDuration: presetConfig.minDuration || ''
        };
        SettingsManager.saveCriteria(criteria);
      }
    }
  }
});

// Current criteria (derived from selected preset or custom)
const criteria = writable<AudioCriteria | null>(
  SettingsManager.getCriteria()
);

// Get all available presets
export const availablePresets = SettingsManager.getPresetConfigurations();

// Get selected preset configuration
export const selectedPreset: Readable<PresetConfig | null> = derived(
  selectedPresetId,
  ($presetId) => {
    if (!$presetId) return null;
    return SettingsManager.getPresetConfig($presetId);
  }
);

// Export writable for setting preset
export function setPreset(presetId: string): void {
  selectedPresetId.set(presetId);
}

// Export readable for current preset ID
export const currentPresetId: Readable<string> = {
  subscribe: selectedPresetId.subscribe
};

// Export readable for current criteria
export const currentCriteria: Readable<AudioCriteria | null> = {
  subscribe: criteria.subscribe
};

// Update custom criteria
export function updateCustomCriteria(newCriteria: AudioCriteria): void {
  criteria.set(newCriteria);
  SettingsManager.saveCriteria(newCriteria);
}
