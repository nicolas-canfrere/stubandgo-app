import { useState, type FormEvent } from 'react';
import {
  useInviteMember,
  type InviteMemberBody,
  type PlatformOrganization,
} from '../../api/platformQueries';
import { ProblemNotice } from '../../components/ProblemNotice';

const inputClass = 'rounded-md border border-slate-300 px-2 py-1';

/** Invites a member into an active organization (a pending one has no Keycloak organization yet). */
export function InviteMemberForm({ organizations }: { organizations: PlatformOrganization[] }) {
  const invite = useInviteMember();
  const [organizationId, setOrganizationId] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteMemberBody['role']>('admin');
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
  const active = organizations.filter((organization) => organization.status === 'active');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const target = email.trim();
    setInvitedEmail(null);
    invite.mutate(
      { organizationId, body: { email: target, role } },
      {
        onSuccess: () => {
          setInvitedEmail(target);
          setEmail('');
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Inviter un membre</h2>
      <label className="flex flex-col gap-1">
        Organisation
        <select
          className={inputClass}
          value={organizationId}
          onChange={(e) => setOrganizationId(e.target.value)}
          required
        >
          <option value="" disabled>
            Choisir…
          </option>
          {active.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        Email
        <input
          type="email"
          className={inputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <label className="flex flex-col gap-1">
        Rôle
        <select
          className={inputClass}
          value={role}
          onChange={(e) => setRole(e.target.value as InviteMemberBody['role'])}
        >
          <option value="admin">Administrateur</option>
          <option value="controller">Contrôleur</option>
        </select>
      </label>
      {invitedEmail !== null && (
        <p role="status" className="text-green-800">
          Invitation envoyée à {invitedEmail}.
        </p>
      )}
      {invite.error && <ProblemNotice problem={invite.error} />}
      <button
        type="submit"
        disabled={invite.isPending}
        className="self-start rounded-md bg-indigo-700 px-3 py-1.5 text-white disabled:opacity-50"
      >
        Envoyer l'invitation
      </button>
    </form>
  );
}
