import * as THREE from "three";
import { resolveObstacleCollisions } from "../../systems/collision.js";
import { inLake } from "./lakeside.js";
import { createGardenHud } from "./hud.js";

export function createGardenPlace(context) {
  const {
    garden,
    gardenTerrain,
    blockers,
    companionObstacles,
    treeVisibility,
    lakeside,
    gems,
    targets,
    shrine,
    relic,
    ring,
    hero,
    companion,
    scene,
    state,
    burst,
    beep,
    toast,
    $,
    camera,
  } = context;
  return {
    id: "garden",
    group: garden,
    terrain: {
      ...gardenTerrain,
      blockers,
      contains: (x, z) => Math.hypot(x, z) <= 49 && !inLake(x, z, 0.4),
    },
    companionObstacles,
    companionTerrain: gardenTerrain,
    getHud: createGardenHud(context),
    progressLabel: "garden",
    initiallyVisible: true,
    constrainMovement(position, previous, { seated }) {
      // The bench animation owns the seated pose, including its position.
      if (seated) return;
      if (position.length() > 49) position.setLength(49);
      resolveObstacleCollisions(position, previous, blockers);
      if (position.length() > 49 || inLake(position.x, position.z, 0.4))
        position.copy(previous);
    },
    getGate() {
      for (const [id, world] of [
        ["village", context.village],
        ["funfair", context.funfair],
        ["riverside", context.riverside],
        ["cave", context.cave],
      ])
        if (world.isEntrance(hero.position)) return { id };
      return null;
    },
    targets,
    onTargetHit(target) {
      state.score++;
      $("#targets").textContent = state.score;
      burst(target.pos, "#dab56c", 22);
      beep(130, 0.2);
      toast(
        state.score === 12
          ? "All targets cleared. Nicely thrown!"
          : `Target down · ${state.score} / 12`,
      );
    },
    afterMovement() {
      for (const g of gems) {
        if (!g.got && g.g.position.distanceTo(hero.position) < 1.35) {
          g.got = true;
          g.g.visible = false;
          state.collected++;
          $("#gems").textContent = state.collected;
          burst(
            g.g.position.clone().add(new THREE.Vector3(0, 1, 0)),
            "#ffe392",
            22,
          );
          beep(880, 0.3);
          toast(`Sunstone found · ${state.collected} / 8`);
        }
      }
      if (state.score === 12 && state.collected === 8 && !state.won) {
        $("#objective").textContent =
          "Return to the glowing shrine in the north.";
        if (hero.position.distanceTo(shrine.position) < 3.8) {
          state.won = true;
          $("#objective").textContent =
            "Garden restored. Keep wandering, adventurer.";
          toast("✦ Garden restored! Your adventure is complete.");
          burst(relic.getWorldPosition(new THREE.Vector3()), "#ffe890", 70);
          beep(1100, 0.8);
        }
      }
    },
    animateBackground(time) {
      lakeside.update(time);
      gems.forEach((gem) => {
        gem.crystal.rotation.y = time;
        gem.crystal.position.y =
          1 + Math.sin(time * 2 + gem.g.position.x) * 0.13;
      });
      relic.rotation.y = time * 0.5;
      relic.position.y = 2.8 + Math.sin(time) * 0.15;
      ring.rotation.y = time * 0.25;
      ring.rotation.z = 0.2;
    },
    afterCamera(dt) {
      if (context.locations.area === "garden")
        treeVisibility.update(camera, [hero, companion.character], dt);
    },
    reset() {
      state.score = state.collected = 0;
      state.won = false;
      targets.forEach((target) => {
        target.hit = false;
        target.blocker.active = true;
        target.g.visible = true;
      });
      gems.forEach((gem) => {
        gem.got = false;
        gem.g.visible = true;
      });
    },
  };
}
