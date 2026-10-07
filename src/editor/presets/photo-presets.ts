/**
 * Built-in background images.
 *
 * Files live in `public/backgrounds/<id>.jpg` (full size, ≤ 2560 px) and
 * `public/backgrounds/<id>-thumb.jpg` (tile preview), downloaded by
 * `scripts/fetch-backgrounds.sh`. They are public-domain artworks published
 * on Unsplash by museums (https://unsplash.com/license); `author` and
 * `sourceUrl` are shown in the picker as attribution.
 */
type PhotoPreset = {
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
    id: "starry-sea",
    name: "Starry sea",
    author: "The Cleveland Museum of Art",
    sourceUrl: "https://unsplash.com/photos/aUCfZrhCd00",
  },
  {
    id: "green-hills",
    name: "Green hills",
    author: "The Cleveland Museum of Art",
    sourceUrl: "https://unsplash.com/photos/oF5n8culzHg",
  },
  {
    id: "lilac-fog",
    name: "Lilac fog",
    author: "Art Institute of Chicago",
    sourceUrl: "https://unsplash.com/photos/ONe3eufNvz4",
  },
  {
    id: "lilies",
    name: "Lilies",
    author: "Art Institute of Chicago",
    sourceUrl: "https://unsplash.com/photos/O3RJ29-Vezw",
  },
  {
    id: "gold-flowers",
    name: "Gold flowers",
    author: "The Cleveland Museum of Art",
    sourceUrl: "https://unsplash.com/photos/E4gghSrMtdw",
  },
];

export const photoSrc = (id: string) => `/backgrounds/${id}.jpg`;
export const photoThumbSrc = (id: string) => `/backgrounds/${id}-thumb.jpg`;

export function getPhotoPreset(id: string): PhotoPreset | undefined {
  return PHOTO_PRESETS.find((photo) => photo.id === id);
}
