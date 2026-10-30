// Face-finding numbers, shared by the browser scanner and the server. Calibrated on 226 faces
// from 136 of Mila's photos (newborn to age 3, family events), labelled by hand as Steven,
// Mila's mom, Mila at three ages, and others. No Human import here, so server code can use it.

/** Length of Human's face description ("faceres"); the database column must match. */
export const FACE_DIMENSIONS = 1024;

/** Detector confidence below this is mostly not a face (church icons, signs, cartoons). */
export const FACE_MIN_SCORE = 0.5;

/** Faces smaller than this share of the photo's short side, or than FACE_MIN_PX in the
 *  detection image, are background people and are skipped. */
export const FACE_MIN_FRACTION = 0.05;
export const FACE_MIN_PX = 40;

/** Photos are scanned at most this many pixels on the long side. */
export const FACE_DETECT_SIZE = 1600;

/** A new face joins the group of its most similar face at or above this cosine similarity.
 *  At 0.55, 99.6% of grouped pairs among Steven, Mila's mom, and Mila were the same person;
 *  Mila split into about five groups across ages, which merging joins. */
export const FACE_JOIN = 0.55;

/** A new face joins a named person directly at or above this; below, it waits in the
 *  unnamed groups for Steven. Look-alike relatives scored up to ~0.7 against family faces. */
export const FACE_AUTO = 0.7;
