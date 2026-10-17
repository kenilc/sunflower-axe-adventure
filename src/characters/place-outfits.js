import * as THREE from "three";
import { createMeshFactory } from "../rendering/mesh-factory.js";

const SKIN = "#f0bd8a";

// Clothes for each scene, as [heroine, companion]. She keeps her sunflower
// hood everywhere; he wears the hat listed, or none so his fringe shows.
// Places opt in with `outfit: "<id>"`; rooms wear their place's outfit.
// The winter village, beach and festival keep their own outfits.
export const PLACE_OUTFITS = {
  garden: [
    {
      torso: "#7fa65a",
      trim: "#f4efe2",
      buttons: "#f4efe2",
      sleeves: "long",
      legs: { style: "trousers", color: "#8fa9c4" },
      shoes: { style: "boots", color: "#7a5a3e" },
    },
    {
      torso: "#9cc0d8",
      collar: "#eaf2f6",
      buttons: "#f4efe2",
      sleeves: "short",
      legs: { style: "trousers", color: "#c9b48a" },
      shoes: { style: "shoes", color: "#f4efe2" },
    },
  ],
  polder: [
    {
      torso: "#f4efe2",
      stripes: "#2f4f7f",
      sleeves: "long",
      legs: { style: "cropped", color: "#c8573f" },
      shoes: { style: "clogs", color: "#f2c14e" },
    },
    {
      torso: "#5b7fa8",
      collar: "#7d9cc0",
      buttons: "#f4efe2",
      sleeves: "rolled",
      legs: { style: "trousers", color: "#7a5a3e" },
      shoes: { style: "clogs", color: "#f2c14e" },
      hat: { style: "flat-cap", color: "#6b5a44" },
    },
  ],
  lavender: [
    {
      torso: "#f6f0e4",
      skirt: "#9b77c9",
      dress: true,
      trim: "#f4efe2",
      sleeves: "short",
      legs: { style: "tights", color: "#f0bd8a" },
      shoes: { style: "shoes", color: "#c9b48a" },
    },
    {
      torso: "#f4ead8",
      collar: "#fbf6ec",
      sleeves: "rolled",
      legs: { style: "trousers", color: "#d8c69a" },
      shoes: { style: "shoes", color: "#c9b48a" },
      hat: { style: "straw", color: "#e6cf8f" },
    },
  ],
  // Cosy knits for a misty evening: her plum pinafore, his mustard jumper.
  mist: [
    {
      torso: "#f0e6da",
      skirt: "#7b5a8f",
      dress: true,
      trim: "#d9c7e6",
      sleeves: "long",
      legs: { style: "tights", color: "#5b4a6b" },
      shoes: { style: "boots", color: "#5c4433" },
    },
    {
      torso: "#d9a441",
      collar: "#f0e6da",
      sleeves: "long",
      legs: { style: "trousers", color: "#4a5068" },
      shoes: { style: "boots", color: "#5c4433" },
      hat: { style: "bucket", color: "#7f8a9e" },
    },
  ],
  funfair: [
    {
      torso: "#f2a7b8",
      collar: "#ffffff",
      sleeves: "long",
      legs: { style: "shorts", color: "#6f8fb8" },
      shoes: { style: "shoes", color: "#d9534f" },
    },
    {
      torso: "#c8573f",
      sleeveColor: "#f4efe2",
      buttons: "#f4efe2",
      sleeves: "long",
      legs: { style: "trousers", color: "#3f4f6b" },
      shoes: { style: "shoes", color: "#f4efe2" },
      hat: { style: "cap", color: "#2f5f8a" },
    },
  ],
  riverside: [
    {
      torso: "#3f8f8a",
      trim: "#f2cf86",
      sleeves: "long",
      legs: { style: "shorts", color: "#b8a07a" },
      shoes: { style: "boots", color: "#6b4a2a" },
    },
    {
      torso: "#e08a4c",
      trim: "#5c4433",
      sleeves: "long",
      legs: { style: "trousers", color: "#6f7a4a" },
      shoes: { style: "boots", color: "#5c4433" },
      hat: { style: "bucket", color: "#d8c69a" },
    },
  ],
  cave: [
    {
      torso: "#c2a878",
      pockets: "#a68d5f",
      sleeves: "rolled",
      legs: { style: "trousers", color: "#7a5a3e" },
      shoes: { style: "boots", color: "#4a3a2e" },
    },
    {
      torso: "#7d8a5a",
      pockets: "#66724a",
      sleeves: "rolled",
      legs: { style: "trousers", color: "#b8a07a" },
      shoes: { style: "boots", color: "#4a3a2e" },
      hat: { style: "explorer", color: "#d8c69a" },
    },
  ],
  castle: [
    {
      torso: "#6c5fb0",
      trim: "#e2c46a",
      dress: true,
      sleeves: "long",
      legs: { style: "tights", color: "#f4efe2" },
      shoes: { style: "shoes", color: "#e2c46a" },
    },
    {
      torso: "#2f3f6b",
      trim: "#e2c46a",
      buttons: "#e2c46a",
      sleeves: "long",
      legs: { style: "trousers", color: "#f4efe2" },
      shoes: { style: "boots", color: "#2f2f2f" },
    },
  ],
  village: [
    {
      torso: "#3f6b4f",
      skirt: "#c8573f",
      apron: "#f4efe2",
      dress: true,
      sleeveColor: "#f4efe2",
      sleeves: "short",
      legs: { style: "tights", color: "#f4efe2" },
      shoes: { style: "shoes", color: "#2f2f2f" },
    },
    {
      torso: "#f4efe2",
      braces: "#7a5a3e",
      sleeves: "rolled",
      legs: { style: "lederhosen", color: "#7a5a3e" },
      shoes: { style: "shoes", color: "#6b4a2a" },
      hat: { style: "alpine", color: "#4f6b3f" },
    },
  ],
};

// Builds one outfit's parts onto a rig, in the clothing slots the winter
// clothes use, so the appearance controller can swap them.
function buildOutfit(rig, index, look, { box, cyl, ball, mesh }) {
  const parts = [];
  const slot = (name, parent, label) => {
    const group = new THREE.Group();
    group.name = label;
    group.userData.clothingSlot = name;
    parent.add(group);
    parts.push(group);
    return group;
  };

  // Torso, as a shirt or a dress that flares over the hips.
  const torso = slot("torso", rig.body, "outfit-torso");
  if (look.dress) {
    cyl(0.45, 0.53, 0.5, look.torso, 0, 1.43, 0, torso, 12);
    cyl(0.5, 0.78, 0.62, look.skirt ?? look.torso, 0, 0.92, 0, torso, 12);
    if (look.trim) cyl(0.79, 0.79, 0.07, look.trim, 0, 0.64, 0, torso, 12);
    if (look.apron) box(0.6, 0.55, 0.06, look.apron, 0, 0.98, 0.6, torso);
  } else cyl(0.45, 0.53, 0.78, look.torso, 0, 1.28, 0, torso, 12);
  if (look.stripes)
    for (let i = 0; i < 5; i++) {
      const y = 0.99 + i * 0.13,
        radius = 0.52 - i * 0.013;
      cyl(radius, radius + 0.006, 0.045, look.stripes, 0, y, 0, torso, 12);
    }
  if (look.trim && !look.dress)
    cyl(0.535, 0.535, 0.07, look.trim, 0, 0.92, 0, torso, 12);
  if (look.buttons)
    for (let i = 0; i < 4; i++)
      ball(0.03, look.buttons, 0, 1.52 - i * 0.15, 0.49, torso);
  if (look.collar)
    for (const side of [-1, 1])
      box(
        0.15,
        0.22,
        0.045,
        look.collar,
        side * 0.12,
        1.6,
        0.43,
        torso,
      ).rotation.z = side * -0.3;
  if (look.pockets)
    for (const side of [-1, 1])
      box(0.2, 0.18, 0.04, look.pockets, side * 0.2, 1.42, 0.47, torso);
  if (look.braces)
    for (const side of [-1, 1])
      box(0.08, 0.8, 0.05, look.braces, side * 0.2, 1.3, 0.48, torso);
  parts.push(cyl(0.29, 0.32, 0.12, SKIN, 0, 1.72, 0.03, rig.body, 12));

  // Sleeves: long to the wrist, rolled to the elbow, or short.
  rig.arms.forEach((arm, i) => {
    const x = (i ? 1 : -1) * 0.09;
    const sleeve = slot("sleeves", arm, "outfit-sleeve");
    const color = look.sleeveColor ?? look.torso;
    if (look.sleeves === "long")
      box(0.34, 0.6, 0.38, color, x, -0.25, 0, sleeve);
    else {
      const length = look.sleeves === "rolled" ? 0.38 : 0.25;
      box(0.34, length, 0.38, color, x, -0.07 - (length - 0.25) / 2, 0, sleeve);
      parts.push(cyl(0.13, 0.14, 0.5, SKIN, x, -0.43, 0.02, arm));
    }
    parts.push(ball(index ? 0.175 : 0.195, SKIN, x * 1.1, -0.63, 0.03, arm));
  });

  // Legs: trousers, cropped trousers, shorts, lederhosen or tights, and
  // shoes, boots or clogs.
  rig.legs.forEach((leg) => {
    const legs = slot("trousers", leg, "outfit-legs");
    const { style, color } = look.legs;
    if (style === "trousers") box(0.35, 0.66, 0.38, color, 0, -0.12, 0, legs);
    else if (style === "cropped") {
      box(0.35, 0.5, 0.38, color, 0, -0.04, 0, legs);
      parts.push(box(0.24, 0.2, 0.26, SKIN, 0, -0.36, 0, leg));
    } else if (style === "tights")
      box(0.27, 0.62, 0.29, color, 0, -0.12, 0, legs);
    else {
      box(0.35, 0.32, 0.38, color, 0, 0.04, 0, legs);
      const socks = style === "lederhosen" ? "#f4efe2" : SKIN;
      parts.push(box(0.24, 0.35, 0.26, socks, 0, -0.25, 0, leg));
    }
    const shoe = slot("shoes", leg, "outfit-shoe");
    shoe.position.set(0, -0.45, 0.1);
    const { style: kind, color: shoeColor } = look.shoes;
    if (kind === "boots") {
      box(0.36, 0.3, 0.5, shoeColor, 0, 0.03, 0, shoe);
      box(0.38, 0.05, 0.54, "#3a2e26", 0, -0.11, 0, shoe);
    } else if (kind === "clogs") {
      const toe = ball(0.24, shoeColor, 0, -0.02, 0.08, shoe);
      toe.scale.set(0.85, 0.6, 1.35);
      box(0.34, 0.2, 0.32, shoeColor, 0, -0.02, -0.12, shoe);
    } else box(0.35, 0.2, 0.52, shoeColor, 0, 0, 0, shoe);
  });

  // His hat; without one his winter beanie comes off and his fringe shows.
  if (index && look.hat) {
    const hat = slot("headwear", rig.head, "outfit-hat");
    const { style, color } = look.hat;
    // In head space his hair crown tops out near 1.0; hats sit over it.
    if (style === "flat-cap") {
      const crown = ball(0.62, color, 0, 0.76, 0.02, hat);
      crown.scale.set(1, 0.45, 1.05);
      box(0.6, 0.06, 0.36, color, 0, 0.74, 0.66, hat).rotation.x = 0.15;
    } else if (style === "cap") {
      const crown = ball(0.6, color, 0, 0.76, 0, hat);
      crown.scale.set(1, 0.6, 1);
      box(0.62, 0.05, 0.44, color, 0, 0.74, 0.7, hat);
    } else if (style === "bucket") {
      cyl(0.52, 0.6, 0.4, color, 0, 0.9, 0, hat, 12);
      cyl(0.84, 0.84, 0.06, color, 0, 0.72, 0, hat, 14);
    } else if (style === "explorer") {
      const crown = ball(0.62, color, 0, 0.84, 0, hat);
      crown.scale.set(1, 0.72, 1);
      cyl(0.97, 0.97, 0.06, color, 0, 0.72, 0, hat, 16);
      cyl(0.64, 0.64, 0.09, "#7a5a3e", 0, 0.8, 0, hat, 16);
    } else if (style === "straw") {
      cyl(0.52, 0.56, 0.32, color, 0, 0.9, 0, hat, 12);
      cyl(0.57, 0.57, 0.09, "#4f6b8f", 0, 0.8, 0, hat, 12);
      cyl(0.95, 0.95, 0.05, color, 0, 0.73, 0, hat, 16);
    } else if (style === "alpine") {
      cyl(0.45, 0.58, 0.44, color, 0, 0.95, 0, hat, 10);
      cyl(0.82, 0.82, 0.06, color, 0, 0.74, 0, hat, 14);
      const feather = mesh(
        new THREE.ConeGeometry(0.06, 0.55, 5),
        "#f4efe2",
        0.42,
        1.12,
        -0.15,
        hat,
      );
      feather.rotation.z = -0.5;
    }
  }
  return parts;
}

export function createPlaceOutfits({ scene, rigs }) {
  const helpers = createMeshFactory(scene);
  for (const [id, looks] of Object.entries(PLACE_OUTFITS))
    rigs.forEach((rig, index) => {
      const look = looks[index];
      const parts = buildOutfit(rig, index, look, helpers);
      for (const part of parts) {
        part.traverse((node) => {
          if (node.isMesh) node.castShadow = node.receiveShadow = true;
        });
      }
      rig.appearance.registerOutfit(id, {
        parts,
        hideSlots: [
          "torso",
          "sleeves",
          "trousers",
          "shoes",
          "scarf",
          ...(index ? ["headwear"] : []),
        ],
      });
    });
  let worn = null,
    releases = [];
  return {
    get worn() {
      return worn;
    },
    // After the appearance resets, nothing is worn any more.
    forget() {
      worn = null;
      releases = [];
    },
    // Wear a scene's outfit, or the winter clothes when `id` is null.
    wear(id) {
      if (id === worn) return;
      releases.forEach((release) => release());
      worn = id;
      releases = id
        ? rigs.map((rig, index) => rig.appearance.override({ outfit: id }))
        : [];
    },
  };
}
