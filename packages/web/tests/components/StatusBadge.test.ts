import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import StatusBadge from '../../src/components/StatusBadge.svelte';

describe('StatusBadge Component', () => {
  it('should render with "pass" status correctly', () => {
    render(StatusBadge, { props: { status: 'pass' } });
    const badge = screen.getByText('Pass');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('badge-success');
    expect(badge.textContent).toContain('✓');
  });

  it('should render with "warning" status correctly', () => {
    render(StatusBadge, { props: { status: 'warning' } });
    const badge = screen.getByText('Warning');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('badge-warning');
    expect(badge.textContent).toContain('⚠');
  });

  it('should render with "fail" status correctly', () => {
    render(StatusBadge, { props: { status: 'fail' } });
    const badge = screen.getByText('Fail');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('badge-danger');
    expect(badge.textContent).toContain('✗');
  });

  it('should render with "error" status correctly', () => {
    render(StatusBadge, { props: { status: 'error' } });
    const badge = screen.getByText('Error');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('badge-danger');
    expect(badge.textContent).toContain('✗');
  });

  it('should default to "error" if an invalid status is provided', () => {
    // @ts-ignore - testing invalid input
    render(StatusBadge, { props: { status: 'invalid' } });
    const badge = screen.getByText('Error');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('badge-danger');
  });
});