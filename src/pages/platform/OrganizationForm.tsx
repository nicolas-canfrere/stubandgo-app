import { useState, type FormEvent } from 'react';
import { useCreateOrganization } from '../../api/platformQueries';
import { StaffProblemNotice } from './StaffProblemNotice';
import { parsePercent } from '../../money';

const inputClass = 'rounded-md border border-slate-300 px-2 py-1';

export function OrganizationForm() {
  const create = useCreateOrganization();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [rate, setRate] = useState('');
  const [rateError, setRateError] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const commissionBasisPoints = parsePercent(rate);
    setRateError(commissionBasisPoints === null);
    if (commissionBasisPoints === null) {
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
      {rateError && (
        <p role="alert" className="text-red-700">
          Commission invalide : un pourcentage de 0 à 100, avec deux décimales au plus.
        </p>
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
