import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { reduitTierId, rockEventDetail } from '../test/fixtures';
import { renderWithProviders } from '../test/render';
import type { OrderDraft } from '../orders/orderDraft';
import { OrderForm } from './OrderForm';

function renderForm(draft: OrderDraft | null = null) {
  return renderWithProviders(
    <OrderForm
      eventId={rockEventDetail.id}
      priceTiers={rockEventDetail.priceTiers}
      draft={draft}
    />,
  );
}

describe('OrderForm', () => {
  it('computes an indicative total from the quantities', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Ajouter un billet Plein' }));
    await user.click(screen.getByRole('button', { name: 'Ajouter un billet Réduit' }));

    expect(screen.getByText('Total : 40,00 €')).toBeInTheDocument();
  });

  it('does not go below zero for a tier', async () => {
    const user = userEvent.setup();
    renderForm();

    expect(screen.getByRole('button', { name: 'Retirer un billet Plein' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Ajouter un billet Plein' }));
    await user.click(screen.getByRole('button', { name: 'Retirer un billet Plein' }));

    expect(screen.getByRole('status', { name: 'Quantité Plein' })).toHaveTextContent('0');
  });

  it('disables the button without ticket and above 10 tickets, with a reminder', async () => {
    const user = userEvent.setup();
    renderForm();
    const button = screen.getByRole('button', { name: 'Réserver et payer' });

    expect(screen.getByText('10 billets maximum par commande')).toBeInTheDocument();
    expect(button).toBeDisabled();

    for (let i = 0; i < 10; i++) {
      await user.click(screen.getByRole('button', { name: 'Ajouter un billet Plein' }));
    }
    expect(button).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Ajouter un billet Réduit' }));
    expect(button).toBeDisabled();
  });

  it('prefills the email and the quantities from a draft', () => {
    renderForm({ buyerEmail: 'back@example.com', quantities: { [reduitTierId]: 3 } });

    expect(screen.getByLabelText('Email')).toHaveValue('back@example.com');
    expect(screen.getByRole('status', { name: 'Quantité Réduit' })).toHaveTextContent('3');
    expect(screen.getByRole('status', { name: 'Quantité Plein' })).toHaveTextContent('0');
    expect(screen.getByText('Total : 45,00 €')).toBeInTheDocument();
  });
});
