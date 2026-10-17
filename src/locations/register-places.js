import { createSeasidePlace } from "./seaside/place.js";
import { createCavePlace } from "./cave/place.js";
import { createVillagePlace } from "./village/place.js";
import { createFunfairPlace } from "./funfair/place.js";
import { createCastlePlace } from "./castle/place.js";
import { createRiversidePlace } from "./riverside/place.js";
import { createFestivalPlace } from "./festival/place.js";
import { createGardenPlace } from "./garden/place.js";
import { createWinterPlace } from "./winter/place.js";
import { createPolderPlaces } from "./polder/place.js";
import { createLavenderPlace } from "./lavender/place.js";
import { createMistPlaces } from "./mist/place.js";

export function registerPlaces(places, context) {
  const { hero } = context;
  places.register(createVillagePlace(context));
  const villagePlace = places.get("village");
  const village = villagePlace.terrain;
  const { alpineCart } = villagePlace.parts;
  const { changeVillageShop, interactVillage } = villagePlace.controls;
  places.register(createFunfairPlace(context));
  places.register(createCastlePlace(context));
  places.register(createRiversidePlace(context));
  places.register(createFestivalPlace(context));

  places.register(createGardenPlace(context));
  places.register(createSeasidePlace(context));
  places.register(createCavePlace(context));
  places.register(createWinterPlace(context));
  for (const place of createPolderPlaces(context)) places.register(place);
  places.register(createLavenderPlace(context));
  for (const place of createMistPlaces(context)) places.register(place);
  const { boatTrip, cableCar } = places.get("riverside").parts;
  places.register({
    id: "lagoon",
    progressLabel: () => (cableCar.riding ? "cable car" : "lotus lagoon"),
    getHud: places.get("riverside").getHud,
    parent: "riverside",
    kind: "context",
    group: boatTrip.lagoon.group,
    terrain: boatTrip.lagoon,
    restore: () => boatTrip.restoreDestination(),
    cameraTarget: () => (cableCar.riding ? 3 : 1),
  });
  places.register({
    id: "summit",
    progressLabel: () => (cableCar.riding ? "cable car" : "mountain summit"),
    getHud: places.get("riverside").getHud,
    parent: "lagoon",
    kind: "context",
    group: cableCar.summit.group,
    terrain: cableCar.summit,
    restore: () => cableCar.restoreDestination(),
    cameraTarget: () => (cableCar.riding ? 3 : 5),
    getGate: () =>
      !cableCar.riding && cableCar.summit.castle.isEntrance(hero.position)
        ? { id: "castle" }
        : null,
  });
  for (const shop of village.shops)
    places.register({
      id: `shop:${shop.kind}`,
      progressLabel: shop.name,
      getHud: places.get("village").getHud,
      parent: "village",
      kind: "room",
      group: shop.room.group,
      terrain: shop.room,
      cameraTarget: () => 1,
      canThrow: false,
      activateEnter: () => changeVillageShop(shop),
      activateExit: () => changeVillageShop(null),
      canEnter: ({ from }) => from === "village" && !alpineCart.riding,
      interact: interactVillage,
      getGate: () =>
        shop.room.isExit(hero.position) ? { id: "village" } : null,
    });
  places.validate();
}
