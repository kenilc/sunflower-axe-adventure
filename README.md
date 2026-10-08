# Sunflower — Axe & Adventure

A browser adventure built with Three.js and native JavaScript modules. Explore the garden, riverside, village, funfair, festival, and castle with a companion.

## Development

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4173. The server reads source files directly; reload after editing. Set `PORT` to use another port.

```sh
npm test
npm run format:check
npm run test:build
npm run preview
```

Stop the development server before starting preview on the same port. Preview serves the generated `dist/` directory. The build copies native modules and adds one content-derived cache version to every module import, stylesheet, and entry point. It requires no bundler or additional dependencies.

GitHub Pages runs the tests and build before publishing `dist/`. Deployment paths are relative, so the game works under a repository URL. Direct links such as `?area=festival&activity=fireworks`, `?area=funfair&activity=ring-toss`, and `?area=village&activity=lookout` remain supported.

## Code layout

- `index.html`: browser entry page.
- `src/main.js`: constructs the game and starts animation.
- `src/game/`: dependency wiring, gameplay coordination, location state, scene fades, and animation scheduling.
- `src/locations/`: scenery and activities grouped by destination. `world.js` constructs each location; related files own local activities or scenery.
- `src/characters/`: hero and companion rigs and face construction.
- `src/rendering/`: renderer setup, mesh factories, camera gestures, and visibility helpers.
- `src/systems/`: shared input, collision, audio, particle effects, hearts, and seeded randomness.
- `src/ui/`: HUD presentation and styles.
- `src/integrations/`: optional browser progress tool registration.
- `vendor/`: the existing vendored Three.js module and its license header.
- `tests/`: gameplay regression tests and architecture checks.
- `scripts/`: static development/preview server and deterministic build.
- `dist/`: generated deployment output; edit source instead.

Keep dependencies pointing from the game coordinator into independent modules. Location builders should return their scenery and terrain interface; they should not import the coordinator or manipulate the DOM. Shared systems should receive dependencies and callbacks explicitly. HUD code presents game state, while the coordinator handles gameplay actions.

## Game API and testing

`createGame({ createRenderer })` constructs a game without starting an animation loop. Renderer injection lets integration tests execute the actual game with browser and rendering substitutes.

- `start()` and `stop()` manage one animation loop; repeated starts are safe.
- `update()` executes one frame directly, using the exposed clock.
- `readProgress()` returns the player-facing progress snapshot.
- `rendering`, `characters`, `worlds`, and `activities` expose the constructed objects for integration checks.
- `controls` exposes gameplay actions; `input`, `effects`, and `passageTransition` expose their runtime objects.
- `state` provides live getters for camera and game state. `state.location` reports the location context.

Location state has one root area. The castle is a nested room within the riverside journey, so leaving it restores the summit context. Transport activities still own lagoon and summit state, and village activities own shop state. The location manager selects the current terrain through `blockers`, `contains`, `heightAt`, and `constrain` where supported; movement retains the garden and cave boundary rules.

Tests load source modules through a shared VM module loader. They use the public API rather than rewriting game source to expose internals. `npm run test:build` verifies reproducible deployment output, cache versions, and the built module graph. The existing regression suites cover collision, scene transitions, transport, shops, rides, fireworks, pause behavior, and restart.

`create-game.js` remains the place for location-specific transitions and cross-system orchestration. New activity behavior belongs beside its destination; extract shared transition behavior when destinations actually need the same lifecycle.
