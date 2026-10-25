import { useState, type FormEvent } from 'react';
import { useCreateOrganization } from '../../api/platformQueries';
import { StaffProblemNotice } from './StaffProblemNotice';
import { parsePercent } from '../../money';

const inputClass = 'rounded-md border border-slate-300 px-2 py-1';

/** The rule of the API Slug value object: 3 to 64 characters, lowercase words joined by single hyphens. */
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SLUG_PROBLEM =
  'Identifiant invalide : 3 à 64 lettres minuscules, chiffres ou tirets simples entre eux.';
const RATE_PROBLEM =
  'Commission invalide : un pourcentage de 0 à 100, avec deux décimales au plus.';

function isSlug(slug: string): boolean {
  return slug.length >= 3 && slug.length <= 64 && SLUG.test(slug);
}

export function OrganizationForm() {
  const create = useCreateOrganization();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [rate, setRate] = useState('');
  const [problems, setProblems] = useState<string[]>([]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const commissionBasisPoints = parsePercent(rate);
    const found = [
      ...(name.trim() === '' ? ['Nom manquant'] : []),
      ...(isSlug(slug.trim()) ? [] : [SLUG_PROBLEM]),
      ...(commissionBasisPoints === null ? [RATE_PROBLEM] : []),
    ];
    setProblems(found);
    if (found.length > 0 || commissionBasisPoints === null) {
      return;
    }
    create.mutate(
      { name: name.trim(), slug: slug.trim(), commissionBasisPoints },
      {
        onSuccess: () => {
          setName('');
          setSlug('');
          setRate('');
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Nouvelle organisation</h2>
      <label className="flex flex-col gap-1">
        Nom
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </label>
      <label className="flex flex-col gap-1">
        Identifiant (slug)
        <input
          className={inputClass}
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
        />
      </label>
      <label className="flex flex-col gap-1">
        Commission (%)
        <input
          className={inputClass}
          inputMode="decimal"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          required
        />
      </label>
      {problems.length > 0 && (
        <div role="alert" className="text-red-700">
          {problems.map((problem) => (
            <p key={problem}>{problem}</p>
          ))}
        </div>
      )}
      {create.error && <StaffProblemNotice problem={create.error} />}
      <button
        type="submit"
        disabled={create.isPending}
        className="self-start rounded-md bg-indigo-700 px-3 py-1.5 text-white disabled:opacity-50"
      >
        Créer l'organisation
      </button>
    </form>
  );
}
