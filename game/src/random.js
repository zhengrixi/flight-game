// A tiny seeded generator (mulberry32) so the same seed always builds the
// same course, the same rings and the same weather.
export function createRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Value-noise helper: smooth interpolation between seeded control points. */
export function smoothNoise(random, points, x) {
  const i = Math.floor(x);
  const f = x - i;
  const a = points[((i % points.length) + points.length) % points.length];
  const b = points[(((i + 1) % points.length) + points.length) % points.length];
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
}
