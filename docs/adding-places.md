# Adding a place

Create `src/locations/<name>/world.js` for scenery and terrain, and `place.js` for lifecycle, actions, HUD data, and configuration. An activity or complex HUD can live in its own file beside them.

A factory receives shared services through `context`. Use `context.scene`, `context.helpers` (`mesh`, `box`, `ball`, `cyl`), `context.hero`, `context.companion`, `context.heroRig`, `context.models`, `context.toast`, and `context.transitions`. Keep place-specific progress in the factory's closure.

This small example is a complete destination; replace its geometry with your design:

```js
import * as THREE from "three";

export function createGrovePlace(context) {
  const group = new THREE.Group();
  context.scene.add(group);
  context.helpers.cyl(18, 18, 0.5, "#547c49", 0, -0.25, 0, group, 48);

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

Import the factory in `src/locations/register-places.js`, then add `places.register(createGrovePlace(context))` before `places.validate()`. No input, HUD, movement, or restart branch is required. Decorate the entrance separately if you want a visible gate in its parent world; the example defines the gate's detection area only. Check that its approach and return spawn avoid the parent's obstacles.

`?area=grove` opens registered root places through their parent route. An optional `activity` query is passed to entry adapters. The generic `settings.spawn` is used for direct entries.

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
| `reset()`                                               | Clears progress on New adventure. Ordinary entry/exit preserves progress.                                                                                                                      |
| `canEnter`, `canLeave`                                  | Optional guards receiving route information. Parent returns are otherwise allowed; home can be reached through its parent chain.                                                               |
| `canThrow`, `maxZoom`, `cameraTarget()`                 | Weapon and camera policy.                                                                                                                                                                      |

An action has a `label`, `key`, `run`, optional `visible`, and optional `disabled`. The default button is `placeAction`; supply a distinct `id` for additional buttons. The shared HUD creates missing buttons. Keyboard and button dispatch use the same action data and respect pause/transition locks.

For a room, set `kind: "room"` and `parent` to its containing place. Attach a separate room group to the scene and provide its own terrain and settings. Root area context remains active while the room's terrain and HUD are selected. Return snapshots preserve the parent's camera and departure position.

Transport-controlled terrain uses `kind: "context"` and a parent's `resolve()` callback. Existing lagoon and summit definitions use this because their activities control arrival and scenery. New ordinary places generally use the default `kind: "area"`.

## Validation

Run `npm test` and `npm run test:build`. Add focused place tests using `createTestGame()` from `tests/helpers/game.js`. Include entry and return, collision/boundary behavior, action dispatch, pause, persistent progress, and restart during an activity or fade.

The larger gameplay regression scenario remains as coverage for existing journeys between destinations. Models continue to use the GLB workflow documented in the README.
