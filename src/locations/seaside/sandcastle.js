import * as THREE from "three";

export const CASTLE_STAGES = [
  "Shape the base",
  "Build the towers",
  "Decorate with shells",
];

export function createSandcastle({ parent, helpers, blockers }) {
  const { mesh, ball, box, cyl } = helpers;
  const group = new THREE.Group();
  group.name = "sandcastle-building-spot";
  group.position.set(2, 0, 4);
  parent.add(group);
  const mound = ball(1.8, "#d9b181", 0, -0.15, 0, group);
  mound.scale.set(1.1, 0.15, 0.9);
  const bucket = cyl(0.29, 0.21, 0.55, "#78aeba", -2, 0.28, 0.3, group, 16);
  bucket.name = "sandcastle-bucket";
  const handle = mesh(
    new THREE.TorusGeometry(0.28, 0.025, 5, 16, Math.PI),
    "#f9e1af",
    -2,
    0.52,
    0.3,
    group,
  );
  handle.rotation.z = 0;
  cyl(0.265, 0.265, 0.015, "#c49f75", -2, 0.565, 0.3, group, 16);
  const shovel = new THREE.Group();
  shovel.name = "sandcastle-spade";
  shovel.position.set(2.1, 0.08, 0.4);
  shovel.rotation.set(0, -0.55, Math.PI / 2);
  group.add(shovel);
  cyl(0.035, 0.035, 0.8, "#cbb082", 0, 0.4, 0, shovel);
  const blade = box(0.3, 0.36, 0.045, "#e9a184", 0, -0.08, 0, shovel);
  blade.rotation.z = 0.08;
  mesh(
    new THREE.TorusGeometry(0.12, 0.025, 5, 12),
    "#e9a184",
    0,
    0.9,
    0,
    shovel,
  );
  const stages = Array.from({ length: 3 }, (_, i) => {
    const stage = new THREE.Group();
    stage.name = `sandcastle-stage-${i + 1}`;
    group.add(stage);
    return stage;
  });
  const sand = "#ddb582",
    shadow = "#aa845e";
  box(2.6, 0.65, 1.9, sand, 0, 0.34, 0, stages[0]);
  box(1.1, 0.6, 0.9, sand, 0, 0.91, 0, stages[0]);
  box(0.38, 0.45, 0.02, shadow, 0, 0.24, 0.961, stages[0]);
  for (const x of [-1, 1])
    for (const z of [-0.65, 0.65]) {
      cyl(0.33, 0.42, 1.25, sand, x, 0.7, z, stages[1], 20);
      cyl(0.36, 0.36, 0.12, "#e6bf8d", x, 1.36, z, stages[1], 20);
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        box(
          0.13,
          0.18,
          0.13,
          sand,
          x + Math.cos(angle) * 0.27,
          1.48,
          z + Math.sin(angle) * 0.27,
          stages[1],
        );
      }
      box(0.12, 0.22, 0.025, shadow, x, 0.95, z + 0.34, stages[1]);
    }
  cyl(0.022, 0.028, 1.25, "#ac8d66", 0, 1.6, 0, stages[2]);
  const flagShape = new THREE.Shape();
  flagShape.moveTo(0, 0);
  flagShape.lineTo(0.65, -0.15);
  flagShape.lineTo(0, -0.3);
  flagShape.closePath();
  const flag = mesh(
    new THREE.ShapeGeometry(flagShape),
    new THREE.MeshStandardMaterial({
      color: "#de958b",
      side: THREE.DoubleSide,
    }),
    0.025,
    2.2,
    0,
    stages[2],
  );
  for (let i = 0; i < 9; i++) {
    const shell = ball(
      0.09,
      i % 2 ? "#f6e5c7" : "#e9aca0",
      -0.85 + i * 0.21,
      0.045,
      1.25,
      stages[2],
    );
    shell.scale.set(1, 0.35, 0.75);
  }
  blockers.push({ x: 2, z: 4, r: 1.65 });
  let stage = 0;
  function sync() {
    stages.forEach((part, i) => {
      part.visible = i < stage;
      part.scale.setScalar(1);
    });
  }
  sync();
  return {
    group,
    stages,
    flag,
    get stage() {
      return stage;
    },
    nearby: (p) => Math.hypot(p.x - 2, p.z - 4) < 3.8,
    advance() {
      stage = Math.min(3, stage + 1);
      sync();
    },
    preview(progress) {
      if (stage >= 3) return;
      stages[stage].visible = true;
      stages[stage].scale.setScalar(THREE.MathUtils.clamp(progress, 0.01, 1));
    },
    cancelPreview: sync,
    reset() {
      stage = 0;
      sync();
    },
    update(time) {
      flag.rotation.y = Math.sin(time * 2.6) * 0.13;
    },
  };
}

// Short shared activities capture the walking pose and restore it on completion,
// cancellation, departure, or restart. In-progress poses never become a save.
export function createBeachActivity({
  hero,
  heroRig,
  companion,
  camera,
  clearRestInput,
  toast,
  burst,
}) {
  const actors = [hero, companion.character],
    rigs = [heroRig, companion.rig];
  let current = null,
    saved = [],
    releases = [],
    view;
  function capture(node) {
    return {
      node,
      position: node.position.clone(),
      quaternion: node.quaternion.clone(),
    };
  }
  function finish(complete = false, notify = true) {
    if (!current) return;
    const activity = current;
    current = null;
    saved.forEach(({ node, position, quaternion }) => {
      node.position.copy(position);
      node.quaternion.copy(quaternion);
    });
    releases.forEach((release) => release());
    rigs.forEach((rig) => rig.items.setHidden("beach-activity", false));
    camera.position.copy(view.position);
    camera.quaternion.copy(view.quaternion);
    clearRestInput();
    if (activity.building && !complete) activity.spot.cancelPreview();
    if (complete) activity.complete?.();
    else if (notify) toast("Back to our beach walk · You can return anytime");
  }
  function start(kind, spot) {
    if (current || !spot.nearby(hero.position)) return false;
    const building = kind === "castle" && spot.stage < 3;
    current = {
      kind,
      spot,
      elapsed: 0,
      duration: building ? 4.5 : Infinity,
      building,
      label:
        kind === "pool"
          ? "Discovering the tide pool"
          : building
            ? CASTLE_STAGES[spot.stage]
            : "Our sandcastle",
      complete: () => {
        if (building) {
          spot.advance();
          burst(
            spot.group.position.clone().add(new THREE.Vector3(0, 1, 0)),
            "#ffe2aa",
            12,
          );
          toast(
            spot.stage === 3
              ? "Our sandcastle is finished ♥ · A little castle by the sea"
              : `${spot.stage} / 3 sandcastle stages · Next: ${CASTLE_STAGES[spot.stage]}`,
          );
        } else
          toast(
            kind === "pool"
              ? spot.description
              : "Built together, decorated with little treasures ♥",
          );
      },
    };
    clearRestInput();
    if (building) spot.preview(0);
    saved = [
      ...actors,
      ...rigs.flatMap((rig) => [
        rig.body,
        rig.head,
        ...rig.legs,
        ...rig.arms,
        ...rig.feet,
        ...rig.legs
          .map((leg) => leg.getObjectByName("beach-sandal"))
          .filter(Boolean),
      ]),
    ].map(capture);
    view = {
      position: camera.position.clone(),
      quaternion: camera.quaternion.clone(),
    };
    releases = [];
    const offset = kind === "pool" ? 3.4 : 2.65;
    actors.forEach((actor, i) => {
      actor.position
        .copy(spot.group.position)
        .add(new THREE.Vector3(i ? 0.9 : -0.9, -0.4, offset));
      actor.rotation.set(0, Math.PI + (i ? 0.16 : -0.16), 0);
      const rig = rigs[i];
      rig.body.position.set(0, 0, 0);
      rig.body.rotation.set(0.15, 0, 0);
      rig.head.rotation.set(0.22, 0, 0);
      rig.legs.forEach((leg) => {
        leg.rotation.set(-0.95, 0, 0);
        const sandal = leg.getObjectByName("beach-sandal");
        if (sandal) sandal.rotation.x = 0.95;
      });
      rig.feet.forEach((foot) => (foot.rotation.x = 0.95));
      rig.arms.forEach((arm, j) =>
        arm.rotation.set(-0.65, 0, j ? 0.12 : -0.12),
      );
      rig.items.setHidden("beach-activity", true);
      releases.push(rig.appearance.override({ expression: "happy" }));
    });
    toast(
      kind === "pool"
        ? spot.description
        : building
          ? `${current.label} together · X to stop`
          : "Our little castle by the sea ♥",
    );
    return true;
  }
  return {
    get active() {
      return Boolean(current);
    },
    get label() {
      return current?.label;
    },
    get secondsLeft() {
      return current && Number.isFinite(current.duration)
        ? Math.ceil(current.duration - current.elapsed)
        : null;
    },
    start,
    cancel: (notify = true) => finish(false, notify),
    update(dt) {
      if (!current) return;
      current.elapsed += dt;
      if (current.building)
        current.spot.preview(current.elapsed / current.duration);
      rigs.forEach((rig, i) => {
        rig.body.position.y = Math.sin(current.elapsed * 1.8 + i) * 0.01;
        if (current.building)
          rig.arms.forEach(
            (arm, j) =>
              (arm.rotation.x =
                -0.65 + Math.sin(current.elapsed * 4 + i * 1.7 + j) * 0.28),
          );
      });
      if (current.elapsed >= current.duration) finish(true);
    },
    updateCamera(dt) {
      if (!current) return false;
      const spot = current.spot.group.position;
      const offset =
        camera.aspect < 0.8
          ? new THREE.Vector3(5, 8.5, 15)
          : new THREE.Vector3(6, 7.5, 11);
      camera.position.lerp(spot.clone().add(offset), 1 - Math.exp(-dt * 3));
      camera.lookAt(spot.x, 0.5, spot.z + 1.3);
      return true;
    },
  };
}
