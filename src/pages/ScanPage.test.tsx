import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, vi, type MockInstance } from 'vitest';
import { API_URL } from '../api/client';
import type { IScannerControls } from '@zxing/browser';
import type { Result } from '@zxing/library';
import { decodeQrFromFile, qrReader } from '../scan/decodeQr';
import { intimateEvent, rockEvent } from '../test/fixtures';
import { renderWithProviders } from '../test/render';
import { server } from '../test/server';
import { ScanPage } from './ScanPage';

vi.mock('../scan/decodeQr', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../scan/decodeQr')>()),
  decodeQrFromFile: vi.fn(),
}));

const decodeMock = vi.mocked(decodeQrFromFile);
const token = 'gKLhZN-ot9fBxtYtPWJNQkFE2j03nIhf5Rfh3Q52pww';
const scansUrl = `${API_URL}/api/events/${rockEvent.id}/scans`;
const consoleMethods = ['log', 'info', 'warn', 'error', 'debug'] as const;
let consoleSpies: MockInstance[] = [];

function serveEvents() {
  server.use(
    http.get(`${API_URL}/api/events`, () => HttpResponse.json([rockEvent, intimateEvent])),
  );
}

function serveScan(outcome: string, firstUsedAt: string | null = null) {
  const bodies: unknown[] = [];
  server.use(
    http.post(scansUrl, async ({ request }) => {
      bodies.push(await request.json());

      return HttpResponse.json({ outcome, firstUsedAt });
    }),
  );

  return bodies;
}

function stubMediaDevices(value: unknown) {
  Object.defineProperty(navigator, 'mediaDevices', { value, configurable: true });
}

type FrameCallback = Parameters<typeof qrReader.decodeFromVideoDevice>[2];

/** Fakes the camera: returns a function that feeds frames to the latest decoding session. */
function fakeCamera() {
  stubMediaDevices({ getUserMedia: vi.fn() });
  const sessions: FrameCallback[] = [];
  const controls: IScannerControls = { stop: vi.fn() };
  vi.spyOn(qrReader, 'decodeFromVideoDevice').mockImplementation(
    async (_device, _video, onFrame) => {
      sessions.push(onFrame);

      return controls;
    },
  );
  const frame = { getText: () => token } as Result;

  return {
    sessions,
    showQr: (frames: number) =>
      act(() => {
        for (let i = 0; i < frames; i++) {
          sessions.at(-1)?.(frame, undefined, controls);
        }
      }),
  };
}

const image = () => new File(['png'], 'billet.png', { type: 'image/png' });

async function chooseRockEvent() {
  await userEvent.selectOptions(
    await screen.findByLabelText('Événement contrôlé'),
    await screen.findByRole('option', { name: /Soirée Rock/ }),
  );
}

function dropImage() {
  fireEvent.drop(screen.getByRole('region', { name: 'Image du QR code' }), {
    dataTransfer: { files: [image()], types: ['Files'] },
  });
}

beforeEach(() => {
  decodeMock.mockReset();
  consoleSpies = consoleMethods.map((method) => vi.spyOn(console, method));
});

afterEach(() => {
  // The token is a bearer secret: nothing on the scan path may log, let alone log the token.
  consoleSpies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
  vi.restoreAllMocks();
  stubMediaDevices(undefined);
});

describe('ScanPage', () => {
  it('lists the upcoming events to control', async () => {
    serveEvents();

    renderWithProviders(<ScanPage />, { route: '/scan' });

    expect(
      await screen.findByRole('option', { name: 'Soirée Rock — mer. 25 nov. 2026 · 20:00' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Concert Intimiste — mer. 9 déc. 2026 · 20:00' }),
    ).toBeInTheDocument();
  });

  it.each([
    ['valid', null, 'VALIDE — entrée autorisée'],
    ['already_used', '2026-11-27T19:04:00Z', 'DÉJÀ UTILISÉ — le ven. 27 nov. 2026 · 20:04'],
    ['wrong_event', null, 'MAUVAIS ÉVÉNEMENT'],
    ['unknown', null, 'BILLET INCONNU'],
  ])('scans the dropped image for the chosen event: %s', async (outcome, firstUsedAt, message) => {
    serveEvents();
    const bodies = serveScan(outcome, firstUsedAt);
    decodeMock.mockResolvedValue(token);
    renderWithProviders(<ScanPage />, { route: '/scan' });
    await chooseRockEvent();

    dropImage();

    expect(await screen.findByRole('status')).toHaveTextContent(message);
    expect(bodies).toEqual([{ token }]);
    expect(document.body.innerHTML).not.toContain(token);
  });

  it('scans an image chosen with the file picker', async () => {
    serveEvents();
    const bodies = serveScan('valid');
    decodeMock.mockResolvedValue(token);
    renderWithProviders(<ScanPage />, { route: '/scan' });
    await chooseRockEvent();

    await userEvent.upload(screen.getByLabelText('Choisir une image'), image());

    expect(await screen.findByRole('status')).toHaveTextContent('VALIDE — entrée autorisée');
    expect(bodies).toEqual([{ token }]);
  });

  it('refuses the image until the controlled event is chosen', async () => {
    serveEvents();
    renderWithProviders(<ScanPage />, { route: '/scan' });
    await screen.findByRole('option', { name: /Soirée Rock/ });

    dropImage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Choisissez d'abord l'événement contrôlé",
    );
    expect(decodeMock).not.toHaveBeenCalled();
  });

  it('keeps the camera off until the controlled event is chosen', async () => {
    serveEvents();
    renderWithProviders(<ScanPage />, { route: '/scan' });
    await screen.findByRole('option', { name: /Soirée Rock/ });

    expect(screen.getByRole('button', { name: 'Démarrer la caméra' })).toBeDisabled();
    await chooseRockEvent();
    expect(screen.getByRole('button', { name: 'Démarrer la caméra' })).toBeEnabled();
  });

  it('says so when the image has no readable QR code, without calling the API', async () => {
    serveEvents();
    const bodies = serveScan('valid');
    decodeMock.mockResolvedValue(null);
    renderWithProviders(<ScanPage />, { route: '/scan' });
    await chooseRockEvent();

    dropImage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Aucun QR code lisible dans cette image',
    );
    expect(bodies).toEqual([]);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('explains a missing camera and keeps the image drop available', async () => {
    serveEvents();
    const bodies = serveScan('valid');
    decodeMock.mockResolvedValue(token);
    stubMediaDevices(undefined);
    renderWithProviders(<ScanPage />, { route: '/scan' });
    await chooseRockEvent();

    await userEvent.click(screen.getByRole('button', { name: 'Démarrer la caméra' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Aucune caméra disponible sur cet appareil : déposez plutôt l'image du QR code.",
    );
    dropImage();
    expect(await screen.findByRole('status')).toHaveTextContent('VALIDE — entrée autorisée');
    expect(bodies).toEqual([{ token }]);
  });

  it('explains a refused camera and keeps the image drop available', async () => {
    serveEvents();
    const bodies = serveScan('valid');
    decodeMock.mockResolvedValue(token);
    const getUserMedia = vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError'));
    stubMediaDevices({ getUserMedia });
    renderWithProviders(<ScanPage />, { route: '/scan' });
    await chooseRockEvent();

    await userEvent.click(screen.getByRole('button', { name: 'Démarrer la caméra' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Accès à la caméra refusé : autorisez-le dans le navigateur ou déposez plutôt l'image du QR code.",
    );
    expect(getUserMedia).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Démarrer la caméra' })).toBeEnabled();
    dropImage();
    await waitFor(() => expect(bodies).toEqual([{ token }]));
  });

  it('passes a QR code held in front of the camera on once, not once per frame', async () => {
    serveEvents();
    const bodies = serveScan('valid');
    const camera = fakeCamera();
    renderWithProviders(<ScanPage />, { route: '/scan' });
    await chooseRockEvent();
    await userEvent.click(screen.getByRole('button', { name: 'Démarrer la caméra' }));
    await screen.findByRole('button', { name: 'Arrêter la caméra' });

    await camera.showQr(5);

    expect(await screen.findByRole('status')).toHaveTextContent('VALIDE — entrée autorisée');
    expect(bodies).toEqual([{ token }]);
    expect(document.body.innerHTML).not.toContain(token);
  });

  it('lets the same QR code through again after the camera is stopped and restarted', async () => {
    serveEvents();
    const bodies = serveScan('already_used', '2026-11-27T19:04:00Z');
    const camera = fakeCamera();
    renderWithProviders(<ScanPage />, { route: '/scan' });
    await chooseRockEvent();
    await userEvent.click(screen.getByRole('button', { name: 'Démarrer la caméra' }));
    await camera.showQr(3);
    await waitFor(() => expect(bodies).toHaveLength(1));

    await userEvent.click(await screen.findByRole('button', { name: 'Arrêter la caméra' }));
    await userEvent.click(screen.getByRole('button', { name: 'Démarrer la caméra' }));
    await screen.findByRole('button', { name: 'Arrêter la caméra' });
    await camera.showQr(3);

    await waitFor(() => expect(bodies).toEqual([{ token }, { token }]));
    expect(camera.sessions).toHaveLength(2);
  });

  it('shows the unreachable API message instead of an empty page', async () => {
    server.use(http.get(`${API_URL}/api/events`, () => HttpResponse.error()));

    renderWithProviders(<ScanPage />, { route: '/scan' });

    expect(await screen.findByRole('heading', { name: 'API injoignable' })).toBeInTheDocument();
  });
});
