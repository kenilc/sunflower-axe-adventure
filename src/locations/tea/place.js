import * as THREE from "three";
import { createPoseHold, sitPose } from "../polder/poses.js";
import { TERRACES, createTeaWorld, walkable } from "./world.js";
import { RAIN_ENVIRONMENT, createUmbrella, createWeather } from "./weather.js";

const MOMENTS = ["picking", "puddles", "tea", "train"];
const PICK_SECONDS = 3.5,
  HOP_SECONDS = 0.72,
  HOPS = 4,
  TEA_SECONDS = 4;
const polar = (r, a) => new THREE.Vector3(Math.sin(a) * r, 0, Math.cos(a) * r);

// Woven picker's basket worn on the back, with a mound of leaves that
// grows as they pick.
function makeBasket(helpers) {
  const { cyl, box, ball } = helpers;
  const basket = new THREE.Group();
  basket.name = "tea-basket";
  basket.position.set(0, 1.3, -0.62);
  basket.rotation.x = -0.12;
  cyl(0.36, 0.22, 0.66, "#c8955a", 0, 0, 0, basket, 12);
  for (const y of [-0.18, 0.08, 0.3])
    cyl(
      0.33 + y * 0.18,
      0.33 + y * 0.18,
      0.05,
      "#a8714a",
      0,
      y,
      0,
      basket,
      12,
    ).castShadow = false;
  for (const side of [-1, 1])
    box(0.07, 0.55, 0.04, "#7a5640", side * 0.2, 0.1, 1.08, basket);
  const leaves = ball(0.3, "#6fae4a", 0, 0.3, 0, basket);
  leaves.scale.set(1, 0.05, 1);
  return { basket, leaves };
}

// Misty Tea Terraces: the friends share an umbrella, pick tea, jump in
// puddles, ride the toy train round the hill, and take tea with the red
// panda at the top, after which the rain stops and a rainbow comes out.
export function createTeaPlace(context) {
  const world = createTeaWorld(context);
  const weather = createWeather(context, { group: world.group, world });
  const umbrella = createUmbrella(context);
  const pose = createPoseHold(context, "tea-moment");
  const baskets = pose.rigs.map(() => makeBasket(context.helpers));
  const made = new Set();
  let moment = null,
    elapsed = 0,
    picked = 0,
    facing = 0,
    hops = 0,
    pendingActivity = null;
  const lastSplash = pose.actors.map((actor) => actor.position.clone());
  function remember(kind, message, repeat = true) {
    if (made.has(kind)) {
      if (repeat) context.toast(message);
      return;
    }
    made.add(kind);
    context.toast(
      `${message} · ${made.size} / ${MOMENTS.length} rainy-day memories`,
    );
  }

  // Both stand at the hedge's edge, side by side, facing the tea.
  function startPicking(hedge) {
    const hero = context.hero.position;
    const a = Math.atan2(hero.x, hero.z);
    const stand = hedge.r - hedge.side * 0.6;
    const gap = 1.15 / stand;
    const beside = [a + gap, a - gap].find((b) => {
      const spot = polar(stand, b);
      return walkable(spot.x, spot.z);
    });
    const angles = [a, beside ?? a + gap];
    facing = hedge.side > 0 ? a : a + Math.PI;
    moment = "picking";
    elapsed = picked = 0;
    context.clearRestInput();
    pose.hold((actor, rig, i) => {
      actor.position.copy(polar(stand, angles[i])).setY(hedge.y);
      actor.rotation.set(0, facing, 0);
      const { basket, leaves } = baskets[i];
      leaves.scale.y = 0.05;
      rig.body.add(basket);
    });
  }
  // They hop together in the big puddle, splashing on every landing.
  function startPuddles() {
    const puddle = world.puddles[0];
    facing = context.state.yaw;
    const right = new THREE.Vector3(Math.cos(facing), 0, -Math.sin(facing));
    moment = "puddles";
    elapsed = hops = 0;
    context.clearRestInput();
    pose.hold((actor, rig, i) => {
      actor.position
        .set(puddle.x, puddle.y, puddle.z)
        .addScaledVector(right, (i ? 1 : -1) * 0.55);
      actor.rotation.set(0, facing, 0);
    });
  }
  function startTea() {
    moment = "tea";
    elapsed = 0;
    context.clearRestInput();
    world.panda.pour(3);
    pose.hold((actor, rig, i) => {
      const local = new THREE.Vector3((i ? 1 : -1) * 0.62, 0.17, world.seat.z);
      actor.position.copy(world.house.localToWorld(local));
      actor.rotation.set(0, 0, 0);
      sitPose(rig, 0.2);
    });
  }
  function stopMoment() {
    if (!moment) return false;
    if (moment === "picking")
      baskets.forEach(({ basket }) => basket.removeFromParent());
    moment = null;
    pose.release();
    context.clearRestInput();
    return true;
  }

  // Starts a moment, with a word about it.
  function begin(kind, hedge) {
    if (kind === "train") {
      if (!world.train.board()) return false;
      context.toast("All aboard! Once round the hill on the toy train ♥");
    } else if (kind === "tea") {
      startTea();
      context.toast(
        weather.cleared
          ? "Another cup of tea, looking out over the washed-clean hills ♥"
          : "The red panda pours two cups of tea while the rain patters on the roof…",
      );
    } else if (kind === "puddle") {
      startPuddles();
      context.toast("One, two, three… jump!");
    } else if (kind === "pick" && hedge) {
      startPicking(hedge);
      context.toast("Two leaves and a bud… into the baskets they go");
    } else return false;
    return true;
  }
  function interact() {
    if (moment) return stopMoment();
    if (world.train.riding) return world.train.stop();
    const spot = world.nearby(context.hero.position);
    if (!spot) return false;
    if (spot.kind === "balloon") return world.trip.board();
    return begin(spot.kind, spot.hedge);
  }

  function animateMoment(dt, time) {
    elapsed += dt;
    if (moment === "picking") {
      pose.rigs.forEach((rig, i) => {
        const reach = Math.sin(time * 5 + i * 1.3);
        rig.arms[0].rotation.set(-1.0 - reach * 0.35, 0, -0.15);
        rig.arms[1].rotation.set(-1.0 + reach * 0.35, 0, 0.15);
        rig.head.rotation.x = 0.25;
      });
      if (elapsed > (picked + 1) * 0.45) {
        const i = picked % 2;
        picked++;
        const actor = pose.actors[i];
        const ahead = new THREE.Vector3(
          Math.sin(facing),
          0,
          Math.cos(facing),
        ).multiplyScalar(0.9);
        const shoot = world.pickShoot(actor.position.clone().add(ahead));
        const from = shoot
          ? new THREE.Vector3(shoot.x, shoot.y, shoot.z)
          : actor.position
              .clone()
              .add(ahead)
              .setY(actor.position.y + 0.9);
        context.burst(from, "#8fca5a", 4);
        const { leaves } = baskets[i];
        leaves.scale.y = Math.min(0.55, leaves.scale.y + 0.06);
      }
      if (elapsed > PICK_SECONDS)
        remember("picking", "Baskets full of fresh green tea leaves ♥", false);
    } else if (moment === "puddles") {
      const hop = Math.floor(elapsed / HOP_SECONDS);
      if (hop > hops) {
        hops = hop;
        pose.actors.forEach((actor) => weather.splash(actor.position, true));
        context.beep(440 + hop * 90, 0.09);
        if (hops >= HOPS) {
          stopMoment();
          remember("puddles", "Splash! Jumping in puddles together ♥");
          return;
        }
      }
      const phase = (elapsed % HOP_SECONDS) / HOP_SECONDS;
      const lift = Math.sin(phase * Math.PI);
      const puddle = world.puddles[0];
      pose.actors.forEach((actor, i) => {
        actor.position.y = puddle.y + lift * (0.6 + i * 0.05);
        const rig = pose.rigs[i];
        rig.arms[0].rotation.set(-0.4 - lift * 2.2, 0, -0.3 * lift);
        rig.arms[1].rotation.set(-0.4 - lift * 2.2, 0, 0.3 * lift);
        rig.legs.forEach(
          (leg, k) => (leg.rotation.x = (k ? -1 : 1) * lift * 0.5),
        );
      });
    } else if (moment === "tea") {
      world.cups.forEach(({ tea }) => (tea.visible ||= elapsed > 1.6));
      if (elapsed > TEA_SECONDS && !made.has("tea")) {
        weather.clear();
        remember(
          "tea",
          "Listen… the rain has stopped, and a rainbow arches over the tea hills ♥",
        );
      }
    }
  }

  // Feet splash in the puddles.
  function splashFeet() {
    pose.actors.forEach((actor, i) => {
      if (actor.position.distanceTo(lastSplash[i]) < 0.8) return;
      lastSplash[i].copy(actor.position);
      const puddle = world.puddleAt(actor.position.x, actor.position.z);
      if (!puddle) return;
      weather.splash(actor.position.clone().setY(puddle.y));
      if (i === 0) context.beep(620 + context.rand() * 120, 0.05);
    });
  }

  const tea = {
    id: "tea",
    outfit: "tea",
    name: "Misty Tea Terraces",
    progressLabel: () =>
      world.train.riding ? "toy train" : "Misty Tea Terraces",
    parent: "mist",
    group: world.group,
    terrain: world,
    world,
    weather,
    canThrow: false,
    maxZoom: 42,
    cameraTarget: () => 1.4,
    cameraFloor: (x, z) => world.cameraFloor(x, z),
    canPhotograph: () => true,
    canLeave: () => !moment && !world.train.riding,
    canSaveLocation: () => !moment && !world.train.riding && !world.trip.flying,
    cameraLocked: () => moment === "tea",
    photoLocation: () =>
      ({
        picking: "Misty Tea Terraces · Picking tea",
        puddles: "Misty Tea Terraces · Puddle jumping",
        tea: weather.cleared
          ? "Misty Tea Terraces · Tea under the rainbow"
          : "Misty Tea Terraces · Tea in the rain",
      })[moment] ??
      (world.train.riding
        ? "Misty Tea Terraces · On the toy train"
        : "Misty Tea Terraces"),
    getPhotoPreset() {
      if (!moment) return;
      const middle = pose.actors
        .reduce((sum, actor) => sum.add(actor.position), new THREE.Vector3())
        .multiplyScalar(0.5);
      if (moment === "tea")
        return {
          lockActors: true,
          target: middle.setY(middle.y + 0.9),
          yaw: 0,
          pitch: 8,
          distance: 6,
          fov: 48,
        };
      return {
        lockActors: true,
        target: middle.setY(middle.y + 1.1),
        yaw: facing,
        pitch: 12,
        distance: 6.5,
        fov: 48,
      };
    },
    // Arrive by balloon in the field southwest of the hill; it flies back
    // to the hollow's meadow.
    returnSpawn: [1.6, 0, 28.6],
    settings: {
      spawn: [-11.3, 0, 23.4],
      heading: Math.PI - 0.45,
      camera: { yaw: -0.45, pitch: 0.44, zoom: 25, fov: 50 },
      environment: RAIN_ENVIRONMENT,
      instructions:
        "<kbd>W A S D</kbd> walk <kbd>X</kbd> pick tea / puddle / tea house / train <kbd>M</kbd> photo",
    },
    enter({ returning, options = {} } = {}) {
      weather.reset();
      const { hero, companion } = context;
      const place = (spot, heading = Math.PI) => {
        hero.position.copy(spot).setY(world.heightAt(spot.x, spot.z));
        hero.rotation.set(0, heading, 0);
        companion.reset(hero.position, world.blockers, world);
      };
      // Direct links: ?area=tea&activity=top, tea, train, picking or
      // puddles; activities start on the first frame.
      const activity = options.activity;
      if (activity === "top" || activity === "tea")
        place(world.teaSpot.clone().add(new THREE.Vector3(0, 0, 1.5)));
      else if (activity === "train") place(world.trainSpot);
      else if (activity === "picking")
        place(polar(TERRACES[3].hedge - 0.7, -0.45), -0.45);
      else if (activity === "puddles")
        place(
          new THREE.Vector3(world.puddles[0].x, 0, world.puddles[0].z + 2.4),
        );
      // The links name moments as the spots do.
      pendingActivity =
        { tea: "tea", train: "train", picking: "pick", puddles: "puddle" }[
          activity
        ] ?? null;
      pose.actors.forEach((actor, i) => lastSplash[i].copy(actor.position));
      if (!returning && !pendingActivity)
        context.toast(
          "Pitter-patter… it's raining in the tea hills ♥ Share the umbrella and climb to the tea house at the top",
        );
    },
    exit() {
      stopMoment();
      umbrella.hide();
      weather.reset();
      world.reset();
      world.panda.reset();
      pendingActivity = null;
    },
    interact,
    moveInstead: (dt) => world.train.move(dt) || world.trip.move(dt),
    afterMovement: splashFeet,
    update(dt, time) {
      if (pendingActivity) {
        const activity = pendingActivity;
        pendingActivity = null;
        begin(activity, world.hedgeNear(context.hero.position));
      }
      if (world.train.takeArrival())
        remember("train", "Toot toot! Once round the hill on the toy train ♥");
      if (!moment) return false;
      animateMoment(dt, time);
      return true;
    },
    animate(dt, time, paused) {
      if (paused) return;
      world.animate(dt, time, weather.wet);
      weather.animate(dt, context.camera);
      umbrella.update(
        dt,
        weather.raining && !moment && !world.train.riding && !world.trip.flying,
      );
    },
    updateCamera(dt) {
      if (moment !== "tea") return false;
      // A cosy view of the two of them and the red panda from the front;
      // once the rain stops it pulls back and up to show the rainbow over
      // the tea house.
      const reveal = THREE.MathUtils.smoothstep(1 - weather.wet, 0, 0.8);
      const seats = world.house.localToWorld(
        new THREE.Vector3(0.4, 1.2, world.seat.z),
      );
      const target = seats.clone().add(new THREE.Vector3(0, reveal * 2.5, 0));
      const from = seats
        .clone()
        .add(
          new THREE.Vector3(0.6 + reveal, 1.7 - reveal * 0.3, 6.4 + reveal * 8),
        );
      context.camera.position.lerp(from, 1 - Math.exp(-dt * 2.5));
      context.camera.lookAt(target);
      return true;
    },
    getHud() {
      const spot =
        moment || world.train.riding
          ? null
          : world.nearby(context.hero.position);
      let label = "Explore the terraces · X",
        icon = "interact",
        hint =
          "Tea house: up the stone stairs to the top · Toy train: the halt to the east · Puddles: the lane to the south";
      if (moment === "picking") {
        label = "Stop picking · X";
        icon = "return";
        hint = "Plucking the pale new shoots · X to stop · M for a photo";
      } else if (moment === "puddles") {
        label = "Stop jumping · X";
        icon = "return";
        hint = "Splish, splash! · M for a photo";
      } else if (moment === "tea") {
        label = "Get up from tea · X";
        icon = "return";
        hint = weather.cleared
          ? "Sunshine on the wet tea, and a rainbow over the valley · X to get up · M for a photo"
          : "Rain on the tin roof, steam from the cups · X to get up · M for a photo";
      } else if (world.train.riding) {
        label = "Hop off the train · X";
        icon = "return";
        hint = "Chuff, chuff… round the foot of the hill · M for a photo";
      } else if (spot?.kind === "balloon") {
        label = "Fly the balloon back to the hollow · X";
        icon = "gate";
        hint = "Climb into the basket and float back to the misty forest · X";
      } else if (spot?.kind === "train") {
        label = "Ride the toy train · X";
        hint = "The little blue engine is waiting at the halt · X";
      } else if (spot?.kind === "tea") {
        label = "Sit down for tea · X";
        icon = "tea";
        hint = "The red panda has the kettle on · X";
      } else if (spot?.kind === "puddle") {
        label = "Jump in the puddle · X";
        hint = "A big, inviting puddle · X";
      } else if (spot?.kind === "pick") {
        label = "Pick tea · X";
        icon = "collect";
        hint = "Pale new shoots on the tea bushes · X to pick together";
      }
      const busy = Boolean(moment) || world.train.riding;
      return {
        region: moment === "tea" ? "The tea house" : "Misty Tea Terraces",
        hideStick: busy,
        quest: {
          eyebrow: "A RAINY AFTERNOON IN THE TEA HILLS",
          title: "Rain on the terraces.<br />Tea at the top.",
          objective:
            made.size === MOMENTS.length
              ? "Every rainy-day memory made. Find a photo spot, or fly back by balloon."
              : "Pick tea, jump in the puddle, ride the toy train and take tea at the top.",
        },
        progress: `${made.size} / ${MOMENTS.length} rainy-day memories`,
        hint,
        instructions: busy
          ? "<kbd>X</kbd> stop <kbd>M</kbd> photo"
          : "<kbd>W A S D</kbd> walk <kbd>X</kbd> pick tea / puddle / tea house / train <kbd>M</kbd> photo <kbd>V</kbd> map",
        actions: [
          {
            id: busy ? "teaStop" : "placeAction",
            key: "KeyX",
            icon,
            label,
            visible: busy || Boolean(spot),
            run: interact,
          },
        ],
      };
    },
    getProgress: () => ({
      memories: MOMENTS.filter((kind) => made.has(kind)),
      totalMemories: MOMENTS.length,
      raining: weather.raining,
      moment,
      riding: world.train.riding,
    }),
    reset() {
      stopMoment();
      made.clear();
      pendingActivity = null;
      umbrella.hide();
      weather.reset();
      world.reset();
      world.panda.reset();
    },
  };
  return tea;
}
