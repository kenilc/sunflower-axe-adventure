# Adding a place

Create `src/locations/<name>/world.js` for scenery and terrain, and `place.js` for lifecycle, actions, HUD data, and configuration. An activity or complex HUD can live in its own file beside them.

A factory receives shared services through `context`. Use `context.scene`, `context.helpers` (`mesh`, `box`, `ball`, `cyl`), `context.hero`, `context.companion`, `context.heroRig`, `context.models`, `context.toast`, and `context.transitions`. Keep place-specific progress in the factory's closure. Build the place's own world and activities inside its factory. To use another place, look it up with `context.places.get(id)`; if that place registers later (see `src/locations/register-places.js`), look it up when you need it rather than when the factory runs.

This small example is a complete destination; replace its geometry with your design:

```js
import * as THREE from "three";
import { createDioramaBase } from "../../rendering/diorama-base.js";

export function createGrovePlace(context) {
  const group = new THREE.Group();
  context.scene.add(group);
  createDioramaBase({
    parent: group,
    mesh: context.helpers.mesh,
    size: 18,
    top: -0.03,
    grass: "#547c49",
  });

  let keepsakes = 0;
  return {
    id: "grove",
    name: "Lantern Grove",
    parent: "garden",
    group,
    terrain: {
      blockers: [],
      contains: (x, z) => Math.hypot(x, z) < 18,
      heightAt: () => 0,
    },
    entrance: {
      from: "garden",
      contains: (position) => Math.hypot(position.x - 20, position.z - 20) < 1,
    },
    returnSpawn: [18, 0, 18],
    settings: {
      spawn: [0, 0, 5],
      heading: Math.PI,
      camera: { yaw: 0, pitch: 0.4, zoom: 22, fov: 50 },
      environment: { background: "#97c5ad", fogDensity: 0.008 },
      instructions: "<kbd>W A S D</kbd> walk <kbd>X</kbd> collect",
    },
    canThrow: false,
    getGate: () => (context.hero.position.z > 16 ? { id: "garden" } : null),
    getHud: () => ({
      region: "Lantern Grove",
      quest: {
        eyebrow: "LANTERN GROVE",
        title: "A quiet grove.<br />Something to remember.",
        objective: "Collect a keepsake, then return through the north gate.",
      },
      hint: "X to collect · Return gate: north",
      progress: `${keepsakes} keepsakes`,
      actions: [
        {
          key: "KeyX",
          label: "Collect keepsake · X",
          run() {
            keepsakes++;
            context.toast("A little memory of the grove.");
          },
        },
      ],
    }),
    getProgress: () => ({ keepsakes }),
    reset() {
      keepsakes = 0;
    },
  };
}
```

## Diorama board

Every new place stands on a diorama board unless its design says otherwise. Build the ground with `createDioramaBase` from `src/rendering/diorama-base.js`, as the example does, rather than a plain slab or ground that just stops:

- Round places pass `size` (the radius). Square ones pass `shape: "square"`, and rectangular ones add `depth` (the half-depth) and move the returned group to the board's centre.
- Pass `grass` for the top colour, or `grass: null` when the place's own ground already forms the top; then set `top` to the height of that ground's edge.
- Choose `soil`, `stone` and `rock` colours that suit the place, such as limestone for Lumeküla.
- For very large boards (around 80 or more), raise `thickness` so the side doesn't look paper-thin.
- Make the walkable `terrain` stay inside the board, and look at the edge from outside before finishing.

Leave a place without a board only when it should feel endless, like the Sunset Beach horizon, or is an indoor room. Note the reason in the place's `world.js`.

## Registering the place

Import the factory in `src/locations/register-places.js`, then add `places.register(createGrovePlace(context))` before `places.validate()`. No input, HUD, movement, or restart branch is required. Decorate the entrance separately if you want a visible gate in its parent world; the example defines the gate's detection area only. Check that its approach and return spawn avoid the parent's obstacles.

`?area=grove` opens registered root places through their parent route. An optional `activity` query is passed to entry adapters. The generic `settings.spawn` is used for direct entries.

Opaque scenery is indexed automatically for heroine sightline fading, including nested objects and moving structures. Characters are excluded, and scenery that hides only the companion stays opaque. This also runs in exploration photo mode and registered rooms. Games and activities (including their photos) immediately restore and retain the original opacity, depth writing and shadows. Specialized controllers must pass `context.shouldFadeScenery()` as the visibility update's fourth argument; the shared coverage uses the same policy. Activity state is identified by the existing activity photo label or a place's `canSaveLocation()` activity guard. Existing landscape controllers retain their forest and terrain handling; the shared coverage skips meshes they already own. Do not hide walls or buildings based on camera angle or proximity. Transparency used for water, glass, smoke and particles keeps its existing appearance.

Walking positions and camera views save automatically for registered areas and rooms. Reload restores the parent route before placing the player on the saved terrain. A `kind: "context"` place must provide `restore()` to restore its transport state and scenery without replaying the journey (as the lagoon and summit do). Saves contain location and view only; per-place collectibles and activity progress remain session state.

## Lighting

`settings.environment` sets the sky, fog and lights while the heroine is in the place. List only the values that differ from the garden defaults in `src/rendering/environment.js`; anything you leave out uses the default, so lighting never carries over from the previous place.

| Key                                         | Default                         | Meaning                                                                   |
| ------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------- |
| `background`                                | `"#96c4b0"`                     | Horizon colour; the fog uses the same colour.                             |
| `skyTop`                                    | `"#5d9fc4"`                     | Colour overhead; the sky blends up to it. `null` for rooms and caves.     |
| `fogDensity`                                | `0.018`                         | Exponential fog density. `0` turns fog off.                               |
| `sunIntensity`, `sunColor`                  | `3.4`, `"#ffe6a7"`              | The shadow-casting sun.                                                   |
| `sunOffset`                                 | `[-18, 30, 12]`                 | Sun position relative to the heroine. Lower `y` for long evening shadows. |
| `fillIntensity`, `fillColor`, `groundColor` | `2.4`, `"#fff4cf"`, `"#346457"` | Soft sky and ground light.                                                |
| `exposure`                                  | `1.2`                           | Overall brightness after tone mapping.                                    |

For a temporary change inside a place, such as a sauna or bedtime, save `context.environment.capture()`, call `context.environment.apply(...)`, and apply the saved copy afterwards.

## Contract

| Field or hook                                           | Purpose                                                                                                                                                                                        |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`, `name`, `parent`                                  | Unique identifier, display name, and return destination. Parent links must be valid and acyclic.                                                                                               |
| `group`, `terrain`                                      | Scenery ownership and walking surface. Terrain supplies `contains(x,z)`, `heightAt(x,z)`, optional `blockers`, and optional `constrain(position,previous)`. Coordinates are world coordinates. |
| `settings`                                              | Initial spawn, heading, camera, lighting/fog, and instructions. Camera angles are radians.                                                                                                     |
| `entrance`                                              | Optional incoming gate: `from` names its source and `contains(position)` detects entry.                                                                                                        |
| `getGate()`                                             | Optional outgoing gate returning `{id, options}` or `null`. It is checked after movement and respects the passage cooldown.                                                                    |
| `returnSpawn`                                           | Optional safe position in the parent. Choose a position outside the incoming gate so returning does not immediately re-enter. Otherwise the saved departure position is restored.              |
| `enter({from,options,returning})`, `exit({to,options})` | Place-specific setup and cleanup. Stop temporary activities in `exit`; keep persistent progress until `reset`.                                                                                 |
| `update(dt,time)`                                       | Active simulation updates. Return `true` to lock normal player movement for that frame. Paused games do not call it.                                                                           |
| `animate(dt,time,paused)`                               | Active visual updates. Use `paused` to freeze interactive animation when appropriate.                                                                                                          |
| `getHud()`                                              | Returns region, hint, optional quest/instructions/progress, and actions. Rendering and dispatch stay in shared modules.                                                                        |
| `getProgress()`                                         | Optional place-specific progress included in the browser progress tool's `placeProgress` field.                                                                                                |
| `reset()`                                               | Clears progress when the game is reset. Ordinary entry/exit preserves progress.                                                                                                                |
| `canEnter`, `canLeave`                                  | Optional guards receiving route information. Parent returns are otherwise allowed; home can be reached through its parent chain.                                                               |
| `canThrow`, `maxZoom`, `cameraTarget()`                 | Weapon and camera policy.                                                                                                                                                                      |
| `parts`                                                 | Optional named activities and helpers other code needs, such as `{ boatTrip, cableCar }`. Read them with `context.places.get(id).parts`.                                                       |
| `controls`                                              | Optional named functions other places or tests call, such as `{ interactVillage }`.                                                                                                            |
| `fadingGates`                                           | Optional gate objects whose tops (meshes at 4.5 or higher) fade when they hide the heroine.                                                                                                    |
| `fadingExtras`                                          | Optional groups outside `group`, such as vehicles, that fade while this is the current area.                                                                                                   |
| `photoVisibility(camera,actors,dt,enabled)`             | Optional fading to run in Camera mode instead of `afterCamera()`.                                                                                                                              |

An action has a `label`, `key`, `run`, optional `visible`, and optional `disabled`. The default button is `placeAction`; supply a distinct `id` for additional buttons. The shared HUD creates missing buttons. Keyboard and button dispatch use the same action data and respect pause/transition locks.

For a room, set `kind: "room"` and `parent` to its containing place. Attach a separate room group to the scene and provide its own terrain and settings. Root area context remains active while the room's terrain and HUD are selected. Return snapshots preserve the parent's camera and departure position.

Transport-controlled terrain uses `kind: "context"` and a parent's `resolve()` callback. Existing lagoon and summit definitions use this because their activities control arrival and scenery. New ordinary places generally use the default `kind: "area"`.

A place can supply `canSaveLocation()` to return `false` during a temporary seated pose. The coordinator keeps the previous walking checkpoint and blocks the map and Keepsakes until the activity finishes. Photography follows this guard by default for custom activities; built-in activity controllers supply a paused photo preset through the coordinator. A place can supply `canPhotograph()` to allow photographs of a paused activity, and `getPhotoPreset()` to set its initial `target` (Vector3), `yaw` (radians), `pitch` (degrees), `distance`, and optional `fov` (degrees). Set `lockActors: true` to preserve the activity pose while allowing camera orbit, pan, and zoom. `photoLocation()` optionally gives saved photos an activity-specific caption. Pair it with `canLeave()` and restore all character transforms in `exit()` and `reset()`.

## Validation

Run `npm test` and `npm run test:build`. Add focused place tests using `createTestGame()` from `tests/helpers/game.js`. Include entry and return, collision/boundary behavior, action dispatch, pause, persistent progress, and restart during an activity or fade.

The larger gameplay regression scenario remains as coverage for existing journeys between destinations. Models continue to use the GLB workflow documented in the README.

HUD actions use compact icons. Set `icon: "return"` for the shared return arrow, or choose an activity icon from `src/ui/action-icons.js` (for example `pool`, `castle`, `collect`, or `tea`). Actions without a specific icon show a sparkle. Keep a descriptive `label` with the shortcut; it becomes the accessible name and tooltip.
