import * as THREE from "three";
import { createMeshFactory } from "../../rendering/mesh-factory.js";
import { createWinterLabel } from "./gate.js";

export function createSauna({ context, parent, hut }) {
  const group = new THREE.Group();
  group.name = "sauna-interior";
  group.position.copy(hut.position);
  group.visible = false;
  parent.add(group);
  const helpers = createMeshFactory(group);
  const { box, cyl, ball, mesh } = helpers;
  const timber = "#b88452",
    dark = "#563c2b",
    pale = "#dfb87c";
  // An open front and ceiling make this a fixed room view; the walls stay solid.
  box(7.4, 0.24, 6, dark, 0, -0.12, 0);
  for (let i = 0; i < 19; i++)
    box(
      0.36,
      0.045,
      5.85,
      i % 2 ? "#93623e" : "#a37147",
      -3.42 + i * 0.38,
      0.02,
      0,
    );
  const walls = new THREE.Group();
  walls.name = "sauna-wooden-walls";
  group.add(walls);
  box(7.4, 4.5, 0.2, dark, 0, 2.25, -3, walls);
  for (let row = 0; row < 18; row++) {
    box(
      7.2,
      0.22,
      0.12,
      row % 2 ? timber : "#aa7648",
      0,
      0.14 + row * 0.25,
      -2.85,
      walls,
    );
    for (const side of [-1, 1])
      box(0.18, 0.22, 5.8, timber, side * 3.6, 0.14 + row * 0.25, 0, walls);
  }
  for (const x of [-3.3, 0, 3.3])
    box(0.13, 4.5, 0.16, pale, x, 2.25, -2.7, walls);
  const bench = new THREE.Group();
  bench.name = "sauna-bench-for-two";
  group.add(bench);
  for (const z of [-2.25, -1.95, -1.65, -1.35])
    box(4.6, 0.14, 0.25, pale, 0.35, 1, z, bench);
  for (const x of [-1.6, 2.3]) box(0.18, 1, 1.1, timber, x, 0.5, -1.8, bench);
  box(4.6, 0.6, 0.15, timber, 0.35, 1.75, -2.6, bench);
  for (const z of [-0.9, -0.6, -0.3])
    box(4.6, 0.13, 0.25, pale, 0.35, 0.38, z, bench);
  for (const x of [-0.55, 1.15]) {
    box(1.15, 0.035, 0.9, "#f6e2bd", x, 1.09, -1.65, bench);
    for (const dz of [-0.32, 0.32])
      box(1.15, 0.01, 0.06, "#c79a71", x, 1.115, -1.65 + dz, bench);
  }
  const stove = new THREE.Group();
  stove.name = "sauna-hot-stone-stove";
  stove.position.set(-2.55, 0, -0.4);
  group.add(stove);
  box(1.15, 0.2, 1.2, "#7e766b", 0, 0.1, 0, stove);
  cyl(0.53, 0.48, 1.18, "#343d3c", 0, 0.76, 0, stove, 12);
  cyl(0.55, 0.55, 0.1, "#6b7471", 0, 1.32, 0, stove, 12);
  const glow = new THREE.MeshStandardMaterial({
    color: "#d27e3e",
    emissive: "#ff8f30",
    emissiveIntensity: 1.2,
  });
  box(0.5, 0.35, 0.06, glow, 0, 0.6, 0.47, stove);
  for (const x of [-0.2, 0, 0.2])
    box(0.025, 0.4, 0.08, "#313b3a", x, 0.6, 0.52, stove);
  for (let i = 0; i < 9; i++) {
    const angle = i * 2.4;
    const stone = ball(
      0.2,
      i % 2 ? "#717978" : "#959083",
      Math.cos(angle) * (i < 6 ? 0.32 : 0.15),
      1.45 + (i > 5 ? 0.14 : 0),
      Math.sin(angle) * 0.3,
      stove,
    );
    stone.name = "sauna-heated-stone";
    stone.scale.y = 0.65;
  }
  cyl(0.11, 0.11, 2.9, "#3b4543", 0, 2.95, -0.27, stove, 12);
  const bucket = new THREE.Group();
  bucket.name = "sauna-water-bucket";
  bucket.position.set(-1.8, 0, 1.4);
  group.add(bucket);
  cyl(0.35, 0.3, 0.5, timber, 0, 0.28, 0, bucket, 12);
  for (const y of [0.12, 0.43])
    cyl(0.355, 0.355, 0.045, "#697675", 0, y, 0, bucket, 12);
  cyl(0.29, 0.29, 0.025, "#90b2b4", 0, 0.52, 0, bucket, 12);
  const ladle = new THREE.Group();
  ladle.name = "sauna-water-ladle";
  bucket.add(ladle);
  cyl(0.035, 0.035, 0.85, pale, 0.2, 0.72, 0, ladle);
  const bowl = ball(0.14, pale, 0.2, 0.31, 0, ladle);
  bowl.scale.y = 0.45;
  box(1.5, 1.2, 0.13, pale, 2.3, 3.1, -2.64);
  const glass = new THREE.MeshStandardMaterial({
    color: "#b4d5dd",
    emissive: "#8cafc0",
    emissiveIntensity: 0.4,
  });
  box(1.25, 0.98, 0.06, glass, 2.3, 3.1, -2.55);
  box(0.07, 1, 0.08, pale, 2.3, 3.1, -2.49);
  box(1.28, 0.07, 0.08, pale, 2.3, 3.1, -2.49);
  createWinterLabel({
    parent: group,
    helpers,
    text: "SAUN · SOOJUS & RAHU",
    x: -0.25,
    y: 3.65,
    z: -2.65,
    width: 3.4,
  });
  const light = new THREE.PointLight("#ffb363", 16, 12, 2);
  light.position.set(0, 3.8, 0.5);
  group.add(light);
  for (const x of [-3.25, 3.25]) {
    box(0.25, 0.65, 0.25, glow, x, 2.7, -1);
    for (const y of [2.45, 2.62, 2.79, 2.96])
      box(0.3, 0.04, 0.3, pale, x, y, -1);
  }
  const steam = Array.from({ length: 12 }, (_, i) => {
    const puff = mesh(
      new THREE.IcosahedronGeometry(0.28, 1),
      new THREE.MeshBasicMaterial({
        color: "#fff2da",
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
      }),
      0,
      0,
      0,
      group,
    );
    puff.name = "sauna-steam";
    puff.castShadow = puff.receiveShadow = false;
    return { puff, offset: i / 12 };
  });
  const actors = [context.hero, context.companion.character];
  const fill = context.scene.children.find((node) => node.isHemisphereLight);
  let outdoors = [],
    environment = null,
    elapsed = 0,
    boost = 0;
  function update(dt) {
    elapsed += dt;
    boost = Math.max(0, boost - dt * 0.35);
    steam.forEach(({ puff, offset }, i) => {
      const age = (elapsed * 0.19 + offset) % 1;
      puff.position.set(
        -2.55 + Math.sin(i * 2.4 + age * 2) * age * 0.7,
        1.6 + age * 2.5,
        -0.4 + Math.cos(i * 1.7) * age * 0.6,
      );
      puff.scale.setScalar(0.4 + age * 2.1);
      puff.material.opacity = Math.sin(age * Math.PI) * (0.07 + boost * 0.12);
    });
    light.intensity = 16 + Math.sin(elapsed * 1.8) * 0.3;
  }
  return {
    group,
    steam,
    stove,
    ladle,
    doorway: hut.position.clone().add(new THREE.Vector3(0, 0, 3.6)),
    target: hut.position.clone().add(new THREE.Vector3(0, 1.9, -0.7)),
    get elapsed() {
      return elapsed;
    },
    enter() {
      outdoors = parent.children
        .filter((node) => node !== group && !actors.includes(node))
        .map((node) => ({ node, visible: node.visible }));
      outdoors.forEach(({ node }) => {
        node.visible = false;
      });
      group.visible = true;
      environment = {
        background: context.scene.background.clone(),
        fog: context.scene.fog.density,
        sun: context.sun.intensity,
        fill: fill.intensity,
        color: fill.color.clone(),
        ground: fill.groundColor.clone(),
      };
      context.scene.background.set("#34251d");
      context.scene.fog.color.copy(context.scene.background);
      context.scene.fog.density = 0;
      context.sun.intensity = 0.5;
      fill.intensity = 1.6;
      fill.color.set("#ffd6a0");
      fill.groundColor.set("#795337");
      elapsed = 0;
      boost = 0.4;
      update(0);
    },
    leave() {
      bucket.add(ladle);
      ladle.position.set(0, 0, 0);
      ladle.rotation.set(0, 0, 0);
      group.visible = false;
      outdoors.forEach(({ node, visible }) => {
        node.visible = visible;
      });
      outdoors = [];
      if (!environment) return;
      context.scene.background.copy(environment.background);
      context.scene.fog.color.copy(environment.background);
      context.scene.fog.density = environment.fog;
      context.sun.intensity = environment.sun;
      fill.intensity = environment.fill;
      fill.color.copy(environment.color);
      fill.groundColor.copy(environment.ground);
      environment = null;
    },
    pourWater() {
      boost = 1.5;
    },
    holdLadle(hand) {
      hand.add(ladle);
      ladle.position.set(-0.2, -0.4, 0.15);
      ladle.rotation.set(0, 0, -0.25);
    },
    returnLadle() {
      bucket.add(ladle);
      ladle.position.set(0, 0, 0);
      ladle.rotation.set(0, 0, 0);
    },
    update,
  };
}

export function createSaunaOutfits(rigs, helpers) {
  const { cyl, box } = helpers;
  const skin = "#f0bd8a";
  const bareFeet = [];
  const hands = rigs.flatMap((rig) =>
    rig.hands.map((hand) => {
      const original = hand.material;
      const material = original.clone();
      material.color.set(skin);
      return { hand, original, material };
    }),
  );
  rigs.forEach((rig, i) => {
    const parts = [];
    const towel = new THREE.Group();
    towel.name = "sauna-towel-wrap";
    towel.userData.clothingSlot = "torso";
    rig.body.add(towel);
    parts.push(towel);
    const linen = i ? "#a5c3bc" : "#eee0bb";
    const height = i ? 0.6 : 1.04;
    const center = i ? 0.81 : 1.16;
    cyl(0.49, 0.56, height, linen, 0, center, 0, towel, 12);
    for (const y of [center - height / 2 + 0.06, center + height / 2 - 0.04])
      cyl(
        0.51 + (center - y) * 0.07,
        0.51 + (center - y) * 0.07,
        0.045,
        "#faf0d7",
        0,
        y,
        0,
        towel,
        12,
      );
    const fold = box(
      0.07,
      height - 0.12,
      0.04,
      "#faf0d7",
      0.24,
      center,
      0.51,
      towel,
    );
    fold.rotation.z = -0.12;
    parts.push(cyl(0.28, 0.3, 0.15, skin, 0, 1.73, 0.03, rig.body, 12));
    if (i) {
      const torso = cyl(0.44, 0.49, 0.7, skin, 0, 1.36, 0, rig.body, 12);
      torso.name = "sauna-bare-torso";
      parts.push(torso);
    }
    rig.arms.forEach((arm, j) => {
      const bareArm = cyl(
        0.14,
        0.15,
        0.63,
        skin,
        (j ? 1 : -1) * 0.09,
        -0.25,
        0,
        arm,
        10,
      );
      bareArm.name = "sauna-bare-arm";
      parts.push(bareArm);
    });
    rig.legs.forEach((leg) => {
      const bareLeg = box(0.25, 0.65, 0.28, skin, 0, -0.14, 0, leg);
      bareLeg.name = "sauna-bare-leg";
      parts.push(bareLeg);
    });
    rig.feet.forEach((foot) => {
      // The original foot is a boot mesh hidden by the outfit. Put the bare
      // foot beside it, so it remains visible and follows the seated foot pose.
      const bare = box(
        0.32,
        0.16,
        0.49,
        skin,
        foot.position.x,
        foot.position.y,
        foot.position.z + 0.04,
        foot.parent,
      );
      bare.name = "sauna-bare-foot";
      parts.push(bare);
      bareFeet.push({ bare, foot });
    });
    rig.appearance.registerOutfit("sauna", {
      parts,
      hideSlots: [
        "torso",
        "sleeves",
        "trousers",
        "shoes",
        "scarf",
        "headwear",
        "eyewear",
      ],
    });
  });
  return {
    override() {
      const feet = bareFeet.map(({ bare }) => ({
        bare,
        quaternion: bare.quaternion.clone(),
      }));
      hands.forEach(({ hand, material }) => {
        hand.material = material;
      });
      return () => {
        hands.forEach(({ hand, original }) => {
          hand.material = original;
        });
        feet.forEach(({ bare, quaternion }) =>
          bare.quaternion.copy(quaternion),
        );
      };
    },
    poseFeet() {
      bareFeet.forEach(({ bare, foot }) =>
        bare.quaternion.copy(foot.quaternion),
      );
    },
  };
}
