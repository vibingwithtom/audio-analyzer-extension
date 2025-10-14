import { describe, it, expect } from 'vitest';
import { FilenameValidator } from '../../src/validation/filename-validator';

/**
 * Test for spontaneous filename case sensitivity (bug fix)
 *
 * Bug: Mixed-case "Spontaneous_" was being routed to regular validation
 * instead of spontaneous validation, producing confusing error messages.
 *
 * Fix: Use case-insensitive detection to route to spontaneous validator,
 * which then properly reports the capitalization error.
 */
describe('Bilingual Filename Validation - Spontaneous Case Sensitivity', () => {
  it('should route mixed-case Spontaneous_ to spontaneous validator', () => {
    const filename = 'Spontaneous_51-en_us-user-4394-agent-14981.wav';
    const result = FilenameValidator.validateBilingual(filename);

    // Should be recognized as spontaneous pattern
    expect(result.isSpontaneous).toBe(true);

    // Should fail with proper error message about capitalization
    expect(result.status).toBe('fail');
    expect(result.issue).toContain('SPONTANEOUS_');
    expect(result.issue).toContain('all caps');

    // Should NOT give confusing errors about lowercase or invalid conversation ID
    expect(result.issue).not.toContain('Filename must be all lowercase');
    expect(result.issue).not.toContain('Invalid conversation ID');
  });

  it('should route lowercase spontaneous_ to spontaneous validator', () => {
    const filename = 'spontaneous_51-en_us-user-4394-agent-14981.wav';
    const result = FilenameValidator.validateBilingual(filename);

    // Should be recognized as spontaneous pattern
    expect(result.isSpontaneous).toBe(true);

    // Should fail with proper error message about capitalization
    expect(result.status).toBe('fail');
    expect(result.issue).toContain('SPONTANEOUS_');
    expect(result.issue).toContain('all caps');
  });

  it('should accept correctly-cased SPONTANEOUS_ (if IDs are valid)', () => {
    // Note: This will fail if the user/agent IDs aren't in the validation data,
    // but it should at least pass the SPONTANEOUS_ capitalization check
    const filename = 'SPONTANEOUS_51-en_us-user-4394-agent-14981.wav';
    const result = FilenameValidator.validateBilingual(filename);

    // Should be recognized as spontaneous pattern
    expect(result.isSpontaneous).toBe(true);

    // Should NOT have capitalization error
    expect(result.issue).not.toContain('must start with "SPONTANEOUS_"');
  });

  it('should detect mixed case in spontaneous prefix with different variations', () => {
    const testCases = [
      'SPONTANEOUS_1-en_us-user-1-agent-2.wav',  // Correct
      'Spontaneous_1-en_us-user-1-agent-2.wav',  // Mixed case - should give proper error
      'spontaneous_1-en_us-user-1-agent-2.wav',  // Lowercase - should give proper error
      'SpOnTaNeOuS_1-en_us-user-1-agent-2.wav',  // Crazy case - should give proper error
    ];

    testCases.forEach(filename => {
      const result = FilenameValidator.validateBilingual(filename);

      // All should be recognized as spontaneous
      expect(result.isSpontaneous).toBe(true);

      // Only the correct one should not have the capitalization error
      if (filename.startsWith('SPONTANEOUS_')) {
        expect(result.issue).not.toContain('must start with "SPONTANEOUS_"');
      } else {
        expect(result.issue).toContain('SPONTANEOUS_');
      }
    });
  });
});
