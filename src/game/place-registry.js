export function createPlaceRegistry() {
  const places = new Map();
  return {
    register(place) {
      if (!place?.id || places.has(place.id))
        throw new Error(`Duplicate or missing place id: ${place?.id}`);
      if (!place.terrain) throw new Error(`Place ${place.id} requires terrain`);
      if (place.group && place.kind !== "context")
        place.group.visible = Boolean(place.initiallyVisible);
      places.set(place.id, {
        kind: "area",
        maxZoom: 26,
        canThrow: true,
        cameraTarget: () => 1,
        reset() {},
        ...place,
      });
      return places.get(place.id);
    },
    get(id) {
      if (!places.has(id)) throw new Error(`Unknown place: ${id}`);
      return places.get(id);
    },
    has(id) {
      return places.has(id);
    },
    all() {
      return [...places.values()];
    },
    incomingGate(from, position) {
      for (const place of places.values())
        if (place.entrance?.from === from && place.entrance.contains(position))
          return { id: place.id };
      return null;
    },
    validate() {
      for (const place of places.values()) {
        const seen = new Set();
        let current = place;
        while (current.parent) {
          if (seen.has(current.id))
            throw new Error(`Place parent cycle: ${current.id}`);
          seen.add(current.id);
          if (!places.has(current.parent))
            throw new Error(
              `Missing parent ${current.parent} for ${current.id}`,
            );
          current = places.get(current.parent);
        }
      }
    },
    reset() {
      for (const place of places.values()) place.reset();
    },
  };
}
