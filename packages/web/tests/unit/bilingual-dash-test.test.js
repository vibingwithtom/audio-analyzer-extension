import { describe, it, expect } from 'vitest';
import { FilenameValidator } from '../../src/validation/filename-validator';

/**
 * Test for conversation IDs with dashes (bug fix)
 */
describe('Bilingual Filename Validation - Conversation IDs with Dashes', () => {
  it('should pass for conversation ID with dashes (vdlg1_004_bus-trick)', () => {
    const filename = 'vdlg1_004_bus-trick-en_us-user-8042-agent-15565.wav';
    const result = FilenameValidator.validateBilingual(filename);

    expect(result.status).toBe('pass');
    expect(result.isSpontaneous).toBe(false);
    expect(result.issue).toBe('');
    expect(result.expectedFormat).toBe('vdlg1_004_bus-trick-en_us-user-8042-agent-15565.wav');
  });

  it('should pass for conversation ID with multiple dashes', () => {
    const filename = 'vdlg1_023_eclipse-pics-en_us-user-8042-agent-15565.wav';
    const result = FilenameValidator.validateBilingual(filename);

    expect(result.status).toBe('pass');
    expect(result.isSpontaneous).toBe(false);
    expect(result.issue).toBe('');
  });

  it('should pass for conversation ID cold-brew', () => {
    const filename = 'vdlg1_024_cold-brew-en_us-user-8042-agent-15565.wav';
    const result = FilenameValidator.validateBilingual(filename);

    expect(result.status).toBe('pass');
    expect(result.isSpontaneous).toBe(false);
    expect(result.issue).toBe('');
  });

  it('should pass for conversation ID pet-help', () => {
    const filename = 'vdlg1_029_pet-help-en_us-user-8042-agent-15565.wav';
    const result = FilenameValidator.validateBilingual(filename);

    expect(result.status).toBe('pass');
    expect(result.isSpontaneous).toBe(false);
    expect(result.issue).toBe('');
  });

  it('should pass for conversation ID sewing-hacks', () => {
    const filename = 'vdlg1_030_sewing-hacks-en_us-user-8042-agent-15565.wav';
    const result = FilenameValidator.validateBilingual(filename);

    expect(result.status).toBe('pass');
    expect(result.isSpontaneous).toBe(false);
    expect(result.issue).toBe('');
  });

  it('should still fail for invalid conversation ID even with dashes', () => {
    const filename = 'invalid-conversation-id-en_us-user-8042-agent-15565.wav';
    const result = FilenameValidator.validateBilingual(filename);

    expect(result.status).toBe('fail');
    expect(result.issue).toContain('Invalid conversation ID');
  });
});
