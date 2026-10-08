export function createGameLoop(
  update,
  {
    requestFrame = requestAnimationFrame,
    cancelFrame = cancelAnimationFrame,
  } = {},
) {
  let running = false;
  let frameId;
  function tick() {
    if (!running) return;
    frameId = requestFrame(tick);
    update();
  }
  return {
    start() {
      if (running) return;
      running = true;
      tick();
    },
    stop() {
      running = false;
      if (frameId !== undefined) cancelFrame(frameId);
      frameId = undefined;
    },
    get running() {
      return running;
    },
  };
}
