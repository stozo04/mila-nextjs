'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Modal } from 'react-bootstrap';
import type { FaceDetail, PeopleAction, PeopleList } from '@/lib/people/types';

const PAGE = 60;
const plural = (count: number, one: string, many = `${one}s`) => `${count.toLocaleString()} ${count === 1 ? one : many}`;

// Thumbnails are already small; the image optimizer would only add cost.
function Thumb({ src, size, alt = '' }: { src: string | null; size: number; alt?: string }) {
  return src
    ? <Image src={src} alt={alt} width={size} height={size} unoptimized className="people-thumb" style={{ width: size, height: size }} />
    : <span className="people-thumb people-thumb-empty d-inline-block" style={{ width: size, height: size }} aria-hidden="true" />;
}

type Open = { title: string; query: string; faces: FaceDetail[] | null; error: string };

export default function PeopleAdmin() {
  const [list, setList] = useState<PeopleList | null>(null);
  const [loadError, setLoadError] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [names, setNames] = useState<Record<string, string>>({});
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [visible, setVisible] = useState(PAGE);
  const [open, setOpen] = useState<Open | null>(null);
  const busyRef = useRef(false);

  const load = useCallback(async (hidden: boolean) => {
    const response = await fetch(`/api/people${hidden ? '?hidden=1' : ''}`, { cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Unable to load people.');
    setList(result as PeopleList);
  }, []);

  useEffect(() => {
    // load sets state only after its fetch resolves, but the rule flags any effect that
    // can reach a setState (same pattern as Gallery's fetchImages).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(showHidden).catch(failure => setLoadError(failure.message));
  }, [load, showHidden]);

  const loadFaces = useCallback(async (query: string) => {
    const response = await fetch(`/api/people/faces?${query}`, { cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Unable to load these faces.');
    return result.faces as FaceDetail[];
  }, []);

  async function act(action: PeopleAction, done: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setNotice('');
    setError('');
    try {
      const response = await fetch(`/api/people${showHidden ? '?hidden=1' : ''}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Unable to save. Reload before retrying.');
      const next = result as PeopleList;
      setList(next);
      const groupIds = new Set(next.groups.map(group => group.id));
      setChecked(current => new Set([...current].filter(id => groupIds.has(id))));
      setNotice(done);
      return true;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to save. Reload before retrying.');
      return false;
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  }

  async function openFaces(title: string, query: string) {
    setOpen({ title, query, faces: null, error: '' });
    try {
      const faces = await loadFaces(query);
      setOpen(current => current?.query === query ? { ...current, faces } : current);
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : 'Unable to load these faces.';
      setOpen(current => current?.query === query ? { ...current, error: message } : current);
    }
  }

  async function removeFace(faceId: string) {
    if (!open || !await act({ action: 'remove-face', face_id: faceId }, 'Moved the face out.')) return;
    setOpen(current => current && { ...current, faces: current.faces?.filter(face => face.id !== faceId) ?? null });
  }

  function nameGroup(groupId: string) {
    const name = (names[groupId] ?? '').trim();
    if (!name) return;
    void act({ action: 'name', group_ids: [groupId], name }, `Named the group ${name}.`)
      .then(ok => ok && setNames(current => { const next = { ...current }; delete next[groupId]; return next; }));
  }

  function toggle(groupId: string, on: boolean) {
    setChecked(current => {
      const next = new Set(current);
      if (on) next.add(groupId); else next.delete(groupId);
      return next;
    });
  }

  if (loadError) return <main className="container my-5" style={{ maxWidth: 960 }}>
    <h1 className="h3">People</h1>
    <p role="alert" className="text-danger">{loadError}</p>
  </main>;

  const groups = list?.groups ?? [];
  const merging = [...checked];

  return <main className="people container my-5" style={{ maxWidth: 960 }}>
    <h1 className="h3">People</h1>
    {!list ? <p><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Loading people…</p>
      : list.scanned === 0 ? <p>
        Faces haven’t been scanned yet. Run <Link href="/admin/search-index">Build search index</Link> to find the faces in Mila’s photos, then come back to name them.
      </p> : <>
        <p className="mb-4">
          Faces found in {plural(list.scanned, 'photo')} of {list.photos.toLocaleString()}. Name a group to teach the site who’s who;
          typing a name you’ve already used adds the group to that person.
        </p>

        <p role="status" aria-live="polite" className="fw-semibold mb-2">{notice}</p>
        {error && <p role="alert" className="text-danger">{error}</p>}

        <datalist id="people-names">{list.people.map(person => <option key={person.id} value={person.name} />)}</datalist>

        <section aria-labelledby="named-heading" className="mb-5">
          <h2 id="named-heading" className="h5">Named people</h2>
          {!list.people.length ? <p className="text-body-secondary">No one is named yet.</p> :
            <ul className="list-unstyled d-flex flex-column gap-2 mb-0">
              {list.people.map(person => <li key={person.id} className="people-card d-flex flex-wrap align-items-center gap-3 p-2">
                <button type="button" className="people-open" aria-label={`Show ${person.name}’s faces`}
                  onClick={() => void openFaces(person.name, `person=${encodeURIComponent(person.id)}`)}>
                  <Thumb src={person.thumb} size={56} />
                </button>
                {renaming?.id === person.id ? <form className="d-flex flex-wrap gap-2 flex-grow-1" onSubmit={event => {
                  event.preventDefault();
                  const name = renaming.value.trim();
                  if (name) void act({ action: 'rename', person_id: person.id, name }, `Renamed to ${name}.`).then(ok => ok && setRenaming(null));
                }}>
                  <input className="form-control form-control-sm" style={{ maxWidth: 240 }} aria-label={`New name for ${person.name}`} autoFocus
                    value={renaming.value} maxLength={80} disabled={busy} onChange={event => setRenaming({ id: person.id, value: event.target.value })} />
                  <button type="submit" className="btn btn-sm btn-primary" disabled={busy || !renaming.value.trim()}>Save</button>
                  <button type="button" className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => setRenaming(null)}>Cancel</button>
                </form> : <div className="flex-grow-1">
                  <div className="fw-semibold">{person.name}</div>
                  <div className="small text-body-secondary">{plural(person.photos, 'photo')}</div>
                </div>}
                {renaming?.id !== person.id && <div className="d-flex flex-wrap gap-2">
                  <button type="button" className="btn btn-sm btn-outline-primary" disabled={busy}
                    onClick={() => setRenaming({ id: person.id, value: person.name })}>Rename</button>
                  <button type="button" className="btn btn-sm btn-outline-danger" disabled={busy}
                    onClick={() => void act({ action: 'unname', person_id: person.id }, `Removed the name ${person.name}.`)}>Remove name</button>
                </div>}
              </li>)}
            </ul>}
        </section>

        <section aria-labelledby="groups-heading">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <h2 id="groups-heading" className="h5 mb-0">{showHidden ? 'Hidden groups' : 'Unnamed groups'}</h2>
            <div className="d-flex flex-wrap align-items-center gap-3">
              <div className="form-check form-switch mb-0">
                <input className="form-check-input" type="checkbox" role="switch" id="show-hidden" checked={showHidden} disabled={busy}
                  onChange={event => { setShowHidden(event.target.checked); setChecked(new Set()); setVisible(PAGE); }} />
                <label className="form-check-label" htmlFor="show-hidden">Show hidden</label>
              </div>
              <button type="button" className="btn btn-primary" disabled={busy || merging.length < 2}
                onClick={() => void act({ action: 'merge', group_ids: merging }, `Merged ${merging.length} groups.`)}>
                Merge{merging.length >= 2 ? ` ${merging.length}` : ''}
              </button>
            </div>
          </div>
          {!groups.length ? <p className="text-body-secondary">{showHidden ? 'No hidden groups.' : 'Every group has a name.'}</p> : <>
            <ul className="list-unstyled people-grid mb-3">
              {groups.slice(0, visible).map(group => {
                const label = `group of ${plural(group.faces, 'face')}`;
                return <li key={group.id} className="people-card p-2 d-flex flex-column gap-2">
                  <div className="d-flex align-items-start justify-content-between gap-2">
                    <button type="button" className="people-open people-pile" aria-label={`Show the ${label}`}
                      onClick={() => void openFaces(`Group of ${plural(group.faces, 'face')}`, `group=${encodeURIComponent(group.id)}`)}>
                      {group.thumbs.slice(0, 4).map((thumb, index) =>
                        <span key={thumb} className="people-pile-face" style={{ zIndex: 4 - index, marginLeft: index ? -22 : 0 }}><Thumb src={thumb} size={48} /></span>)}
                    </button>
                    <input type="checkbox" className="form-check-input mt-1" aria-label={`Select the ${label} to merge`}
                      checked={checked.has(group.id)} disabled={busy} onChange={event => toggle(group.id, event.target.checked)} />
                  </div>
                  <div className="small text-body-secondary">{plural(group.faces, 'face')}</div>
                  <form className="d-flex gap-2" onSubmit={event => { event.preventDefault(); nameGroup(group.id); }}>
                    <input className="form-control form-control-sm" list="people-names" aria-label={`Name for ${label}`} placeholder="Name"
                      value={names[group.id] ?? ''} maxLength={80} disabled={busy}
                      onChange={event => setNames(current => ({ ...current, [group.id]: event.target.value }))} />
                    <button type="submit" className="btn btn-sm btn-primary" disabled={busy || !(names[group.id] ?? '').trim()}>Save</button>
                  </form>
                  <button type="button" className="btn btn-sm btn-outline-secondary align-self-start" disabled={busy}
                    onClick={() => void act({ action: 'hide', group_ids: [group.id], hidden: !group.hidden }, group.hidden ? 'Shown.' : 'Hidden.')}>
                    {group.hidden ? 'Show' : 'Hide'}
                  </button>
                </li>;
              })}
            </ul>
            {groups.length > visible && <button type="button" className="btn btn-outline-primary" onClick={() => setVisible(count => count + PAGE)}>
              Show more ({(groups.length - visible).toLocaleString()} left)
            </button>}
          </>}
        </section>
      </>}

    {open && <Modal show onHide={() => setOpen(null)} size="lg" scrollable aria-labelledby="people-faces-title">
      <Modal.Header closeButton><Modal.Title id="people-faces-title" className="h5">{open.title}</Modal.Title></Modal.Header>
      <Modal.Body>
        {open.error ? <p role="alert" className="text-danger">{open.error}</p>
          : !open.faces ? <p><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Loading faces…</p>
          : !open.faces.length ? <p>No faces left here.</p>
          : <ul className="list-unstyled d-flex flex-column gap-2 mb-0">
            {open.faces.map(face => <li key={face.id} className="d-flex align-items-center gap-3">
              <Thumb src={face.thumb} size={64} alt="Face" />
              <Thumb src={face.photo_thumb} size={96} alt="The photo it is in" />
              <button type="button" className="btn btn-sm btn-outline-danger ms-auto" disabled={busy} onClick={() => void removeFace(face.id)}>Not this person</button>
            </li>)}
          </ul>}
        {error && <p role="alert" className="text-danger mt-2 mb-0">{error}</p>}
      </Modal.Body>
    </Modal>}

    <style jsx global>{`
      .people { color: #542537; }
      .people .btn-primary { background: #c2185b; border-color: #c2185b; }
      .people .btn-primary:hover:not(:disabled) { background: #a6134c; border-color: #a6134c; }
      .people .btn-outline-primary { color: #c2185b; border-color: #c2185b; }
      .people .btn-outline-primary:hover:not(:disabled) { background: #c2185b; color: #fff; }
      .people .form-check-input:checked { background-color: #c2185b; border-color: #c2185b; }
      .people-card { background: #fff7fa; border: 1px solid #f3d3e0; border-radius: 16px; }
      .people-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
      .people-open { border: 0; background: none; padding: 0; border-radius: 12px; }
      .people-open:focus-visible, .people :is(.btn, .form-control, .form-check-input):focus-visible { outline: 3px solid #c2185b; outline-offset: 2px; box-shadow: none; }
      .people-pile { display: flex; align-items: center; }
      .people-pile-face { position: relative; display: inline-block; border-radius: 12px; box-shadow: 0 0 0 2px #fff; }
      .people-thumb { border-radius: 12px; object-fit: cover; background: #f3d3e0; }
    `}</style>
  </main>;
}
