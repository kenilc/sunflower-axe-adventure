import * as THREE from "three";

// The doorway and its trigger share one transform, so moving the arch cannot
// leave an invisible passage behind. Coordinates are relative to the opening.
export function createSeasideGate({ parent, helpers, x, z, destination }) {
  const { mesh, box, ball, cyl } = helpers;
  const group = new THREE.Group();
  group.name = `seaside-gate-${destination}`;
  group.position.set(x, 0, z);
  parent.add(group);
  const wood = "#9f7960",
    rope = "#d8c599";
  for (const side of [-1, 1]) {
    const post = cyl(0.15, 0.24, 3.7, wood, side * 2.35, 1.85, 0, group, 9);
    post.rotation.z = side * -0.025;
    const foot = ball(0.48, "#b7b3ae", side * 2.5, 0.16, 0, group);
    foot.scale.set(1, 0.6, 0.8);
    for (const y of [0.5, 2.8, 3.35]) {
      const knot = mesh(
        new THREE.TorusGeometry(0.19, 0.035, 5, 12),
        rope,
        side * 2.35,
        y,
        0,
        group,
      );
      knot.rotation.x = Math.PI / 2;
    }
    const branch = cyl(0.065, 0.11, 0.9, wood, side * 2.65, 3.55, 0, group, 7);
    branch.rotation.z = side * -1.05;
  }
  const arch = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-2.35, 3.6, 0),
    new THREE.Vector3(0, 6.6, 0),
    new THREE.Vector3(2.35, 3.6, 0),
  );
  mesh(new THREE.TubeGeometry(arch, 28, 0.19, 8, false), wood, 0, 0, 0, group);
  const pearlMaterial = new THREE.MeshStandardMaterial({
    color: "#fff1d6",
    roughness: 0.35,
    emissive: "#d4b78a",
    emissiveIntensity: 0.13,
  });
  for (let i = 0; i <= 18; i++) {
    const point = arch.getPoint(i / 18);
    ball(0.09, pearlMaterial, point.x, point.y - 0.23, 0.12, group);
  }

  const crest = new THREE.Group();
  crest.name = "pearl-shell-crest";
  crest.position.set(0, 5.05, 0.15);
  group.add(crest);
  const shell = new THREE.Shape();
  shell.moveTo(0, 0);
  for (let i = 0; i <= 32; i++) {
    const angle = (Math.PI * i) / 32;
    const radius = 0.86 + Math.sin((i * Math.PI) / 2) * 0.055;
    shell.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius + 0.12);
  }
  shell.lineTo(0, 0);
  mesh(
    new THREE.ExtrudeGeometry(shell, {
      depth: 0.13,
      bevelEnabled: true,
      bevelSize: 0.035,
      bevelThickness: 0.035,
      bevelSegments: 2,
      steps: 1,
    }),
    "#efc2a0",
    0,
    0,
    0,
    crest,
  );
  for (const side of [-1, 1]) {
    for (let i = 1; i < 10; i++) {
      const angle = (Math.PI * i) / 10;
      const rib = cyl(
        0.018,
        0.03,
        0.7,
        "#fff0d4",
        Math.cos(angle) * 0.4,
        Math.sin(angle) * 0.4 + 0.1,
        side > 0 ? 0.19 : -0.055,
        crest,
        6,
      );
      rib.rotation.z = angle - Math.PI / 2;
    }
    ball(0.18, pearlMaterial, 0, 0.07, side > 0 ? 0.23 : -0.09, crest);
  }

  // Sign above head height; both faces read correctly from either approach.
  box(3.95, 0.85, 0.18, "#467e81", 0, 3.83, 0, group);
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#467e81";
  ctx.fillRect(0, 0, 768, 160);
  ctx.fillStyle = "#fff2d7";
  ctx.textAlign = "center";
  ctx.font = "bold 52px sans-serif";
  ctx.fillText(
    destination === "garden" ? "GARDEN PATH" : "SUNSET BEACH",
    384,
    70,
  );
  ctx.font = "24px sans-serif";
  ctx.fillText("WALK THROUGH · OR PRESS X", 384, 122);
  const signMaterial = new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(canvas),
  });
  for (const side of [-1, 1]) {
    const label = mesh(
      new THREE.PlaneGeometry(3.85, 0.8),
      signMaterial,
      0,
      3.83,
      side * 0.105,
      group,
    );
    label.rotation.y = side < 0 ? Math.PI : 0;
    label.castShadow = false;
  }

  const lanterns = [],
    glows = [];
  for (const side of [-1, 1]) {
    const lantern = new THREE.Group();
    lantern.position.set(side * 2.85, 3.15, 0);
    group.add(lantern);
    cyl(0.025, 0.025, 0.6, rope, 0, 0.3, 0, lantern, 6);
    cyl(0.25, 0.32, 0.12, "#527d7c", 0, -0.02, 0, lantern, 8);
    cyl(0.32, 0.26, 0.12, "#527d7c", 0, -0.65, 0, lantern, 8);
    const glow = new THREE.MeshBasicMaterial({
      color: "#ffc884",
      transparent: true,
      opacity: 0.85,
    });
    cyl(0.23, 0.23, 0.55, glow, 0, -0.33, 0, lantern, 8);
    for (let i = 0; i < 4; i++)
      cyl(
        0.025,
        0.025,
        0.62,
        "#527d7c",
        Math.cos((i * Math.PI) / 2) * 0.25,
        -0.33,
        Math.sin((i * Math.PI) / 2) * 0.25,
        lantern,
        5,
      );
    lanterns.push(lantern);
    glows.push(glow);
    for (let i = 0; i < 4; i++) {
      const stem = cyl(
        0.025,
        0.035,
        0.7 + i * 0.12,
        "#869985",
        side * (2.8 + i * 0.15),
        0.35,
        0.4 + Math.sin(i) * 0.3,
        group,
        5,
      );
      stem.rotation.z = side * 0.22;
      ball(
        0.09,
        "#d5b1c8",
        stem.position.x,
        0.78 + i * 0.1,
        stem.position.z,
        group,
      );
    }
  }
  const motes = [];
  for (let i = 0; i < 12; i++) {
    const mote = mesh(
      new THREE.OctahedronGeometry(0.035),
      new THREE.MeshBasicMaterial({
        color: "#ffe6ab",
        transparent: true,
        opacity: 0.75,
      }),
      0,
      0,
      0,
      group,
    );
    mote.castShadow = false;
    motes.push(mote);
  }
  for (let i = 0; i < 8; i++) {
    const plank = box(
      3.7,
      0.045,
      0.55,
      i % 2 ? "#c1a27b" : "#d3b68d",
      0,
      0.025,
      -3 + i * 0.65,
      group,
    );
    plank.receiveShadow = true;
  }
  const local = new THREE.Vector3();
  function localPosition(position) {
    group.updateWorldMatrix(true, false);
    return group.worldToLocal(local.copy(position));
  }
  return {
    group,
    contains(position) {
      const p = localPosition(position);
      return Math.abs(p.x) < 2 && Math.abs(p.z) < 0.95;
    },
    nearby(position) {
      const p = localPosition(position);
      return Math.abs(p.x) < 2.6 && Math.abs(p.z) < 3.6;
    },
    animate(time) {
      lanterns.forEach((lantern, i) => {
        lantern.rotation.z = Math.sin(time * 1.4 + i * 2) * 0.045;
        glows[i].opacity = 0.8 + Math.sin(time * 2.1 + i) * 0.08;
      });
      motes.forEach((mote, i) => {
        mote.position.set(
          Math.sin(i * 2.4 + time * 0.2) * 1.9,
          0.5 + ((i * 0.37 + time * 0.15) % 2.7),
          Math.cos(i * 1.7 + time * 0.18) * 0.6,
        );
        mote.rotation.y = time + i;
      });
    },
  };
}
