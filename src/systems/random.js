export function createRandom(initialSeed = 9) {
  let seed = initialSeed;
  return function rand() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
