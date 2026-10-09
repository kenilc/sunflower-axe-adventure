export const KEEPSAKES_KEY = "sunflower-keepsakes-v1";

export const BEACH_FINDS = [
  {
    id: "pearl-shell",
    name: "Pearl scallop",
    kind: "shell",
    color: "#fff0d8",
    description: "A pearly fan with delicate ribs, polished by the tide.",
    x: -4,
    z: 11,
  },
  {
    id: "rose-stone",
    name: "Rose pebble",
    kind: "stone",
    color: "#d89691",
    description: "A smooth, rosy pebble that catches the last light.",
    x: 5,
    z: 8,
  },
  {
    id: "coral-shell",
    name: "Coral scallop",
    kind: "shell",
    color: "#efac91",
    description: "A little coral-colored fan from the water's edge.",
    x: -12,
    z: 4,
  },
  {
    id: "slate-stone",
    name: "Moon slate",
    kind: "stone",
    color: "#8196a6",
    description: "Cool blue-gray stone with a pale band like moonlight.",
    x: 13,
    z: 2,
  },
  {
    id: "gold-shell",
    name: "Honey scallop",
    kind: "shell",
    color: "#edc176",
    description: "Golden ridges, warm as the sunset over the sea.",
    x: 2,
    z: -2,
  },
  {
    id: "sea-stone",
    name: "Sea-green pebble",
    kind: "stone",
    color: "#8cac9c",
    description: "A rounded green stone, washed smooth by many waves.",
    x: -19,
    z: -3,
  },
  {
    id: "violet-shell",
    name: "Lilac scallop",
    kind: "shell",
    color: "#c9b1d8",
    description: "A soft lilac shell tucked into the rippled sand.",
    x: 20,
    z: -6,
  },
  {
    id: "amber-stone",
    name: "Amber pebble",
    kind: "stone",
    color: "#cda167",
    description: "A honey-colored stone with a tiny cream-colored seam.",
    x: -7,
    z: -9,
  },
  {
    id: "pink-shell",
    name: "Blush scallop",
    kind: "shell",
    color: "#e7b6bf",
    description: "A blush-pink fan left behind by the evening tide.",
    x: 10,
    z: -12,
  },
  {
    id: "ivory-stone",
    name: "Ivory pebble",
    kind: "stone",
    color: "#ded7c6",
    description: "Pale and velvety, like a little piece of the moon.",
    x: -23,
    z: -14,
  },
  {
    id: "blue-shell",
    name: "Blue scallop",
    kind: "shell",
    color: "#a9c9d3",
    description: "A sea-blue shell with edges faded by salt and sun.",
    x: 25,
    z: -14,
  },
  {
    id: "lavender-stone",
    name: "Lavender pebble",
    kind: "stone",
    color: "#a99ba9",
    description: "A lilac-gray stone, a quiet reminder of our beach walk.",
    x: 0,
    z: -16,
  },
];

export function createKeepsakes({
  storage = () => globalThis.localStorage,
} = {}) {
  let items = [],
    loadError = false;
  const known = new Set(BEACH_FINDS.map(({ id }) => id));
  try {
    const saved = JSON.parse(storage().getItem(KEEPSAKES_KEY) ?? "[]");
    if (!Array.isArray(saved)) throw new Error("Invalid collection");
    const seen = new Set();
    items = saved
      .filter((item) => {
        if (
          !known.has(item?.id) ||
          seen.has(item.id) ||
          typeof item.createdAt !== "string" ||
          Number.isNaN(Date.parse(item.createdAt))
        )
          return false;
        seen.add(item.id);
        return true;
      })
      .map(({ id, createdAt }) => ({ id, createdAt }));
  } catch {
    loadError = true;
  }
  return {
    get items() {
      return items.map((item) => ({
        ...BEACH_FINDS.find(({ id }) => id === item.id),
        createdAt: item.createdAt,
      }));
    },
    get loadError() {
      return loadError;
    },
    has: (id) => items.some((item) => item.id === id),
    collect(id) {
      if (!known.has(id)) throw new Error("Unknown keepsake");
      if (items.some((item) => item.id === id)) return false;
      const next = [{ id, createdAt: new Date().toISOString() }, ...items];
      storage().setItem(KEEPSAKES_KEY, JSON.stringify(next));
      items = next;
      loadError = false;
      return true;
    },
  };
}
