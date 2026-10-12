import { resolveObstacleCollisions } from "../../systems/collision.js";
import { CAVE_ENVIRONMENT } from "../riverside/place.js";

export function createCavePlace(context) {
  const { cave, changePassage, hero } = context;
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
