import type { IScannerControls } from '@zxing/browser';
import { useEffect, useRef, useState } from 'react';
import { qrReader } from './decodeQr';

const NO_CAMERA = "Aucune caméra disponible sur cet appareil : déposez plutôt l'image du QR code.";
const REFUSED =
  "Accès à la caméra refusé : autorisez-le dans le navigateur ou déposez plutôt l'image du QR code.";
const UNAVAILABLE = "Caméra indisponible : déposez plutôt l'image du QR code.";

function cameraMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return REFUSED;
    }
    if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
      return NO_CAMERA;
    }
  }

  return UNAVAILABLE;
}

/**
 * Reads QR codes from the camera until stopped. A QR code held in front of the camera is read
 * frame after frame: the same token is passed on once per camera session (remount the component
 * to start a new one), so a valid ticket does not turn into an already used one. The token is a
 * bearer secret: never displayed, never logged.
 */
export function CameraScanner({
  onToken,
  disabled = false,
}: {
  onToken: (token: string) => void;
  disabled?: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const lastToken = useRef<string | null>(null);
  const mounted = useRef(false);
  const onTokenRef = useRef(onToken);
  const [state, setState] = useState<'off' | 'starting' | 'on'>('off');
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    onTokenRef.current = onToken;
  });

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
      controls.current?.stop();
      controls.current = null;
    };
  }, []);

  const start = async () => {
    setProblem(null);
    if (typeof navigator.mediaDevices?.getUserMedia !== 'function') {
      setProblem(NO_CAMERA);
      return;
    }

    setState('starting');
    lastToken.current = null;
    try {
      const started = await qrReader.decodeFromVideoDevice(
        undefined,
        video.current ?? undefined,
        (result) => {
          const token = result?.getText();
          if (token === undefined || token === lastToken.current) {
            return;
          }
          lastToken.current = token;
          onTokenRef.current(token);
        },
      );
      if (!mounted.current) {
        started.stop();
        return;
      }
      controls.current = started;
      setState('on');
    } catch (error) {
      if (mounted.current) {
        setState('off');
        setProblem(cameraMessage(error));
      }
    }
  };

  const stop = () => {
    controls.current?.stop();
    controls.current = null;
    lastToken.current = null;
    setState('off');
  };

  return (
    <section
      aria-label="Caméra"
      className="space-y-3 rounded-md border border-slate-200 bg-white p-4"
    >
      <h2 className="font-semibold">Caméra</h2>
      <video
        ref={video}
        muted
        playsInline
        aria-label="Aperçu de la caméra"
        className={state === 'off' ? 'hidden' : 'w-full max-w-md rounded bg-black'}
      />
      {state === 'off' ? (
        <button
          type="button"
          onClick={start}
          disabled={disabled}
          className="rounded bg-indigo-700 px-4 py-2 font-semibold text-white disabled:opacity-40"
        >
          Démarrer la caméra
        </button>
      ) : (
        <button
          type="button"
          onClick={stop}
          disabled={state === 'starting'}
          className="rounded border border-indigo-700 px-4 py-2 font-semibold text-indigo-700 disabled:opacity-40"
        >
          Arrêter la caméra
        </button>
      )}
      {problem !== null && (
        <p role="alert" className="text-sm text-red-800">
          {problem}
        </p>
      )}
    </section>
  );
}
