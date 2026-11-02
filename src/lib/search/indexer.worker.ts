// Embeds photos and letters in Steven's browser for the search index, off the main thread.
import { AutoConfig, AutoModel, AutoProcessor, RawImage } from '@huggingface/transformers';
import { NO_WEBGPU, hasWebGpu } from './webgpu';

const MODEL = 'onnx-community/embeddinggemma-2-ONNX';
const THUMB_SIZE = 256;
const MODEL_INPUT_SIZE = 1024; // the processor resizes again; this only bounds decode work

export type WorkerRequest =
  | { id: number; type: 'load' }
  | { id: number; type: 'photo'; url: string }
  | { id: number; type: 'text'; text: string };

export type PhotoEmbedding = { embedding: number[]; thumb: Blob; color: string; width: number; height: number };

export type WorkerResponse =
  | { id: number; type: 'progress'; loaded: number; total: number }
  | { id: number; type: 'ready' }
  | { id: number; type: 'photo'; result: PhotoEmbedding }
  | { id: number; type: 'text'; embedding: number[] }
  | { id: number; type: 'error'; message: string };

type Loaded = { processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>; model: Awaited<ReturnType<typeof AutoModel.from_pretrained>> };
let loading: Promise<Loaded> | null = null;
const post = (message: WorkerResponse) => (self as unknown as Worker).postMessage(message);

function load(id: number) {
  loading ??= (async () => {
    if (!await hasWebGpu()) throw new Error(NO_WEBGPU);
    const files = new Map<string, { loaded: number; total: number }>();
    const progress_callback = (event: { status: string; file?: string; loaded?: number; total?: number }) => {
      if (event.status !== 'progress' || !event.file) return;
      files.set(event.file, { loaded: event.loaded ?? 0, total: event.total ?? 0 });
      const sum = [...files.values()].reduce((all, file) => ({ loaded: all.loaded + file.loaded, total: all.total + file.total }), { loaded: 0, total: 0 });
      post({ id, type: 'progress', ...sum });
    };
    const config = await AutoConfig.from_pretrained(MODEL);
    Object.assign(config, { audio_config: null }); // photos and text only
    const [processor, model] = await Promise.all([
      AutoProcessor.from_pretrained(MODEL),
      AutoModel.from_pretrained(MODEL, { config, device: 'webgpu', dtype: 'q4', progress_callback }),
    ]);
    return { processor, model } as Loaded;
  })().catch(error => { loading = null; throw error; });
  return loading;
}

function draw(bitmap: ImageBitmap, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = new OffscreenCanvas(Math.max(1, Math.round(bitmap.width * scale)), Math.max(1, Math.round(bitmap.height * scale)));
  const context = canvas.getContext('2d')!;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return { canvas, context };
}

async function embedPhoto(url: string): Promise<PhotoEmbedding> {
  const { processor, model } = await load(0);
  // Revalidate: a photo replaced in Storage must not be read from a stale browser cache.
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Photo download failed (${response.status}).`);
  // createImageBitmap applies EXIF orientation, so phone photos come out upright.
  const bitmap = await createImageBitmap(await response.blob());
  try {
    const input = draw(bitmap, MODEL_INPUT_SIZE);
    const pixels = input.context.getImageData(0, 0, input.canvas.width, input.canvas.height);
    const image = new RawImage(pixels.data, pixels.width, pixels.height, 4).rgb();
    const { sentence_embedding } = await model(await processor(null, [[image]]));

    const thumb = draw(bitmap, THUMB_SIZE).canvas;
    const swatch = draw(bitmap, 1).context.getImageData(0, 0, 1, 1).data;
    return {
      embedding: Array.from(sentence_embedding.data as Float32Array),
      thumb: await thumb.convertToBlob({ type: 'image/webp', quality: 0.75 }),
      color: `#${[swatch[0], swatch[1], swatch[2]].map(value => value.toString(16).padStart(2, '0')).join('')}`,
      width: bitmap.width,
      height: bitmap.height,
    };
  } finally {
    bitmap.close();
  }
}

async function embedText(text: string) {
  const { processor, model } = await load(0);
  const { sentence_embedding } = await model(await processor([text]));
  return Array.from(sentence_embedding.data as Float32Array);
}

self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  try {
    if (data.type === 'load') {
      await load(data.id);
      post({ id: data.id, type: 'ready' });
    }
    else if (data.type === 'photo') post({ id: data.id, type: 'photo', result: await embedPhoto(data.url) });
    else post({ id: data.id, type: 'text', embedding: await embedText(data.text) });
  } catch (error) {
    post({ id: data.id, type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
