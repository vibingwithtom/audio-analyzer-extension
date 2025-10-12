import { describe, it, expect, beforeEach, vi } from 'vitest';
import GoogleAuth from '../../src/google-auth.js';

// Mock the global gapi object
global.gapi = {
  load: vi.fn((_, callback) => callback()),
  auth2: {
    init: vi.fn().mockResolvedValue(),
    getAuthInstance: vi.fn(() => ({
      isSignedIn: {
        get: vi.fn().mockReturnValue(false), // Default to not signed in
      },
      currentUser: {
        get: vi.fn(() => ({
          getBasicProfile: vi.fn(() => ({
            getEmail: () => 'test@example.com',
            getName: () => 'Test User',
            getImageUrl: () => 'https://example.com/pic.jpg',
          })),
        })),
      },
      signIn: vi.fn().mockResolvedValue(),
      signOut: vi.fn().mockResolvedValue(),
    })),
  },
};

describe('GoogleAuth', () => {
  let googleAuth;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    googleAuth = new GoogleAuth();
  });

  it('should initialize the gapi client', async () => {
    await googleAuth.init();
    expect(gapi.load).toHaveBeenCalledWith('client:auth2', expect.any(Function));
    expect(gapi.auth2.init).toHaveBeenCalledWith({
      client_id: expect.any(String),
      scope: 'https://www.googleapis.com/auth/drive.readonly',
    });
  });

  it('isSignedIn should return false when not signed in', async () => {
    await googleAuth.init();
    const authInstance = gapi.auth2.getAuthInstance();
    authInstance.isSignedIn.get.mockReturnValue(false);

    const signedIn = googleAuth.isSignedIn();
    expect(signedIn).toBe(false);
  });

  it('isSignedIn should return true when signed in', async () => {
    await googleAuth.init();
    const authInstance = gapi.auth2.getAuthInstance();
    authInstance.isSignedIn.get.mockReturnValue(true);

    const signedIn = googleAuth.isSignedIn();
    expect(signedIn).toBe(true);
  });

  it('getUserInfo should return formatted user data when signed in', async () => {
    await googleAuth.init();
    const authInstance = gapi.auth2.getAuthInstance();
    authInstance.isSignedIn.get.mockReturnValue(true);

    const userInfo = await googleAuth.getUserInfo();

    expect(userInfo).toEqual({
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/pic.jpg',
    });
  });

  it('getUserInfo should return null when not signed in', async () => {
    await googleAuth.init();
    const authInstance = gapi.auth2.getAuthInstance();
    authInstance.isSignedIn.get.mockReturnValue(false);

    const userInfo = await googleAuth.getUserInfo();

    expect(userInfo).toBeNull();
  });

  it('signIn should call the gapi signIn method', async () => {
    await googleAuth.init();
    const authInstance = gapi.auth2.getAuthInstance();

    await googleAuth.signIn();

    expect(authInstance.signIn).toHaveBeenCalledOnce();
  });

  it('signOut should call the gapi signOut method', async () => {
    await googleAuth.init();
    const authInstance = gapi.auth2.getAuthInstance();

    await googleAuth.signOut();

    expect(authInstance.signOut).toHaveBeenCalledOnce();
  });
});
