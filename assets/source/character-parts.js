import * as THREE from "three";

export function clothing(nodes, slot) {
  nodes.forEach((node, index) => {
    node.name ||= `winter-${slot}-${index}`;
    node.userData.clothingSlot = slot;
    node.userData.outfit = "winter";
  });
}

export function head(body, nodes) {
  const group = new THREE.Group();
  group.name = "head";
  group.position.y = 1.8;
  body.add(group);
  nodes.forEach((node) => {
    group.add(node);
    node.position.y -= 1.8;
  });
  return group;
}
