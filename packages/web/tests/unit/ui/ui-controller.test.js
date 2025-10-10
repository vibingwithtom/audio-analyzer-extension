import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UIController } from '../../../src/ui/ui-controller.ts';

/**
 * Unit tests for UIController
 *
 * Tests UI state management and DOM manipulation methods
 */

describe('UIController', () => {
  let controller;

  beforeEach(() => {
    // Mock DOM elements
    document.body.innerHTML = `
      <div id="loading" style="display: none;"></div>
      <div id="error" style="display: none;">
        <span id="errorMessage"></span>
      </div>
      <div id="resultsSection" style="display: none;"></div>
      <div id="advancedResultsSection" style="display: none;"></div>
      <div id="validationLegend" style="display: none;"></div>
      <div id="batchProgress" style="display: none;">
        <div id="batchProgressBar" style="width: 0%;"></div>
        <span id="batchProgressText"></span>
        <span id="batchCurrentFile"></span>
      </div>
      <div id="batchResultsSection" style="display: none;"></div>
      <div id="batchValidationLegend" style="display: none;"></div>
      <div id="darkModeToggle"></div>
      <div id="buildInfo"></div>
      <div class="tab-button active" data-tab="local">Local</div>
      <div class="tab-button" data-tab="googleDrive">Google Drive</div>
      <div class="tab-content active" data-tab="local">Local Content</div>
      <div class="tab-content" data-tab="googleDrive">Drive Content</div>
    `;

    controller = new UIController();
  });

  describe('Initialization', () => {
    it('should initialize all DOM element references', () => {
      expect(controller).toBeDefined();
      // Controller should have initialized without errors
    });

    it('should default to local tab', () => {
      expect(controller.getCurrentTab()).toBe('local');
    });
  });

  describe('hideAllSections', () => {
    it('should hide all UI sections', () => {
      // Show some sections first
      document.getElementById('loading').style.display = 'block';
      document.getElementById('resultsSection').style.display = 'block';
      document.getElementById('batchProgress').style.display = 'block';

      controller.hideAllSections();

      expect(document.getElementById('loading').style.display).toBe('none');
      expect(document.getElementById('error').style.display).toBe('none');
      expect(document.getElementById('resultsSection').style.display).toBe('none');
      expect(document.getElementById('advancedResultsSection').style.display).toBe('none');
      expect(document.getElementById('batchProgress').style.display).toBe('none');
      expect(document.getElementById('batchResultsSection').style.display).toBe('none');
      expect(document.getElementById('validationLegend').style.display).toBe('none');
      expect(document.getElementById('batchValidationLegend').style.display).toBe('none');
    });
  });

  describe('showLoading', () => {
    it('should display loading section', () => {
      controller.showLoading();

      expect(document.getElementById('loading').style.display).toBe('block');
    });

    it('should hide other sections when showing loading', () => {
      document.getElementById('resultsSection').style.display = 'block';

      controller.showLoading();

      expect(document.getElementById('resultsSection').style.display).toBe('none');
      expect(document.getElementById('error').style.display).toBe('none');
    });
  });

  describe('showError', () => {
    it('should display error message', () => {
      controller.showError('Test error message');

      expect(document.getElementById('error').style.display).toBe('block');
      expect(document.getElementById('errorMessage').textContent).toBe('Test error message');
    });

    it('should hide other sections when showing error', () => {
      document.getElementById('loading').style.display = 'block';
      document.getElementById('resultsSection').style.display = 'block';

      controller.showError('Error occurred');

      expect(document.getElementById('loading').style.display).toBe('none');
      expect(document.getElementById('resultsSection').style.display).toBe('none');
    });
  });

  describe('showResults', () => {
    it('should display results section', () => {
      controller.showResults();

      expect(document.getElementById('resultsSection').style.display).toBe('block');
      expect(document.getElementById('validationLegend').style.display).toBe('block');
    });

    it('should hide other sections when showing results', () => {
      document.getElementById('loading').style.display = 'block';
      document.getElementById('error').style.display = 'block';

      controller.showResults();

      expect(document.getElementById('loading').style.display).toBe('none');
      expect(document.getElementById('error').style.display).toBe('none');
    });
  });

  describe('showBatchProgress', () => {
    it('should display batch progress with correct percentage', () => {
      controller.showBatchProgress(5, 10, 'test.wav');

      expect(document.getElementById('batchProgress').style.display).toBe('block');
      expect(document.getElementById('batchProgressBar').style.width).toBe('50%');
      expect(document.getElementById('batchProgressText').textContent).toBe('5/10 (50%)');
      expect(document.getElementById('batchCurrentFile').textContent).toBe('test.wav');
    });

    it('should handle first file (0% progress)', () => {
      controller.showBatchProgress(0, 20, 'first.wav');

      expect(document.getElementById('batchProgressBar').style.width).toBe('0%');
      expect(document.getElementById('batchProgressText').textContent).toBe('0/20 (0%)');
    });

    it('should handle completion (100% progress)', () => {
      controller.showBatchProgress(15, 15, 'last.wav');

      expect(document.getElementById('batchProgressBar').style.width).toBe('100%');
      expect(document.getElementById('batchProgressText').textContent).toBe('15/15 (100%)');
    });

    it('should round percentage to nearest integer', () => {
      controller.showBatchProgress(1, 3, 'file.wav');

      // 1/3 = 33.333... should round to 33%
      expect(document.getElementById('batchProgressBar').style.width).toBe('33%');
      expect(document.getElementById('batchProgressText').textContent).toBe('1/3 (33%)');
    });

    it('should use default text when currentFile is empty', () => {
      controller.showBatchProgress(5, 10, '');

      expect(document.getElementById('batchCurrentFile').textContent).toBe('Processing...');
    });
  });

  describe('hideBatchProgress', () => {
    it('should hide batch progress section', () => {
      document.getElementById('batchProgress').style.display = 'block';

      controller.hideBatchProgress();

      expect(document.getElementById('batchProgress').style.display).toBe('none');
    });
  });

  describe('showBatchResults', () => {
    it('should display batch results section', () => {
      controller.showBatchResults();

      expect(document.getElementById('batchProgress').style.display).toBe('block');
      expect(document.getElementById('batchResultsSection').style.display).toBe('block');
    });

    it('should hide other sections when showing batch results', () => {
      document.getElementById('resultsSection').style.display = 'block';
      document.getElementById('loading').style.display = 'block';

      controller.showBatchResults();

      expect(document.getElementById('resultsSection').style.display).toBe('none');
      expect(document.getElementById('loading').style.display).toBe('none');
    });
  });

  describe('updateBatchProgressText', () => {
    it('should update batch progress text', () => {
      controller.updateBatchProgressText('Custom message');

      expect(document.getElementById('batchProgressText').textContent).toBe('Custom message');
    });

    it('should handle cancellation message', () => {
      controller.updateBatchProgressText('Processing cancelled');

      expect(document.getElementById('batchProgressText').textContent).toBe('Processing cancelled');
    });
  });

  describe('switchTab', () => {
    it('should switch to specified tab', () => {
      controller.switchTab('googleDrive');

      expect(controller.getCurrentTab()).toBe('googleDrive');
    });

    it('should update tab button active class', () => {
      controller.switchTab('googleDrive');

      const localBtn = document.querySelector('[data-tab="local"]');
      const driveBtn = document.querySelector('[data-tab="googleDrive"]');

      expect(localBtn.classList.contains('active')).toBe(false);
      expect(driveBtn.classList.contains('active')).toBe(true);
    });

    it('should update tab content active class', () => {
      controller.switchTab('googleDrive');

      const localContent = document.querySelector('.tab-content[data-tab="local"]');
      const driveContent = document.querySelector('.tab-content[data-tab="googleDrive"]');

      expect(localContent.classList.contains('active')).toBe(false);
      expect(driveContent.classList.contains('active')).toBe(true);
    });

    it('should call onSwitch callback if provided', () => {
      const mockCallback = vi.fn();

      controller.switchTab('googleDrive', mockCallback);

      expect(mockCallback).toHaveBeenCalledOnce();
    });

    it('should hide all sections when switching tabs', () => {
      document.getElementById('resultsSection').style.display = 'block';

      controller.switchTab('googleDrive');

      expect(document.getElementById('resultsSection').style.display).toBe('none');
    });
  });

  describe('toggleDarkMode', () => {
    beforeEach(() => {
      // Clear any existing dark mode
      document.documentElement.classList.remove('dark-mode');
      localStorage.clear();
    });

    it('should enable dark mode when disabled', () => {
      controller.toggleDarkMode();

      expect(document.documentElement.classList.contains('dark-mode')).toBe(true);
    });

    it('should disable dark mode when enabled', () => {
      document.documentElement.classList.add('dark-mode');

      controller.toggleDarkMode();

      expect(document.documentElement.classList.contains('dark-mode')).toBe(false);
    });

    it('should save preference to localStorage', () => {
      controller.toggleDarkMode();

      expect(localStorage.getItem('darkMode')).toBe('true');
    });

    it('should toggle between states correctly', () => {
      // Start disabled
      expect(document.documentElement.classList.contains('dark-mode')).toBe(false);

      // Enable
      controller.toggleDarkMode();
      expect(document.documentElement.classList.contains('dark-mode')).toBe(true);
      expect(localStorage.getItem('darkMode')).toBe('true');

      // Disable
      controller.toggleDarkMode();
      expect(document.documentElement.classList.contains('dark-mode')).toBe(false);
      expect(localStorage.getItem('darkMode')).toBe('false');
    });
  });

  describe('initializeDarkMode', () => {
    beforeEach(() => {
      document.documentElement.classList.remove('dark-mode');
      localStorage.clear();
    });

    it('should respect saved preference (dark)', () => {
      localStorage.setItem('darkMode', 'true');

      controller.initializeDarkMode();

      expect(document.documentElement.classList.contains('dark-mode')).toBe(true);
    });

    it('should respect saved preference (light)', () => {
      localStorage.setItem('darkMode', 'false');
      // Note: initializeDarkMode() only adds dark-mode class if preference is true
      // It doesn't remove the class if preference is false - it just doesn't add it
      // This is consistent with how the method works (it's called on page load when class isn't there yet)

      controller.initializeDarkMode();

      // Should not add dark-mode class when preference is false
      expect(document.documentElement.classList.contains('dark-mode')).toBe(false);
    });

    it('should use system preference when no saved preference', () => {
      // Mock matchMedia to return dark preference
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }));

      controller.initializeDarkMode();

      expect(document.documentElement.classList.contains('dark-mode')).toBe(true);
    });
  });

  describe('updateBuildInfo', () => {
    it('should update build info element', () => {
      controller.updateBuildInfo();

      const buildInfo = document.getElementById('buildInfo');
      expect(buildInfo.textContent).toMatch(/Audio Analyzer build-\d{4}\.\d{2}\.\d{2}-\d{4}/);
    });

    it('should generate current timestamp', () => {
      const now = new Date();
      controller.updateBuildInfo();

      const buildInfo = document.getElementById('buildInfo');
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');

      expect(buildInfo.textContent).toContain(`${year}.${month}`);
    });

    it('should handle missing buildInfo element', () => {
      document.getElementById('buildInfo').remove();

      // Should not throw
      expect(() => controller.updateBuildInfo()).not.toThrow();
    });
  });

  describe('setupDarkModeToggle', () => {
    it('should attach click event listener', () => {
      const darkModeToggle = document.getElementById('darkModeToggle');
      const initialClasses = document.documentElement.classList.contains('dark-mode');

      controller.setupDarkModeToggle();

      darkModeToggle.click();

      expect(document.documentElement.classList.contains('dark-mode')).toBe(!initialClasses);
    });
  });

  describe('setupTabSwitching', () => {
    it('should attach click events to tab buttons', () => {
      const mockCallback = vi.fn();
      controller.setupTabSwitching(mockCallback);

      const driveBtn = document.querySelector('[data-tab="googleDrive"]');
      driveBtn.click();

      expect(controller.getCurrentTab()).toBe('googleDrive');
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should work without callback', () => {
      controller.setupTabSwitching();

      const driveBtn = document.querySelector('[data-tab="googleDrive"]');

      // Should not throw
      expect(() => driveBtn.click()).not.toThrow();
      expect(controller.getCurrentTab()).toBe('googleDrive');
    });
  });
});
