export function createSceneTransition(onOpacity, duration = 0.36) {
  let action = null,
    elapsed = 0,
    switched = false;
  const half = duration / 2;
  function cancel() {
    action = null;
    elapsed = 0;
    switched = false;
    onOpacity(0);
  }
  return {
    get active() {
      return action !== null;
    },
    start(changeScene) {
      if (action) return false;
      action = changeScene;
      elapsed = 0;
      switched = false;
      onOpacity(0);
      return true;
    },
    update(dt) {
      if (!action) return;
      elapsed += dt;
      if (!switched && elapsed >= half) {
        switched = true;
        onOpacity(1);
        action();
        // The scene change may itself cancel the transition.
        if (!action) return;
      }
      if (elapsed >= duration) {
        cancel();
        return;
      }
      const progress = switched ? (duration - elapsed) / half : elapsed / half;
      onOpacity(progress * progress * (3 - 2 * progress));
    },
    cancel,
  };
}
