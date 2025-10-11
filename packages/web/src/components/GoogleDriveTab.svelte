<script lang="ts">
  import { authState, authService } from '../stores/auth';
  import { AppBridge } from '../bridge/app-bridge';

  const bridge = AppBridge.getInstance();

  function handleSignIn() {
    bridge.dispatch({ type: 'auth:google:signin:requested' });
  }

  function handleSignOut() {
    bridge.dispatch({ type: 'auth:google:signout:requested' });
  }
</script>

<style>
  .google-drive-tab {
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

  .user-email {
    font-weight: 600;
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

<div class="google-drive-tab">
  <div class="auth-section">
    <h3>Google Drive Authentication</h3>

    {#if $authState.google.isAuthenticated}
      <div class="user-info">
        <span class="user-email">✅ Signed in as {$authState.google.userInfo?.email}</span>
      </div>
      <button class="secondary" on:click={handleSignOut}>Sign Out</button>
    {:else}
      <p>Sign in to access your Google Drive files</p>
      <button on:click={handleSignIn}>Sign in with Google</button>
    {/if}
  </div>

  {#if $authState.google.isAuthenticated}
    <div class="placeholder">
      <h3>Google Drive File Analysis</h3>
      <p>Full Google Drive integration will be implemented in Phase 5.5+</p>
      <p style="margin-top: 1rem;">
        This will include:
        <br />• Browse and select files from Google Drive
        <br />• Batch processing of folders
        <br />• Direct file URL input
      </p>
    </div>
  {/if}
</div>
