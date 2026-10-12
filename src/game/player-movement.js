import * as THREE from "three";
import { resolveObstacleCollisions } from "../systems/collision.js";

// One frame of walking: input to movement, collisions and terrain, the
// companion following, the walking pose, axes in flight, place hooks and
// gates. createGame calls it when nothing else is driving the heroine.
export function createPlayerMovement({
  hero,
  body,
  legs,
  arms,
  companion,
  hearts,
  benchMoment,
  keys,
  joy,
  state,
  effects,
  companionReactions,
  places,
  locations,
  getTransitions,
}) {
  return function walk(dt, time, rootPlace, activePlace) {
    const transitions = getTransitions();
    let dx =
        (keys.KeyD || keys.ArrowRight ? 1 : 0) -
        (keys.KeyA || keys.ArrowLeft ? 1 : 0) +
        joy.x,
      dz =
        (keys.KeyS || keys.ArrowDown ? 1 : 0) -
        (keys.KeyW || keys.ArrowUp ? 1 : 0) +
        joy.y;
    let movement = new THREE.Vector3(dx, 0, dz);
    if (benchMoment.seated) movement.set(0, 0, 0);
    if (movement.length() > 1) movement.normalize();
    movement.applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);
    const speed = keys.ShiftLeft || keys.ShiftRight ? 7.8 : 4.7;
    const old = hero.position.clone();
    hero.position.addScaledVector(movement, dt * speed);
    const place = locations.active;
    const movementObstacles = benchMoment.seated
      ? []
      : (place.terrain.blockers ?? []);
    resolveObstacleCollisions(hero.position, old, movementObstacles);
    if (place.constrainMovement)
      place.constrainMovement(hero.position, old, {
        seated: benchMoment.seated,
      });
    else {
      place.terrain.constrain?.(hero.position, old);
      if (!place.terrain.contains(hero.position.x, hero.position.z))
        hero.position.copy(old);
      hero.position.y = place.terrain.heightAt(
        hero.position.x,
        hero.position.z,
      );
    }
    if (!benchMoment.seated) {
      place.beforeCompanion?.(old);
      const playerBump = companion.blocksPlayer(hero.position, old);
      const companionBump = companion.update(
        dt,
        place.companionObstacles ?? place.terrain.blockers ?? [],
        hero.position,
        place.companionTerrain ?? place.terrain,
      );
      hearts.contact(
        playerBump || companionBump,
        hero.position,
        companion.character.position,
      );
    }
    state.isMoving = movement.length() > 0.05;
    if (!benchMoment.seated && state.isMoving) {
      state.walk += dt * speed * 2;
      body.position.y = Math.abs(Math.sin(state.walk)) * 0.055;
      legs[0].rotation.x = Math.sin(state.walk) * 0.5;
      legs[1].rotation.x = -Math.sin(state.walk) * 0.5;
      const facing = hero.position.clone().sub(old).setY(0);
      // Restored quaternions can have equivalent nonzero X/Z Euler angles.
      // Set the whole upright rotation so the model faces its travel path.
      if (facing.lengthSq() > 0.000001)
        hero.rotation.set(0, Math.atan2(facing.x, facing.z), 0);
    } else if (!benchMoment.seated) {
      legs.forEach((l) => (l.rotation.x *= 0.8));
      body.position.y = Math.sin(time * 2) * 0.018;
    }
    if (!benchMoment.seated) {
      arms[1].rotation.x =
        state.throwAnim > 0
          ? -Math.sin((state.throwAnim / 0.3) * Math.PI) * 2
          : Math.sin(state.walk) * 0.12;
      arms[0].rotation.x = -legs[0].rotation.x * 0.5;
    }
    effects.updateProjectiles(
      dt,
      locations.active.targets ?? [],
      locations.active.onTargetHit,
    );
    if (activePlace === rootPlace || activePlace.kind === "context")
      rootPlace.afterMovement?.(dt, time);
    if (activePlace !== rootPlace) activePlace.afterMovement?.(dt, time);
    if (!benchMoment.seated)
      companionReactions.update(dt, locations.current, hero.position);
    if (state.passageCooldown === 0) {
      const gate =
        locations.active.getGate?.() ??
        places.incomingGate(locations.current, hero.position);
      if (gate) transitions.go(gate.id, gate.options);
    }
  };
}
