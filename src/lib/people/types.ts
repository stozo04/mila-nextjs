// The contract for people: what the browser's face scanner sends, and what the People
// page reads and writes. Thumbnails are public Storage URLs, like the search index's.

/** Where a face sits in its photo, as fractions of the photo's width and height. */
export type FaceBox = { x: number; y: number; width: number; height: number };

export type ScannedFace = {
  box: FaceBox;
  score: number; // detector confidence, 0..1
  embedding: number[]; // the face "fingerprint"; see FACE_DIMENSIONS
  thumb_path: string; // search/faces/<photo key>/<n>.webp, uploaded before posting
};

/** One photo's scan, including photos with no faces (so they count as scanned). */
export type FaceScan = { photo_key: string; faces: ScannedFace[] };

// POST /api/people/faces  { scans: FaceScan[] }  (admin; up to 10 scans)

export type PersonSummary = { id: string; name: string; photos: number; faces: number; thumb: string | null };
export type GroupSummary = { id: string; faces: number; thumbs: string[]; hidden: boolean };

// GET /api/people[?hidden=1]  (admin). Groups are the unnamed ones, biggest first; hidden
// groups only with ?hidden=1. `scanned` and `photos` feed the index page's Faces row.
export type PeopleList = {
  people: PersonSummary[]; groups: GroupSummary[]; scanned: number; photos: number;
  unnamed_faces: number; // unnamed, unhidden faces, for Match with named people
  can_undo: boolean; // the last match still has faces Undo can put back
};

export type FaceDetail = { id: string; thumb: string | null; photo_key: string; photo_thumb: string | null };

// GET /api/people/faces?group=<id> | ?person=<id>  (admin)  ->  { faces: FaceDetail[] }

export type PeopleAction =
  | { action: 'name'; group_ids: string[]; name: string } // typing an existing name joins that person
  | { action: 'merge'; group_ids: string[] }
  | { action: 'remove-face'; face_id: string } // "Not this person"
  | { action: 'remove-faces'; face_ids: string[] } // "Not these people": together, as one new group
  | { action: 'move-faces'; face_ids: string[]; name: string } // to that person; a new name creates them
  | { action: 'hide'; group_ids: string[]; hidden: boolean }
  | { action: 'rename'; person_id: string; name: string }
  | { action: 'unname'; person_id: string }; // "Remove name"

// POST /api/people  PeopleAction  (admin)  ->  PeopleList, refreshed

// POST /api/people/match  (admin)
//   { action: 'match', run, after }  ->  MatchBatch; repeat with after = last_id until done.
//     run is a fresh id per match; after is null for the first batch, which forgets the last match.
//   { action: 'undo' }  ->  { restored, list: PeopleList }
export type MatchRequest = { action: 'match'; run: string; after: string | null } | { action: 'undo' };
export type MatchBatch = { checked: number; matched: number; people: string[]; last_id: string | null; done: boolean };
