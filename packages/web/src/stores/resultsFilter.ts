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

/**
 * Module-level subscriptions for auto-reset and analytics.
 *
 * INTENTIONAL DESIGN: These subscriptions are created at module initialization
 * and live for the entire app lifetime. This is the standard pattern for Svelte
 * stores in a single-page application (SPA) where modules are loaded once.
 *
 * The cleanup() function is exported for testing purposes only - it allows tests
 * to clean up subscriptions between test runs. In production, these subscriptions
 * are meant to persist for the app lifetime and do not cause memory leaks.
 */

// Subscribe to changes and track analytics
const unsubAnalytics = resultsFilterStore.subscribe((filterValue) => {
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

/**
 * Cleanup function for unsubscribing from all module-level subscriptions.
 *
 * TESTING ONLY: This function is exported solely for test cleanup between test runs.
 * It should NOT be called in production code. The subscriptions are intentionally
 * long-lived and designed to persist for the entire app lifetime.
 */
export function cleanup() {
  unsubAnalytics();
  unsubPreset();
  unsubMode();
  unsubTab();
}

export const resultsFilter = {
  subscribe: resultsFilterStore.subscribe,
  set: resultsFilterStore.set
};
