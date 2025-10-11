<script lang="ts">
  import { availablePresets, currentPresetId, setPreset, selectedPreset } from '../stores/settings';

  function handlePresetChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    setPreset(select.value);
  }

  // Get preset entries sorted
  $: presetEntries = Object.entries(availablePresets).sort((a, b) => {
    // Put "Custom" at the end
    if (a[0] === 'custom') return 1;
    if (b[0] === 'custom') return -1;
    return a[1].name.localeCompare(b[1].name);
  });
</script>

<style>
  .settings-tab {
    padding: 1.5rem 0;
  }

  .settings-section {
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 8px;
  }

  .settings-section h3 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary, #333333);
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--text-primary, #333333);
  }

  .form-group select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--bg-tertiary, #e0e0e0);
    border-radius: 4px;
    background: var(--bg-primary, #ffffff);
    color: var(--text-primary, #333333);
    font-size: 1rem;
  }

  .preset-info {
    margin-top: 1rem;
    padding: 1rem;
    background: var(--bg-primary, #ffffff);
    border-radius: 4px;
    border-left: 4px solid var(--primary, #2563eb);
  }

  .preset-info h4 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    font-weight: 600;
  }

  .preset-info dl {
    margin: 0;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.5rem 1rem;
  }

  .preset-info dt {
    font-weight: 500;
    color: var(--text-secondary, #666666);
  }

  .preset-info dd {
    margin: 0;
    color: var(--text-primary, #333333);
  }

  .placeholder {
    padding: 1rem;
    background: var(--bg-primary, #ffffff);
    border-radius: 4px;
    color: var(--text-secondary, #666666);
  }
</style>

<div class="settings-tab">
  <div class="settings-section">
    <h3>Criteria Presets</h3>

    <div class="form-group">
      <label for="preset-select">Select Preset:</label>
      <select
        id="preset-select"
        value={$currentPresetId}
        on:change={handlePresetChange}
      >
        {#each presetEntries as [id, preset]}
          <option value={id}>{preset.name}</option>
        {/each}
      </select>
    </div>

    {#if $selectedPreset && $currentPresetId !== 'custom'}
      <div class="preset-info">
        <h4>Preset Requirements</h4>
        <dl>
          {#if $selectedPreset.fileType && $selectedPreset.fileType.length > 0}
            <dt>File Type:</dt>
            <dd>{$selectedPreset.fileType.join(', ').toUpperCase()}</dd>
          {/if}
          {#if $selectedPreset.sampleRate && $selectedPreset.sampleRate.length > 0}
            <dt>Sample Rate:</dt>
            <dd>{$selectedPreset.sampleRate.map(sr => `${parseInt(sr) / 1000} kHz`).join(', ')}</dd>
          {/if}
          {#if $selectedPreset.bitDepth && $selectedPreset.bitDepth.length > 0}
            <dt>Bit Depth:</dt>
            <dd>{$selectedPreset.bitDepth.map(bd => `${bd}-bit`).join(', ')}</dd>
          {/if}
          {#if $selectedPreset.channels && $selectedPreset.channels.length > 0}
            <dt>Channels:</dt>
            <dd>{$selectedPreset.channels.map(ch => ch === '1' ? 'Mono' : ch === '2' ? 'Stereo' : ch).join(', ')}</dd>
          {/if}
          {#if $selectedPreset.minDuration}
            <dt>Min Duration:</dt>
            <dd>{Math.floor(parseInt($selectedPreset.minDuration) / 60)}m {parseInt($selectedPreset.minDuration) % 60}s</dd>
          {/if}
          {#if $selectedPreset.supportsFilenameValidation}
            <dt>Filename Validation:</dt>
            <dd>Supported ({$selectedPreset.filenameValidationType})</dd>
          {/if}
        </dl>
      </div>
    {:else if $currentPresetId === 'custom'}
      <div class="placeholder">
        <p>Custom criteria configuration will be available in a future update.</p>
        <p style="margin-top: 0.5rem;">For now, select a preset above to apply validation rules.</p>
      </div>
    {/if}
  </div>
</div>
