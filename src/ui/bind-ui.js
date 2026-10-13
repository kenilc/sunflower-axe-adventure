import * as THREE from "three";
import { createPhotoMode } from "../rendering/photo-mode.js";
import { createPhotoView } from "../rendering/photo-view.js";
import { createPhotoCapture } from "../rendering/photo-capture.js";
import { bindPhotoGestures } from "../rendering/photo-gestures.js";
import { createPhotoAlbum } from "../systems/photo-album.js";
import { bindGameInput } from "../systems/input.js";
import { bindPhotography } from "./photography.js";
import { createHud } from "./hud.js";
import { bindTravelMap } from "./travel-map.js";
import { bindKeepsakes } from "./keepsakes.js";
import { clampPitch } from "../game/follow-camera.js";

// Camera mode, the album, keyboard/pointer input, the HUD and the map and
// keepsake dialogs. Gameplay rules (throwing, camera locks, scenery fading)
// stay in createGame and arrive here as callbacks.
export function bindGameUi({
  $,
  renderer,
  camera,
  scene,
  hero,
  heroRig,
  companion,
  companionReactions,
  locations,
  places,
  state,
  keys,
  passageTransition,
  sheepMoment,
  activityPhoto,
  clearRestInput,
  toast,
  fire,
  cameraLocked,
  toggleSound,
}) {
  // The dialogs need the journey, which is created later; see bindDialogs.
  let travelMap, collection;
  const photoMode = createPhotoMode({
    camera,
    actors: [hero, companion.character],
    getPlace: () => locations.active,
    getPreset: () =>
      locations.active.getPhotoPreset?.() ?? activityPhoto.preset(),
  });
  const photoAlbum = createPhotoAlbum();
  const photoView = createPhotoView({
    renderer,
    camera,
    frame: $("#photoFrame"),
    format: $("#photoFrameFormat"),
  });
  let photoGestures;

  const photography = bindPhotography({
    $,
    mode: photoMode,
    album: photoAlbum,
    camera,
    capture: createPhotoCapture({ renderer, scene }),
    canEnter: () =>
      (Boolean(activityPhoto.label()) ||
        (locations.active.canPhotograph?.() ??
          locations.active.canSaveLocation?.() !== false)) &&
      !collection?.open &&
      !travelMap?.open &&
      !$("#guide").open &&
      !passageTransition.active &&
      !sheepMoment.viewing,
    clearInput: clearRestInput,
    toast,
    getLocation: () =>
      locations.active.photoLocation?.() ??
      activityPhoto.label() ??
      locations.active.name ??
      locations.active.id,
    view: photoView,
    resetGestures: () => photoGestures?.reset(),
  });
  const { joy, cameraDrag } = bindGameInput({
    $,
    canvas: renderer.domElement,
    keys,
    passageTransition,
    invokeShortcut,
    handleKeydown: (event) =>
      collection?.keydown(event) ||
      travelMap?.keydown(event) ||
      photography.keydown(event),
    extraPaused: () =>
      photoMode.active ||
      photography.viewing ||
      collection?.open ||
      travelMap?.open,
    pointerAction: () =>
      photoMode.active ||
      photography.viewing ||
      collection?.open ||
      travelMap?.open
        ? undefined
        : locations.active.pointerAction
          ? locations.active.pointerAction()
          : fire(),
    repeatAllowed: () => !locations.active.blockPointerRepeat?.(),
    cameraLocked: () =>
      photoMode.active ||
      photography.viewing ||
      collection?.open ||
      travelMap?.open ||
      $("#guide").open ||
      sheepMoment.viewing ||
      cameraLocked(),
    rotate(dx, dy) {
      if (cameraLocked()) return;
      state.yaw -= dx * 0.006;
      state.pitch = clampPitch(state.pitch + dy * 0.004);
    },
    zoomBy(delta) {
      state.zoom = THREE.MathUtils.clamp(
        state.zoom + delta * 0.012,
        10,
        places.get(locations.area).maxZoom ?? 26,
      );
    },
    toggleSound,
  });
  photoGestures = bindPhotoGestures(renderer.domElement, {
    mode: photoMode,
    paused: () =>
      photography.viewing ||
      collection?.open ||
      travelMap?.open ||
      $("#guide").open ||
      passageTransition.active,
    changed: photography.updateControls,
  });
  function getHud() {
    return locations.active.getHud?.() ?? {};
  }
  function invokeShortcut(code) {
    if (
      photoMode.active ||
      photography.viewing ||
      collection?.open ||
      travelMap.open ||
      $("#guide").open ||
      passageTransition.active
    )
      return false;
    const action = (getHud().actions ?? []).find(
      (entry) =>
        entry.key === code && entry.visible !== false && !entry.disabled,
    );
    if (!action) return false;
    companionReactions.cancel();
    action.run?.();
    return true;
  }
  const updateHud = createHud({
    $,
    getPlace: () => locations.active,
    getHud,
    canInteract: () =>
      !photoMode.active &&
      !photography.viewing &&
      !collection?.open &&
      !travelMap.open &&
      !$("#guide").open &&
      !passageTransition.active,
    canThrow: () => locations.active.canThrow && heroRig.items.canThrow,
  });

  function bindDialogs({ journey, keepsakes, canSaveLocation }) {
    travelMap = bindTravelMap({
      $,
      journey,
      canOpen: () => canSaveLocation() && !$("#guide").open,
      clearInput: clearRestInput,
      toast,
    });
    collection = bindKeepsakes({
      $,
      keepsakes,
      canOpen: () => canSaveLocation() && !travelMap.open && !$("#guide").open,
      clearInput: clearRestInput,
      toast,
    });
  }
  return {
    photoMode,
    photoAlbum,
    photoView,
    photography,
    photoGestures,
    joy,
    cameraDrag,
    getHud,
    invokeShortcut,
    updateHud,
    bindDialogs,
    get travelMap() {
      return travelMap;
    },
    get collection() {
      return collection;
    },
  };
}
