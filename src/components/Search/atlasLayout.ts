// Geometry for the memories atlas: a jittered grid with items shuffled into random
// cells, and a camera that maps world units to screen pixels.

export const CELL = 100;
export const TILE = 80;
export const LETTER_TILE = 90; // the size of a highlighted photo, so cards never cover their neighbours

export type Placed = { x: number; y: number }; // tile centre, world units
export type Camera = { x: number; y: number; zoom: number }; // world point at the screen centre

export type Layout = {
  positions: Placed[]; // one per photo, same order as the items
  spare: Placed[]; // empty cells, for letter cards that appear with a search
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

export function randomLayout(count: number, aspect: number): Layout {
  const cells = Math.ceil(count * 1.12) + 24; // gaps keep it airy and leave room for letters
  const columns = Math.max(1, Math.ceil(Math.sqrt(cells * Math.max(aspect, 0.5))));
  const rows = Math.ceil(cells / columns);
  const jitter = (CELL - TILE) / 2;
  const centres = shuffle(Array.from({ length: columns * rows }, (_, cell) => ({
    x: (cell % columns) * CELL + CELL / 2 + (Math.random() * 2 - 1) * jitter,
    y: Math.floor(cell / columns) * CELL + CELL / 2 + (Math.random() * 2 - 1) * jitter,
  })));
  return { positions: centres.slice(0, count), spare: centres.slice(count), width: columns * CELL, height: rows * CELL };
}

export function fitCamera(layout: Pick<Layout, 'width' | 'height'>, screenWidth: number, screenHeight: number): Camera {
  const zoom = Math.min(screenWidth / layout.width, screenHeight / layout.height) * 0.95;
  return { x: layout.width / 2, y: layout.height / 2, zoom: Number.isFinite(zoom) && zoom > 0 ? zoom : 1 };
}

export const toScreen = (camera: Camera, x: number, y: number, width: number, height: number) =>
  ({ x: (x - camera.x) * camera.zoom + width / 2, y: (y - camera.y) * camera.zoom + height / 2 });

export const toWorld = (camera: Camera, x: number, y: number, width: number, height: number) =>
  ({ x: (x - width / 2) / camera.zoom + camera.x, y: (y - height / 2) / camera.zoom + camera.y });

/** Zooms by `factor` while keeping the world point under (sx, sy) where it is on screen. */
export function zoomAt(camera: Camera, factor: number, sx: number, sy: number, width: number, height: number, minZoom: number, maxZoom: number): Camera {
  const zoom = Math.min(maxZoom, Math.max(minZoom, camera.zoom * factor));
  const anchor = toWorld(camera, sx, sy, width, height);
  return { zoom, x: anchor.x - (sx - width / 2) / zoom, y: anchor.y - (sy - height / 2) / zoom };
}
