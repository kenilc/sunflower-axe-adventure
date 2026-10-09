export const PHOTO_ALBUM_KEY = "sunflower-photo-album-v1";
export const PHOTO_LIMIT = 30;

export function createPhotoAlbum({
  storage = () => globalThis.localStorage,
} = {}) {
  let photos = [],
    loadError = false;
  try {
    const saved = JSON.parse(storage().getItem(PHOTO_ALBUM_KEY) ?? "[]");
    if (!Array.isArray(saved)) throw new Error("Invalid album");
    photos = saved
      .filter(
        (photo) =>
          typeof photo?.id === "string" &&
          typeof photo.location === "string" &&
          typeof photo.createdAt === "string" &&
          !Number.isNaN(Date.parse(photo.createdAt)) &&
          typeof photo.image === "string" &&
          /^data:image\/(jpeg|png);base64,/.test(photo.image),
      )
      .slice(0, PHOTO_LIMIT);
  } catch {
    loadError = true;
  }
  function persist(next) {
    // Commit in memory only after durable storage succeeds; quota failures
    // must never discard an existing keepsake or report a false success.
    storage().setItem(PHOTO_ALBUM_KEY, JSON.stringify(next));
    photos = next;
    loadError = false;
  }
  return {
    get photos() {
      return photos.map((photo) => ({ ...photo }));
    },
    get loadError() {
      return loadError;
    },
    add(image, location) {
      if (photos.length >= PHOTO_LIMIT) throw new Error("album-full");
      const photo = {
        id:
          globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        image,
        location,
        createdAt: new Date().toISOString(),
      };
      persist([photo, ...photos]);
      return photo;
    },
    remove(id) {
      persist(photos.filter((photo) => photo.id !== id));
    },
  };
}
