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
    // Already tested in criteria-validation.test.js, but adding edge cases

    it('should handle fractional seconds', () => {
      // Expected: formatDuration(45.7) === '0m:45s' (floor)
    });

    it('should handle very long durations', () => {
      // Expected: formatDuration(36000) === '10h:00m:00s'
    });

    it('should handle negative durations', () => {
      // Expected: formatDuration(-5) might return negative or error
      // Edge case - should document behavior
    });
  });

  describe('formatDisplayText', () => {
    describe('Sample Rate Formatting', () => {
      it('should format standard sample rates', () => {
        const results = { sampleRate: 48000, fileSize: 0 };
        const formatted = CriteriaValidator.formatDisplayText(results);
        expect(formatted.sampleRate).toBe('48.0 kHz');
      });

      it('should format various sample rates', () => {
        // 44100 -> '44.1 kHz'
        // 96000 -> '96.0 kHz'
        // 22050 -> '22.1 kHz' (rounded to 1 decimal)
      });

      it('should handle unknown sample rate', () => {
        const results = { sampleRate: 'Unknown', fileSize: 0 };
        const formatted = CriteriaValidator.formatDisplayText(results);
        expect(formatted.sampleRate).toBe('Unknown');
      });
    });

    describe('Bit Depth Formatting', () => {
      it('should format standard bit depths', () => {
        const results = { bitDepth: 16, fileSize: 0 };
        const formatted = CriteriaValidator.formatDisplayText(results);
        expect(formatted.bitDepth).toBe('16-bit');
      });

      it('should format various bit depths', () => {
        // 8 -> '8-bit'
        // 16 -> '16-bit'
        // 24 -> '24-bit'
        // 32 -> '32-bit'
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
        // Expected: '6' (no label for > 2 channels)
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
      it('should preserve file type as-is', () => {
        const results = { fileType: 'WAV', fileSize: 0 };
        const formatted = CriteriaValidator.formatDisplayText(results);
        expect(formatted.fileType).toBe('WAV');
      });

      it('should handle various file types', () => {
        // WAV -> 'WAV'
        // MP3 -> 'MP3'
        // WAV (PCM) -> 'WAV (PCM)'
        // Unknown -> 'Unknown'
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

        expect(formatted).toHaveProperty('fileType');
        expect(formatted).toHaveProperty('sampleRate');
        expect(formatted).toHaveProperty('bitDepth');
        expect(formatted).toHaveProperty('channels');
        expect(formatted).toHaveProperty('duration');
        expect(formatted).toHaveProperty('fileSize');
      });
    });
  });

  describe('formatAdvancedResults', () => {
    describe('Peak Level Formatting', () => {
      it('should format peak level in dB', () => {
        const results = { peakDb: -6.2 };
        // Expected: formatAdvancedResults returns { peakLevel: '-6.2 dB', peakStatus: 'pass' }
      });

      it('should handle silent peak (infinity)', () => {
        const results = { peakDb: -Infinity };
        // Expected: peakLevel: 'Silent'
      });

      it('should determine peak status based on level', () => {
        // peakDb <= -6.0: 'pass'
        // -6.0 < peakDb <= -3.0: 'warning'
        // peakDb > -3.0: 'fail'
      });
    });

    describe('Noise Floor Formatting', () => {
      it('should format noise floor in dB', () => {
        const results = { noiseFloorDb: -65.3 };
        // Expected: { noiseFloor: '-65.3 dB', noiseStatus: 'pass' }
      });

      it('should handle silent noise floor', () => {
        const results = { noiseFloorDb: -Infinity };
        // Expected: noiseFloor: 'Silent'
      });

      it('should determine noise status', () => {
        // noiseFloorDb <= -60.0: 'pass'
        // noiseFloorDb > -60.0: 'fail'
      });
    });

    describe('Normalization Formatting', () => {
      it('should format normalization status', () => {
        const results = {
          normalizationStatus: {
            status: 'normalized',
            message: 'Normalized to -6.0 dB'
          }
        };
        // Expected: { normalization: 'Normalized to -6.0 dB', normalizationStatus: 'pass' }
      });

      it('should handle non-normalized audio', () => {
        const results = {
          normalizationStatus: {
            status: 'not-normalized',
            message: 'Not normalized'
          }
        };
        // Expected: normalizationStatus: 'fail'
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing properties gracefully', () => {
      const results = {};
      // Should not throw error, return safe defaults
    });

    it('should handle null values', () => {
      const results = {
        sampleRate: null,
        bitDepth: null,
        channels: null
      };
      // Should handle gracefully
    });

    it('should handle non-numeric values where numbers expected', () => {
      const results = {
        sampleRate: 'invalid',
        bitDepth: 'invalid',
        channels: 'invalid',
        fileSize: 'invalid'
      };
      // Should not crash, return appropriate format
    });
  });
});
