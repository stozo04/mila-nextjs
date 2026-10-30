import type { CollectionId, PhotoCollection } from './collections';

export type PhotoResult = { kind: 'photo'; key: string; url: string; thumb: string | null; collection: PhotoCollection; score: number };
export type LetterResult = { kind: 'letter'; key: string; slug: string; title: string; date: string; image: string | null; score: number };
export type SearchResult = PhotoResult | LetterResult;

export type IndexStatus = {
  collections: { id: CollectionId; label: string; indexed: number; total: number }[];
  pending: {
    photos: { key: string; collection: PhotoCollection }[];
    letters: { key: string; title: string; content: string; hash: string }[];
  };
  orphans: string[];
  faces: { scanned: number; total: number; pending: string[] }; // photos to scan for people
};

// One row for POST /api/search/index. Photos carry their preview; letters the hash of
// the text that was embedded.
export type IndexItem = {
  key: string;
  kind: 'photo' | 'letter';
  collection: CollectionId;
  embedding: number[];
  thumb_path?: string | null;
  color?: string | null;
  width?: number | null;
  height?: number | null;
  source_hash?: string | null;
};
