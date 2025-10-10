/**
 * Auth Stores
 *
 * Svelte store wrappers for AuthService
 * Makes it easy to use auth state in Svelte components
 *
 * Phase 5.2a - Infrastructure
 */

import { AuthService } from '../services/auth-service';

// Export singleton instance for direct method calls
export const authService = AuthService.getInstance();

// Export stores for reactive subscriptions in Svelte components
export const authState = authService.authState;
export const isGoogleAuthenticated = authService.isGoogleAuthenticated;
export const isBoxAuthenticated = authService.isBoxAuthenticated;
export const googleUserInfo = authService.googleUserInfo;

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
