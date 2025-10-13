import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ValidationDisplay from '../../src/components/ValidationDisplay.svelte';

describe('ValidationDisplay', () => {
  it('should render validation results', () => {
    const validation = {
      sampleRate: { status: 'pass', value: '48000 Hz' },
      bitDepth: { status: 'fail', value: '16 bit', issue: 'Bit depth must be 24 bit' },
    };

    render(ValidationDisplay, { props: { validation } });

    expect(screen.getByText(/Sample Rate/)).toBeTruthy();
    expect(screen.getByText(/48000 Hz/)).toBeTruthy();
    expect(screen.getByText(/Bit Depth/)).toBeTruthy();
    expect(screen.getByText(/16 bit/)).toBeTruthy();
    expect(screen.getByText(/Bit depth must be 24 bit/)).toBeTruthy();
  });

  it('should not render if validation is null', () => {
    const { container } = render(ValidationDisplay, { props: { validation: null } });
    expect(container.firstChild).toBeFalsy();
  });
});
