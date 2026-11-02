// Finds and describes faces in Steven's browser for the People page, off the main thread.
// Human (MIT) runs the face detector, mesh, and description models on WebGPU or WebGL.
import { Human } from '@vladmandic/human';
import { FACE_DETECT_SIZE, FACE_MIN_FRACTION, FACE_MIN_PX, FACE_MIN_SCORE } from './faceConfig';
import type { FaceBox } from './types';

// Models come from the CDN copy of the installed version, so code and weights always match.
// Human reads modelBasePath only when it is constructed, so the version is spelled out here;
// package.json pins the same exact version.
const HUMAN_VERSION = '3.3.6';
const MODELS = `https://cdn.jsdelivr.net/npm/@vladmandic/human@${HUMAN_VERSION}/models/`;

const THUMB_SIZE = 128;
const THUMB_MARGIN = 0.25; // share of the face's size added on each side of the crop

export type FacesRequest = { id: number; type: 'load' } | { id: number; type: 'scan'; url: string };

export type FoundFace = { box: FaceBox; score: number; embedding: number[]; thumb: Blob };

export type FacesResponse =
  | { id: number; type: 'ready' }
  | { id: number; type: 'faces'; faces: FoundFace[] }
  | { id: number; type: 'error'; message: string };

const post = (message: FacesResponse) => (self as unknown as Worker).postMessage(message);

let loading: Promise<Human> | null = null;

function load() {
  loading ??= (async () => {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    const webgpu = !!gpu && !!await gpu.requestAdapter().catch(() => null);
    const human = new Human({
      backend: webgpu ? 'webgpu' : 'humangl',
      modelBasePath: MODELS,
      debug: false,
      filter: { enabled: false },
      gesture: { enabled: false },
      body: { enabled: false },
      hand: { enabled: false },
      object: { enabled: false },
      segmentation: { enabled: false },
      face: {
        enabled: true,
        detector: { rotation: true, maxDetected: 30, minConfidence: FACE_MIN_SCORE, return: false },
        mesh: { enabled: true }, // aligns the face for the description model
        iris: { enabled: false },
        description: { enabled: true },
        emotion: { enabled: false },
        antispoof: { enabled: false },
        liveness: { enabled: false },
        attention: { enabled: false },
      },
    });
    if (human.version !== HUMAN_VERSION) throw new Error(`Face models are for Human ${HUMAN_VERSION}, not ${human.version}.`);
    await human.load();
    await human.warmup();
    return human;
  })().catch(error => { loading = null; throw error; });
  return loading;
}

const normalise = (values: ArrayLike<number>) => {
  const length = Math.hypot(...Array.from(values));
  return Array.from(values, value => value / (length || 1));
};

async function scan(url: string): Promise<FoundFace[]> {
  const human = await load();
  // Revalidate: a photo replaced in Storage must not be read from a stale browser cache.
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Photo download failed (${response.status}).`);
  // createImageBitmap applies EXIF orientation, so phone photos come out upright.
  const bitmap = await createImageBitmap(await response.blob());
  try {
    const scale = Math.min(1, FACE_DETECT_SIZE / Math.max(bitmap.width, bitmap.height));
    const canvas = new OffscreenCanvas(Math.max(1, Math.round(bitmap.width * scale)), Math.max(1, Math.round(bitmap.height * scale)));
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const result = await human.detect(canvas);
    const short = Math.min(canvas.width, canvas.height);
    const found: FoundFace[] = [];
    for (const face of result.face) {
      const [x, y, width, height] = face.box;
      const side = Math.max(width, height);
      if (!face.embedding?.length || face.score < FACE_MIN_SCORE || side < FACE_MIN_PX || side / short < FACE_MIN_FRACTION) continue;
      found.push({
        box: { x: x / canvas.width, y: y / canvas.height, width: width / canvas.width, height: height / canvas.height },
        score: face.score,
        embedding: normalise(face.embedding),
        thumb: await crop(canvas, x + width / 2, y + height / 2, side * (1 + THUMB_MARGIN * 2)),
      });
    }
    return found;
  } finally {
    bitmap.close();
  }
}

function crop(source: OffscreenCanvas, centreX: number, centreY: number, side: number) {
  const thumb = new OffscreenCanvas(THUMB_SIZE, THUMB_SIZE);
  const context = thumb.getContext('2d')!;
  context.fillStyle = '#f5d6e2'; // the atlas's pink, behind a face near the photo's edge
  context.fillRect(0, 0, THUMB_SIZE, THUMB_SIZE);
  context.drawImage(source, centreX - side / 2, centreY - side / 2, side, side, 0, 0, THUMB_SIZE, THUMB_SIZE);
  return thumb.convertToBlob({ type: 'image/webp', quality: 0.8 });
}

self.onmessage = async ({ data }: MessageEvent<FacesRequest>) => {
  try {
    if (data.type === 'load') {
      await load();
      post({ id: data.id, type: 'ready' });
    } else post({ id: data.id, type: 'faces', faces: await scan(data.url) });
  } catch (error) {
    post({ id: data.id, type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
