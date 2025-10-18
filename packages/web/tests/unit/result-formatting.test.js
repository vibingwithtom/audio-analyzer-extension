import { describe, it, expect } from 'vitest';
import { CriteriaValidator } from '@audio-analyzer/core';

/**
 * Comprehensive tests for Result Formatting
 *
 * Tests formatting functions from CriteriaValidator:
 * - formatDuration: Converts seconds to human-readable format
 * - formatDisplayText: Formats all audio properties for display
 * - formatAdvancedResults: Formats advanced analysis results
 */

describe('Result Formatting', () => {
  describe('formatDuration', () => {
    it('should format 0 seconds', () => {
      const formatted = CriteriaValidator.formatDuration(0);
      expect(formatted).toBe('0s');
    });

    it('should format seconds only', () => {
      const formatted = CriteriaValidator.formatDuration(45);
      expect(formatted).toBe('45s');
    });

    it('should format minutes and seconds', () => {
      const formatted = CriteriaValidator.formatDuration(125);
      expect(formatted).toBe('2m 05s');
    });

    it('should pad single-digit seconds', () => {
      const formatted = CriteriaValidator.formatDuration(65);
      expect(formatted).toBe('1m 05s');
    });

    it('should handle fractional seconds (floor)', () => {
      const formatted = CriteriaValidator.formatDuration(45.7);
      expect(formatted).toBe('45s');
    });

    it('should handle very long durations with hours', () => {
      const formatted = CriteriaValidator.formatDuration(3661); // 1h 01m 01s
      expect(formatted).toBe('1h 01m 01s');
    });
  });

  describe('formatDisplayText', () => {
    describe('Sample Rate Formatting', () => {
      it('should format 48000 Hz as "48.0 kHz"', () => {
        const results = { sampleRate: 48000, fileSize: 0 };
        const formatted = CriteriaValidator.formatDisplayText(results);
        expect(formatted.sampleRate).toBe('48.0 kHz');
      });

      it('should format 44100 Hz as "44.1 kHz"', () => {
        const results = { sampleRate: 44100, fileSize: 0 };
        const formatted = CriteriaValidator.formatDisplayText(results);
        expect(formatted.sampleRate).toBe('44.1 kHz');
      });

      it('should format 96000 Hz as "96.0 kHz"', () => {
        const results = { sampleRate: 96000, fileSize: 0 };
        const formatted = CriteriaValidator.formatDisplayText(results);
        expect(formatted.sampleRate).toBe('96.0 kHz');
      });

      it('should format 22050 Hz', () => {
        const results = { sampleRate: 22050, fileSize: 0 };
        const formatted = CriteriaValidator.formatDisplayText(results);
        expect(formatted.sampleRate).toMatch(/22\.\d+ kHz/);
      });

      it('should handle unknown sample rate', () => {
        const results = { sampleRate: 'Unknown', fileSize: 0 };
        const formatted = CriteriaValidator.formatDisplayText(results);
        expect(formatted.sampleRate).toBe('Unknown');
      });
    });

    describe('Bit Depth Formatting', () => {
      it('should format 8-bit', () => {
        const results = { bitDepth: 8, fileSize: 0 };
        const formatted = CriteriaValidator.formatDisplayText(results);
        expect(formatted.bitDepth).toBe('8-bit');
      });

      it('should format 16-bit', () => {
        const results = { bitDepth: 16, fileSize: 0 };
        const formatted = CriteriaValidator.formatDisplayText(results);
        expect(formatted.bitDepth).toBe('16-bit');
      });

      it('should format 24-bit', () => {
        const results = { bitDepth: 24, fileSize: 0 };
        const formatted = CriteriaValidator.formatDisplayText(results);
        expect(formatted.bitDepth).toBe('24-bit');
      });

      it('should format 32-bit', () => {
        const results = { bitDepth: 32, fileSize: 0 };
        const formatted = CriteriaValidator.formatDisplayText(results);
        expect(formatted.bitDepth).toBe('32-bit');
      });

      it('should handle unknown bit depth', () => {
        const results = { bitDepth: 'Unknown', fileSize: 0 };
        const formatted = CriteriaValidator.formatDisplayText(results);
        expect(formatted.bitDepth).toBe('Unknown');
      });
    });

    describe('Channels Formatting', () => {
      it('should format mono audio', () => {
        const results = { channels: 1, fileSize: 0 };
        const formatted = CriteriaValidator.formatDisplayText(results);
        expect(formatted.channels).toBe('1 (Mono)');
      });

      it('should format stereo audio', () => {
        const results = { channels: 2, fileSize: 0 };
        const formatted = CriteriaValidator.formatDisplayText(results);
        expect(formatted.channels).toBe('2 (Stereo)');
      });

      it('should format multi-channel audio', () => {
        const results = { channels: 6, fileSize: 0 };
        const formatted = CriteriaValidator.formatDisplayText(results);
        expect(formatted.channels).toBe('6');
      });

      it('should handle unknown channels', () => {
        const results = { channels: 'Unknown', fileSize: 0 };
        const formatted = CriteriaValidator.formatDisplayText(results);
        expect(formatted.channels).toBe('Unknown');
      });
    });

    describe('File Size Formatting', () => {
      it('should format file size in MB', () => {
        const results = { fileSize: 2048000, sampleRate: 48000 };
        const formatted = CriteriaValidator.formatDisplayText(results);
        expect(formatted.fileSize).toBe('1.95 MB');
      });

      it('should handle small files', () => {
        const results = { fileSize: 10240, sampleRate: 48000 };
        const formatted = CriteriaValidator.formatDisplayText(results);
        expect(formatted.fileSize).toBe('0.01 MB');
      });

      it('should handle large files', () => {
        const results = { fileSize: 104857600, sampleRate: 48000 }; // 100 MB
        const formatted = CriteriaValidator.formatDisplayText(results);
        expect(formatted.fileSize).toBe('100.00 MB');
      });

      it('should handle zero file size', () => {
        const results = { fileSize: 0, sampleRate: 48000 };
        const formatted = CriteriaValidator.formatDisplayText(results);
        expect(formatted.fileSize).toBe('0.00 MB');
      });
    });

    describe('File Type Formatting', () => {
      it('should preserve WAV file type', () => {
        const results = { fileType: 'WAV', fileSize: 0 };
        const formatted = CriteriaValidator.formatDisplayText(results);
        expect(formatted.fileType).toBe('WAV');
      });

      it('should preserve MP3 file type', () => {
        const results = { fileType: 'MP3', fileSize: 0 };
        const formatted = CriteriaValidator.formatDisplayText(results);
        expect(formatted.fileType).toBe('MP3');
      });

      it('should preserve complex file types', () => {
        const results = { fileType: 'WAV (PCM)', fileSize: 0 };
        const formatted = CriteriaValidator.formatDisplayText(results);
        expect(formatted.fileType).toBe('WAV (PCM)');
      });

      it('should handle unknown file type', () => {
        const results = { fileType: 'Unknown', fileSize: 0 };
        const formatted = CriteriaValidator.formatDisplayText(results);
        expect(formatted.fileType).toBe('Unknown');
      });
    });

    describe('Duration Formatting', () => {
      it('should format duration using formatDuration', () => {
        const results = { duration: 125, fileSize: 0 };
        const formatted = CriteriaValidator.formatDisplayText(results);
        expect(formatted.duration).toBe('2m 05s');
      });

      it('should handle unknown duration', () => {
        const results = { duration: 'Unknown', fileSize: 0 };
        const formatted = CriteriaValidator.formatDisplayText(results);
        expect(formatted.duration).toBe('Unknown');
      });
    });

    describe('Complete Formatting', () => {
      it('should format all properties together', () => {
        const results = {
          fileType: 'WAV',
          sampleRate: 48000,
          bitDepth: 16,
          channels: 2,
          duration: 120,
          fileSize: 2048000
        };
        const formatted = CriteriaValidator.formatDisplayText(results);

        expect(formatted).toHaveProperty('fileType', 'WAV');
        expect(formatted).toHaveProperty('sampleRate', '48.0 kHz');
        expect(formatted).toHaveProperty('bitDepth', '16-bit');
        expect(formatted).toHaveProperty('channels', '2 (Stereo)');
        expect(formatted).toHaveProperty('duration', '2m 00s');
        expect(formatted).toHaveProperty('fileSize', '1.95 MB');
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing properties gracefully', () => {
      const results = {};
      expect(() => CriteriaValidator.formatDisplayText(results)).not.toThrow();
    });

    it('should handle null values', () => {
      const results = {
        sampleRate: null,
        bitDepth: null,
        channels: null
      };
      expect(() => CriteriaValidator.formatDisplayText(results)).not.toThrow();
      const formatted = CriteriaValidator.formatDisplayText(results);
      expect(formatted.sampleRate).toBeDefined();
    });

    it('should handle undefined values', () => {
      const results = {
        sampleRate: undefined,
        bitDepth: undefined
      };
      expect(() => CriteriaValidator.formatDisplayText(results)).not.toThrow();
    });
  });

  describe('Function Reference Context (Batch Processing Bug Regression)', () => {
    it('should work when called as detached function reference', () => {
      // This tests the bug that occurred in batch processing where we pass
      // CriteriaValidator.formatDisplayText as a function parameter.
      // The static method must use CriteriaValidator.formatDuration()
      // instead of this.formatDuration() to work correctly.

      const formatFn = CriteriaValidator.formatDisplayText;
      const results = {
        fileType: 'WAV',
        sampleRate: 48000,
        bitDepth: 16,
        channels: 2,
        duration: 120,
        fileSize: 2048000
      };

      // This should not throw "Cannot read properties of undefined (reading 'formatDuration')"
      expect(() => formatFn(results)).not.toThrow();

      const formatted = formatFn(results);
      expect(formatted.duration).toBe('2m 00s');
      expect(formatted.sampleRate).toBe('48.0 kHz');
    });

    it('should format duration correctly when method is passed to another function', () => {
      // Simulates how renderResultRow() receives formatDisplayText as a parameter
      function renderWithFormatter(results, formatterFn) {
        return formatterFn(results);
      }

      const results = {
        duration: 3661, // 1h 01m 01s
        fileSize: 1024000
      };

      const formatted = renderWithFormatter(results, CriteriaValidator.formatDisplayText);
      expect(formatted.duration).toBe('1h 01m 01s');
    });
  });
});
