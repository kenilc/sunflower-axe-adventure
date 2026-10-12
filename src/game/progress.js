// What the page reports about the adventure, for the read_adventure_progress
// tool in src/integrations/adventure-progress.js.
export function createProgressReader({
  keepsakes,
  journey,
  funfairActivities,
  village,
  alpineCart,
  state,
  sheepMoment,
  festivalMoment,
  locations,
  boatTrip,
  hero,
  $,
}) {
  return function readProgress() {
    return {
      beachKeepsakes: keepsakes.items.length,
      discoveredPlaces: journey.destinations
        .filter((entry) => entry.unlocked)
        .map((entry) => entry.id),
      funfairPrizes: funfairActivities.collected,
      funfairRide: funfairActivities.ride,
      ringTossFirstPerson: funfairActivities.playing,
      villageMemories: village.stamps.size,
      villageCart: alpineCart.riding,
      villageShop: state.activeVillageShop?.kind ?? null,
      sheepPhotos: sheepMoment.memories.size,
      sheepPhotoMoment: sheepMoment.active,
      festivalFireworks: festivalMoment.active,
      summerClothes: locations.state.insideFestival,
      location:
        typeof locations.active.progressLabel === "function"
          ? locations.active.progressLabel()
          : (locations.active.progressLabel ??
            locations.active.name ??
            locations.active.id),
      placeProgress: locations.active.getProgress?.() ?? null,
      riversideTreasures: state.riverCollected,
      lagoonTreasures: boatTrip.lagoon.collected,
      sunStones: state.collected,
      targetsBroken: state.score,
      complete: state.won,
      position: {
        x: Math.round(hero.position.x),
        z: Math.round(hero.position.z),
      },
      objective: $("#objective").textContent,
    };
  };
}
