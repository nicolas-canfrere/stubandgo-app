// @vitest-environment node
// jsdom has no canvas: the browser pixel reader (createImageBitmap + canvas) is swapped for a PNG
// decoder; the pixels then go through the same zxing path as in the browser.
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { decodeQrFromFile, type Pixels } from './decodeQr';

// Token encoded in __fixtures__/ticket-qr.png (see scripts/generate-qr-fixtures.mjs).
const FIXTURE_TOKEN = 'Zt8_Qm2-vK9xLw4RnB7cYp1HsD3fGj6TuE0aWq5iXoM';

function fixture(name: string): File {
  const bytes = readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url));

  return new File([bytes], name, { type: 'image/png' });
}

async function readPngPixels(file: File): Promise<Pixels> {
  const png = PNG.sync.read(Buffer.from(await file.arrayBuffer()));

  return { data: png.data, width: png.width, height: png.height };
}

describe('decodeQrFromFile', () => {
  it('reads the token encoded in a ticket QR code image', async () => {
    await expect(decodeQrFromFile(fixture('ticket-qr.png'), readPngPixels)).resolves.toBe(
      FIXTURE_TOKEN,
    );
  });

  it('returns null for an image without QR code', async () => {
    await expect(decodeQrFromFile(fixture('no-qr.png'), readPngPixels)).resolves.toBeNull();
  });

  it('returns null when the file cannot be read as an image', async () => {
    const notAnImage = new File(['hello'], 'notes.png', { type: 'image/png' });

    await expect(decodeQrFromFile(notAnImage, readPngPixels)).resolves.toBeNull();
  });
});
