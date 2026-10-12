import { registerPlaces } from "../locations/register-places.js";
import { createPlaceTransitions } from "./place-transitions.js";
import { createPlaceRegistry } from "./place-registry.js";
import { createAlpineCart } from "../locations/village/alpine-cart.js";
import {
  createAlpineVillage,
  createAlpineOutfits,
} from "../locations/village/world.js";
import { createBedRest } from "../locations/castle/bed-rest.js";
import { createCastleRoom } from "../locations/castle/world.js";
import { createCableCar } from "../locations/riverside/cable-car.js";
import { createBoatTrip } from "../locations/riverside/boat-trip.js";
import * as THREE from "three";
import { createRiverside } from "../locations/riverside/world.js";
import { createCompanion } from "../characters/companion.js";
import { createCompanionReactions } from "../characters/reactions.js";
import { createSheepMoment } from "../locations/village/sheep-moment.js";
import { createHearts } from "../systems/hearts.js";
import { resolveObstacleCollisions } from "../systems/collision.js";
import { createSceneTransition } from "./scene-transition.js";
import { createBenchMoment } from "../locations/garden/lakeside.js";
import { createRendering } from "../rendering/renderer.js";
import {
  CASTLE_ENVIRONMENT,
  CASTLE_NIGHT_ENVIRONMENT,
} from "../locations/castle/place.js";
import {
  LAGOON_ENVIRONMENT,
  RIVERSIDE_ENVIRONMENT,
} from "../locations/riverside/place.js";
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
import { createTreeVisibility } from "../rendering/tree-visibility.js";
import { createSceneryVisibility } from "../rendering/scenery-visibility.js";
import { registerAdventureProgress } from "../integrations/adventure-progress.js";
import { createProgressReader } from "./progress.js";
import { createGameApi } from "./game-api.js";
import { createPhotoCapture } from "../rendering/photo-capture.js";
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
  const riverside = createRiverside({ mesh, box, cyl, ball });
  garden.add(riverside.entrance);
  scene.add(riverside.group);
  blockers.push({ x: -32, z: -2, r: 0.45 }, { x: -32, z: 2, r: 0.45 });
  const village = createAlpineVillage({ mesh, box, cyl, ball });
  garden.add(village.entrance);
  scene.add(village.group);
  village.shops.forEach((shop) => scene.add(shop.room.group));
  blockers.push({ x: -2.5, z: 33, r: 0.3 }, { x: 2.5, z: 33, r: 0.3 });
  const castleRoom = createCastleRoom({ mesh, box, cyl, ball });
  scene.add(castleRoom.group);
  const companion = createCompanion({ model: models.companion });
  garden.add(companion.character);
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
      environment.apply(
        sleeping ? CASTLE_NIGHT_ENVIRONMENT : CASTLE_ENVIRONMENT,
      );
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
      environment.apply(atLagoon ? LAGOON_ENVIRONMENT : RIVERSIDE_ENVIRONMENT);
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
    boardBoat,
    boardCableCar,
    interactVillage,
    interactCastle,
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
    environment,
    get clock() {
      return clock;
    },
    burst,
    changeCastlePassage,
    riverside,
  };
  registerPlaces(places, placeContext);
  const { funfairActivities } = places.get("funfair").parts;
  const funfair = places.get("funfair").terrain;
  const { festivalMoment, summerOutfits } = places.get("festival").parts;
  const festival = places.get("festival").terrain;
  // Tall gate tops stay prominent on approach, but fade if they hide the heroine.
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
  const sceneryVisibility = new Map();
  function sceneryFor(place) {
    if (!sceneryVisibility.has(place.id))
      sceneryVisibility.set(
        place.id,
        place.group
          ? createSceneryVisibility({
              group: place.group,
              actors: [hero, companion.character],
            })
          : null,
      );
    return sceneryVisibility.get(place.id);
  }
  places.all().forEach(sceneryFor);
  const transportVisibility = [boatTrip.boat, cableCar.group].map((group) =>
    createSceneryVisibility({ group, actors: [hero, companion.character] }),
  );
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

  function cameraTargetHeight() {
    return locations.active.cameraTarget();
  }
  function riverObjective(...args) {
    return places.get("riverside").controls.riverObjective(...args);
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
  $("#cableAction").onclick = boardCableCar;
  $("#boatAction").onclick = boardBoat;
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
  const clock = new THREE.Clock();
  const desired = new THREE.Vector3();
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
          const facing = hero.position.clone().sub(old).setY(0);
          // Restored quaternions can have equivalent nonzero X/Z Euler angles.
          // Set the whole upright rotation so the model faces its travel path.
          if (facing.lengthSq() > 0.000001)
            hero.rotation.set(0, Math.atan2(facing.x, facing.z), 0);
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
        !ui.collection?.open &&
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
    const fadeScenery = shouldFadeScenery();
    gateVisibility.update(camera, [hero], dt, fadeScenery);
    if (photoMode.active) {
      if (
        !["garden", "village", "riverside", "castle"].includes(
          locations.current,
        )
      )
        activePlace.afterCamera?.(dt, time);
      if (locations.area === "garden")
        treeVisibility.update(camera, [hero], dt, fadeScenery);
      if (locations.area === "village")
        village.updateVisibility(camera, [hero], dt, fadeScenery);
      if (locations.area === "riverside") {
        riverside.updateVisibility(camera, [hero], dt, fadeScenery);
        cableCar.updateVisibility(camera, [hero], dt, fadeScenery);
      }
    } else if (!photography.viewing) {
      for (const place of places.all()) place.afterCamera?.(dt, time);
    }
    if (!photography.viewing) {
      sceneryFor(activePlace)?.update(camera, hero, dt, fadeScenery);
      if (rootPlace !== activePlace)
        sceneryFor(rootPlace)?.update(camera, hero, dt, fadeScenery);
      if (locations.area === "riverside")
        transportVisibility.forEach((visibility) =>
          visibility.update(camera, hero, dt, fadeScenery),
        );
    }
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
    usePassage,
    useCastlePassage,
    changeCastlePassage,
    interactCastle,
    useVillagePassage,
    useVillageShop,
    interactVillage,
    boardCableCar,
    boardBoat,
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
