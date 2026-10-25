import { useState, type FormEvent } from 'react';
import { useChangeCommissionRate, type PlatformOrganization } from '../../api/platformQueries';
import { ProblemNotice } from '../../components/ProblemNotice';
import { parsePercent } from '../../money';

/** The current rate as typed in a field: basis points to percent, with a decimal comma. */
function rateInput(basisPoints: number): string {
  return String(basisPoints / 100).replace('.', ',');
}

export function CommissionRateForm({ organization }: { organization: PlatformOrganization }) {
  const change = useChangeCommissionRate();
  const [rate, setRate] = useState(rateInput(organization.commissionBasisPoints));
  const [invalid, setInvalid] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const commissionBasisPoints = parsePercent(rate);
    setInvalid(commissionBasisPoints === null);
    if (commissionBasisPoints !== null) {
      change.mutate({ organizationId: organization.id, commissionBasisPoints });
    }
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input
        aria-label={`Nouveau taux de ${organization.name} (%)`}
        aria-invalid={invalid}
        className="w-20 rounded-md border border-slate-300 px-2 py-1"
        inputMode="decimal"
        value={rate}
        onChange={(e) => setRate(e.target.value)}
      />
      <button
        type="submit"
        aria-label={`Modifier le taux de ${organization.name}`}
        disabled={change.isPending}
        className="text-indigo-700 underline disabled:opacity-50"
      >
        Modifier
      </button>
      {invalid && (
        <span role="alert" className="text-red-700">
          Taux invalide (0 à 100, deux décimales au plus).
        </span>
      )}
      {change.error && <ProblemNotice problem={change.error} />}
    </form>
  );
}
