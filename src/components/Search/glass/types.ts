// The contract between the memories atlas and its WebGL glass renderer. The atlas owns
// data, layout, camera, and search state; the renderer only draws and answers hit tests.
import type { Camera, Layout } from '../atlasLayout';

export type GlassTile = {
  key: string;
  color: string; // average colour, drawn until (or instead of) the thumbnail
  thumb: string | null; // thumbnail URL, loaded only once the tile is big enough on screen
};

export type GlassLetterCard = {
  tileIndex: number; // drawn in place of this tile, which is dimmed during the search
  title: string;
  caption: string; // e.g. "Letter · May 2024"
  image: string | null; // featured image URL
};

export type GlassPick = { kind: 'photo'; index: number } | { kind: 'letter'; card: number } | null;

export interface GlassAtlasRenderer {
  /** Replaces every tile; tile i sits at layout.positions[i]. */
  setTiles(tiles: GlassTile[], layout: Layout): void;
  /** CSS pixels; the renderer caps the pixel ratio itself. */
  setSize(width: number, height: number, pixelRatio: number): void;
  /** Same meaning as everywhere else in the atlas: zoom is pixels per world unit at the grid plane. */
  setCamera(camera: Camera): void;
  /** null when no search is active. Otherwise tile index -> rank (0 = best); every other tile dims. */
  setMatches(ranks: Map<number, number> | null): void;
  /** Letter cards replace the given dimmed tiles while a search is active; [] removes them. */
  setLetterCards(cards: GlassLetterCard[]): void;
  /** What is drawn under a CSS-pixel point in the canvas, accounting for the curved grid. */
  pick(screenX: number, screenY: number): GlassPick;
  /** Draws a frame. The renderer also redraws on its own as thumbnails arrive. */
  render(): void;
  dispose(): void;
}
