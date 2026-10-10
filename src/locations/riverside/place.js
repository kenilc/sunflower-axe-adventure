import { createRiversideHud } from "./hud.js";
import * as THREE from "three";

export function createRiversidePlace(context) {
  const {
    locations,
    $,
    passageTransition,
    cableCar,
    boatTrip,
    hearts,
    effects,
    state,
    changeCastlePassage,
    riverside,
    cave,
    benchMoment,
    garden,
    scene,
    sun,
    companion,
    hero,
    companionObstacles,
    gardenTerrain,
    camera,
    cameraTargetHeight,
    toast,
    beep,
    burst,
  } = context;
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
      context.cameraDrag.reset();
      Object.keys(context.keys).forEach((key) => {
        context.keys[key] = false;
      });
      context.joy.set(0, 0);
      hearts.clear();
      effects.clearProjectiles();
      state.yaw = cableCar.atSummit ? Math.PI : 0;
      state.pitch = THREE.MathUtils.degToRad(16);
      state.zoom = 16;
    }
  }

  function usePassage(enter, river = false) {
    if (
      enter ===
      (river ? locations.state.insideRiver : locations.state.insideCave)
    )
      return false;
    return context.transitions.go(
      enter ? (river ? "riverside" : "cave") : "garden",
    );
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
      state.outsideView = {
        yaw: state.yaw,
        pitch: state.pitch,
        zoom: state.zoom,
      };
      state.outsideObjective = $("#objective").textContent;
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
      state.yaw = river ? Math.PI : 0;
      state.pitch = THREE.MathUtils.degToRad(river ? 6 : 16);
      state.zoom = river ? 26 : 20;
    } else {
      garden.add(companion.character);
      hero.position.set(leavingRiver ? -28 : 0, 0, leavingRiver ? 0 : -38.5);
      companion.reset(hero.position, companionObstacles, gardenTerrain);
      hero.rotation.y = 0;
      if (state.outsideView)
        ({
          yaw: state.yaw,
          pitch: state.pitch,
          zoom: state.zoom,
        } = state.outsideView);
    }
    effects.clearProjectiles();
    effects.clearParticles();
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
    state.passageCooldown = 1;
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
        : state.outsideObjective;
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

  function riverObjective() {
    return state.riverCollected === riverside.treasures.length
      ? "All riverside treasures collected! Enjoy the ducks and the gentle river."
      : "Find hidden gem clusters near the picnic, boat, gazebo, and rainbow waterfall.";
  }
  return {
    moveInstead(dt) {
      if (cableCar.riding) {
        cableCar.update(dt);
        return true;
      }
      if (boatTrip.rowing) {
        boatTrip.update(dt);
        return true;
      }
      return false;
    },
    afterMovement() {
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
            state.riverCollected++;
            $("#riverGems").textContent = state.riverCollected;
            $("#objective").textContent = riverObjective();
            burst(t.crystal.position.clone(), t.color, 18);
            beep(660 + state.riverCollected * 25, 0.2);
            toast(
              state.riverCollected === riverside.treasures.length
                ? "✦ Your riverside collection is complete!"
                : `${t.name} found · ${state.riverCollected} / ${riverside.treasures.length}`,
            );
          }
        }
      }
    },
    animate(dt, time) {
      if (locations.state.insideCastle) return;
      riverside.update(time);
      cableCar.updateVisibility(camera, [hero], dt);
    },
    afterCamera(dt) {
      if (locations.area === "riverside" && !locations.state.insideCastle)
        riverside.updateVisibility(camera, [hero], dt);
    },
    progressLabel: () => (cableCar.riding ? "cable car" : "riverside"),

    id: "riverside",
    getHud: createRiversideHud(context),
    getGate: () =>
      !boatTrip.atLagoon && riverside.isExit(hero.position)
        ? { id: "garden" }
        : null,
    legacyFlag: "insideRiver",
    parent: "garden",
    resolve: () =>
      cableCar.atSummit ? "summit" : boatTrip.atLagoon ? "lagoon" : null,
    group: riverside.group,
    terrain: riverside,
    activateEnter: () => changePassage(true, true),
    canEnter: ({ from }) => from === "garden",
    activateExit: () => changePassage(false, true),
    objective: riverObjective,
    cameraTarget: () => (boatTrip.rowing ? 1 : 9),
    reset: () => {
      riverside.reset();
      cableCar.reset();
      boatTrip.reset(true);
    },
    controls: {
      boardBoat,
      boardCableCar,
      usePassage,
      changePassage,
      riverObjective,
    },
  };
}
