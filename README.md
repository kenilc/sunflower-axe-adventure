# Sunflower — Axe & Adventure

A browser adventure built with Three.js, Vite, and JavaScript modules. Explore the garden, riverside, village, funfair, festival, and castle with a companion.

Your current location, walking position, and camera view save automatically in this browser and resume when you return. Shops, the lagoon, the summit, and the castle are included. During rides, seated moments, and photography, the last walking checkpoint is kept. **New adventure** replaces the checkpoint with a fresh garden start; explicit `?area=...` links open their requested destination. Collectibles and activity progress still reset on reload. Clearing browser data removes the checkpoint; play remains available if browser storage is disabled or full.

Open **Map / V** to revisit a discovered destination. Walk through its gate, take the boat, or ride the cable car on your first visit; each place unlocks on arrival. Choose an unlocked stop on the map to travel there together with a scene fade. Shops use the village stop, and the lagoon, summit, and castle have their own stops. The map pauses gameplay and closes with **Close / Esc / V**. Finish rides, seated moments, and photography before travelling. Discovered places persist in this browser; **New adventure** clears them.

In the alpine village, approach a sheep and press **X** to play together while your companion takes a photo. Walking resumes after the seven-second moment. Each captured photo is saved automatically to the album, where you can view it later and it survives reloads and New adventure. Help pauses the moment. The village camera eases closer near shops and sheep, with manual zoom and rotation still available during exploration.

Use **Camera / M** anywhere during exploration to pause gameplay. Drag either character to turn them, or hold them briefly before dragging to move them. A green highlight and a short vibration (on supported phones) signal that movement is ready. Drag the scenery to orbit. Pinch to zoom and slide two fingers together to frame; the mouse wheel also zooms. Only Exit, Album, and the shutter are visible. The viewfinder switches between portrait and landscape and shows exactly what the large shutter button saves, without the grid or interface. **Enter** also takes a photo; **Exit / Esc** restores both characters and the exploration camera. Finish seated moments and rides before opening the camera. Keyboard users can select characters with **1 / 2**, select the scene with **0**, and use arrow keys to turn. **Shift + arrows** moves a character or frames the scene, **+ / −** zooms, and **R** resets the shot. With a mouse, **Shift + drag** also moves or frames.

For quiet debugging, open the preview with `?sound=off`; it stays muted across reloads.

Open **Album / L** to browse, download, or delete your photos. JPEG photos match the viewfinder framing and are saved in local storage (up to 30 photos, subject to browser storage space). They survive reloads and New adventure on the same browser and origin; clearing browser data removes them. A storage failure reports an error and preserves existing photos.

## Development

Use Node.js 22.12 or newer (Node 22 LTS is used in CI).

```sh
npm ci
npm run dev
```

Vite serves the game at http://127.0.0.1:5173 and reloads after source changes. Use `npm run dev -- --port 5174` for another port.

```sh
npm test
npm run test:watch
npm run format:check
npm run test:build
npm run preview
```

Preview serves the generated `dist/` directory at http://127.0.0.1:4173. `npm run build` creates production output with hashed JavaScript, CSS, and model assets. Models remain binary files throughout the pipeline.

GitHub Pages runs the gameplay tests and production build checks before publishing `dist/`. In repository Settings → Pages, select GitHub Actions as the publishing source. Vite uses `base: "./"` so assets resolve under the repository URL and custom domains. Direct links such as `?area=festival&activity=fireworks`, `?area=funfair&activity=ring-toss`, and `?area=village&activity=lookout` remain supported.

## Code layout

- `index.html`: browser entry page and loading status.
- `src/main.js`: loads models, constructs the game, and starts animation.
- `src/assets/models/`: checked-in hero, companion, axe, and bench GLB files.
- `src/assets/`: model URLs, loading, and independent instance creation.
- `src/game/`: dependency wiring, gameplay coordination, location state, scene fades, and animation scheduling.
- `src/locations/`: scenery, lifecycle, actions, HUD data, and activities grouped by destination. `register-places.js` registers built-in destinations.
- `src/characters/`: named rig adapters, hero instantiation, companion behavior, and eyes.
- `src/rendering/`: renderer setup, mesh factories, camera gestures, and visibility helpers.
- `src/systems/`: shared input, collision, audio, particle effects, hearts, and seeded randomness.
- `src/ui/`: HUD presentation and styles.
- `src/integrations/`: optional browser progress tool registration.
- `assets/source/`: authoring geometry for reproducing the GLB assets; excluded from the runtime bundle.
- `scripts/export-assets.js`: model exporter and reproducibility check.
- `tests/`: Vitest gameplay scenarios, model checks, and production build checks.
- `vite.config.js` and `vitest.config.js`: build and test configuration.
- `dist/`: generated deployment output; edit source instead.

Three.js is pinned to `0.170.0`, matching the previous vendored revision. Core rendering and the GLTF loader/exporter use the same installed version.

Keep dependencies pointing from the game coordinator into independent modules. Location builders return scenery and terrain interfaces; they should not import the coordinator or manipulate the DOM. Shared systems receive dependencies and callbacks explicitly. HUD code presents game state, while the coordinator handles gameplay actions.

## Model assets

The initial GLB assets preserve the existing procedural designs, pivots, and materials. Geometry construction for these models happens during authoring rather than every browser startup. Forests, grass, flower fields, particles, and fireworks remain procedural and retain instancing.

```sh
npm run assets:build
npm run assets:check
```

Run `assets:build` after editing `assets/source/` or shared authoring helpers and commit the updated GLB files. `assets:check` exports in memory and verifies that checked-in models match their authoring sources without changing files. Ordinary production builds use the checked-in models.

Models may also be edited in a glTF-capable editor. When adopting that workflow, keep the rig contract and update the authoring/check workflow so it has one authoritative source. The runtime does not require Blender or a model editor.

Character models must retain these uniquely named nodes: `body`, `left-leg`, `right-leg`, `left-arm`, `right-arm`, `left-foot`, `right-foot`, `left-hand`, `right-hand`, `rest-smile`, `open-eyes`, and `closed-eyes`. The hero also requires `held-axe`. `src/characters/rig.js` resolves them into named references plus `legs`, `arms`, `feet`, and `hands` arrays. Activities use those references rather than child positions or geometry types.

The exporter includes hidden eye variants and records initial visibility, shadows, and flat shading in node metadata. Instantiation restores those flags, clones transforms independently, and shares geometry/material resources. These assets use ordinary transform groups; they do not require a skeleton or animation clips. Collision and gameplay behavior remain in JavaScript.

Models are imported as URLs so Vite hashes them and resolves deployment paths. A loading screen waits for all four assets; a failed load shows a retry message rather than starting a partially constructed game.

## Game API and testing

`createGame({ models, createRenderer })` constructs a game without starting an animation loop. Browser startup obtains templates from `loadModels(modelUrls)`; tests parse the same checked-in GLB files and supply a fake renderer.

- `start()` and `stop()` manage one animation loop; repeated starts are safe.
- `update()` executes one frame directly, using the exposed clock.
- `readProgress()` returns the player-facing progress snapshot.
- `rendering`, `characters`, `worlds`, and `activities` expose the constructed objects for integration checks.
- `controls` exposes gameplay actions; `input`, `effects`, and `passageTransition` expose their runtime objects.
- `state` provides live getters for camera and game state. `state.location` reports the location context.

Location state has one root area. The castle is a nested room within the riverside journey, so leaving it restores the summit context. Transport activities own lagoon and summit state, and village activities own shop state. The location manager selects current terrain; movement retains the garden and cave boundary rules.

Vitest imports real source modules and runs the existing regression scenarios with stubbed browser APIs. Tests cover collision, scene transitions, transport, shops, rides, fireworks, pause behavior, and restart using the loaded character assets. `npm run test:build` verifies reproducible Vite output, relative deployment URLs, and unchanged binary model contents.

## Adding places

See [the place authoring guide](docs/adding-places.md) for the registry contract and a complete example. A new place factory is registered once in `src/locations/register-places.js`; shared movement, keyboard/button actions, HUD presentation, return snapshots, and restart use its descriptor.

`place-registry.js` stores place definitions and validates parent links. `location-manager.js` selects the current root area and nested room/context. `place-transitions.js` owns the fade, input/effect cleanup, default actor placement, camera/lighting settings, and return restoration. Existing destinations retain local activation adapters for their established transport and outfit behavior.

The existing control methods remain available for regression coverage. New code uses `controls.travelTo(id, options)` and `controls.interact()` and defines actions through `getHud()`.

`tests/places.test.js` registers an additional place and room without changes to the coordinator, then verifies entry gates, movement, actions, pause, return position, camera restoration, and reset. Shared browser/model fixtures are in `tests/helpers/game.js`.

Built-in worlds are still constructed at startup. Loading their geometry on demand is a separate performance step; this refactor establishes the registration and lifecycle boundaries first.

For clothing, expressions, and held-item APIs, see [Character appearance](docs/character-appearance.md).
