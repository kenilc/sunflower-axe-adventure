import { createRiversideHud } from "./hud.js";
import * as THREE from "three";
import { createCableCar } from "./cable-car.js";
import { createBoatTrip } from "./boat-trip.js";
import { createRiverside } from "./world.js";

export const RIVERSIDE_ENVIRONMENT = {
  background: "#b6d9ce",
  skyTop: "#7db7d6",
  fogDensity: 0.011,
};
// The summit and castle grounds share the lagoon's sky.
export const LAGOON_ENVIRONMENT = {
  background: "#c0ded9",
  skyTop: "#88bfdc",
  fogDensity: 0.006,
};
export const CAVE_ENVIRONMENT = {
  background: "#17151c",
  skyTop: null,
  fogDensity: 0.026,
  sunIntensity: 0.45,
  fillIntensity: 0.7,
};

export function createRiversidePlace(context) {
  const {
    locations,
    $,
    passageTransition,
    hearts,
    effects,
    state,
    benchMoment,
    garden,
    companion,
    hero,
    companionObstacles,
    gardenTerrain,
    camera,
    cameraTargetHeight,
    toast,
    beep,
    burst,
    heroRig,
    scene,
    environment,
  } = context;
  const { mesh, box, cyl, ball } = context.helpers;
  const riverside = createRiverside({ mesh, box, cyl, ball });
  garden.add(riverside.entrance);
  scene.add(riverside.group);
  context.addGardenBlockers(
    { x: -32, z: -2, r: 0.45 },
    { x: -32, z: 2, r: 0.45 },
  );
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
  // The cave registers after this place, so look it up when needed.
  const caveWorld = () => context.places.get("cave").terrain;
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
    if (locations.state.insideCastle)
      context.places.get("castle").controls.changeCastlePassage(false);
    const leavingRiver = locations.state.insideRiver;
    cableCar.reset();
    boatTrip.reset();
    const cave = caveWorld();
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
    context.environment.apply(
      locations.state.insideCave
        ? CAVE_ENVIRONMENT
        : locations.state.insideRiver
          ? RIVERSIDE_ENVIRONMENT
          : undefined,
    );
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
  $("#cableAction").onclick = boardCableCar;
  $("#boatAction").onclick = boardBoat;
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
      cableCar.updateVisibility(
        camera,
        [hero],
        dt,
        context.shouldFadeScenery(),
      );
    },
    afterCamera(dt) {
      if (locations.area === "riverside" && !locations.state.insideCastle)
        riverside.updateVisibility(
          camera,
          [hero],
          dt,
          context.shouldFadeScenery(),
        );
    },
    progressLabel: () => (cableCar.riding ? "cable car" : "riverside"),

    id: "riverside",
    getHud: createRiversideHud({
      boatTrip,
      cableCar,
      riverside,
      hero,
      boardBoat,
      boardCableCar,
    }),
    getGate: () =>
      !boatTrip.atLagoon && riverside.isExit(hero.position)
        ? { id: "garden" }
        : null,
    legacyFlag: "insideRiver",
    settings: { environment: RIVERSIDE_ENVIRONMENT },
    parent: "garden",
    resolve: () =>
      cableCar.atSummit ? "summit" : boatTrip.atLagoon ? "lagoon" : null,
    group: riverside.group,
    terrain: riverside,
    fadingGates: [riverside.entrance, riverside.returnGate],
    fadingExtras: [boatTrip.boat, cableCar.group],
    photoVisibility(camera, actors, dt, enabled) {
      riverside.updateVisibility(camera, actors, dt, enabled);
      cableCar.updateVisibility(camera, actors, dt, enabled);
    },
    parts: { boatTrip, cableCar },
    activateEnter: () => changePassage(true, true),
    canEnter: ({ from }) => from === "garden",
    activateExit: () => changePassage(false, true),
    objective: riverObjective,
    cameraTarget() {
      if (boatTrip.rowing) return 1;
      // Give the summit room from the distant banks, but keep walking framed
      // around the characters when approaching the waterfall or facing away.
      const panorama =
        THREE.MathUtils.smoothstep(104 - hero.position.z, 60, 110) *
        THREE.MathUtils.smoothstep(-Math.cos(state.yaw), 0.3, 0.85);
      return THREE.MathUtils.lerp(2, 5.5, panorama);
    },
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
