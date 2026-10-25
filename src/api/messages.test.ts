import { describe, expect, it } from 'vitest';
import { problemMessage } from './messages';
import { ApiProblem } from './problem';

const message = (code: string) => problemMessage(new ApiProblem({ code, status: 400, detail: '' }));

describe('problemMessage', () => {
  it.each([
    ['sold_out', 'Plus assez de places pour cette commande.'],
    ['order_too_large', '10 billets maximum par commande.'],
    ['payment_declined', 'Paiement refusé, vos places ont été libérées.'],
    ['order_expired', 'Réservation expirée, vos places ont été libérées.'],
    ['unauthorized', 'Votre session a expiré.'],
    ['forbidden', 'Ce billet ne peut pas être contrôlé avec votre compte.'],
    ['organization_slug_taken', 'Cet identifiant est déjà utilisé par une autre organisation.'],
    ['organization_name_taken', 'Ce nom est déjà utilisé par une autre organisation.'],
    [
      'organization_not_active',
      "L'organisation n'est pas encore active : relancez sa création avant d'inviter un membre.",
    ],
    ['member_already_exists', 'Ce membre existe déjà : cette adresse email a déjà un compte.'],
    [
      'identity_provider_unavailable',
      "Le fournisseur d'identité ne répond pas. Réessayez dans un instant.",
    ],
    ['something_else', 'Une erreur est survenue. Réessayez.'],
  ])('translates %s', (code, expected) => {
    expect(message(code)).toBe(expected);
  });

  it('names the configured API URL when unreachable', () => {
    expect(message('api_unreachable')).toBe(
      "L'API ne répond pas sur http://localhost:8080 — la stack de l'API est-elle lancée ?",
    );
  });
});
