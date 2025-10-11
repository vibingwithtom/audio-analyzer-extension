<script lang="ts">
  import type { ValidationResults } from '../types';

  export let validation: ValidationResults | null;
</script>

<style>
  .validation-display {
    margin-top: 1rem;
    padding: 1rem;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 8px;
  }

  .validation-item {
    margin-bottom: 0.5rem;
  }

  .validation-item.fail {
    color: var(--danger, #f44336);
  }

  .validation-item.warning {
    color: var(--warning, #ff9800);
  }
</style>

{#if validation}
  <div class="validation-display">
    <h3>Validation Details</h3>
    {#each Object.entries(validation) as [key, result]}
      <div class="validation-item {result.status}">
        <strong>{key}:</strong> {result.value}
        {#if result.issue}
          <span>({result.issue})</span>
        {/if}
      </div>
    {/each}
  </div>
{/if}
