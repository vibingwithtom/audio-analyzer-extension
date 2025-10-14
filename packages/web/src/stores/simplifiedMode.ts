/**
 * Simplified Mode Store
 *
 * Manages simplified user interface mode where:
 * - Only Local Files tab is visible
 * - Preset is locked to a specific value (from URL parameter)
 * - Analysis mode is auto-selected based on preset capabilities
 * - Settings tab is hidden
 *
 * Enabled via URL parameter: ?mode=simple&preset=<preset-id>
 */

import { writable, derived, type Readable } from 'svelte/store';
import { availablePresets } from './settings';
import type { AnalysisMode } from './analysisMode';
import { analyticsService } from '../services/analytics-service';

interface SimplifiedModeConfig {
  enabled: boolean;
  lockedPresetId: string | null;
  autoAnalysisMode: AnalysisMode;
}

// Default state - simplified mode disabled
const defaultConfig: SimplifiedModeConfig = {
  enabled: false,
  lockedPresetId: null,
  autoAnalysisMode: 'audio-only'
};

// Create writable store
const simplifiedModeStore = writable<SimplifiedModeConfig>(defaultConfig);

/**
 * Initialize simplified mode from URL parameters
 * Should be called on app mount
 */
export function initializeSimplifiedMode(): void {
  if (typeof window === 'undefined') return;

  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode');
  const preset = urlParams.get('preset');

  // Check if simplified mode is requested and preset is valid
  if (mode === 'simple' && preset && availablePresets[preset]) {
    const presetConfig = availablePresets[preset];

    // Determine analysis mode based on preset capabilities
    let analysisMode: AnalysisMode = 'audio-only';

    if (presetConfig.supportsFilenameValidation) {
      // If preset supports filename validation, default to full analysis
      analysisMode = 'full';
    }

    // Enable simplified mode
    simplifiedModeStore.set({
      enabled: true,
      lockedPresetId: preset,
      autoAnalysisMode: analysisMode
    });

    console.log('[Simplified Mode] Enabled with preset:', preset, 'Analysis mode:', analysisMode);

    // Track simplified mode activation
    analyticsService.track('simplified_mode_activated', {
      preset,
      analysisMode,
      presetName: presetConfig.name,
      supportsFilenameValidation: presetConfig.supportsFilenameValidation || false,
    });
  }
}

/**
 * Check if simplified mode is currently enabled
 */
export const isSimplifiedMode: Readable<boolean> = derived(
  simplifiedModeStore,
  ($config) => $config.enabled
);

/**
 * Get the locked preset ID (null if not in simplified mode)
 */
export const lockedPresetId: Readable<string | null> = derived(
  simplifiedModeStore,
  ($config) => $config.lockedPresetId
);

/**
 * Get the auto-determined analysis mode for simplified mode
 */
export const autoAnalysisMode: Readable<AnalysisMode> = derived(
  simplifiedModeStore,
  ($config) => $config.autoAnalysisMode
);

/**
 * Get the full simplified mode configuration
 */
export const simplifiedModeConfig: Readable<SimplifiedModeConfig> = {
  subscribe: simplifiedModeStore.subscribe
};

/**
 * Disable simplified mode (for testing or manual override)
 */
export function disableSimplifiedMode(): void {
  simplifiedModeStore.set(defaultConfig);
}
