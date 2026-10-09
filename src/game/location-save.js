import { resolveObstacleCollisions } from "../systems/collision.js";

export const LOCATION_SAVE_KEY = "sunflower-location-v1";

export function createLocationSave({
  places,
  locations,
  transitions,
  hero,
  companion,
  state,
  camera,
  canSave,
  resetCamera,
  storage = () => globalThis.localStorage,
}) {
  let checkpoint = null,
    written = null,
    elapsed = 0;

  function valid(save) {
    if (
      save?.version !== 1 ||
      !places.has(save.place) ||
      !Array.isArray(save.position) ||
      save.position.length !== 2 ||
      !save.position.every(Number.isFinite) ||
      !Number.isFinite(save.heading) ||
      ![
        save.view?.yaw,
        save.view?.pitch,
        save.view?.zoom,
        save.view?.fov,
      ].every(Number.isFinite)
    )
      return false;
    const terrain = places.get(save.place).terrain;
    return (
      terrain.contains(...save.position) &&
      Number.isFinite(terrain.heightAt(...save.position)) &&
      Math.abs(save.heading) <= 1e6 &&
      Math.abs(save.view.yaw) <= 1e6 &&
      save.view.pitch >= 0 &&
      save.view.pitch <= Math.PI / 2 &&
      save.view.zoom >= 10 &&
      save.view.zoom <= 100 &&
      save.view.fov >= 10 &&
      save.view.fov <= 100
    );
  }

  function capture() {
    if (!canSave()) return;
    const next = {
      version: 1,
      place: locations.current,
      position: [hero.position.x, hero.position.z],
      heading: hero.rotation.y,
      view: {
        yaw: state.yaw,
        pitch: state.pitch,
        zoom: state.zoom,
        fov: camera.fov,
      },
    };
    if (valid(next)) checkpoint = next;
  }

  function persist() {
    if (!checkpoint) return;
    const serialized = JSON.stringify(checkpoint);
    if (serialized === written) return;
    try {
      storage().setItem(LOCATION_SAVE_KEY, serialized);
      written = serialized;
    } catch {
      // Storage may be disabled or full; the adventure can still be played.
    }
  }

  return {
    restore() {
      let save;
      try {
        save = JSON.parse(storage().getItem(LOCATION_SAVE_KEY));
        if (!valid(save)) return false;
      } catch {
        return false;
      }
      if (!transitions.restore(save.place)) return false;
      const place = locations.active,
        terrain = place.terrain,
        previous = hero.position.clone();
      const [x, z] = save.position;
      hero.position.set(x, terrain.heightAt(x, z), z);
      // Obstacles can change between visits (for example, rebuilt targets).
      resolveObstacleCollisions(
        hero.position,
        previous,
        terrain.blockers ?? [],
      );
      terrain.constrain?.(hero.position, previous);
      if (!terrain.contains(hero.position.x, hero.position.z))
        hero.position.copy(previous);
      hero.position.y = terrain.heightAt(hero.position.x, hero.position.z);
      hero.rotation.set(0, save.heading, 0);
      Object.assign(state, {
        yaw: save.view.yaw,
        pitch: save.view.pitch,
        zoom: save.view.zoom,
      });
      camera.fov = save.view.fov;
      companion.reset(
        hero.position,
        place.companionObstacles ?? terrain.blockers ?? [],
        place.companionTerrain ?? terrain,
      );
      state.passageCooldown = 1;
      resetCamera();
      capture();
      return true;
    },
    update(dt) {
      const previousPlace = checkpoint?.place;
      capture();
      elapsed += dt;
      if (checkpoint?.place !== previousPlace || elapsed >= 1) {
        elapsed = 0;
        persist();
      }
    },
    flush() {
      capture();
      persist();
      elapsed = 0;
    },
  };
}
