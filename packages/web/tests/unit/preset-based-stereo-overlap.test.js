import { describe, it, expect } from 'vitest';
import { CriteriaValidator } from '@audio-analyzer/core';

describe('Preset-Based Stereo Type and Speech Overlap Validation', () => {
  describe('validateStereoType', () => {
    // Preset definitions for testing
    const bilingualPreset = { stereoType: ['Conversational Stereo'] };
    const p2b2StereoPreset = { stereoType: ['Conversational Stereo'] };
    const p2b2MixedPreset = { stereoType: ['Conversational Stereo'] };
    const noStereoPreset = {}; // No stereoType requirement
    const auditionsCharacterPreset = {}; // No stereoType requirement

    describe('Pass Cases', () => {
      it('should pass when file has required Conversational Stereo', () => {
        const stereoSeparation = {
          stereoType: 'Conversational Stereo',
          stereoConfidence: 0.95
        };
        const result = CriteriaValidator.validateStereoType(stereoSeparation, bilingualPreset);
        expect(result.status).toBe('pass');
        expect(result.message).toBe('Conversational Stereo');
      });

      it('should return null when preset has no stereoType requirement', () => {
        const stereoSeparation = {
          stereoType: 'Mono as Stereo',
          stereoConfidence: 0.85
        };
        const result = CriteriaValidator.validateStereoType(stereoSeparation, noStereoPreset);
        expect(result).toBeNull();
      });
    });

    describe('Fail Cases', () => {
      it('should fail when file is Mono as Stereo but needs Conversational Stereo', () => {
        const stereoSeparation = {
          stereoType: 'Mono as Stereo',
          stereoConfidence: 0.95
        };
        const result = CriteriaValidator.validateStereoType(stereoSeparation, bilingualPreset);
        expect(result.status).toBe('fail');
        expect(result.message).toContain('Expected Conversational Stereo');
        expect(result.message).toContain('found Mono as Stereo');
      });

      it('should fail when file is Mono in Left Channel but needs Conversational Stereo', () => {
        const stereoSeparation = {
          stereoType: 'Mono in Left Channel',
          stereoConfidence: 0.97
        };
        const result = CriteriaValidator.validateStereoType(stereoSeparation, p2b2StereoPreset);
        expect(result.status).toBe('fail');
        expect(result.message).toContain('Expected Conversational Stereo');
        expect(result.message).toContain('found Mono in Left Channel');
      });

      it('should fail when file is Mono in Right Channel but needs Conversational Stereo', () => {
        const stereoSeparation = {
          stereoType: 'Mono in Right Channel',
          stereoConfidence: 0.96
        };
        const result = CriteriaValidator.validateStereoType(stereoSeparation, p2b2MixedPreset);
        expect(result.status).toBe('fail');
        expect(result.message).toContain('Expected Conversational Stereo');
        expect(result.message).toContain('found Mono in Right Channel');
      });

      it('should fail when file is Mixed Stereo but needs Conversational Stereo', () => {
        const stereoSeparation = {
          stereoType: 'Mixed Stereo',
          stereoConfidence: 0.70
        };
        const result = CriteriaValidator.validateStereoType(stereoSeparation, bilingualPreset);
        expect(result.status).toBe('fail');
        expect(result.message).toContain('Expected Conversational Stereo');
        expect(result.message).toContain('found Mixed Stereo');
      });

      it('should fail when file is not stereo', () => {
        const result = CriteriaValidator.validateStereoType(null, bilingualPreset);
        expect(result.status).toBe('fail');
        expect(result.message).toBe('Not a stereo file');
      });

      it('should fail for Silent stereo type', () => {
        const stereoSeparation = {
          stereoType: 'Silent',
          stereoConfidence: 1.0
        };
        const result = CriteriaValidator.validateStereoType(stereoSeparation, bilingualPreset);
        expect(result.status).toBe('fail');
        expect(result.message).toContain('Expected Conversational Stereo');
        expect(result.message).toContain('found Silent');
      });

      it('should fail for Undetermined stereo type', () => {
        const stereoSeparation = {
          stereoType: 'Undetermined',
          stereoConfidence: 0
        };
        const result = CriteriaValidator.validateStereoType(stereoSeparation, bilingualPreset);
        expect(result.status).toBe('fail');
        expect(result.message).toContain('Expected Conversational Stereo');
        expect(result.message).toContain('found Undetermined');
      });
    });

    describe('Multiple Stereo Types', () => {
      it('should support multiple allowed stereo types', () => {
        const multiTypePreset = { stereoType: ['Conversational Stereo', 'Mono as Stereo'] };

        const convStereo = {
          stereoType: 'Conversational Stereo',
          stereoConfidence: 0.92
        };
        let result = CriteriaValidator.validateStereoType(convStereo, multiTypePreset);
        expect(result.status).toBe('pass');

        const monoAsStereo = {
          stereoType: 'Mono as Stereo',
          stereoConfidence: 0.96
        };
        result = CriteriaValidator.validateStereoType(monoAsStereo, multiTypePreset);
        expect(result.status).toBe('pass');

        const monoInLeft = {
          stereoType: 'Mono in Left Channel',
          stereoConfidence: 0.98
        };
        result = CriteriaValidator.validateStereoType(monoInLeft, multiTypePreset);
        expect(result.status).toBe('fail');
        expect(result.message).toContain('Conversational Stereo or Mono as Stereo');
      });
    });
  });

  describe('validateSpeechOverlap', () => {
    // Preset thresholds
    const bilingualPreset = {
      maxOverlapWarning: 5,
      maxOverlapFail: 10
    };
    const p2b2StereoPreset = {
      maxOverlapWarning: 3,
      maxOverlapFail: 8
    };
    const noOverlapPreset = {}; // No overlap thresholds
    const customThresholdPreset = {
      maxOverlapWarning: 1,
      maxOverlapFail: 3
    };

    describe('Pass Cases (Bilingual Preset: 5% warning, 10% fail)', () => {
      it('should pass when overlap is 0%', () => {
        const conversationalAnalysis = {
          overlap: { overlapPercentage: 0 }
        };
        const result = CriteriaValidator.validateSpeechOverlap(conversationalAnalysis, bilingualPreset);
        expect(result.status).toBe('pass');
        expect(result.message).toBe('0.0% overlap');
        expect(result.percentage).toBe(0);
      });

      it('should pass when overlap is exactly at warning threshold (5%)', () => {
        const conversationalAnalysis = {
          overlap: { overlapPercentage: 5 }
        };
        const result = CriteriaValidator.validateSpeechOverlap(conversationalAnalysis, bilingualPreset);
        expect(result.status).toBe('pass');
        expect(result.message).toBe('5.0% overlap');
      });

      it('should pass when overlap is well below warning threshold', () => {
        const conversationalAnalysis = {
          overlap: { overlapPercentage: 2.5 }
        };
        const result = CriteriaValidator.validateSpeechOverlap(conversationalAnalysis, bilingualPreset);
        expect(result.status).toBe('pass');
        expect(result.message).toBe('2.5% overlap');
      });
    });

    describe('Warning Cases (Bilingual Preset: 5% < x <= 10%)', () => {
      it('should warn when overlap is just above warning threshold', () => {
        const conversationalAnalysis = {
          overlap: { overlapPercentage: 5.1 }
        };
        const result = CriteriaValidator.validateSpeechOverlap(conversationalAnalysis, bilingualPreset);
        expect(result.status).toBe('warning');
        expect(result.message).toContain('5.1% overlap');
        expect(result.message).toContain('>5%');
      });

      it('should warn when overlap is in middle of warning zone', () => {
        const conversationalAnalysis = {
          overlap: { overlapPercentage: 7.5 }
        };
        const result = CriteriaValidator.validateSpeechOverlap(conversationalAnalysis, bilingualPreset);
        expect(result.status).toBe('warning');
        expect(result.message).toContain('7.5% overlap');
        expect(result.message).toContain('>5%');
      });

      it('should warn when overlap is exactly at fail threshold (10%)', () => {
        const conversationalAnalysis = {
          overlap: { overlapPercentage: 10 }
        };
        const result = CriteriaValidator.validateSpeechOverlap(conversationalAnalysis, bilingualPreset);
        expect(result.status).toBe('warning');
        expect(result.message).toContain('10.0% overlap');
        expect(result.message).toContain('>5%');
      });
    });

    describe('Fail Cases (Bilingual Preset: > 10%)', () => {
      it('should fail when overlap is just above fail threshold', () => {
        const conversationalAnalysis = {
          overlap: { overlapPercentage: 10.1 }
        };
        const result = CriteriaValidator.validateSpeechOverlap(conversationalAnalysis, bilingualPreset);
        expect(result.status).toBe('fail');
        expect(result.message).toContain('10.1% overlap');
        expect(result.message).toContain('>10%');
      });

      it('should fail when overlap is significantly above fail threshold', () => {
        const conversationalAnalysis = {
          overlap: { overlapPercentage: 25 }
        };
        const result = CriteriaValidator.validateSpeechOverlap(conversationalAnalysis, bilingualPreset);
        expect(result.status).toBe('fail');
        expect(result.message).toContain('25.0% overlap');
        expect(result.message).toContain('>10%');
      });

      it('should fail when overlap is very high', () => {
        const conversationalAnalysis = {
          overlap: { overlapPercentage: 50 }
        };
        const result = CriteriaValidator.validateSpeechOverlap(conversationalAnalysis, bilingualPreset);
        expect(result.status).toBe('fail');
        expect(result.message).toContain('50.0% overlap');
      });
    });

    describe('P2B2 Stereo Preset (Stricter: 3% warning, 8% fail)', () => {
      it('should pass for low overlap (< 3%)', () => {
        const conversationalAnalysis = {
          overlap: { overlapPercentage: 2 }
        };
        const result = CriteriaValidator.validateSpeechOverlap(conversationalAnalysis, p2b2StereoPreset);
        expect(result.status).toBe('pass');
      });

      it('should warn for mid-range overlap (3% < x <= 8%)', () => {
        const conversationalAnalysis = {
          overlap: { overlapPercentage: 5 }
        };
        const result = CriteriaValidator.validateSpeechOverlap(conversationalAnalysis, p2b2StereoPreset);
        expect(result.status).toBe('warning');
        expect(result.message).toContain('>3%');
      });

      it('should fail for high overlap (> 8%)', () => {
        const conversationalAnalysis = {
          overlap: { overlapPercentage: 9 }
        };
        const result = CriteriaValidator.validateSpeechOverlap(conversationalAnalysis, p2b2StereoPreset);
        expect(result.status).toBe('fail');
        expect(result.message).toContain('>8%');
      });
    });

    describe('No Preset Thresholds', () => {
      it('should return null when preset has no overlap thresholds', () => {
        const conversationalAnalysis = {
          overlap: { overlapPercentage: 7 }
        };
        const result = CriteriaValidator.validateSpeechOverlap(conversationalAnalysis, noOverlapPreset);
        expect(result).toBeNull();
      });
    });

    describe('No Overlap Data', () => {
      it('should return null when no conversational analysis data', () => {
        const result = CriteriaValidator.validateSpeechOverlap(null, bilingualPreset);
        expect(result).toBeNull();
      });

      it('should return null when overlap data is missing', () => {
        const conversationalAnalysis = {
          overlap: undefined
        };
        const result = CriteriaValidator.validateSpeechOverlap(conversationalAnalysis, bilingualPreset);
        expect(result).toBeNull();
      });

      it('should return null when conversationalAnalysis is empty', () => {
        const conversationalAnalysis = {};
        const result = CriteriaValidator.validateSpeechOverlap(conversationalAnalysis, bilingualPreset);
        expect(result).toBeNull();
      });
    });

    describe('Custom Thresholds', () => {
      it('should work with very strict custom thresholds (1% warning, 3% fail)', () => {
        let conversationalAnalysis = {
          overlap: { overlapPercentage: 0.5 }
        };
        let result = CriteriaValidator.validateSpeechOverlap(conversationalAnalysis, customThresholdPreset);
        expect(result.status).toBe('pass');

        conversationalAnalysis = {
          overlap: { overlapPercentage: 1.5 }
        };
        result = CriteriaValidator.validateSpeechOverlap(conversationalAnalysis, customThresholdPreset);
        expect(result.status).toBe('warning');

        conversationalAnalysis = {
          overlap: { overlapPercentage: 4 }
        };
        result = CriteriaValidator.validateSpeechOverlap(conversationalAnalysis, customThresholdPreset);
        expect(result.status).toBe('fail');
      });
    });

    describe('Boundary Tests', () => {
      it('should handle exact threshold boundaries correctly', () => {
        // Exactly at warning boundary
        let result = CriteriaValidator.validateSpeechOverlap(
          { overlap: { overlapPercentage: 5 } },
          bilingualPreset
        );
        expect(result.status).toBe('pass');

        // Just over warning boundary
        result = CriteriaValidator.validateSpeechOverlap(
          { overlap: { overlapPercentage: 5.001 } },
          bilingualPreset
        );
        expect(result.status).toBe('warning');

        // Exactly at fail boundary
        result = CriteriaValidator.validateSpeechOverlap(
          { overlap: { overlapPercentage: 10 } },
          bilingualPreset
        );
        expect(result.status).toBe('warning');

        // Just over fail boundary
        result = CriteriaValidator.validateSpeechOverlap(
          { overlap: { overlapPercentage: 10.001 } },
          bilingualPreset
        );
        expect(result.status).toBe('fail');
      });

      it('should handle very small overlap values', () => {
        const conversationalAnalysis = {
          overlap: { overlapPercentage: 0.001 }
        };
        const result = CriteriaValidator.validateSpeechOverlap(conversationalAnalysis, bilingualPreset);
        expect(result.status).toBe('pass');
        expect(result.percentage).toBe(0.001);
      });

      it('should handle very large overlap values', () => {
        const conversationalAnalysis = {
          overlap: { overlapPercentage: 99.9 }
        };
        const result = CriteriaValidator.validateSpeechOverlap(conversationalAnalysis, bilingualPreset);
        expect(result.status).toBe('fail');
        expect(result.percentage).toBe(99.9);
      });
    });
  });
});
