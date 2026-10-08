import * as THREE from "three";
import { bindCameraDrag } from "../rendering/camera-drag.js";

export function bindGameInput({
  $,
  canvas,
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
  rotate,
  zoomBy,
  toggleSound,
}) {
  addEventListener("keydown", (e) => {
    if (
      ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
        e.code,
      )
    )
      e.preventDefault();
    if (passageTransition.active) return;
    keys[e.code] = true;
    if (
      e.code === "KeyB" &&
      !e.repeat &&
      !$("#guide").open &&
      !locations.state.insideCave &&
      !locations.state.insideRiver &&
      !locations.state.insideFestival &&
      !locations.state.insideFunfair &&
      !locations.state.insideVillage
    ) {
      if (benchMoment.seated) benchMoment.stand();
      else benchMoment.sit();
    }
    if (e.code === "KeyT" && !e.repeat) boardBoat();
    if (e.code === "KeyC" && !e.repeat) boardCableCar();
    if (e.code === "KeyX" && !e.repeat) {
      if (locations.state.insideFestival) interactFestival();
      else if (locations.state.insideVillage) interactVillage();
      else if (locations.state.insideFunfair) interactFunfair();
      else interactCastle();
    }
    if (
      locations.state.insideFunfair &&
      funfairActivities.playing &&
      !$("#guide").open
    ) {
      if (e.code === "Escape") leaveRingToss();
      if (e.code === "Space" && !e.repeat) interactFunfair();
    } else if (e.code === "Space") fire();
  });
  addEventListener("keyup", (e) => (keys[e.code] = false));
  addEventListener("blur", () => {
    cameraDrag.reset();
    Object.keys(keys).forEach((k) => (keys[k] = false));
    joy.set(0, 0);
  });
  const cameraDrag = bindCameraDrag(canvas, {
    rotate,
    throwAxe: () => (funfairActivities.playing ? interactFunfair() : fire()),
    paused: () => $("#guide").open || passageTransition.active,
  });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener(
    "wheel",
    (e) => {
      if (
        festivalMoment.active ||
        funfairActivities.playing ||
        alpineCart.riding
      ) {
        e.preventDefault();
        return;
      }
      zoomBy(e.deltaY);
      e.preventDefault();
    },
    { passive: false },
  );
  $("#help").onclick = () => {
    cameraDrag.reset();
    $("#guide").showModal();
    Object.keys(keys).forEach((k) => (keys[k] = false));
  };
  $("#close").onclick = () => $("#guide").close();
  $("#sound").onclick = toggleSound;
  $("#throw").onpointerdown = (e) => {
    e.preventDefault();
    fire();
  };
  const joy = new THREE.Vector2();
  let stickId = null;
  $("#stick").onpointerdown = (e) => {
    stickId = e.pointerId;
    $("#stick").setPointerCapture(stickId);
    stickMove(e);
  };
  function stickMove(e) {
    if (e.pointerId !== stickId) return;
    const r = $("#stick").getBoundingClientRect();
    joy.set((e.clientX - r.left - 55) / 40, (e.clientY - r.top - 55) / 40);
    if (joy.length() > 1) joy.normalize();
    $("#knob").style.transform = `translate(${joy.x * 33}px,${joy.y * 33}px)`;
  }
  $("#stick").onpointermove = stickMove;
  $("#stick").onpointerup = $("#stick").onpointercancel = () => {
    stickId = null;
    joy.set(0, 0);
    $("#knob").style.transform = "";
  };
  return { joy, cameraDrag };
}
