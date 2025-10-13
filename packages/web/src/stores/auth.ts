/**
 * Auth Stores
 *
 * Svelte store wrappers for AuthService
 * Makes it easy to use auth state in Svelte components
 *
 * Phase 5.2a - Infrastructure
 */

import { AuthService } from '../services/auth-service';
import type { Readable } from 'svelte/store';
import type { AuthState, GoogleAuthState } from '../services/auth-service';

// Lazy-initialized singleton (prevents circular dependency issues)
let _authService: AuthService | null = null;

function getAuthService(): AuthService {
  if (!_authService) {
    _authService = AuthService.getInstance();
  }
  return _authService;
}

// Export singleton instance for direct method calls
export const authService = getAuthService();

// Export store getters (lazy evaluation prevents initialization order issues)
export const authState: Readable<AuthState> = {
  subscribe: (run) => getAuthService().authState.subscribe(run)
};

export const isGoogleAuthenticated: Readable<boolean> = {
  subscribe: (run) => getAuthService().isGoogleAuthenticated.subscribe(run)
};

export const isBoxAuthenticated: Readable<boolean> = {
  subscribe: (run) => getAuthService().isBoxAuthenticated.subscribe(run)
};

export const googleUserInfo: Readable<GoogleAuthState['userInfo']> = {
  subscribe: (run) => getAuthService().googleUserInfo.subscribe(run)
};

/**
 * Usage in Svelte components:
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { authState, authService } from '../stores/auth';
 *
 *   async function handleSignIn() {
 *     await authService.signInGoogle();
 *   }
 * </script>
 *
 * {#if $authState.google.isAuthenticated}
 *   <p>Signed in as {$authState.google.userInfo?.email}</p>
 * {/if}
 * ```
 */
