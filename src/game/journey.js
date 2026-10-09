export const JOURNEY_SAVE_KEY = "sunflower-journey-v1";

export const JOURNEY_DESTINATIONS = [
  {
    id: "garden",
    name: "Sunken Garden",
    icon: "✿",
    x: 50,
    y: 30,
    hint: "Your adventure begins here",
  },
  {
    id: "cave",
    name: "Golden Grotto",
    icon: "◇",
    x: 50,
    y: 10,
    hint: "North path from the garden",
  },
  {
    id: "village",
    name: "Edelweiss Village",
    icon: "⌂",
    x: 50,
    y: 75,
    hint: "South path from the garden",
  },
  {
    id: "funfair",
    name: "Sunflower Funfair",
    icon: "✧",
    x: 86,
    y: 30,
    hint: "East gate from the garden",
  },
  {
    id: "seaside",
    name: "Sunset Beach",
    icon: "☀",
    x: 78,
    y: 75,
    hint: "Southeast path from the garden",
  },
  {
    id: "festival",
    name: "Night Festival",
    icon: "✺",
    x: 86,
    y: 52,
    hint: "Lantern gate beyond the funfair",
  },
  {
    id: "riverside",
    name: "Rainbow Riverside",
    icon: "≈",
    x: 14,
    y: 30,
    hint: "West gate from the garden",
  },
  {
    id: "lagoon",
    name: "Lotus Lagoon",
    icon: "❀",
    x: 14,
    y: 49,
    hint: "Take the boat from the riverside",
  },
  {
    id: "summit",
    name: "Mountain Summit",
    icon: "△",
    x: 14,
    y: 68,
    hint: "Ride the cable car from the lagoon",
  },
  {
    id: "castle",
    name: "Cloud Castle",
    icon: "♜",
    x: 14,
    y: 87,
    hint: "Through the arch at the summit",
  },
];

export function createJourney({
  places,
  getCurrent,
  canTravel,
  transitions,
  storage = () => globalThis.localStorage,
}) {
  const known = new Set(JOURNEY_DESTINATIONS.map(({ id }) => id));
  let discovered = new Set(["garden"]);
  try {
    const saved = JSON.parse(storage().getItem(JOURNEY_SAVE_KEY));
    if (saved?.version === 1 && Array.isArray(saved.discovered))
      for (const id of saved.discovered)
        if (known.has(id) && places.has(id)) discovered.add(id);
  } catch {}

  function persist() {
    try {
      storage().setItem(
        JOURNEY_SAVE_KEY,
        JSON.stringify({ version: 1, discovered: [...discovered] }),
      );
    } catch {}
  }
  function destinationFor(id) {
    while (id && places.has(id)) {
      if (known.has(id)) return id;
      id = places.get(id).parent;
    }
    return null;
  }
  return {
    get current() {
      return destinationFor(getCurrent());
    },
    get destinations() {
      const current = destinationFor(getCurrent());
      return JOURNEY_DESTINATIONS.filter(({ id }) => places.has(id)).map(
        (destination) => ({
          ...destination,
          parent: destinationFor(places.get(destination.id).parent),
          unlocked: discovered.has(destination.id),
          current: destination.id === current,
        }),
      );
    },
    discover(id) {
      let changed = false;
      // An older location save also establishes the route already travelled.
      while (id && places.has(id)) {
        if (known.has(id) && !discovered.has(id)) {
          discovered.add(id);
          changed = true;
        }
        id = places.get(id).parent;
      }
      if (changed) persist();
      return changed;
    },
    travel(id) {
      if (
        !known.has(id) ||
        !discovered.has(id) ||
        id === destinationFor(getCurrent()) ||
        !canTravel()
      )
        return false;
      return transitions.fastTravel(id);
    },
    reset() {
      discovered = new Set(["garden"]);
      persist();
    },
  };
}
