import * as THREE from "three";

// The exploration camera that orbits and follows the heroine, using the
// yaw, pitch and zoom kept in the game state.
export function createFollowCamera({ camera, hero, state, locations }) {
  const desired = new THREE.Vector3();
  const targetHeight = () => locations.active.cameraTarget();
  function orbitPosition() {
    const distance =
      locations.active.cameraDistance?.(state.zoom) ?? state.zoom;
    return desired
      .set(
        Math.sin(state.yaw) * Math.cos(state.pitch) * distance,
        1 + Math.sin(state.pitch) * distance,
        Math.cos(state.yaw) * Math.cos(state.pitch) * distance,
      )
      .add(hero.position);
  }
  function lookAtHero() {
    camera.lookAt(
      hero.position.x,
      hero.position.y + targetHeight(),
      hero.position.z,
    );
  }
  return {
    targetHeight,
    // Q / E turn, R / F tilt.
    rotateFromKeys(dt, keys) {
      state.yaw += ((keys.KeyQ ? 1 : 0) - (keys.KeyE ? 1 : 0)) * dt * 1.4;
      state.pitch = THREE.MathUtils.clamp(
        state.pitch + ((keys.KeyR ? 1 : 0) - (keys.KeyF ? 1 : 0)) * dt * 0.65,
        THREE.MathUtils.degToRad(6),
        THREE.MathUtils.degToRad(70),
      );
    },
    // Jump straight to the orbit position.
    reset() {
      camera.position.copy(orbitPosition());
      lookAtHero();
      camera.updateProjectionMatrix();
    },
    // Ease toward the orbit position.
    update(dt) {
      camera.position.lerp(orbitPosition(), 1 - Math.exp(-dt * 5));
      lookAtHero();
    },
  };
}
