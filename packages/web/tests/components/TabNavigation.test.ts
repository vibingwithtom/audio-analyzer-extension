import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import TabNavigation from '../../src/components/TabNavigation.svelte';
import { currentTab } from '../../src/stores/tabs';

describe('TabNavigation Component', () => {

  // Reset the store to its default state before each test
  beforeEach(() => {
    currentTab.setTab('local');
  });

  it('should render all tabs and mark the default tab as active', () => {
    render(TabNavigation);

    const localFilesTab = screen.getByText('📁 Local Files');
    const googleDriveTab = screen.getByText('☁️ Google Drive');

    expect(localFilesTab).toBeInTheDocument();
    expect(googleDriveTab).toBeInTheDocument();

    // Check that the default tab is active
    expect(localFilesTab).toHaveClass('active');
    expect(localFilesTab).toHaveAttribute('aria-current', 'page');

    // Check that another tab is not active
    expect(googleDriveTab).not.toHaveClass('active');
    expect(googleDriveTab).not.toHaveAttribute('aria-current');
  });

  it('should switch the active tab when a user clicks on it', async () => {
    render(TabNavigation);
    const user = userEvent.setup();

    const localFilesTab = screen.getByText('📁 Local Files');
    const googleDriveTab = screen.getByText('☁️ Google Drive');

    // Initial state check
    expect(localFilesTab).toHaveClass('active');
    expect(googleDriveTab).not.toHaveClass('active');

    // Click the Google Drive tab
    await user.click(googleDriveTab);

    // Assert that the UI has updated correctly
    expect(localFilesTab).not.toHaveClass('active');
    expect(googleDriveTab).toHaveClass('active');
    expect(googleDriveTab).toHaveAttribute('aria-current', 'page');
  });
});