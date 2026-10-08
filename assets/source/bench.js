import * as THREE from "three";

export function createBenchModel({ box }) {
  const bench = new THREE.Group();
  for (const side of [-1, 1]) {
    box(0.15, 0.83, 0.72, "#344b43", side * 1.25, 0.42, 0, bench);
    box(0.12, 1.25, 0.12, "#344b43", side * 1.25, 1.05, -0.38, bench);
    box(0.16, 0.12, 0.8, "#a87746", side * 1.42, 1.22, 0, bench);
  }
  for (let i = 0; i < 3; i++) {
    box(3.2, 0.13, 0.23, "#bd8b54", 0, 0.83, -0.26 + i * 0.26, bench);
    box(
      3.2,
      0.2,
      0.12,
      i % 2 ? "#b07e48" : "#bd8b54",
      0,
      1.13 + i * 0.24,
      -0.4,
      bench,
    );
  }
  bench.name = "bench";
  return bench;
}
