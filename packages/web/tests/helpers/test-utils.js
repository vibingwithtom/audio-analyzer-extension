/**
 * Test utilities and helper functions
 */

import { vi } from 'vitest';

/**
 * Mock Google Auth service
 */
export function mockGoogleAuth() {
  return {
    isSignedIn: vi.fn(() => true),
    getFileMetadata: vi.fn(() => Promise.resolve({
      name: 'test.wav',
      size: '1024000'
    })),
    downloadFile: vi.fn(() => Promise.resolve(new Blob()))
  };
}

/**
 * Mock Box Auth service
 */
export function mockBoxAuth() {
  return {
    isAuthenticated: vi.fn(() => true),
    getFileMetadata: vi.fn(() => Promise.resolve({
      name: 'test.wav',
      size: 1024000
    })),
    downloadFile: vi.fn(() => Promise.resolve(new Blob()))
  };
}

/**
 * Mock AudioContext
 */
export function mockAudioContext() {
  return {
    decodeAudioData: vi.fn(() => Promise.resolve({
      sampleRate: 48000,
      duration: 120,
      numberOfChannels: 2
    }))
  };
}
