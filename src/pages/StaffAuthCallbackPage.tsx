import { AuthCallbackPage } from './AuthCallbackPage';

/** The staff realm's callback: same exchange as the organizations', back to the platform space. */
export function StaffAuthCallbackPage() {
  return <AuthCallbackPage home="/plateforme" />;
}
