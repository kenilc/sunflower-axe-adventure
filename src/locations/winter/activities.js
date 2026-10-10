import * as THREE from "three";
import { createMeshFactory } from "../../rendering/mesh-factory.js";
import { createSaunaOutfits } from "./sauna.js";
import {
  SNOWMAN_STEP_SECONDS,
  poseSnowmanBuilders,
} from "./snowman-building.js";

export const SNOWMAN_STEPS = [
  "Roll the base",
  "Add the middle",
  "Give it a face & scarf",
];
export const WINTER_LABELS = {
  snowman: "Our village snowman",
  skate: "Skating together",
  cocoa: "Warm cocoa for two",
  sauna: "Sauna warmth for two",
};

export function createWinterActivities(context, world) {
  const actors = [context.hero, context.companion.character];
  const rigs = [context.heroRig, context.companion.rig];
  const helpers = createMeshFactory(world.group);
  const saunaOutfits = createSaunaOutfits(rigs, helpers);
  const memories = new Set();
  let kind = null,
    elapsed = 0,
    building = false,
    stepElapsed = 0,
    pourElapsed = null,
    saved = [],
    releases = [];
  const mugs = rigs.map((rig, index) => {
    const mug = new THREE.Group();
    mug.name = "winter-cocoa-mug";
    rig.leftHand.add(mug);
    helpers.cyl(
      0.16,
      0.13,
      0.3,
      index ? "#7ba4b5" : "#d69d7c",
      0,
      0.13,
      0,
      mug,
      12,
    );
    helpers.cyl(0.14, 0.14, 0.015, "#775441", 0, 0.285, 0, mug, 12);
    helpers.mesh(
      new THREE.TorusGeometry(0.1, 0.03, 6, 12),
      "#ede1ce",
      0.16,
      0.13,
      0,
      mug,
    );
    mug.position.set(0, 0.12, 0.1);
    mug.visible = false;
    return mug;
  });
  const skates = rigs.flatMap((rig) =>
    rig.feet.map((foot) => {
      const blade = new THREE.Group();
      blade.name = "winter-skate-blade";
      foot.add(blade);
      helpers.box(0.075, 0.09, 0.7, "#bcced7", 0, -0.18, 0.08, blade);
      for (const z of [-0.1, 0.25])
        helpers.box(0.08, 0.12, 0.08, "#788f9e", 0, -0.1, z, blade);
      blade.visible = false;
      return blade;
    }),
  );
  function capture(node) {
    return {
      node,
      position: node.position.clone(),
      quaternion: node.quaternion.clone(),
    };
  }
  function stop(notify = true) {
    if (!kind) return false;
    if (kind === "sauna") world.sauna.leave();
    kind = null;
    pourElapsed = null;
    building = false;
    stepElapsed = 0;
    saved.forEach(({ node, position, quaternion }) => {
      node.position.copy(position);
      node.quaternion.copy(quaternion);
    });
    saved = [];
    releases.forEach((release) => release());
    releases = [];
    rigs.forEach((rig) => rig.items.setHidden("winter-moment", false));
    [...mugs, ...skates].forEach((prop) => {
      prop.visible = false;
    });
    world.previewSnowman();
    context.clearRestInput();
    context.resetCamera();
    if (notify) context.toast("Back to our snowy village walk ♥");
    return true;
  }
  function poseSkating() {
    const angle = Math.PI / 2 + elapsed * 0.36;
    actors.forEach((actor, i) => {
      const rx = i ? 5.4 : 4.1,
        rz = i ? 6.8 : 5.4;
      actor.position.set(
        world.pond.center.x + Math.cos(angle) * rx,
        0.16,
        world.pond.center.z + Math.sin(angle) * rz,
      );
      actor.rotation.set(
        0,
        Math.atan2(-Math.sin(angle) * rx, Math.cos(angle) * rz),
        0,
      );
      rigs[i].body.rotation.z = -0.08;
      rigs[i].body.position.y = Math.sin(elapsed * 2 + i) * 0.025;
      rigs[i].legs.forEach((leg, j) => {
        leg.rotation.x = Math.sin(elapsed * 2 + j * Math.PI) * 0.22;
        leg.rotation.z = (j ? 1 : -1) * 0.06;
      });
      rigs[i].arms.forEach((arm, j) => {
        arm.rotation.set(-0.25, 0, j ? 0.35 : -0.35);
      });
    });
  }
  function start(next) {
    if (kind || world.nearby(context.hero.position) !== next) return false;
    context.companionReactions.cancel();
    kind = next;
    elapsed = 0;
    pourElapsed = null;
    stepElapsed = 0;
    building = kind === "snowman" && world.snowmanStage < 3;
    context.clearRestInput();
    saved = actors
      .map(capture)
      .concat(
        rigs.flatMap((rig) =>
          [rig.body, rig.head, ...rig.legs, ...rig.arms, ...rig.feet].map(
            capture,
          ),
        ),
      );
    rigs.forEach((rig) => {
      rig.items.setHidden("winter-moment", true);
      releases.push(rig.appearance.override({ expression: "happy" }));
      rig.body.position.set(0, 0, 0);
      rig.body.rotation.set(0, 0, 0);
      rig.head.rotation.set(0, 0, 0);
      [...rig.arms, ...rig.legs, ...rig.feet].forEach((limb) =>
        limb.rotation.set(0, 0, 0),
      );
    });
    if (kind === "skate") {
      skates.forEach((blade) => {
        blade.visible = true;
      });
      poseSkating();
      context.toast("Uisutama! ♥ Glide around the pond together · X to finish");
    } else if (kind === "cocoa") {
      actors.forEach((actor, i) => {
        actor.position
          .copy(world.cocoaSpot)
          .add(new THREE.Vector3(i ? 0.85 : -0.85, 0.32, 0.08));
        actor.rotation.set(0, 0, 0);
        rigs[i].legs.forEach((leg) => {
          leg.rotation.x = -1.25;
        });
        rigs[i].feet.forEach((foot) => {
          foot.rotation.x = 1.25;
        });
        rigs[i].leftArm.rotation.x = -0.9;
        rigs[i].rightArm.rotation.x = -0.2;
        mugs[i].visible = true;
      });
      memories.add("cocoa");
      context.toast(
        "Soe kakao ♥ Warm mugs, gingerbread at the café, and snow drifting past.",
      );
    } else if (kind === "sauna") {
      world.sauna.enter();
      releases.push(saunaOutfits.override());
      actors.forEach((actor, i) => {
        actor.position
          .copy(world.sauna.group.position)
          .add(new THREE.Vector3(i ? 1.15 : -0.55, 0.42, -1.55));
        actor.rotation.set(0, i ? -0.12 : 0.12, 0);
        rigs[i].legs.forEach((leg) => {
          leg.rotation.x = -1.25;
        });
        rigs[i].feet.forEach((foot) => {
          foot.rotation.x = 1.25;
        });
        rigs[i].arms.forEach((arm, j) => {
          arm.rotation.set(-0.65, 0, j ? 0.1 : -0.1);
        });
        releases.push(
          rigs[i].appearance.override({
            outfit: "sauna",
            accessories: {
              scarf: null,
              harness: null,
              headwear: null,
            },
          }),
        );
      });
      saunaOutfits.poseFeet();
      context.toast(
        "Saun ♥ Settle into the warmth · B adds water to the stones · X to step outside",
      );
    } else {
      actors.forEach((actor, i) => {
        actor.position
          .copy(world.snowman.position)
          .add(new THREE.Vector3(i ? 1.45 : -1.45, 0, 2.1));
        actor.rotation.set(0, i ? -Math.PI + 0.4 : Math.PI - 0.4, 0);
        rigs[i].body.rotation.x = building ? 0.2 : 0;
        rigs[i].arms.forEach((arm) => {
          arm.rotation.x = building ? -0.9 : -0.15;
        });
      });
      if (building) poseBuilding();
      context.toast(
        building
          ? `${SNOWMAN_STEPS[world.snowmanStage]} together ♥`
          : "Our lumememm ♥ A little friend for the village.",
      );
    }
    return true;
  }
  function poseBuilding() {
    const progress = stepElapsed / SNOWMAN_STEP_SECONDS;
    world.previewSnowman(progress);
    poseSnowmanBuilders({
      actors,
      rigs,
      center: world.snowman.position,
      stage: world.snowmanStage,
      progress,
    });
  }
  function poseSaunaPour(dt) {
    if (pourElapsed === null) return;
    const before = pourElapsed;
    pourElapsed += dt;
    if (before < 1.3 && pourElapsed >= 1.3) world.sauna.pourWater();
    const actor = actors[0],
      rig = rigs[0];
    const seat = world.sauna.group.position
      .clone()
      .add(new THREE.Vector3(-0.55, 0.42, -1.55));
    const byStove = world.sauna.group.position
      .clone()
      .add(new THREE.Vector3(-2.05, 0, 0.85));
    const going = THREE.MathUtils.smoothstep(pourElapsed, 0.15, 1);
    const returning = THREE.MathUtils.smoothstep(pourElapsed, 2.2, 3.3);
    actor.position.copy(seat).lerp(byStove, going * (1 - returning));
    const walking = (pourElapsed < 1 || pourElapsed > 2.2) && pourElapsed < 3.3;
    const bend =
      THREE.MathUtils.smoothstep(pourElapsed, 1, 1.3) *
      (1 - THREE.MathUtils.smoothstep(pourElapsed, 1.9, 2.2));
    actor.rotation.set(
      0,
      returning > 0
        ? Math.atan2(seat.x - byStove.x, seat.z - byStove.z)
        : walking
          ? Math.atan2(byStove.x - seat.x, byStove.z - seat.z)
          : -2.72,
      0,
    );
    rig.body.rotation.x = bend * 0.18;
    rig.legs.forEach((leg, j) => {
      leg.rotation.x =
        -1.25 * (1 - going * (1 - returning)) +
        (walking ? Math.sin(pourElapsed * 10 + j * Math.PI) * 0.3 : 0);
    });
    rig.feet.forEach((foot) => {
      foot.rotation.x = 1.25 * (1 - going * (1 - returning));
    });
    rig.rightArm.rotation.x = -0.5 - bend * 1.05;
    world.sauna.ladle.rotation.x = -bend * 0.85;
    if (pourElapsed >= 3.4) {
      actor.position.copy(seat);
      actor.rotation.set(0, 0.12, 0);
      rig.body.rotation.x = 0;
      rig.arms.forEach((arm, j) => {
        arm.rotation.set(-0.65, 0, j ? 0.1 : -0.1);
      });
      world.sauna.returnLadle();
      pourElapsed = null;
    }
  }
  return {
    start,
    stop,
    memories,
    get kind() {
      return kind;
    },
    get active() {
      return Boolean(kind);
    },
    get elapsed() {
      return elapsed;
    },
    get secondsLeft() {
      return building
        ? Math.max(
            0,
            Math.ceil(
              (3 - world.snowmanStage) * SNOWMAN_STEP_SECONDS - stepElapsed,
            ),
          )
        : null;
    },
    get buildStep() {
      return building ? SNOWMAN_STEPS[world.snowmanStage] : null;
    },
    get photoTarget() {
      if (kind === "sauna") return world.sauna.target.clone();
      if (kind === "skate")
        return actors[0].position
          .clone()
          .add(actors[1].position)
          .multiplyScalar(0.5)
          .add(new THREE.Vector3(0, 1.2, 0));
      return (kind === "cocoa" ? world.cocoaSpot : world.snowman.position)
        .clone()
        .add(new THREE.Vector3(0, 1.4, 1));
    },
    update(dt) {
      if (!kind) return;
      elapsed += dt;
      if (kind === "skate") {
        poseSkating();
        if (elapsed >= (Math.PI * 2) / 0.36 && !memories.has("skate")) {
          memories.add("skate");
          context.toast(
            "A lap together ♥ A skating memory to keep. X to finish, or stay on the ice.",
          );
        }
      } else if (kind === "cocoa") {
        rigs.forEach((rig, i) => {
          rig.body.position.y = Math.sin(elapsed * 1.5 + i) * 0.01;
          rig.leftArm.rotation.x =
            -0.9 - Math.max(0, Math.sin(elapsed * 0.6 + i * 0.3)) * 0.3;
        });
      } else if (kind === "sauna") {
        poseSaunaPour(dt);
        saunaOutfits.poseFeet();
        world.sauna.update(dt);
        rigs.forEach((rig, i) => {
          rig.body.position.y = Math.sin(elapsed * 1.3 + i * 0.3) * 0.012;
          rig.head.rotation.y = Math.sin(elapsed * 0.4 + i) * 0.08;
          rig.eyes.setClosed(Math.sin(elapsed * 0.55 + i * 0.15) > 0.7);
        });
        if (elapsed >= 6 && !memories.has("sauna")) {
          memories.add("sauna");
          context.toast(
            "Warmth for two ♥ A sauna memory to keep. Stay as long as you like.",
          );
        }
      } else if (building) {
        stepElapsed += dt;
        while (stepElapsed >= SNOWMAN_STEP_SECONDS) {
          stepElapsed -= SNOWMAN_STEP_SECONDS;
          world.buildSnowman();
          if (world.snowmanStage === 3) {
            memories.add("snowman");
            stop(false);
            context.toast("Our snowman is ready ♥ X to admire it together");
            return;
          }
          context.toast(`${SNOWMAN_STEPS[world.snowmanStage]} together ♥`);
        }
        poseBuilding();
      }
    },
    reset() {
      stop(false);
      memories.clear();
    },
    pourWater() {
      if (kind !== "sauna" || pourElapsed !== null) return false;
      pourElapsed = 0;
      world.sauna.holdLadle(rigs[0].rightHand);
      context.toast("A ladle of water ♥ A little steam from the hot stones");
      return true;
    },
    get pouring() {
      return pourElapsed !== null;
    },
  };
}
