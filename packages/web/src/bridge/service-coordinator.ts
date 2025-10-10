/**
 * ServiceCoordinator - Routes AppBridge events to services
 *
 * This coordinator listens to events from the AppBridge and calls the appropriate
 * service methods. It's the "glue" between the Svelte UI layer and business logic.
 *
 * Phase 5.2a - Infrastructure
 */

import { AppBridge, type FileProcessingOptions } from './app-bridge';
import { AuthService } from '../services/auth-service';

/**
 * ServiceCoordinator
 *
 * Responsibilities:
 * - Listen to AppBridge events
 * - Route events to appropriate services
 * - Emit results back through AppBridge
 * - Handle errors and emit error events
 *
 * This class decouples Svelte components from service implementation details.
 * Components dispatch events → Coordinator routes → Services respond
 *
 * Usage:
 * ```typescript
 * const coordinator = new ServiceCoordinator();
 * // That's it! It self-initializes and listens to events
 * ```
 */
export class ServiceCoordinator {
  private bridge: AppBridge;
  private authService: AuthService;
  private unsubscribers: Array<() => void> = [];

  constructor() {
    this.bridge = AppBridge.getInstance();
    this.authService = AuthService.getInstance();

    this.attachEventListeners();
  }

  /**
   * Attach all event listeners
   */
  private attachEventListeners(): void {
    // Auth events
    this.unsubscribers.push(
      this.bridge.on('auth:google:signin:requested', () => this.handleGoogleSignIn())
    );

    this.unsubscribers.push(
      this.bridge.on('auth:google:signout:requested', () => this.handleGoogleSignOut())
    );

    this.unsubscribers.push(
      this.bridge.on('auth:box:signin:requested', () => this.handleBoxSignIn())
    );

    this.unsubscribers.push(
      this.bridge.on('auth:box:signout:requested', () => this.handleBoxSignOut())
    );

    // File processing events (placeholder - will implement in later phases)
    this.unsubscribers.push(
      this.bridge.on('file:local:selected', (event) => {
        console.log('[ServiceCoordinator] File selected:', event.file.name);
        // TODO: Implement file processing in Phase 5.3+
      })
    );

    this.unsubscribers.push(
      this.bridge.on('file:drive:requested', (event) => {
        console.log('[ServiceCoordinator] Google Drive file requested:', event.url);
        // TODO: Implement Drive file processing in Phase 5.3+
      })
    );

    this.unsubscribers.push(
      this.bridge.on('file:box:requested', (event) => {
        console.log('[ServiceCoordinator] Box file requested:', event.url);
        // TODO: Implement Box file processing in Phase 5.3+
      })
    );
  }

  /**
   * Handle Google sign-in request
   */
  private async handleGoogleSignIn(): Promise<void> {
    try {
      await this.authService.signInGoogle();

      // Get user info from the store
      const googleAuth = this.authService.getGoogleAuthInstance();
      const userInfo = await googleAuth.getUserInfo();

      this.bridge.dispatch({
        type: 'auth:google:signin:success',
        userInfo
      });
    } catch (error) {
      this.bridge.dispatch({
        type: 'auth:google:signin:error',
        error: error instanceof Error ? error : new Error(String(error))
      });
    }
  }

  /**
   * Handle Google sign-out request
   */
  private async handleGoogleSignOut(): Promise<void> {
    try {
      await this.authService.signOutGoogle();

      this.bridge.dispatch({
        type: 'auth:google:signout:success'
      });
    } catch (error) {
      this.bridge.dispatch({
        type: 'auth:google:signout:error',
        error: error instanceof Error ? error : new Error(String(error))
      });
    }
  }

  /**
   * Handle Box sign-in request
   */
  private async handleBoxSignIn(): Promise<void> {
    try {
      await this.authService.signInBox();

      this.bridge.dispatch({
        type: 'auth:box:signin:success'
      });
    } catch (error) {
      this.bridge.dispatch({
        type: 'auth:box:signin:error',
        error: error instanceof Error ? error : new Error(String(error))
      });
    }
  }

  /**
   * Handle Box sign-out request
   */
  private async handleBoxSignOut(): Promise<void> {
    try {
      await this.authService.signOutBox();

      this.bridge.dispatch({
        type: 'auth:box:signout:success'
      });
    } catch (error) {
      this.bridge.dispatch({
        type: 'auth:box:signout:error',
        error: error instanceof Error ? error : new Error(String(error))
      });
    }
  }

  /**
   * Cleanup - unsubscribe from all events
   * Useful for testing and when destroying the coordinator
   */
  destroy(): void {
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];
  }
}
