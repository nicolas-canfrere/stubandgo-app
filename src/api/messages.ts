import { API_URL } from './client';
import { type ApiProblem, UNREACHABLE_CODE } from './problem';

const MESSAGES: Record<string, string> = {
  sold_out: 'Plus assez de places pour cette commande.',
  order_too_large: '10 billets maximum par commande.',
  payment_declined: 'Paiement refusé, vos places ont été libérées.',
  unauthorized: 'Votre session a expiré.',
  forbidden: 'Ce billet ne peut pas être contrôlé avec votre compte.',
  order_expired: 'Réservation expirée, vos places ont été libérées.',
};

export function problemMessage(problem: ApiProblem): string {
  if (problem.code === UNREACHABLE_CODE) {
    return `L'API ne répond pas sur ${API_URL} — la stack de l'API est-elle lancée ?`;
  }

  return MESSAGES[problem.code] ?? 'Une erreur est survenue. Réessayez.';
}
