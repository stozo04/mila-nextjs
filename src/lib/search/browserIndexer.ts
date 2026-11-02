'use client';

import { supabase } from '@/lib/supabase';
import { photoUrl, thumbPathFor, type PhotoCollection } from './collections';
import type { IndexItem } from './types';
import type { PhotoEmbedding, WorkerRequest, WorkerResponse } from './indexer.worker';

type Pending = { resolve: (value: WorkerResponse) => void; reject: (error: Error) => void; onProgress?: (loaded: number, total: number) => void };

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();

type WithoutId<T> = T extends unknown ? Omit<T, 'id'> : never;
type Request = WithoutId<WorkerRequest>;

function call(request: Request, onProgress?: Pending['onProgress']) {
  if (!worker) {
    worker = new Worker(new URL('./indexer.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
      const job = pending.get(data.id);
      if (!job) return;
      if (data.type === 'progress') return job.onProgress?.(data.loaded, data.total);
      pending.delete(data.id);
      if (data.type === 'error') job.reject(new Error(data.message));
      else job.resolve(data);
    };
  }
  const id = nextId++;
  return new Promise<WorkerResponse>((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress });
    worker!.postMessage({ ...request, id });
  });
}

export { hasWebGpu as canIndex, NO_WEBGPU } from './webgpu';

/** Loads the model once per page; the browser caches the download between visits. */
export async function loadIndexer(onProgress?: (loaded: number, total: number) => void) {
  await call({ type: 'load' }, onProgress);
}

async function save(body: { items?: IndexItem[]; remove?: string[] }) {
  const response = await fetch('/api/search/index', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Unable to save to the search index.');
  return result as { saved: number; removed: number };
}

export async function indexPhoto(key: string, collection: PhotoCollection) {
  const response = await call({ type: 'photo', url: photoUrl(key) });
  if (response.type !== 'photo') throw new Error('Unexpected indexer response.');
  const { embedding, thumb, color, width, height }: PhotoEmbedding = response.result;
  const thumb_path = thumbPathFor(key);
  const { error } = await supabase.storage.from('mila_storage_bucket')
    .upload(thumb_path, thumb, { upsert: true, contentType: thumb.type });
  if (error) throw new Error(`Preview upload failed: ${error.message}`);
  await save({ items: [{ key, kind: 'photo', collection, embedding, thumb_path, color, width, height }] });
}

// Letters are stored as HTML or Markdown; the model gets the readable text.
function letterText(title: string, content: string) {
  const text = new DOMParser().parseFromString(content, 'text/html').body.textContent ?? '';
  return `title: ${title || 'none'} | text: ${text.replace(/\s+/g, ' ').trim()}`;
}

export async function indexLetter(letter: { key: string; title: string; content: string; hash: string }) {
  const response = await call({ type: 'text', text: letterText(letter.title, letter.content) });
  if (response.type !== 'text') throw new Error('Unexpected indexer response.');
  await save({ items: [{ key: letter.key, kind: 'letter', collection: 'letters', embedding: response.embedding, source_hash: letter.hash }] });
}

export const removeFromIndex = (keys: string[]) => save({ remove: keys });
