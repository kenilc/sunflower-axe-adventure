import * as THREE from "three";
import { createRandom } from "../systems/random.js";

const TAU = Math.PI * 2;

// A place's ground as a diorama board: a grass top with a lip, soil and
// stone bands down the side, and a rocky underside tapering below, so the
// place reads as a little world of its own rather than land that stops.
// `size` is the radius of a round board or the half-width of a square one;
// a square board takes `depth` as its half-depth to become a rectangle.
// `thickness` scales the side bands, so a very large board doesn't look thin.
// Pass `grass: null` when the place's own ground already forms the top.
export function createDioramaBase({
  parent,
  mesh,
  size,
  depth = size,
  thickness = 1,
  shape = "round",
  top = 0,
  grass,
  soil = "#a47c5b",
  stone = "#b7aa97",
  rock = "#8e8475",
  seed = 11,
}) {
  const rand = createRandom(seed);
  const square = shape === "square";
  const stretch = square ? depth / size : 1;
  const group = new THREE.Group();
  group.name = "diorama-base";
  parent.add(group);
  let y = top;
  // Each band runs from `y` downwards, narrowing from `from` to `to`. A
  // four-sided cylinder turned 45° makes the square board.
  function band(name, color, height, from, to) {
    const scale = square ? Math.SQRT2 : 1;
    const part = mesh(
      new THREE.CylinderGeometry(
        from * scale,
        to * scale,
        height,
        square ? 4 : 40,
      ),
      color,
      0,
      y - height / 2,
      0,
      group,
    );
    if (square) {
      // Turn the geometry, not the mesh, so stretching keeps the sides square.
      part.geometry.rotateY(Math.PI / 4);
      part.scale.z = stretch;
    }
    part.name = name;
    y -= height;
    return part;
  }
  if (grass) band("diorama-grass", grass, 0.5, size + 0.25, size);
  const soilTop = y;
  const soilHeight = 1.8 * thickness,
    soilInset = 0.5 * thickness,
    stoneInset = 1.6 * thickness;
  band("diorama-soil", soil, soilHeight, size, size - soilInset);
  band(
    "diorama-stone",
    stone,
    1.4 * thickness,
    size - soilInset,
    size - stoneInset,
  );
  const underside = band(
    "diorama-underside",
    rock,
    size * 0.32,
    size - stoneInset,
    size * 0.18,
  );
  underside.castShadow = false;
  // Rocks half set into the soil band break up the smooth side.
  const count = Math.round(square ? ((size + depth) / 2) * 1.1 : size * 0.9);
  for (let i = 0; i < count; i++) {
    const t = (i + rand() * 0.5) / count,
      sink = (0.25 + rand() * 1.3) * thickness,
      // The soil narrows as it goes down.
      edge = size - (sink / soilHeight) * soilInset,
      bit = (0.3 + rand() * 0.4) * thickness,
      inset = edge - bit * 0.4;
    let x, z;
    if (square) {
      // Walk the four sides, keeping clear of the corners.
      const side = Math.floor(t * 4),
        along = ((t * 4) % 1) * 1.8 - 0.9;
      [x, z] = [
        [along * inset, inset],
        [inset, -along * inset],
        [-along * inset, -inset],
        [-inset, along * inset],
      ][side];
      z *= stretch;
    } else {
      x = Math.cos(t * TAU) * inset;
      z = Math.sin(t * TAU) * inset;
    }
    const stoneBit = mesh(
      new THREE.IcosahedronGeometry(bit, 0),
      rand() < 0.6 ? stone : rock,
      x,
      soilTop - sink,
      z,
      group,
    );
    stoneBit.rotation.set(rand() * TAU, rand() * TAU, 0);
    stoneBit.scale.y = 0.7;
    stoneBit.castShadow = false;
  }
  return group;
}
