import { createFunfairHud } from "./hud.js";
import * as THREE from "three";

export function createFunfairPlace(context) {
  const {
    locations,
    funfairActivities,
    passageTransition,
    hero,
    funfair,
    companion,
    clearRestInput,
    benchMoment,
    hearts,
    state,
    $,
    garden,
    held,
    companionObstacles,
    gardenTerrain,
    scene,
    effects,
    camera,
    cameraTargetHeight,
    toast,
    beep,
  } = context;
  function useFunfairPassage(enter, activity = null) {
    if (
      enter === locations.state.insideFunfair ||
      !["garden", "funfair"].includes(locations.area)
    )
      return false;
    return context.transitions.go(enter ? "funfair" : "garden", { activity });
  }

  function changeFunfairPassage(enter) {
    if (enter === locations.state.insideFunfair) return;
    benchMoment.stand();
    funfairActivities.reset();
    hearts.clear();
    if (enter) {
      state.outsideView = {
        yaw: state.yaw,
        pitch: state.pitch,
        zoom: state.zoom,
        instructions: $(".instructions").innerHTML,
      };
      state.outsideObjective = $("#objective").textContent;
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
      state.yaw = 0;
      state.pitch = THREE.MathUtils.degToRad(30);
      state.zoom = 42;
    } else if (state.outsideView)
      ({
        yaw: state.yaw,
        pitch: state.pitch,
        zoom: state.zoom,
      } = state.outsideView);
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
      : state.outsideObjective;
    $("#caveHint").textContent = enter
      ? "Ferris wheel: northwest. Carousel: northeast. Ring toss: southeast. Return gate: south."
      : "Swiss village: south path. Funfair gate: east. River gate: west. Treasure cave: north. Lake & bench: southeast.";
    $(".instructions").innerHTML = enter
      ? "<kbd>W A S D</kbd> move <kbd>X</kbd> ride / play <kbd>DRAG / Q E</kbd> rotate <kbd>R / F</kbd> view"
      : state.outsideView?.instructions;
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

  function leaveRingToss() {
    if (
      !locations.state.insideFunfair ||
      $("#guide").open ||
      passageTransition.active
    )
      return;
    if (funfairActivities.leaveToss()) clearRestInput();
  }
  return {
    update(dt, time) {
      const wasPlaying = funfairActivities.playing;
      funfairActivities.update(dt, time);
      if (wasPlaying && !funfairActivities.playing) clearRestInput();
      return funfairActivities.riding || funfairActivities.playing;
    },
    animateBackground(time) {
      if (locations.area !== "funfair") funfair.update(time);
    },
    getRenderView: () =>
      funfairActivities.playing
        ? { scene: funfair.tossScene, camera: funfair.tossCamera }
        : null,
    blockPointerRepeat: () => funfairActivities.playing,
    progressLabel: "sunflower funfair",

    exit() {
      funfairActivities.reset();
    },
    id: "funfair",
    pointerAction: () =>
      funfairActivities.playing ? interactFunfair() : context.fire(),
    cameraLocked: () => funfairActivities.playing,
    getHud: createFunfairHud(context),
    getGate() {
      if (
        !funfairActivities.riding &&
        !funfairActivities.playing &&
        context.festival.isEntrance(hero.position)
      )
        return { id: "festival" };
      return funfair.isExit(hero.position) ? { id: "garden" } : null;
    },
    legacyFlag: "insideFunfair",
    parent: "garden",
    group: funfair.group,
    terrain: funfair,
    activateEnter(options = {}) {
      changeFunfairPassage(true);
      if (options.activity === "ring-toss") {
        hero.position.copy(funfair.tossSpot);
        companion.reset(hero.position, funfair.blockers, funfair);
        funfairActivities.interact();
      }
    },
    canEnter: ({ from }) => from === "garden" && !funfairActivities.riding,
    canLeave: () => !funfairActivities.riding,
    activateExit: () => changeFunfairPassage(false),
    interact: interactFunfair,
    cameraTarget: () => (funfairActivities.riding ? 2 : 8),
    maxZoom: 50,
    canThrow: false,
    reset: () => funfairActivities.reset(true),
    controls: {
      useFunfairPassage,
      changeFunfairPassage,
      interactFunfair,
      leaveRingToss,
    },
  };
}
