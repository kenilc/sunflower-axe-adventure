export function overlapsObstacle(position, obstacle, radius = 0.38) {
  return (
    obstacle.active !== false &&
    Math.hypot(position.x - obstacle.x, position.z - obstacle.z) <
      obstacle.r + Math.max(radius, obstacle.minClearance ?? 0) - 1e-7
  );
}

// A later contact can undo an earlier one. Recheck, then fall back to the
// previous safe position if a crowded set of contacts cannot be resolved.
export function resolveObstacleCollisions(
  position,
  previous,
  obstacles,
  radius = 0.38,
) {
  for (let pass = 0; pass < 8; pass++) {
    let moved = false;
    for (const obstacle of obstacles) {
      if (!overlapsObstacle(position, obstacle, radius)) continue;
      let dx = position.x - obstacle.x,
        dz = position.z - obstacle.z,
        distance = Math.hypot(dx, dz);
      if (distance < 1e-9) {
        dx = previous.x - obstacle.x;
        dz = previous.z - obstacle.z;
        distance = Math.hypot(dx, dz);
        if (distance < 1e-9) {
          dx = distance = 1;
          dz = 0;
        }
      }
      const clearance =
        obstacle.r + Math.max(radius, obstacle.minClearance ?? 0);
      position.x = obstacle.x + (dx / distance) * clearance;
      position.z = obstacle.z + (dz / distance) * clearance;
      moved = true;
    }
    if (!moved) return true;
  }
  if (!obstacles.some((b) => overlapsObstacle(position, b, radius)))
    return true;
  position.copy(previous);
  return false;
}
