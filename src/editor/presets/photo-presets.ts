/**
 * Built-in background images.
 *
 * Files live in `public/backgrounds/<id>.jpg` (full size, ≤ 2560 px) and
 * `public/backgrounds/<id>-thumb.jpg` (tile preview), downloaded by
 * `scripts/fetch-backgrounds.sh`. They are Unsplash photos
 * (https://unsplash.com/license); `author` and `sourceUrl` are shown in the
 * picker as attribution.
 */
export type PhotoPreset = {
  id: string;
  /** Short description, used as the accessible name of the tile. */
  name: string;
  /** Photographer, for stock photos. */
  author?: string;
  /** Photo page on the stock library, for stock photos. */
  sourceUrl?: string;
};

export const PHOTO_PRESETS: PhotoPreset[] = [
  {
    id: "lake-painting",
    name: "Lake painting",
    author: "Birmingham Museums Trust",
    sourceUrl: "https://unsplash.com/photos/n1KetoL-JC8",
  },
  {
    id: "great-wave",
    name: "The Great Wave",
    author: "Art Institute of Chicago",
    sourceUrl: "https://unsplash.com/photos/ygxDHwEn5X0",
  },
  {
    id: "mountain-lake",
    name: "Mountain lake",
    author: "clement fusil",
    sourceUrl: "https://unsplash.com/photos/Fpqx6GGXfXs",
  },
  {
    id: "lavender-field",
    name: "Lavender field",
    author: "Dimitri Iakymuk",
    sourceUrl: "https://unsplash.com/photos/mCR10j_B6sM",
  },
  {
    id: "sand-dunes",
    name: "Sand dunes",
    author: "Andrew Svk",
    sourceUrl: "https://unsplash.com/photos/0s9oD70F-l4",
  },
];

export const photoSrc = (id: string) => `/backgrounds/${id}.jpg`;
export const photoThumbSrc = (id: string) => `/backgrounds/${id}-thumb.jpg`;

export function getPhotoPreset(id: string): PhotoPreset | undefined {
  return PHOTO_PRESETS.find((photo) => photo.id === id);
}
