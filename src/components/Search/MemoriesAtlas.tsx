'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { COLLECTIONS, thumbUrl, type PhotoCollection, type SourceLinks } from '@/lib/search/collections';
import type { LetterResult, SearchResult } from '@/lib/search/types';
import { LETTER_TILE, TILE, fitCamera, randomLayout, toScreen, toWorld, zoomAt, type Camera, type Layout, type Placed } from './atlasLayout';
import PhotoViewer, { type ViewerPhoto } from './PhotoViewer';

type AtlasItem = { key: string; collection: PhotoCollection; thumb: string | null; color: string; width: number | null; height: number | null };
type PlacedLetter = { result: LetterResult; at: Placed };
type SearchState = { status: 'idle' | 'searching' | 'waking' | 'done' | 'error'; results: SearchResult[] };

const MAX_ZOOM = 4;
const WAKING_AFTER_MS = 1500;
const THUMB_MIN_PX = 24; // below this a tile is drawn as its average colour
const MAX_THUMB_LOADS = 12;
const ACCENT = '#c2185b';
const LABEL = 'Mila’s memories atlas. Drag to explore, scroll or pinch to zoom.';
const collectionLabel = (id: string) => COLLECTIONS.find(collection => collection.id === id)?.label ?? 'Photo';
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function wrapText(context: CanvasRenderingContext2D, text: string, width: number, maxLines: number) {
  const lines: string[] = [];
  for (const word of text.split(/\s+/)) {
    const last = lines.at(-1);
    if (last !== undefined && context.measureText(`${last} ${word}`).width <= width) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines.length > maxLines ? [...lines.slice(0, maxLines - 1), `${lines[maxLines - 1]}…`] : lines;
}

function letterDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function MemoriesAtlas() {
  const router = useRouter();
  const [items, setItems] = useState<AtlasItem[]>([]);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [links, setLinks] = useState<SourceLinks>({ cards: new Map(), letterPhotos: new Map() });
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [query, setQuery] = useState('');
  const [includeLetters, setIncludeLetters] = useState(false);
  const [search, setSearch] = useState<SearchState>({ status: 'idle', results: [] });
  const [viewer, setViewer] = useState<{ photos: ViewerPhoto[]; index: number } | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useRef({ width: 0, height: 0 });
  const camera = useRef<Camera | null>(null);
  const minZoom = useRef(0.01);
  const images = useRef(new Map<string, HTMLImageElement | 'loading' | 'error'>());
  const loadingThumbs = useRef(0);
  const ranks = useRef(new Map<string, number>());
  const letters = useRef<PlacedLetter[]>([]);
  const frame = useRef(0);
  const flight = useRef(0);
  const searchId = useRef(0);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ moved: 0, startedAt: 0 });
  const data = useRef<{ items: AtlasItem[]; layout: Layout | null }>({ items: [], layout: null });

  // ---- data -------------------------------------------------------------------------
  useEffect(() => {
    let active = true;
    (async () => {
      const [atlas, journey, letterPhotos] = await Promise.all([
        supabase.rpc('search_atlas_items'),
        supabase.from('journey_cards').select('slug, journey_type'),
        supabase.rpc('search_letter_photo_links'),
      ]);
      if (!active) return;
      if (atlas.error || journey.error || letterPhotos.error) {
        console.error('Unable to load the atlas:', atlas.error ?? journey.error ?? letterPhotos.error);
        setLoadState('error');
        return;
      }
      const loaded = (atlas.data as [string, PhotoCollection, string | null, string | null, number | null, number | null][])
        .map(([key, collection, thumb, color, width, height]) => ({ key, collection, thumb: thumb && thumbUrl(thumb), color: color ?? '#e9d5df', width, height }));
      const { width, height } = size.current;
      setLinks({
        cards: new Map((journey.data ?? []).map(card => [card.slug, card.journey_type])),
        letterPhotos: new Map(Object.entries(letterPhotos.data as Record<string, string>)),
      });
      setItems(loaded);
      setLayout(randomLayout(loaded.length, width && height ? width / height : 1.6));
      setLoadState('ready');
    })().catch(error => {
      console.error('Unable to load the atlas:', error);
      if (active) setLoadState('error');
    });
    return () => { active = false; };
  }, []);

  // ---- drawing ------------------------------------------------------------------------
  // Redraws go through a ref so a thumbnail finishing late still draws with the latest state.
  const drawRef = useRef<() => void>(() => {});
  const render = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(() => drawRef.current());
  }, []);

  const requestThumb = useCallback((key: string, url: string) => {
    if (images.current.has(key) || loadingThumbs.current >= MAX_THUMB_LOADS) return;
    images.current.set(key, 'loading');
    loadingThumbs.current++;
    const image = new window.Image();
    image.decoding = 'async';
    image.onload = () => { images.current.set(key, image); loadingThumbs.current--; render(); };
    image.onerror = () => { images.current.set(key, 'error'); loadingThumbs.current--; render(); };
    image.src = url;
  }, [render]);

  const draw = useCallback(() => {
    frame.current = 0;
    const canvas = canvasRef.current;
    const cam = camera.current;
    const { items: atlasItems, layout: atlasLayout } = data.current;
    if (!canvas || !cam || !atlasLayout) return;
    const { width, height } = size.current;
    const context = canvas.getContext('2d')!;
    const ratio = window.devicePixelRatio || 1;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const searching = search.status === 'done' && (ranks.current.size > 0 || letters.current.length > 0);
    const drawTile = (item: AtlasItem, at: Placed, scale: number, alpha: number) => {
      const side = TILE * cam.zoom * scale;
      const centre = toScreen(cam, at.x, at.y, width, height);
      if (centre.x + side < 0 || centre.y + side < 0 || centre.x - side > width || centre.y - side > height) return;
      const left = centre.x - side / 2;
      const top = centre.y - side / 2;
      context.globalAlpha = alpha;
      const image = images.current.get(item.key);
      if (side >= THUMB_MIN_PX && image instanceof HTMLImageElement) {
        const crop = Math.min(image.naturalWidth, image.naturalHeight);
        context.drawImage(image, (image.naturalWidth - crop) / 2, (image.naturalHeight - crop) / 2, crop, crop, left, top, side, side);
      } else {
        context.fillStyle = item.color;
        context.fillRect(left, top, side, side);
        if (side >= THUMB_MIN_PX && item.thumb && alpha > 0.5) requestThumb(item.key, item.thumb);
      }
      return { left, top, side };
    };

    atlasItems.forEach((item, index) => {
      if (!searching || !ranks.current.has(item.key)) drawTile(item, atlasLayout.positions[index], 1, searching ? 0.12 : 1);
    });
    if (searching) {
      atlasItems.forEach((item, index) => {
        const rank = ranks.current.get(item.key);
        if (rank === undefined) return;
        const box = drawTile(item, atlasLayout.positions[index], 1.12, 1);
        if (!box) return;
        context.globalAlpha = 1;
        context.strokeStyle = ACCENT;
        context.lineWidth = rank === 0 ? 4 : 2;
        context.strokeRect(box.left, box.top, box.side, box.side);
      });
      for (const { result, at } of letters.current) {
        const side = LETTER_TILE * cam.zoom;
        const centre = toScreen(cam, at.x, at.y, width, height);
        const left = centre.x - side / 2;
        const top = centre.y - side / 2;
        context.globalAlpha = 1;
        context.fillStyle = '#fff7fa';
        context.fillRect(left, top, side, side);
        if (side >= 48) {
          const image = result.image ? images.current.get(`letter:${result.slug}`) : undefined;
          const hasImage = image instanceof HTMLImageElement;
          if (hasImage) {
            const crop = Math.min(image.naturalWidth, image.naturalHeight * (1 / 0.55));
            context.drawImage(image, (image.naturalWidth - crop) / 2, 0, crop, crop * 0.55, left, top, side, side * 0.55);
          } else if (result.image && image === undefined) requestThumb(`letter:${result.slug}`, result.image);
          const fontSize = Math.max(9, Math.min(20, side * 0.1));
          const pad = Math.max(4, side * 0.06);
          context.save();
          context.beginPath();
          context.rect(left, top, side, side);
          context.clip();
          context.fillStyle = ACCENT;
          context.font = `600 ${fontSize * 0.8}px system-ui, sans-serif`;
          let y = top + (hasImage ? side * 0.55 : 0) + pad + fontSize * 0.8;
          context.fillText(`Letter · ${letterDate(result.date)}`, left + pad, y, side - pad * 2);
          context.fillStyle = '#542537';
          context.font = `600 ${fontSize}px system-ui, sans-serif`;
          for (const line of wrapText(context, result.title, side - pad * 2, hasImage ? 2 : 4)) {
            y += fontSize * 1.25;
            context.fillText(line, left + pad, y);
          }
          context.restore();
        }
        context.strokeStyle = ACCENT;
        context.lineWidth = 3;
        context.strokeRect(left, top, side, side);
      }
    }
    context.globalAlpha = 1;
  }, [search.status, requestThumb]);

  useEffect(() => {
    drawRef.current = draw;
    data.current = { items, layout };
    render();
  }, [draw, items, layout, render]);

  // Canvas size follows the container; the first measurement after data loads fits the camera.
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      size.current = { width, height };
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      if (layout) {
        const fit = fitCamera(layout, width, height);
        minZoom.current = fit.zoom * 0.5;
        camera.current ??= fit;
      }
      render();
    });
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [layout, render]);

  // ---- camera ------------------------------------------------------------------------
  const moveCamera = useCallback((next: Camera) => {
    cancelAnimationFrame(flight.current);
    camera.current = next;
    render();
  }, [render]);

  const flyTo = useCallback((target: Camera) => {
    const from = camera.current;
    if (!from) return;
    cancelAnimationFrame(flight.current);
    const started = performance.now();
    const step = (now: number) => {
      const t = easeInOut(Math.min(1, (now - started) / 700));
      camera.current = { x: from.x + (target.x - from.x) * t, y: from.y + (target.y - from.y) * t, zoom: from.zoom * (target.zoom / from.zoom) ** t };
      render();
      if (t < 1) flight.current = requestAnimationFrame(step);
    };
    flight.current = requestAnimationFrame(step);
  }, [render]);

  const zoomBy = (factor: number) => {
    const cam = camera.current;
    if (!cam) return;
    const { width, height } = size.current;
    flyTo(zoomAt(cam, factor, width / 2, height / 2, width, height, minZoom.current, MAX_ZOOM));
  };
  const resetView = () => layout && flyTo(fitCamera(layout, size.current.width, size.current.height));

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const onWheel = (event: WheelEvent) => {
      const cam = camera.current;
      if (!cam) return;
      event.preventDefault();
      const bounds = wrap.getBoundingClientRect();
      const { width, height } = size.current;
      moveCamera(zoomAt(cam, Math.exp(-event.deltaY * 0.0015), event.clientX - bounds.left, event.clientY - bounds.top, width, height, minZoom.current, MAX_ZOOM));
    };
    wrap.addEventListener('wheel', onWheel, { passive: false });
    return () => wrap.removeEventListener('wheel', onWheel);
  }, [moveCamera]);

  // ---- opening things ----------------------------------------------------------------
  const readingOrder = useCallback(() => {
    if (!layout) return [];
    return items.map((item, index) => ({ item, at: layout.positions[index] }))
      .sort((a, b) => Math.round(a.at.y / 100) - Math.round(b.at.y / 100) || a.at.x - b.at.x)
      .map(({ item }) => item);
  }, [items, layout]);

  const openPhoto = useCallback((key: string) => {
    const matched = search.status === 'done' && ranks.current.has(key);
    const sequence = matched
      ? search.results.filter(result => result.kind === 'photo').map(result => items.find(item => item.key === result.key)).filter((item): item is AtlasItem => !!item)
      : readingOrder();
    setViewer({ photos: sequence.map(({ key: k, width, height }) => ({ key: k, width, height })), index: Math.max(0, sequence.findIndex(item => item.key === key)) });
  }, [items, readingOrder, search]);

  const openAt = (screenX: number, screenY: number) => {
    const cam = camera.current;
    if (!cam || !layout) return;
    const { width, height } = size.current;
    const point = toWorld(cam, screenX, screenY, width, height);
    const hit = (at: Placed, side: number) => Math.abs(point.x - at.x) <= side / 2 && Math.abs(point.y - at.y) <= side / 2;
    const letter = letters.current.find(({ at }) => hit(at, LETTER_TILE));
    if (letter) return router.push(`/blogs/${letter.result.slug}`);
    const index = items.findIndex((item, i) => hit(layout.positions[i], ranks.current.has(item.key) ? TILE * 1.12 : TILE));
    if (index >= 0) openPhoto(items[index].key);
  };

  // ---- pointer gestures ----------------------------------------------------------------
  const local = (event: React.PointerEvent) => {
    const bounds = wrapRef.current!.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    // focusVisible: false keeps the keyboard outline off after a mouse or touch press.
    wrapRef.current?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, local(event));
    if (pointers.current.size === 1) gesture.current = { moved: 0, startedAt: performance.now() };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId);
    const cam = camera.current;
    if (!previous || !cam) return;
    const next = local(event);
    const { width, height } = size.current;
    if (pointers.current.size === 1) {
      gesture.current.moved += Math.hypot(next.x - previous.x, next.y - previous.y);
      pointers.current.set(event.pointerId, next);
      moveCamera({ ...cam, x: cam.x - (next.x - previous.x) / cam.zoom, y: cam.y - (next.y - previous.y) / cam.zoom });
      return;
    }
    const [other] = [...pointers.current.entries()].filter(([id]) => id !== event.pointerId).map(([, at]) => at);
    gesture.current.moved = Infinity; // a pinch is never a tap
    const before = Math.hypot(previous.x - other.x, previous.y - other.y);
    const after = Math.hypot(next.x - other.x, next.y - other.y);
    pointers.current.set(event.pointerId, next);
    const mid = { x: (next.x + other.x) / 2, y: (next.y + other.y) / 2 };
    const zoomed = zoomAt(cam, before ? after / before : 1, mid.x, mid.y, width, height, minZoom.current, MAX_ZOOM);
    moveCamera({ ...zoomed, x: zoomed.x - (next.x - previous.x) / 2 / zoomed.zoom, y: zoomed.y - (next.y - previous.y) / 2 / zoomed.zoom });
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const at = local(event);
    const wasTap = pointers.current.size === 1 && gesture.current.moved < 6 && performance.now() - gesture.current.startedAt < 600;
    pointers.current.delete(event.pointerId);
    if (wasTap) openAt(at.x, at.y);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const cam = camera.current;
    if (!cam) return;
    const step = 80 / cam.zoom;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[event.key]) {
      event.preventDefault();
      moveCamera({ ...cam, x: cam.x + moves[event.key][0], y: cam.y + moves[event.key][1] });
    } else if (event.key === '+' || event.key === '=') zoomBy(1.5);
    else if (event.key === '-') zoomBy(1 / 1.5);
    else if (event.key === '0') resetView();
  }

  // ---- search ------------------------------------------------------------------------
  async function runSearch(text: string, withLetters: boolean) {
    const id = ++searchId.current;
    setSearch({ status: 'searching', results: [] });
    const waking = setTimeout(() => {
      if (searchId.current === id) setSearch(current => (current.status === 'searching' ? { ...current, status: 'waking' } : current));
    }, WAKING_AFTER_MS);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(text)}${withLetters ? '&letters=1' : ''}`, { cache: 'no-store' });
      const result = await response.json().catch(() => ({}));
      if (searchId.current !== id) return;
      if (!response.ok) throw new Error(result.error);
      const results = (result.results as SearchResult[]).filter(row => row.kind === 'letter' || items.some(item => item.key === row.key));
      ranks.current = new Map(results.filter(row => row.kind === 'photo').map((row, rank) => [row.key, rank]));

      const best = results[0];
      const bestPhoto = results.find(row => row.kind === 'photo');
      const photoAt = (key: string) => layout!.positions[items.findIndex(item => item.key === key)];
      const anchor = bestPhoto ? photoAt(bestPhoto.key) : { x: layout!.width / 2, y: layout!.height / 2 };
      // Letter cards take the empty cells nearest the best photo, so they sit among the matches.
      const nearest = [...layout!.spare].sort((a, b) => Math.hypot(a.x - anchor.x, a.y - anchor.y) - Math.hypot(b.x - anchor.x, b.y - anchor.y));
      letters.current = results.filter((row): row is LetterResult => row.kind === 'letter').map((row, index) => ({ result: row, at: nearest[index] })).filter(letter => letter.at);
      setSearch({ status: 'done', results });

      // Fly to the best match close enough to see it, but keep any letter cards in frame too.
      const target = best?.kind === 'letter' ? letters.current[0]?.at : best && photoAt(best.key);
      if (target) {
        const points = [target, ...letters.current.map(letter => letter.at)];
        const xs = points.map(point => point.x);
        const ys = points.map(point => point.y);
        const spanX = Math.max(...xs) - Math.min(...xs) + LETTER_TILE * 2;
        const spanY = Math.max(...ys) - Math.min(...ys) + LETTER_TILE * 2;
        const { width, height } = size.current;
        const zoom = Math.min(220 / TILE, (width * 0.9) / spanX, (height * 0.75) / spanY);
        flyTo({ x: (Math.max(...xs) + Math.min(...xs)) / 2, y: (Math.max(...ys) + Math.min(...ys)) / 2, zoom: Math.min(MAX_ZOOM, Math.max(minZoom.current, zoom)) });
      }
    } catch (error) {
      if (searchId.current !== id) return;
      console.error('Search failed:', error);
      ranks.current = new Map();
      letters.current = [];
      setSearch({ status: 'error', results: [] });
    } finally {
      clearTimeout(waking);
      render();
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = query.trim();
    if (text && layout) void runSearch(text, includeLetters);
  }

  function clear() {
    searchId.current++;
    setQuery('');
    ranks.current = new Map();
    letters.current = [];
    setSearch({ status: 'idle', results: [] });
    resetView();
  }

  function toggleLetters(checked: boolean) {
    setIncludeLetters(checked);
    if (search.status !== 'idle' && query.trim() && layout) void runSearch(query.trim(), checked);
  }

  const matchCount = search.results.length;
  const statusText = {
    idle: '',
    searching: 'Searching…',
    waking: 'Waking up Mila’s memory…',
    done: matchCount ? `${matchCount} ${matchCount === 1 ? 'match' : 'matches'}` : 'No close matches. Try different words.',
    error: 'Search is unavailable right now. Please try again.',
  }[search.status];
  const busy = search.status === 'searching' || search.status === 'waking';

  return <div className="flex-grow-1 d-flex flex-column position-relative" style={{ minHeight: 'calc(100vh - 140px)', background: '#fdf7fa' }}>
    <form role="search" className="position-absolute top-0 start-50 translate-middle-x mt-3 px-3 w-100" style={{ maxWidth: 720, zIndex: 2 }} onSubmit={submit}>
      <div className="bg-white shadow-sm rounded-4 p-2 d-flex flex-wrap align-items-center gap-2">
        <input type="search" className="form-control border-0 flex-grow-1" style={{ minWidth: 180 }} aria-label="Search Mila’s memories"
          placeholder="Try “beach” or “birthday cake”" value={query} maxLength={200} onChange={event => setQuery(event.target.value)} />
        <button type="submit" className="btn btn-primary rounded-pill" disabled={!layout || !query.trim() || busy}>Search</button>
        {(search.status !== 'idle' || query) && <button type="button" className="btn btn-outline-secondary rounded-pill" onClick={clear}>Clear</button>}
        <div className="form-check form-switch mb-0 ms-1">
          <input className="form-check-input" type="checkbox" role="switch" id="include-letters" checked={includeLetters} onChange={event => toggleLetters(event.target.checked)} />
          <label className="form-check-label" htmlFor="include-letters">Include letters</label>
        </div>
      </div>
      <div className="text-center mt-2"><p role="status" aria-live="polite" className="d-inline-block fw-semibold mb-0 px-3 rounded-pill"
        style={{ color: '#542537', background: statusText ? 'rgba(255, 255, 255, 0.92)' : 'transparent' }}>{statusText}</p></div>
    </form>

    <div ref={wrapRef} role="region" aria-label={LABEL} tabIndex={0} className="memories-atlas flex-grow-1 position-relative"
      style={{ touchAction: 'none', cursor: 'grab', outlineOffset: -3 }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={event => pointers.current.delete(event.pointerId)}
      onKeyDown={onKeyDown}>
      <canvas ref={canvasRef} aria-hidden="true" className="position-absolute top-0 start-0 w-100 h-100" />
      {loadState !== 'ready' || !items.length ? <div className="position-absolute top-50 start-50 translate-middle text-center px-3" style={{ color: '#542537' }}>
        {loadState === 'loading' ? <p><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Loading Mila’s memories…</p>
          : loadState === 'error' ? <p role="alert">Unable to load Mila’s memories. Please reload the page.</p>
          : <p>Nothing is searchable yet. Steven can add photos with <strong>Build search index</strong>.</p>}
      </div> : null}
    </div>

    {search.status === 'done' && matchCount > 0 && <ol className="list-unstyled position-absolute bottom-0 start-0 m-3 mb-0" style={{ zIndex: 2 }} aria-label="Matches">
      {search.results.slice(0, 50).map((result, index) => <li key={result.key}>
        <button type="button" className="btn btn-light visually-hidden-focusable"
          onClick={() => (result.kind === 'letter' ? router.push(`/blogs/${result.slug}`) : openPhoto(result.key))}>
          {result.kind === 'letter' ? `Open letter: ${result.title}` : `Open match ${index + 1}: ${collectionLabel(result.collection)} photo`}
        </button>
      </li>)}
    </ol>}

    <div className="position-absolute bottom-0 end-0 m-3 d-flex flex-column gap-2" style={{ zIndex: 2 }}>
      <button type="button" className="btn btn-light shadow-sm" aria-label="Zoom in" onClick={() => zoomBy(1.5)}>+</button>
      <button type="button" className="btn btn-light shadow-sm" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.5)}>−</button>
      <button type="button" className="btn btn-light shadow-sm" onClick={resetView}>Reset view</button>
    </div>

    {viewer && <PhotoViewer photos={viewer.photos} index={viewer.index} links={links}
      onIndex={index => setViewer(current => current && { ...current, index })} onClose={() => setViewer(null)} />}
    <style jsx>{`
      .memories-atlas:focus:not(:focus-visible) { outline: none; }
      .memories-atlas:focus-visible { outline: 3px solid ${ACCENT}; }
    `}</style>
  </div>;
}
