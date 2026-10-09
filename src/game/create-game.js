import { registerPlaces } from "../locations/register-places.js";
import { createPlaceTransitions } from "./place-transitions.js";
import { createPlaceRegistry } from "./place-registry.js";
import {
  createNightFestival,
  createSummerOutfits,
  createFestivalMoment,
} from "../locations/festival/world.js";
import { createAlpineCart } from "../locations/village/alpine-cart.js";
import {
  createAlpineVillage,
  createAlpineOutfits,
} from "../locations/village/world.js";
import {
  createFunfair,
  createFunfairActivities,
} from "../locations/funfair/world.js";
import { createBedRest } from "../locations/castle/bed-rest.js";
import { createCastleRoom } from "../locations/castle/world.js";
import { createCableCar } from "../locations/riverside/cable-car.js";
import { createBoatTrip } from "../locations/riverside/boat-trip.js";
import * as THREE from "three";
import { createRiverside } from "../locations/riverside/world.js";
import { createCave } from "../locations/cave/world.js";
import { createGameAudio } from "../systems/audio.js";
import { createCompanion } from "../characters/companion.js";
import { createCompanionReactions } from "../characters/reactions.js";
import { createSheepMoment } from "../locations/village/sheep-moment.js";
import { createHearts } from "../systems/hearts.js";
import { bindGameInput } from "../systems/input.js";
import { resolveObstacleCollisions } from "../systems/collision.js";
import { createSceneTransition } from "./scene-transition.js";
import { createBenchMoment, inLake } from "../locations/garden/lakeside.js";
import { createRendering } from "../rendering/renderer.js";
import { createPhotoView } from "../rendering/photo-view.js";
import { bindPhotoGestures } from "../rendering/photo-gestures.js";
import { createPhotoMode } from "../rendering/photo-mode.js";
import { createPhotoAlbum } from "../systems/photo-album.js";
import { bindPhotography } from "../ui/photography.js";
import { createPhotoCapture } from "../rendering/photo-capture.js";
import { createMeshFactory } from "../rendering/mesh-factory.js";
import { createEffects } from "../systems/effects.js";
import { createRandom } from "../systems/random.js";
import { createHero } from "../characters/hero.js";
import { createGarden } from "../locations/garden/world.js";
import { createHud } from "../ui/hud.js";
import { createLocationManager } from "./location-manager.js";
import { createGameLoop } from "./game-loop.js";
import { createLocationSave } from "./location-save.js";
import { createKeepsakes } from "../systems/keepsakes.js";
import { bindKeepsakes } from "../ui/keepsakes.js";
import { createJourney } from "./journey.js";
import { bindTravelMap } from "../ui/travel-map.js";
import { createTreeVisibility } from "../rendering/tree-visibility.js";
import { registerAdventureProgress } from "../integrations/adventure-progress.js";

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
  const { renderer, scene, camera, sun } = createRendering({
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
  const cave = createCave();
  garden.add(cave.entrance);
  scene.add(cave.interior);
  blockers.push(
    { x: -4, z: -43, r: 2.5, minClearance: 0.8 },
    { x: 4, z: -43, r: 2.5, minClearance: 0.8 },
  );
  const cavePath = box(4, 0.04, 10, pathMat, 0, 0.025, -39);
  garden.add(cavePath);
  const riverside = createRiverside({ mesh, box, cyl, ball });
  garden.add(riverside.entrance);
  scene.add(riverside.group);
  blockers.push({ x: -32, z: -2, r: 0.45 }, { x: -32, z: 2, r: 0.45 });
  const funfair = createFunfair({ mesh, box, cyl, ball });
  garden.add(funfair.entrance);
  scene.add(funfair.group);
  funfair.tossCamera.aspect = camera.aspect;
  funfair.tossCamera.updateProjectionMatrix();
  blockers.push({ x: 32, z: -2.6, r: 0.36 }, { x: 32, z: 2.6, r: 0.36 });
  const village = createAlpineVillage({ mesh, box, cyl, ball });
  garden.add(village.entrance);
  scene.add(village.group);
  village.shops.forEach((shop) => scene.add(shop.room.group));
  blockers.push({ x: -2.5, z: 33, r: 0.3 }, { x: 2.5, z: 33, r: 0.3 });
  const festival = createNightFestival({ mesh, box, cyl, ball });
  funfair.group.add(festival.entrance);
  scene.add(festival.group);
  const castleRoom = createCastleRoom({ mesh, box, cyl, ball });
  scene.add(castleRoom.group);
  const companion = createCompanion({ model: models.companion });
  garden.add(companion.character);
  // Tall gate tops stay prominent on approach, but fade if they hide a friend.
  const gateVisibility = createTreeVisibility({ obstructedOpacity: 0.12 });
  for (const gate of [
    village.entrance,
    village.returnGate,
    funfair.entrance,
    funfair.returnGate,
    riverside.entrance,
    riverside.returnGate,
    festival.entrance,
    festival.group.getObjectByName("festival-lantern-gate"),
  ]) {
    const canopy = new THREE.Group();
    canopy.name = "gate-canopy";
    gate.add(canopy);
    for (const child of [...gate.children])
      if (child.isMesh && child.position.y >= 4.5) canopy.add(child);
    gateVisibility.add(canopy);
  }
  const companionReactions = createCompanionReactions({ companion, toast });
  const sheepMoment = createSheepMoment({
    village,
    hero,
    heroRig,
    companion,
    camera,
    capturePhoto: createPhotoCapture({ renderer, scene }),
    savePhoto: (image) =>
      photography.savePhoto(image, "Edelweiss Village · Sheep meadow"),
    mesh,
    box,
    cyl,
    $,
    toast,
    beep,
    hearts,
    clearInput: clearRestInput,
    reactions: companionReactions,
    onMemory() {
      $("#villageStamps").textContent = village.stamps.size;
      $("#objective").textContent = villageObjective();
    },
  });
  const bedRest = createBedRest({
    bed: castleRoom.bed,
    terrain: castleRoom,
    hero,
    heroRig,
    companion,
    toast,
    onRestChange(sleeping) {
      sun.intensity = sleeping ? 0.16 : 1.7;
      scene.children.find((c) => c.isHemisphereLight).intensity = sleeping
        ? 0.28
        : 1.6;
      scene.background.set(sleeping ? "#363440" : "#cab5b0");
      scene.fog.color.copy(scene.background);
      scene.fog.density = sleeping ? 0.018 : 0.009;
    },
  });
  const funfairActivities = createFunfairActivities({
    park: funfair,
    hero,
    heroRig,
    companion,
    toast,
    onPrize(total, position) {
      $("#funfairPrizes").textContent = total;
      $("#objective").textContent = funfairActivities.objective();
      burst(position, "#ffe399", 24);
      beep(880, 0.3);
    },
  });
  const alpineOutfits = createAlpineOutfits({
    heroRig,
    companion,
    mesh,
    box,
    cyl,
    ball,
  });
  const summerOutfits = createSummerOutfits({
    rigs: [heroRig, companion.rig],
    box,
    cyl,
  });
  const festivalMoment = createFestivalMoment({
    festival,
    hero,
    companion,
    rigs: [heroRig, companion.rig],
    camera,
  });
  const alpineCart = createAlpineCart({
    village,
    hero,
    heroRig,
    companion,
    camera,
    mesh,
    box,
    cyl,
    accessories: [alpineOutfits.bouquet],
    onClear: resetCamera,
    onFinish() {
      $(".instructions").innerHTML =
        "<kbd>W A S D</kbd> walk / hike <kbd>X</kbd> shops / sheep / summit cart <kbd>DRAG / Q E</kbd> rotate";
      clearRestInput();
      village.stamps.add("lookout");
      $("#villageStamps").textContent = village.stamps.size;
      $("#objective").textContent = villageObjective();
      resetCamera();
      toast("What a ride! ♥ A little flower-and-star magic clears the path.");
      hearts.contact(true, hero.position, companion.character.position);
    },
  });
  alpineCart.reset();
  const hikingTethers = [hero, companion.character].map(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    const rope = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: "#e9b86d" }),
    );
    rope.name = "via-ferrata-safety-tether";
    rope.visible = false;
    village.group.add(rope);
    return rope;
  });
  const companionObstacles = [
    ...blockers,
    ...gemPositions.map(([x, z]) => ({ x, z, r: 0.8 })),
  ];
  const benchMoment = createBenchMoment({
    bench: lakeside.bench,
    hero,
    heroRig,
    companion,
    hearts,
    toast,
  });
  const boatTrip = createBoatTrip({
    mesh,
    box,
    cyl,
    ball,
    scene,
    riverside,
    hero,
    heroRig,
    companion,
    toast,
    onSceneChange(atLagoon) {
      hearts.clear();
      $(".quest .eyebrow").textContent = atLagoon
        ? "THE LOTUS LAGOON"
        : "THE RAINBOW RIVERSIDE";
      $(".quest h1").innerHTML = atLagoon
        ? "A boat for two.<br />A sunflower paradise."
        : "A gentle river.<br />A rainbow of treasures.";
      $("#objective").textContent = atLagoon
        ? boatTrip.lagoon.collected === 240
          ? "Your lagoon collection is complete! Enjoy the sunflowers together."
          : "Wander through 900 sunflowers and collect 240 colourful gems and stones."
        : riverObjective();
      $("#riverCounts").hidden = atLagoon;
      $("#lagoonCounts").hidden = !atLagoon;
      scene.background.set(atLagoon ? "#c0ded9" : "#b6d9ce");
      scene.fog.color.copy(scene.background);
      scene.fog.density = atLagoon ? 0.006 : 0.011;
      cableCar.setEnabled(atLagoon);
      if (atLagoon) {
        state.yaw = 0;
        state.pitch = THREE.MathUtils.degToRad(16);
        state.zoom = 20;
      }
      camera.position
        .set(
          Math.sin(state.yaw) * Math.cos(state.pitch) * state.zoom,
          1 + Math.sin(state.pitch) * state.zoom,
          Math.cos(state.yaw) * Math.cos(state.pitch) * state.zoom,
        )
        .add(hero.position);
      camera.lookAt(
        hero.position.x,
        hero.position.y + cameraTargetHeight(),
        hero.position.z,
      );
    },
  });
  const cableCar = createCableCar({
    scene,
    riverside,
    lagoon: boatTrip.lagoon,
    hero,
    heroRig,
    companion,
    mesh,
    box,
    cyl,
    toast,
    onArrival(atSummit) {
      hearts.clear();
      state.yaw = 0;
      state.pitch = THREE.MathUtils.degToRad(atSummit ? 30 : 16);
      state.zoom = atSummit ? 22 : 20;
      $(".quest .eyebrow").textContent = atSummit
        ? "THE SUMMIT CASTLE"
        : "THE LOTUS LAGOON";
      $(".quest h1").innerHTML = atSummit
        ? "A castle in the clouds.<br />A cozy room for two."
        : "A boat for two.<br />A sunflower paradise.";
      $("#objective").textContent = atSummit
        ? "Walk through the open castle arch. Return cable car: beside the castle."
        : boatTrip.lagoon.collected === 240
          ? "Your lagoon collection is complete! Enjoy the flowers and the mountain cable car."
          : "Explore the flowers and gemstones. Cable car: north end of the central island.";
      camera.position
        .set(
          Math.sin(state.yaw) * Math.cos(state.pitch) * state.zoom,
          1 + Math.sin(state.pitch) * state.zoom,
          Math.cos(state.yaw) * Math.cos(state.pitch) * state.zoom,
        )
        .add(hero.position);
    },
  });
  function boardCableCar(...args) {
    return places.get("riverside").controls.boardCableCar(...args);
  }

  function boardBoat(...args) {
    return places.get("riverside").controls.boardBoat(...args);
  }

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
  const placeContext = {
    keepsakes,
    places,
    changePassage,
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
    boardBoat,
    boardCableCar,
    interactVillage,
    interactFunfair,
    leaveRingToss,
    interactCastle,
    interactFestival,
    changeVillageShop,
    heroRig,
    get transitions() {
      return transitions;
    },
    village,
    locations,
    passageTransition,
    hero,
    companion,
    companionReactions,
    sheepMoment,
    resetCamera,
    clearRestInput,
    benchMoment,
    hearts,
    state,
    camera,
    get $() {
      return $;
    },
    alpineCart,
    garden,
    alpineOutfits,
    hikingTethers,
    companionObstacles,
    gardenTerrain,
    scene,
    effects,
    toast,
    beep,
    funfairActivities,
    funfair,
    cameraTargetHeight,
    cableCar,
    get cameraDrag() {
      return cameraDrag;
    },
    get keys() {
      return keys;
    },
    get joy() {
      return joy;
    },
    bedRest,
    castleRoom,
    boatTrip,
    sun,
    get clock() {
      return clock;
    },
    burst,
    changeCastlePassage,
    riverside,
    cave,
    festivalMoment,
    festival,
    summerOutfits,
  };
  registerPlaces(places, placeContext);
  const transitions = createPlaceTransitions({
    places,
    locations,
    fade: passageTransition,
    context: placeContext,
  });
  function villageObjective(...args) {
    return places.get("village").controls.villageObjective(...args);
  }
  function useVillagePassage(...args) {
    return places.get("village").controls.useVillagePassage(...args);
  }
  function resetCamera() {
    const distance =
      locations.active.cameraDistance?.(state.zoom) ?? state.zoom;
    camera.position
      .set(
        Math.sin(state.yaw) * Math.cos(state.pitch) * distance,
        1 + Math.sin(state.pitch) * distance,
        Math.cos(state.yaw) * Math.cos(state.pitch) * distance,
      )
      .add(hero.position);
    camera.lookAt(
      hero.position.x,
      hero.position.y + cameraTargetHeight(),
      hero.position.z,
    );
    camera.updateProjectionMatrix();
  }
  function changeVillagePassage(...args) {
    return places.get("village").controls.changeVillagePassage(...args);
  }
  function changeVillageShop(...args) {
    return places.get("village").controls.changeVillageShop(...args);
  }
  function useVillageShop(...args) {
    return places.get("village").controls.useVillageShop(...args);
  }
  function interactVillage(...args) {
    return places.get("village").controls.interactVillage(...args);
  }
  $("#villageAction").onclick = interactVillage;
  function useFunfairPassage(...args) {
    return places.get("funfair").controls.useFunfairPassage(...args);
  }
  function changeFunfairPassage(...args) {
    return places.get("funfair").controls.changeFunfairPassage(...args);
  }
  function interactFunfair(...args) {
    return places.get("funfair").controls.interactFunfair(...args);
  }
  $("#funfairAction").onclick = interactFunfair;
  function leaveRingToss(...args) {
    return places.get("funfair").controls.leaveRingToss(...args);
  }
  $("#funfairExit").onclick = leaveRingToss;
  function useCastlePassage(...args) {
    return places.get("castle").controls.useCastlePassage(...args);
  }
  function changeCastlePassage(...args) {
    return places.get("castle").controls.changeCastlePassage(...args);
  }

  function interactCastle(...args) {
    return places.get("castle").controls.interactCastle(...args);
  }
  function clearRestInput() {
    cameraDrag.reset();
    Object.keys(keys).forEach((key) => (keys[key] = false));
    joy.set(0, 0);
    state.isMoving = false;
    hearts.clear();
  }
  $("#castleAction").onclick = interactCastle;
  function usePassage(...args) {
    return places.get("riverside").controls.usePassage(...args);
  }
  function changePassage(...args) {
    return places.get("riverside").controls.changePassage(...args);
  }

  function useFestivalPassage(...args) {
    return places.get("festival").controls.useFestivalPassage(...args);
  }
  function changeFestivalPassage(...args) {
    return places.get("festival").controls.changeFestivalPassage(...args);
  }
  function interactFestival(...args) {
    return places.get("festival").controls.interactFestival(...args);
  }
  $("#festivalAction").onclick = interactFestival;
  function cameraTargetHeight() {
    return locations.active.cameraTarget();
  }
  function riverObjective(...args) {
    return places.get("riverside").controls.riverObjective(...args);
  }
  const keys = {};

  const audio = createGameAudio(
    () => locations.active.soundscape === "cave",
    () => locations.active.soundscape === "festival",
  );
  function beep(freq, duration = 0.1) {
    audio.effect(freq, duration);
  }

  function toast(t) {
    $("#toast").textContent = t;
    $("#toast").style.opacity = 1;
    state.toastUntil = performance.now() + 3200;
  }
  async function setSound(value) {
    state.sound = value;
    $("#sound").textContent = state.sound ? "Sound on" : "Sound off";
    $("#sound").setAttribute("aria-pressed", String(state.sound));
    try {
      await audio.setEnabled(state.sound);
    } catch {
      state.sound = false;
      await audio.setEnabled(false);
      $("#sound").textContent = "Sound off";
      $("#sound").setAttribute("aria-pressed", "false");
      toast("Audio could not start. Tap Sound to try again.");
    }
  }
  // A muted preview URL stays quiet through reloads during development.
  void setSound(state.sound);
  function fire() {
    if (
      photoMode.active ||
      photography.viewing ||
      collection?.open ||
      state.cooldown > 0 ||
      $("#guide").open ||
      travelMap?.open ||
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
  $("#cableAction").onclick = boardCableCar;
  $("#boatAction").onclick = boardBoat;
  function cameraLocked() {
    return Boolean(
      locations.active.cameraLocked?.() ||
      places.get(locations.area).cameraLocked?.(),
    );
  }
  const photoMode = createPhotoMode({
    camera,
    actors: [hero, companion.character],
    getPlace: () => locations.active,
  });
  const photoAlbum = createPhotoAlbum();
  const photoView = createPhotoView({
    renderer,
    camera,
    frame: $("#photoFrame"),
    format: $("#photoFrameFormat"),
  });
  let photoGestures, travelMap, collection;

  const photography = bindPhotography({
    $,
    mode: photoMode,
    album: photoAlbum,
    camera,
    capture: createPhotoCapture({ renderer, scene }),
    canEnter: () =>
      !collection?.open &&
      !travelMap?.open &&
      !$("#guide").open &&
      !passageTransition.active &&
      !sheepMoment.viewing &&
      !sheepMoment.active &&
      !benchMoment.seated &&
      !bedRest.resting &&
      !boatTrip.rowing &&
      !cableCar.riding &&
      !funfairActivities.riding &&
      !funfairActivities.playing &&
      !alpineCart.riding &&
      !alpineCart.vanishing &&
      !festivalMoment.active,
    clearInput: clearRestInput,
    toast,
    getLocation: () => locations.active.name ?? locations.active.id,
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
      if (!cameraLocked()) state.yaw -= dx * 0.006;
    },
    zoomBy(delta) {
      state.zoom = THREE.MathUtils.clamp(
        state.zoom + delta * 0.012,
        10,
        places.get(locations.area).maxZoom ?? 26,
      );
    },
    toggleSound: () => setSound(!state.sound),
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
  $("#restart").onclick = () => {
    if (collection?.open) collection.close();
    if (travelMap.open) travelMap.close();
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
  };
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
  const clock = new THREE.Clock();
  const desired = new THREE.Vector3();
  function frame() {
    let dt = Math.min(clock.getDelta(), 0.04),
      time = clock.elapsedTime;
    const transitioning = passageTransition.active;
    if (!$("#guide").open) passageTransition.update(dt);
    const paused =
      photoMode.active ||
      photography.viewing ||
      collection?.open ||
      travelMap.open ||
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
      if (!cameraLocked()) {
        state.yaw += ((keys.KeyQ ? 1 : 0) - (keys.KeyE ? 1 : 0)) * dt * 1.4;
        state.pitch = THREE.MathUtils.clamp(
          state.pitch + ((keys.KeyR ? 1 : 0) - (keys.KeyF ? 1 : 0)) * dt * 0.65,
          THREE.MathUtils.degToRad(6),
          THREE.MathUtils.degToRad(70),
        );
      }
      const rootPlace = places.get(locations.area);
      const activePlace = locations.active;
      const rootLocked = rootPlace.update?.(dt, time);
      const activeLocked =
        activePlace !== rootPlace && activePlace.update?.(dt, time);
      const overridden =
        activePlace.moveInstead?.(dt) ||
        (activePlace !== rootPlace && rootPlace.moveInstead?.(dt));
      if (rootLocked || activeLocked || overridden) state.isMoving = false;
      else {
        let dx =
            (keys.KeyD || keys.ArrowRight ? 1 : 0) -
            (keys.KeyA || keys.ArrowLeft ? 1 : 0) +
            joy.x,
          dz =
            (keys.KeyS || keys.ArrowDown ? 1 : 0) -
            (keys.KeyW || keys.ArrowUp ? 1 : 0) +
            joy.y;
        let movement = new THREE.Vector3(dx, 0, dz);
        if (benchMoment.seated) movement.set(0, 0, 0);
        if (movement.length() > 1) movement.normalize();
        movement.applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);
        const speed = keys.ShiftLeft || keys.ShiftRight ? 7.8 : 4.7;
        const old = hero.position.clone();
        hero.position.addScaledVector(movement, dt * speed);
        const place = locations.active;
        const movementObstacles = benchMoment.seated
          ? []
          : (place.terrain.blockers ?? []);
        resolveObstacleCollisions(hero.position, old, movementObstacles);
        if (place.constrainMovement)
          place.constrainMovement(hero.position, old, {
            seated: benchMoment.seated,
          });
        else {
          place.terrain.constrain?.(hero.position, old);
          if (!place.terrain.contains(hero.position.x, hero.position.z))
            hero.position.copy(old);
          hero.position.y = place.terrain.heightAt(
            hero.position.x,
            hero.position.z,
          );
        }
        if (!benchMoment.seated) {
          place.beforeCompanion?.(old);
          const playerBump = companion.blocksPlayer(hero.position, old);
          const companionBump = companion.update(
            dt,
            place.companionObstacles ?? place.terrain.blockers ?? [],
            hero.position,
            place.companionTerrain ?? place.terrain,
          );
          hearts.contact(
            playerBump || companionBump,
            hero.position,
            companion.character.position,
          );
        }
        state.isMoving = movement.length() > 0.05;
        if (!benchMoment.seated && state.isMoving) {
          state.walk += dt * speed * 2;
          body.position.y = Math.abs(Math.sin(state.walk)) * 0.055;
          legs[0].rotation.x = Math.sin(state.walk) * 0.5;
          legs[1].rotation.x = -Math.sin(state.walk) * 0.5;
          const facing = hero.position.clone().sub(old);
          if (facing.lengthSq() > 0.000001)
            hero.rotation.y = Math.atan2(facing.x, facing.z);
        } else if (!benchMoment.seated) {
          legs.forEach((l) => (l.rotation.x *= 0.8));
          body.position.y = Math.sin(time * 2) * 0.018;
        }
        if (!benchMoment.seated) {
          arms[1].rotation.x =
            state.throwAnim > 0
              ? -Math.sin((state.throwAnim / 0.3) * Math.PI) * 2
              : Math.sin(state.walk) * 0.12;
          arms[0].rotation.x = -legs[0].rotation.x * 0.5;
        }
        effects.updateProjectiles(
          dt,
          locations.active.targets ?? [],
          locations.active.onTargetHit,
        );
        if (activePlace === rootPlace || activePlace.kind === "context")
          rootPlace.afterMovement?.(dt, time);
        if (activePlace !== rootPlace) activePlace.afterMovement?.(dt, time);
        if (!benchMoment.seated)
          companionReactions.update(dt, locations.current, hero.position);
        if (state.passageCooldown === 0) {
          const gate =
            locations.active.getGate?.() ??
            places.incomingGate(locations.current, hero.position);
          if (gate) transitions.go(gate.id, gate.options);
        }
      }
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
        !collection?.open &&
        (activePlace.updateCamera?.(dt) ||
          (activePlace !== rootPlace && rootPlace.updateCamera?.(dt))))
    ) {
    } else if (!photography.viewing) {
      const distance = activePlace.cameraDistance?.(state.zoom) ?? state.zoom;
      desired
        .set(
          Math.sin(state.yaw) * Math.cos(state.pitch) * distance,
          1 + Math.sin(state.pitch) * distance,
          Math.cos(state.yaw) * Math.cos(state.pitch) * distance,
        )
        .add(hero.position);
      camera.position.lerp(desired, 1 - Math.exp(-dt * 5));
      camera.lookAt(
        hero.position.x,
        hero.position.y + cameraTargetHeight(),
        hero.position.z,
      );
    }
    hearts.update(paused ? 0 : dt, camera);
    gateVisibility.update(camera, [hero, companion.character], dt);
    if (photoMode.active) {
      if (locations.area === "garden")
        treeVisibility.update(camera, [hero, companion.character], dt);
      if (locations.area === "village")
        village.updateVisibility(camera, [hero, companion.character], dt);
    } else if (!photography.viewing) {
      for (const place of places.all()) place.afterCamera?.(dt, time);
    }
    sun.position.set(
      hero.position.x - 18,
      hero.position.y + 30,
      hero.position.z + 12,
    );
    sun.target.position.copy(hero.position);
    if (!photoMode.active && !photography.viewing)
      for (const place of places.all()) place.lateAnimate?.(time);
    const view = activePlace.getRenderView?.() ??
      rootPlace.getRenderView?.() ?? { scene, camera };
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
      !passageTransition.active &&
      !photoMode.active &&
      !photography.viewing &&
      !collection?.open &&
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
  registerAdventureProgress(readProgress);
  function readProgress() {
    return {
      beachKeepsakes: keepsakes.items.length,
      discoveredPlaces: journey.destinations
        .filter((entry) => entry.unlocked)
        .map((entry) => entry.id),
      funfairPrizes: funfairActivities.collected,
      funfairRide: funfairActivities.ride,
      ringTossFirstPerson: funfairActivities.playing,
      villageMemories: village.stamps.size,
      villageCart: alpineCart.riding,
      villageShop: state.activeVillageShop?.kind ?? null,
      sheepPhotos: sheepMoment.memories.size,
      sheepPhotoMoment: sheepMoment.active,
      festivalFireworks: festivalMoment.active,
      summerClothes: locations.state.insideFestival,
      location:
        typeof locations.active.progressLabel === "function"
          ? locations.active.progressLabel()
          : (locations.active.progressLabel ??
            locations.active.name ??
            locations.active.id),
      placeProgress: locations.active.getProgress?.() ?? null,
      riversideTreasures: state.riverCollected,
      lagoonTreasures: boatTrip.lagoon.collected,
      sunStones: state.collected,
      targetsBroken: state.score,
      complete: state.won,
      position: {
        x: Math.round(hero.position.x),
        z: Math.round(hero.position.z),
      },
      objective: $("#objective").textContent,
    };
  }
  return {
    start: loop.start,
    stop: loop.stop,
    update: frame,
    readProgress,
    rendering: {
      scene,
      camera,
      renderer,
      meshes: { mesh, box, cyl, ball },
      clock,
    },
    characters: { hero, rig: heroRig, companion },
    worlds: {
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
    },
    activities: {
      photoMode,
      photoAlbum,
      keepsakes,
      collection,
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
    },
    controls: {
      travelTo: (id, options) => transitions.go(id, options),
      fastTravel: (id) => journey.travel(id),
      openMap: travelMap.openMap,
      openKeepsakes: collection.openCollection,
      interact: () => invokeShortcut("KeyX"),
      usePassage,
      useCastlePassage,
      changeCastlePassage,
      interactCastle,
      useFunfairPassage,
      interactFunfair,
      useVillagePassage,
      useVillageShop,
      interactVillage,
      changeFestivalPassage,
      useFestivalPassage,
      interactFestival,
      boardCableCar,
      boardBoat,
      fire,
      equipItem(id) {
        heroRig.items.equip(id);
        toast(
          id === null
            ? "Hands free for a wander"
            : `Holding ${heroRig.items.label}`,
        );
      },
    },
    state: {
      location: locations.state,
      get area() {
        return locations.area;
      },
      get room() {
        return locations.room;
      },
      get activeLocation() {
        return locations.current;
      },
      get won() {
        return state.won;
      },
      get yaw() {
        return state.yaw;
      },
      get pitch() {
        return state.pitch;
      },
      get zoom() {
        return state.zoom;
      },
      get activeVillageShop() {
        return state.activeVillageShop;
      },
    },
    input: { keys },
    journey,
    travelMap,
    effects,
    places,
    transitions,
    passageTransition,
  };
}
