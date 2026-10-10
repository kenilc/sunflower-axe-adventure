import * as THREE from "three";

// Activity controllers keep ownership of their poses. Photography only pauses
// them and chooses a view, so rides and timed moments resume where they stopped.
export function createActivityPhoto({
  hero,
  companion,
  benchMoment,
  bedRest,
  boatTrip,
  cableCar,
  funfairActivities,
  alpineCart,
  sheepMoment,
  festivalMoment,
  village,
  getLocation,
}) {
  function label() {
    if (benchMoment.seated) return "Sunken Garden · Lakeside hug";
    if (bedRest.resting) return "The Cloud Castle · Resting together";
    if (boatTrip.rowing) return "Rainbow Riverside · Rowing together";
    if (cableCar.riding) return "Mountain summit · Cable car for two";
    if (funfairActivities.riding)
      return `Sunflower Funfair · ${funfairActivities.ride === "ferris" ? "Ferris wheel" : "Woodland carousel"}`;
    if (funfairActivities.playing) return "Sunflower Funfair · Ring toss";
    if (alpineCart.riding) return "Edelweiss Village · Alpine cart";
    if (alpineCart.vanishing) return "Edelweiss Village · A magical arrival";
    if (sheepMoment.active) return "Edelweiss Village · Sheep meadow";
    if (festivalMoment.active)
      return "Japanese Summer Festival · Fireworks for two";
    if (
      getLocation() === "village" &&
      village.onTrail(hero.position.x, hero.position.z)
    )
      return "Edelweiss Village · Via Ferrata";
    return null;
  }
  return {
    label,
    preset() {
      if (!label()) return undefined;
      const actors = [hero, companion.character];
      const positions = actors.map((actor) =>
        actor.getWorldPosition(new THREE.Vector3()),
      );
      const rotations = actors.map((actor) =>
        actor.getWorldQuaternion(new THREE.Quaternion()),
      );
      const target = new THREE.Vector3();
      const front = new THREE.Vector3();
      actors.forEach((actor, i) => {
        target
          .add(positions[i])
          .add(new THREE.Vector3(0, 1.3, 0).applyQuaternion(rotations[i]));
        front.add(new THREE.Vector3(0, 0, 1).applyQuaternion(rotations[i]));
      });
      target.multiplyScalar(0.5);
      if (front.lengthSq() < 0.01)
        front.set(0, 0, 1).applyQuaternion(rotations[0]);
      return {
        lockActors: true,
        target,
        yaw: Math.atan2(front.x, front.z) + 0.25,
        pitch: bedRest.resting ? 65 : 18,
        distance: Math.max(9, positions[0].distanceTo(positions[1]) + 6),
        fov: 55,
      };
    },
  };
}
