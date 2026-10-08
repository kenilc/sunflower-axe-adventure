export function createLocationManager({ places, initial = "garden" }) {
  let area = initial;
  let room = null;
  function ancestors(id) {
    const result = [];
    while (id) {
      if (result.includes(id)) throw new Error(`Place parent cycle: ${id}`);
      result.push(id);
      id = places.get(id).parent;
    }
    return result;
  }
  function current() {
    let id = room ?? area;
    const seen = new Set();
    while (true) {
      if (seen.has(id)) throw new Error(`Place resolver cycle: ${id}`);
      seen.add(id);
      const next = places.get(id).resolve?.();
      if (!next) return id;
      places.get(next);
      id = next;
    }
  }
  function is(id) {
    if (id === area) return true;
    let active = current();
    while (active !== area) {
      if (active === id) return true;
      active = places.get(active).parent;
      if (!active) break;
    }
    return false;
  }
  // Compatibility flags are declared by places, rather than built into this manager.
  const state = new Proxy(
    {},
    {
      get(_, key) {
        const place = places.all().find((entry) => entry.legacyFlag === key);
        return place ? is(place.id) : undefined;
      },
    },
  );
  return {
    state,
    is,
    get area() {
      return area;
    },
    get room() {
      return room;
    },
    get current() {
      return current();
    },
    get active() {
      return places.get(current());
    },
    get activeTerrain() {
      return places.get(current()).terrain;
    },
    select(id) {
      const place = places.get(id);
      if (place.kind === "area") {
        this.setArea(id);
        return;
      }
      const root = ancestors(id).find(
        (parent) => places.get(parent).kind === "area",
      );
      if (!root) throw new Error(`Place ${id} has no root area`);
      if (area !== root) this.setArea(root);
      if (place.kind === "room") this.setRoom(id);
    },
    setArea(next) {
      if (places.get(next).kind !== "area")
        throw new Error(`Not a root area: ${next}`);
      area = next;
      room = null;
    },
    setRoom(next) {
      if (
        next !== null &&
        (places.get(next).kind !== "room" || !ancestors(next).includes(area))
      )
        throw new Error(`Room ${next} is outside ${area}`);
      room = next;
    },
  };
}
