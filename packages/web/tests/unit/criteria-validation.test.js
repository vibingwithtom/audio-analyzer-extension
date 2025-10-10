import { describe, it, expect, beforeEach } from 'vitest';
import { CriteriaValidator } from '@audio-analyzer/core';

/**
 * Comprehensive tests for Criteria Validation
 *
 * Tests the CriteriaValidator class from @audio-analyzer/core
 * Validates audio properties against target criteria:
 * - File Type
 * - Sample Rate
 * - Bit Depth
 * - Channels
 * - Duration (minimum)
 */

describe('CriteriaValidator', () => {
  describe('matchesFileType', () => {
    describe('Direct Matches', () => {
      it('should pass for exact match', () => {
        const result = CriteriaValidator.matchesFileType('WAV', 'WAV');
        expect(result.matches).toBe(true);
        expect(result.status).toBe('pass');
      });

      it('should pass for case-insensitive match', () => {
        const result = CriteriaValidator.matchesFileType('WAV', 'wav');
        expect(result.matches).toBe(true);
        expect(result.status).toBe('pass');
      });
    });

    describe('WAV Variations', () => {
      it('should pass for WAV (PCM) when target is WAV', () => {
        const result = CriteriaValidator.matchesFileType('WAV (PCM)', 'WAV');
        expect(result.matches).toBe(true);
        expect(result.status).toBe('pass');
      });

      it('should warn for WAV compressed when target is WAV', () => {
        const result = CriteriaValidator.matchesFileType('WAV (Compressed)', 'WAV');
        expect(result.matches).toBe(true);
        expect(result.status).toBe('warning');
      });

      it('should fail for MP3 when target is WAV', () => {
        const result = CriteriaValidator.matchesFileType('MP3', 'WAV');
        expect(result.matches).toBe(false);
        expect(result.status).toBe('fail');
      });
    });

    describe('Normalized Comparison', () => {
      it('should normalize file types with parentheses', () => {
        const result = CriteriaValidator.matchesFileType('MP3 (MPEG)', 'MP3');
        expect(result.matches).toBe(true);
        expect(result.status).toBe('pass');
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty strings', () => {
        const result = CriteriaValidator.matchesFileType('', 'WAV');
        expect(result.matches).toBe(false);
        expect(result.status).toBe('fail');
      });

      it('should throw on undefined values', () => {
        // Document actual behavior: function doesn't handle undefined gracefully
        // Calling code should provide valid string or empty string
        expect(() => CriteriaValidator.matchesFileType(undefined, 'WAV')).toThrow();
      });
    });
  });

  describe('validateResults', () => {
    const mockAudioResults = {
      fileType: 'WAV',
      sampleRate: 48000,
      bitDepth: 16,
      channels: 2,
      duration: 120,
      fileSize: 1024000
    };

    describe('File Type Validation', () => {
      it('should pass when file type matches exactly', () => {
        const criteria = { fileType: 'WAV' };
        const validation = CriteriaValidator.validateResults(mockAudioResults, criteria);

        expect(validation.fileType).toBeDefined();
        expect(validation.fileType.status).toBe('pass');
        expect(validation.fileType.matches).toBe(true);
      });

      it('should pass when file type matches one of multiple targets', () => {
        const criteria = { fileType: ['MP3', 'WAV', 'FLAC'] };
        const validation = CriteriaValidator.validateResults(mockAudioResults, criteria);

        expect(validation.fileType.status).toBe('pass');
      });

      it('should fail when file type does not match', () => {
        const criteria = { fileType: 'MP3' };
        const validation = CriteriaValidator.validateResults(mockAudioResults, criteria);

        expect(validation.fileType.status).toBe('fail');
        expect(validation.fileType.matches).toBe(false);
      });

      it('should prefer perfect match over partial match', () => {
        const results = { ...mockAudioResults, fileType: 'WAV (PCM)' };
        const criteria = { fileType: ['MP3', 'WAV'] };
        const validation = CriteriaValidator.validateResults(results, criteria);

        expect(validation.fileType.status).toBe('pass');
      });
    });

    describe('Sample Rate Validation', () => {
      it('should pass when sample rate matches', () => {
        const criteria = { sampleRate: 48000 };
        const validation = CriteriaValidator.validateResults(mockAudioResults, criteria);

        expect(validation.sampleRate).toBeDefined();
        expect(validation.sampleRate.status).toBe('pass');
        expect(validation.sampleRate.matches).toBe(true);
      });

      it('should pass when sample rate matches one of multiple targets', () => {
        const criteria = { sampleRate: [44100, 48000, 96000] };
        const validation = CriteriaValidator.validateResults(mockAudioResults, criteria);

        expect(validation.sampleRate.status).toBe('pass');
      });

      it('should fail when sample rate does not match', () => {
        const criteria = { sampleRate: 44100 };
        const validation = CriteriaValidator.validateResults(mockAudioResults, criteria);

        expect(validation.sampleRate.status).toBe('fail');
        expect(validation.sampleRate.matches).toBe(false);
      });

      it('should warn for unknown sample rate', () => {
        const results = { ...mockAudioResults, sampleRate: 'Unknown' };
        const criteria = { sampleRate: 48000 };
        const validation = CriteriaValidator.validateResults(results, criteria);

        expect(validation.sampleRate.status).toBe('warning');
        expect(validation.sampleRate.matches).toBe(false);
      });

      it('should skip validation in metadata-only mode', () => {
        const criteria = { sampleRate: 48000 };
        const validation = CriteriaValidator.validateResults(mockAudioResults, criteria, true);

        expect(validation.sampleRate).toBeUndefined();
      });
    });

    describe('Bit Depth Validation', () => {
      it('should pass when bit depth matches', () => {
        const criteria = { bitDepth: 16 };
        const validation = CriteriaValidator.validateResults(mockAudioResults, criteria);

        expect(validation.bitDepth).toBeDefined();
        expect(validation.bitDepth.status).toBe('pass');
      });

      it('should pass when bit depth matches one of multiple targets', () => {
        const criteria = { bitDepth: [16, 24, 32] };
        const validation = CriteriaValidator.validateResults(mockAudioResults, criteria);

        expect(validation.bitDepth.status).toBe('pass');
      });

      it('should fail when bit depth does not match', () => {
        const criteria = { bitDepth: 24 };
        const validation = CriteriaValidator.validateResults(mockAudioResults, criteria);

        expect(validation.bitDepth.status).toBe('fail');
      });

      it('should warn for unknown bit depth', () => {
        const results = { ...mockAudioResults, bitDepth: 'Unknown' };
        const criteria = { bitDepth: 16 };
        const validation = CriteriaValidator.validateResults(results, criteria);

        expect(validation.bitDepth.status).toBe('warning');
      });

      it('should skip validation in metadata-only mode', () => {
        const criteria = { bitDepth: 16 };
        const validation = CriteriaValidator.validateResults(mockAudioResults, criteria, true);

        expect(validation.bitDepth).toBeUndefined();
      });
    });

    describe('Channels Validation', () => {
      it('should pass when channels match', () => {
        const criteria = { channels: 2 };
        const validation = CriteriaValidator.validateResults(mockAudioResults, criteria);

        expect(validation.channels).toBeDefined();
        expect(validation.channels.status).toBe('pass');
      });

      it('should pass when channels match one of multiple targets', () => {
        const criteria = { channels: [1, 2] };
        const validation = CriteriaValidator.validateResults(mockAudioResults, criteria);

        expect(validation.channels.status).toBe('pass');
      });

      it('should fail when channels do not match', () => {
        const criteria = { channels: 1 };
        const validation = CriteriaValidator.validateResults(mockAudioResults, criteria);

        expect(validation.channels.status).toBe('fail');
      });

      it('should warn for unknown channels', () => {
        const results = { ...mockAudioResults, channels: 'Unknown' };
        const criteria = { channels: 2 };
        const validation = CriteriaValidator.validateResults(results, criteria);

        expect(validation.channels.status).toBe('warning');
      });

      it('should skip validation in metadata-only mode', () => {
        const criteria = { channels: 2 };
        const validation = CriteriaValidator.validateResults(mockAudioResults, criteria, true);

        expect(validation.channels).toBeUndefined();
      });
    });

    describe('Duration Validation', () => {
      it('should pass when duration meets minimum', () => {
        const criteria = { minDuration: 60 };
        const validation = CriteriaValidator.validateResults(mockAudioResults, criteria);

        expect(validation.duration).toBeDefined();
        expect(validation.duration.status).toBe('pass');
        expect(validation.duration.matches).toBe(true);
      });

      it('should warn when duration is below minimum', () => {
        const criteria = { minDuration: 180 };
        const validation = CriteriaValidator.validateResults(mockAudioResults, criteria);

        expect(validation.duration.status).toBe('warning');
        expect(validation.duration.matches).toBe(false);
      });

      it('should warn for unknown duration', () => {
        const results = { ...mockAudioResults, duration: 'Unknown' };
        const criteria = { minDuration: 60 };
        const validation = CriteriaValidator.validateResults(results, criteria);

        expect(validation.duration.status).toBe('warning');
      });

      it('should skip validation in metadata-only mode', () => {
        const criteria = { minDuration: 60 };
        const validation = CriteriaValidator.validateResults(mockAudioResults, criteria, true);

        expect(validation.duration).toBeUndefined();
      });

      it('should skip validation when minDuration not specified', () => {
        const criteria = { fileType: 'WAV' };
        const validation = CriteriaValidator.validateResults(mockAudioResults, criteria);

        expect(validation.duration).toBeUndefined();
      });
    });

    describe('Metadata-Only Mode', () => {
      it('should validate file type in metadata-only mode', () => {
        const criteria = { fileType: 'WAV' };
        const validation = CriteriaValidator.validateResults(mockAudioResults, criteria, true);

        expect(validation.fileType).toBeDefined();
      });

      it('should skip audio properties in metadata-only mode', () => {
        const criteria = {
          fileType: 'WAV',
          sampleRate: 48000,
          bitDepth: 16,
          channels: 2,
          minDuration: 60
        };
        const validation = CriteriaValidator.validateResults(mockAudioResults, criteria, true);

        expect(validation.fileType).toBeDefined();
        expect(validation.sampleRate).toBeUndefined();
        expect(validation.bitDepth).toBeUndefined();
        expect(validation.channels).toBeUndefined();
        expect(validation.duration).toBeUndefined();
      });
    });

    describe('Multiple Criteria', () => {
      it('should validate all specified criteria', () => {
        const criteria = {
          fileType: 'WAV',
          sampleRate: 48000,
          bitDepth: 16,
          channels: 2
        };
        const validation = CriteriaValidator.validateResults(mockAudioResults, criteria);

        expect(validation.fileType.status).toBe('pass');
        expect(validation.sampleRate.status).toBe('pass');
        expect(validation.bitDepth.status).toBe('pass');
        expect(validation.channels.status).toBe('pass');
      });

      it('should handle mixed pass/fail results', () => {
        const criteria = {
          fileType: 'WAV',      // pass
          sampleRate: 44100,     // fail
          bitDepth: 16,          // pass
          channels: 1            // fail
        };
        const validation = CriteriaValidator.validateResults(mockAudioResults, criteria);

        expect(validation.fileType.status).toBe('pass');
        expect(validation.sampleRate.status).toBe('fail');
        expect(validation.bitDepth.status).toBe('pass');
        expect(validation.channels.status).toBe('fail');
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty criteria', () => {
        const validation = CriteriaValidator.validateResults(mockAudioResults, {});
        expect(Object.keys(validation).length).toBe(0);
      });

      it('should handle null criteria values', () => {
        const criteria = {
          fileType: null,
          sampleRate: null
        };
        const validation = CriteriaValidator.validateResults(mockAudioResults, criteria);
        expect(validation.fileType).toBeUndefined();
        expect(validation.sampleRate).toBeUndefined();
      });

      it('should parse string numbers in criteria', () => {
        const criteria = {
          sampleRate: '48000',
          bitDepth: '16',
          channels: '2'
        };
        const validation = CriteriaValidator.validateResults(mockAudioResults, criteria);

        expect(validation.sampleRate.status).toBe('pass');
        expect(validation.bitDepth.status).toBe('pass');
        expect(validation.channels.status).toBe('pass');
      });
    });
  });

  describe('formatDuration', () => {
    it('should format seconds only', () => {
      expect(CriteriaValidator.formatDuration(45)).toBe('0m:45s');
    });

    it('should format minutes and seconds', () => {
      expect(CriteriaValidator.formatDuration(125)).toBe('2m:05s');
    });

    it('should format hours, minutes, and seconds', () => {
      expect(CriteriaValidator.formatDuration(7325)).toBe('2h:02m:05s');
    });

    it('should pad zeros', () => {
      expect(CriteriaValidator.formatDuration(3661)).toBe('1h:01m:01s');
    });

    it('should handle zero duration', () => {
      expect(CriteriaValidator.formatDuration(0)).toBe('0m:00s');
    });
  });

  describe('formatDisplayText', () => {
    it('should format all audio properties', () => {
      const results = {
        fileType: 'WAV',
        sampleRate: 48000,
        bitDepth: 16,
        channels: 2,
        duration: 120,
        fileSize: 2048000
      };

      const formatted = CriteriaValidator.formatDisplayText(results);

      expect(formatted.fileType).toBe('WAV');
      expect(formatted.sampleRate).toBe('48.0 kHz');
      expect(formatted.bitDepth).toBe('16-bit');
      expect(formatted.channels).toBe('2 (Stereo)');
      expect(formatted.duration).toBe('2m:00s');
      expect(formatted.fileSize).toBe('1.95 MB');
    });

    it('should handle mono audio', () => {
      const results = {
        fileType: 'WAV',
        sampleRate: 48000,
        bitDepth: 16,
        channels: 1,
        duration: 60,
        fileSize: 1024000
      };

      const formatted = CriteriaValidator.formatDisplayText(results);
      expect(formatted.channels).toBe('1 (Mono)');
    });

    it('should handle unknown values', () => {
      const results = {
        fileType: 'Unknown',
        sampleRate: 'Unknown',
        bitDepth: 'Unknown',
        channels: 'Unknown',
        duration: 'Unknown',
        fileSize: 0
      };

      const formatted = CriteriaValidator.formatDisplayText(results);

      expect(formatted.sampleRate).toBe('Unknown');
      expect(formatted.bitDepth).toBe('Unknown');
      expect(formatted.channels).toBe('Unknown');
      expect(formatted.duration).toBe('Unknown');
    });
  });
});
