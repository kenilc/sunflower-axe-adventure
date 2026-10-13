import { PHOTO_LIMIT } from "../systems/photo-album.js";
import { createZip } from "../systems/zip.js";

function photoFileName(photo) {
  const extension = photo.image.startsWith("data:image/png;") ? "png" : "jpg";
  return `sunflower-${photo.createdAt.replace(/[:.]/g, "-")}.${extension}`;
}

function photoBytes(photo) {
  const binary = atob(photo.image.slice(photo.image.indexOf(",") + 1));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click?.();
  // Revoking straight away can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function bindPhotography({
  $,
  mode,
  album,
  capture,
  camera,
  canEnter,
  clearInput,
  toast,
  getLocation,
  view,
  resetGestures = () => {},
  download = downloadBlob,
}) {
  let selected = null;
  const albumDialog = $("#photoAlbum");
  function updateControls({ moving = false } = {}) {
    const actor = mode.selectedActor;
    $("#photoSubject").textContent =
      actor === null
        ? "Scene"
        : actor === 0
          ? "Flower adventurer"
          : "Companion";
    $("#photoSelection").setAttribute("data-moving", String(moving));
    const hint = !mode.canEditActors
      ? "Activity paused · Drag to orbit · Pinch to zoom"
      : moving
        ? "Ready to move · Drag your friend into place"
        : "Drag to turn · Hold to move · Pinch to zoom";
    if ($("#photoHint").textContent !== hint)
      $("#photoHint").textContent = hint;
    $("#photoKeyboard").textContent = !mode.canEditActors
      ? "Activity poses are held in place. Arrow keys orbit; Shift and arrow keys frame. Plus and minus zoom; R resets. Enter takes a photo. Escape resumes the activity."
      : "Keyboard: 1 selects the adventurer, 2 selects the companion, 0 selects the scene. Arrow keys turn; Shift and arrow keys move or frame. Plus and minus zoom; R resets. Enter takes a photo. Escape exits.";
    $("#photoZoom").textContent =
      `${(12 / mode.settings.distance).toFixed(1)}×`;
  }
  function updateSelection() {
    const bounds = mode.selectionBounds();
    const reticle = $("#photoSelection");
    reticle.hidden = !bounds;
    if (bounds)
      Object.assign(reticle.style, {
        left: `${bounds.left * 100}%`,
        top: `${bounds.top * 100}%`,
        width: `${bounds.width * 100}%`,
        height: `${bounds.height * 100}%`,
      });
  }
  function reset() {
    resetGestures();
    mode.reset();
    updateControls();
  }
  function exit() {
    resetGestures();
    mode.exit();
    view.resize(false);
    $("#photoControls").hidden = true;
    document.body.classList.toggle("photo-mode", false);
    $("#cameraAction").setAttribute("aria-pressed", "false");
    clearInput();
    $("#cameraAction").focus?.();
  }
  function enter() {
    if (albumDialog.open || !canEnter()) {
      toast(
        "Close the open view or wait for the scene change before using the camera.",
      );
      return false;
    }
    clearInput();
    mode.enter();
    view.resize(true);
    reset();
    $("#photoControls").hidden = false;
    document.body.classList.toggle("photo-mode", true);
    $("#cameraAction").setAttribute("aria-pressed", "true");
    $("#photoStatus").textContent = "";
    // A focused HUD button would swallow Enter/Space instead of taking a photo.
    document.activeElement?.blur?.();
    return true;
  }
  async function savePhoto(image, location) {
    const photo = await album.add(image, location);
    $("#photoAlbumThumb").src = image;
    $("#photoAlbumThumb").hidden = false;
    return photo;
  }
  async function takePhoto() {
    if (!mode.active || albumDialog.open || $("#guide").open) return false;
    resetGestures();
    try {
      mode.updateCamera();
      const width = Math.round(
        camera.aspect >= 1 ? 1024 : 1024 * camera.aspect,
      );
      const height = Math.round(
        camera.aspect >= 1 ? 1024 / camera.aspect : 1024,
      );
      const image = capture(camera, [], {
        width,
        height,
        type: "image/jpeg",
        quality: 0.82,
      });
      if (!image) throw new Error("capture-unavailable");
      $("#photoStatus").textContent = "Saving photo…";
      await savePhoto(image, getLocation());
      $("#photoStatus").textContent =
        `Photo saved ♥ ${album.photos.length} / ${PHOTO_LIMIT}`;
      const flash = $("#photoFlash");
      flash.animate?.([{ opacity: 0.8 }, { opacity: 0 }], { duration: 250 });
      return true;
    } catch (error) {
      $("#photoStatus").textContent =
        error.message === "album-full"
          ? "Your album is full. Download or delete a photo to make room."
          : "Photo could not be saved. Browser storage may be full or unavailable. Free space in the album and try again.";
      return false;
    }
  }
  function showSelected() {
    const photo = album.photos.find((entry) => entry.id === selected);
    $("#albumDetail").hidden = !photo;
    if (!photo) return;
    $("#albumImage").src = photo.image;
    $("#albumImage").alt = `Adventure photo in ${photo.location}`;
    $("#albumCaption").textContent =
      `${photo.location} · ${new Date(photo.createdAt).toLocaleString()}`;
    $("#downloadPhoto").href = photo.image;
    $("#downloadPhoto").download = photoFileName(photo);
    $("#deletePhoto").disabled = album.loadError;
  }
  function renderAlbum() {
    const photos = album.photos;
    $("#albumSummary").textContent = !album.loaded
      ? "Opening your album…"
      : album.loadError
        ? photos.length
          ? `${photos.length} photos · Browser storage is unavailable, so photos can be downloaded but not added or deleted.`
          : "The saved album could not be read. Browser storage may be unavailable."
        : photos.length
          ? `${photos.length} / ${PHOTO_LIMIT} photos · Saved in this browser`
          : "Your album is waiting for its first memory. Open Camera to take a photo.";
    $("#downloadAllPhotos").hidden = !photos.length;
    const grid = $("#albumGrid");
    grid.replaceChildren();
    for (const photo of photos) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "album-thumbnail";
      button.setAttribute(
        "aria-label",
        `View photo in ${photo.location}, ${new Date(photo.createdAt).toLocaleString()}`,
      );
      const image = document.createElement("img");
      image.src = photo.image;
      image.alt = `Adventure photo in ${photo.location}`;
      image.loading = "lazy";
      button.appendChild(image);
      button.onclick = () => {
        selected = photo.id;
        showSelected();
      };
      grid.appendChild(button);
    }
    if (!photos.some((photo) => photo.id === selected))
      selected = photos[0]?.id ?? null;
    showSelected();
  }
  function closeAlbum() {
    albumDialog.close();
    clearInput();
  }
  function openAlbum() {
    resetGestures();
    if (!mode.active && !canEnter()) {
      toast(
        "Close the open view or wait for the scene change before opening the album.",
      );
      return false;
    }
    if (albumDialog.open) return true;
    clearInput();
    renderAlbum();
    albumDialog.showModal();
    if (!album.loaded)
      album.ready.then(() => albumDialog.open && renderAlbum());
    return true;
  }
  function downloadAll() {
    const photos = album.photos;
    if (!photos.length) return;
    const used = new Set();
    const files = photos.map((photo) => {
      let name = photoFileName(photo);
      for (let n = 2; used.has(name); n++)
        name = photoFileName(photo).replace(/(\.\w+)$/, `-${n}$1`);
      used.add(name);
      return {
        name,
        bytes: photoBytes(photo),
        date: new Date(photo.createdAt),
      };
    });
    const day = new Date().toISOString().slice(0, 10);
    download(
      new Blob([createZip(files)], { type: "application/zip" }),
      `sunflower-photos-${day}.zip`,
    );
  }
  $("#cameraAction").onclick = () => (mode.active ? exit() : enter());
  $("#albumAction").onclick = openAlbum;
  $("#photoAlbumAction").onclick = openAlbum;
  $("#exitPhotoMode").onclick = exit;
  $("#takePhoto").onclick = takePhoto;
  $("#closeAlbum").onclick = closeAlbum;
  albumDialog.addEventListener("close", clearInput);
  $("#downloadAllPhotos").onclick = downloadAll;
  $("#deletePhoto").onclick = async () => {
    if (!selected) return;
    try {
      await album.remove(selected);
      renderAlbum();
    } catch {
      $("#albumSummary").textContent =
        "Photo could not be deleted. Browser storage is unavailable.";
    }
  };
  $("#photoAlbumThumb").hidden = true;
  album.ready.then(() => {
    const latest = album.photos[0];
    $("#photoAlbumThumb").hidden = !latest;
    if (latest) $("#photoAlbumThumb").src = latest.image;
  });
  return {
    enter,
    exit,
    openAlbum,
    closeAlbum,
    takePhoto,
    savePhoto,
    downloadAll,
    updateControls,
    updateSelection,
    get viewing() {
      return albumDialog.open;
    },
    keydown(event) {
      if (albumDialog.open || $("#guide").open)
        return mode.active || albumDialog.open;
      const typing = ["INPUT", "SELECT", "TEXTAREA"].includes(
          event.target?.tagName,
        ),
        editing = typing || ["BUTTON", "A"].includes(event.target?.tagName);
      if (event.code === "Escape" && mode.active) {
        event.preventDefault();
        exit();
        return true;
      }
      if (mode.active && ["Digit1", "Digit2", "Digit0"].includes(event.code)) {
        resetGestures();
        mode.selectActor(
          event.code === "Digit0" ? null : Number(event.code.at(-1)) - 1,
        );
        updateControls();
        return true;
      }
      if (mode.active && event.code.startsWith("Arrow")) {
        event.preventDefault();
        const dx =
          event.code === "ArrowRight"
            ? 10
            : event.code === "ArrowLeft"
              ? -10
              : 0;
        const dy =
          event.code === "ArrowDown" ? 10 : event.code === "ArrowUp" ? -10 : 0;
        if (mode.selectedActor !== null) {
          if (event.shiftKey) {
            const position = mode.selectedPosition;
            position.x += dx * 0.03;
            position.z += dy * 0.03;
            mode.moveSelected(position);
          } else mode.turnSelected(dx);
        } else if (event.shiftKey) mode.pan(dx, dy, 600);
        else mode.rotate(dx, dy);
        updateControls();
        return true;
      }
      if (
        mode.active &&
        !editing &&
        ["Equal", "NumpadAdd", "Minus", "NumpadSubtract"].includes(event.code)
      ) {
        event.preventDefault();
        mode.zoomByScale(
          ["Equal", "NumpadAdd"].includes(event.code) ? 0.85 : 1 / 0.85,
        );
        updateControls();
        return true;
      }
      if (mode.active && !editing && event.code === "KeyR") {
        if (!event.repeat) reset();
        return true;
      }
      // A focused button (e.g. after closing a dialog) must not block M and L.
      if (typing) return mode.active;
      if (!event.repeat && event.code === "KeyM") {
        mode.active ? exit() : enter();
        return true;
      }
      if (!event.repeat && event.code === "KeyL") {
        openAlbum();
        return true;
      }
      if (!mode.active) return false;
      if (editing) return true;
      if (["Enter", "Space"].includes(event.code)) {
        event.preventDefault();
        if (!event.repeat) takePhoto();
      }
      return true;
    },
  };
}
