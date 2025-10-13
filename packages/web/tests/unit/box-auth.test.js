import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import BoxAuth from '../../src/box-auth.js';

describe('BoxAuth', () => {
  let boxAuth;
  const store = {};

  beforeEach(() => {
    boxAuth = new BoxAuth();
    // Mock localStorage
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(key => store[key]);
    vi.spyOn(window.localStorage, 'setItem').mockImplementation((key, value) => { store[key] = value; });
    vi.spyOn(window.localStorage, 'removeItem').mockImplementation(key => { delete store[key]; });

    // Mock fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clear store
    for (const key in store) {
      delete store[key];
    }
  });

  it('should initialize correctly', async () => {
    await boxAuth.init();
    expect(boxAuth.isInitialized).toBe(true);
  });

  it('isSignedIn returns false when no token is in localStorage', () => {
    expect(boxAuth.isSignedIn()).toBe(false);
  });

  it('isSignedIn returns false for an expired token', () => {
    const expiredToken = { expires_at: Date.now() - 1000 };
    localStorage.setItem('box_token', JSON.stringify(expiredToken));
    expect(boxAuth.isSignedIn()).toBe(false);
  });

  it('isSignedIn returns true for a valid token', () => {
    const validToken = { expires_at: Date.now() + 60000 }; // Expires in 60 seconds
    localStorage.setItem('box_token', JSON.stringify(validToken));
    expect(boxAuth.isSignedIn()).toBe(true);
  });

  it('signOut should clear the token from localStorage', () => {
    const validToken = { expires_at: Date.now() + 60000 };
    localStorage.setItem('box_token', JSON.stringify(validToken));

    expect(boxAuth.isSignedIn()).toBe(true);

    boxAuth.signOut();

    expect(boxAuth.isSignedIn()).toBe(false);
    expect(localStorage.getItem('box_token')).toBeNull();
  });

  describe('getValidToken', () => {
    it('should return a valid token from localStorage', async () => {
      const tokenInfo = { access_token: 'valid-token', expires_at: Date.now() + 600000 };
      localStorage.setItem('box_token', JSON.stringify(tokenInfo));
      const result = await boxAuth.getValidToken();
      expect(result.access_token).toBe('valid-token');
    });

    it('should throw an error if token is expired', async () => {
      const tokenInfo = { access_token: 'expired-token', expires_at: Date.now() - 1000 };
      localStorage.setItem('box_token', JSON.stringify(tokenInfo));
      await expect(boxAuth.getValidToken()).rejects.toThrow('Not signed in to Box');
    });

    it('should throw an error if no token exists', async () => {
      await expect(boxAuth.getValidToken()).rejects.toThrow('Not signed in to Box');
    });
  });

  describe('handleOAuthCallback', () => {
    it('should exchange code for token successfully', async () => {
      const mockTokenData = { access_token: 'new-token', expires_in: 3600 };
      fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockTokenData) });

      // Mock window.location.search
      Object.defineProperty(window, 'location', {
        value: { search: '?code=test-code&state=test-state' },
        writable: true,
      });
      localStorage.setItem('box_oauth_state', 'test-state');

      const result = await boxAuth.handleOAuthCallback();

      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('action=token&code=test-code'));
      const storedToken = JSON.parse(localStorage.getItem('box_token'));
      expect(storedToken.access_token).toBe('new-token');
    });

    it('should return false if state does not match', async () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?code=test-code&state=wrong-state' },
        writable: true,
      });
      localStorage.setItem('box_oauth_state', 'correct-state');

      const result = await boxAuth.handleOAuthCallback();

      expect(result).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should return false if there is no code in the URL', async () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?state=test-state' },
        writable: true,
      });

      const result = await boxAuth.handleOAuthCallback();

      expect(result).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    });
  });
});
