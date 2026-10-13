// Photos used to live in localStorage under this key; it is now read only to
// migrate them into IndexedDB, which has room for a much larger album.
export const PHOTO_ALBUM_KEY = "sunflower-photo-album-v1";
export const PHOTO_DATABASE = "sunflower-photo-album";
export const PHOTO_LIMIT = 200;
const PHOTOS = "photos",
  META = "meta",
  MIGRATED = "legacy-migrated";

function isPhoto(photo) {
  return (
    typeof photo?.id === "string" &&
    typeof photo.location === "string" &&
    typeof photo.createdAt === "string" &&
    !Number.isNaN(Date.parse(photo.createdAt)) &&
    typeof photo.image === "string" &&
    /^data:image\/(jpeg|png);base64,/.test(photo.image)
  );
}

const newestFirst = (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt);

function result(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function committed(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = transaction.onabort = () =>
      reject(transaction.error ?? new Error("transaction-aborted"));
  });
}

function openDatabase(factory) {
  const request = factory.open(PHOTO_DATABASE, 1);
  request.onupgradeneeded = () => {
    request.result.createObjectStore(PHOTOS, { keyPath: "id" });
    request.result.createObjectStore(META);
  };
  return result(request);
}

function readLegacy(storage) {
  const saved = JSON.parse(storage.getItem(PHOTO_ALBUM_KEY) ?? "null");
  if (saved === null) return null;
  if (!Array.isArray(saved)) throw new Error("Invalid album");
  return saved.filter(isPhoto);
}

export function createPhotoAlbum({
  storage = () => globalThis.localStorage,
  database = () => globalThis.indexedDB,
} = {}) {
  let photos = [],
    loadError = false,
    loaded = false,
    db = null;

  async function migrate(legacy) {
    // Copy in one transaction with a marker, and drop the old copy only after
    // it commits: a failure part-way keeps the localStorage photos for the
    // next start, and the marker stops a later start from bringing back
    // photos deleted since the move.
    const transaction = db.transaction([PHOTOS, META], "readwrite");
    const meta = transaction.objectStore(META);
    meta.get(MIGRATED).onsuccess = (event) => {
      if (event.target.result) return;
      for (const photo of legacy) transaction.objectStore(PHOTOS).put(photo);
      meta.put(true, MIGRATED);
    };
    await committed(transaction);
    try {
      storage().removeItem(PHOTO_ALBUM_KEY);
    } catch {
      // The marker already prevents a second copy.
    }
  }

  async function load() {
    let legacy = null;
    try {
      legacy = readLegacy(storage());
    } catch {
      // An unreadable old album is left in place untouched.
    }
    try {
      db = await openDatabase(database());
      if (legacy) await migrate(legacy);
      const saved = await result(
        db.transaction(PHOTOS).objectStore(PHOTOS).getAll(),
      );
      photos = saved.filter(isPhoto).sort(newestFirst);
    } catch {
      // Without IndexedDB, still show any old photos so they can be
      // downloaded, but nothing can be saved or deleted.
      db = null;
      loadError = true;
      photos = legacy ?? [];
    }
    loaded = true;
  }

  const ready = load();
  let queue = ready;
  // One write at a time, so two quick shutter presses cannot both pass the
  // limit check.
  function enqueue(task) {
    const run = queue.then(task);
    queue = run.catch(() => {});
    return run;
  }
  async function write(change) {
    if (!db) throw new Error("album-unavailable");
    const transaction = db.transaction(PHOTOS, "readwrite");
    change(transaction.objectStore(PHOTOS));
    await committed(transaction);
  }

  return {
    ready,
    get loaded() {
      return loaded;
    },
    get photos() {
      return photos.map((photo) => ({ ...photo }));
    },
    get loadError() {
      return loadError;
    },
    // Resolves once every pending save and delete has finished.
    whenIdle() {
      return queue;
    },
    add(image, location) {
      return enqueue(async () => {
        if (db && photos.length >= PHOTO_LIMIT) throw new Error("album-full");
        const photo = {
          id:
            globalThis.crypto?.randomUUID?.() ??
            `${Date.now()}-${Math.random()}`,
          image,
          location,
          createdAt: new Date().toISOString(),
        };
        // Commit in memory only after durable storage succeeds; quota
        // failures must never discard an existing keepsake or report a false
        // success.
        await write((store) => store.add(photo));
        photos = [photo, ...photos];
        // Ask the browser not to clear the album under storage pressure. It
        // may say no, and the album still works either way.
        globalThis.navigator?.storage?.persist?.().catch(() => {});
        return { ...photo };
      });
    },
    remove(id) {
      return enqueue(async () => {
        await write((store) => store.delete(id));
        photos = photos.filter((photo) => photo.id !== id);
      });
    },
  };
}
