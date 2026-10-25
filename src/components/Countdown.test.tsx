import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { Countdown } from './Countdown';

describe('Countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-25T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('counts down from expiresAt then shows the expiry', () => {
    render(<Countdown expiresAt="2026-10-25T12:14:32Z" />);
    expect(screen.getByText('14:32')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText('14:31')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(871_000));
    expect(screen.getByText('Réservation expirée')).toBeInTheDocument();
  });
});
