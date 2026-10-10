import * as THREE from "three";

export function createBeachOutfits({ rigs, helpers }) {
  const { box, cyl, ball } = helpers;
  rigs.forEach((rig, index) => {
    const parts = [];
    const shirt = new THREE.Group();
    shirt.name = "beach-shirt";
    shirt.userData.clothingSlot = "torso";
    rig.body.add(shirt);
    parts.push(shirt);
    const color = index ? "#a4d3c5" : "#fff2d6";
    cyl(0.45, 0.53, 0.78, color, 0, 1.28, 0, shirt, 12);
    parts.push(cyl(0.29, 0.32, 0.12, "#f0bd8a", 0, 1.72, 0.03, rig.body, 12));
    if (index) {
      for (let i = 0; i < 4; i++)
        ball(0.026, "#fff2d6", 0, 1.5 - i * 0.14, 0.49, shirt);
      for (const side of [-1, 1]) {
        const collar = box(
          0.14,
          0.22,
          0.045,
          "#d1e9d9",
          side * 0.12,
          1.6,
          0.43,
          shirt,
        );
        collar.rotation.z = side * -0.3;
      }
    } else {
      for (let i = 0; i < 5; i++) {
        const y = 0.99 + i * 0.13,
          radius = 0.52 - i * 0.013;
        cyl(radius, radius + 0.006, 0.045, "#79b7b5", 0, y, 0, shirt, 12);
      }
    }
    rig.legs.forEach((leg) => {
      const shorts = new THREE.Group();
      shorts.name = "beach-shorts";
      shorts.userData.clothingSlot = "trousers";
      leg.add(shorts);
      parts.push(shorts);
      box(0.34, 0.32, 0.37, index ? "#d3b48a" : "#d89082", 0, 0.04, 0, shorts);
      box(0.35, 0.045, 0.38, index ? "#e3caa8" : "#e9b19b", 0, -0.1, 0, shorts);
      parts.push(box(0.24, 0.35, 0.26, "#f0bd8a", 0, -0.25, 0, leg));
      const sandal = new THREE.Group();
      sandal.name = "beach-sandal";
      sandal.userData.clothingSlot = "shoes";
      sandal.position.set(0, -0.42, 0.09);
      leg.add(sandal);
      parts.push(sandal);
      box(0.34, 0.075, 0.5, "#997352", 0, -0.07, 0, sandal);
      box(0.27, 0.11, 0.37, "#f0bd8a", 0, 0.02, -0.01, sandal);
      box(0.29, 0.045, 0.075, "#b58b5b", 0, 0.085, 0.05, sandal);
      box(0.05, 0.04, 0.24, "#b58b5b", 0, 0.085, 0.03, sandal);
    });
    rig.arms.forEach((arm, i) => {
      const sleeve = new THREE.Group();
      sleeve.name = "beach-short-sleeve";
      sleeve.userData.clothingSlot = "sleeves";
      arm.add(sleeve);
      parts.push(sleeve);
      box(0.34, 0.23, 0.38, color, (i ? 1 : -1) * 0.09, -0.07, 0, sleeve);
      parts.push(
        cyl(0.13, 0.14, 0.5, "#f0bd8a", (i ? 1 : -1) * 0.09, -0.43, 0.02, arm),
      );
      // An independent skin mesh covers the heroine's winter glove without
      // changing the shared model material or her hand/held-item anchors.
      parts.push(
        ball(
          index ? 0.175 : 0.195,
          "#f0bd8a",
          (i ? 1 : -1) * 0.1,
          -0.63,
          0.03,
          arm,
        ),
      );
    });
    rig.appearance.registerOutfit("beach", {
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
  let releases = [];
  return {
    set(active) {
      releases.forEach((release) => release());
      releases = active
        ? rigs.map((rig, index) =>
            rig.appearance.override({
              outfit: "beach",
              accessories: {
                scarf: null,
                harness: null,
                ...(index ? { headwear: null } : {}),
              },
            }),
          )
        : [];
    },
  };
}
