import { useState, type FormEvent } from 'react';
import { useInviteOrganizationMember, type InviteMemberBody } from '../../api/backofficeQueries';
import { BackofficeProblemNotice } from './BackofficeProblemNotice';

const inputClass = 'rounded-md border border-slate-300 px-2 py-1';

/** Invites a member into the administrator's own organization (the API reads it from the token). */
export function InviteMemberPage() {
  const invite = useInviteOrganizationMember();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteMemberBody['role']>('controller');
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const target = email.trim();
    setInvitedEmail(null);
    invite.mutate(
      { email: target, role },
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
      <h1 className="text-2xl font-bold">Inviter un membre</h1>
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
          <option value="controller">Contrôleur</option>
          <option value="admin">Administrateur</option>
        </select>
      </label>
      {invitedEmail !== null && (
        <p role="status" className="text-green-800">
          Invitation envoyée à {invitedEmail}.
        </p>
      )}
      {invite.error && <BackofficeProblemNotice problem={invite.error} />}
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
