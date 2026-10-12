import { createCastleHud } from "./hud.js";
import * as THREE from "three";
import { createBedRest } from "./bed-rest.js";
import { createCastleRoom } from "./world.js";
import { LAGOON_ENVIRONMENT } from "../riverside/place.js";

// Warm, slightly lower light keeps the pale room from washing out.
export const CASTLE_ENVIRONMENT = {
  background: "#cab5b0",
  skyTop: null,
  fogDensity: 0.009,
  sunIntensity: 1.9,
  sunColor: "#ffdcae",
  fillIntensity: 1.25,
  fillColor: "#ffe8d2",
  groundColor: "#6b4f4a",
  exposure: 1.05,
};
export const CASTLE_NIGHT_ENVIRONMENT = {
  ...CASTLE_ENVIRONMENT,
  background: "#363440",
  fogDensity: 0.018,
  sunIntensity: 0.16,
  fillIntensity: 0.28,
  exposure: 1.2,
};

export function createCastlePlace(context) {
  const {
    locations,
    passageTransition,
    state,
    hearts,
    effects,
    $,
    companion,
    hero,
    camera,
    toast,
    clearRestInput,
    beep,
    burst,
    heroRig,
    scene,
    environment,
  } = context;
  const { mesh, box, cyl, ball } = context.helpers;
  const castleRoom = createCastleRoom({ mesh, box, cyl, ball });
  scene.add(castleRoom.group);
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
  // The riverside registers after the castle; use its transport when needed.
  const riversideParts = () => context.places.get("riverside").parts;
  function useCastlePassage(enter) {
    if (enter === locations.state.insideCastle) return false;
    return context.transitions.go(enter ? "castle" : "summit");
  }

  function changeCastlePassage(enter) {
    if (enter === locations.state.insideCastle) return;
    const { cableCar, boatTrip } = riversideParts();
    bedRest.stand(false);
    locations.setRoom(enter ? "castle" : null);
    state.castleActivityCooldown = 0;
    state.castleMusicSession++;
    hearts.clear();
    effects.clearProjectiles();
    if (enter)
      state.castleOutsideView = {
        yaw: state.yaw,
        pitch: state.pitch,
        zoom: state.zoom,
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
      state.yaw = 0;
      state.pitch = THREE.MathUtils.degToRad(28);
      state.zoom = 22;
      hero.rotation.y = Math.PI;
    } else {
      cableCar.summit.group.add(companion.character);
      hero.position.copy(cableCar.summit.castle.entrance);
      companion.reset(hero.position, cableCar.summit.blockers, cableCar.summit);
      if (state.castleOutsideView)
        ({
          yaw: state.yaw,
          pitch: state.pitch,
          zoom: state.zoom,
        } = state.castleOutsideView);
      hero.rotation.y = 0;
    }
    context.environment.apply(enter ? CASTLE_ENVIRONMENT : LAGOON_ENVIRONMENT);
    camera.position
      .set(
        Math.sin(state.yaw) * Math.cos(state.pitch) * state.zoom,
        1 + Math.sin(state.pitch) * state.zoom,
        Math.cos(state.yaw) * Math.cos(state.pitch) * state.zoom,
      )
      .add(hero.position);
    camera.lookAt(hero.position.x, hero.position.y + 1, hero.position.z);
    state.passageCooldown = 1;
    $("#lagoonCounts").hidden = enter;
    $(".instructions").innerHTML = enter
      ? "<kbd>W A S D</kbd> move <kbd>X</kbd> interact <kbd>DRAG / Q E</kbd> rotate <kbd>R / F</kbd> view up / down"
      : state.castleOutsideView?.instructions;
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

  function interactCastle() {
    if (
      !locations.state.insideCastle ||
      passageTransition.active ||
      $("#guide").open ||
      state.castleActivityCooldown > 0
    )
      return;
    if (bedRest.resting) {
      passageTransition.start(() => bedRest.stand());
      clearRestInput();
      return;
    }
    const action = castleRoom.interact(
      hero.position,
      context.clock.elapsedTime,
    );
    if (!action) return;
    state.castleActivityCooldown = action.kind === "piano" ? 3 : 0.8;
    toast(action.message);
    $("#objective").textContent = castleRoom.objective();
    if (action.kind === "bed") {
      passageTransition.start(() => bedRest.start());
      clearRestInput();
    } else if (action.kind === "piano") {
      const session = state.castleMusicSession;
      [523, 659, 784, 659, 587, 698, 880, 1047].forEach((note, i) =>
        setTimeout(() => {
          if (
            locations.state.insideCastle &&
            session === state.castleMusicSession &&
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
  $("#castleAction").onclick = interactCastle;
  return {
    moveInstead(dt) {
      if (!bedRest.resting) return false;
      bedRest.update(dt, camera);
      return true;
    },
    afterMovement() {
      {
        const star = castleRoom.collect(hero.position);
        if (star) {
          burst(star.g.position.clone(), "#ffe399", 12);
          beep(880, 0.2);
          toast(`Hidden star found · ${castleRoom.collected} / 6`);
          $("#castleStars").textContent = castleRoom.collected;
          $("#objective").textContent = castleRoom.objective();
        }
      }
    },
    animate(dt, time, paused) {
      castleRoom.update(time, camera, paused ? 0 : dt);
    },
    progressLabel: "castle great room",

    exit() {
      bedRest.stand(false);
      state.castleMusicSession++;
    },
    id: "castle",
    getHud: createCastleHud({
      bedRest,
      castleRoom,
      hero,
      state,
      interact: interactCastle,
    }),
    getGate: () => (castleRoom.isExit(hero.position) ? { id: "summit" } : null),
    legacyFlag: "insideCastle",
    settings: { environment: CASTLE_ENVIRONMENT },
    parent: "summit",
    kind: "room",
    group: castleRoom.group,
    terrain: castleRoom,
    parts: { castleRoom, bedRest },
    activateEnter: () => changeCastlePassage(true),
    canEnter: ({ from }) =>
      from === "summit" && !riversideParts().cableCar.riding,
    canLeave: () => !riversideParts().cableCar.riding,
    activateExit: () => changeCastlePassage(false),
    interact: interactCastle,
    cameraTarget: () => 1,
    canThrow: false,
    reset: () => castleRoom.reset(),
    controls: { useCastlePassage, changeCastlePassage, interactCastle },
  };
}
