'use client';

import { supabase } from '@/lib/supabase';
import { isSitePhoto, photoUrl } from '@/lib/search/collections';
import type { FaceScan } from './types';
import type { FacesRequest, FacesResponse, FoundFace } from './faces.worker';

type Pending = { resolve: (value: FacesResponse) => void; reject: (error: Error) => void };

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();

type WithoutId<T> = T extends unknown ? Omit<T, 'id'> : never;

function call(request: WithoutId<FacesRequest>) {
  if (!worker) {
    worker = new Worker(new URL('./faces.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }: MessageEvent<FacesResponse>) => {
      const job = pending.get(data.id);
      if (!job) return;
      pending.delete(data.id);
      if (data.type === 'error') job.reject(new Error(data.message));
      else job.resolve(data);
    };
    // A crash inside the worker (a model that fails to load) would otherwise leave every
    // waiting scan hanging; fail them and start a fresh worker next time.
    worker.onerror = event => {
      event.preventDefault();
      worker?.terminate();
      worker = null;
      for (const job of pending.values()) job.reject(new Error(event.message || 'The face scanner stopped.'));
      pending.clear();
    };
  }
  const id = nextId++;
  return new Promise<FacesResponse>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker!.postMessage({ ...request, id });
  });
}

/** Loads the face models once per page; the browser caches the download between visits. */
export async function loadFaceScanner() {
  await call({ type: 'load' });
}

const faceThumbPath = (key: string, index: number) => `search/faces/${isSitePhoto(key) ? `site${key}` : key}/${index}.webp`;

/** Finds the faces in one photo, uploads their crops, and saves them for the People page.
 *  A photo with no faces is saved too, so it counts as scanned. */
export async function scanFaces(key: string) {
  const response = await call({ type: 'scan', url: photoUrl(key) });
  if (response.type !== 'faces') throw new Error('Unexpected face scanner response.');
  const faces = await Promise.all(response.faces.map(async ({ box, score, embedding, thumb }: FoundFace, index) => {
    const thumb_path = faceThumbPath(key, index);
    const { error } = await supabase.storage.from('mila_storage_bucket')
      .upload(thumb_path, thumb, { upsert: true, contentType: thumb.type });
    if (error) throw new Error(`Face crop upload failed: ${error.message}`);
    return { box, score, embedding, thumb_path };
  }));
  const scans: FaceScan[] = [{ photo_key: key, faces }];
  const saved = await fetch('/api/people/faces', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scans }),
  });
  const result = await saved.json().catch(() => ({}));
  if (!saved.ok) throw new Error(result.error || 'Unable to save the faces.');
}
