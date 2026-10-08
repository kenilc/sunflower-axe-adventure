import { instantiateModel } from "../assets/models.js";
import { createCharacterRig } from "./rig.js";

export function createHero({ scene, model, axeModel }) {
  const hero = instantiateModel(model);
  hero.position.set(0, 0, 7);
  scene.add(hero);
  const rig = createCharacterRig(hero);
  if (!rig.held) throw new Error("Hero model is missing its item anchor");
  rig.items.register("axe", {
    create: () => instantiateModel(axeModel),
    throwable: true,
    weapon: true,
  });
  rig.items.equip("axe");
  return { hero, rig, ...rig };
}
