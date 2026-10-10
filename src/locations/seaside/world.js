import * as THREE from "three";
import { createSunsetSpot } from "./sunset-rest.js";
import { createBeachAmbience } from "./ambience.js";
import { createSeasideGate } from "./gate.js";
import { BEACH_FINDS } from "../../systems/keepsakes.js";
import { createShoreLife } from "./shore-life.js";
import { createSandcastle } from "./sandcastle.js";
import { createCoastalLandscape } from "./landscape.js";

export function createSeaside({
  scene,
  garden,
  helpers,
  keepsakes,
  hero,
  companion,
}) {
  const { mesh, box, ball, cyl } = helpers;
  const group = new THREE.Group();
  group.name = "sunset-seaside";
  scene.add(group);
  const blockers = [];
  let elapsed = 0;
  const heightAt = () => 0;
  const contains = (x, z) => Math.abs(x) <= 29 && z >= -18 && z <= 24;
  // Continue the coast past the camera's far plane in every supported view.
  // Scenery is wider than the walking terrain so orbiting never reveals edges.
  const sand = mesh(
    new THREE.BoxGeometry(1400, 0.6, 900, 280, 1, 1),
    "#e6c296",
    0,
    -0.3,
    432,
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
  sand.name = "continuous-beach-sand";
  const wetSand = box(1400, 0.02, 12, "#bc9e86", 0, -0.04, -21, group);
  wetSand.name = "continuous-wet-sand";

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
    new THREE.PlaneGeometry(1400, 1400, 64, 64),
    new THREE.MeshStandardMaterial({
      color: "#5b9dab",
      roughness: 0.36,
      metalness: 0.05,
    }),
    0,
    -0.12,
    -500,
    group,
  );
  sea.name = "continuous-sea";
  sea.rotation.x = -Math.PI / 2;
  sea.castShadow = false;
  const ambience = createBeachAmbience({ parent: group, helpers });
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

  const sunsetSpot = createSunsetSpot({ parent: group, helpers });
  blockers.push(sunsetSpot.blocker);
  const shoreLife = createShoreLife({
    parent: group,
    helpers,
    actors: [hero, companion.character],
    blockers,
  });
  const sandcastle = createSandcastle({ parent: group, helpers, blockers });
  const landscape = createCoastalLandscape({
    parent: group,
    helpers,
    blockers,
  });

  const entranceGate = createSeasideGate({
    parent: garden,
    helpers,
    x: 23,
    z: 25,
    destination: "seaside",
  });
  const returnGate = createSeasideGate({
    parent: group,
    helpers,
    x: -6,
    z: 23,
    destination: "garden",
  });

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
    entrance: entranceGate.group,
    entranceGate,
    returnGate,
    animateGates(time) {
      if (garden.visible) entranceGate.animate(time);
      if (group.visible) returnGate.animate(time);
    },
    blockers,
    ambience,
    sunsetSpot,
    shoreLife,
    sandcastle,
    landscape,
    sea,
    sand,
    wetSand,
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
    animate(dt) {
      ambience.update(dt);
      shoreLife.update(dt);
      elapsed += dt;
      const time = elapsed;
      sandcastle.update(time);
      landscape.update(time);
      const positions = sea.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++)
        positions.setZ(
          i,
          Math.sin(positions.getX(i) * 0.16 + time * 0.8) *
            Math.cos(positions.getY(i) * 0.17 + time * 0.6) *
            0.1,
        );
      positions.needsUpdate = true;
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
