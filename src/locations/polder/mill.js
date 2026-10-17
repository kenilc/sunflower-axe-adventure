import * as THREE from "three";
import { instantiateModel } from "../../assets/models.js";
import { POLDER_ENVIRONMENT } from "./environment.js";
import { WINDMILL } from "./world.js";

export const MILL_ENVIRONMENT = {
  background: "#cdb79a",
  skyTop: null,
  fogDensity: 0.008,
  sunIntensity: 1.8,
  sunColor: "#ffe7c4",
  sunOffset: [-10, 24, 12],
  fillIntensity: 1.4,
  fillColor: "#ffe9d0",
  groundColor: "#6b5340",
  exposure: 1.05,
};

// The milling floor from assets/blender/build_mill_interior.py: the stones
// on their platform in the middle, the ladder at the back, the doorway at
// the front. Blender's +Y is the game's -Z.
const ROOM_RADIUS = 6.4;
const LADDER = new THREE.Vector3(0, 0, -5.3);
const STONES = new THREE.Vector3(0, 0, 3.1);

function createMillFloor(context) {
  const group = instantiateModel(context.models.mill_interior);
  group.name = "polder-mill-floor";
  group.visible = false;
  context.scene.add(group);
  return {
    group,
    runner: group.getObjectByName("runner"),
    gears: group.getObjectByName("gears"),
    blockers: [
      { x: 0, z: 0, r: 2.2 },
      { x: 1.25, z: 2.85, r: 0.55 },
      { x: -5.0, z: -2.9, r: 1.1 },
      { x: 4.9, z: -3.2, r: 1.2 },
      { x: -2.2, z: -5.6, r: 0.9 },
      { x: -4.4, z: 1.2, r: 1.35 },
    ],
    contains: (x, z) => Math.hypot(x, z) < ROOM_RADIUS,
    heightAt: () => 0,
    followDistance: 3,
    isExit: (p) => Math.abs(p.x) < 1.1 && p.z > ROOM_RADIUS - 0.5,
  };
}

// Directions around the windmill, with the turn the model stands at.
function around(angle, radius) {
  const a = WINDMILL.turn + angle;
  return new THREE.Vector3(
    WINDMILL.x + Math.sin(a) * radius,
    WINDMILL.stage,
    WINDMILL.z + Math.cos(a) * radius,
  );
}

export function createMillPlaces(context, { world, memories }) {
  const floor = createMillFloor(context);
  let grinding = 0;
  const near = (spot, reach) =>
    Math.hypot(
      context.hero.position.x - spot.x,
      context.hero.position.z - spot.z,
    ) < reach;
  function nearby() {
    if (near(STONES, 1.8)) return "stones";
    if (near(LADDER, 1.6)) return "ladder";
    return null;
  }
  function grind() {
    grinding = 5;
    world.gust(5);
    context.burst(new THREE.Vector3(1.25, 1.2, 2.85), "#f7f3ea", 18);
    memories.add("flour", "The stones rumble and flour pours down the chute ♥");
    return true;
  }
  const mill = {
    id: "polder:mill",
    name: "Tulip Polder · Inside the windmill",
    progressLabel: "Tulip Polder · Windmill",
    parent: "polder",
    kind: "room",
    group: floor.group,
    terrain: floor,
    canThrow: false,
    maxZoom: 22,
    cameraTarget: () => 1,
    canPhotograph: () => true,
    photoLocation: () => "Tulip Polder · Inside the windmill",
    entrance: {
      from: "polder",
      contains: (p) =>
        Math.hypot(p.x - world.millDoor.x, p.z - world.millDoor.z) < 1.1,
    },
    returnSpawn: around(0, WINDMILL.foot + 2.4)
      .setY(0)
      .toArray(),
    settings: {
      spawn: [0, 0, ROOM_RADIUS - 1.6],
      heading: Math.PI,
      camera: { yaw: 0, pitch: 0.66, zoom: 18, fov: 50 },
      environment: MILL_ENVIRONMENT,
      instructions:
        "<kbd>W A S D</kbd> walk <kbd>X</kbd> millstones / ladder <kbd>M</kbd> photo",
    },
    enter({ returning } = {}) {
      if (!returning)
        context.toast(
          "The milling floor ♥ Millstones in the middle · Ladder to the stage at the back",
        );
    },
    interact() {
      const kind = nearby();
      if (kind === "stones") return grind();
      if (kind === "ladder") return context.transitions.go("polder:stage");
      return false;
    },
    getGate: () =>
      floor.isExit(context.hero.position) ? { id: "polder" } : null,
    animate(dt) {
      grinding = Math.max(0, grinding - dt);
      // The stones and gears turn with the sails.
      floor.gears.rotation.y += world.windSpeed * dt * 0.9;
      floor.runner.rotation.y += world.windSpeed * dt * 2.6;
      if (grinding > 0 && Math.random() < dt * 6)
        context.burst(new THREE.Vector3(1.25, 1.1, 2.85), "#f7f3ea", 2);
    },
    getHud() {
      const kind = nearby();
      let label = "Explore the windmill · X",
        icon = "interact",
        hint =
          "Millstones: middle · Ladder up to the stage: back · Door: front";
      if (kind === "stones") {
        label =
          grinding > 0
            ? "The stones are grinding…"
            : "Grind flour together · X";
        hint =
          "Molen · Let the wind turn the stones and fill a sack with flour · X";
      } else if (kind === "ladder") {
        label = "Climb up to the stage · X";
        icon = "gate";
        hint = "Up the ladder and out onto the stage around the windmill · X";
      }
      return {
        region: "Inside the windmill",
        quest: {
          eyebrow: "TULIP POLDER · THE WINDMILL",
          title: "Turning stones.<br />Flour in the air.",
          objective: memories.objective,
        },
        progress: memories.progress,
        hint,
        actions: [
          {
            id: "placeAction",
            key: "KeyX",
            icon,
            label,
            visible: Boolean(kind) && !(kind === "stones" && grinding > 0),
            run: mill.interact,
          },
        ],
      };
    },
    reset() {
      grinding = 0;
    },
  };

  // The stage: the walkway around the windmill's waist, high over the
  // tulips. It is part of the polder's own scenery, walked at deck height.
  const stageDoor = around(0, WINDMILL.stageInner + 0.25);
  const stageTerrain = {
    blockers: [],
    followDistance: 2.6,
    contains(x, z) {
      const d = Math.hypot(x - WINDMILL.x, z - WINDMILL.z);
      return d > WINDMILL.stageInner && d < WINDMILL.stageOuter;
    },
    heightAt: () => WINDMILL.stage,
  };
  const nearStageDoor = () => near(stageDoor, 1.5);
  const stage = {
    id: "polder:stage",
    name: "Tulip Polder · Windmill stage",
    progressLabel: "Tulip Polder · Windmill stage",
    parent: "polder:mill",
    kind: "room",
    group: world.group,
    terrain: stageTerrain,
    canThrow: false,
    maxZoom: 30,
    cameraTarget: () => 1.2,
    canPhotograph: () => true,
    photoLocation: () => "Tulip Polder · On the windmill stage",
    returnSpawn: [LADDER.x, 0, LADDER.z + 1.2],
    settings: {
      // Arrive just beside the stage door, looking out over the fields.
      spawn: around(
        0.45,
        (WINDMILL.stageInner + WINDMILL.stageOuter) / 2,
      ).toArray(),
      heading: WINDMILL.turn,
      camera: { yaw: WINDMILL.turn + 0.5, pitch: 0.3, zoom: 15, fov: 50 },
      environment: POLDER_ENVIRONMENT,
      instructions:
        "<kbd>W A S D</kbd> walk round the stage <kbd>X</kbd> climb down <kbd>M</kbd> photo",
    },
    enter() {
      memories.add("stage", "The whole polder below us ♥ What a view");
    },
    interact: () =>
      nearStageDoor() ? context.transitions.go("polder:mill") : false,
    getHud() {
      const door = nearStageDoor();
      return {
        region: "Windmill stage",
        quest: {
          eyebrow: "TULIP POLDER · THE STAGE",
          title: "Sails overhead.<br />Tulips in rows below.",
          objective: memories.objective,
        },
        progress: memories.progress,
        hint: door
          ? "Back through the door and down the ladder · X"
          : "Walk round the stage for the view · The sails turn right above you",
        actions: [
          {
            id: "placeAction",
            key: "KeyX",
            icon: "return",
            label: "Climb back down · X",
            visible: door,
            run: stage.interact,
          },
        ],
      };
    },
  };
  return [mill, stage];
}
