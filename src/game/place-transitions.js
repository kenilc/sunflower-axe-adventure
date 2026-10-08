export function createPlaceTransitions({
  places,
  locations,
  fade,
  context,
  home = "garden",
}) {
  const snapshots = new Map();
  function capture() {
    const { state, camera, hero, scene, sun, $ } = context;
    const fill = scene.children.find((node) => node.isHemisphereLight);
    return {
      view: {
        yaw: state.yaw,
        pitch: state.pitch,
        zoom: state.zoom,
        fov: camera.fov,
      },
      position: hero.position.clone(),
      heading: hero.rotation.y,
      environment: {
        background: scene.background.getHex(),
        fogDensity: scene.fog.density,
        sunIntensity: sun.intensity,
        fillIntensity: fill.intensity,
        fillColor: fill.color.getHex(),
        groundColor: fill.groundColor.getHex(),
      },
      instructions: $(".instructions").innerHTML,
      quest: {
        eyebrow: $(".quest .eyebrow").textContent,
        title: $(".quest h1").innerHTML,
        objective: $("#objective").textContent,
      },
    };
  }
  function applyStandard(place, options, snapshot) {
    const { state, camera, hero, companion, scene, sun, held, $ } = context;
    locations.select(place.id);
    if (place.group) {
      place.group.visible = true;
      place.group.add(companion.character);
    }
    const settings = place.settings ?? {};
    const position = options.spawn ??
      snapshot?.position ??
      settings.spawn ?? [0, 0, 0];
    if (Array.isArray(position)) hero.position.set(...position);
    else hero.position.copy(position);
    hero.rotation.set(0, snapshot?.heading ?? settings.heading ?? 0, 0);
    companion.reset(
      hero.position,
      place.companionObstacles ?? place.terrain.blockers ?? [],
      place.companionTerrain ?? place.terrain,
    );
    const view = snapshot?.view ?? settings.camera ?? {};
    for (const key of ["yaw", "pitch", "zoom"])
      if (view[key] !== undefined) state[key] = view[key];
    if (view.fov !== undefined) camera.fov = view.fov;
    const environment = snapshot?.environment ?? settings.environment ?? {};
    if (environment.background !== undefined)
      scene.background.set(environment.background);
    scene.fog.color.copy(scene.background);
    if (environment.fogDensity !== undefined)
      scene.fog.density = environment.fogDensity;
    if (environment.sunIntensity !== undefined)
      sun.intensity = environment.sunIntensity;
    const fill = scene.children.find((node) => node.isHemisphereLight);
    if (environment.fillIntensity !== undefined)
      fill.intensity = environment.fillIntensity;
    if (environment.fillColor !== undefined)
      fill.color.set(environment.fillColor);
    if (environment.groundColor !== undefined)
      fill.groundColor.set(environment.groundColor);
    held.visible = place.canThrow;
    if (snapshot) {
      $(".instructions").innerHTML = snapshot.instructions;
      $(".quest .eyebrow").textContent = snapshot.quest.eyebrow;
      $(".quest h1").innerHTML = snapshot.quest.title;
      $("#objective").textContent = snapshot.quest.objective;
    } else if (settings.instructions)
      $(".instructions").innerHTML = settings.instructions;
    context.resetCamera();
  }
  function cleanup() {
    context.benchMoment.stand();
    context.hearts.clear();
    context.effects.clearProjectiles();
    context.effects.clearParticles();
  }
  function leaveStandard(source, target, options, snapshot) {
    source.exit?.({ to: target.id, options });
    if (source.group) source.group.visible = false;
    applyStandard(
      target,
      { ...options, spawn: options.spawn ?? source.returnSpawn },
      snapshot,
    );
    target.enter?.({ from: source.id, options, returning: true });
  }
  function returnHome(options) {
    const visited = new Set();
    while (locations.area !== home) {
      const source = places.get(locations.area);
      if (visited.has(source.id))
        throw new Error(`Place ${source.id} did not return to its parent`);
      visited.add(source.id);
      if (source.activateExit) source.activateExit(options);
      else {
        if (!source.parent)
          throw new Error(`Place ${source.id} has no return destination`);
        const active = locations.active;
        if (active !== source) {
          active.exit?.({ to: source.parent, options });
          if (active.group) active.group.visible = false;
        }
        leaveStandard(
          source,
          places.get(source.parent),
          options,
          snapshots.get(source.id),
        );
      }
    }
  }
  function commit(id, options = {}) {
    const target = places.get(id),
      source = locations.active;
    if (id === source.id && !options.force) return false;
    cleanup();
    if (id === home && locations.area !== home) returnHome(options);
    else if (id === source.parent) {
      if (source.activateExit) source.activateExit(options);
      else leaveStandard(source, target, options, snapshots.get(source.id));
    } else if (target.activateEnter) target.activateEnter(options);
    else {
      snapshots.set(target.id, capture());
      source.exit?.({ to: id, options });
      if (source.group) source.group.visible = false;
      applyStandard(target, options);
      target.enter?.({ from: source.id, options, returning: false });
    }
    context.state.passageCooldown = 1;
    return true;
  }
  function allowed(id, options) {
    const target = places.get(id),
      source = locations.active;
    if (id === source.id || source.canLeave?.({ to: id, options }) === false)
      return false;
    if (id === source.parent || id === home) return true;
    if (target.canEnter) return target.canEnter({ from: source.id, options });
    return target.parent === source.id;
  }
  function run(action) {
    if (!fade.start(action)) return false;
    context.clearRestInput();
    return true;
  }
  return {
    run,
    go(id, options = {}) {
      if (fade.active || context.$("#guide").open || !allowed(id, options))
        return false;
      return run(() => commit(id, options));
    },
    jump: commit,
    open(id, options = {}) {
      if (!places.has(id) || places.get(id).kind !== "area") return false;
      const route = [];
      let next = id;
      while (next && next !== home) {
        if (route.includes(next))
          throw new Error(`Place parent cycle: ${next}`);
        route.unshift(next);
        next = places.get(next).parent;
      }
      for (const destination of route)
        commit(destination, destination === id ? options : {});
      return true;
    },
    capture,
    cancel: () => fade.cancel(),
  };
}
