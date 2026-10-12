// The object createGame() returns. The page only uses start/stop; tests use
// the rest to drive and inspect the game.
export function createGameApi({
  loop,
  frame,
  readProgress,
  scene,
  camera,
  renderer,
  mesh,
  box,
  cyl,
  ball,
  clock,
  hero,
  heroRig,
  companion,
  garden,
  lakeside,
  shrine,
  targets,
  gems,
  blockers,
  riverside,
  castleRoom,
  funfair,
  village,
  festival,
  photoMode,
  photoAlbum,
  keepsakes,
  collection,
  photography,
  boatTrip,
  cableCar,
  bedRest,
  funfairActivities,
  alpineCart,
  alpineOutfits,
  festivalMoment,
  summerOutfits,
  sheepMoment,
  companionReactions,
  resetAdventure,
  transitions,
  journey,
  travelMap,
  invokeShortcut,
  usePassage,
  useCastlePassage,
  changeCastlePassage,
  interactCastle,
  useVillagePassage,
  useVillageShop,
  interactVillage,
  changeFestivalPassage,
  useFestivalPassage,
  interactFestival,
  boardCableCar,
  boardBoat,
  fire,
  toast,
  locations,
  state,
  keys,
  effects,
  places,
  passageTransition,
}) {
  // Controls the tests call; each runs the named control on its place.
  const control =
    (id, name) =>
    (...args) =>
      places.get(id).controls[name](...args);
  return {
    start: loop.start,
    stop: loop.stop,
    update: frame,
    readProgress,
    rendering: {
      scene,
      camera,
      renderer,
      meshes: { mesh, box, cyl, ball },
      clock,
    },
    characters: { hero, rig: heroRig, companion },
    worlds: {
      garden,
      lakeside,
      shrine,
      targets,
      gems,
      blockers,
      riverside,
      castleRoom,
      funfair,
      village,
      festival,
    },
    activities: {
      photoMode,
      photoAlbum,
      keepsakes,
      collection,
      photography,
      boatTrip,
      cableCar,
      bedRest,
      funfairActivities,
      alpineCart,
      alpineOutfits,
      festivalMoment,
      summerOutfits,
      sheepMoment,
      companionReactions,
    },
    controls: {
      resetAdventure,
      travelTo: (id, options) => transitions.go(id, options),
      fastTravel: (id) => journey.travel(id),
      openMap: travelMap.openMap,
      openKeepsakes: collection.openCollection,
      interact: () => invokeShortcut("KeyX"),
      usePassage,
      useCastlePassage,
      changeCastlePassage,
      interactCastle,
      useFunfairPassage: control("funfair", "useFunfairPassage"),
      interactFunfair: control("funfair", "interactFunfair"),
      useVillagePassage,
      useVillageShop,
      interactVillage,
      changeFestivalPassage,
      useFestivalPassage,
      interactFestival,
      boardCableCar,
      boardBoat,
      fire,
      equipItem(id) {
        heroRig.items.equip(id);
        toast(
          id === null
            ? "Hands free for a wander"
            : `Holding ${heroRig.items.label}`,
        );
      },
    },
    state: {
      location: locations.state,
      get area() {
        return locations.area;
      },
      get room() {
        return locations.room;
      },
      get activeLocation() {
        return locations.current;
      },
      get won() {
        return state.won;
      },
      get yaw() {
        return state.yaw;
      },
      get pitch() {
        return state.pitch;
      },
      get zoom() {
        return state.zoom;
      },
      get activeVillageShop() {
        return state.activeVillageShop;
      },
    },
    input: { keys },
    journey,
    travelMap,
    effects,
    places,
    transitions,
    passageTransition,
  };
}
