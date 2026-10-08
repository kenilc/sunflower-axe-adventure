export function createHud({
  $,
  boatTrip,
  cableCar,
  benchMoment,
  festivalMoment,
  festival,
  village,
  alpineCart,
  funfairActivities,
  castleRoom,
  bedRest,
  hero,
  riverside,
}) {
  let hudIdleDelay = 0;
  function updateHudVisibility(moving, dt, paused) {
    hudIdleDelay = paused ? 0 : moving ? 0.9 : Math.max(0, hudIdleDelay - dt);
    document.body.classList.toggle("is-moving", hudIdleDelay > 0);
  }
  return function updateHud({
    isMoving,
    paused,
    dt,
    insideCastle,
    insideRiver,
    insideCave,
    insideFestival,
    insideFunfair,
    insideVillage,
    activeVillageShop,
    villageActivityCooldown,
    castleActivityCooldown,
  }) {
    updateHudVisibility(isMoving, dt, paused);
    $("#boatAction").hidden =
      insideCastle ||
      !insideRiver ||
      paused ||
      cableCar.riding ||
      cableCar.atSummit ||
      (!boatTrip.rowing && !boatTrip.nearby());
    $("#boatAction").disabled = boatTrip.rowing;
    $("#boatAction").textContent = boatTrip.rowing
      ? "Rowing together…"
      : boatTrip.atLagoon
        ? "Return by boat · T"
        : "Board boat · T";
    $("#cableAction").hidden =
      insideCastle ||
      !insideRiver ||
      !boatTrip.atLagoon ||
      paused ||
      boatTrip.rowing ||
      (!cableCar.riding && !cableCar.nearby());
    $("#cableAction").disabled = cableCar.riding;
    $("#cableAction").textContent = cableCar.riding
      ? "Above the treetops…"
      : cableCar.atSummit
        ? "Return to flower island · C"
        : "Ride to mountain summit · C";
    $("#benchAction").hidden =
      insideCave ||
      insideRiver ||
      insideFestival ||
      insideFunfair ||
      insideVillage ||
      paused ||
      benchMoment.seated ||
      !benchMoment.nearby();
    $("#benchStand").hidden = !benchMoment.seated || paused;
    $("#throw").hidden =
      insideFestival || insideCastle || insideFunfair || insideVillage;
    const festivalAction =
      insideFestival &&
      (festivalMoment.active || festival.nearBridge(hero.position));
    $("#festivalAction").hidden = !festivalAction || paused;
    $("#festivalAction").textContent = festivalMoment.active
      ? "Keep exploring · X"
      : "Watch fireworks together · X";
    if (insideFestival)
      $("#caveHint").textContent = festivalMoment.active
        ? "A happy moment on the bridge ♥ · X to keep exploring."
        : "Bridge: center of the river · X to watch together. Tea house: northwest. Firefly gardens: northeast. Return gate: south. Festival lantern gate: north.";
    const villageAction = insideVillage
      ? alpineCart.riding
        ? { label: "Wheee! Sliding down the mountain…" }
        : village.nearby(hero.position, activeVillageShop)
      : null;
    $("#villageAction").hidden = !villageAction || paused;
    $("#villageAction").textContent =
      villageAction?.label ?? "Explore the village · X";
    $("#villageAction").disabled =
      alpineCart.riding || villageActivityCooldown > 0;
    if (insideVillage)
      $("#caveHint").textContent = activeVillageShop
        ? "Counter: X nearby. Walk out through the open front to return to the street."
        : "Three shops: north side of the street · X. Sheep: eastern meadow. Via ferrata: west path. Return gate: south.";
    const fairAction = insideFunfair ? funfairActivities.nearby() : null;
    $("#funfairAction").hidden = !fairAction || paused;
    $("#funfairAction").textContent = funfairActivities.aiming
      ? "Throw ring · X"
      : (fairAction?.label ?? "Explore the funfair · X");
    $("#funfairAction").disabled =
      funfairActivities.throwing ||
      (fairAction?.kind === "toss" && funfairActivities.collected === 3);
    $("#funfairExit").hidden =
      !insideFunfair || !funfairActivities.playing || paused;
    $("#stick").hidden = insideFunfair && funfairActivities.playing;
    $("#ringMeter").hidden =
      !insideFunfair || !funfairActivities.aiming || paused;
    $("#ringNeedle").style.left = `${(funfairActivities.aim + 1) * 50}%`;
    $("#ringTarget").style.left = `${(funfairActivities.target + 1) * 50}%`;
    $("#ringMeter").setAttribute(
      "aria-valuenow",
      String(Math.round((funfairActivities.aim + 1) * 50)),
    );
    if (insideFunfair)
      $("#caveHint").textContent = funfairActivities.playing
        ? "Ring toss · X, Space or click to throw. Leave booth or Esc to return to the park."
        : funfairActivities.riding
          ? "Enjoy the ride together · X to finish early. Camera controls still work."
          : "Ferris wheel: northwest. Carousel: northeast. Ring toss: southeast · X nearby. Return gate: south. Festival lantern gate: north.";
    const castleActivity = insideCastle
      ? bedRest.resting
        ? { label: "Get up · X" }
        : castleRoom.nearby(hero.position)
      : null;
    $("#castleAction").hidden = !castleActivity || paused;
    $("#castleAction").textContent =
      castleActivity?.label ?? "Explore the castle · X";
    $("#castleAction").disabled = castleActivityCooldown > 0;
    const x = hero.position.x,
      z = hero.position.z;
    const region = insideFestival
      ? festivalMoment.active
        ? "Summer Festival · Fireworks for two"
        : "Japanese Summer Festival"
      : insideVillage
        ? activeVillageShop
          ? activeVillageShop.name
          : alpineCart.riding
            ? "Alpine cart · Down the mountain"
            : village.onTrail(x, z)
              ? village.trailInfo(hero.position).bridge
                ? "Via Ferrata · Gorge crossing"
                : village.trailInfo(hero.position).climbing
                  ? "Via Ferrata · Iron-rung ascent"
                  : "Via Ferrata · Mountain traverse"
              : hero.position.y > 8
                ? "Via Ferrata · Summit rest"
                : "Edelweiss Village"
        : insideFunfair
          ? funfairActivities.riding
            ? funfairActivities.ride === "ferris"
              ? "Sunflower Funfair · Ferris wheel"
              : "Sunflower Funfair · Woodland carousel"
            : funfairActivities.playing
              ? "Sunflower Funfair · Ring toss"
              : "Sunflower Funfair"
          : insideCastle
            ? bedRest.resting
              ? "The Cloud Castle · Resting together"
              : "The Cloud Castle · Great Room"
            : insideRiver
              ? cableCar.riding
                ? "Above the treetops"
                : cableCar.atSummit
                  ? cableCar.summit.castle.inside(hero.position)
                    ? "Inside the summit castle"
                    : "Summit castle"
                  : boatTrip.rowing
                    ? "Rowing together"
                    : boatTrip.atLagoon
                      ? "Lotus Lagoon"
                      : riverside.locationAt(hero.position)
              : insideCave
                ? "The Golden Grotto"
                : z < -38
                  ? "Treasure cave entrance"
                  : z < -20
                    ? "The sun shrine"
                    : Math.hypot(x - 8, z - 12) < 7
                      ? "Sunflower lake"
                      : x > 16
                        ? "Whispering grove"
                        : x < -16
                          ? "Old garden ruins"
                          : z > 16
                            ? "Wildflower trail"
                            : "Petal clearing";
    if ($("#region").firstChild.textContent !== region)
      $("#region").firstChild.textContent = region;
  };
}
