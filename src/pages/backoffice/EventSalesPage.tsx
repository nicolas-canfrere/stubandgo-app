import { Link, useParams } from 'react-router-dom';
import { useEventSales } from '../../api/backofficeQueries';
import { formatEuros } from '../../format';
import { BackofficeProblemNotice } from './BackofficeProblemNotice';

export function EventSalesPage() {
  const { eventId = '' } = useParams();
  const sales = useEventSales(eventId);

  return (
    <section className="flex flex-col gap-3">
      <h1 className="text-2xl font-bold">Ventes</h1>
      <Link to={`/espace/events/${eventId}`} className="self-start text-indigo-700 underline">
        Retour à l'événement
      </Link>
      {sales.isPending && <p className="text-slate-600">Chargement…</p>}
      {sales.isError && <BackofficeProblemNotice problem={sales.error} />}
      {sales.isSuccess && (
        <>
          <table className="w-full text-left">
            <thead>
              <tr>
                <th>Tarif</th>
                <th>Billets vendus</th>
                <th>Montant</th>
              </tr>
            </thead>
            <tbody>
              {sales.data.priceTiers.map((tier) => (
                <tr key={tier.priceTierId} className="border-t border-slate-200">
                  <td>{tier.label}</td>
                  <td>{tier.ticketsSold}</td>
                  <td>{formatEuros(tier.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="flex flex-col gap-1">
            <li>Billets vendus : {sales.data.ticketsSold}</li>
            <li>Places restantes : {sales.data.seatsRemaining}</li>
            <li>Total des ventes : {formatEuros(sales.data.totalCents)}</li>
            <li>Commission de la plateforme : {formatEuros(sales.data.commissionCents)}</li>
            <li className="font-semibold">
              Net dû à l'organisation : {formatEuros(sales.data.netCents)}
            </li>
          </ul>
        </>
      )}
    </section>
  );
}
