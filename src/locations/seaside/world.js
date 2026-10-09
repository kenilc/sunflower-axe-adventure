import * as THREE from "three";
import { BEACH_FINDS } from "../../systems/keepsakes.js";

export function createSeaside({ scene, garden, helpers, keepsakes }) {
  const { mesh, box, ball, cyl } = helpers;
  const group = new THREE.Group();
  group.name = "sunset-seaside";
  scene.add(group);
  const blockers = [];
  const heightAt = () => 0;
  const contains = (x, z) => Math.abs(x) <= 29 && z >= -18 && z <= 24;
  const sand = mesh(
    new THREE.BoxGeometry(76, 0.6, 50, 50, 1, 1),
    "#e6c296",
    0,
    -0.3,
    7,
    group,
  );
  const sandVertices = sand.geometry.attributes.position;
  for (let i = 0; i < sandVertices.count; i++) {
    if (sandVertices.getZ(i) < 0)
      sandVertices.setZ(
        i,
        sandVertices.getZ(i) + Math.sin(sandVertices.getX(i) * 0.16) * 0.55,
      );
  }
  sand.geometry.computeVertexNormals();
  box(100, 0.02, 9, "#bc9e86", 0, -0.04, -21, group);

  // A sky dome keeps the sunset visible while orbiting or taking photos.
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(240, 32, 20),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      toneMapped: false,
      uniforms: {
        top: { value: new THREE.Color("#655b91") },
        middle: { value: new THREE.Color("#e89a94") },
        bottom: { value: new THREE.Color("#ffd5a1") },
      },
      vertexShader:
        "varying vec3 direction; void main() { direction = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader:
        "uniform vec3 top; uniform vec3 middle; uniform vec3 bottom; varying vec3 direction; void main() { float h = normalize(direction).y; vec3 color = mix(bottom, middle, smoothstep(-0.05, 0.22, h)); color = mix(color, top, smoothstep(0.18, 0.85, h)); gl_FragColor = vec4(color, 1.0);\n#include <colorspace_fragment>\n }",
    }),
  );
  sky.renderOrder = -2;
  group.add(sky);
  const sun = mesh(
    new THREE.SphereGeometry(9, 32, 20),
    new THREE.MeshBasicMaterial({ color: "#ffdf9b", fog: false }),
    -22,
    13,
    -150,
    group,
  );
  sun.castShadow = false;
  const sea = mesh(
    new THREE.PlaneGeometry(480, 230, 80, 50),
    new THREE.MeshStandardMaterial({
      color: "#7a9fa9",
      roughness: 0.36,
      metalness: 0.18,
    }),
    0,
    -0.12,
    -136,
    group,
  );
  sea.rotation.x = -Math.PI / 2;
  sea.castShadow = false;
  const foam = [];
  for (let i = 0; i < 5; i++) {
    const line = mesh(
      new THREE.PlaneGeometry(100, 0.12 + i * 0.04),
      new THREE.MeshBasicMaterial({
        color: "#fff0df",
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      }),
      0,
      0.01,
      -21 - i * 3.8,
      group,
    );
    line.rotation.x = -Math.PI / 2;
    foam.push(line);
  }
  const reflections = [];
  for (let i = 0; i < 36; i++) {
    const strip = mesh(
      new THREE.PlaneGeometry(1.5 + i * 0.17, 0.16 + i * 0.014),
      new THREE.MeshBasicMaterial({
        color: "#ffd8a0",
        transparent: true,
        opacity: 0.36,
        depthWrite: false,
      }),
      -22 + Math.sin(i * 4.1) * 2,
      0.04,
      -146 + i * 3.25,
      group,
    );
    strip.rotation.x = -Math.PI / 2;
    reflections.push(strip);
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const x = side * (31 + (i % 3) * 2),
        z = 22 - i * 4.3;
      const dune = ball(4, "#d9b68c", x, -1.5, z, group);
      dune.scale.set(1.3, 0.55, 1);
      for (let j = 0; j < 7; j++) {
        const reed = cyl(
          0.025,
          0.05,
          1.1 + j * 0.08,
          "#8e986a",
          x + Math.sin(j * 2) * 1.4,
          0.45,
          z + Math.cos(j * 2) * 1.1,
          group,
          4,
        );
        reed.rotation.z = Math.sin(j) * 0.25;
      }
    }
  }
  for (const [x, z, r] of [
    [-25, 10, 1.6],
    [24, 14, 1.8],
    [-27, -7, 1.2],
  ]) {
    const rock = ball(r, "#92919a", x, r * 0.25, z, group);
    rock.scale.set(1, 0.65, 0.85);
    blockers.push({ x, z, r });
  }
  const driftwood = cyl(0.2, 0.27, 5, "#997c69", 18, 0.2, 17, group);
  driftwood.rotation.z = Math.PI / 2;
  driftwood.rotation.y = 0.4;
  blockers.push({ x: 18, z: 17, r: 2.6 });

  function sign(parent, x, z, beach) {
    const marker = new THREE.Group();
    marker.position.set(x, 0, z);
    parent.add(marker);
    for (const dx of [-2.2, 2.2])
      cyl(0.1, 0.14, 3.8, "#99745c", dx, 1.9, 0, marker);
    box(5, 0.75, 0.22, "#d9ad75", 0, 3.6, 0, marker);
    // Sun over waves: a recognizable coastal trail marker, no image assets.
    ball(0.25, "#ffd789", 0, 3.65, 0.18, marker);
    for (let i = 0; i < 3; i++)
      box(0.85, 0.045, 0.06, "#6d9da2", (i - 1) * 0.8, 3.36, 0.17, marker);
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f5deaf";
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = "#664e46";
    ctx.font = "bold 42px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(beach ? "SUNSET BEACH" : "GARDEN PATH", 256, 80);
    const label = mesh(
      new THREE.PlaneGeometry(4.2, 1.05),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(canvas),
        side: THREE.DoubleSide,
      }),
      0,
      2.55,
      0.18,
      marker,
    );
    label.castShadow = false;
    return marker;
  }
  const entrance = sign(garden, 23, 25, true);
  sign(group, -6, 23, false);
  box(4, 0.025, 6, "#e2c5a0", 23, 0.02, 23, garden);

  const distantMaterial = new THREE.MeshBasicMaterial({
    color: "#8d8097",
    fog: false,
  });
  for (const [x, z, radius] of [
    [-105, -185, 32],
    [-130, -180, 23],
    [100, -200, 26],
    [125, -190, 20],
  ]) {
    const headland = mesh(
      new THREE.SphereGeometry(radius, 12, 8),
      distantMaterial,
      x,
      -radius * 0.75,
      z,
      group,
    );
    headland.scale.set(1.5, 0.5, 1);
    headland.position.y = -radius * 0.38;
    headland.castShadow = false;
  }
  const gulls = [];
  for (let i = 0; i < 5; i++) {
    const bird = new THREE.Group();
    bird.position.set(-34 + i * 17, 18 + Math.sin(i * 2) * 4, -85 - i * 8);
    group.add(bird);
    for (const side of [-1, 1]) {
      const wing = box(0.9, 0.055, 0.18, "#70677e", side * 0.43, 0, 0, bird);
      wing.rotation.z = side * 0.25;
      wing.castShadow = false;
    }
    gulls.push(bird);
  }
  for (let i = 0; i < 65; i++) {
    const x = Math.sin(i * 7.3) * 28,
      z = Math.cos(i * 2.6) * 18 + 2;
    const pebble = ball(
      0.045 + (i % 3) * 0.018,
      i % 2 ? "#c1a98f" : "#f0d8b4",
      x,
      0.025,
      z,
      group,
    );
    pebble.scale.y = 0.4;
    pebble.castShadow = false;
  }

  const finds = BEACH_FINDS.map((item, index) => {
    const model = new THREE.Group();
    model.name = item.id;
    model.position.set(item.x, 0.06, item.z);
    model.rotation.y = index * 1.8;
    group.add(model);
    if (item.kind === "stone") {
      const stone = ball(0.45, item.color, 0, 0.13, 0, model);
      stone.scale.set(1, 0.52, 0.8);
      const band = mesh(
        new THREE.TorusGeometry(0.32, 0.022, 4, 18),
        "#f8e7cd",
        0,
        0.14,
        0,
        model,
      );
      band.rotation.x = Math.PI / 2;
      band.scale.set(1.15, 0.8, 1);
    } else {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      for (let j = 0; j <= 24; j++) {
        const angle = (Math.PI * j) / 24;
        const radius = 0.57 + Math.sin((j * Math.PI) / 2) * 0.025;
        shape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius + 0.14);
      }
      shape.lineTo(0, 0);
      const shell = mesh(
        new THREE.ExtrudeGeometry(shape, {
          depth: 0.07,
          bevelEnabled: true,
          bevelSize: 0.03,
          bevelThickness: 0.025,
          bevelSegments: 1,
          steps: 1,
        }),
        item.color,
        0,
        0.12,
        0.32,
        model,
      );
      shell.rotation.x = -Math.PI / 2;
      for (let j = 1; j < 8; j++) {
        const angle = (Math.PI * j) / 8;
        const rib = cyl(
          0.012,
          0.02,
          0.46,
          "#fff0d9",
          Math.cos(angle) * 0.25,
          0.15,
          0.23 - Math.sin(angle) * 0.25,
          model,
          5,
        );
        rib.rotation.set(Math.PI / 2, 0, Math.PI / 2 - angle);
      }
    }
    const sparkle = mesh(
      new THREE.OctahedronGeometry(0.09),
      new THREE.MeshBasicMaterial({ color: "#fff1bd" }),
      0,
      0.8,
      0,
      model,
    );
    model.visible = !keepsakes.has(item.id);
    return { ...item, model, sparkle };
  });
  function sync() {
    finds.forEach((find) => {
      find.model.visible = !keepsakes.has(find.id);
    });
  }
  return {
    group,
    entrance,
    blockers,
    finds,
    heightAt,
    contains,
    sync,
    nearest(position) {
      return finds
        .filter(({ model }) => model.visible)
        .find(
          ({ model }) =>
            Math.hypot(
              position.x - model.position.x,
              position.z - model.position.z,
            ) < 1.65,
        );
    },
    animate(time) {
      gulls.forEach((bird, i) => {
        bird.position.x = -34 + i * 17 + Math.sin(time * 0.06 + i) * 6;
        bird.children.forEach((wing, j) => {
          wing.rotation.z =
            (j === 0 ? -1 : 1) * (0.15 + Math.sin(time * 2 + i) * 0.18);
        });
      });
      const positions = sea.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++)
        positions.setZ(
          i,
          Math.sin(positions.getX(i) * 0.16 + time * 0.8) *
            Math.cos(positions.getY(i) * 0.17 + time * 0.6) *
            0.1,
        );
      positions.needsUpdate = true;
      foam.forEach((line, i) => {
        line.position.z = -21 - i * 3.8 + Math.sin(time * 0.6 + i) * 0.8;
        line.material.opacity = 0.22 + Math.sin(time * 0.6 + i) * 0.12;
      });
      reflections.forEach((line, i) => {
        line.material.opacity = 0.22 + Math.sin(time * 1.4 + i * 2) * 0.13;
      });
      finds.forEach(({ sparkle }, i) => {
        sparkle.rotation.y = time;
        sparkle.position.y = 0.8 + Math.sin(time * 2 + i) * 0.1;
      });
    },
  };
}
