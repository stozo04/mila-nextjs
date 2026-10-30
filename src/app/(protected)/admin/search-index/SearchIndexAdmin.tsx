'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { NO_WEBGPU, canIndex, indexLetter, indexPhoto, loadIndexer, removeFromIndex } from '@/lib/search/browserIndexer';
import { scanFaces } from '@/lib/people/browserFaces';
import type { IndexStatus } from '@/lib/search/types';

const megabytes = (bytes: number) => Math.round(bytes / 1e6);

export default function SearchIndexAdmin() {
  const [status, setStatus] = useState<IndexStatus | null>(null);
  const [loadError, setLoadError] = useState('');
  const [supported, setSupported] = useState(true);
  const [running, setRunning] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [progress, setProgress] = useState('');
  const [notes, setNotes] = useState<string[]>([]);
  const pauseRef = useRef(false);

  const refresh = useCallback(async () => {
    const response = await fetch('/api/search/index', { cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Unable to read the search index.');
    setStatus(result);
    return result as IndexStatus;
  }, []);

  useEffect(() => {
    // Only the browser can say whether it has WebGPU; the server render cannot know.
    canIndex().then(setSupported);
    // refresh sets state only after its fetch resolves, but the rule flags any effect that
    // can reach a setState (same pattern as Gallery's fetchImages).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh().catch(error => setLoadError(error.message));
  }, [refresh]);

  const remaining = status ? status.pending.photos.length + status.pending.letters.length + status.orphans.length + status.faces.pending.length : 0;

  async function start() {
    if (!status || running) return;
    pauseRef.current = false;
    setRunning(true);
    setNotes([]);
    const report: string[] = [];
    let failed = 0;
    try {
      if (status.orphans.length) {
        let removed = 0;
        for (let index = 0; index < status.orphans.length; index += 100) {
          removed += (await removeFromIndex(status.orphans.slice(index, index + 100))).removed;
        }
        report.push(`Removed ${removed}`);
        setNotes([...report]);
      }
      const jobs = [
        ...status.pending.letters.map(letter => () => indexLetter(letter)),
        ...status.pending.photos.map(photo => () => indexPhoto(photo.key, photo.collection)),
        // Faces last, so search works first; a photo's faces are found after it is indexed.
        ...status.faces.pending.map(key => () => scanFaces(key)),
      ];
      if (jobs.length) {
        setProgress('Downloading the search model…');
        await loadIndexer((loaded, total) =>
          setProgress(`Downloading the search model… ${megabytes(loaded)} of ${megabytes(total)} MB`));
      }
      for (let index = 0; index < jobs.length && !pauseRef.current; index++) {
        setProgress(`Indexing ${index + 1} of ${jobs.length}`);
        try {
          await jobs[index]();
        } catch (error) {
          failed++;
          console.error('Indexing failed:', error);
        }
      }
      if (failed) report.push(`${failed} could not be indexed. Start indexing again to retry them.`);
      setProgress(pauseRef.current ? 'Paused. Start indexing carries on from here.' : 'Indexing finished.');
    } catch (error) {
      setProgress('');
      report.push(error instanceof Error ? error.message : 'Indexing stopped.');
    } finally {
      setNotes(report);
      setRunning(false);
      setPausing(false);
      await refresh().catch(error => setLoadError(error.message));
    }
  }

  function pause() {
    pauseRef.current = true;
    setPausing(true);
  }

  return <main className="container my-5" style={{ maxWidth: 640 }}>
    <h1 className="h3">Search index</h1>
    <p>Photos and letters become searchable on the home page once they are indexed. Indexing runs in this browser and picks up where it left off.</p>
    {loadError && <p role="alert" className="text-danger">{loadError}</p>}
    {!supported && <p role="alert" className="text-danger">{NO_WEBGPU}</p>}
    {status && <ul className="list-group mb-4" aria-label="Search index by collection">
      {status.collections.map(collection => <li key={collection.id} className="list-group-item d-flex justify-content-between">
        <span>{collection.label}</span>
        <span>Indexed {collection.indexed.toLocaleString()} of {collection.total.toLocaleString()}</span>
      </li>)}
      <li className="list-group-item d-flex justify-content-between">
        <span>Faces</span>
        <span>Scanned {status.faces.scanned.toLocaleString()} of {status.faces.total.toLocaleString()} photos</span>
      </li>
    </ul>}
    {status && <div className="d-flex flex-wrap align-items-center gap-2">
      <button type="button" className="btn btn-success" disabled={!supported || running || remaining === 0} onClick={() => void start()}>
        Start indexing
      </button>
      {running && <button type="button" className="btn btn-outline-secondary" disabled={pausing} onClick={pause}>
        {pausing ? 'Pausing…' : 'Pause'}
      </button>}
      {!running && remaining === 0 && <span>Everything is indexed.</span>}
    </div>}
    <p role="status" aria-live="polite" className="mt-3 mb-1 fw-semibold">{progress}</p>
    {notes.map(note => <p key={note} className="mb-1">{note}</p>)}
  </main>;
}
