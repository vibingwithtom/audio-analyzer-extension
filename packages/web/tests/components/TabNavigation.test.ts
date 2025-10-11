import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { get } from 'svelte/store';
import TabNavigation from '../../src/components/TabNavigation.svelte';
import { currentTab } from '../../src/stores/tabs';
import { AppBridge } from '../../src/bridge/app-bridge';

describe('TabNavigation Component', () => {
  let bridge: AppBridge;

  beforeEach(() => {
    bridge = AppBridge.getInstance();
    // Reset tab to default
    currentTab.setTab('local');
  });

  it('renders all three tab buttons', () => {
    const { getByText } = render(TabNavigation);

    expect(getByText('📁 Local Files')).toBeTruthy();
    expect(getByText('☁️ Google Drive')).toBeTruthy();
    expect(getByText('📦 Box')).toBeTruthy();
  });

  it('shows local tab as active by default', () => {
    const { getByText } = render(TabNavigation);
    const localButton = getByText('📁 Local Files');

    expect(localButton.classList.contains('active')).toBe(true);
  });

  it('updates store when tab is clicked', async () => {
    const { getByText } = render(TabNavigation);
    const driveButton = getByText('☁️ Google Drive');

    await fireEvent.click(driveButton);

    expect(get(currentTab)).toBe('googleDrive');
  });

  it('dispatches tab:changed event through bridge when clicked', async () => {
    const { getByText } = render(TabNavigation);
    const dispatchSpy = vi.spyOn(bridge, 'dispatch');

    const boxButton = getByText('📦 Box');
    await fireEvent.click(boxButton);

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: 'tab:changed',
      tab: 'box'
    });
  });

  it('updates active state when store changes', async () => {
    const { getByText, component } = render(TabNavigation);

    // Initially local is active
    const localButton = getByText('📁 Local Files');
    const driveButton = getByText('☁️ Google Drive');

    expect(localButton.classList.contains('active')).toBe(true);
    expect(driveButton.classList.contains('active')).toBe(false);

    // Change tab externally via store
    currentTab.setTab('googleDrive');

    // Wait for component to update
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(localButton.classList.contains('active')).toBe(false);
    expect(driveButton.classList.contains('active')).toBe(true);
  });

  it('has proper ARIA attributes', () => {
    const { getByText } = render(TabNavigation);
    const nav = getByText('📁 Local Files').closest('nav');

    expect(nav?.getAttribute('aria-label')).toBe('Main navigation');
  });

  it('sets aria-current on active tab', () => {
    const { getByText } = render(TabNavigation);
    const localButton = getByText('📁 Local Files');

    expect(localButton.getAttribute('aria-current')).toBe('page');
  });

  it('removes aria-current from inactive tabs', async () => {
    const { getByText } = render(TabNavigation);
    const localButton = getByText('📁 Local Files');
    const driveButton = getByText('☁️ Google Drive');

    expect(localButton.getAttribute('aria-current')).toBe('page');
    expect(driveButton.getAttribute('aria-current')).toBe(null);

    await fireEvent.click(driveButton);

    expect(localButton.getAttribute('aria-current')).toBe(null);
    expect(driveButton.getAttribute('aria-current')).toBe('page');
  });

  it('applies scoped CSS classes', () => {
    const { container } = render(TabNavigation);
    const nav = container.querySelector('nav');

    expect(nav?.classList.contains('sv-tab-nav')).toBe(true);
  });
});
