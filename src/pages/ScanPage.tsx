import { useRef, useState } from 'react';
import { useScanTicket, useUpcomingEvents } from '../api/queries';
import { ProblemNotice } from '../components/ProblemNotice';
import { formatDateTime } from '../format';
import { CameraScanner } from '../scan/CameraScanner';
import { decodeQrFromFile } from '../scan/decodeQr';
import { ImageDropZone } from '../scan/ImageDropZone';
import { ScanResult } from '../scan/ScanResult';

const CHOOSE_EVENT = "Choisissez d'abord l'événement contrôlé.";
const NO_QR = 'Aucun QR code lisible dans cette image.';

export function ScanPage() {
  const events = useUpcomingEvents();
  const [eventId, setEventId] = useState('');
  const scan = useScanTicket();
  // The current selection, readable after an await (state captured in a closure would be stale).
  const selectedEvent = useRef('');
  const [notice, setNotice] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  if (events.error) {
    return <ProblemNotice problem={events.error} />;
  }

  // The token only travels from the decoder to the API call: never stored in state, never shown.
  const submitToken = (token: string) => {
    setNotice(null);
    scan.mutate({ eventId, token });
  };

  const submitFile = async (file: File) => {
    scan.reset();
    if (eventId === '') {
      setNotice(CHOOSE_EVENT);
      return;
    }
    setNotice(null);
    setReading(true);
    const scannedEvent = eventId;
    const token = await decodeQrFromFile(file);
    setReading(false);
    // The selection changed while decoding: the token no longer belongs to the chosen event.
    if (selectedEvent.current !== scannedEvent) {
      return;
    }
    if (token === null) {
      setNotice(NO_QR);
      return;
    }
    scan.mutate({ eventId: scannedEvent, token });
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Contrôle d'accès</h1>
      <div>
        <label htmlFor="scan-event" className="block text-sm font-medium">
          Événement contrôlé
        </label>
        <select
          id="scan-event"
          value={eventId}
          disabled={events.isPending}
          onChange={(event) => {
            selectedEvent.current = event.target.value;
            setEventId(event.target.value);
            setNotice(null);
            scan.reset();
          }}
          className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2"
        >
          <option value="">{events.isPending ? 'Chargement…' : '— Choisir —'}</option>
          {events.data?.map((event) => (
            <option key={event.id} value={event.id}>
              {`${event.title} — ${formatDateTime(event.startsAt)}`}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {/* One camera session per event: switching events stops the camera. */}
        <CameraScanner key={eventId} disabled={eventId === ''} onToken={submitToken} />
        <ImageDropZone onFile={submitFile} />
      </div>
      {notice !== null && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-red-900">
          {notice}
        </p>
      )}
      {reading && <p className="text-slate-600">Lecture de l'image…</p>}
      {scan.isPending && <p className="text-slate-600">Vérification du billet…</p>}
      {scan.error && <ProblemNotice problem={scan.error} />}
      {scan.data && <ScanResult outcome={scan.data.outcome} firstUsedAt={scan.data.firstUsedAt} />}
    </section>
  );
}
