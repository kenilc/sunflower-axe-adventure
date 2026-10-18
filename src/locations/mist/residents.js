import * as THREE from "three";

// The animal who lives in each house, at home doing something small. They
// are storybook animals: upright, with little arms and legs and their own
// clothes, like soft felt toys. The frog fishes from its lily pad, the cat
// knits on its cushion, the rabbit nibbles a carrot by the cake table, the
// owl reads in its armchair and the turtle sips tea. Smooth and chubby,
// with shiny pupils and blush cheeks, so they read as sweet up close. Each
// looks up at the friends when they come near.

const smoothMats = {};
function smooth(color) {
  return (smoothMats[color] ??= new THREE.MeshStandardMaterial({
    color,
    roughness: 0.8,
  }));
}

export function makeParts(parent) {
  const add = (geometry, color, x, y, z, to = parent) => {
    const node = new THREE.Mesh(
      geometry,
      typeof color === "string" ? smooth(color) : color,
    );
    node.position.set(x, y, z);
    node.castShadow = true;
    node.receiveShadow = true;
    to.add(node);
    return node;
  };
  const ball = (r, color, x, y, z, to) =>
    add(new THREE.SphereGeometry(r, 20, 14), color, x, y, z, to);
  const tube = (a, b, h, color, x, y, z, to) =>
    add(new THREE.CylinderGeometry(a, b, h, 14), color, x, y, z, to);
  const capsule = (r, length, color, x, y, z, to) =>
    add(new THREE.CapsuleGeometry(r, length, 4, 12), color, x, y, z, to);
  const group = (x = 0, y = 0, z = 0, to = parent) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    to.add(g);
    return g;
  };
  // Two eyes on a face whose front is +z: warm dark pupils, each turned to
  // follow the curve of the face, with a big catchlight and a small one so
  // they always look bright and wet rather than like black beads. Eyes on
  // bumps of their own (the frog's) pass a smaller `turn`.
  const eyes = (
    to,
    { gap, y, z, r = 0.06, turn = Math.asin(Math.min(gap / 0.3, 0.9)) },
  ) => {
    for (const side of [-1, 1]) {
      const eye = group(side * gap, y, z, to);
      eye.rotation.y = side * turn;
      const pupil = ball(r, "#33241f", 0, 0, 0, eye);
      pupil.scale.z = 0.6;
      pupil.castShadow = false;
      for (const [x, lift, size] of [
        [-0.32, 0.36, 0.42],
        [0.34, -0.3, 0.18],
      ])
        ball(
          r * size,
          "#fffbe8",
          side * r * x,
          r * lift,
          r * 0.5,
          eye,
        ).castShadow = false;
    }
  };
  const cheeks = (to, { gap, y, z, r = 0.055 }) => {
    for (const side of [-1, 1]) {
      const blush = ball(r, "#f4a3b4", side * gap, y, z, to);
      blush.scale.set(1.2, 0.7, 0.4);
      blush.castShadow = false;
    }
  };
  const smile = (to, { y, z, r = 0.05 }) => {
    const mouth = add(
      new THREE.TorusGeometry(r, r * 0.2, 5, 10, Math.PI),
      "#5a3a32",
      0,
      y,
      z,
      to,
    );
    mouth.rotation.z = Math.PI;
    mouth.castShadow = false;
    return mouth;
  };
  return { add, ball, tube, capsule, group, eyes, cheeks, smile };
}

// The shared body: hips, a round clothed tummy, two legs, two arms and a
// head pivot. Seated animals stick their legs straight out like a plush
// toy on a shelf. Arms hang from the shoulders; `reach` points them
// forward (radians) and `hug` brings the paws in towards each other.
// `feet` and `paws` default to the fur, for hooves or webbed feet.
export function biped(
  p,
  { fur, cloth, trousers = fur, feet = fur, paws = fur, hip, seated = false },
) {
  const hips = p.group(0, hip, 0);
  const tummy = p.ball(0.3, cloth, 0, 0.26, 0, hips);
  tummy.scale.set(1, 1.12, 0.88);
  const legs = [-1, 1].map((side) => {
    const leg = p.group(side * 0.13, 0.04, 0, hips);
    p.capsule(0.09, 0.18, trousers, 0, -0.16, 0, leg);
    const foot = p.ball(0.1, feet, 0, -0.33, 0.05, leg);
    foot.scale.set(1, 0.65, 1.45);
    if (seated) leg.rotation.x = -1.45;
    return leg;
  });
  const arms = [-1, 1].map((side) => {
    const arm = p.group(side * 0.27, 0.46, 0, hips);
    p.capsule(0.07, 0.15, cloth, 0, -0.13, 0, arm);
    p.ball(0.08, paws, 0, -0.29, 0, arm);
    arm.rotation.z = side * 0.18;
    return arm;
  });
  const pose = (arm, reach, hug = 0) => {
    const side = arm === arms[0] ? -1 : 1;
    arm.rotation.set(-reach, 0, side * (0.18 - hug));
  };
  // Where a paw is, in hip space, for props that stay put.
  const pawAt = (arm) => {
    arm.updateMatrix();
    return new THREE.Vector3(0, -0.29, 0).applyMatrix4(arm.matrix);
  };
  const head = p.group(0, 0.82, 0, hips);
  return { hips, tummy, legs, arms, pose, pawAt, head };
}

const build = {
  // In a yellow raincoat on the lily pad, fishing in the indoor pool.
  frog(p) {
    const body = biped(p, {
      fur: "#8cc96f",
      cloth: "#f2c94c",
      hip: 0.12,
      seated: true,
    });
    const { hips, head, arms } = body;
    for (const side of [-1, 1]) {
      const button = p.ball(0.035, "#c98f2a", 0, 0.32 + side * 0.1, 0.27, hips);
      button.castShadow = false;
    }
    const face = p.ball(0.34, "#8cc96f", 0, 0, 0, head);
    face.scale.set(1.25, 0.8, 1);
    const chin = p.ball(0.22, "#e9f2c4", 0, -0.1, 0.16, head);
    chin.scale.set(1.3, 0.6, 0.7);
    for (const side of [-1, 1]) {
      p.ball(0.14, "#8cc96f", side * 0.22, 0.2, 0.04, head);
      p.ball(0.1, "#ffffff", side * 0.22, 0.22, 0.12, head);
    }
    p.eyes(head, { gap: 0.22, y: 0.23, z: 0.2, r: 0.06, turn: 0.15 });
    p.cheeks(head, { gap: 0.3, y: -0.03, z: 0.25 });
    p.smile(head, { y: 0, z: 0.33, r: 0.09 });
    // A little rain hat, tipped back between the eyes.
    const hat = p.group(0, 0.24, -0.1, head);
    hat.rotation.x = -0.35;
    p.tube(0.24, 0.24, 0.03, "#f2c94c", 0, 0, 0, hat);
    p.ball(0.15, "#f2c94c", 0, 0.04, 0, hat).scale.y = 0.6;
    // A rod held out over the water, and a red-and-white float.
    body.pose(arms[1], 1.1, 0.5);
    body.pose(arms[0], 0.7, 0.4);
    const paw = body.pawAt(arms[1]);
    const rod = p.group(paw.x, paw.y, paw.z, hips);
    rod.rotation.x = 0.6;
    p.tube(0.012, 0.02, 0.7, "#a8714a", 0, 0.35, 0, rod);
    const tip = new THREE.Vector3(0, 0.7, 0).applyEuler(rod.rotation).add(paw);
    // The pool's surface, in hip space at the resident's scale.
    const water = -0.145;
    const drop = tip.y - water;
    p.tube(
      0.004,
      0.004,
      drop,
      "#f4efe2",
      tip.x,
      tip.y - drop / 2,
      tip.z,
      hips,
    ).castShadow = false;
    const float = p.group(tip.x, water, tip.z, hips);
    p.ball(0.05, "#e2453c", 0, 0.03, 0, float);
    p.ball(0.05, "#ffffff", 0, -0.02, 0, float).scale.y = 0.6;
    return (t) => {
      float.position.y = water + Math.sin(t * 2.2) * 0.02;
      rod.rotation.z = Math.sin(t * 0.9) * 0.03;
      return head;
    };
  },
  // In a pink cardigan on the napping cushion, knitting a blue scarf.
  cat(p) {
    const body = biped(p, {
      fur: "#f2c49b",
      cloth: "#f2a7b8",
      hip: 0.06,
      seated: true,
    });
    const { hips, head, arms } = body;
    const collar = p.add(
      new THREE.TorusGeometry(0.16, 0.05, 8, 18),
      "#fff3e4",
      0,
      0.6,
      0.05,
      hips,
    );
    collar.rotation.x = Math.PI / 2;
    const face = p.ball(0.31, "#f2c49b", 0, 0, 0, head);
    face.scale.set(1.15, 0.95, 1);
    const muzzle = p.ball(0.12, "#fff3e4", 0, -0.08, 0.25, head);
    muzzle.scale.set(1.3, 0.8, 0.6);
    p.ball(0.035, "#e88aa0", 0, -0.03, 0.32, head);
    for (const side of [-1, 1]) {
      const ear = p.add(
        new THREE.ConeGeometry(0.11, 0.2, 10),
        "#f2c49b",
        side * 0.2,
        0.27,
        -0.02,
        head,
      );
      ear.rotation.z = -side * 0.35;
      const inner = p.add(
        new THREE.ConeGeometry(0.06, 0.12, 8),
        "#f6b6c2",
        side * 0.2,
        0.25,
        0.03,
        head,
      );
      inner.rotation.z = -side * 0.35;
    }
    p.eyes(head, { gap: 0.13, y: 0.05, z: 0.27, r: 0.055 });
    p.cheeks(head, { gap: 0.21, y: -0.06, z: 0.22 });
    // A striped tail curled round on the cushion.
    for (let i = 0; i < 6; i++) {
      const a = 2.4 + i * 0.4;
      p.ball(
        0.08,
        i === 5 ? "#fff3e4" : i % 2 ? "#e8a978" : "#f2c49b",
        Math.sin(a) * 0.4,
        0.02,
        Math.cos(a) * 0.4 - 0.05,
        hips,
      );
    }
    // Two needles and the scarf hanging between the paws, with the
    // ball of yarn beside.
    body.pose(arms[0], 1, 0.55);
    body.pose(arms[1], 1, 0.55);
    for (const arm of arms) {
      const needle = p.tube(0.012, 0.012, 0.42, "#c9a24b", 0, -0.3, 0.05, arm);
      needle.rotation.x = -1.2;
    }
    const left = body.pawAt(arms[0]),
      right = body.pawAt(arms[1]);
    const scarf = p.add(
      new THREE.BoxGeometry(0.2, 0.3, 0.04),
      "#8fb3d9",
      (left.x + right.x) / 2,
      left.y - 0.15,
      left.z + 0.04,
      hips,
    );
    for (let k = 0; k < 3; k++)
      p.add(
        new THREE.BoxGeometry(0.21, 0.025, 0.045),
        "#f4efe2",
        0,
        -0.08 + k * 0.08,
        0,
        scarf,
      ).castShadow = false;
    p.ball(0.13, "#8fb3d9", 0.42, 0.04, 0.3, hips);
    return (t) => {
      const click = Math.sin(t * 5);
      body.pose(arms[0], 1 + click * 0.08, 0.55);
      body.pose(arms[1], 1 - click * 0.08, 0.55);
      head.rotation.x = 0.25 + Math.sin(t * 0.6) * 0.04;
      return head;
    };
  },
  // In a lilac dress and apron beside the cake table, nibbling a carrot.
  rabbit(p) {
    const body = biped(p, { fur: "#fbf6f0", cloth: "#c9b5e0", hip: 0.42 });
    const { hips, head, arms } = body;
    p.tube(0.24, 0.4, 0.42, "#c9b5e0", 0, 0.02, 0, hips);
    // A soft apron hugging the tummy and skirt, with a heart pocket.
    const apron = p.ball(0.24, "#fff8ec", 0, 0.12, 0.25, hips);
    apron.scale.set(0.95, 1.45, 0.42);
    p.ball(0.05, "#f2a7b8", 0, 0.04, 0.35, hips).scale.z = 0.4;
    p.ball(0.12, "#ffffff", 0, 0.1, -0.33, hips);
    const face = p.ball(0.31, "#fbf6f0", 0, 0, 0, head);
    face.scale.set(1.1, 0.95, 1);
    const ears = [];
    for (const side of [-1, 1]) {
      const ear = p.group(side * 0.13, 0.22, -0.04, head);
      const outer = p.ball(0.1, "#fbf6f0", 0, 0.28, 0, ear);
      outer.scale.set(0.9, 3, 0.6);
      const inner = p.ball(0.06, "#f6b6c2", 0, 0.27, 0.04, ear);
      inner.scale.set(0.9, 3.4, 0.4);
      ear.rotation.z = -side * 0.18;
      ears.push(ear);
    }
    // A ribbon bow at the base of one ear.
    for (const side of [-1, 1])
      p.ball(0.06, "#f2a7b8", 0.13 + side * 0.07, 0.27, 0.02, head).scale.set(
        1.3,
        0.8,
        0.6,
      );
    p.eyes(head, { gap: 0.13, y: 0.04, z: 0.27 });
    p.cheeks(head, { gap: 0.2, y: -0.08, z: 0.24 });
    p.ball(0.035, "#e88aa0", 0, -0.04, 0.31, head);
    const mouth = p.smile(head, { y: -0.1, z: 0.29, r: 0.04 });
    // The carrot stays upright in the paw, leafy end up to nibble.
    const carrot = p.group(0, -0.3, 0.05, arms[1]);
    p.add(
      new THREE.ConeGeometry(0.06, 0.3, 10),
      "#f2843a",
      0,
      0.02,
      0,
      carrot,
    ).rotation.x = Math.PI;
    p.tube(0.01, 0.03, 0.12, "#6aa84f", 0, 0.22, 0, carrot);
    return (t) => {
      // Up to the mouth for a few nibbles, then down to look at it.
      const up = (Math.sin(t * 0.8) + 1) / 2;
      body.pose(arms[1], 1.2 + up * 0.75, 0.6);
      body.pose(arms[0], 1.1 + up * 0.7, 0.6);
      carrot.rotation.x = 1.2 + up * 0.75;
      mouth.scale.y = up > 0.7 ? 1 + Math.max(0, Math.sin(t * 9)) * 0.8 : 1;
      ears[0].rotation.x = Math.max(0, Math.sin(t * 1.7 + 1)) * 0.25;
      ears[1].rotation.x = Math.max(0, Math.sin(t * 1.3)) * 0.2;
      return head;
    };
  },
  // In a green knitted vest and round glasses, reading in the armchair.
  owl(p) {
    const body = biped(p, {
      fur: "#b08a6a",
      cloth: "#8fb07a",
      trousers: "#9a7558",
      hip: 0.02,
      seated: true,
    });
    const { hips, head, arms } = body;
    hips.position.z = -0.1;
    const bib = p.ball(0.18, "#f1e2c8", 0, 0.5, 0.17, hips);
    bib.scale.set(1, 0.9, 0.5);
    for (let k = 0; k < 2; k++)
      p.ball(0.03, "#f4efe2", 0, 0.3 - k * 0.12, 0.27, hips).castShadow = false;
    const face = p.ball(0.34, "#b08a6a", 0, 0, 0, head);
    face.scale.set(1.15, 0.92, 1);
    for (const side of [-1, 1]) {
      const disc = p.ball(0.14, "#f6ead6", side * 0.14, 0.02, 0.25, head);
      disc.scale.z = 0.4;
      const tuft = p.add(
        new THREE.ConeGeometry(0.07, 0.18, 8),
        "#9a7558",
        side * 0.26,
        0.3,
        0,
        head,
      );
      tuft.rotation.z = -side * 0.4;
      p.add(
        new THREE.TorusGeometry(0.1, 0.014, 6, 16),
        "#c9a24b",
        side * 0.14,
        0.02,
        0.32,
        head,
      ).castShadow = false;
    }
    p.eyes(head, { gap: 0.14, y: 0.03, z: 0.3, r: 0.055 });
    p.cheeks(head, { gap: 0.25, y: -0.12, z: 0.25, r: 0.05 });
    const beak = p.add(
      new THREE.ConeGeometry(0.05, 0.12, 8),
      "#e9b84b",
      0,
      -0.08,
      0.35,
      head,
    );
    beak.rotation.x = Math.PI + 0.3;
    head.rotation.x = 0.2;
    // An open book held up in both wings, with a page that turns.
    body.pose(arms[0], 0.95, 0.45);
    body.pose(arms[1], 0.95, 0.45);
    const book = p.group(0, 0.28, 0.4, hips);
    book.rotation.x = -0.75;
    for (const side of [-1, 1]) {
      const cover = p.add(
        new THREE.BoxGeometry(0.26, 0.34, 0.03),
        "#c8573f",
        side * 0.13,
        0,
        0,
        book,
      );
      cover.rotation.y = side * 0.25;
      const pages = p.add(
        new THREE.BoxGeometry(0.23, 0.3, 0.03),
        "#fbf6ea",
        side * 0.12,
        0,
        0.025,
        book,
      );
      pages.rotation.y = side * 0.25;
    }
    const leaf = p.group(0, 0, 0.05, book);
    p.add(
      new THREE.BoxGeometry(0.22, 0.3, 0.01),
      "#fffdf4",
      0.11,
      0,
      0,
      leaf,
    ).castShadow = false;
    return (t) => {
      const cycle = t % 6;
      leaf.rotation.y = cycle < 1 ? -cycle * Math.PI * 0.85 : 0;
      head.rotation.z = Math.sin(t * 0.7) * 0.06;
      return head;
    };
  },
  // In a peach scarf on a floor cushion, lifting a teacup for a slow sip.
  turtle(p) {
    const body = biped(p, {
      fur: "#9fcf9a",
      cloth: "#9fcf9a",
      hip: 0.08,
      seated: true,
    });
    const { hips, head, arms } = body;
    const front = p.ball(0.24, "#efd9a0", 0, 0.24, 0.12, hips);
    front.scale.set(1, 1.2, 0.6);
    // The shell on its back, with rounded plates.
    const shell = p.ball(0.36, "#c08f5c", 0, 0.3, -0.2, hips);
    shell.scale.set(1.05, 1.1, 0.7);
    for (const [x, y] of [
      [0, 0.42],
      [-0.17, 0.24],
      [0.17, 0.24],
      [0, 0.1],
    ]) {
      const plate = p.ball(0.12, "#dcae72", x, y, -0.43, hips);
      plate.scale.set(1, 1, 0.3);
    }
    const scarf = p.add(
      new THREE.TorusGeometry(0.17, 0.06, 8, 18),
      "#f6b48a",
      0,
      0.6,
      0.03,
      hips,
    );
    scarf.rotation.x = Math.PI / 2;
    const tail = p.capsule(0.05, 0.14, "#f6b48a", 0.12, 0.42, 0.22, hips);
    tail.rotation.z = 0.2;
    const face = p.ball(0.27, "#9fcf9a", 0, 0, 0, head);
    face.scale.set(1.05, 0.95, 1);
    p.eyes(head, { gap: 0.11, y: 0.05, z: 0.24, r: 0.05 });
    p.cheeks(head, { gap: 0.17, y: -0.05, z: 0.21, r: 0.045 });
    p.smile(head, { y: -0.06, z: 0.26, r: 0.05 });
    // A pink teacup in the right paw, steaming.
    const cup = p.group(0, -0.34, 0.03, arms[1]);
    p.tube(0.09, 0.07, 0.13, "#f6b6c2", 0, 0, 0, cup);
    p.tube(0.08, 0.08, 0.01, "#b07a4a", 0, 0.06, 0, cup).castShadow = false;
    const steam = [];
    for (let i = 0; i < 3; i++) {
      const puff = p.add(
        new THREE.SphereGeometry(0.05, 10, 8),
        new THREE.MeshStandardMaterial({
          color: "#ffffff",
          transparent: true,
          opacity: 0.6,
          depthWrite: false,
        }),
        0,
        0,
        0,
        cup,
      );
      puff.castShadow = false;
      steam.push(puff);
    }
    return (t) => {
      // Lift, sip, rest: a slow eight-second loop.
      const phase = t % 8;
      const lift =
        phase < 1.5
          ? phase / 1.5
          : phase < 4
            ? 1
            : phase < 5.5
              ? 1 - (phase - 4) / 1.5
              : 0;
      const eased = lift * lift * (3 - 2 * lift);
      const reach = 0.75 + eased * 1.2;
      body.pose(arms[1], reach, 0.55);
      body.pose(arms[0], 0.8 + eased * 0.9, 0.6);
      cup.rotation.x = reach;
      head.rotation.x = eased * 0.2;
      steam.forEach((puff, i) => {
        const rise = (t * 0.4 + i / 3) % 1;
        puff.position.set(Math.sin(rise * 6 + i) * 0.03, 0.1 + rise * 0.35, 0);
        puff.scale.setScalar(0.6 + rise);
        puff.material.opacity = 0.55 * (1 - rise);
      });
      return head;
    };
  },
};

// Where each resident is in its room (see rooms.js for the furniture), and
// how far round it the friends are kept. They are built about 1.6 tall
// standing, and grown to the heroine's size.
export const SCALE = 1.75;
const SPOTS = {
  frog: { position: [-3.3, 0.13, -2.85], heading: 0.5, radius: 0.8 },
  cat: { position: [3.4, 0.42, -2.8], heading: -0.5, radius: 0.8 },
  rabbit: { position: [1.85, 0, 2.95], heading: 0.6, radius: 0.7 },
  owl: { position: [-3.2, 0.87, 2.3], heading: 0.9, radius: 0.8 },
  turtle: { position: [1.83, 0.22, 1.7], heading: 0.55, radius: 0.8 },
};

export function createResident(kind, parent) {
  const spot = SPOTS[kind];
  const root = new THREE.Group();
  root.name = `mist-${kind}-resident`;
  root.userData.keepSolid = true;
  root.position.set(...spot.position);
  root.rotation.y = spot.heading;
  root.scale.setScalar(SCALE);
  parent.add(root);
  const pose = build[kind](makeParts(root));
  const local = new THREE.Vector3();
  let look = 0;
  return {
    kind,
    group: root,
    blocker: { x: spot.position[0], z: spot.position[2], r: spot.radius },
    // `friend` is the hero's position; the head turns to it when close.
    animate(time, friend) {
      const head = pose(time);
      if (!head || !friend) return;
      local.copy(friend);
      root.worldToLocal(local);
      const near = Math.hypot(local.x, local.z) < 2.4 && local.z > -0.3;
      const want = near
        ? THREE.MathUtils.clamp(Math.atan2(local.x, local.z), -0.7, 0.7)
        : 0;
      look += (want - look) * 0.08;
      head.rotation.y = look;
    },
  };
}
