export function bindPhotoGestures(canvas, { mode, paused, changed }) {
  const pointers = new Map();
  let gesture = null,
    pinching = false;
  const bounds = () => canvas.getBoundingClientRect();
  function reset() {
    const ids = [...pointers.keys()];
    pointers.clear();
    gesture = null;
    pinching = false;
    for (const id of ids)
      if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  }
  function pinch() {
    const [a, b] = [...pointers.values()];
    return {
      distance: Math.hypot(a.x - b.x, a.y - b.y),
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
    };
  }
  canvas.addEventListener("pointerdown", (event) => {
    if (!mode.active || paused() || event.button !== 0 || pointers.size >= 2)
      return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    canvas.setPointerCapture(event.pointerId);
    if (pointers.size === 2) {
      gesture = pinch();
      pinching = true;
    } else {
      mode.selectAt(event.clientX, event.clientY, bounds());
      const point = mode.groundPoint(event.clientX, event.clientY, bounds());
      gesture = {
        x: event.clientX,
        y: event.clientY,
        startX: event.clientX,
        startY: event.clientY,
        dragging: false,
        offset: point ? mode.selectedPosition.sub(point) : null,
      };
      changed();
    }
    event.preventDefault();
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!pointers.has(event.pointerId)) return;
    if (!mode.active || paused()) {
      reset();
      return;
    }
    const next = { x: event.clientX, y: event.clientY };
    pointers.set(event.pointerId, next);
    if (pointers.size === 2) {
      const current = pinch();
      if (current.distance > 8 && gesture.distance > 8)
        mode.zoomByScale(gesture.distance / current.distance);
      mode.pan(current.x - gesture.x, current.y - gesture.y, bounds().height);
      gesture = current;
    } else if (!pinching) {
      if (Math.hypot(next.x - gesture.startX, next.y - gesture.startY) > 4)
        gesture.dragging = true;
      if (!gesture.dragging) return;
      const dx = next.x - gesture.x,
        dy = next.y - gesture.y;
      if (mode.selectedActor !== null) {
        if (mode.manipulation === "move") {
          const point = mode.groundPoint(next.x, next.y, bounds());
          if (point && gesture.offset)
            mode.moveSelected(point.add(gesture.offset));
        } else mode.turnSelected(dx);
      } else if (mode.manipulation === "move")
        mode.pan(dx, dy, bounds().height);
      else mode.rotate(dx, dy);
      gesture.x = next.x;
      gesture.y = next.y;
    }
    changed();
    event.preventDefault();
  });
  function release(event) {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (canvas.hasPointerCapture(event.pointerId))
      canvas.releasePointerCapture(event.pointerId);
    // After a pinch, wait for both fingers to lift before beginning another drag.
    if (!pointers.size) {
      gesture = null;
      pinching = false;
    }
  }
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", () => reset());
  canvas.addEventListener("lostpointercapture", release);
  canvas.addEventListener(
    "wheel",
    (event) => {
      if (!mode.active || paused()) return;
      mode.zoomBy(event.deltaY);
      changed();
      event.preventDefault();
    },
    { passive: false },
  );
  addEventListener("blur", reset);
  return { reset };
}
