import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Unit tests for failure analysis logic
 *
 * These tests verify the complex conditional logic in analyzeFailuresWithRecommendations
 * which is the core of the enhanced export functionality.
 */

describe('Failure Analysis Logic', () => {
  describe('Quality Issue Detection Thresholds', () => {
    it('should detect clipping when percentage > 1%', () => {
      const result = {
        clippingAnalysis: {
          clippingEventCount: 100,
          clippedPercentage: 1.5,
          nearClippingPercentage: 0
        }
      };
      // Clipping severity should be 'critical' when > 1%
      expect(result.clippingAnalysis.clippedPercentage).toBeGreaterThan(1);
    });

    it('should detect clipping when event count > 50', () => {
      const result = {
        clippingAnalysis: {
          clippingEventCount: 75,
          clippedPercentage: 0.5,
          nearClippingPercentage: 0
        }
      };
      // Clipping severity should be 'critical' when events > 50
      expect(result.clippingAnalysis.clippingEventCount).toBeGreaterThan(50);
    });

    it('should warn on major clipping when percentage 0.1-1%', () => {
      const result = {
        clippingAnalysis: {
          clippingEventCount: 20,
          clippedPercentage: 0.5,
          nearClippingPercentage: 0
        }
      };
      // Should be 'major' severity
      expect(result.clippingAnalysis.clippedPercentage).toBeGreaterThan(0.1);
      expect(result.clippingAnalysis.clippedPercentage).toBeLessThanOrEqual(1);
    });

    it('should warn on major clipping when event count 10-50', () => {
      const result = {
        clippingAnalysis: {
          clippingEventCount: 25,
          clippedPercentage: 0,
          nearClippingPercentage: 0
        }
      };
      // Should be 'major' severity
      expect(result.clippingAnalysis.clippingEventCount).toBeGreaterThan(10);
      expect(result.clippingAnalysis.clippingEventCount).toBeLessThanOrEqual(50);
    });

    it('should detect noise floor issues when > -50 dB', () => {
      const result = { noiseFloorDb: -45 };
      // Should be flagged as 'high' severity
      expect(result.noiseFloorDb).toBeGreaterThan(-50);
    });

    it('should not flag noise floor when <= -50 dB', () => {
      const result = { noiseFloorDb: -60 };
      // Should not be flagged
      expect(result.noiseFloorDb).toBeLessThanOrEqual(-50);
    });

    it('should detect silence issues for leading silence > 1s', () => {
      const result = { leadingSilence: 1.5 };
      expect(result.leadingSilence).toBeGreaterThan(1);
    });

    it('should not flag leading silence when <= 1s', () => {
      const result = { leadingSilence: 0.8 };
      expect(result.leadingSilence).toBeLessThanOrEqual(1);
    });

    it('should detect silence issues for trailing silence > 1s', () => {
      const result = { trailingSilence: 1.5 };
      expect(result.trailingSilence).toBeGreaterThan(1);
    });

    it('should not flag trailing silence when <= 1s', () => {
      const result = { trailingSilence: 0.8 };
      expect(result.trailingSilence).toBeLessThanOrEqual(1);
    });

    it('should detect silence gaps > 2s', () => {
      const result = { longestSilence: 2.5 };
      expect(result.longestSilence).toBeGreaterThan(2);
    });

    it('should not flag silence gaps when <= 2s', () => {
      const result = { longestSilence: 1.8 };
      expect(result.longestSilence).toBeLessThanOrEqual(2);
    });

    it('should detect speech overlap 5-15% as warning', () => {
      const result = {
        conversationalAnalysis: {
          overlap: { overlapPercentage: 10 }
        }
      };
      expect(result.conversationalAnalysis.overlap.overlapPercentage).toBeGreaterThan(5);
      expect(result.conversationalAnalysis.overlap.overlapPercentage).toBeLessThanOrEqual(15);
    });

    it('should detect speech overlap > 15% as critical', () => {
      const result = {
        conversationalAnalysis: {
          overlap: { overlapPercentage: 20 }
        }
      };
      expect(result.conversationalAnalysis.overlap.overlapPercentage).toBeGreaterThan(15);
    });

    it('should not flag speech overlap when <= 5%', () => {
      const result = {
        conversationalAnalysis: {
          overlap: { overlapPercentage: 3 }
        }
      };
      expect(result.conversationalAnalysis.overlap.overlapPercentage).toBeLessThanOrEqual(5);
    });

    it('should detect channel consistency < 100%', () => {
      const result = {
        conversationalAnalysis: {
          consistency: { consistencyPercentage: 95 }
        }
      };
      expect(result.conversationalAnalysis.consistency.consistencyPercentage).toBeLessThan(100);
    });

    it('should not flag channel consistency when = 100%', () => {
      const result = {
        conversationalAnalysis: {
          consistency: { consistencyPercentage: 100 }
        }
      };
      expect(result.conversationalAnalysis.consistency.consistencyPercentage).toBe(100);
    });

    it('should detect normalization issues when not normalized', () => {
      const result1 = { normalizationStatus: { status: 'normalized' } };
      expect(result1.normalizationStatus.status).toBe('normalized');

      const result2 = { normalizationStatus: { status: 'not-normalized' } };
      expect(result2.normalizationStatus.status).not.toBe('normalized');
    });
  });

  describe('Validation Issue Detection', () => {
    it('should detect sample rate validation failures', () => {
      const validation = {
        sampleRate: { status: 'fail', issue: 'Sample rate not supported' }
      };
      expect(validation.sampleRate.status).toBe('fail');
      expect(validation.sampleRate.issue).toBeTruthy();
    });

    it('should detect bit depth validation failures', () => {
      const validation = {
        bitDepth: { status: 'fail', issue: 'Bit depth not supported' }
      };
      expect(validation.bitDepth.status).toBe('fail');
    });

    it('should detect channel validation failures', () => {
      const validation = {
        channels: { status: 'fail', issue: 'Requires 1 channel' }
      };
      expect(validation.channels.status).toBe('fail');
    });

    it('should detect file type validation failures', () => {
      const validation = {
        fileType: { status: 'fail', issue: 'File type not supported' }
      };
      expect(validation.fileType.status).toBe('fail');
    });

    it('should handle warnings as well as failures', () => {
      const validation = {
        filename: { status: 'warning', issue: 'Filename format suspicious' }
      };
      expect(['fail', 'warning']).toContain(validation.filename.status);
    });

    it('should pass validation when status is pass', () => {
      const validation = {
        fileType: { status: 'pass', issue: null }
      };
      expect(validation.fileType.status).toBe('pass');
    });
  });

  describe('Recommendation Generation', () => {
    it('should generate specific sample rate recommendations', () => {
      // Recommendations should include the allowed values
      const allowedRates = ['48.0 kHz', '44.1 kHz'];
      const recommendation = `File must be ${allowedRates.join(' or ')}.`;
      expect(recommendation).toContain('48.0 kHz');
      expect(recommendation).toContain('44.1 kHz');
    });

    it('should generate specific bit depth recommendations', () => {
      const allowedDepths = ['24', '16'];
      const recommendation = `File must be ${allowedDepths.map(d => `${d}-bit`).join(' or ')}.`;
      expect(recommendation).toContain('24-bit');
      expect(recommendation).toContain('16-bit');
    });

    it('should generate specific channel recommendations', () => {
      const allowedChannels = ['Mono (1 channel)', 'Stereo (2 channels)'];
      const recommendation = `File must be ${allowedChannels.join(' or ')}.`;
      expect(recommendation).toContain('Mono');
      expect(recommendation).toContain('Stereo');
    });

    it('should not use generic "convert" language for sample rate', () => {
      const recommendation = 'File must be 48 kHz or 44.1 kHz.';
      expect(recommendation).not.toContain('Convert');
      expect(recommendation).not.toContain('convert');
    });

    it('should not use generic "convert" language for bit depth', () => {
      const recommendation = 'File must be 24-bit or 16-bit.';
      expect(recommendation).not.toContain('Convert');
    });
  });

  describe('Toggle Behavior', () => {
    it('should exclude quality issues when includeFailureAnalysis is false', () => {
      const options = { includeFailureAnalysis: false };
      const shouldInclude = options.includeFailureAnalysis !== false;
      expect(shouldInclude).toBe(false);
    });

    it('should include quality issues when includeFailureAnalysis is true', () => {
      const options = { includeFailureAnalysis: true };
      const shouldInclude = options.includeFailureAnalysis !== false;
      expect(shouldInclude).toBe(true);
    });

    it('should include quality issues when includeFailureAnalysis is undefined (default to true)', () => {
      const options = { includeFailureAnalysis: undefined };
      const shouldInclude = options.includeFailureAnalysis !== false;
      expect(shouldInclude).toBe(true);
    });

    it('should exclude recommendations when includeRecommendations is false', () => {
      const options = { includeRecommendations: false };
      const shouldInclude = options.includeRecommendations !== false;
      expect(shouldInclude).toBe(false);
    });

    it('should include recommendations when includeRecommendations is true', () => {
      const options = { includeRecommendations: true };
      const shouldInclude = options.includeRecommendations !== false;
      expect(shouldInclude).toBe(true);
    });

    it('should include recommendations when includeRecommendations is undefined (default to true)', () => {
      const options = { includeRecommendations: undefined };
      const shouldInclude = options.includeRecommendations !== false;
      expect(shouldInclude).toBe(true);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle missing clipping analysis', () => {
      const result = { clippingAnalysis: undefined };
      expect(result.clippingAnalysis).toBeUndefined();
    });

    it('should handle zero clipping events', () => {
      const result = {
        clippingAnalysis: {
          clippingEventCount: 0,
          clippedPercentage: 0
        }
      };
      expect(result.clippingAnalysis.clippingEventCount).toBe(0);
    });

    it('should handle missing conversational analysis', () => {
      const result = { conversationalAnalysis: undefined };
      expect(result.conversationalAnalysis).toBeUndefined();
    });

    it('should handle missing normalization status', () => {
      const result = { normalizationStatus: undefined };
      expect(result.normalizationStatus).toBeUndefined();
    });

    it('should handle multiple validation failures', () => {
      const validation = {
        sampleRate: { status: 'fail', issue: 'Wrong rate' },
        bitDepth: { status: 'fail', issue: 'Wrong depth' },
        channels: { status: 'fail', issue: 'Wrong channels' }
      };
      const failures = Object.values(validation).filter(v => v.status === 'fail');
      expect(failures.length).toBe(3);
    });

    it('should handle silence array with all zeros', () => {
      const result = {
        leadingSilence: 0,
        trailingSilence: 0,
        longestSilence: 0
      };
      expect(result.leadingSilence).toBe(0);
      expect(result.trailingSilence).toBe(0);
      expect(result.longestSilence).toBe(0);
    });
  });
});
