import { createFestivalHud } from "./hud.js";
import * as THREE from "three";
import {
  createNightFestival,
  createSummerOutfits,
  createFestivalMoment,
} from "./world.js";
import { FUNFAIR_ENVIRONMENT } from "../funfair/place.js";

export const FESTIVAL_ENVIRONMENT = {
  background: "#132e59",
  fogDensity: 0.004,
  sunIntensity: 0.8,
  fillIntensity: 1.8,
  fillColor: "#b9d5ff",
  groundColor: "#586779",
};

export function createFestivalPlace(context) {
  const {
    locations,
    passageTransition,
    clearRestInput,
    hearts,
    state,
    alpineOutfits,
    companion,
    hero,
    environment,
    $,
    toast,
    heroRig,
    camera,
    scene,
  } = context;
  const { mesh, box, cyl, ball } = context.helpers;
  // The funfair registers first; the festival lives behind its north gate.
  const { funfairActivities } = context.places.get("funfair").parts;
  const funfair = context.places.get("funfair").terrain;
  const festival = createNightFestival({ mesh, box, cyl, ball });
  scene.add(festival.group);
  funfair.group.add(festival.entrance);
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
  function useFestivalPassage(enter) {
    if (enter === locations.state.insideFestival) return false;
    return context.transitions.go(enter ? "festival" : "funfair");
  }

  function changeFestivalPassage(enter) {
    if (enter === locations.state.insideFestival) return;
    festivalMoment.stop();
    hearts.clear();
    if (enter) {
      funfairActivities.reset();
      state.festivalView = {
        yaw: state.yaw,
        pitch: state.pitch,
        zoom: state.zoom,
      };
      alpineOutfits.reset();
    }
    locations.setArea(enter ? "festival" : "funfair");
    festival.group.visible = enter;
    funfair.group.visible = !enter;
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
      state.yaw = 0;
      state.pitch = THREE.MathUtils.degToRad(27);
      state.zoom = 30;
      state.festivalBridgeSeen = false;
    } else if (state.festivalView)
      ({
        yaw: state.yaw,
        pitch: state.pitch,
        zoom: state.zoom,
      } = state.festivalView);
    environment.apply(enter ? FESTIVAL_ENVIRONMENT : FUNFAIR_ENVIRONMENT);
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
    state.passageCooldown = 1;
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
      state.festivalBridgeSeen = true;
      festivalMoment.start();
      clearRestInput();
      toast("Together under the summer sky ♥");
    }
  }
  $("#festivalAction").onclick = interactFestival;
  return {
    update(dt) {
      festival.update(dt);
      festivalMoment.update(dt);
      return festivalMoment.active;
    },
    afterMovement() {
      if (!state.festivalBridgeSeen && festival.nearBridge(hero.position))
        interactFestival();
    },
    updateCamera() {
      if (!festivalMoment.active) return false;
      festivalMoment.updateCamera();
      return true;
    },
    progressLabel: "japanese night festival",

    exit() {
      festivalMoment.stop();
      summerOutfits.set(false);
    },
    id: "festival",
    soundscape: "festival",
    cameraLocked: () => festivalMoment.active,
    getHud: createFestivalHud({
      hero,
      festival,
      moment: festivalMoment,
      interact: interactFestival,
    }),
    getGate: () => (festival.isExit(hero.position) ? { id: "funfair" } : null),
    legacyFlag: "insideFestival",
    settings: { environment: FESTIVAL_ENVIRONMENT },
    parent: "funfair",
    group: festival.group,
    terrain: festival,
    parts: { festivalMoment, summerOutfits },
    activateEnter(options = {}) {
      changeFestivalPassage(true);
      if (options.activity === "fireworks") {
        hero.position.set(0, festival.heightAt(0, -6), -6);
        interactFestival();
      }
    },
    canEnter: ({ from }) => from === "funfair" && !festivalMoment.active,
    canLeave: () => !festivalMoment.active,
    activateExit: () => changeFestivalPassage(false),
    interact: interactFestival,
    cameraTarget: () => 3,
    maxZoom: 44,
    canThrow: false,
    reset: () => festivalMoment.stop(),
    controls: { useFestivalPassage, changeFestivalPassage, interactFestival },
  };
}
