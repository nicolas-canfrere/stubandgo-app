// Regenerates the PNG fixtures of src/scan/decodeQr.test.ts:
//   docker compose run --rm --no-deps node node scripts/generate-qr-fixtures.mjs
// The ticket image mimics the API email (EndroidQrCodeRenderer: 300 px, black on white, error
// correction L, the QR code encodes the raw token only). The token is a fake one, shaped like a
// real one (43 base64url characters). The zxing QRCodeWriter is not used: it produces unreadable
// codes for some payloads, this one included.
import { writeFileSync } from 'node:fs';
import pngjs from 'pngjs';
import QRCode from 'qrcode';

const TOKEN = 'Zt8_Qm2-vK9xLw4RnB7cYp1HsD3fGj6TuE0aWq5iXoM';
const SIZE = 300;
const directory = new URL('../src/scan/__fixtures__/', import.meta.url);

if (!/^[A-Za-z0-9_-]{43}$/.test(TOKEN)) {
  throw new Error('The fixture token must be 43 base64url characters.');
}

await QRCode.toFile(new URL('ticket-qr.png', directory).pathname, TOKEN, {
  errorCorrectionLevel: 'L',
  width: SIZE,
  margin: 2,
});

const noQr = new pngjs.PNG({ width: SIZE, height: SIZE });
for (let pixel = 0; pixel < SIZE * SIZE; pixel++) {
  const x = pixel % SIZE;
  const y = Math.floor(pixel / SIZE);
  const value = Math.floor((x + y) / 20) % 2 === 0 ? 0 : 255;
  noQr.data.set([value, value, value, 255], pixel * 4);
}
writeFileSync(new URL('no-qr.png', directory), pngjs.PNG.sync.write(noQr));
