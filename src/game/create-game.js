import { registerPlaces } from "../locations/register-places.js";
import { createPlaceTransitions } from "./place-transitions.js";
import { createPlaceRegistry } from "./place-registry.js";
import * as THREE from "three";
import { createCompanion } from "../characters/companion.js";
import { createCompanionReactions } from "../characters/reactions.js";
import { createHearts } from "../systems/hearts.js";
import { createSceneTransition } from "./scene-transition.js";
import { createBenchMoment } from "../locations/garden/lakeside.js";
import { createRendering } from "../rendering/renderer.js";
import { createActivityPhoto } from "../rendering/activity-photo.js";
import { createMeshFactory } from "../rendering/mesh-factory.js";
import { createEffects } from "../systems/effects.js";
import { createRandom } from "../systems/random.js";
import { createHero } from "../characters/hero.js";
import { createGarden } from "../locations/garden/world.js";
import { createLocationManager } from "./location-manager.js";
import { createGameLoop } from "./game-loop.js";
import { createLocationSave } from "./location-save.js";
import { createKeepsakes } from "../systems/keepsakes.js";
import { createJourney } from "./journey.js";
import { registerAdventureProgress } from "../integrations/adventure-progress.js";
import { createProgressReader } from "./progress.js";
import { createGameApi } from "./game-api.js";
import { createFollowCamera } from "./follow-camera.js";
import { createPlayerMovement } from "./player-movement.js";
import { createSceneryFading } from "../rendering/scenery-fading.js";
import { createFeedback } from "../ui/feedback.js";
import { bindGameUi } from "../ui/bind-ui.js";

export function createGame({ createRenderer, models } = {}) {
  const places = createPlaceRegistry();
  const state = {
    castleOutsideView: null,
    festivalBridgeSeen: false,
    activeVillageShop: null,
    villageView: null,
    villageActivityCooldown: 0,
    riverCollected: 0,
    passageCooldown: 0,
    outsideView: null,
    outsideObjective: "",
    castleActivityCooldown: 0,
    castleMusicSession: 0,
    festivalView: null,
    yaw: 0,
    pitch: THREE.MathUtils.degToRad(16),
    zoom: 20,
    isMoving: false,
    cooldown: 0,
    score: 0,
    collected: 0,
    won: false,
    walk: 0,
    throwAnim: 0,
    sound:
      typeof location === "undefined" ||
      new URLSearchParams(location.search).get("sound") !== "off",
    toastUntil: 0,
  };
  const $ = (s) => document.querySelector(s);
  const { toast, beep, setSound } = createFeedback({
    $,
    state,
    getSoundscape: () => locations.active.soundscape ?? locations.current,
  });
  const { renderer, scene, camera, sun, environment } = createRendering({
    $,
    createRenderer,
  });
  const hearts = createHearts(scene);
  const { mat, mesh, box, ball, cyl } = createMeshFactory(scene);
  const rand = createRandom();
  const effects = createEffects({ scene, box, rand });
  const { axes, burst } = effects;
  const {
    group: garden,
    terrain: gardenTerrain,
    blockers,
    lakeside,
    treeVisibility,
    shrine,
    relic,
    ring,
    gems,
    targets,
    gemPositions,
    pathMat,
  } = createGarden({ scene, rand, benchModel: models?.bench });
  const {
    hero,
    rig: heroRig,
    body,
    legs,
    arms,
    eyes,
  } = createHero({ scene, model: models.hero, axeModel: models.axe });
  const companion = createCompanion({ model: models.companion });
  garden.add(companion.character);
  const companionReactions = createCompanionReactions({ companion, toast });
  const companionObstacles = [
    ...blockers,
    ...gemPositions.map(([x, z]) => ({ x, z, r: 0.8 })),
  ];
  // Gate posts a place adds to the garden block both the heroine and her
  // companion.
  function addGardenBlockers(...entries) {
    blockers.push(...entries);
    companionObstacles.push(...entries);
  }
  const benchMoment = createBenchMoment({
    bench: lakeside.bench,
    hero,
    heroRig,
    companion,
    hearts,
    toast,
  });
  $("#benchAction").onclick = () => {
    if (locations.area === "garden" && !passageTransition.active)
      benchMoment.sit();
  };
  $("#benchStand").onclick = () => benchMoment.stand();

  const locations = createLocationManager({ places });
  const passageTransition = createSceneTransition((opacity) => {
    $("#sceneTransition").style.opacity = String(opacity);
  });
  const keepsakes = createKeepsakes();
  const followCamera = createFollowCamera({ camera, hero, state, locations });
  const resetCamera = followCamera.reset;
  const cameraTargetHeight = followCamera.targetHeight;
  const placeContext = {
    renderer,
    get photography() {
      return photography;
    },
    shouldFadeScenery,
    keepsakes,
    places,
    addGardenBlockers,
    pathMat,
    models,
    rand,
    mesh,
    box,
    ball,
    cyl,
    blockers,
    treeVisibility,
    lakeside,
    gems,
    targets,
    shrine,
    relic,
    ring,
    helpers: { mesh, box, ball, cyl },
    fire,
    heroRig,
    get transitions() {
      return transitions;
    },
    locations,
    passageTransition,
    hero,
    companion,
    companionReactions,
    resetCamera,
    clearRestInput,
    benchMoment,
    hearts,
    state,
    camera,
    get $() {
      return $;
    },
    garden,
    companionObstacles,
    gardenTerrain,
    scene,
    effects,
    toast,
    beep,
    cameraTargetHeight,
    get cameraDrag() {
      return cameraDrag;
    },
    get keys() {
      return keys;
    },
    get joy() {
      return joy;
    },
    sun,
    environment,
    get clock() {
      return clock;
    },
    burst,
  };
  registerPlaces(places, placeContext);
  const { funfairActivities } = places.get("funfair").parts;
  const funfair = places.get("funfair").terrain;
  const { festivalMoment, summerOutfits } = places.get("festival").parts;
  const festival = places.get("festival").terrain;
  const { castleRoom, bedRest } = places.get("castle").parts;
  const { sheepMoment, alpineOutfits, alpineCart } =
    places.get("village").parts;
  const village = places.get("village").terrain;
  const { boatTrip, cableCar } = places.get("riverside").parts;
  const riverside = places.get("riverside").terrain;
  const sceneryFading = createSceneryFading({ places, hero, companion });
  const transitions = createPlaceTransitions({
    places,
    locations,
    fade: passageTransition,
    context: placeContext,
  });
  function clearRestInput() {
    cameraDrag.reset();
    Object.keys(keys).forEach((key) => (keys[key] = false));
    joy.set(0, 0);
    state.isMoving = false;
    hearts.clear();
  }
  const keys = {};

  // A muted preview URL stays quiet through reloads during development.
  void setSound(state.sound);
  function fire() {
    if (
      photoMode.active ||
      photography.viewing ||
      ui.collection?.open ||
      state.cooldown > 0 ||
      $("#guide").open ||
      ui.travelMap?.open ||
      !locations.active.canThrow ||
      !heroRig.items.canThrow ||
      benchMoment.seated ||
      boatTrip.rowing ||
      cableCar.riding ||
      passageTransition.active
    )
      return;
    state.cooldown = 0.46;
    state.throwAnim = 0.3;
    const dir = new THREE.Vector3(
      Math.sin(hero.rotation.y),
      0,
      Math.cos(hero.rotation.y),
    );
    const a = heroRig.items.createProjectile();
    a.position
      .copy(hero.position)
      .add(new THREE.Vector3(0, 1.5, 0))
      .addScaledVector(dir, 0.8);
    scene.add(a);
    axes.push({ g: a, dir, life: 1.65 });
    beep(220, 0.15);
  }
  function cameraLocked() {
    return Boolean(
      locations.active.cameraLocked?.() ||
      places.get(locations.area).cameraLocked?.(),
    );
  }
  const activityPhoto = createActivityPhoto({
    hero,
    companion,
    benchMoment,
    bedRest,
    boatTrip,
    cableCar,
    funfairActivities,
    alpineCart,
    sheepMoment,
    festivalMoment,
    village,
    getLocation: () => locations.current,
  });
  function shouldFadeScenery() {
    return (
      !activityPhoto.label() && locations.active.canSaveLocation?.() !== false
    );
  }
  const ui = bindGameUi({
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
    toggleSound: () => setSound(!state.sound),
  });
  const {
    photoMode,
    photoAlbum,
    photoView,
    photography,
    photoGestures,
    joy,
    cameraDrag,
    invokeShortcut,
    updateHud,
  } = ui;
  function resetAdventure() {
    if (ui.collection?.open) ui.collection.close();
    if (ui.travelMap.open) ui.travelMap.close();
    photography.exit();
    if (photography.viewing) photography.closeAlbum();
    passageTransition.cancel();
    cameraDrag.reset();
    benchMoment.stand();
    transitions.jump("garden");
    places.reset();
    companionReactions.reset();
    heroRig.appearance.reset();
    companion.rig.appearance.reset();
    heroRig.items.reset("axe");
    companion.rig.items.reset();
    hero.position.set(0, 0, 7);
    hero.rotation.set(0, 0, 0);
    companion.reset();
    hearts.clear();
    state.yaw = 0;
    state.pitch = THREE.MathUtils.degToRad(16);
    state.riverCollected = 0;
    for (const id of [
      "villageStamps",
      "funfairPrizes",
      "lagoonGems",
      "riverGems",
      "targets",
      "gems",
    ])
      $(`#${id}`).textContent = 0;
    effects.clearProjectiles();
    resetCamera();
    $("#objective").textContent =
      "Break the wooden targets and find the sunstones.";
    toast("A fresh adventure begins");
    journey.reset();
    locationSave.flush();
  }
  const walk = createPlayerMovement({
    hero,
    body,
    legs,
    arms,
    companion,
    hearts,
    benchMoment,
    keys,
    joy,
    state,
    effects,
    companionReactions,
    places,
    locations,
    getTransitions: () => transitions,
  });
  const clock = new THREE.Clock();
  function frame() {
    if (performance.now() > state.toastUntil) $("#toast").style.opacity = 0;
    let dt = Math.min(clock.getDelta(), 0.04),
      time = clock.elapsedTime;
    const transitioning = passageTransition.active;
    if (!$("#guide").open) passageTransition.update(dt);
    const paused =
      photoMode.active ||
      photography.viewing ||
      ui.collection?.open ||
      ui.travelMap.open ||
      $("#guide").open ||
      transitioning ||
      (sheepMoment.viewing && !sheepMoment.active);
    state.cooldown = Math.max(0, state.cooldown - dt);
    state.throwAnim = Math.max(0, state.throwAnim - dt);
    state.villageActivityCooldown = Math.max(
      0,
      state.villageActivityCooldown - dt,
    );
    state.castleActivityCooldown = Math.max(
      0,
      state.castleActivityCooldown - dt,
    );
    if (!paused) {
      benchMoment.update(dt);
      state.passageCooldown = Math.max(0, state.passageCooldown - dt);
      if (!cameraLocked()) followCamera.rotateFromKeys(dt, keys);
      const rootPlace = places.get(locations.area);
      const activePlace = locations.active;
      const rootLocked = rootPlace.update?.(dt, time);
      const activeLocked =
        activePlace !== rootPlace && activePlace.update?.(dt, time);
      const overridden =
        activePlace.moveInstead?.(dt) ||
        (activePlace !== rootPlace && rootPlace.moveInstead?.(dt));
      if (rootLocked || activeLocked || overridden) state.isMoving = false;
      else walk(dt, time, rootPlace, activePlace);
    }
    updateHud({ isMoving: state.isMoving, paused, dt });
    if (!photoMode.active && !photography.viewing)
      for (const place of places.all()) place.animateBackground?.(time);
    const rootPlace = places.get(locations.area),
      activePlace = locations.active;
    if (!photoMode.active && !photography.viewing) {
      rootPlace.animate?.(dt, time, paused);
      if (activePlace !== rootPlace) activePlace.animate?.(dt, time, paused);
    }
    effects.update(paused ? 0 : dt);
    if (
      photoMode.updateCamera() ||
      (!photography.viewing &&
        !ui.collection?.open &&
        (activePlace.updateCamera?.(dt) ||
          (activePlace !== rootPlace && rootPlace.updateCamera?.(dt))))
    ) {
    } else if (!photography.viewing) followCamera.update(dt);
    hearts.update(paused ? 0 : dt, camera);
    sceneryFading.update({
      camera,
      dt,
      time,
      enabled: shouldFadeScenery(),
      photographing: photoMode.active,
      viewingAlbum: photography.viewing,
      rootPlace,
      activePlace,
    });
    environment.followTarget(hero.position);
    if (!photoMode.active && !photography.viewing)
      for (const place of places.all()) place.lateAnimate?.(time);
    const view = photoMode.active
      ? { scene, camera }
      : (activePlace.getRenderView?.() ??
        rootPlace.getRenderView?.() ?? { scene, camera });
    renderer.render(view.scene, view.camera);
    if (photoMode.active) photography.updateSelection();
    activePlace.afterRender?.(paused);
    if (!passageTransition.active && !boatTrip.rowing && !cableCar.riding)
      journey.discover(locations.current);
    locationSave.update(dt);
  }
  camera.position
    .set(
      0,
      1 + Math.sin(state.pitch) * state.zoom,
      Math.cos(state.pitch) * state.zoom,
    )
    .add(hero.position);
  addEventListener("resize", () => {
    photoGestures.reset();
    photoView.resize(photoMode.active);
    funfair.tossCamera.aspect = camera.aspect;
    funfair.tossCamera.updateProjectionMatrix();
  });
  toast("WASD to move · Drag to look around · Click to throw");
  const loop = createGameLoop(frame);
  function canSaveLocation() {
    return (
      locations.active.canSaveLocation?.() !== false &&
      !passageTransition.active &&
      !photoMode.active &&
      !photography.viewing &&
      !ui.collection?.open &&
      !benchMoment.seated &&
      !bedRest.resting &&
      !boatTrip.rowing &&
      !cableCar.riding &&
      !funfairActivities.riding &&
      !funfairActivities.playing &&
      !alpineCart.riding &&
      !alpineCart.vanishing &&
      !sheepMoment.active &&
      !sheepMoment.viewing &&
      !festivalMoment.active
    );
  }
  const journey = createJourney({
    places,
    getCurrent: () => locations.current,
    canTravel: () => canSaveLocation() && !$("#guide").open,
    transitions,
  });
  ui.bindDialogs({ journey, keepsakes, canSaveLocation });
  const locationSave = createLocationSave({
    places,
    locations,
    transitions,
    hero,
    companion,
    state,
    camera,
    resetCamera,
    canSave: canSaveLocation,
  });
  let opened = false;
  if (typeof location !== "undefined") {
    const query = new URLSearchParams(location.search);
    const area = query.get("area");
    if (area)
      opened = transitions.open(area, { activity: query.get("activity") });
  }
  if (!opened && locationSave.restore())
    toast("Welcome back · Journey resumed");
  journey.discover(locations.current);
  locationSave.flush();
  addEventListener("pagehide", () => locationSave.flush());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") locationSave.flush();
  });
  const readProgress = createProgressReader({
    keepsakes,
    journey,
    funfairActivities,
    village,
    alpineCart,
    state,
    sheepMoment,
    festivalMoment,
    locations,
    boatTrip,
    hero,
    $,
  });
  registerAdventureProgress(readProgress);
  return createGameApi({
    loop,
    frame,
    readProgress,
    scene,
    camera,
    renderer,
    mesh,
    box,
    cyl,
    ball,
    clock,
    hero,
    heroRig,
    companion,
    garden,
    lakeside,
    shrine,
    targets,
    gems,
    blockers,
    riverside,
    castleRoom,
    funfair,
    village,
    festival,
    photoMode,
    photoAlbum,
    keepsakes,
    collection: ui.collection,
    photography,
    boatTrip,
    cableCar,
    bedRest,
    funfairActivities,
    alpineCart,
    alpineOutfits,
    festivalMoment,
    summerOutfits,
    sheepMoment,
    companionReactions,
    resetAdventure,
    transitions,
    journey,
    travelMap: ui.travelMap,
    invokeShortcut,
    fire,
    toast,
    locations,
    state,
    keys,
    effects,
    places,
    passageTransition,
  });
}
