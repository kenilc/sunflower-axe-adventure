import { afterEach, expect, test, vi } from "vitest";
import * as THREE from "three";
import { createTestGame } from "./helpers/game.js";

afterEach(() => vi.unstubAllGlobals());

test("sheep photos pause, restore walking, survive travel, and reset with the adventure", async () => {
  const { game, element } = await createTestGame();
  game.rendering.clock.getDelta = () => 0.04;
  const capture = vi.fn(() => "data:image/png;base64,d29vbGx5");
  const createElement = document.createElement;
  vi.spyOn(document, "createElement").mockImplementation((tag) => {
    const element = createElement(tag);
    if (tag === "canvas") element.toDataURL = capture;
    return element;
  });
  game.transitions.jump("village", { activity: "sheep" });
  const { sheepMoment } = game.activities;
  const { hero, rig, companion } = game.characters;
  const village = game.worlds.village;
  let photographerFrame = false;
  const renderer = game.rendering.renderer,
    render = renderer.render.bind(renderer);
  vi.spyOn(renderer, "render").mockImplementation((scene, view) => {
    if (view === sheepMoment.photoCamera) {
      photographerFrame = true;
      expect(companion.character.visible).toBe(false);
      expect(hero.visible).toBe(true);
      expect(view.aspect).toBe(4 / 3);
      const lens = sheepMoment.cameraProp.getObjectByName("sheep-camera-lens");
      expect(
        view.position.distanceTo(lens.getWorldPosition(new THREE.Vector3())),
      ).toBeLessThan(1e-5);
      expect(
        view
          .getWorldDirection(new THREE.Vector3())
          .distanceTo(
            sheepMoment.cameraProp.getWorldDirection(new THREE.Vector3()),
          ),
      ).toBeLessThan(1e-5);
      const head = new THREE.Box3().setFromObject(rig.head);
      const framingPoints = rig.feet.map((foot) =>
        foot.getWorldPosition(new THREE.Vector3()),
      );
      for (const x of [head.min.x, head.max.x])
        for (const y of [head.min.y, head.max.y])
          for (const z of [head.min.z, head.max.z])
            framingPoints.push(new THREE.Vector3(x, y, z));
      for (const point of framingPoints) {
        point.project(view);
        expect(Math.abs(point.x)).toBeLessThan(0.97);
        expect(Math.abs(point.y)).toBeLessThan(0.97);
      }
    }
    render(scene, view);
  });
  rig.items.equip("ice-cream");
  companion.rig.items.equip("ice-cream");
  const heading = game.state.yaw;
  game.controls.interactVillage();
  expect(sheepMoment.active).toBe(true);
  expect(sheepMoment.start(village.sheep[0])).toBe(false);
  expect(village.stamps.has("sheep")).toBe(false);
  expect(rig.held.visible).toBe(false);
  expect(companion.rig.held.visible).toBe(false);
  game.input.keys.KeyW = true;
  game.input.keys.KeyQ = true;
  for (let i = 0; i < 70; i++) game.update();
  expect(game.state.yaw).toBe(heading);
  expect(sheepMoment.cameraProp.visible).toBe(true);
  expect(rig.body.position.y).toBeLessThan(-0.3);
  const beforePause = {
    elapsed: sheepMoment.elapsed,
    hero: hero.position.clone(),
    man: companion.character.position.clone(),
    sheep: village.sheep.map((s) => s.group.position.clone()),
  };
  element("#guide").open = true;
  for (let i = 0; i < 100; i++) game.update();
  expect(sheepMoment.elapsed).toBe(beforePause.elapsed);
  expect(hero.position.equals(beforePause.hero)).toBe(true);
  expect(companion.character.position.equals(beforePause.man)).toBe(true);
  village.sheep.forEach((s, i) =>
    expect(s.group.position.equals(beforePause.sheep[i])).toBe(true),
  );
  expect(capture).not.toHaveBeenCalled();
  element("#guide").open = false;
  for (let i = 0; i < 110; i++) game.update();
  expect(sheepMoment.active).toBe(false);
  expect(sheepMoment.cameraProp.visible).toBe(false);
  expect(capture).toHaveBeenCalledTimes(1);
  expect(photographerFrame).toBe(true);
  expect(companion.character.visible).toBe(true);
  expect(renderer.getRenderTarget()).toBeNull();
  expect(sheepMoment.memories.size).toBe(1);
  expect(village.stamps.has("sheep")).toBe(true);
  expect(rig.items.current).toBe("ice-cream");
  expect(rig.held.visible && companion.rig.held.visible).toBe(true);
  expect(rig.body.rotation.x).toBeCloseTo(0);
  expect(village.sheep.every((s) => !s.interacting)).toBe(true);
  expect(game.input.keys.KeyW).toBe(false);
  for (const actor of [hero, companion.character]) {
    expect(village.contains(actor.position.x, actor.position.z)).toBe(true);
    expect(
      village.blockers.every(
        (b) =>
          Math.hypot(actor.position.x - b.x, actor.position.z - b.z) >
          b.r + 0.6,
      ),
    ).toBe(true);
  }
  element("#closeSheepPhoto").onclick();
  expect(element("#sheepPhoto").hidden).toBe(true);
  sheepMoment.showPhoto();
  expect(element("#sheepPhotoImage").src).toBe(
    "data:image/png;base64,d29vbGx5",
  );
  expect(element("#sheepPhoto").hidden).toBe(false);
  game.transitions.jump("garden");
  expect(sheepMoment.hasPhoto).toBe(true);
  expect(element("#sheepPhoto").hidden).toBe(true);
  game.transitions.jump("village", { activity: "sheep" });
  game.controls.interactVillage();
  expect(sheepMoment.active).toBe(true);
  for (let i = 0; i < 25; i++) game.update();
  element("#restart").onclick();
  expect(game.state.area).toBe("garden");
  expect(
    sheepMoment.active ||
      sheepMoment.hasPhoto ||
      sheepMoment.cameraProp.visible,
  ).toBe(false);
  expect(sheepMoment.memories.size).toBe(0);
  expect(element("#sheepPhoto").hidden).toBe(true);
  expect(
    village.sheep.every(
      (s) => !s.interacting && s.group.position.equals(s.home),
    ),
  ).toBe(true);
  expect(rig.items.current).toBe("axe");
  expect(rig.held.visible).toBe(true);

  // Nearby framing changes distance continuously without changing manual zoom.
  const place = game.places.get("village");
  hero.position.set(0, 0, 20);
  const overview = place.cameraDistance(30);
  hero.position.copy(village.shops[0].doorway);
  const close = place.cameraDistance(30);
  expect(close).toBeLessThan(overview);
  expect(place.cameraDistance(40) / close).toBeCloseTo(40 / 30);

  const { details } = village.nature;
  expect(details.batches.length).toBeLessThan(12);
  expect(details.sites.length).toBeGreaterThan(600);
  const ray = new THREE.Raycaster();
  for (let i = 0; i < details.sites.length; i += 83) {
    const site = details.sites[i];
    ray.set(
      site.point.clone().addScaledVector(site.normal, 0.5),
      site.normal.clone().negate(),
    );
    const hit = ray.intersectObject(site.source, false)[0];
    expect(hit.point.distanceTo(site.point)).toBeLessThan(1e-4);
    if (
      ["alpine-foothill-boulders", "alpine-juniper-shrubs"].includes(
        site.mesh.name,
      )
    )
      expect(village.contains(site.point.x, site.point.z)).toBe(false);
  }
  const site = details.sites[0],
    opacity = site.source.material.opacity;
  site.source.material.opacity = 0.03;
  details.updateVisibility();
  expect(site.hidden).toBe(true);
  site.source.material.opacity = opacity;
  details.updateVisibility();
  expect(site.hidden).toBe(false);
});
