const HOLD_DELAY = 450;
const DRAG_THRESHOLD = 6;

export function bindPhotoGestures(canvas, { mode, paused, changed }) {
  const pointers = new Map();
  let gesture = null,
    pinching = false,
    holdTimer = null;
  const bounds = () => canvas.getBoundingClientRect();
  function cancelHold() {
    if (holdTimer !== null) clearTimeout(holdTimer);
    holdTimer = null;
  }
  function reset() {
    cancelHold();
    const ids = [...pointers.keys()];
    pointers.clear();
    gesture = null;
    pinching = false;
    for (const id of ids)
      if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    changed({ moving: false });
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
      cancelHold();
      gesture = pinch();
      pinching = true;
      changed({ moving: false });
    } else {
      mode.selectAt(event.clientX, event.clientY, bounds());
      const point = mode.groundPoint(event.clientX, event.clientY, bounds());
      gesture = {
        x: event.clientX,
        y: event.clientY,
        startX: event.clientX,
        startY: event.clientY,
        dragging: false,
        moving: Boolean(event.shiftKey),
        offset: point ? mode.selectedPosition.sub(point) : null,
      };
      if (mode.selectedActor !== null && !gesture.moving) {
        const heldGesture = gesture,
          actor = mode.selectedActor;
        holdTimer = setTimeout(() => {
          holdTimer = null;
          if (
            !mode.active ||
            paused() ||
            pointers.size !== 1 ||
            gesture !== heldGesture ||
            gesture.dragging ||
            mode.selectedActor !== actor
          )
            return;
          gesture.moving = true;
          changed({ moving: true });
          try {
            globalThis.navigator?.vibrate?.(12);
          } catch {}
        }, HOLD_DELAY);
      }
      changed({ moving: gesture.moving });
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
      if (
        Math.hypot(next.x - gesture.startX, next.y - gesture.startY) >
        DRAG_THRESHOLD
      ) {
        gesture.dragging = true;
        cancelHold();
      }
      if (!gesture.dragging) return;
      const dx = next.x - gesture.x,
        dy = next.y - gesture.y;
      if (mode.selectedActor !== null) {
        if (gesture.moving) {
          const point = mode.groundPoint(next.x, next.y, bounds());
          if (point && gesture.offset)
            mode.moveSelected(point.add(gesture.offset));
          else mode.moveSelectedByScreen(dx, dy, bounds().height);
        } else mode.turnSelected(dx);
      } else if (gesture.moving) mode.pan(dx, dy, bounds().height);
      else mode.rotate(dx, dy);
      gesture.x = next.x;
      gesture.y = next.y;
    }
    changed({ moving: !pinching && gesture?.moving === true });
    event.preventDefault();
  });
  function release(event) {
    if (!pointers.has(event.pointerId)) return;
    cancelHold();
    pointers.delete(event.pointerId);
    if (canvas.hasPointerCapture(event.pointerId))
      canvas.releasePointerCapture(event.pointerId);
    // After a pinch, wait for both fingers to lift before beginning another drag.
    if (!pointers.size) {
      gesture = null;
      pinching = false;
    }
    changed({ moving: false });
  }
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", reset);
  canvas.addEventListener("lostpointercapture", release);
  canvas.addEventListener(
    "wheel",
    (event) => {
      if (!mode.active || paused()) return;
      mode.zoomBy(event.deltaY);
      changed({ moving: gesture?.moving === true });
      event.preventDefault();
    },
    { passive: false },
  );
  addEventListener("blur", reset);
  return { reset };
}
