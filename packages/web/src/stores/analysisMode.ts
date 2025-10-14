/**
 * Analysis Mode Store
 *
 * Manages the analysis mode selection for presets that support filename validation.
 * Four modes available:
 * - 'full': Audio analysis + filename validation
 * - 'audio-only': Audio analysis only (skip filename validation)
 * - 'filename-only': Filename validation + metadata only (skip audio decoding - fast)
 * - 'experimental': Full analysis + experimental features (reverb, noise floor, silence, stereo separation, mic bleed)
 */

import { writable, derived } from 'svelte/store';
import { currentPresetId } from './settings';
import { analyticsService } from '../services/analytics-service';

export type AnalysisMode = 'full' | 'audio-only' | 'filename-only' | 'experimental';

// Create writable store with default value (audio-only is simplest/fastest)
const analysisModeStore = writable<AnalysisMode>('audio-only');

// Track previous mode for analytics
let previousMode: AnalysisMode | null = null;

// Load saved mode from localStorage on initialization
if (typeof window !== 'undefined') {
  const saved = localStorage.getItem('analysisMode') as AnalysisMode | null;
  if (saved && ['full', 'audio-only', 'filename-only', 'experimental'].includes(saved)) {
    analysisModeStore.set(saved);
    previousMode = saved; // Set previous mode so we don't track initial load
  }
}

// Subscribe to changes and persist to localStorage
analysisModeStore.subscribe((mode) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('analysisMode', mode);

    // Only track if this is a real user change (not initial load)
    if (previousMode !== null) {
      analyticsService.track('analysis_mode_changed', {
        mode,
        previousMode
      });
    }

    previousMode = mode;
  }
});

// Reset to 'audio-only' when preset actually changes (not on initial load)
let previousPresetId: string | null = null;
currentPresetId.subscribe((presetId) => {
  // Only reset if this is a real change, not initial load
  if (previousPresetId !== null && presetId && presetId !== 'custom' && presetId !== previousPresetId) {
    analysisModeStore.set('audio-only');
  }
  previousPresetId = presetId;
});

/**
 * Set the analysis mode
 */
export function setAnalysisMode(mode: AnalysisMode): void {
  analysisModeStore.set(mode);
}

/**
 * Current analysis mode (readable store)
 */
export const analysisMode = {
  subscribe: analysisModeStore.subscribe
};

/**
 * Derived store: Should we skip audio analysis?
 * True for 'filename-only' mode
 */
export const skipAudioAnalysis = derived(
  analysisModeStore,
  ($mode) => $mode === 'filename-only'
);

/**
 * Derived store: Should we skip filename validation?
 * True for 'audio-only' mode
 */
export const skipFilenameValidation = derived(
  analysisModeStore,
  ($mode) => $mode === 'audio-only'
);
