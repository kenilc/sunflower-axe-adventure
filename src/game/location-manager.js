// Root areas are exclusive. Castle is a room within the riverside journey;
// summit and lagoon terrain remain owned by their transport activities.
export function createLocationManager({
  terrains,
  getShop,
  getSummit,
  getLagoon,
}) {
  let area = "garden";
  let room = null;
  const state = {
    get insideCastle() {
      return room === "castle";
    },
    get insideRiver() {
      return area === "riverside";
    },
    get insideCave() {
      return area === "cave";
    },
    get insideFestival() {
      return area === "festival";
    },
    get insideFunfair() {
      return area === "funfair";
    },
    get insideVillage() {
      return area === "village";
    },
  };
  return {
    state,
    get area() {
      return area;
    },
    get room() {
      return room;
    },
    get current() {
      if (room) return room;
      if (area === "village" && getShop()) return "shop";
      if (area === "riverside") {
        if (getSummit()) return "summit";
        if (getLagoon()) return "lagoon";
      }
      return area;
    },
    get activeTerrain() {
      if (room) return terrains[room];
      if (area === "village") return getShop() ?? terrains.village;
      if (area === "riverside")
        return getSummit() ?? getLagoon() ?? terrains.riverside;
      return terrains[area];
    },
    setArea(next) {
      if (!Object.hasOwn(terrains, next) || next === "castle")
        throw new Error(`Unknown root area: ${next}`);
      area = next;
      room = null;
    },
    setRoom(next) {
      if (next !== null && (next !== "castle" || area !== "riverside"))
        throw new Error("Castle requires a riverside journey");
      room = next;
    },
  };
}
