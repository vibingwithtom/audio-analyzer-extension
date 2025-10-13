<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { isSimplifiedMode } from '../stores/simplifiedMode';

  export let id: string;
  export let processing = false;
  export let accept = 'audio/*';
  export let multiple = false;
  export let disabled = false;

  const dispatch = createEventDispatcher();

  let isDragging = false;

  $: isDisabled = processing || disabled;

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    if (!isDisabled) {
      isDragging = true;
    }
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;

    if (isDisabled) return;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      // Create a synthetic change event with the dropped files
      const input = document.getElementById(id) as HTMLInputElement;
      if (input) {
        // Create a new FileList-like object
        const dataTransfer = new DataTransfer();

        // Add all files if multiple is enabled, otherwise just the first
        if (multiple) {
          for (let i = 0; i < files.length; i++) {
            dataTransfer.items.add(files[i]);
          }
        } else {
          dataTransfer.items.add(files[0]);
        }

        input.files = dataTransfer.files;

        // Dispatch change event
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }
</script>

<style>
  .file-upload-wrapper {
    margin: 1.5rem 0;
  }

  .drop-zone {
    padding: 2rem;
    border: 2px dashed var(--bg-tertiary, #e0e0e0);
    border-radius: 8px;
    text-align: center;
    background: var(--bg-secondary, #f5f5f5);
    transition: all 0.2s ease;
  }

  .drop-zone.dragging {
    border-color: var(--primary, #2563eb);
    background: rgba(37, 99, 235, 0.05);
    transform: scale(1.01);
  }

  .drop-zone.disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .file-upload-label {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    background: var(--primary, #2563eb);
    color: white;
    font-weight: 500;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
  }

  .file-upload-label:hover {
    background: var(--primary-dark, #1d4ed8);
    box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
    transform: translateY(-1px);
  }

  .file-upload-label:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
  }

  .file-upload-label.disabled {
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
  }

  .file-input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
    pointer-events: none;
  }

  .file-info {
    margin-top: 0.75rem;
    font-size: 0.875rem;
    color: var(--text-secondary, #666666);
  }

  .drop-instruction {
    margin-top: 0.75rem;
    font-size: 0.875rem;
    color: var(--text-secondary, #666666);
  }
</style>

<div class="file-upload-wrapper">
  <div
    class="drop-zone"
    class:dragging={isDragging}
    class:disabled={isDisabled}
    on:dragover={handleDragOver}
    on:dragleave={handleDragLeave}
    on:drop={handleDrop}
  >
    <label for={id} class="file-upload-label" class:disabled={isDisabled}>
      <span>📁 {isDisabled && !processing ? 'Configure preset to enable' : processing ? 'Processing...' : multiple ? 'Choose Audio Files' : 'Choose Audio File'}</span>
    </label>
    <input type="file" {id} {accept} {multiple} on:change disabled={isDisabled} class="file-input" />

    <div class="drop-instruction">{isDisabled && !processing ? 'Select a preset in Settings to analyze files' : `or drag and drop ${multiple ? 'files' : 'file'} here`}</div>
    {#if !$isSimplifiedMode}
      <div class="file-info">Supported formats: WAV, MP3, FLAC, M4A, OGG</div>
    {/if}
  </div>
</div>
