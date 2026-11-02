// Geometry for the memories atlas: a tidy grid with items shuffled into random cells, and a
// camera that maps world units to screen pixels at the grid's plane.

export const CELL = 100;
export const TILE = 88; // rounded glass tile; the rest of the cell is the gap between tiles
export const MATCH_SCALE = 1.08; // matched tiles lift slightly toward the viewer

export type Placed = { x: number; y: number }; // tile centre, world units
// The world point at the screen centre, and pixels per world unit at the grid's plane.
export type Camera = { x: number; y: number; zoom: number };

export type Layout = {
  positions: Placed[]; // one per item, same order as the items
  columns: number;
  width: number;
  height: number;
};

function shuffle<T>(values: T[]) {
  for (let index = values.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [values[index], values[other]] = [values[other], values[index]];
  }
  return values;
}

/** A grid about as wide as the screen's aspect, filled in a random order. The grid wraps,
 *  so every row is full: when the photos don't divide evenly, a few rows hold one fewer,
 *  spread through the grid and spaced a little wider. */
export function gridLayout(count: number, aspect: number): Layout {
  const target = Math.max(1, Math.ceil(Math.sqrt(count * Math.max(aspect, 0.5))));
  const rows = Math.max(1, Math.ceil(count / target));
  const fewer = Math.floor(count / rows);
  const extra = count % rows; // rows that hold one more than `fewer`
  const columns = fewer + (extra ? 1 : 0);
  const width = columns * CELL;
  const slots: Placed[] = [];
  for (let row = 0; row < rows; row++) {
    const inRow = fewer + (Math.floor(((row + 1) * extra) / rows) > Math.floor((row * extra) / rows) ? 1 : 0);
    for (let slot = 0; slot < inRow; slot++) slots.push({ x: ((slot + 0.5) * width) / inRow, y: row * CELL + CELL / 2 });
  }
  return { positions: shuffle(slots), columns, width, height: rows * CELL };
}

export function fitCamera(layout: Pick<Layout, 'width' | 'height'>, screenWidth: number, screenHeight: number): Camera {
  const zoom = Math.min(screenWidth / layout.width, screenHeight / layout.height) * 0.92;
  return { x: layout.width / 2, y: layout.height / 2, zoom: Number.isFinite(zoom) && zoom > 0 ? zoom : 1 };
}

// ---- the surface: one sphere for every zoom level ----------------------------------------
// Zoomed in, the grid lies on a sphere a few screens wide, so it curves away toward the
// screen's edges. Zooming out grows the sphere into the globe, whose circumference is the
// grid's width, so spinning the globe and panning sideways are the same motion. The grid
// wraps in both directions, so the camera is never clamped.

export const GLOBE_FILL = 0.8; // the globe's diameter as a share of the screen's shorter side
export const GLOBE_LATITUDE = (75 * Math.PI) / 180; // rows span ±75° on the globe; the poles stay empty
export const FLAT_CURVE = 1.6; // zoomed in: the screen's half-width spans 1/FLAT_CURVE radians of the sphere
const FLAT_ABOVE_GLOBE = 2.5; // fully flat-and-curved from this many times the globe's zoom

export const globeRadius = (layout: Pick<Layout, 'width'>) => layout.width / (2 * Math.PI);

/** The zoom at which the whole grid is the globe, filling GLOBE_FILL of the screen. */
export const globeZoom = (layout: Pick<Layout, 'width'>, screenWidth: number, screenHeight: number) =>
  (GLOBE_FILL * Math.min(screenWidth, screenHeight)) / (2 * globeRadius(layout));

/** 0 when zoomed in on the curved grid, 1 when fully the globe, eased in between. */
export function globeAmount(zoom: number, layout: Pick<Layout, 'width'>, screenWidth: number, screenHeight: number) {
  const globe = globeZoom(layout, screenWidth, screenHeight);
  const t = Math.min(1, Math.max(0, Math.log((globe * FLAT_ABOVE_GLOBE) / zoom) / Math.log(FLAT_ABOVE_GLOBE)));
  return t * t * (3 - 2 * t);
}

/** The shortest way round from `from` to `to` on a loop of length `period`. */
export const wrapDelta = (to: number, from: number, period: number) =>
  ((((to - from) % period) + period * 1.5) % period) - period / 2;

/** A random spot zoomed in to show about `tiles` photos, kept inside the grid. A grid
 *  that small already fits on screen just fits. */
export function openingCamera(layout: Pick<Layout, 'width' | 'height'>, screenWidth: number, screenHeight: number, tiles = 12): Camera {
  const fit = fitCamera(layout, screenWidth, screenHeight);
  const zoom = Math.max(fit.zoom, Math.sqrt((screenWidth * screenHeight) / (tiles * CELL * CELL)));
  const pick = (extent: number, screen: number) => {
    const half = screen / 2 / zoom;
    return half * 2 >= extent ? extent / 2 : half + Math.random() * (extent - half * 2);
  };
  return { x: pick(layout.width, screenWidth), y: pick(layout.height, screenHeight), zoom };
}

export const toScreen =(camera: Camera, x: number, y: number, width: number, height: number) =>
  ({ x: (x - camera.x) * camera.zoom + width / 2, y: (y - camera.y) * camera.zoom + height / 2 });

export const toWorld = (camera: Camera, x: number, y: number, width: number, height: number) =>
  ({ x: (x - width / 2) / camera.zoom + camera.x, y: (y - height / 2) / camera.zoom + camera.y });

/** Zooms by `factor` while keeping the world point under (sx, sy) where it is on screen. */
export function zoomAt(camera: Camera, factor: number, sx: number, sy: number, width: number, height: number, minZoom: number, maxZoom: number): Camera {
  const zoom = Math.min(maxZoom, Math.max(minZoom, camera.zoom * factor));
  const anchor = toWorld(camera, sx, sy, width, height);
  return { zoom, x: anchor.x - (sx - width / 2) / zoom, y: anchor.y - (sy - height / 2) / zoom };
}
