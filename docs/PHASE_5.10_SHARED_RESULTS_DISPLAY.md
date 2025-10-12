# Phase 5.10: Shared Results Display Component

## Status: 📝 PLANNING

**Created:** October 12, 2025

## Overview

This phase addresses a key piece of technical debt: duplicated results display logic across the `LocalFileTab`, `GoogleDriveTab`, and upcoming `BoxTab`. The goal is to refactor this duplicated code into a single, reusable Svelte component (`ResultsDisplay.svelte`) that will be responsible for all aspects of rendering analysis results.

This will improve code maintainability, ensure a consistent user experience, and simplify the development of future features.

### Problem: Duplicated Logic

Currently, each tab component independently implements logic for:
- Displaying error messages.
- Showing loading or progress indicators.
- Rendering batch summary statistics (pass/fail counts, etc.).
- Switching between single-file and batch-file views.
- Invoking the `ResultsTable` component.

Fixing a bug or making a change requires editing the same logic in multiple files, which is inefficient and error-prone.

### Solution: A Centralized Component

We will create `ResultsDisplay.svelte`, a component whose sole responsibility is to render the outcome of a file analysis, whether it's a single file or a large batch.

**Component Props:**
```typescript
interface Props {
  results: AudioResult | AudioResult[] | null;
  isLoading: boolean;
  error: string | null;
  analysisMode: 'full' | 'audio-only' | 'filename-only' | 'experimental';
}
```

--- 

## Implementation Plan

### 1. Create `ResultsDisplay.svelte`

- Create the new file at `src/components/ResultsDisplay.svelte`.
- This component will contain all the conditional logic (`{#if isLoading}`, `{#if error}`, etc.) for displaying the various states of the results.

### 2. Migrate Existing Logic

- Choose one tab to start with (e.g., `GoogleDriveTab.svelte`).
- Move all of its results-rendering markup and logic into `ResultsDisplay.svelte`.
- This includes:
    - Error message display.
    - Loading indicators or progress bars.
    - Batch summary statistics calculation and display.
    - The invocation of `<ResultsTable />`.
    - Logic to differentiate between a single result and an array of results.

### 3. Refactor Tab Components

- Replace the code you just moved from `GoogleDriveTab.svelte` with the new, simpler component:

  ```svelte
  <ResultsDisplay
    results={currentResults}
    isLoading={isProcessing}
    error={errorMessage}
    analysisMode={$analysisMode}
  />
  ```

- Test the `GoogleDriveTab` to ensure it functions identically to before.

### 4. Roll Out to Other Tabs

- Once verified, repeat the refactoring for `LocalFileTab.svelte`.
- When implementing `BoxTab.svelte`, use the new `ResultsDisplay` component from the start, avoiding any duplication of logic.

--- 

## Benefits

- **DRY (Don't Repeat Yourself):** A single source of truth for results display. Bug fixes and feature enhancements are made in one place.
- **Consistency:** The results UI will be 100% consistent across all tabs.
- **Simplified Tabs:** Tab components become much cleaner, focusing only on fetching data and managing their specific state, not on rendering.
- **Faster Development:** The Box tab implementation will be faster because this display logic will already be built and tested.

---

## Files to Modify

- **`src/components/ResultsDisplay.svelte`**: (New file)
- **`src/components/GoogleDriveTab.svelte`**: (Refactor to use the new component)
- **`src/components/LocalFileTab.svelte`**: (Refactor to use the new component)
- **`src/components/BoxTab.svelte`**: (Will use the new component during its implementation)

---

## Success Criteria

- [ ] `ResultsDisplay.svelte` is created and handles all results rendering logic.
- [ ] `LocalFileTab.svelte` and `GoogleDriveTab.svelte` are refactored to use `ResultsDisplay.svelte`.
- [ ] All existing functionality for displaying single files, batch results, errors, and loading states is preserved.
- [ ] There are no visual or functional regressions in the UI.
- [ ] The amount of duplicated code in the tab components is significantly reduced.

---

## Estimated Time

- **Implementation & Refactoring:** 1-2 hours.
- **Testing:** 30 minutes.
- **Total:** 1.5 - 2.5 hours.