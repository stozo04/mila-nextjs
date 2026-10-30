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

/** A grid about as wide as the screen's aspect, filled row by row in a random order. */
export function gridLayout(count: number, aspect: number): Layout {
  const columns = Math.max(1, Math.ceil(Math.sqrt(count * Math.max(aspect, 0.5))));
  const rows = Math.max(1, Math.ceil(count / columns));
  const cells = shuffle(Array.from({ length: count }, (_, index) => index));
  const positions = cells.map(cell => ({
    x: (cell % columns) * CELL + CELL / 2,
    y: Math.floor(cell / columns) * CELL + CELL / 2,
  }));
  return { positions, columns, width: columns * CELL, height: rows * CELL };
}

export function fitCamera(layout: Pick<Layout, 'width' | 'height'>, screenWidth: number, screenHeight: number): Camera {
  const zoom = Math.min(screenWidth / layout.width, screenHeight / layout.height) * 0.92;
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
