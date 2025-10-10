/**
 * Mock data for tests
 */

export const mockAudioFile = {
  name: 'test-audio.wav',
  size: 1024000,
  type: 'audio/wav'
};

export const mockAnalysisResults = {
  filename: 'test-audio.wav',
  fileSize: 1024000,
  fileType: 'WAV',
  sampleRate: 48000,
  bitDepth: 16,
  channels: 2,
  duration: 120
};

export const mockValidationResults = {
  sampleRate: { status: 'pass' },
  bitDepth: { status: 'pass' },
  channels: { status: 'pass' },
  fileType: { status: 'pass' }
};

export const mockBilingualValidFilename = 'CONV12345-EN-user-001-agent-002.wav';
export const mockBilingualInvalidFilename = 'invalid.wav';
export const mockSpontaneousFilename = 'SPONTANEOUS_001-EN-user-001-agent-002.wav';
