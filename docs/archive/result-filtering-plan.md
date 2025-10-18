# Action Plan: Filter Results by Status

## 1. Feature Overview

Enable users to filter the batch results table by clicking on the status counts (`Pass`, `Warning`, `Fail`, `Error`) in the summary section. The feature will include analytics tracking, accessibility support, and smart filter management.

## 2. UI/UX Design

1.  **Clickable Stats**: The summary stat blocks will be made interactive.
    *   On hover, the cursor will change to a pointer, and a subtle background highlight will appear to indicate they are clickable.
    *   Full keyboard accessibility with Enter key support, proper ARIA attributes (`role`, `tabindex`, `aria-pressed`), and focus management.
2.  **Active Filter State**: When a filter is active, the corresponding stat block will be visually distinguished with a solid border and persistent background color, and marked with `aria-pressed="true"`.
3.  **Resetting the Filter**: Two primary methods will be provided to clear the filter:
    *   **Method A (Toggle)**: Clicking the currently active stat block again will toggle the filter off.
    *   **Method B (Auto-reset)**: Filter will automatically reset when switching presets, analysis modes, or tabs.
    *   **Method C (Empty State Button)**: When a filter is active but returns no results, a "Clear Filter" button appears in the empty state message for quick recovery.
4.  **Empty State Handling**: If a filter is active but no results match, a friendly message will be displayed with a button to clear the filter.
5.  **Incremental Filtering**: As new results arrive during batch processing, they will be filtered in real-time if a filter is active.

## 3. State Management

*   A new writable Svelte store will be created to manage the filter's state globally within the app.
*   **File**: `packages/web/src/stores/resultsFilter.ts`
*   **Store**: `export const resultsFilter = writable<'pass' | 'warning' | 'fail' | 'error' | null>(null);`
*   **Analytics**: The store will track filter changes using the existing analytics service.
*   **Auto-reset**: The store will subscribe to preset, mode, and tab changes to reset the filter when appropriate.

## 4. Implementation Steps

#### Step 1: Create the Filter Store with Analytics

Create the new file `packages/web/src/stores/resultsFilter.ts`:

```typescript
import { writable } from 'svelte/store';
import { analyticsService } from '../services/analytics-service';
import { currentPresetId } from './settings';
import { analysisMode } from './analysisMode';
import { activeTab } from './tabs';

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
currentPresetId.subscribe((presetId) => {
  if (previousPresetId !== null && presetId !== previousPresetId) {
    resultsFilterStore.set(null);
  }
  previousPresetId = presetId;
});

// Reset filter when analysis mode changes
let previousAnalysisMode: string | null = null;
analysisMode.subscribe((mode) => {
  if (previousAnalysisMode !== null && mode !== previousAnalysisMode) {
    resultsFilterStore.set(null);
  }
  previousAnalysisMode = mode;
});

// Reset filter when tab changes
let previousTab: string | null = null;
activeTab.subscribe((tab) => {
  if (previousTab !== null && tab !== previousTab) {
    resultsFilterStore.set(null);
  }
  previousTab = tab;
});

export const resultsFilter = {
  subscribe: resultsFilterStore.subscribe,
  set: resultsFilterStore.set
};
```

#### Step 2: Update `ResultsDisplay.svelte`

This component will contain most of the logic.

1.  **Import Store and Analytics**: Import the new `resultsFilter` store and analytics service.

    ```javascript
    import { resultsFilter } from '../stores/resultsFilter';
    import { analyticsService } from '../services/analytics-service';
    ```

2.  **Optimize Performance with Memoization**: Compute experimental status once per result to avoid redundant calculations.

    ```javascript
    // Memoize experimental status calculations for performance
    $: enrichedResults = batchResults.map(result => ({
      ...result,
      computedStatus: $analysisMode === 'experimental'
        ? getExperimentalStatus(result)
        : result.status
    }));

    // Filter results based on active filter
    $: filteredResults = !$resultsFilter
      ? enrichedResults
      : enrichedResults.filter(r =>
          r.status !== 'error' && r.computedStatus === $resultsFilter
        );
    ```

3.  **Update Statistics Calculations**: Use the enriched results for stat calculations.

    ```javascript
    $: passCount = enrichedResults.filter(r =>
      r.status !== 'error' && r.computedStatus === 'pass'
    ).length;

    $: warningCount = enrichedResults.filter(r =>
      r.status !== 'error' && r.computedStatus === 'warning'
    ).length;

    $: failCount = enrichedResults.filter(r =>
      r.status !== 'error' && r.computedStatus === 'fail'
    ).length;

    $: errorCount = enrichedResults.filter(r => r.status === 'error').length;
    ```

4.  **Update `ResultsTable` Prop**: Change the `results` prop to use `filteredResults`.

    ```svelte
    <ResultsTable
      results={filteredResults}
      mode="batch"
      metadataOnly={$analysisMode === 'filename-only'}
      experimentalMode={$analysisMode === 'experimental'}
    />
    ```

5.  **Make Stats Clickable with Accessibility**: Add proper ARIA attributes and keyboard support.

    ```svelte
    <div class="summary-stats">
      <div
        class="stat pass"
        class:active={$resultsFilter === 'pass'}
        on:click={() => handleFilterClick('pass')}
        on:keydown={(e) => e.key === 'Enter' && handleFilterClick('pass')}
        role="button"
        tabindex="0"
        aria-pressed={$resultsFilter === 'pass'}
        aria-label="Filter results to show only passed files ({passCount} files)"
      >
        <div class="stat-value">{passCount}</div>
        <div class="stat-label">Pass</div>
      </div>
      <div
        class="stat warning"
        class:active={$resultsFilter === 'warning'}
        on:click={() => handleFilterClick('warning')}
        on:keydown={(e) => e.key === 'Enter' && handleFilterClick('warning')}
        role="button"
        tabindex="0"
        aria-pressed={$resultsFilter === 'warning'}
        aria-label="Filter results to show only warnings ({warningCount} files)"
      >
        <div class="stat-value">{warningCount}</div>
        <div class="stat-label">Warnings</div>
      </div>
      <div
        class="stat fail"
        class:active={$resultsFilter === 'fail'}
        on:click={() => handleFilterClick('fail')}
        on:keydown={(e) => e.key === 'Enter' && handleFilterClick('fail')}
        role="button"
        tabindex="0"
        aria-pressed={$resultsFilter === 'fail'}
        aria-label="Filter results to show only failed files ({failCount} files)"
      >
        <div class="stat-value">{failCount}</div>
        <div class="stat-label">Failed</div>
      </div>
      <div
        class="stat error"
        class:active={$resultsFilter === 'error'}
        on:click={() => handleFilterClick('error')}
        on:keydown={(e) => e.key === 'Enter' && handleFilterClick('error')}
        role="button"
        tabindex="0"
        aria-pressed={$resultsFilter === 'error'}
        aria-label="Filter results to show only errors ({errorCount} files)"
      >
        <div class="stat-value">{errorCount}</div>
        <div class="stat-label">Errors</div>
      </div>
    </div>
    ```

6.  **Implement Click Handler**: Add the `handleFilterClick` function.

    ```javascript
    function handleFilterClick(status: 'pass' | 'warning' | 'fail' | 'error') {
      // If clicking the current filter, toggle it off. Otherwise, set the new filter.
      if ($resultsFilter === status) {
        resultsFilter.set(null);
      } else {
        resultsFilter.set(status);
      }
    }
    ```

7.  **Add "Clear Filter" Button**: Add the button to the batch header.

    ```svelte
    <div class="header-actions">
      {#if $resultsFilter}
        <button
          class="clear-filter-button"
          on:click={() => resultsFilter.set(null)}
          aria-label="Clear active filter"
        >
          ✕ Clear Filter
        </button>
      {/if}
      <button
        class="export-button"
        on:click={handleExport}
        disabled={isExporting || filteredResults.length === 0 || isProcessing}
        title="Export results to CSV file"
      >
        {#if isExporting}
          <span class="loading-spinner"></span>
          Exporting...
        {:else}
          📊 Export CSV
        {/if}
      </button>
    </div>
    ```

8.  **Add Empty State Message**: Display when filter has no matches.

    ```svelte
    <!-- Add this after the batch summary and before the results table -->
    {#if $resultsFilter && filteredResults.length === 0}
      <div class="empty-filter-state">
        <p>No {$resultsFilter === 'fail' ? 'failed' : $resultsFilter} results found.</p>
        <button
          class="clear-filter-inline"
          on:click={() => resultsFilter.set(null)}
        >
          Clear Filter
        </button>
      </div>
    {/if}
    ```

#### Step 3: Add CSS Styles

In the `<style>` block of `ResultsDisplay.svelte`, add styles for the new interactive elements:

```css
/* Scoped stat styles - only affect stats in summary section */
.summary-stats .stat {
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 8px;
  padding: 0.5rem;
  border: 2px solid transparent;
}

.summary-stats .stat:hover {
  background-color: rgba(0, 0, 0, 0.05);
  transform: translateY(-1px);
}

.summary-stats .stat:focus {
  outline: 2px solid var(--primary, #2563eb);
  outline-offset: 2px;
}

.summary-stats .stat.active {
  background-color: var(--primary-light, rgba(37, 99, 235, 0.1));
  border: 2px solid var(--primary, #2563eb);
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
}

.clear-filter-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--secondary, #6c757d);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.clear-filter-button:hover {
  background: #5a6268;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(108, 117, 125, 0.3);
}

/* Empty filter state */
.empty-filter-state {
  margin: 1rem 0;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(139, 92, 246, 0.1) 100%);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 8px;
  text-align: center;
}

.empty-filter-state p {
  margin: 0 0 1rem 0;
  color: var(--text-secondary, #666666);
  font-size: 1rem;
}

.clear-filter-inline {
  padding: 0.5rem 1rem;
  background: var(--primary, #2563eb);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-filter-inline:hover {
  background: var(--primary-dark, #1d4ed8);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);
}

/* Dark mode support */
:global([data-theme="dark"]) .summary-stats .stat:hover {
  background-color: rgba(255, 255, 255, 0.05);
}
```

#### Step 4: Update Export Integration

The CSV export functionality will respect the active filter and track analytics.

1.  **Export Filtered Data**: The `handleExport` function will use `filteredResults`.

2.  **Dynamic Filename with UI Labels**: Use the same labels shown in the UI.

3.  **Track Export Analytics**: Log when users export filtered vs. full results.

    ```javascript
    function handleExport() {
      if (!isBatchMode || filteredResults.length === 0) {
        return;
      }

      isExporting = true;
      exportError = null;
      exportSuccess = false;

      try {
        // Map filter types to UI labels for filename
        const filterLabels = {
          'pass': 'Pass',
          'warning': 'Warnings',
          'fail': 'Failed',
          'error': 'Errors'
        };

        // Dynamically generate filename using UI labels
        const filterName = $resultsFilter ? `_${filterLabels[$resultsFilter]}` : '';
        const baseName = $enableIncludeFailureAnalysis || $enableIncludeRecommendations
          ? 'audio_analysis_enhanced'
          : 'audio_analysis_results';
        const dynamicFilename = `${baseName}${filterName}.csv`;

        // Track export with analytics
        analyticsService.track('batch_export', {
          filterActive: !!$resultsFilter,
          filterType: $resultsFilter || 'none',
          resultCount: filteredResults.length,
          totalResultCount: enrichedResults.length,
          enhanced: $enableIncludeFailureAnalysis || $enableIncludeRecommendations,
          analysisMode: $analysisMode
        });

        // Handle all 4 analysis modes correctly
        const exportOptions: ExportOptions = {
          mode: $analysisMode === 'filename-only' ? 'metadata-only' :
                $analysisMode === 'experimental' ? 'experimental' : 'standard'
        };

        // Use enhanced export if either failure analysis or recommendations is enabled
        const useEnhancedExport = $enableIncludeFailureAnalysis || $enableIncludeRecommendations;

        if (useEnhancedExport) {
          const exportOpts = {
            ...exportOptions,
            includeFailureAnalysis: $enableIncludeFailureAnalysis,
            includeRecommendations: $enableIncludeRecommendations
          };

          exportResultsEnhanced(
            filteredResults,  // Use filtered results
            exportOpts,
            $currentPresetId,
            $analysisMode,
            $currentCriteria,
            dynamicFilename,  // Use dynamic filename
            $selectedPreset
          );
        } else {
          exportResultsToCsv(
            filteredResults,  // Use filtered results
            exportOptions,
            $currentPresetId,
            $analysisMode,
            dynamicFilename   // Use dynamic filename
          );
        }

        // Show success feedback
        exportSuccess = true;
        setTimeout(() => {
          exportSuccess = false;
        }, 3000);

      } catch (error) {
        exportError = error instanceof Error ? error.message : 'Export failed';
        console.error('Export failed:', error);
      } finally {
        isExporting = false;
      }
    }
    ```

## 5. Testing Checklist

Before marking this feature complete, test the following:

- [ ] Clicking a stat block activates the filter
- [ ] Clicking an active stat block toggles the filter off
- [ ] "Clear Filter" button appears when filter is active
- [ ] "Clear Filter" button clears the filter
- [ ] Empty state message appears when no results match filter
- [ ] Enter key activates filter when stat block is focused
- [ ] Tab key navigates between stat blocks
- [ ] ARIA attributes are present and correct
- [ ] Filter resets when changing presets
- [ ] Filter resets when changing analysis modes
- [ ] Filter resets when changing tabs
- [ ] Filter persists as new results arrive during batch processing
- [ ] Export respects active filter
- [ ] Export filename includes filter label
- [ ] Analytics events fire for filter changes
- [ ] Analytics events fire for exports
- [ ] Visual feedback (hover, active states) works correctly
- [ ] Dark mode styling works correctly

## 6. Analytics Events Summary

The following events will be tracked:

1. **`results_filter_applied`**
   - `filterType`: 'pass' | 'warning' | 'fail' | 'error'
   - `previousFilter`: previous filter type or 'none'

2. **`results_filter_cleared`**
   - `previousFilter`: the filter that was cleared

3. **`batch_export`**
   - `filterActive`: boolean
   - `filterType`: 'pass' | 'warning' | 'fail' | 'error' | 'none'
   - `resultCount`: number of results exported
   - `totalResultCount`: total results available
   - `enhanced`: boolean (using enhanced export)
   - `analysisMode`: current analysis mode
