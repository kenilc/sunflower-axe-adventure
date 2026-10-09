import { PHOTO_LIMIT } from "../systems/photo-album.js";

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
}) {
  let selected = null;
  const actorOffsets = [
    { x: 0, z: 0, heading: 0 },
    { x: 0, z: 0, heading: 0 },
  ];
  const albumDialog = $("#photoAlbum");
  function syncCamera() {
    for (const name of ["pitch", "distance", "horizontal", "vertical"])
      $(`#photo-${name}`).value = mode.settings[name];
  }
  function syncActor() {
    const index = Number($("#photoActor").value);
    for (const name of ["x", "z", "heading"])
      $(`#actor-${name}`).value = actorOffsets[index][name];
  }
  function reset() {
    mode.reset();
    actorOffsets.forEach((offset) =>
      Object.assign(offset, { x: 0, z: 0, heading: 0 }),
    );
    syncActor();
    syncCamera();
  }
  function exit() {
    mode.exit();
    $("#photoControls").hidden = true;
    document.body.classList.toggle("photo-mode", false);
    $("#cameraAction").setAttribute("aria-pressed", "false");
    clearInput();
    $("#cameraAction").focus?.();
  }
  function enter() {
    if (albumDialog.open || !canEnter()) {
      toast(
        "Finish the activity or close the open view before using the camera.",
      );
      return false;
    }
    clearInput();
    mode.enter();
    reset();
    $("#photoControls").hidden = false;
    document.body.classList.toggle("photo-mode", true);
    $("#cameraAction").setAttribute("aria-pressed", "true");
    $("#photoActor").focus?.();
    $("#photoStatus").textContent =
      "Drag to orbit · Scroll to zoom · Enter to take a photo · Esc to exit";
    return true;
  }
  function takePhoto() {
    if (!mode.active || albumDialog.open || $("#guide").open) return false;
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
      album.add(image, getLocation());
      $("#photoStatus").textContent =
        `Photo saved ♥ ${album.photos.length} / ${PHOTO_LIMIT} in your album`;
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
    $("#downloadPhoto").download =
      `sunflower-${photo.createdAt.replace(/[:.]/g, "-")}.jpg`;
  }
  function renderAlbum() {
    const photos = album.photos;
    $("#albumSummary").textContent = album.loadError
      ? "The saved album could not be read. Browser storage may be unavailable."
      : photos.length
        ? `${photos.length} / ${PHOTO_LIMIT} photos · Saved in this browser`
        : "Your album is waiting for its first memory. Open Camera to take a photo.";
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
    if (!mode.active && !canEnter()) {
      toast(
        "Finish the activity or close the open view before opening the album.",
      );
      return false;
    }
    if (albumDialog.open) return true;
    clearInput();
    renderAlbum();
    albumDialog.showModal();
    return true;
  }
  $("#cameraAction").onclick = () => (mode.active ? exit() : enter());
  $("#albumAction").onclick = openAlbum;
  $("#photoAlbumAction").onclick = openAlbum;
  $("#exitPhotoMode").onclick = exit;
  $("#takePhoto").onclick = takePhoto;
  $("#resetPhoto").onclick = reset;
  $("#closeAlbum").onclick = closeAlbum;
  albumDialog.addEventListener("close", clearInput);
  $("#deletePhoto").onclick = () => {
    if (!selected) return;
    try {
      album.remove(selected);
      renderAlbum();
    } catch {
      $("#albumSummary").textContent =
        "Photo could not be deleted. Browser storage is unavailable.";
    }
  };
  $("#photoActor").onchange = syncActor;
  for (const name of ["x", "z", "heading"]) {
    $(`#actor-${name}`).oninput = (event) => {
      const index = Number($("#photoActor").value);
      actorOffsets[index][name] = Number(event.target.value);
      mode.adjustActor(index, actorOffsets[index]);
    };
  }
  for (const name of ["pitch", "distance", "horizontal", "vertical"]) {
    $(`#photo-${name}`).oninput = (event) => {
      mode.settings[name] = Number(event.target.value);
      mode.updateCamera();
    };
  }
  return {
    enter,
    exit,
    openAlbum,
    closeAlbum,
    takePhoto,
    syncCamera,
    get viewing() {
      return albumDialog.open;
    },
    keydown(event) {
      if (albumDialog.open || $("#guide").open)
        return mode.active || albumDialog.open;
      const editing = ["INPUT", "SELECT", "BUTTON", "A", "TEXTAREA"].includes(
        event.target?.tagName,
      );
      if (event.code === "Escape" && mode.active) {
        event.preventDefault();
        exit();
        return true;
      }
      if (editing || $("#guide").open) return mode.active;
      if (!event.repeat && event.code === "KeyM") {
        mode.active ? exit() : enter();
        return true;
      }
      if (!event.repeat && event.code === "KeyL") {
        openAlbum();
        return true;
      }
      if (!mode.active) return false;
      if (["Enter", "Space"].includes(event.code)) {
        event.preventDefault();
        if (!event.repeat) takePhoto();
      }
      return true;
    },
  };
}
