import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { get } from 'svelte/store';
import App from '../../src/components/App.svelte';
import { currentTab } from '../../src/stores/tabs';
import { AuthService } from '../../src/services/auth-service';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('App Component', () => {
  beforeEach(() => {
    // Reset tab to default
    currentTab.setTab('local');
    // Clear localStorage
    localStorageMock.clear();
    // Reset auth state
    AuthService.getInstance().resetState();
  });

  it('renders the app shell', () => {
    const { container } = render(App);
    const app = container.querySelector('.sv-app');

    expect(app).toBeTruthy();
  });

  it('renders header with logo', () => {
    const { getByText } = render(App);

    expect(getByText('🎵 Audio Analyzer')).toBeTruthy();
  });

  it('renders dark mode toggle button', () => {
    const { getByLabelText } = render(App);
    const toggle = getByLabelText('Toggle dark mode');

    expect(toggle).toBeTruthy();
  });

  it('renders TabNavigation component', () => {
    const { getByText } = render(App);

    // Check if tab buttons from TabNavigation are present
    expect(getByText('📁 Local Files')).toBeTruthy();
    expect(getByText('☁️ Google Drive')).toBeTruthy();
    expect(getByText('📦 Box')).toBeTruthy();
  });

  it('renders tab content placeholder', () => {
    const { getByText } = render(App);

    expect(getByText(/Tab content will be implemented in Phase 5.3\+/)).toBeTruthy();
  });

  it('displays current tab in placeholder', () => {
    const { getByText } = render(App);

    expect(getByText('Current Tab: local')).toBeTruthy();
  });

  it('updates placeholder when tab changes', async () => {
    const { getByText } = render(App);

    // Click Google Drive tab
    const driveButton = getByText('☁️ Google Drive');
    await fireEvent.click(driveButton);

    // Wait for update
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(getByText('Current Tab: googleDrive')).toBeTruthy();
  });

  it('renders footer', () => {
    const { getByText } = render(App);

    expect(getByText('Audio Analyzer - Phase 5.2b App Shell')).toBeTruthy();
  });

  it('toggles dark mode on button click', async () => {
    const { getByLabelText } = render(App);
    const toggle = getByLabelText('Toggle dark mode');

    // Initially light mode (no theme set)
    expect(document.documentElement.getAttribute('data-theme')).toBe(null);

    // Click to enable dark mode
    await fireEvent.click(toggle);

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorageMock.getItem('theme')).toBe('dark');

    // Click again to disable
    await fireEvent.click(toggle);

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorageMock.getItem('theme')).toBe('light');
  });

  it('applies saved theme from localStorage on mount', () => {
    // Set dark mode in localStorage before mounting
    localStorageMock.setItem('theme', 'dark');

    render(App);

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('shows auth status for Google Drive when authenticated', async () => {
    const { getByText } = render(App);
    const authService = AuthService.getInstance();

    // Mock Google auth
    authService.updateGoogleState({
      isAuthenticated: true,
      userInfo: { email: 'test@example.com' }
    });

    // Switch to Google Drive tab
    const driveButton = getByText('☁️ Google Drive');
    await fireEvent.click(driveButton);

    // Wait for update
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(getByText(/Signed in as test@example.com/)).toBeTruthy();
  });

  it('shows auth status for Box when authenticated', async () => {
    const { getByText } = render(App);
    const authService = AuthService.getInstance();

    // Mock Box auth
    authService.updateBoxState({
      isAuthenticated: true
    });

    // Switch to Box tab
    const boxButton = getByText('📦 Box');
    await fireEvent.click(boxButton);

    // Wait for update
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(getByText(/Signed in to Box/)).toBeTruthy();
  });

  it('applies scoped CSS classes', () => {
    const { container } = render(App);
    const app = container.querySelector('.sv-app');

    expect(app).toBeTruthy();
  });

  it('has proper semantic HTML structure', () => {
    const { container } = render(App);

    expect(container.querySelector('header')).toBeTruthy();
    expect(container.querySelector('main')).toBeTruthy();
    expect(container.querySelector('footer')).toBeTruthy();
  });
});
