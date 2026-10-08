import { createCavePlace } from "./cave/place.js";
import { createVillagePlace } from "./village/place.js";
import { createFunfairPlace } from "./funfair/place.js";
import { createCastlePlace } from "./castle/place.js";
import { createRiversidePlace } from "./riverside/place.js";
import { createFestivalPlace } from "./festival/place.js";
import { createGardenPlace } from "./garden/place.js";

export function registerPlaces(places, context) {
  const {
    hero,
    boatTrip,
    cableCar,
    village,
    alpineCart,
    changeVillageShop,
    interactVillage,
  } = context;
  places.register(createVillagePlace(context));
  places.register(createFunfairPlace(context));
  places.register(createCastlePlace(context));
  places.register(createRiversidePlace(context));
  places.register(createFestivalPlace(context));

  places.register(createGardenPlace(context));
  places.register(createCavePlace(context));
  places.register({
    id: "lagoon",
    progressLabel: () => (cableCar.riding ? "cable car" : "lotus lagoon"),
    getHud: places.get("riverside").getHud,
    parent: "riverside",
    kind: "context",
    group: boatTrip.lagoon.group,
    terrain: boatTrip.lagoon,
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
