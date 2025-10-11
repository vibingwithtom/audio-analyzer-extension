<script lang="ts">
  import { authState, authService } from '../stores/auth';
  import { AppBridge } from '../bridge/app-bridge';

  const bridge = AppBridge.getInstance();

  function handleSignIn() {
    bridge.dispatch({ type: 'auth:box:signin:requested' });
  }

  function handleSignOut() {
    bridge.dispatch({ type: 'auth:box:signout:requested' });
  }
</script>

<style>
  .box-tab {
    padding: 1.5rem 0;
  }

  .auth-section {
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 8px;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .placeholder {
    padding: 2rem;
    text-align: center;
    background: var(--bg-secondary, #f5f5f5);
    border: 2px dashed var(--bg-tertiary, #e0e0e0);
    border-radius: 8px;
    color: var(--text-secondary, #666666);
  }

  button {
    padding: 0.5rem 1rem;
    background: var(--primary, #2563eb);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
  }

  button:hover {
    opacity: 0.9;
  }

  button.secondary {
    background: var(--bg-tertiary, #e0e0e0);
    color: var(--text-primary, #333333);
  }
</style>

<div class="box-tab">
  <div class="auth-section">
    <h3>Box Authentication</h3>

    {#if $authState.box.isAuthenticated}
      <div class="user-info">
        <span>✅ Signed in to Box</span>
      </div>
      <button class="secondary" on:click={handleSignOut}>Sign Out</button>
    {:else}
      <p>Sign in to access your Box files</p>
      <button on:click={handleSignIn}>Sign in with Box</button>
    {/if}
  </div>

  {#if $authState.box.isAuthenticated}
    <div class="placeholder">
      <h3>Box File Analysis</h3>
      <p>Full Box integration will be implemented in Phase 5.5+</p>
      <p style="margin-top: 1rem;">
        This will include:
        <br />• Browse and select files from Box
        <br />• Batch processing of folders
        <br />• Direct shared link input
      </p>
    </div>
  {/if}
</div>
