// Read a picture's pixels the way the picture scan does. The flat picture, the globe and the
// measuring tool (web/measure) all call this, so every number comes from the same pixels the app
// plays. In practice mode there is no NASA image: it makes the TEST INPUT picture instead
// (audio/scanScore.ts, makeTestPicture), which is not NASA data and says so on screen.
import { makeTestPicture, maskFromPixels, resampleMask, type Pixels } from '../audio/scanScore';

export interface LoadedPicture {
  /** URL shown on screen. */
  href: string;
  pixels: Pixels;
  /** true: the made-up TEST INPUT picture, not NASA data. */
  isTest: boolean;
}

/** With no URL it makes a TEST INPUT picture (`make`; the ocean's three dots by default), which is
 *  not NASA data. */
export function loadPicture(imageUrl: string | null, make: () => Pixels = makeTestPicture): Promise<LoadedPicture> {
  if (!imageUrl) {
    const pixels = make();
    const canvas = document.createElement('canvas');
    canvas.width = pixels.width;
    canvas.height = pixels.height;
    canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(pixels.data), pixels.width, pixels.height), 0, 0);
    return Promise.resolve({ href: canvas.toDataURL('image/png'), pixels, isTest: true });
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return reject(new Error('This browser cannot read the picture.'));
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      resolve({ href: imageUrl, pixels: { data: data.data, width: data.width, height: data.height }, isTest: false });
    };
    img.onerror = () => reject(new Error('The picture did not load.'));
    img.src = imageUrl;
  });
}

/** Read a picture's mask (white = never read) and fit it to a still of `width` × `height`, nearest
 *  pixel. The app and the measuring tool both call this, so they mask the same pixels. */
export async function loadMask(url: string, width: number, height: number): Promise<Uint8Array> {
  const { pixels } = await loadPicture(url);
  return resampleMask(maskFromPixels(pixels), pixels.width, pixels.height, width, height);
}
