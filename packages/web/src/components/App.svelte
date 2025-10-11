<script lang="ts">
  import TabNavigation from './TabNavigation.svelte';
  import StatusBadge from './StatusBadge.svelte';
  import ResultsTable from './ResultsTable.svelte';
  import FileUpload from './FileUpload.svelte';
  import ValidationDisplay from './ValidationDisplay.svelte';
  import { currentTab } from '../stores/tabs';
  import { authState } from '../stores/auth';

  /**
   * Toggle dark mode
   */
  function toggleDarkMode(): void {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', isDark ? 'light' : 'dark');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
  }

  // Apply saved theme on mount
  if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }

  // Phase 5.3 Component Demo Data
  const demoResults = [
    {
      filename: 'demo-pass.wav',
      status: 'pass' as const,
      sampleRate: 48000,
      bitDepth: 24,
      channels: 2,
      duration: 120.5,
      fileSize: 14155776
    },
    {
      filename: 'demo-warning.wav',
      status: 'warning' as const,
      sampleRate: 44100,
      bitDepth: 16,
      channels: 2,
      duration: 60.0,
      fileSize: 5292000
    },
    {
      filename: 'demo-fail.wav',
      status: 'fail' as const,
      sampleRate: 22050,
      bitDepth: 8,
      channels: 1,
      duration: 30.0,
      fileSize: 661500
    }
  ];

  const demoValidation = {
    sampleRate: { status: 'pass', value: '48000 Hz' },
    bitDepth: { status: 'pass', value: '24 bit' },
    channels: { status: 'warning', value: '2 (stereo)', issue: 'Expected mono for this preset' },
    duration: { status: 'fail', value: '30s', issue: 'Minimum duration is 60s' }
  };

  let fileProcessing = false;

  function handleFileChange(event: CustomEvent) {
    console.log('File change event:', event);
  }
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

  /* Phase 5.3 Component Demo */
  .component-demo {
    margin-top: 2rem;
  }

  .component-demo h2 {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary, #333333);
    font-size: 1.5rem;
  }

  .demo-note {
    margin: 0 0 2rem 0;
    padding: 1rem;
    background: var(--bg-secondary, #f5f5f5);
    border-left: 4px solid var(--primary, #2563eb);
    border-radius: 4px;
    color: var(--text-secondary, #666666);
    font-size: 0.9rem;
  }

  .demo-section {
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: var(--bg-primary, #ffffff);
    border: 1px solid var(--bg-tertiary, #e0e0e0);
    border-radius: 8px;
  }

  .demo-section h3 {
    margin: 0 0 1rem 0;
    color: var(--text-primary, #333333);
    font-size: 1.1rem;
    font-weight: 600;
  }

  .badge-demo {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
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

      <!-- Phase 5.3 Component Demo -->
      <div class="component-demo">
        <h2>Phase 5.3: Shared Components Demo</h2>
        <p class="demo-note">
          This demo verifies all Phase 5.3 shared components are working correctly.
          Tab content will use these components in Phase 5.4+.
        </p>

        <!-- StatusBadge Demo -->
        <section class="demo-section">
          <h3>StatusBadge Component</h3>
          <div class="badge-demo">
            <StatusBadge status="pass" />
            <StatusBadge status="warning" />
            <StatusBadge status="fail" />
            <StatusBadge status="error" />
          </div>
        </section>

        <!-- FileUpload Demo -->
        <section class="demo-section">
          <h3>FileUpload Component</h3>
          <FileUpload
            id="demo-upload"
            processing={fileProcessing}
            on:change={handleFileChange}
          />
        </section>

        <!-- ResultsTable Demo (Single Mode) -->
        <section class="demo-section">
          <h3>ResultsTable Component - Single File Mode</h3>
          <ResultsTable
            results={[demoResults[0]]}
            mode="single"
          />
        </section>

        <!-- ResultsTable Demo (Batch Mode) -->
        <section class="demo-section">
          <h3>ResultsTable Component - Batch Mode</h3>
          <ResultsTable
            results={demoResults}
            mode="batch"
          />
        </section>

        <!-- ValidationDisplay Demo -->
        <section class="demo-section">
          <h3>ValidationDisplay Component</h3>
          <ValidationDisplay validation={demoValidation} />
        </section>

        <!-- Current Tab Info -->
        {#if $currentTab === 'googleDrive' && $authState.google.isAuthenticated}
          <p style="margin-top: 2rem; padding: 1rem; background: var(--bg-secondary); border-radius: 8px;">
            ✅ Signed in as {$authState.google.userInfo?.email}
          </p>
        {/if}
        {#if $currentTab === 'box' && $authState.box.isAuthenticated}
          <p style="margin-top: 2rem; padding: 1rem; background: var(--bg-secondary); border-radius: 8px;">
            ✅ Signed in to Box
          </p>
        {/if}
      </div>
    </div>
  </main>

  <!-- Footer -->
  <footer class="footer">
    <div class="container">
      <p id="buildInfo">Audio Analyzer - Phase 5.3 Shared Components</p>
    </div>
  </footer>
</div>
