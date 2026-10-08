import { createVillageHud } from "./hud.js";
import * as THREE from "three";

export function createVillagePlace(context) {
  const {
    village,
    locations,
    passageTransition,
    hero,
    companion,
    resetCamera,
    clearRestInput,
    benchMoment,
    hearts,
    state,
    camera,
    $,
    alpineCart,
    garden,
    held,
    alpineOutfits,
    hikingTethers,
    companionObstacles,
    gardenTerrain,
    scene,
    effects,
    toast,
    beep,
  } = context;
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
      return false;
    return context.transitions.go(enter ? "village" : "garden", { activity });
  }

  function changeVillagePassage(enter) {
    if (enter === locations.state.insideVillage) return;
    benchMoment.stand();
    hearts.clear();
    if (enter) {
      state.outsideView = {
        yaw: state.yaw,
        pitch: state.pitch,
        zoom: state.zoom,
        fov: camera.fov,
        instructions: $(".instructions").innerHTML,
      };
      state.outsideObjective = $("#objective").textContent;
    }
    if (state.activeVillageShop)
      state.activeVillageShop.room.group.visible = false;
    state.activeVillageShop = null;
    alpineCart.reset();
    state.villageActivityCooldown = 0;
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
      state.yaw = 0;
      state.pitch = THREE.MathUtils.degToRad(28);
      state.zoom = 44;
      camera.fov = 60;
    } else if (state.outsideView) {
      ({
        yaw: state.yaw,
        pitch: state.pitch,
        zoom: state.zoom,
      } = state.outsideView);
      camera.fov = state.outsideView.fov ?? 43;
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
    $("#objective").textContent = enter
      ? villageObjective()
      : state.outsideObjective;
    $("#caveHint").textContent = enter
      ? "Shop doors: north side of the street · X. Sheep: eastern meadow. Via ferrata: west path. Return gate: south."
      : "Swiss village: south path. Funfair: east. Riverside: west. Treasure cave: north.";
    $(".instructions").innerHTML = enter
      ? "<kbd>W A S D</kbd> walk / hike <kbd>X</kbd> shops / sheep / summit cart <kbd>DRAG / Q E</kbd> rotate"
      : state.outsideView?.instructions;
    effects.clearProjectiles();
    effects.clearParticles();
    resetCamera();
    state.passageCooldown = 1;
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
      shop === state.activeVillageShop
    )
      return;
    return context.transitions.go(shop ? `shop:${shop.kind}` : "village");
  }

  function changeVillageShop(shop) {
    const leaving = state.activeVillageShop;
    if (leaving) leaving.room.group.visible = false;
    if (shop)
      state.villageView = {
        yaw: state.yaw,
        pitch: state.pitch,
        zoom: state.zoom,
        fov: camera.fov,
      };
    state.activeVillageShop = shop;
    locations.setRoom(shop ? `shop:${shop.kind}` : null);
    state.villageActivityCooldown = 0;
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
      state.yaw = 0;
      state.pitch = THREE.MathUtils.degToRad(36);
      state.zoom = 16;
      camera.fov = 50;
    } else if (state.villageView) {
      ({
        yaw: state.yaw,
        pitch: state.pitch,
        zoom: state.zoom,
      } = state.villageView);
      camera.fov = state.villageView.fov;
    }
    $(".quest .eyebrow").textContent = shop
      ? shop.name.toUpperCase()
      : "EDELWEISS VILLAGE";
    resetCamera();
    state.passageCooldown = 1;
    toast(
      shop
        ? `Welcome to ${shop.name} · Walk up to the counter and press X.`
        : "Back on the village street",
    );
  }

  function interactVillage() {
    if (
      !locations.state.insideVillage ||
      $("#guide").open ||
      passageTransition.active ||
      state.villageActivityCooldown > 0 ||
      alpineCart.riding
    )
      return;
    const action = village.nearby(hero.position, state.activeVillageShop);
    if (!action) return;
    if (action.kind === "shop") {
      useVillageShop(action.shop);
      return;
    }
    state.villageActivityCooldown = 0.8;
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
  return {
    update(dt, time) {
      if (locations.current !== "village") return false;
      const wasRiding = alpineCart.riding;
      alpineCart.update(dt);
      village.update(dt, time, hero.position);
      alpineOutfits.setHiking(
        !alpineCart.riding &&
          (village.onTrail(hero.position.x, hero.position.z) ||
            hero.position.y > 0.5),
      );
      return wasRiding;
    },
    updateCamera() {
      if (!alpineCart.riding && !alpineCart.vanishing) return false;
      alpineCart.updateCamera();
      return true;
    },
    afterCamera(dt, time) {
      [hero, companion.character].forEach((character, i) => {
        const climbing =
          locations.current === "village" &&
          !alpineCart.riding &&
          village.onTrail(character.position.x, character.position.z) &&
          village.trailInfo(character.position).climbing;
        if (!alpineCart.riding) alpineOutfits.poseClimb(i, climbing, time);
      });
      hikingTethers.forEach((rope, i) => {
        const character = i ? companion.character : hero;
        rope.visible =
          locations.current === "village" &&
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

      if (locations.current === "village")
        village.updateVisibility(camera, [hero, companion.character], dt);
    },
    progressLabel: () => state.activeVillageShop?.name ?? "edelweiss village",

    exit() {
      alpineCart.reset();
      alpineOutfits.setHiking(false);
      hikingTethers.forEach((rope) => (rope.visible = false));
    },
    id: "village",
    cameraLocked: () => alpineCart.riding,
    getHud: createVillageHud(context),
    getGate: () =>
      !state.activeVillageShop && village.isExit(hero.position)
        ? { id: "garden" }
        : null,
    beforeCompanion(previous) {
      if (
        !state.activeVillageShop &&
        village.onTrail(previous.x, previous.z) &&
        hero.position.distanceToSquared(previous) > 0.000001
      )
        village.makeRoom(companion.character, hero.position);
    },
    legacyFlag: "insideVillage",
    parent: "garden",
    resolve: () =>
      state.activeVillageShop ? `shop:${state.activeVillageShop.kind}` : null,
    group: village.group,
    terrain: village,
    activateEnter(options = {}) {
      changeVillagePassage(true);
      const activity = options.activity;
      if (activity) {
        const shop = village.shops.find((entry) => entry.kind === activity);
        if (shop)
          hero.position.copy(shop.doorway).add(new THREE.Vector3(0, 0, 0.7));
        else if (activity === "lookout") hero.position.copy(village.lookout);
        else if (activity === "trail") hero.position.copy(village.route[6]);
        else if (activity === "sheep") hero.position.set(22, 0, 20);
        companion.reset(hero.position, village.blockers, village);
        resetCamera();
      }
    },
    canEnter: ({ from }) => from === "garden",
    activateExit: () => changeVillagePassage(false),
    interact: interactVillage,
    objective: villageObjective,
    cameraTarget: () =>
      state.activeVillageShop ? 1 : hero.position.y > 0.5 ? 6 : 12,
    maxZoom: 52,
    canThrow: false,
    reset: () => {
      village.reset();
      alpineOutfits.reset();
    },
    controls: {
      villageObjective,
      useVillagePassage,
      changeVillagePassage,
      useVillageShop,
      changeVillageShop,
      interactVillage,
    },
  };
}
