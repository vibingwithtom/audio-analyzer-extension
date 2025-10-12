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

export type AnalysisMode = 'full' | 'audio-only' | 'filename-only' | 'experimental';

// Create writable store with default value
const analysisModeStore = writable<AnalysisMode>('full');

// Load saved mode from localStorage on initialization
if (typeof window !== 'undefined') {
  const saved = localStorage.getItem('analysisMode') as AnalysisMode | null;
  if (saved && ['full', 'audio-only', 'filename-only', 'experimental'].includes(saved)) {
    analysisModeStore.set(saved);
  }
}

// Subscribe to changes and persist to localStorage
analysisModeStore.subscribe((mode) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('analysisMode', mode);
  }
});

// Reset to 'full' when preset changes (unless it's a custom preset)
currentPresetId.subscribe((presetId) => {
  if (presetId && presetId !== 'custom') {
    analysisModeStore.set('full');
  }
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
