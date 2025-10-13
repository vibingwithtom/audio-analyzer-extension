import { describe, it, expect, vi } from 'vitest';
import { BoxAPI } from '../../src/services/box-api';

describe('BoxAPI', () => {
  // Mock AuthService dependency
  const mockAuthService = {
    getBoxAuthInstance: () => ({
      getValidToken: vi.fn(() => Promise.resolve({ access_token: 'mock-token' })),
    }),
  };

  const boxApi = new BoxAPI(mockAuthService);

  describe('parseFolderUrl', () => {
    it('should correctly parse a standard folder URL', () => {
      const url = 'https://app.box.com/folder/1234567890';
      expect(boxApi.parseFolderUrl(url)).toBe('1234567890');
    });

    it('should throw an error for an invalid URL', () => {
      const url = 'https://app.box.com/file/1234567890';
      expect(() => boxApi.parseFolderUrl(url)).toThrow('Invalid or unsupported Box folder URL');
    });

    it('should throw an error for a non-Box URL', () => {
      const url = 'https://www.google.com';
      expect(() => boxApi.parseFolderUrl(url)).toThrow('Invalid or unsupported Box folder URL');
    });
  });

  describe('isAudioFile', () => {
    it('should return true for common audio file extensions', () => {
      expect(boxApi.isAudioFile('track1.wav')).toBe(true);
      expect(boxApi.isAudioFile('song.mp3')).toBe(true);
      expect(boxApi.isAudioFile('recording.flac')).toBe(true);
      expect(boxApi.isAudioFile('voice.m4a')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(boxApi.isAudioFile('track1.WAV')).toBe(true);
      expect(boxApi.isAudioFile('SONG.MP3')).toBe(true);
    });

    it('should return false for non-audio file extensions', () => {
      expect(boxApi.isAudioFile('document.txt')).toBe(false);
      expect(boxApi.isAudioFile('archive.zip')).toBe(false);
      expect(boxApi.isAudioFile('image.jpg')).toBe(false);
    });

    it('should return false for filenames without extensions', () => {
      expect(boxApi.isAudioFile('myfile')).toBe(false);
    });
  });
});