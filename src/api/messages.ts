import { API_URL } from './client';
import { type ApiProblem, UNREACHABLE_CODE } from './problem';

const MESSAGES: Record<string, string> = {
  sold_out: 'Plus assez de places pour cette commande.',
  order_too_large: '10 billets maximum par commande.',
  payment_declined: 'Paiement refusé, vos places ont été libérées.',
  unauthorized: 'Votre session a expiré.',
  forbidden: "Votre compte n'a pas accès à cette page.",
  invalid_value: "L'API a refusé une valeur saisie.",
  event_without_price_tier: "Ajoutez au moins un tarif avant de publier l'événement.",
  organization_slug_taken: 'Cet identifiant est déjà utilisé par une autre organisation.',
  organization_name_taken: 'Ce nom est déjà utilisé par une autre organisation.',
  organization_not_active:
    "L'organisation n'est pas encore active : relancez sa création avant d'inviter un membre.",
  member_already_exists: 'Ce membre existe déjà : cette adresse email a déjà un compte.',
  identity_provider_unavailable:
    "Le fournisseur d'identité ne répond pas. Réessayez dans un instant.",
  event_locked: "Des places ont été prises : l'événement ne peut plus être modifié ni dépublié.",
  event_not_draft: "L'événement est publié : dépubliez-le avant de le modifier.",
  event_not_published: "L'événement n'est pas publié.",
  event_already_published: "L'événement est déjà publié.",
  event_start_in_past: 'La date de début est déjà passée.',
  order_expired: 'Réservation expirée, vos places ont été libérées.',
};

/** The French message of a problem code; a generic one for a code nobody translated. */
export function codeMessage(code: string): string {
  return MESSAGES[code] ?? 'Une erreur est survenue. Réessayez.';
}

export function problemMessage(problem: ApiProblem): string {
  if (problem.code === UNREACHABLE_CODE) {
    return `L'API ne répond pas sur ${API_URL} — la stack de l'API est-elle lancée ?`;
  }

  // The API names the refused value in the detail (in English): it is the only precise hint.
  if (problem.code === 'invalid_value' && problem.detail !== '') {
    return `L'API a refusé une valeur saisie : ${problem.detail}`;
  }

  return codeMessage(problem.code);
}
