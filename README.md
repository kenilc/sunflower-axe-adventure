# Sunflower — Axe & Adventure

A browser adventure built with Three.js, Vite, and JavaScript modules. Explore the garden, riverside, alpine village, Estonian winter village, funfair, festival, castle, and sunset beach with a companion.

Your current location, walking position, and camera view save automatically in this browser and resume when you return. Shops, the lagoon, the summit, and the castle are included. During rides, seated moments, and photography, the last walking checkpoint is kept. Use **Map / V** to return to the garden or another discovered place; explicit `?area=...` links open their requested destination. Beach keepsakes and photos stay saved; other collectibles and activity progress still reset on reload. Clearing browser data removes the checkpoint; play remains available if browser storage is disabled or full.

While exploring every destination, including cave and castle walls, shop interiors, and exploration photos, scenery fades when it blocks the heroine's silhouette. Games, rides and activities keep their natural opacity, including in their photos. It returns to its normal appearance when she is clear. Her companion can walk behind opaque scenery without making it fade.

Open **Map / V** to revisit a discovered destination. Walk through its gate, take the boat, or ride the cable car on your first visit; each place unlocks on arrival. Visited places appear as illustrated landmarks without visible labels, and a gold pin marks your current stop. Hover for a place's name; screen readers announce its name and travel status. Unvisited places stay under anonymous mist, with their names, landmarks, hints, and connecting paths hidden until arrival. Choose a landmark to travel there together with a scene fade. Shops use the village stop, and the lagoon, summit, and castle have their own stops. The map pauses gameplay and closes with **Return arrow / Esc / V**. Finish rides, seated moments, and photography before travelling. Discovered places persist in this browser.

In the alpine village, approach a sheep and press **X** to play together while your companion takes a photo. Walking resumes after the seven-second moment. Each captured photo is saved automatically to the album, where you can view it later and it survives reloads. Help pauses the moment. The village camera eases closer near shops and sheep, with manual zoom and rotation still available during exploration.

Use **Camera / M** anywhere during exploration to pause gameplay. Drag either character to turn them, or hold them briefly before dragging to move them. A green highlight and a short vibration (on supported phones) signal that movement is ready. Drag the scenery to orbit. Pinch to zoom and slide two fingers together to frame; the mouse wheel also zooms. Only the return arrow, Album, and the shutter are visible. The viewfinder switches between portrait and landscape and shows exactly what the large shutter button saves, without the grid or interface. **Enter** also takes a photo; **Return arrow / Esc** restores both characters and the exploration camera. During activities, Camera preserves the poses and pauses progress until you return. Keyboard users can select characters with **1 / 2**, select the scene with **0**, and use arrow keys to turn. **Shift + arrows** moves a character or frames the scene, **+ / −** zooms, and **R** resets the shot. With a mouse, **Shift + drag** also moves or frames.

For quiet debugging, open the preview with `?sound=off`; it stays muted across reloads.

Each of the eleven destinations has its own original background melody and synthesized instrument arrangement. Music overlaps in a gentle crossfade when you travel, and village shops use a quieter piano variation. The Sound button controls music and effects together; audio pauses when the browser tab is hidden and resumes in your current place when you return.

Open **Album / L** to browse, download, or delete your photos. JPEG photos match the viewfinder framing and are saved in local storage (up to 30 photos, subject to browser storage space). They survive reloads on the same browser and origin; clearing browser data removes them. A storage failure reports an error and preserves existing photos.

Follow the **Sunset Beach** sign in the southeast garden to walk along the seaside together under a sunset sky. Foamy waves roll along the coastline, gulls wander overhead with varied turns, wingbeats, and long glides, and shorebirds wander and peck at the tide line. Both characters change into light shirts, shorts, and sandals on arrival; their previous appearance returns when they leave. Approach a glimmer in the sand and press **X** (or tap Collect) to keep a seashell or smooth stone. There are twelve distinct finds, six of each kind. The beach unlocks on the map after your first visit, and `?area=seaside` opens it directly. The pearl-and-shell driftwood arches mark both ends of the path. Walk through the opening, or press **X** nearby, to travel together. The garden return arch is at the south end of the beach. Approach the striped sun umbrella and towels near the southeast shore and press **X** to sit together facing the sunset; press **X / Return arrow** to resume your walk. Waves and birds continue while you rest. Help pauses the moment, and reload resumes the last walking checkpoint. Press **Camera / M** while resting to photograph the seated pair. Camera opens from the front, and you can orbit and zoom while their pose stays paused; leaving Camera resumes the sunset moment. Finish resting before opening Keepsakes or the map. `?area=seaside&activity=sunset` opens the seated sunset moment directly.

Explore the two **tide pools** on the western shore with **X** to crouch together and discover starfish, swaying anemones, and little crabs. At the bucket and spade near the middle of the beach, **X** builds a sandcastle in three steps: shape the base, build the towers, then decorate with shells and a flag. Each step takes a few seconds; **X** stops it, and Help pauses it. Once finished, admire it with **X** or choose **Rebuild / B**. Your castle remains when you revisit during the same session. Seaweed and driftwood line the sand, boats bob offshore, crabs scuttle and stop, and both characters leave footprints that fade. Curved coconut palms sway around the beach; dunes, wildflowers, scrub, rock clusters, and distant palm groves fill the coast and inland views. While exploring, nearby palms fade when they obscure the heroine, including in photo mode. Scenery stays opaque when only her companion is hidden behind it. `?area=seaside&activity=sandcastle` and `?area=seaside&activity=tidepool` open those activities directly. Use **Camera / M** during building, admiring a castle, or inspecting a tide pool. Photography pauses that moment, preserves both character poses, and resumes it when you leave Camera; photos include the activity in their album captions. Finish an activity before opening the map or Keepsakes; reload uses the last walking checkpoint.

Open **Keepsakes / K** anywhere during exploration to view your finds, their descriptions, and the date you collected them; filter by seashells or stones. The collection pauses gameplay and closes with **Return arrow / Esc / K**. Keepsakes survive reloads and revisits in the same browser, like photos. Clearing browser data removes them. A storage failure leaves the find on the sand so you can retry.

Follow the **Lumeküla · Eesti** sign on the northeast garden path to visit an imagined **Estonian Winter Village**. Snow falls over painted wooden cottages, a limestone church, a log sauna, spruce and birch trees, and a boardwalk along the frozen pond. Warm windows and chimney smoke brighten the winter light, and both friends wear their winter clothes. The scenery draws on [Estonian wooden villages](https://visitestonia.com/en/guided-tour-of-the-mustjoe-historical-village) and [Central Estonia's winter landscapes](https://visitestonia.com/en/what-to-do/what-to-do-in-central-estonia-during-the-winter-1).

Press **X** once near the snowman sign to build a **lumememm** together from start to finish. Both friends walk around it, roll the base, carry and lift the middle and head, then add the face, branches, scarf, and hat. The three stages advance automatically over about twenty seconds. Press **X** to stop; finished sections stay in place, and **X** resumes the remaining stages. Use **B** by a completed snowman to rebuild it. At the east pond's **Uisutama** sign, **X** starts skating together; completing one lap earns a winter memory. At the yellow **Kohvik** café, **X** shares warm cocoa on the bench. At the northeast **Saun** hut, **X** takes both friends inside to relax in towel wraps on a warm wooden bench. Hot stones, soft amber lights and gentle steam fill the room. **B** sends her to ladle water over the stones and return to her seat; after a few seconds together you earn a sauna memory. **X / Return arrow** returns to walking, and **Camera / M** pauses any moment for a photo with its own album caption. Help pauses snow and activities. The snowman and four winter memories stay through revisits in the current session; reload keeps the last walking checkpoint. Walk through the south garden sign to return, or use **Map / V** after finishing an activity. The village unlocks on first arrival. Direct links: `?area=winter`, with optional `&activity=snowman`, `&activity=skate`, `&activity=cocoa`, or `&activity=sauna`.

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

Use the existing **Camera / M** during all activities, including lakeside hugs, castle rest, boat and cable-car journeys, Ferris wheel and carousel rides, ring toss, alpine cart rides, sheep moments, hiking, and fireworks. The activity pauses with both friends held in their current poses. Camera starts with a view of their faces; orbit, frame, and zoom before using the shutter. The return arrow or **Esc / M** resumes the activity. Ring toss switches from its first-person booth to a photo of the friends in the park, then restores the booth when you leave Camera. Activity photos include the moment in their album captions. Return arrows also close Help, Map, Album, Keepsakes, and the sheep photo preview; hover or focus for the action label and shortcut.

Activity buttons use compact graphic icons: a magnifier over waves for tide pools, a sandcastle for building, a shell for collecting, a sunset for the towels, and matching icons for the other activities. Hover for the action name and shortcut; screen readers announce the same label. The return arrow always leaves an activity.
