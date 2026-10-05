/**
 * Built-in background photos from Unsplash (https://unsplash.com/license).
 *
 * Files live in `public/backgrounds/<id>.jpg` (full size, ≤ 2560 px) and
 * `public/backgrounds/<id>-thumb.jpg` (tile preview). Attribution is shown in
 * the picker even though the Unsplash License does not require it.
 */
export type PhotoPreset = {
  id: string;
  /** Short description, used as the accessible name of the tile. */
  name: string;
  author: string;
  /** Unsplash photo page. */
  sourceUrl: string;
};

export const PHOTO_PRESETS: PhotoPreset[] = [];

export const photoSrc = (id: string) => `/backgrounds/${id}.jpg`;
export const photoThumbSrc = (id: string) => `/backgrounds/${id}-thumb.jpg`;

export function getPhotoPreset(id: string): PhotoPreset | undefined {
  return PHOTO_PRESETS.find((photo) => photo.id === id);
}
