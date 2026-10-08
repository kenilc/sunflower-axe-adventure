import * as THREE from "three";

export function createHeldItems(anchor) {
  const definitions = new Map();
  const hidden = new Set();
  let current = null,
    object = null,
    weaponsAllowed = true;
  function render() {
    anchor.visible = Boolean(
      object &&
      !hidden.size &&
      (weaponsAllowed || !definitions.get(current).weapon),
    );
  }
  return {
    register(id, definition) {
      if (definitions.has(id)) throw new Error(`Duplicate held item: ${id}`);
      if (typeof definition.create !== "function")
        throw new Error(`Held item ${id} needs a model factory`);
      definitions.set(id, { throwable: false, weapon: false, ...definition });
    },
    equip(id) {
      if (id !== null && !definitions.has(id))
        throw new Error(`Unknown held item: ${id}`);
      const next = id === null ? null : definitions.get(id).create();
      if (id !== null && !next?.isObject3D)
        throw new Error(`Invalid model for held item: ${id}`);
      const grip = definitions.get(id)?.grip;
      if (next && grip) {
        if (grip.position) next.position.fromArray(grip.position);
        if (grip.rotation) next.rotation.set(...grip.rotation);
        if (grip.scale) next.scale.fromArray(grip.scale);
      }
      anchor.clear();
      current = id;
      object = next;
      if (next) anchor.add(next);
      render();
    },
    setWeaponsAllowed(value) {
      weaponsAllowed = value;
      render();
    },
    setHidden(reason, value) {
      value ? hidden.add(reason) : hidden.delete(reason);
      render();
    },
    reset(id = null) {
      hidden.clear();
      weaponsAllowed = true;
      this.equip(id);
    },
    createProjectile() {
      if (!this.canThrow) return null;
      const definition = definitions.get(current);
      const projectile = definition.create();
      if (definition.consumeOnThrow) this.equip(null);
      return projectile;
    },
    get current() {
      return current;
    },
    get label() {
      return definitions.get(current)?.label ?? current;
    },
    get canThrow() {
      return Boolean(anchor.visible && definitions.get(current)?.throwable);
    },
  };
}

// An example ordinary prop: holding it never makes a click throw it away.
let iceCreamTemplate;
export function createIceCream() {
  if (iceCreamTemplate) return iceCreamTemplate.clone(true);
  const item = new THREE.Group();
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.13, 0.4, 8),
    new THREE.MeshStandardMaterial({ color: "#bd8b54", flatShading: true }),
  );
  cone.rotation.z = Math.PI;
  cone.position.y = 0.08;
  const scoop = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.18, 1),
    new THREE.MeshStandardMaterial({ color: "#f3b6c8", flatShading: true }),
  );
  scoop.position.y = 0.35;
  item.add(cone, scoop);
  item.name = "ice-cream";
  iceCreamTemplate = item;
  return item.clone(true);
}
