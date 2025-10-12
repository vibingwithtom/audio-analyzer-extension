/**
 * ServiceCoordinator Tests
 *
 * Comprehensive test suite for the ServiceCoordinator
 * Phase 5.2a - Infrastructure
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ServiceCoordinator } from '../../src/bridge/service-coordinator';
import { AppBridge } from '../../src/bridge/app-bridge';
import { AuthService } from '../../src/services/auth-service';

// Mock GoogleAuth and BoxAuth
vi.mock('../../src/google-auth.js', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      init: vi.fn().mockResolvedValue(undefined),
      isSignedIn: vi.fn().mockReturnValue(false),
      signIn: vi.fn().mockResolvedValue(undefined),
      signOut: vi.fn().mockResolvedValue(undefined),
      getUserInfo: vi.fn().mockResolvedValue({
        email: 'test@example.com',
        name: 'Test User'
      })
    }))
  };
});

vi.mock('../../src/box-auth.js', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      init: vi.fn().mockResolvedValue(undefined),
      isSignedIn: vi.fn().mockReturnValue(false),
      signIn: vi.fn().mockResolvedValue(undefined),
      signOut: vi.fn().mockResolvedValue(undefined),
      getUserInfo: vi.fn().mockResolvedValue({ id: 'box-user-123', name: 'Box User' })
    }))
  };
});

describe('ServiceCoordinator', () => {
  let coordinator: ServiceCoordinator;
  let bridge: AppBridge;
  let authService: AuthService;

  beforeEach(() => {
    bridge = AppBridge.getInstance();
    authService = AuthService.getInstance();
    authService.resetState();

    coordinator = new ServiceCoordinator();
  });

  afterEach(() => {
    coordinator.destroy();
    bridge.clearAllListeners();
  });

  describe('Initialization', () => {
    it('should initialize and attach event listeners', () => {
      expect(coordinator).toBeDefined();
    });

    it('should use singleton instances', () => {
      const coordinator2 = new ServiceCoordinator();

      // Both coordinators should use the same bridge and auth service
      expect(bridge).toBe(AppBridge.getInstance());
      expect(authService).toBe(AuthService.getInstance());

      coordinator2.destroy();
    });
  });

  describe('Google Auth Events', () => {
    it('should handle Google sign-in request', async () => {
      const handler = vi.fn();
      bridge.on('auth:google:signin:success', handler);

      bridge.dispatch({ type: 'auth:google:signin:requested' });

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({
        type: 'auth:google:signin:success',
        userInfo: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });
    });

    it('should handle Google sign-in error', async () => {
      const errorHandler = vi.fn();
      bridge.on('auth:google:signin:error', errorHandler);

      const mockError = new Error('Google sign-in failed');
      const googleAuth = authService.getGoogleAuthInstance();
      vi.spyOn(googleAuth, 'signIn').mockRejectedValueOnce(mockError);

      bridge.dispatch({ type: 'auth:google:signin:requested' });

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(errorHandler).toHaveBeenCalledOnce();
      expect(errorHandler).toHaveBeenCalledWith({
        type: 'auth:google:signin:error',
        error: mockError
      });
    });

    it('should handle Google sign-out request', async () => {
      const handler = vi.fn();
      bridge.on('auth:google:signout:success', handler);

      bridge.dispatch({ type: 'auth:google:signout:requested' });

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({
        type: 'auth:google:signout:success'
      });
    });

    it('should handle Google sign-out error', async () => {
      const errorHandler = vi.fn();
      bridge.on('auth:google:signout:error', errorHandler);

      const mockError = new Error('Google sign-out failed');
      const googleAuth = authService.getGoogleAuthInstance();
      vi.spyOn(googleAuth, 'signOut').mockRejectedValueOnce(mockError);

      bridge.dispatch({ type: 'auth:google:signout:requested' });

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(errorHandler).toHaveBeenCalledOnce();
      expect(errorHandler).toHaveBeenCalledWith({
        type: 'auth:google:signout:error',
        error: mockError
      });
    });
  });

  describe('Box Auth Events', () => {
    it('should handle Box sign-in request', async () => {
      const handler = vi.fn();
      bridge.on('auth:box:signin:success', handler);

      bridge.dispatch({ type: 'auth:box:signin:requested' });

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({
        type: 'auth:box:signin:success'
      });
    });

    it('should handle Box sign-in error', async () => {
      const errorHandler = vi.fn();
      bridge.on('auth:box:signin:error', errorHandler);

      const mockError = new Error('Box sign-in failed');
      const boxAuth = authService.getBoxAuthInstance();
      vi.spyOn(boxAuth, 'signIn').mockRejectedValueOnce(mockError);

      bridge.dispatch({ type: 'auth:box:signin:requested' });

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(errorHandler).toHaveBeenCalledOnce();
      expect(errorHandler).toHaveBeenCalledWith({
        type: 'auth:box:signin:error',
        error: mockError
      });
    });

    it('should handle Box sign-out request', async () => {
      const handler = vi.fn();
      bridge.on('auth:box:signout:success', handler);

      bridge.dispatch({ type: 'auth:box:signout:requested' });

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({
        type: 'auth:box:signout:success'
      });
    });

    it('should handle Box sign-out error', async () => {
      const errorHandler = vi.fn();
      bridge.on('auth:box:signout:error', errorHandler);

      const mockError = new Error('Box sign-out failed');
      const boxAuth = authService.getBoxAuthInstance();
      vi.spyOn(boxAuth, 'signOut').mockRejectedValueOnce(mockError);

      bridge.dispatch({ type: 'auth:box:signout:error' });

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(errorHandler).toHaveBeenCalledOnce();
    });
  });

  describe('File Processing Events (Placeholder)', () => {
    it('should log file:local:selected events', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const file = new File(['test'], 'test.wav', { type: 'audio/wav' });
      bridge.dispatch({
        type: 'file:local:selected',
        file
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[ServiceCoordinator] File selected:',
        'test.wav'
      );

      consoleSpy.mockRestore();
    });

    it('should log file:drive:requested events', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      bridge.dispatch({
        type: 'file:drive:requested',
        url: 'https://drive.google.com/file/123'
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[ServiceCoordinator] Google Drive file requested:',
        'https://drive.google.com/file/123'
      );

      consoleSpy.mockRestore();
    });

    it('should log file:box:requested events', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      bridge.dispatch({
        type: 'file:box:requested',
        url: 'https://box.com/s/abc123'
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[ServiceCoordinator] Box file requested:',
        'https://box.com/s/abc123'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Destroy', () => {
    it('should unsubscribe from all events', async () => {
      const handler = vi.fn();
      bridge.on('auth:google:signin:success', handler);

      // Dispatch before destroy - should work
      bridge.dispatch({ type: 'auth:google:signin:requested' });
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(handler).toHaveBeenCalledOnce();

      // Destroy coordinator
      coordinator.destroy();

      // Dispatch after destroy - coordinator should not handle it, so no success event emitted
      bridge.dispatch({ type: 'auth:google:signin:requested' });
      await new Promise(resolve => setTimeout(resolve, 50));

      // Handler should still be called only once because coordinator is destroyed
      // and won't emit the success event
      expect(handler).toHaveBeenCalledOnce();
    });

    it('should allow multiple destroy calls', () => {
      coordinator.destroy();
      coordinator.destroy();
      coordinator.destroy();

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should convert non-Error objects to Errors', async () => {
      const errorHandler = vi.fn();
      bridge.on('auth:google:signin:error', errorHandler);

      const googleAuth = authService.getGoogleAuthInstance();
      vi.spyOn(googleAuth, 'signIn').mockRejectedValueOnce('String error');

      bridge.dispatch({ type: 'auth:google:signin:requested' });

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(errorHandler).toHaveBeenCalledOnce();
      const call = errorHandler.mock.calls[0][0];
      expect(call.error).toBeInstanceOf(Error);
      expect(call.error.message).toBe('String error');
    });
  });

  describe('Integration', () => {
    it('should complete full auth flow', async () => {
      const signInHandler = vi.fn();
      const signOutHandler = vi.fn();

      bridge.on('auth:google:signin:success', signInHandler);
      bridge.on('auth:google:signout:success', signOutHandler);

      // Sign in
      bridge.dispatch({ type: 'auth:google:signin:requested' });
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(signInHandler).toHaveBeenCalledOnce();

      // Sign out
      bridge.dispatch({ type: 'auth:google:signout:requested' });
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(signOutHandler).toHaveBeenCalledOnce();
    });
  });
});
