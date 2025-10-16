import { describe, it, expect, vi } from 'vitest';
import { analyzeFailuresWithRecommendations } from '../../src/utils/export-utils';

// Mock the analytics service
vi.mock('../../src/services/analytics-service', () => ({
  analyticsService: {
    track: vi.fn()
  }
}));

/**
 * Unit tests for analyzeFailuresWithRecommendations function
 *
 * These tests verify the complex conditional logic that determines:
 * - Which quality issues are detected and at what severity
 * - What recommendations are generated
 * - How toggle options affect output
 */

describe('analyzeFailuresWithRecommendations', () => {
  describe('Clipping Detection and Severity', () => {
    it('should identify critical clipping when percentage > 1%', () => {
      const mockResult = {
        filename: 'test.wav',
        status: 'fail',
        clippingAnalysis: {
          clippingEventCount: 100,
          clippedPercentage: 1.5,
          nearClippingPercentage: 0
        }
      };

      const mockOptions = {
        mode: 'experimental',
        includeFilenameValidation: false,
        analysisMode: 'experimental',
        includeFailureAnalysis: true,
        includeRecommendations: true
      };

      const analysis = analyzeFailuresWithRecommendations(mockResult, mockOptions);

      expect(analysis.qualityIssues).toContain('Clipping: 1.50% (critical)');
      expect(analysis.failureSummary).toContain('critical');
      expect(analysis.recommendations).toContain('Audio severely clipped - re-record with proper gain staging');
    });

    it('should identify critical clipping when event count > 50', () => {
      const mockResult = {
        filename: 'test.wav',
        status: 'fail',
        clippingAnalysis: {
          clippingEventCount: 75,
          clippedPercentage: 0.5,
          nearClippingPercentage: 0
        }
      };

      const mockOptions = {
        mode: 'experimental',
        includeFilenameValidation: false,
        analysisMode: 'experimental',
        includeFailureAnalysis: true,
        includeRecommendations: true
      };

      const analysis = analyzeFailuresWithRecommendations(mockResult, mockOptions);

      expect(analysis.qualityIssues).toContain('Clipping');
      expect(analysis.qualityIssues).toContain('critical');
      expect(analysis.recommendations).toContain('severely clipped');
    });

    it('should identify major clipping when percentage 0.1-1%', () => {
      const mockResult = {
        filename: 'test.wav',
        status: 'warning',
        clippingAnalysis: {
          clippingEventCount: 20,
          clippedPercentage: 0.5,
          nearClippingPercentage: 0
        }
      };

      const mockOptions = {
        mode: 'experimental',
        includeFilenameValidation: false,
        analysisMode: 'experimental',
        includeFailureAnalysis: true,
        includeRecommendations: true
      };

      const analysis = analyzeFailuresWithRecommendations(mockResult, mockOptions);

      expect(analysis.qualityIssues).toContain('Clipping: 0.50% (major)');
      expect(analysis.recommendations).toContain('Significantly reduce input levels and re-record');
    });

    it('should identify major clipping for any hard clipping > 0', () => {
      const mockResult = {
        filename: 'test.wav',
        status: 'warning',
        clippingAnalysis: {
          clippingEventCount: 5,
          clippedPercentage: 0.05,
          nearClippingPercentage: 0
        }
      };

      const mockOptions = {
        mode: 'experimental',
        includeFilenameValidation: false,
        analysisMode: 'experimental',
        includeFailureAnalysis: true,
        includeRecommendations: true
      };

      const analysis = analyzeFailuresWithRecommendations(mockResult, mockOptions);

      expect(analysis.qualityIssues).toContain('Clipping');
      expect(analysis.qualityIssues).toContain('major');
    });

    it('should not flag clipping when there is none', () => {
      const mockResult = {
        filename: 'clean.wav',
        status: 'pass',
        clippingAnalysis: {
          clippingEventCount: 0,
          clippedPercentage: 0,
          nearClippingPercentage: 0
        }
      };

      const mockOptions = {
        mode: 'experimental',
        includeFilenameValidation: false,
        analysisMode: 'experimental',
        includeFailureAnalysis: true,
        includeRecommendations: true
      };

      const analysis = analyzeFailuresWithRecommendations(mockResult, mockOptions);

      expect(analysis.qualityIssues).not.toContain('Clipping');
      expect(analysis.failureSummary).toBe('No issues detected');
    });
  });

  describe('Noise Floor Detection', () => {
    it('should flag critical noise floor when > -40 dB', () => {
      const mockResult = {
        filename: 'noisy.wav',
        status: 'fail',
        noiseFloorDb: -35
      };

      const mockOptions = {
        mode: 'experimental',
        includeFilenameValidation: false,
        analysisMode: 'experimental',
        includeFailureAnalysis: true,
        includeRecommendations: true
      };

      const analysis = analyzeFailuresWithRecommendations(mockResult, mockOptions);

      expect(analysis.qualityIssues).toContain('High noise floor: -35.0 dB');
      expect(analysis.recommendations).toContain('Recording environment too noisy - find quieter location');
    });

    it('should flag high noise floor when -50 to -40 dB', () => {
      const mockResult = {
        filename: 'noisy.wav',
        status: 'warning',
        noiseFloorDb: -45
      };

      const mockOptions = {
        mode: 'experimental',
        includeFilenameValidation: false,
        analysisMode: 'experimental',
        includeFailureAnalysis: true,
        includeRecommendations: true
      };

      const analysis = analyzeFailuresWithRecommendations(mockResult, mockOptions);

      expect(analysis.qualityIssues).toContain('High noise floor: -45.0 dB');
      expect(analysis.recommendations).toContain('Record in quieter environment or use noise reduction');
    });

    it('should not flag noise floor when <= -50 dB', () => {
      const mockResult = {
        filename: 'clean.wav',
        status: 'pass',
        noiseFloorDb: -60
      };

      const mockOptions = {
        mode: 'experimental',
        includeFilenameValidation: false,
        analysisMode: 'experimental',
        includeFailureAnalysis: true,
        includeRecommendations: true
      };

      const analysis = analyzeFailuresWithRecommendations(mockResult, mockOptions);

      expect(analysis.qualityIssues).not.toContain('noise floor');
    });
  });

  describe('Silence Detection', () => {
    it('should flag leading silence when > 1s', () => {
      const mockResult = {
        filename: 'test.wav',
        status: 'warning',
        leadingSilence: 1.5
      };

      const mockOptions = {
        mode: 'experimental',
        includeFilenameValidation: false,
        analysisMode: 'experimental',
        includeFailureAnalysis: true,
        includeRecommendations: true
      };

      const analysis = analyzeFailuresWithRecommendations(mockResult, mockOptions);

      expect(analysis.qualityIssues).toContain('Leading silence: 1.5s');
      expect(analysis.recommendations).toContain('Trim leading silence to improve user experience');
    });

    it('should flag trailing silence when > 1s', () => {
      const mockResult = {
        filename: 'test.wav',
        status: 'warning',
        trailingSilence: 2.0
      };

      const mockOptions = {
        mode: 'experimental',
        includeFilenameValidation: false,
        analysisMode: 'experimental',
        includeFailureAnalysis: true,
        includeRecommendations: true
      };

      const analysis = analyzeFailuresWithRecommendations(mockResult, mockOptions);

      expect(analysis.qualityIssues).toContain('Trailing silence: 2.0s');
      expect(analysis.recommendations).toContain('Trim trailing silence');
    });

    it('should flag silence gaps when > 2s', () => {
      const mockResult = {
        filename: 'test.wav',
        status: 'warning',
        longestSilence: 2.5
      };

      const mockOptions = {
        mode: 'experimental',
        includeFilenameValidation: false,
        analysisMode: 'experimental',
        includeFailureAnalysis: true,
        includeRecommendations: true
      };

      const analysis = analyzeFailuresWithRecommendations(mockResult, mockOptions);

      expect(analysis.qualityIssues).toContain('Silence gap: 2.5s');
      expect(analysis.recommendations).toContain('Edit out long silent gaps in recording');
    });
  });

  describe('Speech Overlap Detection', () => {
    it('should flag high overlap when 5-15%', () => {
      const mockResult = {
        filename: 'conversation.wav',
        status: 'warning',
        conversationalAnalysis: {
          overlap: { overlapPercentage: 10 }
        }
      };

      const mockOptions = {
        mode: 'experimental',
        includeFilenameValidation: false,
        analysisMode: 'experimental',
        includeFailureAnalysis: true,
        includeRecommendations: true
      };

      const analysis = analyzeFailuresWithRecommendations(mockResult, mockOptions);

      expect(analysis.qualityIssues).toContain('Speech overlap: 10.0%');
      expect(analysis.recommendations).toContain('Encourage better turn-taking in conversations');
    });

    it('should flag excessive overlap when > 15%', () => {
      const mockResult = {
        filename: 'conversation.wav',
        status: 'fail',
        conversationalAnalysis: {
          overlap: { overlapPercentage: 20 }
        }
      };

      const mockOptions = {
        mode: 'experimental',
        includeFilenameValidation: false,
        analysisMode: 'experimental',
        includeFailureAnalysis: true,
        includeRecommendations: true
      };

      const analysis = analyzeFailuresWithRecommendations(mockResult, mockOptions);

      expect(analysis.qualityIssues).toContain('Speech overlap: 20.0%');
      expect(analysis.recommendations).toContain('Implement stricter speaking protocols to reduce simultaneous speech');
    });

    it('should not flag overlap when <= 5%', () => {
      const mockResult = {
        filename: 'conversation.wav',
        status: 'pass',
        conversationalAnalysis: {
          overlap: { overlapPercentage: 3 }
        }
      };

      const mockOptions = {
        mode: 'experimental',
        includeFilenameValidation: false,
        analysisMode: 'experimental',
        includeFailureAnalysis: true,
        includeRecommendations: true
      };

      const analysis = analyzeFailuresWithRecommendations(mockResult, mockOptions);

      expect(analysis.qualityIssues).not.toContain('Speech overlap');
    });
  });

  describe('Channel Consistency Detection', () => {
    it('should flag channel consistency when < 100%', () => {
      const mockResult = {
        filename: 'conversation.wav',
        status: 'warning',
        conversationalAnalysis: {
          consistency: { consistencyPercentage: 95 }
        }
      };

      const mockOptions = {
        mode: 'experimental',
        includeFilenameValidation: false,
        analysisMode: 'experimental',
        includeFailureAnalysis: true,
        includeRecommendations: true
      };

      const analysis = analyzeFailuresWithRecommendations(mockResult, mockOptions);

      expect(analysis.qualityIssues).toContain('Channel consistency: 95.0%');
    });

    it('should not flag when = 100%', () => {
      const mockResult = {
        filename: 'conversation.wav',
        status: 'pass',
        conversationalAnalysis: {
          consistency: { consistencyPercentage: 100 }
        }
      };

      const mockOptions = {
        mode: 'experimental',
        includeFilenameValidation: false,
        analysisMode: 'experimental',
        includeFailureAnalysis: true,
        includeRecommendations: true
      };

      const analysis = analyzeFailuresWithRecommendations(mockResult, mockOptions);

      expect(analysis.qualityIssues).not.toContain('Channel consistency');
    });
  });

  describe('Validation Issue Detection and Recommendations', () => {
    it('should detect sample rate validation failure with criteria-specific recommendation', () => {
      const mockResult = {
        filename: 'test.wav',
        status: 'fail',
        sampleRate: 22050,
        validation: {
          sampleRate: { status: 'fail', issue: 'Sample rate must be 48 kHz or 44.1 kHz' }
        }
      };

      const mockCriteria = {
        sampleRate: ['48000', '44100'],
        bitDepth: [],
        channels: [],
        fileType: [],
        minDuration: ''
      };

      const mockOptions = {
        mode: 'standard',
        includeFilenameValidation: false,
        analysisMode: 'standard',
        currentPresetCriteria: mockCriteria,
        includeFailureAnalysis: true,
        includeRecommendations: true
      };

      const analysis = analyzeFailuresWithRecommendations(mockResult, mockOptions);

      expect(analysis.qualityIssues).toContain('sampleRate:');
      expect(analysis.recommendations).toContain('File must be 48 kHz or 44.1 kHz');
      expect(analysis.recommendations).not.toContain('Convert');
    });

    it('should detect bit depth validation failure with criteria-specific recommendation', () => {
      const mockResult = {
        filename: 'test.wav',
        status: 'fail',
        bitDepth: 8,
        validation: {
          bitDepth: { status: 'fail', issue: 'Bit depth must be 24-bit or 16-bit' }
        }
      };

      const mockCriteria = {
        sampleRate: [],
        bitDepth: ['24', '16'],
        channels: [],
        fileType: [],
        minDuration: ''
      };

      const mockOptions = {
        mode: 'standard',
        includeFilenameValidation: false,
        analysisMode: 'standard',
        currentPresetCriteria: mockCriteria,
        includeFailureAnalysis: true,
        includeRecommendations: true
      };

      const analysis = analyzeFailuresWithRecommendations(mockResult, mockOptions);

      expect(analysis.qualityIssues).toContain('bitDepth:');
      expect(analysis.recommendations).toContain('File must be 24 or 16-bit');
      expect(analysis.recommendations).not.toContain('Convert');
    });

    it('should detect channel validation failure with criteria-specific recommendation', () => {
      const mockResult = {
        filename: 'test.wav',
        status: 'fail',
        channels: 1,
        validation: {
          channels: { status: 'fail', issue: 'File must be stereo' }
        }
      };

      const mockCriteria = {
        sampleRate: [],
        bitDepth: [],
        channels: ['2'],
        fileType: [],
        minDuration: ''
      };

      const mockOptions = {
        mode: 'standard',
        includeFilenameValidation: false,
        analysisMode: 'standard',
        currentPresetCriteria: mockCriteria,
        includeFailureAnalysis: true,
        includeRecommendations: true
      };

      const analysis = analyzeFailuresWithRecommendations(mockResult, mockOptions);

      expect(analysis.qualityIssues).toContain('channels:');
      expect(analysis.recommendations).toContain('Stereo (2 channels)');
    });
  });

  describe('Toggle Behavior', () => {
    it('should exclude quality issues when includeFailureAnalysis is false', () => {
      const mockResult = {
        filename: 'test.wav',
        status: 'fail',
        noiseFloorDb: -35,
        leadingSilence: 2.0
      };

      const mockOptions = {
        mode: 'experimental',
        includeFilenameValidation: false,
        analysisMode: 'experimental',
        includeFailureAnalysis: false,
        includeRecommendations: true
      };

      const analysis = analyzeFailuresWithRecommendations(mockResult, mockOptions);

      expect(analysis.qualityIssues).toBe('');
      expect(analysis.failureSummary).toBe('');
    });

    it('should include quality issues when includeFailureAnalysis is true', () => {
      const mockResult = {
        filename: 'test.wav',
        status: 'fail',
        noiseFloorDb: -35
      };

      const mockOptions = {
        mode: 'experimental',
        includeFilenameValidation: false,
        analysisMode: 'experimental',
        includeFailureAnalysis: true,
        includeRecommendations: true
      };

      const analysis = analyzeFailuresWithRecommendations(mockResult, mockOptions);

      expect(analysis.qualityIssues).toContain('High noise floor');
      expect(analysis.failureSummary).toContain('issue');
    });

    it('should include quality issues when includeFailureAnalysis is undefined (defaults to true)', () => {
      const mockResult = {
        filename: 'test.wav',
        status: 'fail',
        noiseFloorDb: -35
      };

      const mockOptions = {
        mode: 'experimental',
        includeFilenameValidation: false,
        analysisMode: 'experimental',
        includeFailureAnalysis: undefined,
        includeRecommendations: true
      };

      const analysis = analyzeFailuresWithRecommendations(mockResult, mockOptions);

      expect(analysis.qualityIssues).toContain('High noise floor');
    });

    it('should exclude recommendations when includeRecommendations is false', () => {
      const mockResult = {
        filename: 'test.wav',
        status: 'fail',
        noiseFloorDb: -35
      };

      const mockOptions = {
        mode: 'experimental',
        includeFilenameValidation: false,
        analysisMode: 'experimental',
        includeFailureAnalysis: true,
        includeRecommendations: false
      };

      const analysis = analyzeFailuresWithRecommendations(mockResult, mockOptions);

      expect(analysis.recommendations).toBe('');
    });

    it('should include recommendations when includeRecommendations is true', () => {
      const mockResult = {
        filename: 'test.wav',
        status: 'fail',
        noiseFloorDb: -35
      };

      const mockOptions = {
        mode: 'experimental',
        includeFilenameValidation: false,
        analysisMode: 'experimental',
        includeFailureAnalysis: true,
        includeRecommendations: true
      };

      const analysis = analyzeFailuresWithRecommendations(mockResult, mockOptions);

      expect(analysis.recommendations).toContain('Recording environment too noisy');
    });

    it('should include recommendations when includeRecommendations is undefined (defaults to true)', () => {
      const mockResult = {
        filename: 'test.wav',
        status: 'fail',
        noiseFloorDb: -35
      };

      const mockOptions = {
        mode: 'experimental',
        includeFilenameValidation: false,
        analysisMode: 'experimental',
        includeFailureAnalysis: true,
        includeRecommendations: undefined
      };

      const analysis = analyzeFailuresWithRecommendations(mockResult, mockOptions);

      expect(analysis.recommendations).toContain('Recording environment too noisy');
    });
  });

  describe('Edge Cases and Multiple Issues', () => {
    it('should handle file with no issues', () => {
      const mockResult = {
        filename: 'perfect.wav',
        status: 'pass',
        clippingAnalysis: { clippingEventCount: 0, clippedPercentage: 0, nearClippingPercentage: 0 },
        noiseFloorDb: -60,
        leadingSilence: 0.5,
        trailingSilence: 0.5,
        longestSilence: 1.0
      };

      const mockOptions = {
        mode: 'experimental',
        includeFilenameValidation: false,
        analysisMode: 'experimental',
        includeFailureAnalysis: true,
        includeRecommendations: true
      };

      const analysis = analyzeFailuresWithRecommendations(mockResult, mockOptions);

      expect(analysis.failureSummary).toBe('No issues detected');
      expect(analysis.qualityIssues).toBe('');
      expect(analysis.recommendations).toBe('');
    });

    it('should handle file with multiple quality issues', () => {
      const mockResult = {
        filename: 'problematic.wav',
        status: 'fail',
        clippingAnalysis: { clippingEventCount: 100, clippedPercentage: 2.0, nearClippingPercentage: 0 },
        noiseFloorDb: -35,
        leadingSilence: 2.0,
        trailingSilence: 3.0
      };

      const mockOptions = {
        mode: 'experimental',
        includeFilenameValidation: false,
        analysisMode: 'experimental',
        includeFailureAnalysis: true,
        includeRecommendations: true
      };

      const analysis = analyzeFailuresWithRecommendations(mockResult, mockOptions);

      expect(analysis.qualityIssues).toContain('Clipping');
      expect(analysis.qualityIssues).toContain('noise floor');
      expect(analysis.qualityIssues).toContain('Leading silence');
      expect(analysis.qualityIssues).toContain('Trailing silence');
      expect(analysis.failureSummary).toContain('critical');
      expect(analysis.recommendations).toContain('severely clipped');
      expect(analysis.recommendations).toContain('too noisy');
    });

    it('should handle missing analysis data gracefully', () => {
      const mockResult = {
        filename: 'incomplete.wav',
        status: 'pass',
        clippingAnalysis: undefined,
        noiseFloorDb: undefined,
        conversationalAnalysis: undefined
      };

      const mockOptions = {
        mode: 'experimental',
        includeFilenameValidation: false,
        analysisMode: 'experimental',
        includeFailureAnalysis: true,
        includeRecommendations: true
      };

      const analysis = analyzeFailuresWithRecommendations(mockResult, mockOptions);

      expect(analysis.failureSummary).toBe('No issues detected');
    });
  });
});
