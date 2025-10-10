/**
 * AuthService - Singleton authentication service
 *
 * Manages both Google Drive and Box authentication with Svelte store integration
 * Prevents multiple auth instances and provides reactive auth state
 *
 * Phase 5.2a - Infrastructure
 */

import GoogleAuth from '../google-auth.js';
import BoxAuth from '../box-auth.js';
import { writable, derived, type Readable } from 'svelte/store';

/**
 * Authentication state for a single provider
 */
export interface ProviderAuthState {
  isAuthenticated: boolean;
  isInitialized: boolean;
  error: Error | null;
}

/**
 * Google-specific auth state with user info
 */
export interface GoogleAuthState extends ProviderAuthState {
  userInfo: {
    email?: string;
    name?: string;
    picture?: string;
  } | null;
}

/**
 * Combined auth state for all providers
 */
export interface AuthState {
  google: GoogleAuthState;
  box: ProviderAuthState;
}

/**
 * AuthService - Singleton service for managing authentication
 *
 * This service provides:
 * - Single instances of GoogleAuth and BoxAuth (singleton pattern)
 * - Reactive Svelte stores for auth state
 * - Type-safe auth operations
 * - Centralized error handling
 *
 * Usage in services:
 * ```typescript
 * const authService = AuthService.getInstance();
 * await authService.signInGoogle();
 * ```
 *
 * Usage in Svelte components:
 * ```typescript
 * import { authService, authState } from '../stores/auth';
 *
 * // Reactive subscription
 * {#if $authState.google.isAuthenticated}
 *   <p>Signed in as {$authState.google.userInfo?.email}</p>
 * {/if}
 * ```
 */
export class AuthService {
  private static instance: AuthService;

  // Singleton instances of auth handlers
  private googleAuth: GoogleAuth;
  private boxAuth: BoxAuth;

  // Writable store for auth state
  private authStateStore = writable<AuthState>({
    google: {
      isAuthenticated: false,
      isInitialized: false,
      userInfo: null,
      error: null
    },
    box: {
      isAuthenticated: false,
      isInitialized: false,
      error: null
    }
  });

  private constructor() {
    this.googleAuth = new GoogleAuth();
    this.boxAuth = new BoxAuth();
    this.initialize();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Get the auth state store (read-only for external consumers)
   */
  get authState(): Readable<AuthState> {
    return { subscribe: this.authStateStore.subscribe };
  }

  /**
   * Derived store for Google authentication status
   */
  get isGoogleAuthenticated(): Readable<boolean> {
    return derived(this.authStateStore, $state => $state.google.isAuthenticated);
  }

  /**
   * Derived store for Box authentication status
   */
  get isBoxAuthenticated(): Readable<boolean> {
    return derived(this.authStateStore, $state => $state.box.isAuthenticated);
  }

  /**
   * Derived store for Google user info
   */
  get googleUserInfo(): Readable<GoogleAuthState['userInfo']> {
    return derived(this.authStateStore, $state => $state.google.userInfo);
  }

  /**
   * Initialize both auth services
   */
  private async initialize(): Promise<void> {
    // Initialize Google Auth
    try {
      await this.googleAuth.init();
      this.updateGoogleState({ isInitialized: true });

      // Check if already authenticated
      if (this.googleAuth.isAuthenticated()) {
        const userInfo = await this.googleAuth.getUserInfo();
        this.updateGoogleState({
          isAuthenticated: true,
          userInfo
        });
      }
    } catch (error) {
      console.error('Failed to initialize Google auth:', error);
      this.updateGoogleState({
        error: error instanceof Error ? error : new Error(String(error))
      });
    }

    // Initialize Box Auth
    try {
      await this.boxAuth.init();
      this.updateBoxState({ isInitialized: true });

      if (this.boxAuth.isAuthenticated()) {
        this.updateBoxState({ isAuthenticated: true });
      }
    } catch (error) {
      console.error('Failed to initialize Box auth:', error);
      this.updateBoxState({
        error: error instanceof Error ? error : new Error(String(error))
      });
    }
  }

  /**
   * Sign in to Google Drive
   *
   * @throws {Error} If sign-in fails
   */
  async signInGoogle(): Promise<void> {
    try {
      await this.googleAuth.signIn();
      const userInfo = await this.googleAuth.getUserInfo();
      this.updateGoogleState({
        isAuthenticated: true,
        userInfo,
        error: null
      });
    } catch (error) {
      const authError = error instanceof Error ? error : new Error(String(error));
      this.updateGoogleState({
        error: authError
      });
      throw authError;
    }
  }

  /**
   * Sign out of Google Drive
   *
   * @throws {Error} If sign-out fails
   */
  async signOutGoogle(): Promise<void> {
    try {
      await this.googleAuth.signOut();
      this.updateGoogleState({
        isAuthenticated: false,
        userInfo: null,
        error: null
      });
    } catch (error) {
      const authError = error instanceof Error ? error : new Error(String(error));
      this.updateGoogleState({
        error: authError
      });
      throw authError;
    }
  }

  /**
   * Sign in to Box
   *
   * @throws {Error} If sign-in fails
   */
  async signInBox(): Promise<void> {
    try {
      await this.boxAuth.signIn();
      this.updateBoxState({
        isAuthenticated: true,
        error: null
      });
    } catch (error) {
      const authError = error instanceof Error ? error : new Error(String(error));
      this.updateBoxState({
        error: authError
      });
      throw authError;
    }
  }

  /**
   * Sign out of Box
   *
   * @throws {Error} If sign-out fails
   */
  async signOutBox(): Promise<void> {
    try {
      await this.boxAuth.signOut();
      this.updateBoxState({
        isAuthenticated: false,
        error: null
      });
    } catch (error) {
      const authError = error instanceof Error ? error : new Error(String(error));
      this.updateBoxState({
        error: authError
      });
      throw authError;
    }
  }

  /**
   * Get the underlying GoogleAuth instance
   * (Needed for file downloads and other operations that require the raw auth object)
   */
  getGoogleAuthInstance(): GoogleAuth {
    return this.googleAuth;
  }

  /**
   * Get the underlying BoxAuth instance
   * (Needed for file downloads and other operations that require the raw auth object)
   */
  getBoxAuthInstance(): BoxAuth {
    return this.boxAuth;
  }

  /**
   * Check if Google is authenticated (synchronous)
   */
  isGoogleAuthenticatedSync(): boolean {
    return this.googleAuth.isAuthenticated();
  }

  /**
   * Check if Box is authenticated (synchronous)
   */
  isBoxAuthenticatedSync(): boolean {
    return this.boxAuth.isAuthenticated();
  }

  // Private helper methods

  /**
   * Update Google auth state
   */
  private updateGoogleState(updates: Partial<GoogleAuthState>): void {
    this.authStateStore.update(state => ({
      ...state,
      google: { ...state.google, ...updates }
    }));
  }

  /**
   * Update Box auth state
   */
  private updateBoxState(updates: Partial<ProviderAuthState>): void {
    this.authStateStore.update(state => ({
      ...state,
      box: { ...state.box, ...updates }
    }));
  }

  /**
   * Reset auth state (useful for testing)
   */
  resetState(): void {
    this.authStateStore.set({
      google: {
        isAuthenticated: false,
        isInitialized: false,
        userInfo: null,
        error: null
      },
      box: {
        isAuthenticated: false,
        isInitialized: false,
        error: null
      }
    });
  }
}
