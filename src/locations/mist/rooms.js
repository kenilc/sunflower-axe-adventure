import * as THREE from "three";
import { markGlow } from "../../rendering/glow.js";
import { createMeshFactory } from "../../rendering/mesh-factory.js";

// Inside each animal house: a round room under the dome of its head (or
// the turtle's shell), open
// at the front like a dollhouse, with two round windows high on the back
// wall where the eyes are and furniture that suits the animal.
const ROOM_RADIUS = 6.5;
const WALL_HEIGHT = 5;

const ROOMS = {
  frog: {
    name: "Frog house",
    wall: "#cfe8c8",
    floor: "#8a6a4c",
    background: "#a9c9b0",
    hello: "Ribbit! ♥ Lily pads, firefly jars and a little indoor pool",
    hint: "Lily-pad rug · Indoor pool · Leaf bed · Firefly jars on the shelf",
  },
  cat: {
    name: "Cat house",
    wall: "#f6e3e0",
    floor: "#9a7656",
    background: "#d9c0c4",
    hello: "Purr… ♥ Balls of yarn, a cat tree and a cushion for napping",
    hint: "Fish rug · Yarn balls · Cat tree · Napping cushion · Milk bowl",
  },
  rabbit: {
    name: "Rabbit house",
    wall: "#fbf1f3",
    floor: "#b08a5a",
    background: "#e2cfd3",
    hello: "Hop in! ♥ Carrots in a basket and carrot cake on the table",
    hint: "Carrot basket · Carrot cake · Hay bed · Tulips on the shelf",
  },
  owl: {
    name: "Owl house",
    wall: "#e9dcc7",
    floor: "#6b5244",
    background: "#b9aa9a",
    hello: "Hoo-hoo ♥ Shelves of books, a moon lamp and stars to read by",
    hint: "Bookshelves · Moon lamp · Star garland · Telescope · Reading rug",
  },
  turtle: {
    name: "Turtle house",
    wall: "#d8ecdf",
    floor: "#e3cfa1",
    sand: true,
    background: "#b8cbbf",
    hello: "Slow and cosy ♥ A sandy floor, a seashell lamp and a pot of tea",
    hint: "Rock garden · Seashell lamp · Half-shell bed · Tea table · Shell shelf",
  },
};

function roomEnvironment(background) {
  return {
    background,
    skyTop: null,
    fogDensity: 0.006,
    sunIntensity: 1.6,
    sunColor: "#ffe7c4",
    sunOffset: [-8, 22, 12],
    fillIntensity: 1.6,
    fillColor: "#ffe9d0",
    groundColor: "#6b5340",
    exposure: 1.05,
  };
}

function createRoom(context, kind) {
  const look = ROOMS[kind];
  const group = new THREE.Group();
  group.name = `mist-${kind}-house`;
  group.visible = false;
  context.scene.add(group);
  const helpers = createMeshFactory(group);
  const { mesh, box, cyl, ball } = helpers;
  const blockers = [];
  const glow = (color, intensity = 1.2) =>
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: intensity,
      roughness: 0.6,
    });
  const lamp = glow("#ffd99a");
  const glowing = [];
  const lit = (node) => {
    node.castShadow = false;
    glowing.push(node);
    return node;
  };
  const flat = (node) => {
    node.castShadow = false;
    return node;
  };

  // The round floor and the curved back wall, in the animal's colour.
  flat(
    cyl(
      ROOM_RADIUS + 0.3,
      ROOM_RADIUS + 0.3,
      0.2,
      look.floor,
      0,
      -0.1,
      0,
      group,
      40,
    ),
  );
  // Floorboards: thin dark seams across the round floor (or soft sand).
  for (let x = -ROOM_RADIUS + 0.9; !look.sand && x < ROOM_RADIUS; x += 1.3) {
    const length = 2 * Math.sqrt(ROOM_RADIUS ** 2 - x * x);
    flat(box(0.04, 0.02, length, "#5c4433", x, 0.005, 0));
  }
  mesh(
    new THREE.CylinderGeometry(
      ROOM_RADIUS + 0.3,
      ROOM_RADIUS + 0.3,
      WALL_HEIGHT,
      40,
      1,
      true,
      Math.PI / 2,
      Math.PI,
    ),
    new THREE.MeshStandardMaterial({
      color: look.wall,
      roughness: 0.9,
      side: THREE.DoubleSide,
    }),
    0,
    WALL_HEIGHT / 2,
    0,
  );
  // The eyes, seen from inside: two round windows with the misty dusk
  // beyond them.
  const sky = glow("#b9c2ee", 0.5);
  for (const side of [-1, 1]) {
    const a = side * 0.42;
    const x = Math.sin(a) * ROOM_RADIUS,
      z = -Math.cos(a) * ROOM_RADIUS;
    const window = new THREE.Group();
    window.position.set(x * 0.97, 3.6, z * 0.97);
    window.rotation.y = -a;
    group.add(window);
    const pane = cyl(0.75, 0.75, 0.06, sky, 0, 0, 0, window, 20);
    pane.rotation.x = Math.PI / 2;
    flat(pane);
    const frame = mesh(
      new THREE.TorusGeometry(0.8, 0.1, 6, 20),
      "#7a5a3e",
      0,
      0,
      0.05,
      window,
    );
    frame.castShadow = false;
    box(1.6, 0.08, 0.1, "#7a5a3e", 0, 0, 0.06, window);
    box(0.08, 1.6, 0.1, "#7a5a3e", 0, 0, 0.06, window);
  }
  // A half-round doormat at the open front, where they came in. (An arch
  // there would stand between the camera and the friends.)
  const mat = flat(
    mesh(
      new THREE.CylinderGeometry(
        1.4,
        1.4,
        0.04,
        18,
        1,
        false,
        -Math.PI / 2,
        Math.PI,
      ),
      "#a8714a",
      0,
      0.03,
      ROOM_RADIUS - 0.2,
    ),
  );
  mat.rotation.y = Math.PI;
  const light = new THREE.PointLight("#ffd29a", 22, 14, 1.6);
  light.position.set(0, 4, -1);
  group.add(light);

  // On the curved wall: a point `along` (radians from the back) and `inset`.
  const onWall = (along, inset, y = 0) =>
    new THREE.Vector3(
      Math.sin(along) * (ROOM_RADIUS - inset),
      y,
      -Math.cos(along) * (ROOM_RADIUS - inset),
    );
  const shelf = (along, y, width, color = "#7a5a3e") => {
    const p = onWall(along, 0.35, y);
    const board = box(width, 0.1, 0.55, color, p.x, p.y, p.z);
    board.rotation.y = -along;
    return { p, board };
  };
  const block = (x, z, r) => blockers.push({ x, z, r });

  const decorate = {
    frog() {
      // A lily-pad rug with a pink lotus in the middle.
      flat(cyl(1.8, 1.8, 0.04, "#7fae6a", 0, 0.03, 0.4, group, 18));
      flat(cyl(1.1, 1.1, 0.05, "#93c07c", -1.6, 0.03, 2.2, group, 14));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const petal = ball(
          0.22,
          "#f2b6c8",
          Math.cos(a) * 0.25,
          0.14,
          0.4 + Math.sin(a) * 0.25,
        );
        petal.scale.set(1, 0.5, 1.6);
        petal.rotation.y = -a;
      }
      ball(0.14, "#f5d36b", 0, 0.2, 0.4);
      // A little indoor pool with a lily pad and a stone rim.
      const pool = new THREE.Vector3(-3.4, 0, -2.8);
      flat(cyl(1.25, 1.25, 0.06, "#6f9ac2", pool.x, 0.06, pool.z, group, 18));
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const rock = ball(
          0.24,
          "#8a9290",
          pool.x + Math.cos(a) * 1.35,
          0.1,
          pool.z + Math.sin(a) * 1.35,
        );
        rock.scale.y = 0.6;
      }
      flat(
        cyl(
          0.38,
          0.38,
          0.03,
          "#6f9a6a",
          pool.x + 0.3,
          0.1,
          pool.z - 0.2,
          group,
          10,
        ),
      );
      block(pool.x, pool.z, 1.5);
      // A bed made of one big curled leaf, with a cream pillow.
      const leaf = ball(1.3, "#6f9a5a", 3.3, 0.35, -2.8);
      leaf.scale.set(1.3, 0.3, 0.9);
      leaf.rotation.y = 0.5;
      const pillow = ball(0.4, "#f4efe2", 3.9, 0.7, -3.4);
      pillow.scale.set(1.2, 0.5, 0.8);
      block(3.3, -2.8, 1.5);
      // Mushroom stools with spotty caps.
      for (const [x, z, s] of [
        [-4.2, 1.2, 1],
        [4.3, 1.4, 0.85],
        [3.6, 2.6, 0.6],
      ]) {
        cyl(0.22 * s, 0.28 * s, 0.7 * s, "#f4efe2", x, 0.35 * s, z, group, 8);
        const cap = ball(0.55 * s, "#d9534f", x, 0.75 * s, z);
        cap.scale.y = 0.55;
        for (let k = 0; k < 4; k++) {
          const dot = ball(
            0.09 * s,
            "#f4efe2",
            x + Math.cos(k * 1.6) * 0.32 * s,
            0.9 * s,
            z + Math.sin(k * 1.6) * 0.32 * s,
          );
          dot.scale.y = 0.4;
        }
        block(x, z, 0.5 * s);
      }
      // A shelf of firefly jars glowing on the back wall.
      const { p } = shelf(0, 2.2, 3.4);
      for (let i = 0; i < 4; i++) {
        const x = p.x - 1.2 + i * 0.8;
        mesh(
          new THREE.CylinderGeometry(0.2, 0.2, 0.42, 10),
          new THREE.MeshStandardMaterial({
            color: "#dff0e8",
            transparent: true,
            opacity: 0.45,
            roughness: 0.2,
          }),
          x,
          2.46,
          p.z,
        ).castShadow = false;
        lit(
          mesh(
            new THREE.IcosahedronGeometry(0.08, 1),
            glow("#e9f78a", 1.6),
            x,
            2.45,
            p.z,
          ),
        );
        cyl(0.21, 0.21, 0.06, "#a8714a", x, 2.7, p.z, group, 10);
      }
      // Reeds in pots by the pool.
      for (const x of [-5.2, -1.9]) {
        cyl(0.3, 0.24, 0.5, "#c47a52", x, 0.25, -4.2, group, 8);
        for (let k = 0; k < 5; k++) {
          const reed = cyl(
            0.03,
            0.03,
            1.4 + k * 0.15,
            "#5f8a4a",
            x + (k - 2) * 0.08,
            1.1,
            -4.2,
            group,
            4,
          );
          reed.rotation.z = (k - 2) * 0.08;
        }
        block(x, -4.2, 0.4);
      }
    },
    cat() {
      // A fish-shaped rug.
      const body = flat(cyl(1, 1, 0.04, "#8fb3d9", 0, 0.03, 0.6, group, 18));
      body.scale.set(1.7, 1, 1);
      const tail = flat(
        mesh(new THREE.ConeGeometry(0.8, 0.04, 3), "#8fb3d9", 2.2, 0.03, 0.6),
      );
      tail.rotation.y = Math.PI / 2;
      flat(cyl(0.16, 0.16, 0.05, "#f4efe2", -1.1, 0.04, 0.4, group, 10));
      // Balls of yarn, one unravelling across the floor.
      for (const [x, z, color, thread] of [
        [-2.4, 2.4, "#f2a7b8", "#e88aa0"],
        [-1.8, 3.2, "#9cc0d8", "#7aa6c4"],
        [2.4, 2.8, "#f5d36b", "#e0bb45"],
      ]) {
        ball(0.32, color, x, 0.3, z);
        const coil = mesh(
          new THREE.TorusGeometry(0.3, 0.03, 4, 14),
          thread,
          x,
          0.3,
          z,
        );
        coil.rotation.set(0.6, 0.4, 0);
      }
      flat(box(1.8, 0.03, 0.05, "#f2a7b8", -1.3, 0.03, 2.6)).rotation.y = 0.5;
      // A cat tree with round platforms in the back-left corner.
      const tree = new THREE.Vector3(-3.6, 0, -2.9);
      cyl(1, 1, 0.25, "#c9b48a", tree.x, 0.12, tree.z, group, 14);
      cyl(0.18, 0.18, 4, "#d8c69a", tree.x, 2, tree.z, group, 8);
      for (const [y, r, dx] of [
        [1.4, 0.8, 0.3],
        [2.6, 0.7, -0.3],
        [3.8, 0.75, 0.1],
      ]) {
        cyl(r, r, 0.16, "#f2a7b8", tree.x + dx, y, tree.z, group, 14);
      }
      ball(0.55, "#f6d7dd", tree.x + 0.1, 4.05, tree.z).scale.y = 0.5;
      const dangle = ball(0.14, "#f5d36b", tree.x + 0.7, 2.1, tree.z);
      dangle.castShadow = false;
      cyl(0.01, 0.01, 0.45, "#7a5a3e", tree.x + 0.7, 2.38, tree.z, group, 3);
      block(tree.x, tree.z, 1.1);
      // A round napping cushion in the back-right.
      const bed = new THREE.Vector3(3.4, 0, -2.8);
      mesh(
        new THREE.TorusGeometry(1.05, 0.38, 8, 20),
        "#e88aa0",
        bed.x,
        0.38,
        bed.z,
      ).rotation.x = Math.PI / 2;
      ball(1, "#f6d7dd", bed.x, 0.22, bed.z).scale.y = 0.25;
      block(bed.x, bed.z, 1.45);
      // A milk bowl and a fish on a plate.
      cyl(0.32, 0.24, 0.18, "#5b8fc7", 4.2, 0.09, 1.2, group, 12);
      flat(cyl(0.27, 0.27, 0.02, "#f8f6f0", 4.2, 0.18, 1.2, group, 12));
      cyl(0.36, 0.36, 0.04, "#f4efe2", 4.6, 0.02, 2.1, group, 12);
      const fish = ball(0.2, "#9cc0d8", 4.6, 0.12, 2.1);
      fish.scale.set(1.6, 0.4, 0.7);
      // Paw prints in little frames on the wall.
      for (const along of [-0.15, 0.15]) {
        const p = onWall(along, 0.25, 2.2);
        const frame = box(0.9, 0.9, 0.08, "#a8714a", p.x, p.y, p.z);
        frame.rotation.y = -along;
        const card = box(0.74, 0.74, 0.1, "#f8f6f0", p.x, p.y, p.z);
        card.rotation.y = -along;
        const paw = new THREE.Vector3(0, 0, 0.07).applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          -along,
        );
        ball(0.13, "#e88aa0", p.x + paw.x, p.y - 0.08, p.z + paw.z).scale.z =
          0.3;
        for (const dx of [-0.17, 0, 0.17]) {
          const toe = ball(
            0.06,
            "#e88aa0",
            p.x + paw.x + Math.cos(along) * dx,
            p.y + 0.14 - Math.abs(dx) * 0.4,
            p.z + paw.z + Math.sin(along) * dx,
          );
          toe.scale.z = 0.3;
        }
      }
    },
    rabbit() {
      // A round rug striped like a carrot.
      flat(cyl(1.8, 1.8, 0.04, "#f2a65a", 0, 0.03, 0.6, group, 20));
      flat(cyl(1.25, 1.25, 0.05, "#f6c48a", 0, 0.035, 0.6, group, 20));
      flat(cyl(0.6, 0.6, 0.06, "#8fbf6a", 0, 0.04, 0.6, group, 14));
      // A basket of carrots in the back-left.
      const basket = new THREE.Vector3(-3.6, 0, -2.6);
      cyl(0.75, 0.6, 0.7, "#b08a5a", basket.x, 0.35, basket.z, group, 12);
      mesh(
        new THREE.TorusGeometry(0.75, 0.05, 4, 16),
        "#8a6a4c",
        basket.x,
        0.72,
        basket.z,
      ).rotation.x = Math.PI / 2;
      for (let i = 0; i < 7; i++) {
        const a = i * 0.9;
        const x = basket.x + Math.cos(a) * 0.35,
          z = basket.z + Math.sin(a) * 0.35;
        const carrot = mesh(
          new THREE.ConeGeometry(0.1, 0.7, 6),
          "#f2843a",
          x,
          0.75,
          z,
        );
        carrot.rotation.set(Math.PI + Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3);
        cyl(0.02, 0.06, 0.3, "#6aa84f", x, 1.18, z, group, 4);
      }
      block(basket.x, basket.z, 0.9);
      // A soft hay bed in the back-right.
      const bed = new THREE.Vector3(3.4, 0, -2.8);
      mesh(
        new THREE.TorusGeometry(1.05, 0.36, 8, 20),
        "#e6cf8f",
        bed.x,
        0.36,
        bed.z,
      ).rotation.x = Math.PI / 2;
      ball(1, "#f4e2b0", bed.x, 0.2, bed.z).scale.y = 0.25;
      const pillow = ball(0.35, "#f2b6c8", bed.x + 0.4, 0.5, bed.z - 0.4);
      pillow.scale.set(1.3, 0.5, 0.8);
      block(bed.x, bed.z, 1.4);
      // A little table with carrot cake and two stools.
      const table = new THREE.Vector3(3.2, 0, 1.8);
      cyl(0.85, 0.85, 0.1, "#f4efe2", table.x, 0.85, table.z, group, 16);
      cyl(0.1, 0.14, 0.8, "#b08a5a", table.x, 0.4, table.z, group, 8);
      cyl(0.4, 0.4, 0.3, "#f6e7d0", table.x, 1.05, table.z, group, 14);
      cyl(0.42, 0.42, 0.06, "#f2a65a", table.x, 1.1, table.z, group, 14);
      const top = mesh(
        new THREE.ConeGeometry(0.06, 0.26, 6),
        "#f2843a",
        table.x,
        1.33,
        table.z,
      );
      top.rotation.z = Math.PI;
      cyl(0.015, 0.03, 0.12, "#6aa84f", table.x, 1.5, table.z, group, 4);
      for (const dx of [-1.15, 1.15]) {
        cyl(0.32, 0.32, 0.12, "#f2b6c8", table.x + dx, 0.5, table.z, group, 12);
        cyl(0.06, 0.08, 0.45, "#b08a5a", table.x + dx, 0.22, table.z, group, 6);
      }
      block(table.x, table.z, 1.6);
      // Tulips in pots on a shelf, and a garland of little carrots.
      const { p } = shelf(0, 1.9, 3.6);
      for (let i = 0; i < 4; i++) {
        const x = p.x - 1.2 + i * 0.8;
        cyl(0.17, 0.13, 0.3, "#c47a52", x, 2.1, p.z, group, 8);
        cyl(0.02, 0.02, 0.4, "#6aa84f", x, 2.45, p.z, group, 4);
        const bloom = ball(
          0.12,
          ["#f08fb0", "#f5c842", "#e2453c", "#ffffff"][i],
          x,
          2.68,
          p.z,
        );
        bloom.scale.y = 1.4;
      }
      for (let i = 0; i < 9; i++) {
        const along = -0.9 + i * 0.225;
        const sag = Math.sin((i / 8) * Math.PI) * 0.4;
        const q = onWall(along, 0.25, 3.9 - sag);
        const carrot = mesh(
          new THREE.ConeGeometry(0.07, 0.3, 5),
          "#f2843a",
          q.x,
          q.y,
          q.z,
        );
        carrot.rotation.z = Math.PI;
        carrot.castShadow = false;
      }
    },
    owl() {
      // A round reading rug, night-blue with stars.
      flat(cyl(1.9, 1.9, 0.04, "#3d4f7c", 0, 0.03, 0.8, group, 20));
      for (let i = 0; i < 7; i++) {
        const a = i * 0.9;
        const star = flat(
          cyl(
            0.11,
            0.11,
            0.05,
            "#f5d36b",
            Math.cos(a) * (0.5 + (i % 3) * 0.45),
            0.04,
            0.8 + Math.sin(a) * (0.5 + (i % 3) * 0.45),
            group,
            5,
          ),
        );
        star.rotation.y = a;
      }
      // Tall bookshelves following the curve of the back wall.
      const colors = [
        "#c8573f",
        "#5b8fc7",
        "#f2b84b",
        "#6aa84f",
        "#8e6bbf",
        "#e88aa0",
      ];
      for (const along of [-0.75, -0.25, 0.25, 0.75]) {
        const p = onWall(along, 0.55, 0);
        const case_ = new THREE.Group();
        case_.position.copy(p);
        case_.rotation.y = -along;
        group.add(case_);
        box(1.7, 3.4, 0.5, "#6b4d38", 0, 1.7, -0.05, case_);
        box(1.5, 3.2, 0.1, "#4a3628", 0, 1.7, 0.2, case_).position.z = -0.25;
        for (let row = 0; row < 4; row++) {
          box(1.6, 0.08, 0.5, "#7a5a3e", 0, 0.3 + row * 0.8, 0, case_);
          let x = -0.7;
          for (let k = 0; x < 0.65; k++) {
            const w =
              0.1 + ((k * 7 + row * 3 + Math.round(along * 10)) % 3) * 0.04;
            const h = 0.45 + ((k + row) % 3) * 0.08;
            box(
              w,
              h,
              0.36,
              colors[(k + row * 2 + Math.round(along * 4)) % colors.length],
              x + w / 2,
              0.34 + row * 0.8 + h / 2,
              0.02,
              case_,
            );
            x += w + 0.02;
          }
        }
        block(p.x, p.z, 0.95);
      }
      // A moon lamp on a stand, glowing softly.
      const moon = new THREE.Vector3(-3.9, 0, 0.4);
      cyl(0.35, 0.45, 0.12, "#4a3628", moon.x, 0.06, moon.z, group, 10);
      cyl(0.05, 0.05, 1.5, "#4a3628", moon.x, 0.8, moon.z, group, 6);
      lit(
        mesh(
          new THREE.IcosahedronGeometry(0.5, 3),
          glow("#fff3c4", 1.1),
          moon.x,
          1.95,
          moon.z,
        ),
      );
      block(moon.x, moon.z, 0.6);
      // A garland of little stars across the wall.
      const starLight = glow("#ffe9a0", 1.6);
      for (let i = 0; i < 13; i++) {
        const along = -1.3 + i * 0.217;
        const sag = Math.sin((i / 12) * Math.PI) * 0.5;
        const q = onWall(along, 0.3, 4.3 - sag);
        lit(
          mesh(new THREE.OctahedronGeometry(0.1, 0), starLight, q.x, q.y, q.z),
        );
      }
      // A comfy armchair beside the lamp.
      const chair = new THREE.Group();
      chair.position.set(-3.2, 0, 2.3);
      chair.rotation.y = 0.9;
      group.add(chair);
      box(1.3, 0.5, 1.1, "#c8573f", 0, 0.35, 0, chair);
      box(1.3, 1.1, 0.3, "#c8573f", 0, 0.9, -0.45, chair);
      for (const side of [-1, 1])
        box(0.25, 0.75, 1.1, "#b04a35", side * 0.62, 0.5, 0, chair);
      box(0.6, 0.3, 0.25, "#f5d36b", 0, 0.75, -0.2, chair);
      block(-3.2, 2.3, 0.85);
      // A telescope on a tripod, pointing up at the left window.
      const scope = new THREE.Group();
      scope.position.set(3.4, 0, -1.6);
      group.add(scope);
      for (let k = 0; k < 3; k++) {
        const leg = cyl(
          0.04,
          0.04,
          1.5,
          "#4a3628",
          Math.cos(k * 2.1) * 0.3,
          0.72,
          Math.sin(k * 2.1) * 0.3,
          scope,
          4,
        );
        leg.rotation.set(
          Math.sin(k * 2.1) * 0.35,
          0,
          -Math.cos(k * 2.1) * 0.35,
        );
      }
      const tube = cyl(0.12, 0.18, 1.5, "#c9a24b", 0, 1.7, 0, scope, 10);
      tube.rotation.set(-0.7, 0, 0.5);
      block(3.4, -1.6, 0.6);
      // A perch branch with a pile of cushions under it.
      const perch = new THREE.Vector3(3.6, 0, 2.2);
      for (const dx of [-0.8, 0.8])
        cyl(0.08, 0.1, 1.6, "#6b4d38", perch.x + dx, 0.8, perch.z, group, 6);
      cyl(
        0.09,
        0.09,
        2,
        "#7a5a3e",
        perch.x,
        1.6,
        perch.z,
        group,
        6,
      ).rotation.z = Math.PI / 2;
      ball(0.45, "#f3e4cc", perch.x - 0.3, 0.25, perch.z).scale.y = 0.5;
      ball(0.38, "#9cc0d8", perch.x + 0.4, 0.22, perch.z + 0.2).scale.y = 0.5;
      block(perch.x, perch.z, 1);
    },
    turtle() {
      // A round rug rippled like a pond.
      for (const [r, color] of [
        [1.9, "#8fc3c0"],
        [1.4, "#a9d4cf"],
        [0.9, "#8fc3c0"],
        [0.45, "#c3e2dc"],
      ])
        flat(cyl(r, r, 0.04, color, 0, 0.03 + (2 - r) * 0.004, 0.6, group, 24));
      // A raked rock garden in the back-left: sand rings round three stones.
      const garden = new THREE.Vector3(-3.4, 0, -2.6);
      flat(cyl(1.4, 1.4, 0.05, "#f1e4c4", garden.x, 0.03, garden.z, group, 22));
      for (const [dx, dz, s] of [
        [-0.35, -0.2, 0.42],
        [0.5, 0.3, 0.3],
        [0.1, 0.65, 0.2],
      ]) {
        const stone = ball(s, "#8a9290", garden.x + dx, s * 0.4, garden.z + dz);
        stone.scale.y = 0.65;
        for (const ring of [s + 0.15, s + 0.3]) {
          const groove = mesh(
            new THREE.TorusGeometry(ring, 0.025, 4, 18),
            "#d9c79e",
            garden.x + dx,
            0.06,
            garden.z + dz,
          );
          groove.rotation.x = Math.PI / 2;
          groove.castShadow = false;
        }
      }
      block(garden.x, garden.z, 1.5);
      // A bed in half a shell, with a cushion and a pillow, in the back-right.
      const bed = new THREE.Vector3(3.4, 0, -2.8);
      const half = mesh(
        new THREE.SphereGeometry(
          1.3,
          16,
          8,
          0,
          Math.PI * 2,
          Math.PI / 2,
          Math.PI / 2,
        ),
        new THREE.MeshStandardMaterial({
          color: "#c9a46a",
          roughness: 0.88,
          side: THREE.DoubleSide,
        }),
        bed.x,
        0.62,
        bed.z,
      );
      half.scale.set(1.15, 0.5, 0.9);
      ball(1.2, "#f4efe2", bed.x, 0.55, bed.z).scale.set(1.1, 0.12, 0.85);
      const pillow = ball(0.38, "#9fd0c4", bed.x + 0.6, 0.72, bed.z - 0.3);
      pillow.scale.set(1.2, 0.45, 0.8);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const plate = ball(
          0.28,
          "#d6b47a",
          bed.x + Math.cos(a) * 1.35,
          0.4,
          bed.z + Math.sin(a) * 1.05,
        );
        plate.scale.set(1, 0.5, 1);
      }
      block(bed.x, bed.z, 1.55);
      // A glowing scallop-shell lamp on a little stand.
      const shellLamp = new THREE.Vector3(-4, 0, 1.4);
      cyl(
        0.32,
        0.4,
        0.12,
        "#b38a55",
        shellLamp.x,
        0.06,
        shellLamp.z,
        group,
        10,
      );
      cyl(0.05, 0.05, 1.3, "#b38a55", shellLamp.x, 0.7, shellLamp.z, group, 6);
      const scallop = lit(
        mesh(
          new THREE.CylinderGeometry(
            0.62,
            0.62,
            0.12,
            12,
            1,
            false,
            -Math.PI / 2,
            Math.PI,
          ),
          glow("#ffd2b8", 1.1),
          shellLamp.x,
          1.4,
          shellLamp.z,
        ),
      );
      scallop.rotation.set(Math.PI / 2, 0, 0.4);
      block(shellLamp.x, shellLamp.z, 0.5);
      // A low tea table with a teapot, two cups and floor cushions.
      const table = new THREE.Vector3(3.1, 0, 1.7);
      cyl(0.95, 0.95, 0.1, "#a8814f", table.x, 0.5, table.z, group, 16);
      cyl(0.15, 0.2, 0.45, "#8a6a4c", table.x, 0.23, table.z, group, 8);
      const pot = ball(0.3, "#9fd0c4", table.x, 0.78, table.z);
      pot.scale.y = 0.85;
      cyl(0.12, 0.14, 0.08, "#9fd0c4", table.x, 1.04, table.z, group, 10);
      ball(0.05, "#f4efe2", table.x, 1.1, table.z);
      const spout = cyl(
        0.04,
        0.06,
        0.3,
        "#9fd0c4",
        table.x + 0.32,
        0.82,
        table.z,
        group,
        6,
      );
      spout.rotation.z = -0.9;
      for (const dx of [-0.55, 0.55]) {
        cyl(
          0.1,
          0.08,
          0.14,
          "#f4efe2",
          table.x + dx,
          0.62,
          table.z + 0.35,
          group,
          8,
        );
        const cushion = ball(0.5, "#f2b6b8", table.x + dx * 2.3, 0.15, table.z);
        cushion.scale.y = 0.3;
      }
      block(table.x, table.z, 1.3);
      // A shelf of seashells and a jar of sea glass on the back wall.
      const { p } = shelf(0, 2.1, 3.6, "#b38a55");
      const pastels = ["#f2b6b8", "#f6e3c8", "#c9b5e0", "#ffd2b8"];
      for (let i = 0; i < 4; i++) {
        const x = p.x - 1.35 + i * 0.6;
        const shell = mesh(
          new THREE.ConeGeometry(0.16, 0.36, 7),
          pastels[i],
          x,
          2.33,
          p.z,
        );
        shell.rotation.z = i % 2 ? 0.5 : -0.3;
      }
      mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.5, 10),
        new THREE.MeshStandardMaterial({
          color: "#cfe9e4",
          transparent: true,
          opacity: 0.5,
          roughness: 0.2,
        }),
        p.x + 1.3,
        2.4,
        p.z,
      ).castShadow = false;
      for (let k = 0; k < 5; k++)
        ball(
          0.06,
          ["#7fc3b8", "#5b8fc7", "#9fd0c4"][k % 3],
          p.x + 1.22 + (k % 3) * 0.08,
          2.22 + Math.floor(k / 3) * 0.1,
          p.z,
        );
      // A potted fern by the door.
      cyl(0.32, 0.26, 0.5, "#c47a52", -2.6, 0.25, 4.4, group, 8);
      for (let k = 0; k < 6; k++) {
        const frond = ball(
          0.35,
          "#6aa84f",
          -2.6 + Math.cos(k) * 0.25,
          0.75,
          4.4 + Math.sin(k) * 0.25,
        );
        frond.scale.set(0.4, 0.9, 0.4);
        frond.rotation.set(Math.sin(k) * 0.5, 0, Math.cos(k) * 0.5);
      }
      block(-2.6, 4.4, 0.45);
    },
  };
  decorate[kind]();
  // A warm lamp hanging from the ceiling in every house.
  cyl(0.02, 0.02, 1, "#5a4338", 0, WALL_HEIGHT - 0.2, -1, group, 4);
  lit(
    mesh(
      new THREE.IcosahedronGeometry(0.32, 2),
      lamp,
      0,
      WALL_HEIGHT - 0.85,
      -1,
    ),
  );
  markGlow(...glowing);

  return {
    look,
    group,
    blockers,
    arrival: new THREE.Vector3(0, 0, ROOM_RADIUS - 1.6),
    contains: (x, z) =>
      Math.hypot(x, z) < ROOM_RADIUS - 0.5 ||
      (Math.abs(x) < 1.1 && z > 0 && z < ROOM_RADIUS + 0.2),
    heightAt: () => 0,
    followDistance: 3,
    isExit: (p) => Math.abs(p.x) < 1.1 && p.z > ROOM_RADIUS - 0.3,
  };
}

// The houses as rooms of the hollow. `visit(kind, hello)` is called
// each time the friends walk into one.
export function createHouseRooms(context, { world, visit }) {
  return world.houses.map((house) => {
    const room = createRoom(context, house.kind);
    const { look } = room;
    return {
      id: `mist:${house.kind}`,
      name: `Mistwood Hollow · ${look.name}`,
      progressLabel: `Mistwood Hollow · ${look.name}`,
      parent: "mist",
      kind: "room",
      group: room.group,
      terrain: room,
      canThrow: false,
      maxZoom: 22,
      cameraTarget: () => 1,
      canPhotograph: () => true,
      photoLocation: () => `Mistwood Hollow · ${look.name}`,
      entrance: {
        from: "mist",
        contains: (p) =>
          Math.hypot(p.x - house.door.x, p.z - house.door.z) < 1.1,
      },
      returnSpawn: house.outside.toArray(),
      settings: {
        spawn: room.arrival.toArray(),
        heading: Math.PI,
        camera: { yaw: 0, pitch: 0.62, zoom: 17, fov: 50 },
        environment: roomEnvironment(look.background),
        instructions:
          "<kbd>W A S D</kbd> walk <kbd>M</kbd> photo · Out through the round door",
      },
      enter() {
        visit(house.kind, look.hello);
      },
      getGate: () =>
        room.isExit(context.hero.position) ? { id: "mist" } : null,
      getHud: () => ({
        region: look.name,
        quest: {
          eyebrow: `MISTWOOD HOLLOW · THE ${look.name.toUpperCase()}`,
          title: "Inside a sleepy house.<br />Cosy, round and warm.",
          objective: "Look around, then step back out through the round door.",
        },
        hint: `${look.hint} · Door: front`,
        instructions:
          "<kbd>W A S D</kbd> walk <kbd>M</kbd> photo <kbd>V</kbd> map",
        actions: [],
      }),
    };
  });
}
