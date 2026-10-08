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
import { createHearts } from "../systems/hearts.js";
import { bindGameInput } from "../systems/input.js";
import { resolveObstacleCollisions } from "../systems/collision.js";
import { createSceneTransition } from "./scene-transition.js";
import { createBenchMoment, inLake } from "../locations/garden/lakeside.js";
import { createRendering } from "../rendering/renderer.js";
import { createMeshFactory } from "../rendering/mesh-factory.js";
import { createEffects } from "../systems/effects.js";
import { createRandom } from "../systems/random.js";
import { createHero } from "../characters/hero.js";
import { createGarden } from "../locations/garden/world.js";
import { createHud } from "../ui/hud.js";
import { createLocationManager } from "./location-manager.js";
import { createGameLoop } from "./game-loop.js";
import { registerAdventureProgress } from "../integrations/adventure-progress.js";

export function createGame({ createRenderer, models } = {}) {
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
    held,
    eyes,
    axe,
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
  blockers.push({ x: 32, z: -2.6, r: 0.32 }, { x: 32, z: 2.6, r: 0.32 });
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
    onClear: resetVillageCamera,
    onFinish() {
      $(".instructions").innerHTML =
        "<kbd>W A S D</kbd> walk / hike <kbd>X</kbd> shops / sheep / summit cart <kbd>DRAG / Q E</kbd> rotate";
      clearRestInput();
      village.stamps.add("lookout");
      $("#villageStamps").textContent = village.stamps.size;
      $("#objective").textContent = villageObjective();
      resetVillageCamera();
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
        yaw = 0;
        pitch = THREE.MathUtils.degToRad(16);
        zoom = 20;
      }
      camera.position
        .set(
          Math.sin(yaw) * Math.cos(pitch) * zoom,
          1 + Math.sin(pitch) * zoom,
          Math.cos(yaw) * Math.cos(pitch) * zoom,
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
      yaw = 0;
      pitch = THREE.MathUtils.degToRad(atSummit ? 30 : 16);
      zoom = atSummit ? 22 : 20;
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
          Math.sin(yaw) * Math.cos(pitch) * zoom,
          1 + Math.sin(pitch) * zoom,
          Math.cos(yaw) * Math.cos(pitch) * zoom,
        )
        .add(hero.position);
    },
  });
  function boardCableCar() {
    if (
      locations.state.insideCastle ||
      !locations.state.insideRiver ||
      !boatTrip.atLagoon ||
      boatTrip.rowing ||
      $("#guide").open ||
      passageTransition.active
    )
      return;
    if (cableCar.start()) {
      cameraDrag.reset();
      Object.keys(keys).forEach((key) => {
        keys[key] = false;
      });
      joy.set(0, 0);
      hearts.clear();
      effects.clearProjectiles();
      yaw = cableCar.atSummit ? Math.PI : 0;
      pitch = THREE.MathUtils.degToRad(16);
      zoom = 16;
    }
  }
  $("#cableAction").onclick = boardCableCar;
  function boardBoat() {
    if (
      locations.state.insideCastle ||
      !locations.state.insideRiver ||
      $("#guide").open ||
      passageTransition.active ||
      cableCar.riding ||
      cableCar.atSummit
    )
      return;
    if (boatTrip.start()) {
      hearts.clear();
      effects.clearProjectiles();
    }
  }
  $("#boatAction").onclick = boardBoat;
  $("#benchAction").onclick = () => {
    if (locations.area === "garden" && !passageTransition.active)
      benchMoment.sit();
  };
  $("#benchStand").onclick = () => benchMoment.stand();
  let castleOutsideView = null;
  let festivalBridgeSeen = false,
    activeVillageShop = null,
    villageView = null,
    villageActivityCooldown = 0,
    riverCollected = 0,
    passageCooldown = 0,
    outsideView = null,
    outsideObjective = "";
  const locations = createLocationManager({
    terrains: {
      garden: gardenTerrain,
      cave,
      riverside,
      funfair,
      village,
      festival,
      castle: castleRoom,
    },
    getShop: () => activeVillageShop?.room,
    getSummit: () => (cableCar.atSummit ? cableCar.summit : null),
    getLagoon: () => (boatTrip.atLagoon ? boatTrip.lagoon : null),
  });
  const passageTransition = createSceneTransition((opacity) => {
    $("#sceneTransition").style.opacity = String(opacity);
  });
  function villageObjective() {
    return village.stamps.size === 5
      ? "A lovely alpine day: pastries, scarves, flowers, sheep and a mountain cart ride."
      : "Visit the three shops, meet the sheep, and follow the west trail to the summit cart.";
  }
  function useVillagePassage(enter, activity = null) {
    if (
      enter === locations.state.insideVillage ||
      !["garden", "village"].includes(locations.area)
    )
      return;
    if (
      passageTransition.start(() => {
        changeVillagePassage(enter);
        if (enter && activity) {
          const shop = village.shops.find((place) => place.kind === activity);
          if (shop)
            hero.position.copy(shop.doorway).add(new THREE.Vector3(0, 0, 0.7));
          else if (activity === "lookout") hero.position.copy(village.lookout);
          else if (activity === "trail") hero.position.copy(village.route[6]);
          else if (activity === "sheep") hero.position.set(22, 0, 20);
          companion.reset(hero.position, village.blockers, village);
          resetVillageCamera();
        }
      })
    )
      clearRestInput();
  }
  function resetVillageCamera() {
    camera.position
      .set(
        Math.sin(yaw) * Math.cos(pitch) * zoom,
        1 + Math.sin(pitch) * zoom,
        Math.cos(yaw) * Math.cos(pitch) * zoom,
      )
      .add(hero.position);
    camera.lookAt(
      hero.position.x,
      hero.position.y + cameraTargetHeight(),
      hero.position.z,
    );
    camera.updateProjectionMatrix();
  }
  function changeVillagePassage(enter) {
    if (enter === locations.state.insideVillage) return;
    benchMoment.stand();
    hearts.clear();
    if (enter) {
      outsideView = {
        yaw,
        pitch,
        zoom,
        fov: camera.fov,
        instructions: $(".instructions").innerHTML,
      };
      outsideObjective = $("#objective").textContent;
    }
    if (activeVillageShop) activeVillageShop.room.group.visible = false;
    activeVillageShop = null;
    alpineCart.reset();
    villageActivityCooldown = 0;
    locations.setArea(enter ? "village" : "garden");
    village.group.visible = enter;
    garden.visible = !enter;
    held.visible = !enter;
    alpineOutfits.setHiking(false);
    hikingTethers.forEach((rope) => (rope.visible = false));
    (enter ? village.group : garden).add(companion.character);
    hero.position.copy(enter ? village.arrival : new THREE.Vector3(0, 0, 28));
    hero.rotation.set(0, enter ? Math.PI : 0, 0);
    companion.reset(
      hero.position,
      enter ? village.blockers : companionObstacles,
      enter ? village : gardenTerrain,
    );
    if (enter) {
      yaw = 0;
      pitch = THREE.MathUtils.degToRad(28);
      zoom = 44;
      camera.fov = 60;
    } else if (outsideView) {
      ({ yaw, pitch, zoom } = outsideView);
      camera.fov = outsideView.fov ?? 43;
    }
    scene.background.set(enter ? "#c4dfdf" : "#96c4b0");
    scene.fog.color.copy(scene.background);
    scene.fog.density = enter ? 0.003 : 0.018;
    $("#gardenCounts").hidden = enter;
    $("#villageCounts").hidden = !enter;
    $(".quest .eyebrow").textContent = enter
      ? "EDELWEISS VILLAGE"
      : "THE SUNKEN GARDEN";
    $(".quest h1").innerHTML = enter
      ? "A Swiss mountain street.<br />An alpine day for two."
      : "A little wander.<br />A mighty axe.";
    $("#objective").textContent = enter ? villageObjective() : outsideObjective;
    $("#caveHint").textContent = enter
      ? "Shop doors: north side of the street · X. Sheep: eastern meadow. Via ferrata: west path. Return gate: south."
      : "Swiss village: south path. Funfair: east. Riverside: west. Treasure cave: north.";
    $(".instructions").innerHTML = enter
      ? "<kbd>W A S D</kbd> walk / hike <kbd>X</kbd> shops / sheep / summit cart <kbd>DRAG / Q E</kbd> rotate"
      : outsideView?.instructions;
    effects.clearProjectiles();
    effects.clearParticles();
    resetVillageCamera();
    passageCooldown = 1;
    toast(
      enter
        ? "Edelweiss Village · Shops along the street, sheep to the east, mountain trail to the west."
        : "Back in the sunken garden",
    );
  }
  function useVillageShop(shop) {
    if (
      !locations.state.insideVillage ||
      alpineCart.riding ||
      passageTransition.active ||
      shop === activeVillageShop
    )
      return;
    if (
      passageTransition.start(() => {
        const leaving = activeVillageShop;
        if (leaving) leaving.room.group.visible = false;
        if (shop) villageView = { yaw, pitch, zoom, fov: camera.fov };
        activeVillageShop = shop;
        villageActivityCooldown = 0;
        alpineOutfits.setHiking(false);
        village.group.visible = !shop;
        const terrain = shop ? shop.room : village;
        terrain.group.add(companion.character);
        hero.position.copy(
          shop
            ? shop.room.arrival
            : leaving.doorway.clone().add(new THREE.Vector3(0, 0, 1.6)),
        );
        companion.reset(hero.position, terrain.blockers, terrain);
        if (shop) {
          shop.room.group.visible = true;
          yaw = 0;
          pitch = THREE.MathUtils.degToRad(36);
          zoom = 16;
          camera.fov = 50;
        } else if (villageView) {
          ({ yaw, pitch, zoom } = villageView);
          camera.fov = villageView.fov;
        }
        $(".quest .eyebrow").textContent = shop
          ? shop.name.toUpperCase()
          : "EDELWEISS VILLAGE";
        resetVillageCamera();
        passageCooldown = 1;
        toast(
          shop
            ? `Welcome to ${shop.name} · Walk up to the counter and press X.`
            : "Back on the village street",
        );
      })
    )
      clearRestInput();
  }
  function interactVillage() {
    if (
      !locations.state.insideVillage ||
      $("#guide").open ||
      passageTransition.active ||
      villageActivityCooldown > 0 ||
      alpineCart.riding
    )
      return;
    const action = village.nearby(hero.position, activeVillageShop);
    if (!action) return;
    if (action.kind === "shop") {
      useVillageShop(action.shop);
      return;
    }
    villageActivityCooldown = 0.8;
    if (action.kind !== "lookout") village.stamps.add(action.kind);
    if (action.kind === "sheep") {
      action.sheep.petTime = 3;
      toast("A soft woolly hello ♥ · The sheep gives a little nuzzle.");
      beep(280, 0.18);
    } else if (action.kind === "bakery") {
      toast("A warm pastry for each of you ♥ · Fresh from the village bakery.");
    } else if (action.kind === "outfit") {
      alpineOutfits.scarves.forEach((scarf) => (scarf.visible = true));
      toast("Matching alpine scarves ♥ · Ready for the mountain air.");
    } else if (action.kind === "flowers") {
      alpineOutfits.bouquet.visible = true;
      toast("An alpine bouquet to carry on your travels ♥");
    } else if (action.kind === "lookout") {
      alpineOutfits.setHiking(false);
      clearRestInput();
      alpineCart.start();
      $(".instructions").innerHTML = "Sit back and enjoy the ride together ♥";
      toast("Here we go! ♥ A mountain cart ride for two.");
    }
    hearts.contact(true, hero.position, companion.character.position);
    $("#villageStamps").textContent = village.stamps.size;
    $("#objective").textContent = villageObjective();
  }
  $("#villageAction").onclick = interactVillage;
  function useFunfairPassage(enter, activity = null) {
    if (
      enter === locations.state.insideFunfair ||
      !["garden", "funfair"].includes(locations.area) ||
      funfairActivities.riding
    )
      return;
    if (
      passageTransition.start(() => {
        changeFunfairPassage(enter);
        if (enter && activity === "ring-toss") {
          hero.position.copy(funfair.tossSpot);
          companion.reset(hero.position, funfair.blockers, funfair);
          funfairActivities.interact();
        }
      })
    )
      clearRestInput();
  }
  function changeFunfairPassage(enter) {
    if (enter === locations.state.insideFunfair) return;
    benchMoment.stand();
    funfairActivities.reset();
    hearts.clear();
    if (enter) {
      outsideView = {
        yaw,
        pitch,
        zoom,
        instructions: $(".instructions").innerHTML,
      };
      outsideObjective = $("#objective").textContent;
    }
    locations.setArea(enter ? "funfair" : "garden");
    funfair.group.visible = enter;
    garden.visible = !enter;
    held.visible = !enter;
    (enter ? funfair.group : garden).add(companion.character);
    hero.position.copy(enter ? funfair.arrival : new THREE.Vector3(28, 0, 0));
    hero.rotation.set(0, enter ? Math.PI : 0, 0);
    companion.reset(
      hero.position,
      enter ? funfair.blockers : companionObstacles,
      enter ? funfair : gardenTerrain,
    );
    if (enter) {
      yaw = 0;
      pitch = THREE.MathUtils.degToRad(30);
      zoom = 42;
    } else if (outsideView) ({ yaw, pitch, zoom } = outsideView);
    scene.background.set(enter ? "#b9deda" : "#96c4b0");
    scene.fog.color.copy(scene.background);
    scene.fog.density = enter ? 0.005 : 0.018;
    $("#gardenCounts").hidden = enter;
    $("#funfairCounts").hidden = !enter;
    $(".quest .eyebrow").textContent = enter
      ? "THE SUNFLOWER FUNFAIR"
      : "THE SUNKEN GARDEN";
    $(".quest h1").innerHTML = enter
      ? "A little fair.<br />A day for two."
      : "A little wander.<br />A mighty axe.";
    $("#objective").textContent = enter
      ? funfairActivities.objective()
      : outsideObjective;
    $("#caveHint").textContent = enter
      ? "Ferris wheel: northwest. Carousel: northeast. Ring toss: southeast. Return gate: south."
      : "Swiss village: south path. Funfair gate: east. River gate: west. Treasure cave: north. Lake & bench: southeast.";
    $(".instructions").innerHTML = enter
      ? "<kbd>W A S D</kbd> move <kbd>X</kbd> ride / play <kbd>DRAG / Q E</kbd> rotate <kbd>R / F</kbd> view"
      : outsideView?.instructions;
    effects.clearProjectiles();
    effects.clearParticles();
    camera.position
      .set(
        Math.sin(yaw) * Math.cos(pitch) * zoom,
        1 + Math.sin(pitch) * zoom,
        Math.cos(yaw) * Math.cos(pitch) * zoom,
      )
      .add(hero.position);
    camera.lookAt(
      hero.position.x,
      hero.position.y + cameraTargetHeight(),
      hero.position.z,
    );
    passageCooldown = 1;
    toast(
      enter
        ? "Sunflower Funfair · Walk up to a ride or the ring-toss booth and press X."
        : "Back in the sunken garden",
    );
    beep(enter ? 660 : 440, 0.35);
  }
  function interactFunfair() {
    if (
      !locations.state.insideFunfair ||
      $("#guide").open ||
      passageTransition.active
    )
      return;
    if (funfairActivities.interact()) clearRestInput();
  }
  $("#funfairAction").onclick = interactFunfair;
  function leaveRingToss() {
    if (
      !locations.state.insideFunfair ||
      $("#guide").open ||
      passageTransition.active
    )
      return;
    if (funfairActivities.leaveToss()) clearRestInput();
  }
  $("#funfairExit").onclick = leaveRingToss;
  function useCastlePassage(enter) {
    if (
      enter === locations.state.insideCastle ||
      !locations.state.insideRiver ||
      !cableCar.atSummit ||
      cableCar.riding
    )
      return;
    if (!passageTransition.start(() => changeCastlePassage(enter))) return;
    cameraDrag.reset();
    Object.keys(keys).forEach((key) => (keys[key] = false));
    joy.set(0, 0);
    isMoving = false;
  }
  function changeCastlePassage(enter) {
    if (enter === locations.state.insideCastle) return;
    bedRest.stand(false);
    locations.setRoom(enter ? "castle" : null);
    castleActivityCooldown = 0;
    castleMusicSession++;
    held.visible = !enter;
    hearts.clear();
    effects.clearProjectiles();
    if (enter)
      castleOutsideView = {
        yaw,
        pitch,
        zoom,
        instructions: $(".instructions").innerHTML,
      };
    castleRoom.group.visible = enter;
    cableCar.group.visible = !enter;
    boatTrip.lagoon.group.visible = false;
    boatTrip.boat.visible = !enter;
    if (enter) {
      castleRoom.group.add(companion.character);
      hero.position.set(0, 0, 8.5);
      companion.reset(hero.position, castleRoom.blockers, castleRoom);
      yaw = 0;
      pitch = THREE.MathUtils.degToRad(28);
      zoom = 22;
      hero.rotation.y = Math.PI;
    } else {
      cableCar.summit.group.add(companion.character);
      hero.position.copy(cableCar.summit.castle.entrance);
      companion.reset(hero.position, cableCar.summit.blockers, cableCar.summit);
      if (castleOutsideView) ({ yaw, pitch, zoom } = castleOutsideView);
      hero.rotation.y = 0;
    }
    scene.background.set(enter ? "#cab5b0" : "#c0ded9");
    scene.fog.color.copy(scene.background);
    scene.fog.density = enter ? 0.009 : 0.006;
    sun.intensity = enter ? 1.7 : 3.4;
    scene.children.find((c) => c.isHemisphereLight).intensity = enter
      ? 1.6
      : 2.4;
    camera.position
      .set(
        Math.sin(yaw) * Math.cos(pitch) * zoom,
        1 + Math.sin(pitch) * zoom,
        Math.cos(yaw) * Math.cos(pitch) * zoom,
      )
      .add(hero.position);
    camera.lookAt(hero.position.x, hero.position.y + 1, hero.position.z);
    passageCooldown = 1;
    $("#lagoonCounts").hidden = enter;
    $(".instructions").innerHTML = enter
      ? "<kbd>W A S D</kbd> move <kbd>X</kbd> interact <kbd>DRAG / Q E</kbd> rotate <kbd>R / F</kbd> view up / down"
      : castleOutsideView?.instructions;
    $("#castleCounts").hidden = !enter;
    $("#castleStars").textContent = castleRoom.collected;
    $(".quest .eyebrow").textContent = enter
      ? "THE CLOUD CASTLE"
      : "THE SUMMIT CASTLE";
    $(".quest h1").innerHTML = enter
      ? "A home above the clouds.<br />Little wonders to discover."
      : "A castle in the clouds.<br />A cozy room for two.";
    $("#objective").textContent = enter
      ? castleRoom.objective()
      : "Enter the castle to explore its great room. Cable car: beside the castle.";
    toast(
      enter
        ? "Welcome home · Find stars, share tea, play music, and read a story. Activities: X."
        : "Back at the summit · Cable car: beside the castle · C.",
    );
  }
  let castleActivityCooldown = 0,
    castleMusicSession = 0;
  function interactCastle() {
    if (
      !locations.state.insideCastle ||
      passageTransition.active ||
      $("#guide").open ||
      castleActivityCooldown > 0
    )
      return;
    if (bedRest.resting) {
      passageTransition.start(() => bedRest.stand());
      clearRestInput();
      return;
    }
    const action = castleRoom.interact(hero.position, clock.elapsedTime);
    if (!action) return;
    castleActivityCooldown = action.kind === "piano" ? 3 : 0.8;
    toast(action.message);
    $("#objective").textContent = castleRoom.objective();
    if (action.kind === "bed") {
      passageTransition.start(() => bedRest.start());
      clearRestInput();
    } else if (action.kind === "piano") {
      const session = castleMusicSession;
      [523, 659, 784, 659, 587, 698, 880, 1047].forEach((note, i) =>
        setTimeout(() => {
          if (
            locations.state.insideCastle &&
            session === castleMusicSession &&
            !$("#guide").open
          )
            beep(note, 0.18);
        }, i * 240),
      );
    } else if (action.kind === "tea") {
      hearts.contact(true, hero.position, companion.character.position);
      beep(660, 0.2);
    } else if (action.kind === "chest") {
      burst(castleRoom.rewardPosition.clone(), "#ffe399", 45);
      beep(1047, 0.5);
    }
  }
  function clearRestInput() {
    cameraDrag.reset();
    Object.keys(keys).forEach((key) => (keys[key] = false));
    joy.set(0, 0);
    isMoving = false;
    hearts.clear();
  }
  $("#castleAction").onclick = interactCastle;
  function usePassage(enter, river = false) {
    if (
      enter ===
      (river ? locations.state.insideRiver : locations.state.insideCave)
    )
      return;
    if (!passageTransition.start(() => changePassage(enter, river))) return;
    cameraDrag.reset();
    Object.keys(keys).forEach((key) => (keys[key] = false));
    joy.set(0, 0);
    isMoving = false;
  }
  function changePassage(enter, river = false) {
    if (
      enter ===
      (river ? locations.state.insideRiver : locations.state.insideCave)
    )
      return;
    if (locations.state.insideCastle) changeCastlePassage(false);
    const leavingRiver = locations.state.insideRiver;
    cableCar.reset();
    boatTrip.reset();
    const terrain = river ? riverside : cave;
    benchMoment.stand();
    hearts.clear();
    if (enter) {
      outsideView = { yaw, pitch, zoom };
      outsideObjective = $("#objective").textContent;
    }
    locations.setArea(enter ? (river ? "riverside" : "cave") : "garden");
    boatTrip.setEnabled(locations.state.insideRiver);
    riverside.group.visible = locations.state.insideRiver;
    garden.visible = !enter;
    cave.interior.visible = locations.state.insideCave;
    scene.background.set(
      locations.state.insideCave
        ? "#17151c"
        : locations.state.insideRiver
          ? "#b6d9ce"
          : "#96c4b0",
    );
    scene.fog.color.copy(scene.background);
    scene.fog.density = locations.state.insideCave
      ? 0.026
      : locations.state.insideRiver
        ? 0.011
        : 0.018;
    sun.intensity = locations.state.insideCave ? 0.45 : 3.4;
    const sky = scene.children.find((c) => c.isHemisphereLight);
    sky.intensity = locations.state.insideCave ? 0.7 : 2.4;
    if (enter) {
      (river ? riverside.group : cave.interior).add(companion.character);
      if (river) hero.position.copy(riverside.arrival);
      else hero.position.set(0, 0, 9);
      companion.reset(hero.position, terrain.blockers, terrain);
      hero.rotation.y = river ? 0 : Math.PI;
      yaw = river ? Math.PI : 0;
      pitch = THREE.MathUtils.degToRad(river ? 6 : 16);
      zoom = river ? 26 : 20;
    } else {
      garden.add(companion.character);
      hero.position.set(leavingRiver ? -28 : 0, 0, leavingRiver ? 0 : -38.5);
      companion.reset(hero.position, companionObstacles, gardenTerrain);
      hero.rotation.y = 0;
      if (outsideView) ({ yaw, pitch, zoom } = outsideView);
    }
    effects.clearProjectiles();
    effects.clearParticles();
    camera.position
      .set(
        Math.sin(yaw) * Math.cos(pitch) * zoom,
        1 + Math.sin(pitch) * zoom,
        Math.cos(yaw) * Math.cos(pitch) * zoom,
      )
      .add(hero.position);
    camera.lookAt(
      hero.position.x,
      hero.position.y + cameraTargetHeight(),
      hero.position.z,
    );
    passageCooldown = 1;
    $("#riverCounts").hidden = !locations.state.insideRiver;
    $("#lagoonCounts").hidden = true;
    $("#gardenCounts").hidden = locations.state.insideRiver;
    $(".quest h1").innerHTML = locations.state.insideRiver
      ? "A gentle river.<br />A rainbow of treasures."
      : "A little wander.<br />A mighty axe.";
    $(".quest .eyebrow").textContent = locations.state.insideRiver
      ? "THE RAINBOW RIVERSIDE"
      : enter
        ? "THE GOLDEN GROTTO"
        : "THE SUNKEN GARDEN";
    $("#objective").textContent = locations.state.insideRiver
      ? riverObjective()
      : enter
        ? "A mountain of gold. Explore the hoard, then follow the blue light south to leave."
        : outsideObjective;
    $("#caveHint").textContent = locations.state.insideRiver
      ? "Enjoy the mountain waterfall. Return gate: beside the rainbow lookout."
      : enter
        ? "Exit: south passage, through the blue light."
        : "Swiss village: south path. Funfair gate: east. River gate: west. Treasure cave: north. Lake & bench: southeast.";
    toast(
      locations.state.insideRiver
        ? "Rainbow Riverside · Follow the banks and gather colourful treasures"
        : enter
          ? "The Golden Grotto · A fortune beneath the forest"
          : "Back in the sunken garden",
    );
    beep(enter ? 660 : 440, 0.35);
  }
  let festivalView = null;
  function useFestivalPassage(enter) {
    if (
      enter === locations.state.insideFestival ||
      festivalMoment.active ||
      (enter && !locations.state.insideFunfair)
    )
      return;
    if (passageTransition.start(() => changeFestivalPassage(enter)))
      clearRestInput();
  }
  function changeFestivalPassage(enter) {
    if (enter === locations.state.insideFestival) return;
    festivalMoment.stop();
    hearts.clear();
    if (enter) {
      funfairActivities.reset();
      festivalView = { yaw, pitch, zoom };
      alpineOutfits.reset();
    }
    locations.setArea(enter ? "festival" : "funfair");
    festival.group.visible = enter;
    funfair.group.visible = !enter;
    held.visible = false;
    summerOutfits.set(enter);
    (enter ? festival.group : funfair.group).add(companion.character);
    hero.position.copy(enter ? festival.arrival : new THREE.Vector3(0, 0, -23));
    hero.rotation.set(0, Math.PI, 0);
    companion.reset(
      hero.position,
      enter ? festival.blockers : funfair.blockers,
      enter ? festival : funfair,
    );
    if (enter) {
      yaw = 0;
      pitch = THREE.MathUtils.degToRad(27);
      zoom = 30;
      festivalBridgeSeen = false;
    } else if (festivalView) ({ yaw, pitch, zoom } = festivalView);
    scene.background.set(enter ? "#132e59" : "#b9deda");
    scene.fog.color.copy(scene.background);
    scene.fog.density = enter ? 0.004 : 0.005;
    sun.intensity = enter ? 0.8 : 3.4;
    const fill = scene.children.find((c) => c.isHemisphereLight);
    fill.intensity = enter ? 1.8 : 2.4;
    fill.color.set(enter ? "#b9d5ff" : "#fff4cf");
    fill.groundColor.set(enter ? "#586779" : "#346457");
    $("#funfairCounts").hidden = enter;
    $(".quest .eyebrow").textContent = enter
      ? "SUMMER NIGHT IN JAPAN"
      : "THE SUNFLOWER FUNFAIR";
    $(".quest h1").innerHTML = enter
      ? "Lantern lights.<br />A summer for two."
      : "A little fair.<br />A day for two.";
    $("#objective").textContent = enter
      ? "Wander the lantern street, then share the fireworks on the river bridge."
      : funfairActivities.objective();
    $("#caveHint").textContent = enter
      ? "Food stalls line the street. Tea house: northwest bank. Firefly gardens: northeast. Bridge: straight ahead. Return gate: south."
      : "Festival lantern gate: north. Return to the garden: south.";
    $(".instructions").innerHTML = enter
      ? "<kbd>W A S D</kbd> move <kbd>X</kbd> fireworks together <kbd>DRAG / Q E</kbd> rotate <kbd>R / F</kbd> view"
      : "<kbd>W A S D</kbd> move <kbd>X</kbd> ride / play <kbd>DRAG / Q E</kbd> rotate <kbd>R / F</kbd> view";
    passageCooldown = 1;
    clearRestInput();
    toast(
      enter
        ? "A summer festival for two ♥ Follow the lanterns to the bridge."
        : "Back at the funfair · The garden gate is to the south.",
    );
  }
  function interactFestival() {
    if (
      !locations.state.insideFestival ||
      $("#guide").open ||
      passageTransition.active
    )
      return;
    if (festivalMoment.active) {
      festivalMoment.stop();
      clearRestInput();
      return;
    }
    if (festival.nearBridge(hero.position)) {
      festivalBridgeSeen = true;
      festivalMoment.start();
      clearRestInput();
      toast("Together under the summer sky ♥");
    }
  }
  $("#festivalAction").onclick = interactFestival;
  function cameraTargetHeight() {
    // Frame the characters in the foreground and the tall mountain above them.
    return locations.state.insideFestival
      ? 3
      : locations.state.insideVillage
        ? activeVillageShop
          ? 1
          : hero.position.y > 0.5
            ? 6
            : 12
        : locations.state.insideFunfair
          ? funfairActivities.riding
            ? 2
            : 8
          : locations.state.insideCastle
            ? 1
            : cableCar.atSummit && !cableCar.riding
              ? 5
              : cableCar.riding
                ? 3
                : locations.state.insideRiver &&
                    !boatTrip.atLagoon &&
                    !boatTrip.rowing
                  ? 9
                  : 1;
  }
  function riverObjective() {
    return riverCollected === riverside.treasures.length
      ? "All riverside treasures collected! Enjoy the ducks and the gentle river."
      : "Find hidden gem clusters near the picnic, boat, gazebo, and rainbow waterfall.";
  }
  const keys = {};
  let yaw = 0,
    pitch = THREE.MathUtils.degToRad(16),
    zoom = 20,
    isMoving = false,
    cooldown = 0,
    score = 0,
    collected = 0,
    won = false,
    walk = 0,
    throwAnim = 0;
  let sound = true;
  const audio = createGameAudio(
    () => locations.state.insideCave,
    () => locations.state.insideFestival,
  );
  function beep(freq, duration = 0.1) {
    audio.effect(freq, duration);
  }
  let toastUntil = 0;
  function toast(t) {
    $("#toast").textContent = t;
    $("#toast").style.opacity = 1;
    toastUntil = performance.now() + 3200;
  }
  async function setSound(value) {
    sound = value;
    $("#sound").textContent = sound ? "Sound on" : "Sound off";
    $("#sound").setAttribute("aria-pressed", String(sound));
    try {
      await audio.setEnabled(sound);
    } catch {
      sound = false;
      await audio.setEnabled(false);
      $("#sound").textContent = "Sound off";
      $("#sound").setAttribute("aria-pressed", "false");
      toast("Audio could not start. Tap Sound to try again.");
    }
  }
  // Enable audio now; the existing gesture listeners resume it if autoplay is blocked.
  void setSound(true);
  function fire() {
    if (
      cooldown > 0 ||
      $("#guide").open ||
      locations.state.insideCastle ||
      locations.state.insideFestival ||
      locations.state.insideFunfair ||
      locations.state.insideVillage ||
      benchMoment.seated ||
      boatTrip.rowing ||
      cableCar.riding ||
      passageTransition.active
    )
      return;
    cooldown = 0.46;
    throwAnim = 0.3;
    const dir = new THREE.Vector3(
      Math.sin(hero.rotation.y),
      0,
      Math.cos(hero.rotation.y),
    );
    const a = axe();
    a.position
      .copy(hero.position)
      .add(new THREE.Vector3(0, 1.5, 0))
      .addScaledVector(dir, 0.8);
    scene.add(a);
    axes.push({ g: a, dir, life: 1.65 });
    beep(220, 0.15);
  }
  const { joy, cameraDrag } = bindGameInput({
    $,
    canvas: renderer.domElement,
    keys,
    locations,
    passageTransition,
    benchMoment,
    boatTrip,
    cableCar,
    festivalMoment,
    funfairActivities,
    alpineCart,
    boardBoat,
    boardCableCar,
    interactFestival,
    interactVillage,
    interactFunfair,
    interactCastle,
    leaveRingToss,
    fire,
    rotate(dx) {
      if (
        !festivalMoment.active &&
        !funfairActivities.playing &&
        !alpineCart.riding
      )
        yaw -= dx * 0.006;
    },
    zoomBy(delta) {
      zoom = THREE.MathUtils.clamp(
        zoom + delta * 0.012,
        10,
        locations.state.insideFestival
          ? 44
          : locations.state.insideVillage
            ? 52
            : locations.state.insideFunfair
              ? 50
              : 26,
      );
    },
    toggleSound: () => setSound(!sound),
  });
  $("#restart").onclick = () => {
    passageTransition.cancel();
    cameraDrag.reset();
    benchMoment.stand();
    if (locations.state.insideVillage) changeVillagePassage(false);
    if (locations.state.insideFestival) changeFestivalPassage(false);
    village.reset();
    alpineOutfits.reset();
    $("#villageStamps").textContent = 0;
    if (locations.state.insideFunfair) changeFunfairPassage(false);
    funfairActivities.reset(true);
    $("#funfairPrizes").textContent = 0;
    if (locations.state.insideCastle) changeCastlePassage(false);
    castleRoom.reset();
    cableCar.reset();
    boatTrip.reset(true);
    $("#lagoonGems").textContent = 0;
    if (locations.state.insideCave || locations.state.insideRiver)
      changePassage(false, locations.state.insideRiver);
    hero.position.set(0, 0, 7);
    companion.reset();
    hearts.clear();
    yaw = 0;
    pitch = THREE.MathUtils.degToRad(16);
    hero.rotation.y = 0;
    camera.position
      .set(0, 1 + Math.sin(pitch) * zoom, Math.cos(pitch) * zoom)
      .add(hero.position);
    camera.lookAt(
      hero.position.x,
      hero.position.y + cameraTargetHeight(),
      hero.position.z,
    );
    score = collected = riverCollected = 0;
    riverside.reset();
    $("#riverGems").textContent = 0;
    won = false;
    targets.forEach((t) => {
      t.hit = false;
      t.blocker.active = true;
      t.g.visible = true;
    });
    gems.forEach((g) => {
      g.got = false;
      g.g.visible = true;
    });
    effects.clearProjectiles();
    $("#targets").textContent = 0;
    $("#gems").textContent = 0;
    $("#objective").textContent =
      "Break the wooden targets and find the sunstones.";
    toast("A fresh adventure begins");
  };
  const updateHud = createHud({
    $,
    boatTrip,
    cableCar,
    benchMoment,
    festivalMoment,
    festival,
    village,
    alpineCart,
    funfairActivities,
    castleRoom,
    bedRest,
    hero,
    riverside,
  });
  const clock = new THREE.Clock();
  const desired = new THREE.Vector3();
  function frame() {
    let dt = Math.min(clock.getDelta(), 0.04),
      time = clock.elapsedTime;
    const transitioning = passageTransition.active;
    if (!$("#guide").open) passageTransition.update(dt);
    const paused = $("#guide").open || transitioning;
    cooldown = Math.max(0, cooldown - dt);
    throwAnim = Math.max(0, throwAnim - dt);
    villageActivityCooldown = Math.max(0, villageActivityCooldown - dt);
    castleActivityCooldown = Math.max(0, castleActivityCooldown - dt);
    if (!paused) {
      benchMoment.update(dt);
      passageCooldown = Math.max(0, passageCooldown - dt);
      if (
        !festivalMoment.active &&
        !funfairActivities.playing &&
        !alpineCart.riding
      ) {
        yaw += ((keys.KeyQ ? 1 : 0) - (keys.KeyE ? 1 : 0)) * dt * 1.4;
        pitch = THREE.MathUtils.clamp(
          pitch + ((keys.KeyR ? 1 : 0) - (keys.KeyF ? 1 : 0)) * dt * 0.65,
          THREE.MathUtils.degToRad(6),
          THREE.MathUtils.degToRad(70),
        );
      }
      const wasCartRiding = alpineCart.riding;
      if (locations.state.insideVillage && !activeVillageShop) {
        alpineCart.update(dt);
        village.update(dt, time, hero.position);
        alpineOutfits.setHiking(
          !alpineCart.riding &&
            (village.onTrail(hero.position.x, hero.position.z) ||
              hero.position.y > 0.5),
        );
      }
      if (locations.state.insideFestival) {
        festival.update(dt);
        festivalMoment.update(dt);
      }
      if (locations.state.insideFunfair) {
        const wasPlaying = funfairActivities.playing;
        funfairActivities.update(dt, time);
        if (wasPlaying && !funfairActivities.playing) clearRestInput();
      }
      if (locations.state.insideFestival && festivalMoment.active) {
        isMoving = false;
      } else if (wasCartRiding) {
        isMoving = false;
      } else if (
        locations.state.insideFunfair &&
        (funfairActivities.riding || funfairActivities.playing)
      ) {
        isMoving = false;
      } else if (bedRest.resting) {
        bedRest.update(dt, camera);
        isMoving = false;
      } else if (cableCar.riding) {
        cableCar.update(dt);
        isMoving = false;
      } else if (boatTrip.rowing) {
        boatTrip.update(dt);
        isMoving = false;
      } else {
        const terrain = locations.activeTerrain;
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
        movement.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        const speed = keys.ShiftLeft || keys.ShiftRight ? 7.8 : 4.7;
        const old = hero.position.clone();
        hero.position.addScaledVector(movement, dt * speed);
        const movementObstacles = benchMoment.seated
          ? []
          : locations.state.insideFestival ||
              locations.state.insideVillage ||
              locations.state.insideFunfair ||
              locations.state.insideRiver
            ? terrain.blockers
            : locations.state.insideCave
              ? cave.blockers
              : blockers;
        resolveObstacleCollisions(hero.position, old, movementObstacles);
        if (
          locations.state.insideFestival ||
          locations.state.insideVillage ||
          locations.state.insideFunfair ||
          locations.state.insideRiver
        ) {
          terrain.constrain?.(hero.position, old);
          if (!terrain.contains(hero.position.x, hero.position.z))
            hero.position.copy(old);
          hero.position.y = terrain.heightAt(hero.position.x, hero.position.z);
        } else if (locations.state.insideCave) {
          cave.constrain(hero.position);
          resolveObstacleCollisions(hero.position, old, movementObstacles);
          if (Math.hypot(hero.position.x, hero.position.z) > 16)
            hero.position.copy(old);
          hero.position.y = cave.heightAt(hero.position.x, hero.position.z);
        } else {
          if (hero.position.length() > 49) hero.position.setLength(49);
          resolveObstacleCollisions(hero.position, old, movementObstacles);
          if (hero.position.length() > 49) hero.position.copy(old);
          if (
            !benchMoment.seated &&
            inLake(hero.position.x, hero.position.z, 0.4)
          )
            hero.position.copy(old);
        }
        if (!benchMoment.seated) {
          if (
            locations.state.insideVillage &&
            !activeVillageShop &&
            village.onTrail(old.x, old.z) &&
            hero.position.distanceToSquared(old) > 0.000001
          )
            village.makeRoom(companion.character, hero.position);
          const playerBump = companion.blocksPlayer(hero.position, old);
          const companionBump = companion.update(
            dt,
            locations.state.insideFestival ||
              locations.state.insideVillage ||
              locations.state.insideFunfair ||
              locations.state.insideRiver
              ? terrain.blockers
              : locations.state.insideCave
                ? cave.blockers
                : companionObstacles,
            hero.position,
            locations.state.insideFestival ||
              locations.state.insideVillage ||
              locations.state.insideFunfair ||
              locations.state.insideRiver
              ? terrain
              : locations.state.insideCave
                ? cave
                : gardenTerrain,
          );
          hearts.contact(
            playerBump || companionBump,
            hero.position,
            companion.character.position,
          );
        }
        isMoving = movement.length() > 0.05;
        if (!benchMoment.seated && isMoving) {
          walk += dt * speed * 2;
          body.position.y = Math.abs(Math.sin(walk)) * 0.055;
          legs[0].rotation.x = Math.sin(walk) * 0.5;
          legs[1].rotation.x = -Math.sin(walk) * 0.5;
          const facing = hero.position.clone().sub(old);
          if (facing.lengthSq() > 0.000001)
            hero.rotation.y = Math.atan2(facing.x, facing.z);
        } else if (!benchMoment.seated) {
          legs.forEach((l) => (l.rotation.x *= 0.8));
          body.position.y = Math.sin(time * 2) * 0.018;
        }
        if (!benchMoment.seated) {
          arms[1].rotation.x =
            throwAnim > 0
              ? -Math.sin((throwAnim / 0.3) * Math.PI) * 2
              : Math.sin(walk) * 0.12;
          arms[0].rotation.x = -legs[0].rotation.x * 0.5;
        }
        for (let i = axes.length - 1; i >= 0; i--) {
          const a = axes[i];
          a.life -= dt;
          a.g.position.addScaledVector(a.dir, dt * 19);
          a.g.rotation.x += dt * 18;
          a.g.rotation.z += dt * 6;
          for (const t of locations.area !== "garden" ? [] : targets) {
            if (!t.hit && a.g.position.distanceTo(t.pos) < 0.93) {
              t.hit = true;
              t.blocker.active = false;
              t.g.visible = false;
              score++;
              $("#targets").textContent = score;
              burst(t.pos, "#dab56c", 22);
              beep(130, 0.2);
              a.life = 0;
              toast(
                score === 12
                  ? "All targets cleared. Nicely thrown!"
                  : `Target down · ${score} / 12`,
              );
              break;
            }
          }
          if (a.life <= 0) {
            scene.remove(a.g);
            axes.splice(i, 1);
          }
        }
        for (const g of locations.area !== "garden" ? [] : gems) {
          if (!g.got && g.g.position.distanceTo(hero.position) < 1.35) {
            g.got = true;
            g.g.visible = false;
            collected++;
            $("#gems").textContent = collected;
            burst(
              g.g.position.clone().add(new THREE.Vector3(0, 1, 0)),
              "#ffe392",
              22,
            );
            beep(880, 0.3);
            toast(`Sunstone found · ${collected} / 8`);
          }
        }
        if (
          locations.state.insideRiver &&
          boatTrip.atLagoon &&
          !cableCar.atSummit
        ) {
          const pickup = boatTrip.lagoon.collect(hero.position);
          if (pickup) {
            $("#lagoonGems").textContent = pickup.total;
            burst(pickup.position, pickup.color, 12);
            beep(880, 0.12);
            toast(
              pickup.total === 240
                ? "✦ All 240 lagoon treasures collected!"
                : `Gemstones found · ${pickup.total} / 240`,
            );
            if (pickup.total === 240)
              $("#objective").textContent =
                "Your lagoon collection is complete! Enjoy the sunflowers together.";
          }
        }
        if (locations.state.insideRiver && !boatTrip.atLagoon) {
          for (const t of riverside.treasures) {
            if (
              !t.got &&
              Math.hypot(
                hero.position.x - t.crystal.position.x,
                hero.position.z - t.crystal.position.z,
              ) < 1.15
            ) {
              t.got = true;
              t.crystal.visible = t.glow.visible = false;
              riverCollected++;
              $("#riverGems").textContent = riverCollected;
              $("#objective").textContent = riverObjective();
              burst(t.crystal.position.clone(), t.color, 18);
              beep(660 + riverCollected * 25, 0.2);
              toast(
                riverCollected === riverside.treasures.length
                  ? "✦ Your riverside collection is complete!"
                  : `${t.name} found · ${riverCollected} / ${riverside.treasures.length}`,
              );
            }
          }
        }
        if (
          locations.area === "garden" &&
          score === 12 &&
          collected === 8 &&
          !won
        ) {
          $("#objective").textContent =
            "Return to the glowing shrine in the north.";
          if (hero.position.distanceTo(shrine.position) < 3.8) {
            won = true;
            $("#objective").textContent =
              "Garden restored. Keep wandering, adventurer.";
            toast("✦ Garden restored! Your adventure is complete.");
            burst(relic.getWorldPosition(new THREE.Vector3()), "#ffe890", 70);
            beep(1100, 0.8);
          }
        }
        if (locations.state.insideCastle) {
          const star = castleRoom.collect(hero.position);
          if (star) {
            burst(star.g.position.clone(), "#ffe399", 12);
            beep(880, 0.2);
            toast(`Hidden star found · ${castleRoom.collected} / 6`);
            $("#castleStars").textContent = castleRoom.collected;
            $("#objective").textContent = castleRoom.objective();
          }
        }
        if (
          locations.state.insideFestival &&
          !festivalBridgeSeen &&
          festival.nearBridge(hero.position)
        )
          interactFestival();
        if (passageCooldown === 0) {
          if (locations.state.insideFestival && festival.isExit(hero.position))
            useFestivalPassage(false);
          else if (
            locations.state.insideFunfair &&
            !funfairActivities.riding &&
            !funfairActivities.playing &&
            festival.isEntrance(hero.position)
          )
            useFestivalPassage(true);
          else if (
            locations.state.insideVillage &&
            activeVillageShop &&
            activeVillageShop.room.isExit(hero.position)
          )
            useVillageShop(null);
          else if (
            locations.state.insideVillage &&
            !activeVillageShop &&
            village.isExit(hero.position)
          )
            useVillagePassage(false);
          else if (
            locations.area === "garden" &&
            village.isEntrance(hero.position)
          )
            useVillagePassage(true);
          else if (
            locations.state.insideFunfair &&
            funfair.isExit(hero.position)
          )
            useFunfairPassage(false);
          else if (
            locations.area === "garden" &&
            funfair.isEntrance(hero.position)
          )
            useFunfairPassage(true);
          else if (
            locations.state.insideCastle &&
            castleRoom.isExit(hero.position)
          )
            useCastlePassage(false);
          else if (
            locations.state.insideRiver &&
            cableCar.atSummit &&
            !locations.state.insideCastle &&
            cableCar.summit.castle.isEntrance(hero.position)
          )
            useCastlePassage(true);
          else if (
            locations.state.insideRiver &&
            !boatTrip.atLagoon &&
            riverside.isExit(hero.position)
          )
            usePassage(false, true);
          else if (
            locations.area === "garden" &&
            riverside.isEntrance(hero.position)
          )
            usePassage(true, true);
          else if (
            locations.area === "garden" &&
            cave.isEntrance(hero.position)
          )
            usePassage(true);
          else if (locations.state.insideCave && cave.isExit(hero.position))
            usePassage(false);
        }
      }
    }
    updateHud({
      isMoving,
      paused,
      dt,
      insideCastle: locations.state.insideCastle,
      insideRiver: locations.state.insideRiver,
      insideCave: locations.state.insideCave,
      insideFestival: locations.state.insideFestival,
      insideFunfair: locations.state.insideFunfair,
      insideVillage: locations.state.insideVillage,
      activeVillageShop,
      villageActivityCooldown,
      castleActivityCooldown,
    });
    if (!locations.state.insideFunfair) funfair.update(time);
    lakeside.update(time);
    if (locations.state.insideCastle) {
      castleRoom.update(time, camera, paused ? 0 : dt);
      $("#caveHint").textContent = bedRest.resting
        ? "Resting together · X or Get up to return to exploring."
        : "Find six hidden stars. Bed, tea, piano and storybook: X nearby. Exit: pink arch to the south.";
    } else if (locations.state.insideRiver) {
      riverside.update(time);
      cableCar.updateVisibility(camera, [hero, companion.character], dt);
      const gateX = riverside.returnGate.position.x - hero.position.x,
        gateZ = riverside.returnGate.position.z - hero.position.z;
      const distance = Math.round(Math.hypot(gateX, gateZ));
      const direction = `${Math.abs(gateZ) > 3 ? (gateZ > 0 ? "south" : "north") : ""}${Math.abs(gateX) > 3 ? (gateX > 0 ? "east" : "west") : ""}`;
      $("#caveHint").textContent = cableCar.riding
        ? "Both aboard · Rising above the lake and forest. Camera controls still work."
        : cableCar.atSummit
          ? "Summit castle · Enter through the open arch. Return cable car: beside the castle · C."
          : boatTrip.rowing
            ? "Both aboard · Enjoy the ride. Camera controls still work."
            : boatTrip.atLagoon
              ? "Follow the clear paths through the sunflowers. Cross the bridge for more gems. Cable car: north end of the flower island · C. Return boat: south dock."
              : `Explore the island. A mountain waterfall feeds the river. Boat dock: east bank by the bridge. Return gate: ${distance} m ${direction || "away"}, beside the rainbow lookout.`;
    }
    effects.update(dt);
    gems.forEach((g) => {
      g.crystal.rotation.y = time;
      g.crystal.position.y = 1 + Math.sin(time * 2 + g.g.position.x) * 0.13;
    });
    relic.rotation.y = time * 0.5;
    relic.position.y = 2.8 + Math.sin(time) * 0.15;
    ring.rotation.y = time * 0.25;
    ring.rotation.z = 0.2;
    if (locations.state.insideFestival && festivalMoment.active)
      festivalMoment.updateCamera();
    else if (alpineCart.riding || alpineCart.vanishing)
      alpineCart.updateCamera();
    else {
      desired
        .set(
          Math.sin(yaw) * Math.cos(pitch) * zoom,
          1 + Math.sin(pitch) * zoom,
          Math.cos(yaw) * Math.cos(pitch) * zoom,
        )
        .add(hero.position);
      camera.position.lerp(desired, 1 - Math.exp(-dt * 5));
      camera.lookAt(
        hero.position.x,
        hero.position.y + cameraTargetHeight(),
        hero.position.z,
      );
    }
    [hero, companion.character].forEach((character, i) => {
      const climbing =
        locations.state.insideVillage &&
        !activeVillageShop &&
        !alpineCart.riding &&
        village.onTrail(character.position.x, character.position.z) &&
        village.trailInfo(character.position).climbing;
      if (!alpineCart.riding) alpineOutfits.poseClimb(i, climbing, time);
    });
    hikingTethers.forEach((rope, i) => {
      const character = i ? companion.character : hero;
      rope.visible =
        locations.state.insideVillage &&
        !activeVillageShop &&
        !alpineCart.riding &&
        character.position.y > 0.5;
      if (rope.visible) {
        character.updateWorldMatrix(true, false);
        const clip = village.clipPoint(character.position);
        const harnessPoint = character.localToWorld(
          new THREE.Vector3(0, 0.95, 0.55),
        );
        const vertices = rope.geometry.getAttribute("position");
        vertices.setXYZ(0, harnessPoint.x, harnessPoint.y, harnessPoint.z);
        vertices.setXYZ(1, clip.x, clip.y, clip.z);
        vertices.needsUpdate = true;
        rope.geometry.computeBoundingSphere();
      }
    });
    hearts.update(paused ? 0 : dt, camera);
    if (locations.state.insideVillage && !activeVillageShop)
      village.updateVisibility(camera, [hero, companion.character], dt);
    else if (locations.state.insideRiver && !locations.state.insideCastle)
      riverside.updateVisibility(camera, [hero, companion.character], dt);
    else if (
      !locations.state.insideCave &&
      !locations.state.insideCastle &&
      !locations.state.insideFestival &&
      !locations.state.insideFunfair &&
      !locations.state.insideVillage
    )
      treeVisibility.update(camera, [hero, companion.character], dt);
    sun.position.set(
      hero.position.x - 18,
      hero.position.y + 30,
      hero.position.z + 12,
    );
    sun.target.position.copy(hero.position);
    cave.update(time, camera);
    if (locations.state.insideFunfair && funfairActivities.playing)
      renderer.render(funfair.tossScene, funfair.tossCamera);
    else renderer.render(scene, camera);
  }
  camera.position
    .set(0, 1 + Math.sin(pitch) * zoom, Math.cos(pitch) * zoom)
    .add(hero.position);
  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    funfair.tossCamera.aspect = camera.aspect;
    funfair.tossCamera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
  toast("WASD to move · Drag to look around · Click to throw");
  const loop = createGameLoop(frame);
  if (
    typeof location !== "undefined" &&
    new URLSearchParams(location.search).get("area") === "festival"
  ) {
    changeFunfairPassage(true);
    changeFestivalPassage(true);
    if (new URLSearchParams(location.search).get("activity") === "fireworks") {
      hero.position.set(0, festival.heightAt(0, -6), -6);
      interactFestival();
    }
  }
  // A direct link lets players start their visit at the fairground entrance.
  if (
    typeof location !== "undefined" &&
    new URLSearchParams(location.search).get("area") === "funfair"
  )
    useFunfairPassage(
      true,
      new URLSearchParams(location.search).get("activity"),
    );
  if (
    typeof location !== "undefined" &&
    new URLSearchParams(location.search).get("area") === "village"
  )
    useVillagePassage(
      true,
      new URLSearchParams(location.search).get("activity"),
    );
  registerAdventureProgress(readProgress);
  function readProgress() {
    return {
      funfairPrizes: funfairActivities.collected,
      funfairRide: funfairActivities.ride,
      ringTossFirstPerson: funfairActivities.playing,
      villageMemories: village.stamps.size,
      villageCart: alpineCart.riding,
      villageShop: activeVillageShop?.kind ?? null,
      festivalFireworks: festivalMoment.active,
      summerClothes: locations.state.insideFestival,
      location: locations.state.insideFestival
        ? "japanese night festival"
        : locations.state.insideVillage
          ? activeVillageShop
            ? activeVillageShop.name
            : "edelweiss village"
          : locations.state.insideFunfair
            ? "sunflower funfair"
            : locations.state.insideCastle
              ? "castle great room"
              : locations.state.insideRiver
                ? cableCar.riding
                  ? "cable car"
                  : cableCar.atSummit
                    ? "mountain summit"
                    : boatTrip.atLagoon
                      ? "lotus lagoon"
                      : "riverside"
                : locations.state.insideCave
                  ? "treasure cave"
                  : "garden",
      riversideTreasures: riverCollected,
      lagoonTreasures: boatTrip.lagoon.collected,
      sunStones: collected,
      targetsBroken: score,
      complete: won,
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
      boatTrip,
      cableCar,
      bedRest,
      funfairActivities,
      alpineCart,
      alpineOutfits,
      festivalMoment,
      summerOutfits,
    },
    controls: {
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
        return won;
      },
      get yaw() {
        return yaw;
      },
      get pitch() {
        return pitch;
      },
      get zoom() {
        return zoom;
      },
      get activeVillageShop() {
        return activeVillageShop;
      },
    },
    input: { keys },
    effects,
    passageTransition,
  };
}
