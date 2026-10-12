import * as THREE from "three";
import { createTreeVisibility } from "./tree-visibility.js";
import { createSceneryVisibility } from "./scenery-visibility.js";

// Fades scenery that hides the heroine. Places can declare:
// - fadingGates: gates whose tall tops fade (indexed in registration order);
// - fadingExtras: moving groups faded while the place is the current area;
// - photoVisibility(camera, actors, dt, enabled): their fading in Camera
//   mode, which also replaces their afterCamera() while photographing.
export function createSceneryFading({ places, hero, companion }) {
  const actors = [hero, companion.character];
  // Tall gate tops stay prominent on approach, but fade if they hide the heroine.
  const gateVisibility = createTreeVisibility({ obstructedOpacity: 0.12 });
  for (const place of places.all())
    for (const gate of place.fadingGates ?? []) {
      const canopy = new THREE.Group();
      canopy.name = "gate-canopy";
      gate.add(canopy);
      for (const child of [...gate.children])
        if (child.isMesh && child.position.y >= 4.5) canopy.add(child);
      gateVisibility.add(canopy);
    }
  const sceneryVisibility = new Map();
  function sceneryFor(place) {
    if (!sceneryVisibility.has(place.id))
      sceneryVisibility.set(
        place.id,
        place.group
          ? createSceneryVisibility({ group: place.group, actors })
          : null,
      );
    return sceneryVisibility.get(place.id);
  }
  places.all().forEach(sceneryFor);
  const extras = new Map(
    places
      .all()
      .filter((place) => place.fadingExtras)
      .map((place) => [
        place.id,
        place.fadingExtras.map((group) =>
          createSceneryVisibility({ group, actors }),
        ),
      ]),
  );
  // Runs after the camera moves each frame.
  function update({
    camera,
    dt,
    time,
    enabled,
    photographing,
    viewingAlbum,
    rootPlace,
    activePlace,
  }) {
    gateVisibility.update(camera, [hero], dt, enabled);
    if (photographing) {
      if (!activePlace.photoVisibility) activePlace.afterCamera?.(dt, time);
      rootPlace.photoVisibility?.(camera, [hero], dt, enabled);
    } else if (!viewingAlbum) {
      for (const place of places.all()) place.afterCamera?.(dt, time);
    }
    if (!viewingAlbum) {
      sceneryFor(activePlace)?.update(camera, hero, dt, enabled);
      if (rootPlace !== activePlace)
        sceneryFor(rootPlace)?.update(camera, hero, dt, enabled);
      for (const visibility of extras.get(rootPlace.id) ?? [])
        visibility.update(camera, hero, dt, enabled);
    }
  }
  return { update };
}
