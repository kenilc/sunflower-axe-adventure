import * as THREE from "three";

// State belongs to an instance. Presets change visibility and transforms, never
// shared GLB materials. Temporary overrides can be released in any order.
export function createAppearance({ body, head, eyes, smile }) {
  const parts = [];
  body.traverse((node) => {
    if (node.userData.clothingSlot) parts.push(node);
  });
  const outfits = new Map([["winter", { parts: [...parts], hideSlots: [] }]]);
  const accessories = new Map();
  const overrides = new Map();
  const base = { outfit: "winter", expression: "happy", accessories: {} };
  const amazed = new THREE.Mesh(
    new THREE.TorusGeometry(0.075, 0.025, 8, 20),
    new THREE.MeshStandardMaterial({ color: "#704938", flatShading: true }),
  );
  amazed.name = "expression-amazed-mouth";
  amazed.position.set(0, 0.2, 0.7);
  head.add(amazed);
  const neutral = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.025, 0.025),
    amazed.material,
  );
  neutral.name = "expression-neutral-mouth";
  neutral.position.set(0, 0.2, 0.7);
  head.add(neutral);
  const mouths = new Set([smile, amazed, neutral]);
  const expressions = new Map([
    ["neutral", { mouthNode: neutral }],
    ["happy", {}],
    ["surprised", { mouthNode: amazed }],
    ["delighted", { mouthNode: amazed, eyeScale: 1.13 }],
    ["sleeping", { closed: true }],
  ]);
  function state() {
    const result = { ...base, accessories: { ...base.accessories } };
    for (const value of overrides.values()) {
      if (value.outfit !== undefined) result.outfit = value.outfit;
      if (value.expression !== undefined) result.expression = value.expression;
      Object.assign(result.accessories, value.accessories);
    }
    return result;
  }
  function validate(value) {
    if (value.outfit !== undefined && !outfits.has(value.outfit))
      throw new Error(`Unknown outfit: ${value.outfit}`);
    if (value.expression !== undefined && !expressions.has(value.expression))
      throw new Error(`Unknown expression: ${value.expression}`);
    for (const [slot, id] of Object.entries(value.accessories ?? {}))
      if (id !== null && !accessories.get(slot)?.has(id))
        throw new Error(`Unknown ${slot} accessory: ${id}`);
  }
  function render() {
    const current = state();
    const outfit = outfits.get(current.outfit);
    const selected = new Set(outfit.parts);
    for (const node of parts) {
      const slot = node.userData.clothingSlot;
      node.visible = selected.has(node);
      if (Object.hasOwn(current.accessories, slot)) node.visible = false;
    }
    for (const [slot, choices] of accessories)
      for (const [id, nodes] of choices)
        nodes.forEach(
          (node) => (node.visible = current.accessories[slot] === id),
        );
    const expression = expressions.get(current.expression);
    eyes.setClosed(Boolean(expression.closed));
    eyes.open.children.forEach((eye) =>
      eye.scale.setScalar(expression.eyeScale ?? 1),
    );
    mouths.forEach(
      (mouth) => (mouth.visible = mouth === (expression.mouthNode ?? smile)),
    );
  }
  const api = {
    registerExpression(id, preset) {
      if (expressions.has(id)) throw new Error(`Duplicate expression: ${id}`);
      expressions.set(id, { ...preset });
      if (preset.mouthNode) mouths.add(preset.mouthNode);
      render();
    },
    registerOutfit(id, { parts: additions, hideSlots = [] }) {
      if (outfits.has(id)) throw new Error(`Duplicate outfit: ${id}`);
      const winter = outfits.get("winter").parts;
      outfits.set(id, {
        parts: [
          ...winter.filter(
            (node) => !hideSlots.includes(node.userData.clothingSlot),
          ),
          ...additions,
        ],
        hideSlots,
      });
      parts.push(...additions);
      render();
    },
    registerAccessory(slot, id, nodes) {
      if (!accessories.has(slot)) accessories.set(slot, new Map());
      if (accessories.get(slot).has(id))
        throw new Error(`Duplicate accessory: ${id}`);
      accessories.get(slot).set(id, nodes);
      render();
    },
    setOutfit(outfit) {
      validate({ outfit });
      base.outfit = outfit;
      render();
    },
    setExpression(expression) {
      validate({ expression });
      base.expression = expression;
      render();
    },
    setAccessory(slot, id) {
      validate({ accessories: { [slot]: id } });
      base.accessories[slot] = id;
      render();
    },
    clearAccessory(slot) {
      delete base.accessories[slot];
      render();
    },
    override(value) {
      validate(value);
      const token = Symbol();
      overrides.set(token, { ...value, accessories: { ...value.accessories } });
      render();
      return () => {
        overrides.delete(token);
        render();
      };
    },
    reset() {
      overrides.clear();
      base.outfit = "winter";
      base.expression = "happy";
      base.accessories = {};
      render();
    },
    get state() {
      return state();
    },
  };
  render();
  return api;
}
