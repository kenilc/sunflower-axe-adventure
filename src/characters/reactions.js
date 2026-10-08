import * as THREE from "three";

const arrivals = {
  village: "He smiles: ‘A mountain village! Let’s wander together.’",
  riverside: "He points toward the water: ‘Look at that rainbow!’",
  lagoon: "‘So many sunflowers… this feels like your kind of place.’",
  summit: "‘We made it! What a view from up here.’",
  cave: "‘A whole mountain of treasure! Let’s take a closer look.’",
  funfair: "‘Shall we try a ride together?’",
  festival: "‘The lanterns are beautiful. Let’s follow them.’",
  castle: "‘It’s cosy in here. Shall we stay a while?’",
  "shop:bakery": "‘Something smells wonderful in here.’",
  "shop:outfit": "‘I think matching scarves would suit us.’",
  "shop:flowers": "‘We could pick a little bouquet for the journey.’",
};

// Gestures sit on top of walking; they never take movement away from the player.
export function createCompanionReactions({ companion, toast }) {
  const seen = new Set();
  const { character, rig } = companion;
  let current = null,
    pending = null,
    location = null,
    cooldown = 0;
  function cancel() {
    if (current) {
      rig.head.rotation.copy(current.head);
      rig.arms[0].rotation.copy(current.arm);
      current.release();
    }
    current = pending = null;
  }
  function notice(key, { target, text, gesture = "point" }) {
    if (seen.has(key) || cooldown > 0 || current || pending) return false;
    seen.add(key);
    current = {
      key,
      target: target.clone(),
      gesture,
      age: 0,
      head: rig.head.rotation.clone(),
      arm: rig.arms[0].rotation.clone(),
      release: rig.appearance.override({ expression: "happy" }),
    };
    cooldown = 16;
    toast(text);
    return true;
  }
  return {
    notice,
    cancel,
    update(dt, place, heroPosition) {
      cooldown = Math.max(0, cooldown - dt);
      if (place !== location) {
        cancel();
        location = place;
        if (arrivals[place] && !seen.has(`arrival:${place}`))
          pending = { delay: 2.8, place };
      }
      if (pending) {
        pending.delay -= dt;
        if (pending.delay <= 0) {
          const destination = pending.place;
          pending = null;
          notice(`arrival:${destination}`, {
            target: heroPosition.clone().add(new THREE.Vector3(0, 1.5, -8)),
            text: arrivals[destination],
            gesture: "wave",
          });
        }
      }
      if (!current) return;
      current.age += dt;
      const amount = Math.sin(Math.min(1, current.age / 2.6) * Math.PI);
      const direction =
        Math.atan2(
          current.target.x - character.position.x,
          current.target.z - character.position.z,
        ) - character.rotation.y;
      const turn = Math.atan2(Math.sin(direction), Math.cos(direction));
      rig.head.rotation.y =
        current.head.y + THREE.MathUtils.clamp(turn, -0.6, 0.6) * amount;
      rig.head.rotation.x = current.head.x - 0.08 * amount;
      rig.arms[0].rotation.x = -1.25 * amount;
      rig.arms[0].rotation.z =
        current.arm.z +
        (current.gesture === "wave" ? Math.sin(current.age * 9) * 0.2 : -0.18) *
          amount;
      if (current.age >= 2.6) cancel();
    },
    reset() {
      cancel();
      seen.clear();
      location = null;
      cooldown = 0;
    },
    get active() {
      return current?.key ?? null;
    },
    get seen() {
      return new Set(seen);
    },
  };
}
