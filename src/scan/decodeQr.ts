import { BrowserQRCodeReader } from '@zxing/browser';
import { BinaryBitmap, HybridBinarizer, RGBLuminanceSource } from '@zxing/library';

/** RGBA pixels, 4 bytes per pixel, row by row. */
export type Pixels = { data: ArrayLike<number>; width: number; height: number };

/** The one QR code decoder of the app: the camera and the dropped images both go through it. */
export const qrReader = new BrowserQRCodeReader();

/**
 * Reads the text of the QR code in an image file (a ticket QR code encodes its token only), or
 * null when the file holds no readable QR code. The pixel reader is replaceable for the tests
 * (jsdom has no canvas). The result is a bearer secret: never display it, never log it.
 */
export async function decodeQrFromFile(
  file: File,
  readPixels: (file: File) => Promise<Pixels> = readPixelsWithCanvas,
): Promise<string | null> {
  let pixels: Pixels;
  try {
    pixels = await readPixels(file);
  } catch {
    return null;
  }

  return decodeQrFromPixels(pixels);
}

function decodeQrFromPixels({ data, width, height }: Pixels): string | null {
  const luminances = new Uint8ClampedArray(width * height);
  for (let pixel = 0; pixel < luminances.length; pixel++) {
    const offset = pixel * 4;
    const alpha = (data[offset + 3] ?? 255) / 255;
    const gray =
      0.299 * (data[offset] ?? 0) +
      0.587 * (data[offset + 1] ?? 0) +
      0.114 * (data[offset + 2] ?? 0);
    // Transparent pixels read as white, the background of a printed or mailed QR code.
    luminances[pixel] = gray * alpha + 255 * (1 - alpha);
  }

  try {
    const bitmap = new BinaryBitmap(
      new HybridBinarizer(new RGBLuminanceSource(luminances, width, height)),
    );

    return qrReader.decodeBitmap(bitmap).getText();
  } catch {
    return null;
  }
}

async function readPixelsWithCanvas(file: File): Promise<Pixels> {
  const image = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    if (context === null) {
      throw new Error('Canvas 2D context unavailable');
    }
    context.drawImage(image, 0, 0);

    return context.getImageData(0, 0, image.width, image.height);
  } finally {
    image.close();
  }
}
