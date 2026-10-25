import { render, screen } from '@testing-library/react';
import { ScanResult } from './ScanResult';

describe('ScanResult', () => {
  it('shows a valid ticket in green', () => {
    render(<ScanResult outcome="valid" firstUsedAt={null} />);

    expect(screen.getByRole('status')).toHaveTextContent('VALIDE — entrée autorisée');
    expect(screen.getByRole('status')).toHaveClass('bg-green-700');
  });

  it('shows an already used ticket in red with its first scan in Europe/Paris', () => {
    render(<ScanResult outcome="already_used" firstUsedAt="2026-11-27T19:04:00Z" />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'DÉJÀ UTILISÉ — le ven. 27 nov. 2026 · 20:04',
    );
    expect(screen.getByRole('status')).toHaveClass('bg-red-700');
  });

  it('shows a ticket of another event in orange', () => {
    render(<ScanResult outcome="wrong_event" firstUsedAt={null} />);

    expect(screen.getByRole('status')).toHaveTextContent('MAUVAIS ÉVÉNEMENT');
    expect(screen.getByRole('status')).toHaveClass('bg-orange-500');
  });

  it('shows an unknown ticket in red', () => {
    render(<ScanResult outcome="unknown" firstUsedAt={null} />);

    expect(screen.getByRole('status')).toHaveTextContent('BILLET INCONNU');
    expect(screen.getByRole('status')).toHaveClass('bg-red-700');
  });
});
