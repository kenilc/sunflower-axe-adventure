import * as THREE from "three";

export function createSunsetSpot({ parent, helpers }) {
  const { mesh, box, ball, cyl } = helpers;
  const group = new THREE.Group();
  group.name = "sunset-towels";
  group.position.set(11, 0, 1);
  parent.add(group);
  for (const side of [-1, 1]) {
    const towel = box(
      1.35,
      0.035,
      2.6,
      side < 0 ? "#e6a38f" : "#79b7c0",
      side * 0.8,
      0.025,
      -0.35,
      group,
    );
    towel.name = side < 0 ? "coral-beach-towel" : "blue-beach-towel";
    for (const z of [-1.42, -1.28, 0.57, 0.71])
      box(1.32, 0.012, 0.07, "#fff1d3", side * 0.8, 0.05, z, group);
    for (const end of [-1, 1])
      for (let i = 0; i < 9; i++)
        box(
          0.025,
          0.012,
          0.18,
          "#fff1d3",
          side * 0.8 - 0.55 + i * 0.135,
          0.037,
          -0.35 + end * 1.35,
          group,
        );
  }
  const umbrella = new THREE.Group();
  umbrella.name = "sunset-parasol";
  umbrella.position.set(-1.8, 0, 1.2);
  group.add(umbrella);
  cyl(0.045, 0.065, 3.9, "#c5ae86", 0, 1.95, 0, umbrella, 10);
  const materials = ["#fff0ce", "#82babe"].map(
    (color) =>
      new THREE.MeshStandardMaterial({
        color,
        side: THREE.DoubleSide,
        roughness: 0.92,
      }),
  );
  function canopyPoint(angle, radius, scallop = 0) {
    const q = radius / 3.2;
    return new THREE.Vector3(
      Math.cos(angle) * radius,
      3.9 - 0.78 * Math.pow(q, 1.3) - scallop * 0.12 * Math.pow(q, 5),
      Math.sin(angle) * radius,
    );
  }
  for (let sector = 0; sector < 8; sector++) {
    const positions = [],
      indices = [];
    for (let ring = 0; ring <= 6; ring++)
      for (let arc = 0; arc <= 6; arc++) {
        const angle = ((sector + arc / 6) * Math.PI) / 4;
        const p = canopyPoint(
          angle,
          (ring / 6) * 3.2,
          Math.sin((arc / 6) * Math.PI),
        );
        positions.push(p.x, p.y, p.z);
      }
    for (let ring = 0; ring < 6; ring++)
      for (let arc = 0; arc < 6; arc++) {
        const a = ring * 7 + arc;
        indices.push(a, a + 7, a + 1, a + 1, a + 7, a + 8);
      }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    mesh(geometry, materials[sector % 2], 0, 0, 0, umbrella);
    const angle = (sector * Math.PI) / 4;
    const points = [0, 0.8, 1.6, 2.4, 3.2].map((radius) => {
      const p = canopyPoint(angle, radius);
      p.y -= 0.035;
      return p;
    });
    mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        12,
        0.025,
        5,
        false,
      ),
      "#d8c8a1",
      0,
      0,
      0,
      umbrella,
    );
  }
  ball(0.12, "#e4ce9c", 0, 3.96, 0, umbrella);
  const base = ball(0.3, "#c4ad87", 0, 0.05, 0, umbrella);
  base.scale.y = 0.4;
  return {
    group,
    umbrella,
    blocker: {
      x: group.position.x + umbrella.position.x,
      z: group.position.z + umbrella.position.z,
      r: 0.3,
    },
    nearby: (position) =>
      Math.hypot(position.x - group.position.x, position.z - group.position.z) <
      3.4,
  };
}

export function createSunsetRest({
  spot,
  hero,
  heroRig,
  companion,
  camera,
  toast,
  clearInput,
}) {
  const actors = [hero, companion.character],
    rigs = [heroRig, companion.rig];
  let seated = false,
    elapsed = 0,
    savedActors = [],
    savedNodes = [],
    releases = [],
    view;
  function capture(node) {
    return {
      node,
      position: node.position.clone(),
      quaternion: node.quaternion.clone(),
    };
  }
  function restore({ node, position, quaternion }) {
    node.position.copy(position);
    node.quaternion.copy(quaternion);
  }
  function stand(notify = true) {
    if (!seated) return false;
    seated = false;
    savedActors.forEach(restore);
    savedNodes.forEach(restore);
    releases.forEach((release) => release());
    releases = [];
    rigs.forEach((rig) => rig.items.setHidden("beach-rest", false));
    camera.position.copy(view.position);
    camera.quaternion.copy(view.quaternion);
    clearInput();
    if (notify) toast("Back to our beach walk ♥");
    return true;
  }
  return {
    get seated() {
      return seated;
    },
    nearby: () => spot.nearby(hero.position),
    sit() {
      if (seated || !spot.nearby(hero.position)) return false;
      seated = true;
      elapsed = 0;
      clearInput();
      savedActors = actors.map(capture);
      savedNodes = rigs.flatMap((rig) =>
        [
          rig.body,
          rig.head,
          ...rig.legs,
          ...rig.arms,
          ...rig.feet,
          ...rig.legs.map((leg) => leg.getObjectByName("beach-sandal")),
        ].map(capture),
      );
      view = {
        position: camera.position.clone(),
        quaternion: camera.quaternion.clone(),
      };
      actors.forEach((actor, i) => {
        actor.position
          .copy(spot.group.position)
          .add(new THREE.Vector3(i ? 0.8 : -0.8, -0.55, 0));
        actor.rotation.set(0, Math.PI + 0.18, 0);
        const rig = rigs[i];
        rig.body.position.set(0, 0, 0);
        rig.body.rotation.set(0, 0, 0);
        rig.head.rotation.set(0, i ? 0.04 : -0.04, 0);
        rig.legs.forEach((leg) => {
          leg.position.y += 0.18;
          leg.rotation.set(-1.2, 0, 0);
          leg.getObjectByName("beach-sandal").rotation.x = 1.2;
        });
        rig.feet.forEach((foot) => {
          foot.rotation.x = 1.2;
        });
        rig.arms.forEach((arm, j) => {
          arm.rotation.set(-0.4, 0, j ? 0.1 : -0.1);
        });
        rig.items.setHidden("beach-rest", true);
        releases.push(rig.appearance.override({ expression: "happy" }));
      });
      toast("A sunset for two ♥ · X or Stand up when you're ready");
      return true;
    },
    stand,
    update(dt) {
      if (!seated) return;
      elapsed += dt;
      rigs.forEach((rig, i) => {
        rig.body.position.y = Math.sin(elapsed * 1.6 + i * 0.3) * 0.008;
      });
    },
    updateCamera(dt) {
      if (!seated) return false;
      const target = spot.group.position
        .clone()
        .add(new THREE.Vector3(3, 4.2, 10));
      camera.position.lerp(target, 1 - Math.exp(-dt * 3));
      camera.lookAt(spot.group.position.x, 1, spot.group.position.z - 2);
      return true;
    },
  };
}
