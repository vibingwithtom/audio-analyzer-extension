import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import StatusBadge from '../../src/components/StatusBadge.svelte';

describe('StatusBadge', () => {
  it('should render pass badge', () => {
    render(StatusBadge, { props: { status: 'pass' } });
    const badge = screen.getByText(/pass/i);
    expect(badge).toHaveClass('badge-success');
  });

  it('should render fail badge', () => {
    render(StatusBadge, { props: { status: 'fail' } });
    const badge = screen.getByText(/fail/i);
    expect(badge).toHaveClass('badge-danger');
  });

  it('should render warning badge', () => {
    render(StatusBadge, { props: { status: 'warning' } });
    const badge = screen.getByText(/warning/i);
    expect(badge).toHaveClass('badge-warning');
  });
});
