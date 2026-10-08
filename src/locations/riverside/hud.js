export function createRiversideHud(context) {
  const { boatTrip: boat, cableCar: cable, riverside, hero } = context;
  return () => {
    const gateX = riverside.returnGate.position.x - hero.position.x,
      gateZ = riverside.returnGate.position.z - hero.position.z;
    const distance = Math.round(Math.hypot(gateX, gateZ));
    const direction = `${Math.abs(gateZ) > 3 ? (gateZ > 0 ? "south" : "north") : ""}${Math.abs(gateX) > 3 ? (gateX > 0 ? "east" : "west") : ""}`;
    return {
      countsId: boat.atLagoon ? "lagoonCounts" : "riverCounts",
      actions: [
        {
          id: "boatAction",
          key: "KeyT",
          label: boat.rowing
            ? "Rowing together…"
            : boat.atLagoon
              ? "Return by boat · T"
              : "Board boat · T",
          visible:
            !cable.riding && !cable.atSummit && (boat.rowing || boat.nearby()),
          disabled: boat.rowing,
          run: () => context.boardBoat(),
        },
        {
          id: "cableAction",
          key: "KeyC",
          label: cable.riding
            ? "Above the treetops…"
            : cable.atSummit
              ? "Return to flower island · C"
              : "Ride to mountain summit · C",
          visible:
            boat.atLagoon && !boat.rowing && (cable.riding || cable.nearby()),
          disabled: cable.riding,
          run: () => context.boardCableCar(),
        },
      ],
      hint: cable.riding
        ? "Both aboard · Rising above the lake and forest. Camera controls still work."
        : cable.atSummit
          ? "Summit castle · Enter through the open arch. Return cable car: beside the castle · C."
          : boat.rowing
            ? "Both aboard · Enjoy the ride. Camera controls still work."
            : boat.atLagoon
              ? "Follow the clear paths through the sunflowers. Cross the bridge for more gems. Cable car: north end of the flower island · C. Return boat: south dock."
              : `Explore the island. A mountain waterfall feeds the river. Boat dock: east bank by the bridge. Return gate: ${distance} m ${direction || "away"}, beside the rainbow lookout.`,
      region: cable.riding
        ? "Above the treetops"
        : cable.atSummit
          ? cable.summit.castle.inside(hero.position)
            ? "Inside the summit castle"
            : "Summit castle"
          : boat.rowing
            ? "Rowing together"
            : boat.atLagoon
              ? "Lotus Lagoon"
              : riverside.locationAt(hero.position),
    };
  };
}
