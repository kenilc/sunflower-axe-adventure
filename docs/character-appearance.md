# Clothing, expressions, and held items

Each character rig owns `appearance` and `items` controllers. Use
`game.characters.rig` for the heroine and `game.characters.companion.rig` for
her companion. Place factories receive these as `context.heroRig` and
`context.companion.rig`.

## Clothing and accessories

```js
rig.appearance.setOutfit("summer");
rig.appearance.setAccessory("headwear", null); // Remove a hat, preserve hair.
rig.appearance.clearAccessory("headwear"); // Restore the outfit's default.
rig.appearance.setAccessory("scarf", "alpine");
```

The winter GLBs identify clothing through `userData.clothingSlot` and
`userData.outfit`. Slots include torso, sleeves, trousers, shoes, scarf, and
headwear. Hair and skin are separate. The named `head` group contains the face,
eyes, hair, and headwear, so activities can tilt the head without moving parts
between parents. Define parts in `assets/source`, then run `npm run assets:build`.

Register an outfit's parts after attaching them to the appropriate body/limb
groups. Give each part its `userData.clothingSlot`; keep bare skin separate from
clothing when authoring a new outfit.

```js
shirt.userData.clothingSlot = "torso";
rig.body.add(shirt);
rig.appearance.registerOutfit("raincoat", {
  parts: [shirt],
  hideSlots: ["torso"],
});
rig.appearance.setOutfit("raincoat");
```

Slots omitted from `hideSlots` retain the winter outfit's pieces. Register an
accessory with `registerAccessory(slot, id, [nodes])`. Controllers change
visibility rather than shared materials; create independent materials when
adding color variants. Existing summer outfits are assembled at runtime; separate
outfit GLBs can supply the same named parts later.

## Expressions and temporary activities

Built-in expressions are `neutral`, `happy`, `surprised`, `delighted`, and
`sleeping`. The cart registers an additional `cart-excited` expression.

```js
rig.appearance.setExpression("happy");
const release = rig.appearance.override({ expression: "sleeping" });
// On activity exit, cancellation, or reset:
release();
```

An override can also supply `outfit` or `accessories`. Newer overrides take
precedence for the fields they supply. Releasing an override restores the
remaining activity or current base appearance, including when activities finish
out of order. Keep the release function in the activity, and call it on every
exit path. `reset()` clears overrides and restores winter clothing and a smile.

Custom expressions use `registerExpression(id, { mouthNode, closed, eyeScale })`.
Attach the mouth to `rig.head` before registration; its coordinates are relative
to the head pivot at body height 1.8. Unspecified mouths use the resting smile.

## Held items

Both models have a named `held-item-anchor` on the right arm. The heroine equips
an axe at game creation; the companion starts empty. The axe is a separate GLB
and is no longer embedded in the heroine's model.

```js
rig.items.equip("ice-cream"); // Built-in sample; cannot be thrown.
rig.items.equip(null); // Empty hand.
rig.items.register("flower", {
  create: () => flowerTemplate.clone(true),
  grip: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
});
rig.items.equip("flower");
```

Each factory returns a fresh Object3D. Immutable geometry/materials can be
shared. The optional `grip` adjusts a held model within the anchor without
changing the projectile's transforms.

Items default to `throwable: false` and `weapon: false`. The axe explicitly sets
both to true. `consumeOnThrow: true` unequips a thrown item; otherwise throwing
creates a projectile and retains the held item, matching the existing axe.
Projectiles currently use the game's existing spinning trajectory and target-hit
behavior. Eating, dropping, or different projectile behavior would be additional
item actions.

Places control weapon visibility with `setWeaponsAllowed(value)`. Ordinary props
remain visible in peaceful places. Sitting and rides use
`setHidden("activity-name", true)` and clear their own reason on exit, so one
activity cannot reveal an item hidden by another. Changing items while hidden
preserves these restrictions. The throw button and click/Space handling check the
equipped item's permission as well as the place's permission.

The sample ice cream has no acquisition UI yet; future shop/place interactions
can equip it directly. Restart clears appearance overrides and restores the
heroine's axe and the companion's empty hand.

Run `npm test`, `npm run assets:check`, and `npm run test:build` after modifying
models or behavior.
