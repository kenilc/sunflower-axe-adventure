import * as THREE from "three";
import { markGlow } from "../../rendering/glow.js";
import { createMeshFactory } from "../../rendering/mesh-factory.js";
import { FARM } from "./world.js";
import { createPoseHold, sitPose } from "./poses.js";

export const FARM_ENVIRONMENT = {
  background: "#d9c7ae",
  skyTop: null,
  fogDensity: 0.008,
  sunIntensity: 1.9,
  sunColor: "#fff1d8",
  sunOffset: [-12, 22, 10],
  fillIntensity: 1.5,
  fillColor: "#ffefd9",
  groundColor: "#7a5f48",
  exposure: 1.05,
};

const HALF_WIDTH = 7,
  HALF_DEPTH = 6;

// The farmhouse kitchen, open at the front like a dollhouse: Delft tiles,
// a box bed, the hearth, a table set with stroopwafels, and the cheese
// shelves where the wheels wait to be turned.
function createFarmKitchen(context) {
  const group = new THREE.Group();
  group.name = "polder-farm-kitchen";
  group.visible = false;
  context.scene.add(group);
  const { mesh, box, cyl, ball } = createMeshFactory(group);
  const blockers = [];
  const cream = "#efe6d2",
    wood = "#8a6a4c",
    dark = "#5c4433",
    delft = "#3d5f9c";
  const warm = new THREE.MeshStandardMaterial({
    color: "#ffd99a",
    emissive: "#ffb85c",
    emissiveIntensity: 0.7,
    roughness: 0.5,
  });

  // A red-and-cream tiled floor.
  box(HALF_WIDTH * 2, 0.2, HALF_DEPTH * 2, "#b98b6a", 0, -0.1, 0);
  for (let x = -HALF_WIDTH + 0.5; x < HALF_WIDTH; x += 1)
    for (let z = -HALF_DEPTH + 0.5; z < HALF_DEPTH; z += 1)
      if ((Math.round(x - 0.5) + Math.round(z - 0.5)) % 2 === 0)
        box(0.98, 0.02, 0.98, "#c9765a", x, 0.01, z);

  // Back and side walls: a band of Delft-blue tiles under cream plaster.
  box(HALF_WIDTH * 2, 4.6, 0.3, cream, 0, 2.3, -HALF_DEPTH);
  for (const side of [-1, 1])
    box(0.3, 4.6, HALF_DEPTH * 2, cream, side * HALF_WIDTH, 2.3, 0);
  for (let x = -HALF_WIDTH + 0.35; x < HALF_WIDTH; x += 0.5)
    for (let y = 0.3; y < 1.6; y += 0.5) {
      box(0.46, 0.46, 0.04, "#f6f3ec", x, y, -HALF_DEPTH + 0.17);
      box(0.16, 0.16, 0.05, delft, x, y, -HALF_DEPTH + 0.19).rotation.z =
        Math.PI / 4;
    }
  for (const x of [-4.5, -1.5, 1.5, 4.5])
    // Beams over the back half only, so the open front stays clear.
    box(0.3, 0.3, HALF_DEPTH, dark, x, 4.45, -HALF_DEPTH / 2);
  // Windows on both side walls let in warm light.
  for (const side of [-1, 1])
    for (const z of [-2.5, 1.5]) {
      box(0.1, 1.4, 1.2, warm, side * (HALF_WIDTH - 0.17), 2.6, z);
      box(0.14, 1.6, 0.12, "#f6f3ec", side * (HALF_WIDTH - 0.2), 2.6, z);
    }

  // The box bed: a cupboard bed in the back-left corner with check curtains.
  const bed = new THREE.Group();
  bed.position.set(-5.2, 0, -4.9);
  group.add(bed);
  box(3, 3.4, 1.8, wood, 0, 1.7, 0, bed);
  box(2.5, 1.5, 1.6, "#2f2420", 0, 1.9, 0.12, bed);
  box(2.3, 0.35, 1.3, "#f6f3ec", 0, 1.35, 0.1, bed);
  box(0.7, 0.25, 0.5, "#e8dcc4", -0.7, 1.6, 0.1, bed);
  for (const side of [-1, 1]) {
    const curtain = box(0.55, 1.6, 0.06, "#c8573f", side * 1.0, 2.0, 0.92, bed);
    curtain.rotation.y = side * 0.25;
  }
  blockers.push({ x: -5.2, z: -4.9, r: 1.7 });

  // The hearth with a copper kettle, and plates on the mantel.
  box(3, 2.6, 1.0, "#f6f3ec", 0, 1.3, -HALF_DEPTH + 0.6);
  box(2, 1.4, 0.4, "#2f2420", 0, 0.7, -HALF_DEPTH + 0.95);
  box(3.4, 0.2, 1.2, dark, 0, 2.7, -HALF_DEPTH + 0.6);
  cyl(0.32, 0.38, 0.45, "#c47a45", 0, 0.62, -HALF_DEPTH + 1.05, group, 10);
  const fire = ball(0.35, warm, 0, 0.3, -HALF_DEPTH + 1.0);
  fire.scale.set(1.4, 0.6, 0.8);
  for (const x of [-1.1, 0, 1.1]) {
    const plate = cyl(
      0.3,
      0.3,
      0.05,
      "#f6f3ec",
      x,
      3.15,
      -HALF_DEPTH + 0.35,
      group,
      14,
    );
    plate.rotation.x = Math.PI / 2;
    const motif = cyl(
      0.17,
      0.17,
      0.06,
      delft,
      x,
      3.15,
      -HALF_DEPTH + 0.37,
      group,
      10,
    );
    motif.rotation.x = Math.PI / 2;
  }
  blockers.push({ x: 0, z: -HALF_DEPTH + 0.6, r: 1.6 });

  // A tall clock with a swinging pendulum.
  const clock = new THREE.Group();
  clock.position.set(3.6, 0, -HALF_DEPTH + 0.55);
  group.add(clock);
  box(0.9, 3.2, 0.6, dark, 0, 1.6, 0, clock);
  const face = cyl(0.33, 0.33, 0.05, "#f6f3ec", 0, 2.7, 0.31, clock, 16);
  face.rotation.x = Math.PI / 2;
  const pendulum = new THREE.Group();
  pendulum.position.set(0, 2.2, 0.32);
  clock.add(pendulum);
  box(0.04, 1.1, 0.03, "#c9a24b", 0, -0.55, 0, pendulum);
  cyl(0.14, 0.14, 0.04, "#c9a24b", 0, -1.1, 0, pendulum, 12).rotation.x =
    Math.PI / 2;
  blockers.push({ x: 3.6, z: -HALF_DEPTH + 0.55, r: 0.8 });

  // The table, two chairs facing across it, stroopwafels and Delft cups.
  const table = new THREE.Vector3(-2.2, 0, 0.6);
  box(2.4, 0.14, 1.3, wood, table.x, 1.05, table.z);
  for (const dx of [-1, 1])
    for (const dz of [-0.5, 0.5])
      box(0.12, 1.0, 0.12, dark, table.x + dx, 0.5, table.z + dz);
  const chairs = [-1, 1].map((side) => {
    const chair = new THREE.Group();
    chair.position.set(table.x + side * 1.85, 0, table.z);
    chair.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    group.add(chair);
    box(0.8, 0.1, 0.8, "#a7804f", 0, 0.62, 0, chair);
    box(0.8, 1.0, 0.1, "#a7804f", 0, 1.15, -0.38, chair);
    for (const dx of [-0.32, 0.32])
      for (const dz of [-0.32, 0.32])
        box(0.08, 0.62, 0.08, dark, dx, 0.31, dz, chair);
    return chair;
  });
  for (let i = 0; i < 5; i++)
    cyl(
      0.24,
      0.24,
      0.05,
      i % 2 ? "#c48a4a" : "#a8693a",
      table.x,
      1.16 + i * 0.05,
      table.z,
      group,
      12,
    );
  const cups = [-1, 1].map((side) => {
    const cup = cyl(
      0.12,
      0.1,
      0.18,
      "#f6f3ec",
      table.x + side * 0.75,
      1.21,
      table.z,
      group,
      10,
    );
    cyl(
      0.125,
      0.125,
      0.04,
      delft,
      table.x + side * 0.75,
      1.24,
      table.z,
      group,
      10,
    );
    return cup;
  });
  cyl(0.2, 0.24, 0.3, delft, table.x, 1.27, table.z - 0.4, group, 10);
  blockers.push({ x: table.x, z: table.z, r: 1.15 });
  for (const chair of chairs)
    blockers.push({ x: chair.position.x, z: chair.position.z, r: 0.45 });
  const tableSpot = new THREE.Vector3(table.x, 0, table.z + 1.9);

  // Cheese shelves on the right wall; turning them is a farm chore.
  const shelf = new THREE.Vector3(HALF_WIDTH - 0.75, 0, 0.6);
  // Open shelving: a back board and two sides, so the wheels show.
  box(0.12, 3.2, 3.6, dark, shelf.x + 0.55, 1.6, shelf.z);
  for (const end of [-1, 1])
    box(1.0, 3.2, 0.12, dark, shelf.x + 0.05, 1.6, shelf.z + end * 1.75);
  const cheeses = [];
  for (let row = 0; row < 3; row++) {
    box(1.0, 0.08, 3.4, wood, shelf.x - 0.05, 0.5 + row * 1.0, shelf.z);
    for (let k = 0; k < 4; k++) {
      const wheel = new THREE.Group();
      wheel.position.set(
        shelf.x - 0.1,
        0.78 + row * 1.0,
        shelf.z - 1.2 + k * 0.8,
      );
      group.add(wheel);
      cyl(
        0.34,
        0.34,
        0.36,
        (row + k) % 2 ? "#f2b84b" : "#e9a23b",
        0,
        0,
        0,
        wheel,
        12,
      );
      cheeses.push(wheel);
    }
  }
  blockers.push(
    { x: shelf.x, z: shelf.z - 1.2, r: 0.9 },
    { x: shelf.x, z: shelf.z + 1.2, r: 0.9 },
  );
  const cheeseSpot = new THREE.Vector3(shelf.x - 1.8, 0, shelf.z);

  // Clogs by the door and a rag rug.
  for (const [x, turn] of [
    [3.6, 0.2],
    [4.1, -0.1],
  ]) {
    const shoe = ball(0.2, "#f2c14e", x, 0.12, HALF_DEPTH - 1.2);
    shoe.scale.set(0.8, 0.6, 1.6);
    shoe.rotation.y = turn;
  }
  box(3, 0.03, 2, "#c8573f", 0.8, 0.025, 2.6);
  box(2.6, 0.035, 1.6, "#e8dcc4", 0.8, 0.03, 2.6);
  box(2.4, 0.03, 1, "#6b8f4e", 0, 0.025, HALF_DEPTH - 0.5);

  group.traverse((node) => {
    if (node.material === warm) markGlow(node);
  });
  return {
    group,
    blockers,
    chairs,
    cups,
    cheeses,
    pendulum,
    tableSpot,
    cheeseSpot,
    arrival: new THREE.Vector3(0, 0, HALF_DEPTH - 1.6),
    contains: (x, z) =>
      Math.abs(x) < HALF_WIDTH - 0.6 && z > -HALF_DEPTH + 0.6 && z < HALF_DEPTH,
    heightAt: () => 0,
    followDistance: 3,
    isExit: (p) => Math.abs(p.x) < 1.4 && p.z > HALF_DEPTH - 0.45,
  };
}

// The farmhouse kitchen as a room of the polder.
export function createFarmPlace(context, { world, memories }) {
  const kitchen = createFarmKitchen(context);
  const pose = createPoseHold(context, "polder-farm");
  let moment = null,
    elapsed = 0,
    steam = 0;
  const near = (spot, reach = 1.9) =>
    Math.hypot(
      context.hero.position.x - spot.x,
      context.hero.position.z - spot.z,
    ) < reach;
  function nearby() {
    if (near(kitchen.tableSpot)) return "table";
    if (near(kitchen.cheeseSpot)) return "cheese";
    return null;
  }
  function stop() {
    if (!moment) return false;
    if (moment === "table") pose.release();
    moment = null;
    for (const cheese of kitchen.cheeses) cheese.rotation.set(0, 0, 0);
    context.clearRestInput();
    return true;
  }
  function start(kind) {
    moment = kind;
    elapsed = 0;
    context.clearRestInput();
    if (kind === "table")
      pose.hold((actor, rig, i) => {
        const chair = kitchen.chairs[i];
        actor.position.copy(chair.position).setY(0.22);
        actor.rotation.set(0, chair.rotation.y, 0);
        sitPose(rig, 0.2);
        rig.arms.forEach((arm) => arm.rotation.set(-1.1, 0, 0));
      });
    else {
      context.hero.position.copy(kitchen.cheeseSpot);
      context.hero.rotation.set(0, Math.PI / 2, 0);
    }
  }
  function interact() {
    if (moment) return stop();
    const kind = nearby();
    if (!kind) return false;
    start(kind);
    return true;
  }
  return {
    id: "polder:farm",
    name: "Tulip Polder · Farmhouse kitchen",
    progressLabel: "Tulip Polder · Farmhouse",
    parent: "polder",
    kind: "room",
    group: kitchen.group,
    terrain: kitchen,
    canThrow: false,
    maxZoom: 22,
    cameraTarget: () => 1,
    canPhotograph: () => true,
    canLeave: () => !moment,
    canSaveLocation: () => !moment,
    cameraLocked: () => moment === "table",
    photoLocation: () =>
      moment === "table"
        ? "Tulip Polder · Stroopwafels at the kitchen table"
        : "Tulip Polder · Farmhouse kitchen",
    getPhotoPreset() {
      if (moment !== "table") return;
      return {
        lockActors: true,
        target: new THREE.Vector3(-2.2, 1.2, 0.6),
        yaw: 0.25,
        pitch: 18,
        distance: 9,
        fov: 48,
      };
    },
    entrance: {
      from: "polder",
      contains: (p) =>
        Math.hypot(p.x - world.farmDoor.x, p.z - world.farmDoor.z) < 1.1,
    },
    returnSpawn: [FARM.x, 0, FARM.z + FARM.depth / 2 + 2.6],
    settings: {
      spawn: kitchen.arrival.toArray(),
      heading: Math.PI,
      camera: { yaw: 0, pitch: 0.62, zoom: 17, fov: 50 },
      environment: FARM_ENVIRONMENT,
      instructions:
        "<kbd>W A S D</kbd> walk <kbd>X</kbd> table / cheeses <kbd>M</kbd> photo",
    },
    enter() {
      context.toast(
        "Goedemorgen! ♥ Stroopwafels on the table · Cheeses on the shelves",
      );
    },
    exit() {
      stop();
    },
    interact,
    getGate: () =>
      !moment && kitchen.isExit(context.hero.position)
        ? { id: "polder" }
        : null,
    update(dt) {
      if (!moment) return false;
      elapsed += dt;
      if (moment === "table") {
        steam -= dt;
        if (steam <= 0) {
          steam = 0.6;
          for (const cup of kitchen.cups)
            context.burst(cup.position.clone().setY(1.45), "#ffffff", 3);
        }
        if (elapsed > 4)
          memories.add("table", "Stroopwafels and tea at the kitchen table ♥");
        return true;
      }
      // Turning the cheeses: each wheel flips over in turn, then it's done.
      kitchen.cheeses.forEach((cheese, i) => {
        const t = THREE.MathUtils.clamp((elapsed - i * 0.28) / 0.5, 0, 1);
        cheese.rotation.z = Math.PI * THREE.MathUtils.smootherstep(t, 0, 1);
      });
      if (elapsed > kitchen.cheeses.length * 0.28 + 0.6) {
        memories.add("cheese", "Every cheese turned · Goed gedaan! ♥");
        stop();
      }
      return true;
    },
    animate(dt, time) {
      kitchen.pendulum.rotation.z = Math.sin(time * 2.4) * 0.25;
    },
    updateCamera(dt) {
      if (moment !== "table") return false;
      const target = new THREE.Vector3(-2.2, 1.2, 0.6);
      const position = target.clone().add(new THREE.Vector3(2.4, 3.2, 7.6));
      context.camera.position.lerp(position, 1 - Math.exp(-dt * 3));
      context.camera.lookAt(target);
      return true;
    },
    getHud() {
      const kind = nearby();
      let label = "Look around the kitchen · X",
        icon = "interact",
        hint =
          "Table: stroopwafels and tea · Cheese shelves: right wall · Door: front";
      if (moment === "table") {
        label = "Stand up from the table · X";
        icon = "return";
        hint = "Warm tea and syrupy stroopwafels · X to stand · M for a photo";
      } else if (moment === "cheese") {
        label = "Turning the cheeses…";
        hint = "Each wheel is turned so it ripens evenly";
      } else if (kind === "table") {
        label = "Sit down for stroopwafels · X";
        icon = "tea";
        hint = "Stroopwafels · Sit together at the table with a cup of tea · X";
      } else if (kind === "cheese") {
        label = "Turn the cheeses · X";
        hint = "Kaas · Turn the wheels on the shelves together · X";
      }
      return {
        region: "Farmhouse kitchen",
        hideStick: moment === "table",
        quest: {
          eyebrow: "TULIP POLDER · THE FARMHOUSE",
          title: "Delft tiles and warm tea.<br />A kitchen for two.",
          objective: memories.objective,
        },
        progress: memories.progress,
        hint,
        instructions: moment
          ? "<kbd>X</kbd> back to walk <kbd>M</kbd> photo"
          : "<kbd>W A S D</kbd> walk <kbd>X</kbd> table / cheeses <kbd>M</kbd> photo <kbd>V</kbd> map",
        actions: [
          {
            id: moment ? "polderFarmStop" : "placeAction",
            key: "KeyX",
            icon,
            label,
            visible: Boolean(moment === "table" || (!moment && kind)),
            run: interact,
          },
        ],
      };
    },
    getProgress: () => ({ moment }),
    reset() {
      stop();
    },
  };
}
