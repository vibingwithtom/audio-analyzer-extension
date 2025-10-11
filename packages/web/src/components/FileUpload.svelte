<script lang="ts">
  export let id: string;
  export let processing = false;
  export let accept = 'audio/*';
</script>

<style>
  .file-upload-wrapper {
    margin-top: 1rem;
  }

  .file-upload-label {
    display: block;
    margin-bottom: 0.5rem;
  }
</style>

<div class="file-upload-wrapper">
  <label for={id} class="file-upload-label">Upload a file</label>
  <input type="file" {id} {accept} on:change disabled={processing} />
  {#if processing}
    <p>Processing...</p>
  {/if}
</div>
