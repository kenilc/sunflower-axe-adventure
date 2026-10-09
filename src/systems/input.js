import * as THREE from "three";
import { bindCameraDrag } from "../rendering/camera-drag.js";

export function bindGameInput({
  $,
  canvas,
  keys,
  passageTransition,
  invokeShortcut,
  pointerAction,
  repeatAllowed,
  cameraLocked,
  rotate,
  zoomBy,
  toggleSound,
  handleKeydown = () => false,
  extraPaused = () => false,
}) {
  const paused = () =>
    extraPaused() ||
    $("#guide").open ||
    !$("#sheepPhoto").hidden ||
    passageTransition.active;
  addEventListener("keydown", (event) => {
    if (handleKeydown(event)) return;
    if (
      ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
        event.code,
      )
    )
      event.preventDefault();
    if (passageTransition.active) return;
    keys[event.code] = true;
    if (paused()) return;
    if (event.code === "Space") {
      if (!event.repeat || repeatAllowed()) pointerAction();
    } else if (!event.repeat) invokeShortcut(event.code);
  });
  addEventListener("keyup", (event) => (keys[event.code] = false));
  const joy = new THREE.Vector2();
  const cameraDrag = bindCameraDrag(canvas, {
    rotate,
    throwAxe: pointerAction,
    paused,
  });
  addEventListener("blur", () => {
    cameraDrag.reset();
    Object.keys(keys).forEach((key) => (keys[key] = false));
    joy.set(0, 0);
  });
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  canvas.addEventListener(
    "wheel",
    (event) => {
      if (!cameraLocked()) zoomBy(event.deltaY);
      event.preventDefault();
    },
    { passive: false },
  );
  $("#help").onclick = () => {
    cameraDrag.reset();
    $("#guide").showModal();
    Object.keys(keys).forEach((key) => (keys[key] = false));
  };
  $("#close").onclick = () => $("#guide").close();
  $("#sound").onclick = toggleSound;
  $("#throw").onpointerdown = (event) => {
    event.preventDefault();
    pointerAction();
  };
  let stickId = null;
  function stickMove(event) {
    if (event.pointerId !== stickId) return;
    const bounds = $("#stick").getBoundingClientRect();
    joy.set(
      (event.clientX - bounds.left - 55) / 40,
      (event.clientY - bounds.top - 55) / 40,
    );
    if (joy.length() > 1) joy.normalize();
    $("#knob").style.transform = `translate(${joy.x * 33}px,${joy.y * 33}px)`;
  }
  $("#stick").onpointerdown = (event) => {
    stickId = event.pointerId;
    $("#stick").setPointerCapture(stickId);
    stickMove(event);
  };
  $("#stick").onpointermove = stickMove;
  $("#stick").onpointerup = $("#stick").onpointercancel = () => {
    stickId = null;
    joy.set(0, 0);
    $("#knob").style.transform = "";
  };
  return { joy, cameraDrag };
}
