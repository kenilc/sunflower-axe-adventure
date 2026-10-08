// A click throws; a deliberate drag rotates without throwing an axe.
export function bindCameraDrag(canvas, { rotate, throwAxe, paused }) {
  let gesture = null;
  function reset() {
    const pointerId = gesture?.id;
    gesture = null;
    if (pointerId !== undefined && canvas.hasPointerCapture(pointerId))
      canvas.releasePointerCapture(pointerId);
  }
  canvas.addEventListener("pointerdown", (event) => {
    if (gesture || paused() || ![0, 2].includes(event.button)) return;
    gesture = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      dragging: false,
      canThrow: event.button === 0 && event.pointerType !== "touch",
    };
    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!gesture || gesture.id !== event.pointerId) return;
    if (paused()) {
      reset();
      return;
    }
    if (
      Math.hypot(
        event.clientX - gesture.startX,
        event.clientY - gesture.startY,
      ) > 6
    )
      gesture.dragging = true;
    if (gesture.dragging) {
      rotate(event.clientX - gesture.x, event.clientY - gesture.y);
      gesture.x = event.clientX;
      gesture.y = event.clientY;
    }
    event.preventDefault();
  });
  canvas.addEventListener("pointerup", (event) => {
    if (!gesture || gesture.id !== event.pointerId) return;
    // Also reject a drag if the browser coalesced its move events.
    const moved =
      Math.hypot(
        event.clientX - gesture.startX,
        event.clientY - gesture.startY,
      ) > 6;
    const clicked =
      gesture.canThrow && !gesture.dragging && !moved && !paused();
    reset();
    if (clicked) throwAxe();
  });
  canvas.addEventListener("pointercancel", (event) => {
    if (gesture?.id === event.pointerId) reset();
  });
  canvas.addEventListener("lostpointercapture", (event) => {
    if (gesture?.id === event.pointerId) gesture = null;
  });
  return { reset };
}
