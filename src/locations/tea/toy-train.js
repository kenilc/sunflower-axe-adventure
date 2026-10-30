import * as THREE from "three";
import { createPoseHold, sitPose } from "../polder/poses.js";

// Cars are built small and grown so the friends fit in the coaches.
const SCALE = 1.3;
// Lengths along the track, from the engine's middle, of each coach's
// middle; the friends ride in the first coach.
const COACHES = [3.4, 6.65];
const TOP_SPEED = 6.5,
  EASE_SECONDS = 2.6;

// The little blue toy train that runs round the foot of the hill. It waits
// at the halt; boarding sits the friends side by side in the first open
// coach, and it puffs once round the hill and stops where it started.
// Cars are built with +z forward and placed along the ring, heading the
// way the angle grows.
export function createToyTrain(context, { parent, radius, angle, helpers }) {
  const { box, cyl, ball, mesh } = helpers;
  const pose = createPoseHold(context, "tea-train");
  const blue = "#3b6fb0",
    cream = "#f4efe2",
    red = "#c8573f",
    iron = "#2f3138";
  const wheels = [];
  function wheelSet(car, zs) {
    for (const z of zs)
      for (const side of [-1, 1]) {
        const wheel = cyl(0.27, 0.27, 0.1, red, side * 0.36, 0.3, z, car, 12);
        wheel.rotation.z = Math.PI / 2;
        wheels.push(wheel);
      }
  }
  const engine = new THREE.Group();
  engine.name = "tea-train-engine";
  engine.scale.setScalar(SCALE);
  parent.add(engine);
  box(1.1, 0.28, 2.5, iron, 0, 0.55, 0, engine);
  wheelSet(engine, [-0.75, 0.05, 0.85]);
  const boiler = cyl(0.46, 0.46, 1.5, blue, 0, 1.1, 0.35, engine, 14);
  boiler.rotation.x = Math.PI / 2;
  for (const z of [-0.2, 0.35, 0.9]) {
    const band = cyl(0.475, 0.475, 0.06, "#e2c46a", 0, 1.1, z, engine, 14);
    band.rotation.x = Math.PI / 2;
  }
  const smokebox = cyl(0.44, 0.44, 0.2, iron, 0, 1.1, 1.18, engine, 14);
  smokebox.rotation.x = Math.PI / 2;
  cyl(0.11, 0.17, 0.55, iron, 0, 1.75, 0.95, engine, 10);
  cyl(0.2, 0.2, 0.08, iron, 0, 2.04, 0.95, engine, 10);
  ball(0.17, "#e2c46a", 0, 1.58, 0.3, engine);
  const lamp = mesh(
    new THREE.IcosahedronGeometry(0.12, 2),
    new THREE.MeshStandardMaterial({
      color: "#fff1c4",
      emissive: "#ffe29a",
      emissiveIntensity: 1.2,
    }),
    0,
    1.3,
    1.32,
    engine,
  );
  lamp.castShadow = false;
  box(1.2, 0.18, 0.12, red, 0, 0.55, 1.3, engine);
  // The cab, with windows and a roof.
  box(1.2, 1.0, 0.9, blue, 0, 1.2, -0.75, engine);
  for (const side of [-1, 1])
    box(0.04, 0.38, 0.5, cream, side * 0.61, 1.45, -0.75, engine);
  box(1.35, 0.08, 1.1, iron, 0, 1.76, -0.75, engine);
  box(1.25, 0.06, 0.06, cream, 0, 1.0, -0.3, engine);

  const coaches = COACHES.map(() => {
    const coach = new THREE.Group();
    coach.name = "tea-train-coach";
    coach.scale.setScalar(SCALE);
    parent.add(coach);
    box(1.0, 0.2, 2.2, iron, 0, 0.5, 0, coach);
    wheelSet(coach, [-0.65, 0.65]);
    box(1.4, 0.12, 2.3, "#b08560", 0, 0.64, 0, coach);
    for (const side of [-1, 1]) {
      box(0.08, 0.5, 2.3, blue, side * 0.66, 0.95, 0, coach);
      box(0.1, 0.06, 2.34, cream, side * 0.66, 1.22, 0, coach);
    }
    for (const end of [-1, 1])
      box(1.4, 0.5, 0.08, blue, 0, 0.95, end * 1.13, coach);
    for (const [x, z] of [
      [-0.62, -1.08],
      [0.62, -1.08],
      [-0.62, 1.08],
      [0.62, 1.08],
    ])
      cyl(0.04, 0.04, 2.5, cream, x, 2.33, z, coach, 6);
    box(1.6, 0.08, 2.5, red, 0, 3.6, 0, coach);
    box(1.2, 0.1, 0.45, "#9a7558", 0, 1.0, -0.2, coach);
    box(1.2, 0.4, 0.08, "#9a7558", 0, 1.25, -0.45, coach);
    return coach;
  });
  const cars = [
    { car: engine, back: 0 },
    ...coaches.map((car, i) => ({ car, back: COACHES[i] })),
  ];

  let at = angle,
    riding = false,
    travelled = 0,
    speed = 0,
    puff = 0,
    whistled = false,
    finished = false;
  const lap = Math.PI * 2 * radius;
  function place() {
    for (const { car, back } of cars) {
      const a = at - back / radius;
      car.position.set(Math.sin(a) * radius, 0, Math.cos(a) * radius);
      car.rotation.set(0, a + Math.PI / 2, 0);
    }
  }
  place();
  // Where the parked train stands, for walking round it.
  const blockers = [];
  for (const { car, back } of cars)
    for (const offset of [-0.9, 0.9]) {
      const a = at - (back + offset) / radius;
      blockers.push({
        x: Math.sin(a) * radius,
        z: Math.cos(a) * radius,
        r: 1.1,
        car,
      });
    }
  const seatIn = coaches[0];
  function seat() {
    pose.actors.forEach((actor, i) => {
      const local = new THREE.Vector3((i ? 1 : -1) * 0.33, 0.7, -0.15);
      actor.position.copy(local.applyMatrix4(seatIn.matrixWorld));
      actor.rotation.set(0, seatIn.rotation.y, 0);
    });
  }
  return {
    blockers,
    engine,
    coaches,
    get riding() {
      return riding;
    },
    // How far round the hill the ride has gone, from 0 to 1.
    get progress() {
      return travelled / lap;
    },
    // Takes a ride once round; `done` is called back on arrival.
    board() {
      if (riding) return false;
      riding = true;
      finished = false;
      travelled = speed = puff = 0;
      whistled = false;
      context.clearRestInput();
      blockers.forEach((blocker) => (blocker.active = false));
      pose.hold((actor, rig) => sitPose(rig, 0.2));
      seatIn.updateMatrixWorld(true);
      seat();
      context.beep(1175, 0.25);
      return true;
    },
    // Runs instead of walking during the ride. Returns true on the frame
    // the train arrives back at the halt.
    move(dt) {
      if (!riding) return false;
      const left = lap - travelled;
      const want = Math.min(TOP_SPEED, Math.sqrt(Math.max(0, left) * 3) + 0.4);
      speed = Math.min(want, speed + (TOP_SPEED / EASE_SECONDS) * dt);
      const step = Math.min(left, speed * dt);
      travelled += step;
      at += step / radius;
      place();
      for (const wheel of wheels) wheel.rotation.x += step / (0.27 * SCALE);
      for (const coach of coaches) coach.updateMatrixWorld(true);
      seat();
      puff -= dt;
      if (puff <= 0) {
        puff = 0.3;
        engine.updateMatrixWorld(true);
        context.burst(
          new THREE.Vector3(0, 2.15, 0.95).applyMatrix4(engine.matrixWorld),
          "#f4f6f8",
          3,
        );
      }
      if (!whistled && travelled > lap * 0.5) {
        whistled = true;
        context.beep(1397, 0.3);
      }
      if (left - step <= 1e-3) {
        finished = true;
        this.stop();
      }
      return true;
    },
    // Ends the ride: back on the platform, wherever the train has got to.
    stop() {
      if (!riding) return false;
      riding = false;
      at = angle;
      place();
      pose.release();
      blockers.forEach((blocker) => (blocker.active = true));
      return true;
    },
    // True once after a full lap, for the memory.
    takeArrival() {
      const arrived = finished;
      finished = false;
      return arrived;
    },
    reset() {
      this.stop();
      finished = false;
      at = angle;
      place();
    },
  };
}
