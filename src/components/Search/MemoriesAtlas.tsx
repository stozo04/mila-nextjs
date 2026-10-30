'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { COLLECTIONS, thumbUrl, type PhotoCollection, type SourceLinks } from '@/lib/search/collections';
import type { LetterResult, SearchResult } from '@/lib/search/types';
import { MATCH_SCALE, TILE, fitCamera, gridLayout, openingCamera, zoomAt, type Camera, type Layout } from './atlasLayout';
import type { GlassAtlasRenderer } from './glass/types';
import GlassSearchBar from './glass/GlassSearchBar';
import GlassZoomControls from './glass/GlassZoomControls';
import PhotoViewer, { type ViewerPhoto } from './PhotoViewer';

type AtlasItem = { key: string; collection: PhotoCollection; thumb: string | null; color: string; width: number | null; height: number | null };
type PlacedLetter = { result: LetterResult; tileIndex: number };
type SearchState = { status: 'idle' | 'searching' | 'waking' | 'done' | 'error'; results: SearchResult[] };

const MAX_ZOOM = 4;
const WAKING_AFTER_MS = 1500;
const LABEL = 'Mila’s memories atlas. Drag to explore, scroll or pinch to zoom.';
const NO_WEBGL = 'This browser can’t show Mila’s memories. Try the latest Chrome, Safari, or Edge.';
const collectionLabel = (id: string) => COLLECTIONS.find(collection => collection.id === id)?.label ?? 'Photo';
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

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
  const [webgl, setWebgl] = useState<'pending' | 'ready' | 'unsupported'>('pending');
  const [query, setQuery] = useState('');
  const [includeLetters, setIncludeLetters] = useState(false);
  const [search, setSearch] = useState<SearchState>({ status: 'idle', results: [] });
  const [viewer, setViewer] = useState<{ photos: ViewerPhoto[]; index: number } | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<GlassAtlasRenderer | null>(null);
  const size = useRef({ width: 0, height: 0 });
  const camera = useRef<Camera | null>(null);
  const minZoom = useRef(0.01);
  const ranks = useRef(new Map<string, number>());
  const letters = useRef<PlacedLetter[]>([]);
  const flight = useRef(0);
  const searchId = useRef(0);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ moved: 0, startedAt: 0 });

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
      // The grid follows the screen's shape; the renderer has not measured it yet.
      const { width, height } = wrapRef.current?.getBoundingClientRect() ?? { width: 0, height: 0 };
      setLinks({
        cards: new Map((journey.data ?? []).map(card => [card.slug, card.journey_type])),
        letterPhotos: new Map(Object.entries(letterPhotos.data as Record<string, string>)),
      });
      setItems(loaded);
      setLayout(gridLayout(loaded.length, width && height ? width / height : 1.6));
      setLoadState('ready');
    })().catch(error => {
      console.error('Unable to load the atlas:', error);
      if (active) setLoadState('error');
    });
    return () => { active = false; };
  }, []);

  // The atlas takes the whole window: styles keyed to this class float the site nav as a
  // glass pill and hide the footer, only while the atlas is mounted.
  useEffect(() => {
    document.body.classList.add('memories-fullscreen');
    return () => document.body.classList.remove('memories-fullscreen');
  }, []);

  // ---- renderer ----------------------------------------------------------------------
  // three.js loads after the page so the signed-in home paints before the 3D code arrives.
  useEffect(() => {
    let active = true;
    import('./glass/GlassRenderer').then(({ createGlassRenderer }) => {
      if (!active || !canvasRef.current) return;
      renderer.current = createGlassRenderer(canvasRef.current);
      setWebgl(renderer.current ? 'ready' : 'unsupported');
    }).catch(error => {
      console.error('Unable to start the atlas renderer:', error);
      if (active) setWebgl('unsupported');
    });
    return () => {
      active = false;
      renderer.current?.dispose();
      renderer.current = null;
    };
  }, []);

  const draw = useCallback(() => {
    const glass = renderer.current;
    if (!glass || !camera.current) return;
    glass.setCamera(camera.current);
    glass.render();
  }, []);

  useEffect(() => {
    if (webgl !== 'ready' || !layout) return;
    renderer.current!.setTiles(items.map(({ key, color, thumb }) => ({ key, color, thumb })), layout);
    draw();
  }, [webgl, items, layout, draw]);

  // Canvas size follows the container; the first measurement after data loads opens on a random spot.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || webgl !== 'ready') return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      size.current = { width, height };
      renderer.current?.setSize(width, height, window.devicePixelRatio || 1);
      if (layout) {
        minZoom.current = fitCamera(layout, width, height).zoom * 0.5;
        camera.current ??= openingCamera(layout, width, height);
      }
      draw();
    });
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [layout, webgl, draw]);

  // ---- camera ------------------------------------------------------------------------
  const moveCamera = useCallback((next: Camera) => {
    cancelAnimationFrame(flight.current);
    camera.current = next;
    draw();
  }, [draw]);

  const flyTo = useCallback((target: Camera) => {
    const from = camera.current;
    if (!from) return;
    cancelAnimationFrame(flight.current);
    const started = performance.now();
    const step = (now: number) => {
      const t = easeInOut(Math.min(1, (now - started) / 700));
      camera.current = { x: from.x + (target.x - from.x) * t, y: from.y + (target.y - from.y) * t, zoom: from.zoom * (target.zoom / from.zoom) ** t };
      draw();
      if (t < 1) flight.current = requestAnimationFrame(step);
    };
    flight.current = requestAnimationFrame(step);
  }, [draw]);

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
      .sort((a, b) => a.at.y - b.at.y || a.at.x - b.at.x)
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
    const hit = renderer.current?.pick(screenX, screenY);
    if (!hit) return;
    if (hit.kind === 'letter') {
      const letter = letters.current[hit.card];
      if (letter) router.push(`/blogs/${letter.result.slug}`);
      return;
    }
    // A tile covered by a letter card is the card's, never the hidden photo's.
    if (letters.current.some(letter => letter.tileIndex === hit.index)) return;
    if (items[hit.index]) openPhoto(items[hit.index].key);
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
  const showResults = (results: SearchResult[]) => {
    const glass = renderer.current;
    const indexOf = new Map(items.map((item, index) => [item.key, index]));
    ranks.current = new Map(results.filter(row => row.kind === 'photo').map((row, rank) => [row.key, rank]));
    const best = results.find(row => row.kind === 'photo');
    const anchor = best && layout ? layout.positions[indexOf.get(best.key)!] : null;
    // Letter cards take the places of the dimmed photos nearest the best match.
    const free = layout && anchor ? items.map((item, index) => ({ index, at: layout.positions[index] }))
      .filter(({ index }) => !ranks.current.has(items[index].key))
      .sort((a, b) => Math.hypot(a.at.x - anchor.x, a.at.y - anchor.y) - Math.hypot(b.at.x - anchor.x, b.at.y - anchor.y)) : [];
    letters.current = results.filter((row): row is LetterResult => row.kind === 'letter')
      .map((result, index) => ({ result, tileIndex: free[index]?.index ?? -1 })).filter(letter => letter.tileIndex >= 0);
    // No matches means nothing to highlight, so nothing dims either.
    glass?.setMatches(results.length ? new Map([...ranks.current].map(([key, rank]) => [indexOf.get(key)!, rank])) : null);
    glass?.setLetterCards(letters.current.map(({ result, tileIndex }) => ({
      tileIndex, title: result.title, caption: `Letter · ${letterDate(result.date)}`, image: result.image,
    })));

    // Fly to the best match close enough to see it, keeping any letter cards in frame too.
    const first = results[0];
    const target = !layout || !first ? null : first.kind === 'letter' ? (letters.current[0] && layout.positions[letters.current[0].tileIndex]) : anchor;
    if (target && layout) {
      const points = [target, ...letters.current.map(letter => layout.positions[letter.tileIndex])];
      const xs = points.map(point => point.x);
      const ys = points.map(point => point.y);
      const spanX = Math.max(...xs) - Math.min(...xs) + TILE * MATCH_SCALE * 2;
      const spanY = Math.max(...ys) - Math.min(...ys) + TILE * MATCH_SCALE * 2;
      const { width, height } = size.current;
      const zoom = Math.min(260 / TILE, (width * 0.9) / spanX, (height * 0.7) / spanY);
      flyTo({ x: (Math.max(...xs) + Math.min(...xs)) / 2, y: (Math.max(...ys) + Math.min(...ys)) / 2, zoom: Math.min(MAX_ZOOM, Math.max(minZoom.current, zoom)) });
    }
    draw();
  };

  const clearResults = () => {
    ranks.current = new Map();
    letters.current = [];
    renderer.current?.setMatches(null);
    renderer.current?.setLetterCards([]);
    draw();
  };

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
      setSearch({ status: 'done', results });
      showResults(results);
    } catch (error) {
      if (searchId.current !== id) return;
      console.error('Search failed:', error);
      clearResults();
      setSearch({ status: 'error', results: [] });
    } finally {
      clearTimeout(waking);
    }
  }

  function submit() {
    const text = query.trim();
    if (text && layout) void runSearch(text, includeLetters);
  }

  function clear() {
    searchId.current++;
    setQuery('');
    clearResults();
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
  const overlay = webgl === 'unsupported' ? <p role="alert">{NO_WEBGL}</p>
    : loadState === 'loading' || webgl === 'pending' ? <p><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Loading Mila’s memories…</p>
    : loadState === 'error' ? <p role="alert">Unable to load Mila’s memories. Please reload the page.</p>
    : !items.length ? <p>Nothing is searchable yet. Steven can add photos with <strong>Build search index</strong>.</p>
    : null;

  return <div className="memories flex-grow-1 d-flex flex-column position-relative" style={{ minHeight: 0 }}>
    <div ref={wrapRef} role="region" aria-label={LABEL} tabIndex={0} className="memories-atlas flex-grow-1 position-relative"
      style={{ touchAction: 'none', cursor: 'grab', outlineOffset: -3 }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={event => pointers.current.delete(event.pointerId)}
      onKeyDown={onKeyDown}>
      <canvas ref={canvasRef} aria-hidden="true" className="position-absolute top-0 start-0 w-100 h-100" />
      {overlay && <div className="position-absolute top-50 start-50 translate-middle text-center px-3" style={{ color: '#542537' }}>{overlay}</div>}
    </div>

    {search.status === 'done' && matchCount > 0 && <ol className="list-unstyled position-absolute top-0 start-0 m-3" style={{ zIndex: 3 }} aria-label="Matches">
      {search.results.slice(0, 50).map((result, index) => <li key={result.key}>
        <button type="button" className="btn btn-light visually-hidden-focusable"
          onClick={() => (result.kind === 'letter' ? router.push(`/blogs/${result.slug}`) : openPhoto(result.key))}>
          {result.kind === 'letter' ? `Open letter: ${result.title}` : `Open match ${index + 1}: ${collectionLabel(result.collection)} photo`}
        </button>
      </li>)}
    </ol>}

    <GlassSearchBar query={query} onQueryChange={setQuery} onSubmit={submit} onClear={clear}
      showClear={search.status !== 'idle' || !!query} includeLetters={includeLetters} onIncludeLettersChange={toggleLetters}
      busy={busy} disabled={!layout || webgl !== 'ready'} status={statusText} />
    <GlassZoomControls onZoomIn={() => zoomBy(1.5)} onZoomOut={() => zoomBy(1 / 1.5)} onReset={resetView} />

    {viewer && <PhotoViewer photos={viewer.photos} index={viewer.index} links={links}
      onIndex={index => setViewer(current => current && { ...current, index })} onClose={() => setViewer(null)} />}
    <style jsx global>{`
      body.memories-fullscreen { overflow: hidden; }
      body.memories-fullscreen footer { display: none; }
      body.memories-fullscreen .site-nav { position: relative; z-index: 20; height: 0; padding: 0; background: transparent !important; }
      body.memories-fullscreen .site-nav > .container-fluid {
        position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
        width: min(1100px, calc(100% - 32px)); padding: 4px 8px 4px 16px; border-radius: 28px;
        background: rgba(255, 255, 255, 0.55); border: 1px solid rgba(255, 255, 255, 0.7);
        -webkit-backdrop-filter: blur(18px) saturate(160%); backdrop-filter: blur(18px) saturate(160%);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 10px 30px rgba(194, 24, 91, 0.16);
      }
      body.memories-fullscreen .site-nav .navbar-brand { height: 40px; width: auto; padding: 0; }
      body.memories-fullscreen .site-nav .nav-link { color: #542537; }
      body.memories-fullscreen .site-nav .nav-link:hover, body.memories-fullscreen .site-nav .nav-link:focus-visible { color: #c2185b; }
      body.memories-fullscreen .site-nav .navbar-toggler { border: 0; }
      body.memories-fullscreen .site-nav .dropdown-menu {
        background: rgba(255, 255, 255, 0.85); border: 1px solid rgba(255, 255, 255, 0.7); border-radius: 16px;
        -webkit-backdrop-filter: blur(18px) saturate(160%); backdrop-filter: blur(18px) saturate(160%);
        box-shadow: 0 10px 30px rgba(194, 24, 91, 0.16);
      }
    `}</style>
    <style jsx>{`
      .memories { background: radial-gradient(120% 90% at 50% 0%, #fff7fa 0%, #fbe6ee 55%, #f5d6e2 100%); }
      .memories-atlas:focus:not(:focus-visible) { outline: none; }
      .memories-atlas:focus-visible { outline: 3px solid #c2185b; }
    `}</style>
  </div>;
}
