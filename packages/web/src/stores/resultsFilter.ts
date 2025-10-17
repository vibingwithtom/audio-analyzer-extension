import { writable } from 'svelte/store';
import { analyticsService } from '../services/analytics-service';
import { currentPresetId } from './settings';
import { analysisMode } from './analysisMode';
import { currentTab } from './tabs';

export type ResultFilterType = 'pass' | 'warning' | 'fail' | 'error' | null;

// Create writable store
const resultsFilterStore = writable<ResultFilterType>(null);

// Track previous filter for analytics
let previousFilter: ResultFilterType = null;

// Subscribe to changes and track analytics
resultsFilterStore.subscribe((filterValue) => {
  if (typeof window !== 'undefined') {
    // Only track if this is a real user change (not initial load)
    if (previousFilter !== null) {
      if (filterValue === null) {
        analyticsService.track('results_filter_cleared', {
          previousFilter
        });
      } else {
        analyticsService.track('results_filter_applied', {
          filterType: filterValue,
          previousFilter: previousFilter || 'none'
        });
      }
    }
    previousFilter = filterValue;
  }
});

// Reset filter when preset changes
let previousPresetId: string | null = null;
const unsubPreset = currentPresetId.subscribe((presetId) => {
  if (previousPresetId !== null && presetId !== previousPresetId) {
    resultsFilterStore.set(null);
  }
  previousPresetId = presetId;
});

// Reset filter when analysis mode changes
let previousAnalysisMode: string | null = null;
const unsubMode = analysisMode.subscribe((mode) => {
  if (previousAnalysisMode !== null && mode !== previousAnalysisMode) {
    resultsFilterStore.set(null);
  }
  previousAnalysisMode = mode;
});

// Reset filter when tab changes
let previousTab: string | null = null;
const unsubTab = currentTab.subscribe((tab) => {
  if (previousTab !== null && tab !== previousTab) {
    resultsFilterStore.set(null);
  }
  previousTab = tab;
});

// Cleanup function (exported for testing or manual cleanup if needed)
export function cleanup() {
  unsubPreset();
  unsubMode();
  unsubTab();
}

export const resultsFilter = {
  subscribe: resultsFilterStore.subscribe,
  set: resultsFilterStore.set
};
