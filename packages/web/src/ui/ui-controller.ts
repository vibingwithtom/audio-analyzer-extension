/**
 * UI Controller Module
 *
 * Manages all DOM manipulation and UI state.
 * Separates presentation logic from business logic.
 */

import type { UIElements, TabName, SectionName } from './types.ts';
import { SettingsManager } from '../settings/settings-manager.ts';

export class UIController {
  private elements: UIElements;
  private currentTab: TabName = 'local';

  constructor() {
    this.elements = this.initializeElements();
  }

  /**
   * Initialize all DOM element references
   */
  private initializeElements(): UIElements {
    return {
      // Tab elements
      tabButtons: document.querySelectorAll('.tab-button'),
      tabContents: document.querySelectorAll('.tab-content'),

      // Dark mode
      darkModeToggle: document.getElementById('darkModeToggle')!,

      // Loading and error
      loading: document.getElementById('loading')!,
      error: document.getElementById('error')!,
      errorMessage: document.getElementById('errorMessage')!,

      // Results sections
      resultsSection: document.getElementById('resultsSection')!,
      advancedResultsSection: document.getElementById('advancedResultsSection')!,
      validationLegend: document.getElementById('validationLegend')!,

      // Batch processing
      batchProgress: document.getElementById('batchProgress')!,
      batchProgressBar: document.getElementById('batchProgressBar')!,
      batchProgressText: document.getElementById('batchProgressText')!,
      batchCurrentFile: document.getElementById('batchCurrentFile')!,
      batchResultsSection: document.getElementById('batchResultsSection')!,
      batchValidationLegend: document.getElementById('batchValidationLegend')!,

      // Build info
      buildInfo: document.getElementById('buildInfo')
    };
  }

  /**
   * Get current active tab
   */
  getCurrentTab(): TabName {
    return this.currentTab;
  }

  /**
   * Switch to a different tab
   * @param tabName - Name of the tab to switch to
   * @param onSwitch - Callback to execute after switching (for cleanup logic)
   */
  switchTab(tabName: TabName, onSwitch?: () => void): void {
    this.elements.tabButtons.forEach(btn => btn.classList.remove('active'));
    this.elements.tabContents.forEach(content => content.classList.remove('active'));

    // Activate the tab button
    const tabButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (tabButton) {
      tabButton.classList.add('active');
    }

    // Activate ALL tab content sections for this tab (there may be multiple)
    document.querySelectorAll(`.tab-content[data-tab="${tabName}"]`).forEach(content => {
      content.classList.add('active');
    });

    this.currentTab = tabName;

    // Hide all sections after switching
    this.hideAllSections();

    // Execute callback if provided (for cleanup and validation updates)
    if (onSwitch) {
      onSwitch();
    }
  }

  /**
   * Hide all result/loading/error sections
   */
  hideAllSections(): void {
    this.elements.loading.style.display = 'none';
    this.elements.error.style.display = 'none';
    this.elements.resultsSection.style.display = 'none';
    this.elements.advancedResultsSection.style.display = 'none';
    this.elements.batchProgress.style.display = 'none';
    this.elements.batchResultsSection.style.display = 'none';
    this.elements.validationLegend.style.display = 'none';
    this.elements.batchValidationLegend.style.display = 'none';
  }

  /**
   * Show loading state
   */
  showLoading(): void {
    this.hideAllSections();
    this.elements.loading.style.display = 'block';
  }

  /**
   * Show error message
   */
  showError(message: string): void {
    this.hideAllSections();
    this.elements.errorMessage.textContent = message;
    this.elements.error.style.display = 'block';
  }

  /**
   * Show results section
   */
  showResults(): void {
    this.hideAllSections();
    this.elements.resultsSection.style.display = 'block';
    this.elements.validationLegend.style.display = 'block';
  }

  /**
   * Show batch progress indicator
   */
  showBatchProgress(current: number, total: number, currentFile: string): void {
    // Don't hide sections - just show progress
    // (batch results table should remain visible during processing)
    this.elements.batchProgress.style.display = 'block';

    const percentage = Math.round((current / total) * 100);
    this.elements.batchProgressBar.style.width = `${percentage}%`;
    this.elements.batchProgressText.textContent = `${current}/${total} (${percentage}%)`;
    this.elements.batchCurrentFile.textContent = currentFile || 'Processing...';
  }

  /**
   * Hide batch progress indicator
   */
  hideBatchProgress(): void {
    this.elements.batchProgress.style.display = 'none';
  }

  /**
   * Show batch results section
   */
  showBatchResults(): void {
    this.hideAllSections();
    this.elements.batchProgress.style.display = 'block';
    this.elements.batchResultsSection.style.display = 'block';
  }

  /**
   * Update batch progress text (for cancellation or completion messages)
   */
  updateBatchProgressText(text: string): void {
    this.elements.batchProgressText.textContent = text;
  }

  /**
   * Toggle dark mode
   */
  toggleDarkMode(): void {
    const root = document.documentElement;
    const isDark = root.classList.contains('dark-mode');

    if (isDark) {
      root.classList.remove('dark-mode');
      SettingsManager.saveDarkModePreference(false);
    } else {
      root.classList.add('dark-mode');
      SettingsManager.saveDarkModePreference(true);
    }
  }

  /**
   * Initialize dark mode based on saved preference or system preference
   */
  initializeDarkMode(): void {
    const savedPreference = SettingsManager.getDarkModePreference();

    // If user has saved a preference, use that
    if (savedPreference !== null) {
      if (savedPreference) {
        document.documentElement.classList.add('dark-mode');
      }
    } else {
      // Otherwise, check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark-mode');
      }
    }
  }

  /**
   * Update build information display
   */
  updateBuildInfo(): void {
    if (this.elements.buildInfo) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const buildNumber = `${year}.${month}.${day}-${hours}${minutes}`;
      this.elements.buildInfo.textContent = `Audio Analyzer build-${buildNumber}`;
    }
  }

  /**
   * Setup dark mode toggle event listener
   */
  setupDarkModeToggle(): void {
    this.elements.darkModeToggle.addEventListener('click', () => this.toggleDarkMode());
  }

  /**
   * Setup tab switching event listeners
   * @param onSwitch - Callback to execute when tab switches
   */
  setupTabSwitching(onSwitch?: () => void): void {
    this.elements.tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabName = (button as HTMLElement).dataset.tab as TabName;
        this.switchTab(tabName, onSwitch);
      });
    });
  }
}
