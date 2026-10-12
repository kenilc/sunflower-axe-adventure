import * as THREE from "three";
import { createRandom } from "../systems/random.js";

const TAU = Math.PI * 2;

// A place's ground as a round diorama board: a grass top with a lip, soil
// and stone bands down the side, and a rocky underside tapering below, so
// the place reads as a little world of its own rather than land that stops.
export function createDioramaBase({
  parent,
  mesh,
  radius,
  top = 0,
  grass,
  soil = "#a47c5b",
  stone = "#b7aa97",
  rock = "#8e8475",
  segments = 40,
  seed = 11,
}) {
  const rand = createRandom(seed);
  const group = new THREE.Group();
  group.name = "diorama-base";
  parent.add(group);
  let y = top;
  // Each band runs from `y` downwards, narrowing from `from` to `to`.
  function band(name, color, height, from, to) {
    const part = mesh(
      new THREE.CylinderGeometry(from, to, height, segments),
      color,
      0,
      y - height / 2,
      0,
      group,
    );
    part.name = name;
    y -= height;
    return part;
  }
  band("diorama-grass", grass, 0.5, radius + 0.25, radius);
  band("diorama-soil", soil, 1.8, radius, radius - 0.5);
  band("diorama-stone", stone, 1.4, radius - 0.5, radius - 1.6);
  const underside = band(
    "diorama-underside",
    rock,
    radius * 0.32,
    radius - 1.6,
    radius * 0.18,
  );
  underside.castShadow = false;
  // Rocks half set into the soil band break up the smooth side.
  const count = Math.round(radius * 0.9);
  for (let i = 0; i < count; i++) {
    const angle = ((i + rand() * 0.5) / count) * TAU,
      depth = 0.75 + rand() * 1.3,
      // The soil narrows by 0.5 over its 1.8 height.
      edge = radius - ((depth - 0.5) / 1.8) * 0.5,
      size = 0.3 + rand() * 0.4;
    const stoneBit = mesh(
      new THREE.IcosahedronGeometry(size, 0),
      rand() < 0.6 ? stone : rock,
      Math.cos(angle) * (edge - size * 0.4),
      top - depth,
      Math.sin(angle) * (edge - size * 0.4),
      group,
    );
    stoneBit.rotation.set(rand() * TAU, rand() * TAU, 0);
    stoneBit.scale.y = 0.7;
    stoneBit.castShadow = false;
  }
  return group;
}
