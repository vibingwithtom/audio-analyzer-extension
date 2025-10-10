/**
 * AuthService Tests
 *
 * Comprehensive test suite for the AuthService singleton
 * Phase 5.2a - Infrastructure
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../../src/services/auth-service';
import { get } from 'svelte/store';

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
        name: 'Test User',
        picture: 'https://example.com/picture.jpg'
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
      signOut: vi.fn().mockResolvedValue(undefined)
    }))
  };
});

describe('AuthService', () => {
  beforeEach(() => {
    // Clear module cache to get fresh instances
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AuthService.getInstance();
      const instance2 = AuthService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should maintain state across getInstance calls', async () => {
      const service = AuthService.getInstance();
      const state1 = get(service.authState);

      // Get instance again
      const service2 = AuthService.getInstance();
      const state2 = get(service2.authState);

      expect(state1).toEqual(state2);
    });
  });

  describe('Initialization', () => {
    it('should initialize with default unauthenticated state', async () => {
      const service = AuthService.getInstance();

      // Give time for async initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      const state = get(service.authState);

      expect(state.google.isAuthenticated).toBe(false);
      expect(state.google.isInitialized).toBe(true);
      expect(state.google.userInfo).toBeNull();
      expect(state.box.isAuthenticated).toBe(false);
      expect(state.box.isInitialized).toBe(true);
    });
  });

  describe('Google Authentication', () => {
    it('should update state on successful sign-in', async () => {
      const service = AuthService.getInstance();
      service.resetState();

      await service.signInGoogle();

      const state = get(service.authState);

      expect(state.google.isAuthenticated).toBe(true);
      expect(state.google.userInfo).toEqual({
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/picture.jpg'
      });
      expect(state.google.error).toBeNull();
    });

    it('should update state on successful sign-out', async () => {
      const service = AuthService.getInstance();

      // Sign in first
      await service.signInGoogle();
      expect(get(service.authState).google.isAuthenticated).toBe(true);

      // Sign out
      await service.signOutGoogle();

      const state = get(service.authState);
      expect(state.google.isAuthenticated).toBe(false);
      expect(state.google.userInfo).toBeNull();
      expect(state.google.error).toBeNull();
    });

    it('should handle sign-in errors', async () => {
      const service = AuthService.getInstance();
      service.resetState();

      const mockError = new Error('Sign-in failed');
      const googleAuth = service.getGoogleAuthInstance();
      vi.spyOn(googleAuth, 'signIn').mockRejectedValueOnce(mockError);

      await expect(service.signInGoogle()).rejects.toThrow('Sign-in failed');

      const state = get(service.authState);
      expect(state.google.error).toEqual(mockError);
      expect(state.google.isAuthenticated).toBe(false);
    });

    it('should handle sign-out errors', async () => {
      const service = AuthService.getInstance();

      const mockError = new Error('Sign-out failed');
      const googleAuth = service.getGoogleAuthInstance();
      vi.spyOn(googleAuth, 'signOut').mockRejectedValueOnce(mockError);

      await expect(service.signOutGoogle()).rejects.toThrow('Sign-out failed');

      const state = get(service.authState);
      expect(state.google.error).toEqual(mockError);
    });
  });

  describe('Box Authentication', () => {
    it('should update state on successful sign-in', async () => {
      const service = AuthService.getInstance();
      service.resetState();

      await service.signInBox();

      const state = get(service.authState);
      expect(state.box.isAuthenticated).toBe(true);
      expect(state.box.error).toBeNull();
    });

    it('should update state on successful sign-out', async () => {
      const service = AuthService.getInstance();

      // Sign in first
      await service.signInBox();
      expect(get(service.authState).box.isAuthenticated).toBe(true);

      // Sign out
      await service.signOutBox();

      const state = get(service.authState);
      expect(state.box.isAuthenticated).toBe(false);
      expect(state.box.error).toBeNull();
    });

    it('should handle sign-in errors', async () => {
      const service = AuthService.getInstance();
      service.resetState();

      const mockError = new Error('Box sign-in failed');
      const boxAuth = service.getBoxAuthInstance();
      vi.spyOn(boxAuth, 'signIn').mockRejectedValueOnce(mockError);

      await expect(service.signInBox()).rejects.toThrow('Box sign-in failed');

      const state = get(service.authState);
      expect(state.box.error).toEqual(mockError);
      expect(state.box.isAuthenticated).toBe(false);
    });

    it('should handle sign-out errors', async () => {
      const service = AuthService.getInstance();

      const mockError = new Error('Box sign-out failed');
      const boxAuth = service.getBoxAuthInstance();
      vi.spyOn(boxAuth, 'signOut').mockRejectedValueOnce(mockError);

      await expect(service.signOutBox()).rejects.toThrow('Box sign-out failed');

      const state = get(service.authState);
      expect(state.box.error).toEqual(mockError);
    });
  });

  describe('Derived Stores', () => {
    it('should provide isGoogleAuthenticated derived store', async () => {
      const service = AuthService.getInstance();
      service.resetState();

      expect(get(service.isGoogleAuthenticated)).toBe(false);

      await service.signInGoogle();

      expect(get(service.isGoogleAuthenticated)).toBe(true);
    });

    it('should provide isBoxAuthenticated derived store', async () => {
      const service = AuthService.getInstance();
      service.resetState();

      expect(get(service.isBoxAuthenticated)).toBe(false);

      await service.signInBox();

      expect(get(service.isBoxAuthenticated)).toBe(true);
    });

    it('should provide googleUserInfo derived store', async () => {
      const service = AuthService.getInstance();
      service.resetState();

      expect(get(service.googleUserInfo)).toBeNull();

      await service.signInGoogle();

      const userInfo = get(service.googleUserInfo);
      expect(userInfo).toEqual({
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/picture.jpg'
      });
    });
  });

  describe('Auth Instance Access', () => {
    it('should provide access to GoogleAuth instance', () => {
      const service = AuthService.getInstance();
      const googleAuth = service.getGoogleAuthInstance();

      expect(googleAuth).toBeDefined();
      expect(googleAuth.init).toBeDefined();
      expect(googleAuth.signIn).toBeDefined();
    });

    it('should provide access to BoxAuth instance', () => {
      const service = AuthService.getInstance();
      const boxAuth = service.getBoxAuthInstance();

      expect(boxAuth).toBeDefined();
      expect(boxAuth.init).toBeDefined();
      expect(boxAuth.signIn).toBeDefined();
    });

    it('should return same instances across calls', () => {
      const service = AuthService.getInstance();

      const google1 = service.getGoogleAuthInstance();
      const google2 = service.getGoogleAuthInstance();

      const box1 = service.getBoxAuthInstance();
      const box2 = service.getBoxAuthInstance();

      expect(google1).toBe(google2);
      expect(box1).toBe(box2);
    });
  });

  describe('Synchronous Auth Checks', () => {
    it('should provide synchronous Google auth check', () => {
      const service = AuthService.getInstance();

      expect(service.isGoogleAuthenticatedSync()).toBe(false);
    });

    it('should provide synchronous Box auth check', () => {
      const service = AuthService.getInstance();

      expect(service.isBoxAuthenticatedSync()).toBe(false);
    });
  });

  describe('State Reset', () => {
    it('should reset to initial state', async () => {
      const service = AuthService.getInstance();

      // Sign in to both
      await service.signInGoogle();
      await service.signInBox();

      expect(get(service.authState).google.isAuthenticated).toBe(true);
      expect(get(service.authState).box.isAuthenticated).toBe(true);

      // Reset
      service.resetState();

      const state = get(service.authState);
      expect(state.google.isAuthenticated).toBe(false);
      expect(state.google.userInfo).toBeNull();
      expect(state.google.error).toBeNull();
      expect(state.box.isAuthenticated).toBe(false);
      expect(state.box.error).toBeNull();
    });
  });

  describe('Store Reactivity', () => {
    it('should trigger store updates on auth changes', async () => {
      const service = AuthService.getInstance();
      service.resetState();

      const updates: boolean[] = [];

      // Subscribe to store
      const unsubscribe = service.isGoogleAuthenticated.subscribe((value) => {
        updates.push(value);
      });

      // Initial value
      expect(updates).toEqual([false]);

      // Sign in
      await service.signInGoogle();
      expect(updates).toEqual([false, true]);

      // Sign out
      await service.signOutGoogle();
      expect(updates).toEqual([false, true, false]);

      unsubscribe();
    });
  });

  describe('Error Handling', () => {
    it('should preserve state on error', async () => {
      const service = AuthService.getInstance();
      service.resetState();

      const googleAuth = service.getGoogleAuthInstance();
      vi.spyOn(googleAuth, 'signIn').mockRejectedValueOnce(new Error('Network error'));

      try {
        await service.signInGoogle();
      } catch (e) {
        // Expected error
      }

      const state = get(service.authState);
      expect(state.google.isAuthenticated).toBe(false);
      expect(state.google.userInfo).toBeNull();
    });

    it('should convert non-Error objects to Errors', async () => {
      const service = AuthService.getInstance();
      service.resetState();

      const googleAuth = service.getGoogleAuthInstance();
      vi.spyOn(googleAuth, 'signIn').mockRejectedValueOnce('String error');

      await expect(service.signInGoogle()).rejects.toThrow('String error');

      const state = get(service.authState);
      expect(state.google.error).toBeInstanceOf(Error);
      expect(state.google.error?.message).toBe('String error');
    });
  });
});
