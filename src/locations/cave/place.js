import { resolveObstacleCollisions } from "../../systems/collision.js";
import { createCave } from "./world.js";
import { CAVE_ENVIRONMENT } from "../riverside/place.js";

export function createCavePlace(context) {
  const { hero, garden, scene, box, pathMat } = context;
  const cave = createCave();
  garden.add(cave.entrance);
  scene.add(cave.interior);
  context.addGardenBlockers(
    { x: -4, z: -43, r: 2.5, minClearance: 0.8 },
    { x: 4, z: -43, r: 2.5, minClearance: 0.8 },
  );
  garden.add(box(4, 0.04, 10, pathMat, 0, 0.025, -39));
  // The riverside place runs the shared garden passage for both places.
  const changePassage = (enter) =>
    context.places.get("riverside").controls.changePassage(enter);
  return {
    id: "cave",
    soundscape: "cave",
    getHud: () => ({ countsId: "gardenCounts", region: "The Golden Grotto" }),
    parent: "garden",
    group: cave.interior,
    terrain: cave,
    legacyFlag: "insideCave",
    settings: { environment: CAVE_ENVIRONMENT },
    progressLabel: "treasure cave",
    lateAnimate: (time) => cave.update(time),
    activateEnter: () => changePassage(true),
    activateExit: () => changePassage(false),
    constrainMovement(position, previous) {
      cave.constrain(position);
      resolveObstacleCollisions(position, previous, cave.blockers);
      if (Math.hypot(position.x, position.z) > 16) position.copy(previous);
      position.y = cave.heightAt(position.x, position.z);
    },
    getGate: () => (cave.isExit(hero.position) ? { id: "garden" } : null),
  };
}
