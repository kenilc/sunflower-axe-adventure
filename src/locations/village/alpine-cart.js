import * as THREE from "three";

export function createAlpineCart({
  village,
  hero,
  heroRig,
  companion,
  camera,
  mesh,
  box,
  cyl,
  accessories = [],
  onFinish,
  onClear = () => {},
}) {
  const cart = new THREE.Group();
  cart.name = "alpine-toboggan-cart";
  village.group.add(cart);
  box(2.25, 0.22, 2.1, "#a7663d", 0, 0.5, 0, cart);
  box(2.3, 0.48, 0.16, "#b94737", 0, 0.76, 1, cart);
  for (const side of [-1, 1]) {
    box(0.13, 0.48, 1.85, "#b94737", side * 1.07, 0.82, 0, cart);
    box(0.9, 0.15, 0.8, "#639d97", side * 0.52, 0.94, -0.25, cart);
    box(0.9, 0.75, 0.13, "#639d97", side * 0.52, 1.25, -0.7, cart);
    box(0.06, 0.5, 0.06, "#d2d9cf", side * 0.95, 1.2, 0.6, cart);
  }
  box(2, 0.07, 0.07, "#d2d9cf", 0, 1.46, 0.6, cart);
  box(0.12, 0.4, 0.025, "#fff8e4", 0, 0.77, 1.09, cart);
  box(0.4, 0.12, 0.025, "#fff8e4", 0, 0.77, 1.09, cart);
  const wheels = [];
  for (const x of [-0.77, 0.77])
    for (const z of [-0.65, 0.65]) {
      const wheel = cyl(0.23, 0.23, 0.16, "#485c58", x, 0.24, z, cart, 12);
      wheel.rotation.z = Math.PI / 2;
      wheels.push(wheel);
    }

  const magic = new THREE.Group();
  magic.name = "cart-flower-and-star-magic";
  magic.visible = false;
  village.group.add(magic);
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const angle = Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 ? 0.14 : 0.34;
    const x = Math.cos(angle) * radius,
      y = Math.sin(angle) * radius;
    if (i === 0) starShape.moveTo(x, y);
    else starShape.lineTo(x, y);
  }
  starShape.closePath();
  const starGeometry = new THREE.ShapeGeometry(starShape);
  const petalGeometry = new THREE.CircleGeometry(0.16, 8);
  const centerGeometry = new THREE.CircleGeometry(0.09, 10);
  const sparkles = [];
  for (let i = 0; i < 40; i++) {
    const sparkle = new THREE.Group();
    if (i % 3) {
      mesh(starGeometry, i % 2 ? "#ffe58d" : "#fff8d5", 0, 0, 0, sparkle);
    } else {
      for (let petal = 0; petal < 5; petal++) {
        const angle = (petal * Math.PI * 2) / 5;
        mesh(
          petalGeometry,
          i % 2 ? "#f7adc6" : "#fff4cf",
          Math.cos(angle) * 0.17,
          Math.sin(angle) * 0.17,
          0,
          sparkle,
        );
      }
      mesh(centerGeometry, "#efc754", 0, 0, 0.012, sparkle);
    }
    sparkle.traverse((part) => {
      if (part.isMesh) part.castShadow = part.receiveShadow = false;
    });
    magic.add(sparkle);
    sparkles.push(sparkle);
  }
  let magicAge = 0;
  const magicDuration = 2.4;
  function updateMagic(dt) {
    if (!magic.visible) return;
    magicAge += dt;
    const shrink = Math.max(0, 1 - magicAge / 0.85);
    cart.scale.setScalar(shrink * shrink);
    cart.visible = shrink > 0;
    cart.rotation.y += dt * 5;
    magic.updateWorldMatrix(true, false);
    const facing = camera.getWorldQuaternion(new THREE.Quaternion());
    sparkles.forEach((sparkle, i) => {
      const age = Math.max(0, magicAge - (i % 5) * 0.055);
      const angle = i * 2.39996 + age * 0.8;
      const radius = 0.3 + age * (0.9 + (i % 4) * 0.2);
      sparkle.position.set(
        Math.cos(angle) * radius,
        0.55 + (i % 4) * 0.22 + age * (1.4 + (i % 3) * 0.3),
        Math.sin(angle) * radius,
      );
      sparkle.quaternion.copy(facing);
      sparkle.rotateZ(age * (i % 2 ? 2 : -2));
      sparkle.scale.setScalar(
        Math.min(1, age * 10) * Math.max(0, 1 - age / 2.15),
      );
    });
    if (magicAge >= magicDuration) {
      magic.visible = cart.visible = false;
      cart.scale.setScalar(1);
      onClear();
    }
  }

  // Round each bend within the ledge width, rather than cutting across the cliff.
  const waypoints = village.route.slice().reverse();
  const points = [waypoints[0].clone()];
  for (let i = 1; i < waypoints.length - 1; i++) {
    const corner = waypoints[i];
    const before = corner.clone().lerp(waypoints[i - 1], 0.07);
    const after = corner.clone().lerp(waypoints[i + 1], 0.07);
    points.push(before);
    for (let step = 1; step <= 8; step++) {
      const t = step / 8;
      points.push(
        before
          .clone()
          .multiplyScalar((1 - t) ** 2)
          .addScaledVector(corner, 2 * (1 - t) * t)
          .addScaledVector(after, t * t),
      );
    }
  }
  points.push(waypoints.at(-1).clone());
  const distances = [0];
  for (let i = 1; i < points.length; i++)
    distances.push(distances.at(-1) + points[i].distanceTo(points[i - 1]));
  const length = distances.at(-1);
  const rails = new THREE.Group();
  rails.name = "alpine-cart-rails";
  village.group.add(rails);
  for (const side of [-1, 1]) {
    const railPoints = points.map((p, i) => {
      const tangent = points[Math.min(i + 1, points.length - 1)]
        .clone()
        .sub(points[Math.max(0, i - 1)]);
      return p
        .clone()
        .add(
          new THREE.Vector3(tangent.z, 0, -tangent.x)
            .normalize()
            .multiplyScalar(side * 0.77),
        )
        .add(new THREE.Vector3(0, 0.07, 0));
    });
    mesh(
      new THREE.TubeGeometry(
        new THREE.CurvePath().add(
          new THREE.CatmullRomCurve3(railPoints, false, "centripetal"),
        ),
        360,
        0.035,
        5,
        false,
      ),
      "#84948c",
      0,
      0,
      0,
      rails,
    );
  }
  const riders = [
    { character: hero, rig: heroRig },
    { character: companion.character, rig: companion.rig },
  ];
  for (const rider of riders) {
    const face = new THREE.Group();
    face.name = "cart-excited-face";
    rider.rig.head.add(face);
    face.position.y = -1.8;
    // Flat, upturned smile shapes keep the expression flush with the face.
    const smileShape = new THREE.Shape();
    smileShape.moveTo(-0.13, 0.035);
    smileShape.quadraticCurveTo(0, -0.005, 0.13, 0.035);
    smileShape.bezierCurveTo(0.11, -0.085, -0.11, -0.085, -0.13, 0.035);
    mesh(new THREE.ShapeGeometry(smileShape), "#573c32", 0, 2, 0.727, face);
    const teethShape = new THREE.Shape();
    teethShape.moveTo(-0.105, 0.02);
    teethShape.quadraticCurveTo(0, -0.011, 0.105, 0.02);
    teethShape.quadraticCurveTo(0.099, -0.005, 0.082, -0.014);
    teethShape.quadraticCurveTo(0, -0.04, -0.082, -0.014);
    teethShape.quadraticCurveTo(-0.099, -0.005, -0.105, 0.02);
    mesh(new THREE.ShapeGeometry(teethShape), "#fff7dc", 0, 2, 0.729, face);
    rider.rig.appearance.registerExpression("cart-excited", {
      mouthNode: face,
      eyeScale: 1.035,
    });
  }
  let riding = false,
    elapsed = 0,
    snapshots = [],
    savedAccessories = [],
    savedFov = 60,
    travelled = 0;
  const duration = 24;
  function sample(distance) {
    let i = 1;
    while (i < distances.length - 1 && distances[i] < distance) i++;
    return points[i - 1]
      .clone()
      .lerp(
        points[i],
        (distance - distances[i - 1]) / (distances[i] - distances[i - 1]),
      );
  }
  function pose() {
    const p = sample(travelled),
      ahead = sample(Math.min(length, travelled + 0.6));
    const behind = sample(Math.max(0, travelled - 0.6));
    const direction = ahead.sub(behind);
    cart.position.copy(p).y += 0.07;
    cart.rotation.set(
      Math.atan2(-direction.y, Math.hypot(direction.x, direction.z)),
      Math.atan2(direction.x, direction.z),
      0,
      "YXZ",
    );
    cart.updateWorldMatrix(true, false);
    riders.forEach(({ character, rig }, i) => {
      character.position.copy(
        cart.localToWorld(new THREE.Vector3(i ? 0.52 : -0.52, 0.9, -0.25)),
      );
      character.quaternion.copy(cart.quaternion);
      rig.body.position.y = -0.4 + Math.sin(elapsed * 13) * 0.025;
      rig.body.rotation.x = -0.08;
      rig.legs.forEach((leg) => {
        leg.rotation.x = -Math.PI / 2;
      });
      rig.arms.forEach((arm, side) => {
        arm.rotation.x = -2.9 + Math.sin(elapsed * 6 + i + side) * 0.1;
        arm.rotation.z = side ? 0.24 : -0.24;
      });
    });
    wheels.forEach((wheel) => {
      wheel.rotation.x = travelled / 0.23;
    });
  }
  function updateCamera() {
    if (!riding) {
      if (magic.visible) {
        camera.position.copy(magic.position).add(new THREE.Vector3(5, 6, 9));
        camera.lookAt(
          magic.position.clone().add(new THREE.Vector3(0, 1.3, 1.5)),
        );
      }
      return;
    }
    // Face the riders from just ahead of the cart, with the mountain passing behind.
    const distance = camera.aspect < 1 ? 8.2 : 6.6;
    camera.position.copy(
      cart.localToWorld(new THREE.Vector3(2.3, 3.35, distance)),
    );
    camera.lookAt(cart.localToWorld(new THREE.Vector3(0, 1.7, 0)));
  }
  function restore() {
    riders.forEach(({ character, rig }, i) => {
      const saved = snapshots[i];
      if (!saved) return;
      character.position.copy(saved.position);
      character.rotation.copy(saved.rotation);
      rig.body.position.copy(saved.bodyPosition);
      rig.body.rotation.copy(saved.bodyRotation);
      [...rig.legs, ...rig.arms].forEach((part, j) =>
        part.rotation.copy(saved.limbs[j]),
      );
      saved.releaseExpression();
      rig.items?.setHidden("alpine-cart", false);
    });
    accessories.forEach((item, i) => {
      item.visible = savedAccessories[i];
    });
    snapshots = [];
    camera.fov = savedFov;
    camera.updateProjectionMatrix();
  }
  return {
    cart,
    rails,
    magic,
    get vanishing() {
      return magic.visible;
    },
    duration,
    get riding() {
      return riding;
    },
    get progress() {
      return elapsed / duration;
    },
    start() {
      if (riding) return;
      magic.visible = false;
      cart.scale.setScalar(1);
      savedFov = camera.fov;
      savedAccessories = accessories.map((item) => {
        const visible = item.visible;
        item.visible = false;
        return visible;
      });
      snapshots = riders.map(({ character, rig }) => {
        const saved = {
          position: character.position.clone(),
          rotation: character.rotation.clone(),
          bodyPosition: rig.body.position.clone(),
          bodyRotation: rig.body.rotation.clone(),
          limbs: [...rig.legs, ...rig.arms].map((part) =>
            part.rotation.clone(),
          ),
          releaseExpression: rig.appearance.override({
            expression: "cart-excited",
            accessories: { scarf: null, harness: null },
          }),
        };
        rig.items?.setHidden("alpine-cart", true);
        return saved;
      });
      elapsed = travelled = 0;
      riding = cart.visible = true;
      camera.fov = 48;
      camera.updateProjectionMatrix();
      pose();
      updateCamera();
    },
    update(dt) {
      updateMagic(dt);
      if (!riding) return;
      elapsed = Math.min(duration, elapsed + dt);
      const t = elapsed / duration;
      // Gentle departure and arrival, brisk travel through the mountain bends.
      travelled = length * (t - Math.sin(t * Math.PI * 2) / (Math.PI * 2));
      pose();
      updateCamera();
      if (elapsed >= duration) {
        riding = false;
        restore();
        hero.position.copy(village.route[0]).add(new THREE.Vector3(0, 0, 2.5));
        hero.rotation.set(0, 0, 0);
        companion.reset(hero.position, village.blockers, village);
        magic.position.copy(cart.position);
        magic.visible = true;
        magicAge = 0;
        sparkles.forEach((sparkle) => sparkle.scale.setScalar(0));
        onFinish();
        updateCamera();
      }
    },
    updateCamera,
    reset() {
      if (riding) {
        riding = false;
        restore();
      }
      elapsed = travelled = magicAge = 0;
      magic.visible = false;
      cart.scale.setScalar(1);
      cart.visible = true;
      cart.position.copy(waypoints[0]).y += 0.07;
      const direction = waypoints[1].clone().sub(waypoints[0]);
      cart.rotation.set(
        Math.atan2(-direction.y, Math.hypot(direction.x, direction.z)),
        Math.atan2(direction.x, direction.z),
        0,
        "YXZ",
      );
    },
  };
}
