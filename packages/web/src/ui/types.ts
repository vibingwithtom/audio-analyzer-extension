/**
 * UI Type Definitions
 */

export type TabName = 'local' | 'googleDrive' | 'box' | 'settings';

export type SectionName =
  | 'loading'
  | 'error'
  | 'results'
  | 'advancedResults'
  | 'batchProgress'
  | 'batchResults';

/**
 * All DOM elements managed by UIController
 */
export interface UIElements {
  // Tab elements
  tabButtons: NodeListOf<Element>;
  tabContents: NodeListOf<Element>;

  // Dark mode
  darkModeToggle: HTMLElement;

  // Loading and error
  loading: HTMLElement;
  error: HTMLElement;
  errorMessage: HTMLElement;

  // Results sections
  resultsSection: HTMLElement;
  advancedResultsSection: HTMLElement;
  validationLegend: HTMLElement;

  // Batch processing
  batchProgress: HTMLElement;
  batchProgressBar: HTMLElement;
  batchProgressText: HTMLElement;
  batchCurrentFile: HTMLElement;
  batchResultsSection: HTMLElement;
  batchValidationLegend: HTMLElement;

  // Build info
  buildInfo: HTMLElement | null;
}
