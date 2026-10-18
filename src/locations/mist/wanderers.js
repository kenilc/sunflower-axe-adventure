import * as THREE from "three";
import { markGlow } from "../../rendering/glow.js";
import { resolveObstacleCollisions } from "../../systems/collision.js";
import { SCALE, biped, makeParts } from "./residents.js";

// Forest animals out for a dusk stroll through the hollow, made like the
// house residents: upright storybook animals with arms, legs and their own
// clothes, at the heroine's size. Each carries something in its right paw.
// They amble between waypoints, stop to look when the friends come near,
// and will come and stand beside them for a photo.

const up = new THREE.Vector3(0, 1, 0);

// A soft brown nose with a little shine, smaller than the eyes, so the
// face never reads as three black dots.
function nose(p, head, y, z, r = 0.036) {
  p.ball(r, "#5a3d34", 0, y, z, head).scale.set(1.25, 0.9, 0.9);
  p.ball(
    r * 0.35,
    "#fffbe8",
    -r * 0.35,
    y + r * 0.45,
    z + r * 0.7,
    head,
  ).castShadow = false;
}

// Short soft spikes pointing out of a ball's surface, for the hedgehog.
function spines(p, to, { x, y, z, r, color, from, to: end, rows }) {
  for (const [row, lift] of rows.entries())
    for (let i = 0, count = 7 - row; i < count; i++) {
      const az = from + ((end - from) * (i + 0.5 * (row % 2))) / count;
      const out = new THREE.Vector3(
        Math.sin(az) * Math.cos(lift),
        Math.sin(lift),
        Math.cos(az) * Math.cos(lift),
      );
      const spike = p.add(
        new THREE.ConeGeometry(0.05, 0.15, 7),
        color,
        x + out.x * r,
        y + out.y * r,
        z + out.z * r,
        to,
      );
      spike.quaternion.setFromUnitVectors(up, out);
    }
}

const build = {
  // In lavender dungarees and a rust beanie, with a basket of toadstools.
  hedgehog(p) {
    const spine = "#8c6a55",
      denim = "#a3a6d4";
    const body = biped(p, {
      fur: "#e9cfae",
      cloth: "#f4ead6",
      trousers: denim,
      hip: 0.4,
    });
    const { hips, head } = body;
    const pants = p.ball(0.3, denim, 0, 0.13, 0.01, hips);
    pants.scale.set(1.04, 0.72, 0.92);
    const bib = p.ball(0.14, denim, 0, 0.33, 0.22, hips);
    bib.scale.set(1.05, 1, 0.4);
    for (const side of [-1, 1]) {
      const strap = p.tube(
        0.025,
        0.025,
        0.28,
        denim,
        side * 0.1,
        0.48,
        0.12,
        hips,
      );
      strap.rotation.x = -0.6;
      p.ball(0.03, "#f2c94c", side * 0.09, 0.42, 0.28, hips).castShadow = false;
    }
    // The prickly back: a round coat of soft spikes.
    const coat = p.ball(0.3, spine, 0, 0.36, -0.12, hips);
    coat.scale.set(1.05, 1.1, 0.8);
    spines(p, hips, {
      x: 0,
      y: 0.36,
      z: -0.14,
      r: 0.28,
      color: spine,
      from: Math.PI * 0.6,
      to: Math.PI * 1.4,
      rows: [-0.5, -0.1, 0.3, 0.7],
    });
    const hood = p.ball(0.3, spine, 0, 0.05, -0.08, head);
    hood.scale.set(1.05, 1, 0.92);
    spines(p, head, {
      x: 0,
      y: 0.05,
      z: -0.1,
      r: 0.27,
      color: spine,
      from: Math.PI * 0.55,
      to: Math.PI * 1.45,
      rows: [-0.2, 0.25],
    });
    p.ball(0.28, "#e9cfae", 0, 0, 0.05, head);
    const snout = p.ball(0.11, "#e9cfae", 0, -0.07, 0.3, head);
    snout.scale.set(1, 0.85, 1.25);
    nose(p, head, -0.04, 0.43);
    for (const side of [-1, 1])
      p.ball(0.06, "#e3bd98", side * 0.26, 0.06, 0.06, head);
    p.eyes(head, { gap: 0.11, y: 0.06, z: 0.29 });
    p.cheeks(head, { gap: 0.17, y: -0.06, z: 0.27 });
    p.smile(head, { y: -0.17, z: 0.29, r: 0.04 });
    // A knitted beanie with a pompom, perched on top.
    const beanie = p.add(
      new THREE.SphereGeometry(0.25, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      "#e07a5f",
      0,
      0.13,
      -0.03,
      head,
    );
    beanie.scale.y = 0.8;
    const rim = p.add(
      new THREE.TorusGeometry(0.245, 0.045, 8, 22),
      "#c9654d",
      0,
      0.14,
      -0.03,
      head,
    );
    rim.rotation.x = Math.PI / 2;
    p.ball(0.07, "#f4ead6", 0, 0.36, -0.03, head);
    // A little wicker basket of red toadstools.
    const prop = p.group(0, -0.31, 0.02, body.arms[1]);
    p.tube(0.14, 0.11, 0.13, "#c8955a", 0, -0.15, 0, prop);
    const handle = p.add(
      new THREE.TorusGeometry(0.12, 0.015, 6, 14, Math.PI),
      "#a8714a",
      0,
      -0.09,
      0,
      prop,
    );
    handle.castShadow = false;
    for (const [x, z] of [
      [-0.05, 0.03],
      [0.06, -0.02],
      [0, -0.06],
    ]) {
      p.tube(0.02, 0.025, 0.06, "#fbf6ea", x, -0.06, z, prop);
      const cap = p.add(
        new THREE.SphereGeometry(0.055, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
        "#e56a5a",
        x,
        -0.03,
        z,
        prop,
      );
      cap.castShadow = false;
    }
    return { body, prop, carry: 0.35, speed: 1.1 };
  },
  // In a cream turtleneck jumper, carrying a paper lantern on a stick.
  fox(p) {
    const fur = "#ee9a5d",
      cream = "#fff4e6",
      sock = "#6b4a3a";
    const body = biped(p, {
      fur,
      cloth: "#f1e6cc",
      trousers: "#8a6a58",
      feet: sock,
      paws: sock,
      hip: 0.42,
    });
    const { hips, head } = body;
    const collar = p.add(
      new THREE.TorusGeometry(0.15, 0.05, 8, 20),
      "#e3d3b0",
      0,
      0.6,
      0.02,
      hips,
    );
    collar.rotation.x = Math.PI / 2;
    const face = p.ball(0.3, fur, 0, 0, 0, head);
    face.scale.set(1.15, 0.95, 1);
    for (const side of [-1, 1]) {
      const fluff = p.ball(0.14, cream, side * 0.15, -0.09, 0.17, head);
      fluff.scale.set(1, 0.8, 0.85);
    }
    const muzzle = p.ball(0.12, cream, 0, -0.08, 0.27, head);
    muzzle.scale.set(1.1, 0.8, 1.25);
    nose(p, head, -0.04, 0.41);
    for (const side of [-1, 1]) {
      const ear = p.group(side * 0.19, 0.24, -0.02, head);
      ear.rotation.z = -side * 0.3;
      p.add(new THREE.ConeGeometry(0.12, 0.26, 12), fur, 0, 0.13, 0, ear);
      p.add(
        new THREE.ConeGeometry(0.065, 0.15, 10),
        cream,
        0,
        0.1,
        0.05,
        ear,
      ).castShadow = false;
      p.add(new THREE.ConeGeometry(0.047, 0.11, 10), sock, 0, 0.21, 0, ear);
    }
    p.eyes(head, { gap: 0.13, y: 0.06, z: 0.27, r: 0.062 });
    p.cheeks(head, { gap: 0.2, y: -0.07, z: 0.3 });
    p.smile(head, { y: -0.14, z: 0.39, r: 0.04 });
    // A big bushy tail with a white tip, swishing behind.
    const tail = p.group(0, 0.1, -0.24, hips);
    for (const [y, z, r, color] of [
      [0, -0.05, 0.1, fur],
      [0.1, -0.18, 0.14, fur],
      [0.24, -0.28, 0.16, fur],
      [0.4, -0.32, 0.14, fur],
      [0.53, -0.3, 0.1, cream],
    ])
      p.ball(r, color, 0, y, z, tail);
    // A paper lantern hanging from a little crook.
    const prop = p.group(0, -0.3, 0.02, body.arms[1]);
    const out = new THREE.Vector3(0.35, 0.6, 0.72).normalize();
    const stick = p.tube(
      0.014,
      0.014,
      0.6,
      "#7a5640",
      out.x * 0.3,
      out.y * 0.3,
      out.z * 0.3,
      prop,
    );
    stick.quaternion.setFromUnitVectors(up, out);
    const hook = p.group(out.x * 0.6, out.y * 0.6, out.z * 0.6, prop);
    p.tube(0.004, 0.004, 0.14, "#4a3a3a", 0, -0.07, 0.03, hook);
    const glow = new THREE.MeshStandardMaterial({
      color: "#ffd99a",
      emissive: "#ffd99a",
      emissiveIntensity: 1.4,
      roughness: 0.6,
    });
    const paper = p.add(
      new THREE.SphereGeometry(0.09, 16, 12),
      glow,
      0,
      -0.22,
      0.03,
      hook,
    );
    paper.scale.y = 1.25;
    paper.castShadow = false;
    markGlow(paper);
    for (const y of [-0.11, -0.33])
      p.tube(0.045, 0.045, 0.03, "#c8573f", 0, y, 0.03, hook);
    return {
      body,
      prop,
      carry: 0.55,
      speed: 1.6,
      extra(t, swing) {
        tail.rotation.y = Math.sin(t * (2 + swing * 3)) * 0.3;
        hook.rotation.x = Math.sin(t * 2.4) * (0.06 + swing * 0.15);
      },
    };
  },
  // In a rose poncho and a daisy crown, with a little bunch of daisies.
  fawn(p) {
    const fur = "#c99067",
      cream = "#f6e6cf",
      hoof = "#6a4a3c";
    const body = biped(p, {
      fur,
      cloth: "#e7a9a2",
      feet: hoof,
      hip: 0.42,
    });
    const { hips, head } = body;
    p.tube(0.16, 0.38, 0.44, "#e7a9a2", 0, 0.3, 0, hips);
    const fringe = p.add(
      new THREE.TorusGeometry(0.38, 0.035, 8, 24),
      cream,
      0,
      0.08,
      0,
      hips,
    );
    fringe.rotation.x = Math.PI / 2;
    p.ball(0.07, "#ffffff", 0, 0.1, -0.33, hips);
    const face = p.ball(0.29, fur, 0, 0, 0, head);
    face.scale.set(1.05, 1, 1);
    const muzzle = p.ball(0.13, cream, 0, -0.09, 0.23, head);
    muzzle.scale.set(1.1, 0.8, 1);
    nose(p, head, -0.05, 0.345);
    const ears = [-1, 1].map((side) => {
      const ear = p.group(side * 0.27, 0.12, -0.02, head);
      ear.rotation.z = side * 0.45;
      p.ball(0.1, fur, side * 0.06, 0, 0, ear).scale.set(1.6, 0.6, 0.8);
      p.ball(0.06, "#f6b6c2", side * 0.07, 0, 0.04, ear).scale.set(
        1.6,
        0.6,
        0.4,
      );
      return ear;
    });
    // Pale fawn spots on the back of the head.
    for (const [x, y, z] of [
      [-0.12, 0.13, -0.23],
      [0.1, 0.18, -0.21],
      [0, 0.05, -0.28],
    ])
      p.ball(0.04, cream, x, y, z, head).scale.z = 0.5;
    p.eyes(head, { gap: 0.12, y: 0.05, z: 0.26, r: 0.066 });
    p.cheeks(head, { gap: 0.2, y: -0.07, z: 0.23 });
    p.smile(head, { y: -0.145, z: 0.335, r: 0.04 });
    // A crown of little daisies and pink clover.
    const crown = p.group(0, 0.19, -0.02, head);
    crown.rotation.x = -0.12;
    const vine = p.add(
      new THREE.TorusGeometry(0.24, 0.018, 6, 24),
      "#7fa36b",
      0,
      0,
      0,
      crown,
    );
    vine.rotation.x = Math.PI / 2;
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const x = Math.sin(a) * 0.24,
        z = Math.cos(a) * 0.24;
      p.ball(0.045, i % 3 ? "#fffaf0" : "#f6b6c8", x, 0.02, z, crown);
      if (i % 3) p.ball(0.02, "#f2c94c", x, 0.045, z, crown);
    }
    // Daisies for the friends.
    const prop = p.group(0, -0.3, 0.03, body.arms[1]);
    for (const [x, z, tall] of [
      [0, 0, 0.3],
      [-0.05, 0.03, 0.25],
      [0.05, 0.02, 0.27],
    ]) {
      p.tube(0.008, 0.008, tall, "#6aa84f", x, tall / 2 - 0.05, z, prop);
      const bloom = p.tube(
        0.045,
        0.045,
        0.015,
        "#fffaf0",
        x,
        tall - 0.05,
        z + 0.01,
        prop,
      );
      bloom.rotation.x = 0.5;
      p.ball(0.018, "#f2c94c", x, tall - 0.04, z + 0.02, prop);
    }
    return {
      body,
      prop,
      carry: 0.9,
      speed: 1.3,
      extra(t) {
        ears.forEach((ear, i) => {
          ear.rotation.x = Math.max(0, Math.sin(t * 1.3 + i * 2)) * 0.2;
        });
      },
    };
  },
  // In a moss-green hoodie, with an acorn to share.
  squirrel(p) {
    const fur = "#c97a4e",
      cream = "#f6e4cc",
      moss = "#8bb08a";
    const body = biped(p, { fur, cloth: moss, hip: 0.4 });
    const { hips, head } = body;
    const pocket = p.ball(0.14, "#7a9f79", 0, 0.14, 0.24, hips);
    pocket.scale.set(1.35, 0.6, 0.35);
    const hood = p.ball(0.2, moss, 0, 0.63, -0.17, hips);
    hood.scale.set(1.25, 0.7, 0.8);
    for (const side of [-1, 1])
      p.tube(0.01, 0.01, 0.1, cream, side * 0.06, 0.47, 0.25, hips).castShadow =
        false;
    const face = p.ball(0.28, fur, 0, 0, 0, head);
    face.scale.set(1.1, 0.95, 1);
    const muzzle = p.ball(0.12, cream, 0, -0.08, 0.21, head);
    muzzle.scale.set(1.35, 0.85, 0.8);
    p.ball(0.035, "#e88aa0", 0, -0.03, 0.3, head);
    p.add(
      new THREE.BoxGeometry(0.05, 0.04, 0.02),
      "#ffffff",
      0,
      -0.14,
      0.28,
      head,
    ).castShadow = false;
    for (const side of [-1, 1]) {
      const ear = p.group(side * 0.16, 0.22, 0, head);
      ear.rotation.z = -side * 0.25;
      p.add(new THREE.ConeGeometry(0.08, 0.17, 10), fur, 0, 0.08, 0, ear);
      p.add(new THREE.ConeGeometry(0.035, 0.1, 8), "#9a5a3a", 0, 0.2, 0, ear);
    }
    p.eyes(head, { gap: 0.12, y: 0.05, z: 0.25, r: 0.062 });
    p.cheeks(head, { gap: 0.2, y: -0.07, z: 0.21 });
    p.smile(head, { y: -0.105, z: 0.295, r: 0.03 });
    // The great curl of a tail, up the back and over.
    const tail = p.group(0, 0, -0.2, hips);
    for (const [y, z, r] of [
      [0.05, -0.1, 0.11],
      [0.22, -0.28, 0.14],
      [0.45, -0.38, 0.16],
      [0.7, -0.4, 0.17],
      [0.92, -0.32, 0.16],
      [1.03, -0.18, 0.13],
      [1.02, -0.04, 0.1],
    ])
      p.ball(r, y > 0.95 ? "#e5a274" : fur, 0, y, z, tail);
    const prop = p.group(0, -0.3, 0.04, body.arms[1]);
    const nut = p.ball(0.07, "#b07a45", 0, 0.02, 0, prop);
    nut.scale.y = 1.2;
    p.add(
      new THREE.SphereGeometry(0.075, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      "#6e4a32",
      0,
      0.05,
      0,
      prop,
    );
    p.tube(0.01, 0.01, 0.05, "#6e4a32", 0, 0.12, 0, prop);
    return {
      body,
      prop,
      carry: 0.8,
      speed: 1.5,
      extra(t, swing) {
        tail.rotation.x = Math.sin(t * (1.6 + swing * 4)) * 0.08;
      },
    };
  },
  // In a coral-striped top and a blue bow tie, under a lilac umbrella.
  duck(p) {
    const white = "#fbf7ee",
      orange = "#f2a33a";
    const body = biped(p, {
      fur: white,
      cloth: "#f08a7a",
      trousers: orange,
      feet: orange,
      hip: 0.38,
    });
    const { hips, head, tummy } = body;
    for (const dy of [-0.14, 0, 0.14]) {
      const round = Math.sqrt(1 - (dy / 0.336) ** 2) * 1.02;
      const stripe = p.add(
        new THREE.TorusGeometry(0.3, 0.025, 6, 24),
        white,
        0,
        0.26 + dy,
        0,
        hips,
      );
      stripe.rotation.x = Math.PI / 2;
      stripe.scale.set(round, round * 0.88, 1);
      stripe.castShadow = false;
    }
    tummy.scale.multiplyScalar(0.99);
    for (const side of [-1, 1])
      p.ball(0.05, "#7fa6c9", side * 0.06, 0.58, 0.18, hips).scale.set(
        1.3,
        0.8,
        0.6,
      );
    const tail = p.add(
      new THREE.ConeGeometry(0.08, 0.16, 10),
      white,
      0,
      0.2,
      -0.3,
      hips,
    );
    tail.rotation.x = -2.2;
    p.ball(0.29, white, 0, 0, 0, head);
    const bill = p.ball(0.13, orange, 0, -0.07, 0.26, head);
    bill.scale.set(1.25, 0.42, 1.15);
    for (const [x, y, z, r] of [
      [0, 0.28, 0, 0.06],
      [0.04, 0.31, -0.05, 0.05],
    ])
      p.ball(r, white, x, y, z, head);
    p.eyes(head, { gap: 0.13, y: 0.07, z: 0.25 });
    p.cheeks(head, { gap: 0.19, y: -0.01, z: 0.23 });
    // A lilac umbrella held up over its head.
    const prop = p.group(0, -0.3, 0.02, body.arms[1]);
    const handle = p.group(0, 0, 0, prop);
    handle.rotation.z = -0.3;
    p.tube(0.015, 0.015, 1.15, "#7a5640", 0, 0.55, 0, handle);
    const canopy = p.add(
      new THREE.SphereGeometry(0.48, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.4),
      "#b9a6dc",
      0,
      0.98,
      0,
      handle,
    );
    canopy.scale.y = 0.55;
    p.ball(0.03, "#7a5640", 0, 1.25, 0, handle);
    return {
      body,
      prop,
      carry: 0.9,
      hug: -0.25,
      lift: 0.15,
      speed: 1,
      extra(t, swing) {
        tail.rotation.z = Math.sin(t * (2 + swing * 6)) * 0.25;
        handle.rotation.x = Math.sin(t * 1.1) * 0.04;
      },
    };
  },
};

export const WANDERER_KINDS = Object.keys(build);

const turn = (from, to, rate) => {
  const d = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + d * Math.min(1, rate);
};

// One animal, standing at the origin of `parent`, facing +z.
export function createWanderer(kind, parent) {
  const root = new THREE.Group();
  root.name = `mist-${kind}-wanderer`;
  root.userData.keepSolid = true;
  root.scale.setScalar(SCALE);
  parent.add(root);
  const made = build[kind](makeParts(root));
  const { body, prop, carry, hug = 0.1, lift = 0.45, extra } = made;
  const hip = body.hips.position.y;
  const local = new THREE.Vector3();
  // Each animal glances about on its own rhythm.
  const phase = WANDERER_KINDS.indexOf(kind) * 1.7;
  let stride = 0,
    swing = 0,
    look = 0,
    wave = 0;
  return {
    kind,
    group: root,
    speed: made.speed,
    // How it holds itself this frame: `moving` blends in the walk cycle at
    // `pace`, `waving` the photo pose, and `friend` draws its glances.
    animate(
      dt,
      time,
      { moving = false, waving = false, friend, pace = 1 } = {},
    ) {
      swing += ((moving ? 1 : 0) - swing) * Math.min(1, dt * 8);
      wave += ((waving ? 1 : 0) - wave) * Math.min(1, dt * 6);
      stride += dt * made.speed * pace * 6 * swing;
      const s = Math.sin(stride);
      body.legs[0].rotation.x = s * 0.6 * swing;
      body.legs[1].rotation.x = -s * 0.6 * swing;
      body.hips.position.y =
        hip +
        Math.abs(Math.cos(stride)) * 0.03 * swing +
        Math.sin(time * 2) * 0.006;
      body.hips.rotation.z = s * 0.04 * swing;
      // The left paw swings, or waves hello for the photo.
      const [free, holding] = body.arms;
      body.pose(free, s * 0.5 * swing * (1 - wave), 0);
      free.rotation.z = THREE.MathUtils.lerp(
        free.rotation.z,
        -(2.5 + Math.sin(time * 8) * 0.3),
        wave,
      );
      free.rotation.x -= 0.25 * wave;
      const reach = carry - s * 0.08 * swing + lift * wave;
      body.pose(holding, reach, hug);
      prop.rotation.x = reach;
      extra?.(time, swing);
      // It never holds a fixed stare: the head drifts about, now and then
      // turning towards a friend nearby, then away again.
      let want = Math.sin(time * 0.45 + phase) * 0.35;
      if (friend && Math.sin(time * 0.3 + phase) > 0) {
        local.copy(friend);
        root.worldToLocal(local);
        if (Math.hypot(local.x, local.z) < 6 && local.z > -0.5)
          want =
            THREE.MathUtils.clamp(Math.atan2(local.x, local.z), -0.7, 0.7) *
            0.8;
      }
      look += (want - look) * Math.min(1, dt * 1.5);
      body.head.rotation.y = look;
      body.head.rotation.z = Math.sin(time * 0.6 + phase) * 0.05;
      body.head.rotation.x = wave * -0.08;
    },
  };
}

// Waypoint walkers. `routes` maps each kind to its loop of [x, z] stops;
// each animal gets a blocker that moves with it so the friends walk round.
// With the friends close by they keep strolling, only slower, and step
// round them.
const NOTICE = 3.6;
const NEAR_PACE = 0.5;
export function createWanderers({ parent, routes, blockers, contains }) {
  const animals = Object.entries(routes).map(([kind, route], i) => {
    const animal = createWanderer(kind, parent);
    const stops = route.map(([x, z]) => new THREE.Vector3(x, 0, z));
    const obstacle = { x: stops[0].x, z: stops[0].z, r: 0.6 };
    blockers.push(obstacle);
    animal.group.position.copy(stops[0]);
    return Object.assign(animal, {
      stops,
      obstacle,
      next: 1,
      pause: 1 + i * 0.7,
      stuck: 0,
      // While posing: where to stand, and which way to face.
      posing: null,
    });
  });
  const previous = new THREE.Vector3();
  let others = null;
  // Step towards a point, round the blockers (and `around`, the friends,
  // when it comes up to them); true once there.
  function walk(animal, to, dt, around = [], pace = 1) {
    const { position } = animal.group;
    const dx = to.x - position.x,
      dz = to.z - position.z;
    const gap = Math.hypot(dx, dz);
    if (gap < 0.25) return true;
    previous.copy(position);
    const step = Math.min(gap, animal.speed * pace * dt);
    position.x += (dx / gap) * step;
    position.z += (dz / gap) * step;
    resolveObstacleCollisions(
      position,
      previous,
      around.length ? [...others.get(animal), ...around] : others.get(animal),
      0.45,
    );
    if (!contains(position.x, position.z)) position.copy(previous);
    const moved = position.distanceTo(previous);
    animal.stuck = moved < step * 0.3 ? animal.stuck + dt : 0;
    if (moved > 1e-4)
      animal.group.rotation.y = turn(
        animal.group.rotation.y,
        Math.atan2(position.x - previous.x, position.z - previous.z),
        dt * 8,
      );
    return false;
  }
  function reset() {
    animals.forEach((animal, i) => {
      animal.group.position.copy(animal.stops[0]);
      animal.group.rotation.set(0, 0, 0);
      animal.next = 1;
      animal.pause = 1 + i * 0.7;
      animal.posing = null;
      animal.obstacle.x = animal.stops[0].x;
      animal.obstacle.z = animal.stops[0].z;
    });
  }
  return {
    animals,
    reset,
    // `friends` are the two friends' positions.
    update(dt, time, friends) {
      others ??= new Map(
        animals.map((animal) => [
          animal,
          blockers.filter((b) => b !== animal.obstacle),
        ]),
      );
      for (const animal of animals) {
        const { position, rotation } = animal.group;
        const friend = friends.reduce((a, b) =>
          a.distanceTo(position) <= b.distanceTo(position) ? a : b,
        );
        const near = friend.distanceTo(position) < NOTICE;
        const pace = near ? NEAR_PACE : 1;
        const around = friends.map(({ x, z }) => ({ x, z, r: 0.7 }));
        let moving = false,
          waving = false;
        if (animal.posing) {
          const there = walk(
            animal,
            animal.posing.spot,
            dt,
            friends.map(({ x, z }) => ({ x, z, r: 0.55 })),
          );
          moving = !there && animal.stuck < 0.6;
          animal.posing.arrived = !moving;
          if (!moving) {
            rotation.y = turn(rotation.y, animal.posing.facing, dt * 6);
            waving = true;
          }
        } else if (animal.pause > 0) {
          animal.pause -= dt;
        } else {
          const stop = animal.stops[animal.next];
          if (
            walk(animal, stop, dt, near ? around : [], pace) ||
            animal.stuck > 2.5
          ) {
            animal.next = (animal.next + 1) % animal.stops.length;
            animal.pause = 1.5 + ((animal.next * 1.7) % 2.5);
            animal.stuck = 0;
          } else moving = true;
        }
        animal.obstacle.x = position.x;
        animal.obstacle.z = position.z;
        animal.animate(dt, time, {
          moving,
          waving,
          pace: animal.posing ? 1 : pace,
          friend: animal.posing ? null : friend,
        });
      }
    },
  };
}
