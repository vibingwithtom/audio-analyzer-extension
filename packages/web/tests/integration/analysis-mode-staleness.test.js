import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Integration Tests for Analysis Mode Staleness Detection
 *
 * Tests the smart staleness detection logic that determines when results
 * need to be reprocessed based on the analysis mode and available data.
 *
 * Key behavior:
 * - Full Analysis contains both audio data and filename validation
 * - Audio Only contains only audio data
 * - Filename Only contains only filename validation
 * - Experimental contains audio data (no filename validation)
 *
 * Smart staleness checks actual data availability, not just mode changes.
 */

describe('Analysis Mode Staleness Detection', () => {
  /**
   * Helper function to simulate the staleness detection logic
   * from GoogleDriveTab.svelte and BoxTab.svelte
   */
  function checkStaleness(results, resultsMode, currentMode) {
    if (!results || resultsMode === null) {
      return false;
    }

    if (currentMode === resultsMode) {
      return false;
    }

    // Check if we actually need to reprocess based on available data
    const hasAudioData = results.sampleRate && results.sampleRate > 0;
    const hasFilenameValidation = results.validation?.filename !== undefined;

    let needsReprocessing = false;

    if (currentMode === 'audio-only' && !hasAudioData) {
      needsReprocessing = true; // Need audio but don't have it
    } else if (currentMode === 'filename-only' && !hasFilenameValidation) {
      needsReprocessing = true; // Need filename validation but don't have it
    } else if (currentMode === 'full' && (!hasAudioData || !hasFilenameValidation)) {
      needsReprocessing = true; // Need both but missing one or both
    } else if (currentMode === 'experimental' && !hasAudioData) {
      needsReprocessing = true; // Experimental needs audio data
    }

    return needsReprocessing;
  }

  describe('Full Analysis → Other Modes', () => {
    let fullAnalysisResults;

    beforeEach(() => {
      // Results from Full Analysis mode (has both audio data and filename validation)
      fullAnalysisResults = {
        filename: 'test-file.wav',
        sampleRate: 48000,
        bitDepth: 24,
        channels: 2,
        duration: 120,
        validation: {
          sampleRate: { status: 'pass', value: '48.0 kHz' },
          bitDepth: { status: 'pass', value: '24-bit' },
          filename: { status: 'pass', value: 'test-file.wav' }
        }
      };
    });

    it('should NOT be stale when switching to Audio Only (has audio data)', () => {
      const isStale = checkStaleness(fullAnalysisResults, 'full', 'audio-only');
      expect(isStale).toBe(false);
    });

    it('should NOT be stale when switching to Filename Only (has filename validation)', () => {
      const isStale = checkStaleness(fullAnalysisResults, 'full', 'filename-only');
      expect(isStale).toBe(false);
    });

    it('should NOT be stale when switching to Experimental (has audio data)', () => {
      const isStale = checkStaleness(fullAnalysisResults, 'full', 'experimental');
      expect(isStale).toBe(false);
    });
  });

  describe('Audio Only → Other Modes', () => {
    let audioOnlyResults;

    beforeEach(() => {
      // Results from Audio Only mode (has audio data, NO filename validation)
      audioOnlyResults = {
        filename: 'test-file.wav',
        sampleRate: 48000,
        bitDepth: 24,
        channels: 2,
        duration: 120,
        validation: {
          sampleRate: { status: 'pass', value: '48.0 kHz' },
          bitDepth: { status: 'pass', value: '24-bit' }
          // No filename validation
        }
      };
    });

    it('should be stale when switching to Filename Only (missing filename validation)', () => {
      const isStale = checkStaleness(audioOnlyResults, 'audio-only', 'filename-only');
      expect(isStale).toBe(true);
    });

    it('should be stale when switching to Full Analysis (missing filename validation)', () => {
      const isStale = checkStaleness(audioOnlyResults, 'audio-only', 'full');
      expect(isStale).toBe(true);
    });

    it('should NOT be stale when switching to Experimental (both have audio data)', () => {
      const isStale = checkStaleness(audioOnlyResults, 'audio-only', 'experimental');
      expect(isStale).toBe(false);
    });
  });

  describe('Filename Only → Other Modes', () => {
    let filenameOnlyResults;

    beforeEach(() => {
      // Results from Filename Only mode (has filename validation, NO audio data)
      filenameOnlyResults = {
        filename: 'test-file.wav',
        sampleRate: 0, // No audio analysis
        bitDepth: 0,
        channels: 0,
        duration: 0,
        validation: {
          filename: { status: 'pass', value: 'test-file.wav' }
        }
      };
    });

    it('should be stale when switching to Audio Only (missing audio data)', () => {
      const isStale = checkStaleness(filenameOnlyResults, 'filename-only', 'audio-only');
      expect(isStale).toBe(true);
    });

    it('should be stale when switching to Full Analysis (missing audio data)', () => {
      const isStale = checkStaleness(filenameOnlyResults, 'filename-only', 'full');
      expect(isStale).toBe(true);
    });

    it('should be stale when switching to Experimental (missing audio data)', () => {
      const isStale = checkStaleness(filenameOnlyResults, 'filename-only', 'experimental');
      expect(isStale).toBe(true);
    });
  });

  describe('Experimental → Other Modes', () => {
    let experimentalResults;

    beforeEach(() => {
      // Results from Experimental mode (has audio data + advanced metrics, NO filename validation)
      experimentalResults = {
        filename: 'test-file.wav',
        sampleRate: 48000,
        bitDepth: 24,
        channels: 2,
        duration: 120,
        peakDb: -3.5,
        noiseFloorDb: -65.2,
        validation: {
          sampleRate: { status: 'pass', value: '48.0 kHz' },
          bitDepth: { status: 'pass', value: '24-bit' }
          // No filename validation
        }
      };
    });

    it('should NOT be stale when switching to Audio Only (both have audio data)', () => {
      const isStale = checkStaleness(experimentalResults, 'experimental', 'audio-only');
      expect(isStale).toBe(false);
    });

    it('should be stale when switching to Filename Only (missing filename validation)', () => {
      const isStale = checkStaleness(experimentalResults, 'experimental', 'filename-only');
      expect(isStale).toBe(true);
    });

    it('should be stale when switching to Full Analysis (missing filename validation)', () => {
      const isStale = checkStaleness(experimentalResults, 'experimental', 'full');
      expect(isStale).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should NOT be stale when mode matches resultsMode', () => {
      const results = {
        filename: 'test.wav',
        sampleRate: 48000,
        validation: {}
      };

      expect(checkStaleness(results, 'audio-only', 'audio-only')).toBe(false);
      expect(checkStaleness(results, 'full', 'full')).toBe(false);
      expect(checkStaleness(results, 'filename-only', 'filename-only')).toBe(false);
      expect(checkStaleness(results, 'experimental', 'experimental')).toBe(false);
    });

    it('should NOT be stale when results is null', () => {
      const isStale = checkStaleness(null, 'audio-only', 'full');
      expect(isStale).toBe(false);
    });

    it('should NOT be stale when resultsMode is null', () => {
      const results = { filename: 'test.wav', sampleRate: 48000 };
      const isStale = checkStaleness(results, null, 'full');
      expect(isStale).toBe(false);
    });

    it('should handle missing validation object gracefully', () => {
      const results = {
        filename: 'test.wav',
        sampleRate: 48000
        // No validation object
      };

      // Should be stale when switching to filename-only (no validation.filename)
      expect(checkStaleness(results, 'audio-only', 'filename-only')).toBe(true);
    });

    it('should handle zero sampleRate as missing audio data', () => {
      const results = {
        filename: 'test.wav',
        sampleRate: 0, // Invalid/missing audio data
        validation: {
          filename: { status: 'pass', value: 'test.wav' }
        }
      };

      // Should be stale when switching to audio-only (no audio data)
      expect(checkStaleness(results, 'filename-only', 'audio-only')).toBe(true);
    });
  });

  describe('Data Availability Checks', () => {
    it('should correctly identify audio data presence', () => {
      const withAudio = { sampleRate: 48000 };
      const withoutAudio = { sampleRate: 0 };
      const noSampleRate = {};

      const hasAudio1 = !!(withAudio.sampleRate && withAudio.sampleRate > 0);
      const hasAudio2 = !!(withoutAudio.sampleRate && withoutAudio.sampleRate > 0);
      const hasAudio3 = !!(noSampleRate.sampleRate && noSampleRate.sampleRate > 0);

      expect(hasAudio1).toBe(true);
      expect(hasAudio2).toBe(false);
      expect(hasAudio3).toBe(false);
    });

    it('should correctly identify filename validation presence', () => {
      const withValidation = {
        validation: {
          filename: { status: 'pass', value: 'test.wav' }
        }
      };
      const withoutValidation = {
        validation: {}
      };
      const noValidation = {};

      const hasFilename1 = withValidation.validation?.filename !== undefined;
      const hasFilename2 = withoutValidation.validation?.filename !== undefined;
      const hasFilename3 = noValidation.validation?.filename !== undefined;

      expect(hasFilename1).toBe(true);
      expect(hasFilename2).toBe(false);
      expect(hasFilename3).toBe(false);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle Bilingual preset workflow correctly', () => {
      // User analyzes with Full Analysis
      const fullResults = {
        filename: 'CONV123-EN-user-001-agent-002.wav',
        sampleRate: 48000,
        bitDepth: 24,
        channels: 2,
        duration: 180,
        validation: {
          sampleRate: { status: 'pass', value: '48.0 kHz' },
          bitDepth: { status: 'pass', value: '24-bit' },
          filename: { status: 'pass', value: 'CONV123-EN-user-001-agent-002.wav' }
        }
      };

      // User wants to just see audio properties (switch to Audio Only)
      expect(checkStaleness(fullResults, 'full', 'audio-only')).toBe(false);

      // User wants to check filename only (switch to Filename Only)
      expect(checkStaleness(fullResults, 'full', 'filename-only')).toBe(false);
    });

    it('should handle quick filename validation then full analysis', () => {
      // User does quick filename check first
      const filenameResults = {
        filename: 'CONV123-EN-user-001-agent-002.wav',
        sampleRate: 0,
        validation: {
          filename: { status: 'pass', value: 'CONV123-EN-user-001-agent-002.wav' }
        }
      };

      // User wants full analysis (needs reprocessing for audio data)
      expect(checkStaleness(filenameResults, 'filename-only', 'full')).toBe(true);
    });

    it('should handle experimental analysis workflow', () => {
      // User runs experimental analysis
      const experimentalResults = {
        filename: 'test.wav',
        sampleRate: 48000,
        bitDepth: 24,
        peakDb: -3.5,
        noiseFloorDb: -65.2,
        validation: {
          sampleRate: { status: 'pass', value: '48.0 kHz' },
          bitDepth: { status: 'pass', value: '24-bit' }
        }
      };

      // User wants to see basic audio properties (switch to Audio Only)
      // Should NOT need reprocessing - both have audio data
      expect(checkStaleness(experimentalResults, 'experimental', 'audio-only')).toBe(false);
    });
  });
});
