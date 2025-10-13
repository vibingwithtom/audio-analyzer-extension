<script lang="ts">
  import { onMount } from 'svelte';
  import TabNavigation from './TabNavigation.svelte';
  import LocalFileTab from './LocalFileTab.svelte';
  import GoogleDriveTab from './GoogleDriveTab.svelte';
  import BoxTab from './BoxTab.svelte';
  import SettingsTab from './SettingsTab.svelte';
  import UpdateBanner from './UpdateBanner.svelte';
  import { currentTab, type TabType } from '../stores/tabs';
  import { versionCheckService } from '../services/version-check-service';

  let updateAvailable = false;

  /**
   * Toggle dark mode
   */
  function toggleDarkMode(): void {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', isDark ? 'light' : 'dark');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
  }

  /**
   * Handle update reload
   */
  function handleReload(): void {
    versionCheckService.reload();
  }

  /**
   * Handle update banner dismissal
   */
  function handleDismiss(): void {
    updateAvailable = false;
  }

  // Apply saved theme on mount
  if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }

  // Listen for Box OAuth completion and restore tab
  onMount(() => {
    const handleBoxAuthComplete = (event: CustomEvent<{ returnTab: string }>) => {
      const { returnTab } = event.detail;
      if (returnTab) {
        currentTab.setTab(returnTab as TabType);
      }
    };

    window.addEventListener('box-auth-complete', handleBoxAuthComplete as EventListener);

    // Initialize version checking
    versionCheckService.initialize().then(() => {
      // Start checking for updates every 30 minutes
      versionCheckService.startPeriodicCheck(30);

      // Listen for update notifications
      versionCheckService.onUpdateAvailable(() => {
        updateAvailable = true;
      });
    });

    return () => {
      window.removeEventListener('box-auth-complete', handleBoxAuthComplete as EventListener);
      versionCheckService.stopPeriodicCheck();
    };
  });
</script>

<style>
  /* Root app container */
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* Header */
  .header {
    background: var(--bg-primary, #ffffff);
    border-bottom: 1px solid var(--bg-tertiary, #e0e0e0);
    padding: 1rem 0;
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1.5rem;
  }

  .header-spacer {
    width: 48px; /* Same width as dark mode toggle for balance */
  }

  .logo {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 600;
    color: var(--text-primary, #333333);
  }

  .dark-mode-toggle {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.5rem;
    padding: 0.5rem;
    border-radius: 50%;
    transition: background 0.2s ease;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .dark-mode-toggle:hover {
    background: var(--bg-secondary, #f5f5f5);
  }

  .light-icon {
    display: inline;
  }

  .dark-icon {
    display: none;
  }

  :global([data-theme="dark"]) .light-icon {
    display: none;
  }

  :global([data-theme="dark"]) .dark-icon {
    display: inline;
  }

  /* Main content */
  .main {
    flex: 1;
    padding: 2rem 0;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1.5rem;
  }


  /* Footer */
  .footer {
    background: var(--bg-secondary, #f5f5f5);
    border-top: 1px solid var(--bg-tertiary, #e0e0e0);
    padding: 1.5rem 0;
    margin-top: auto;
  }

  .footer p {
    margin: 0;
    text-align: center;
    color: var(--text-secondary, #666666);
    font-size: 0.9rem;
  }
</style>

<div class="app sv-app">
  <!-- Update Banner -->
  <UpdateBanner
    visible={updateAvailable}
    onReload={handleReload}
    onDismiss={handleDismiss}
  />

  <!-- Header -->
  <header class="header">
    <div class="header-content">
      <div class="header-spacer"></div>
      <h1 class="logo">🎵 Audio Analyzer</h1>
      <button
        class="dark-mode-toggle"
        on:click={toggleDarkMode}
        aria-label="Toggle dark mode"
      >
        <span class="light-icon">🌙</span>
        <span class="dark-icon">☀️</span>
      </button>
    </div>
  </header>

  <!-- Main Content -->
  <main class="main">
    <div class="container">
      <!-- Tab Navigation -->
      <TabNavigation />

      <!-- Tab Content -->
      {#if $currentTab === 'local'}
        <LocalFileTab />
      {:else if $currentTab === 'googleDrive'}
        <GoogleDriveTab />
      {:else if $currentTab === 'box'}
        <BoxTab />
      {:else if $currentTab === 'settings'}
        <SettingsTab />
      {/if}
    </div>
  </main>

  <!-- Footer -->
  <footer class="footer">
    <div class="container">
      <p id="buildInfo">Audio Analyzer build-2025.10.12-2355</p>
    </div>
  </footer>
</div>
