// Procedural terrain for Skyline Courier: a valley course with mountains,
// a winding river, a road that follows the valley, and two runways.
// Everything is a pure function of distance, so the same seed rebuilds
// the same valley every time.
import { COURSE } from './config.js';
import { smoothNoise } from './random.js';

const CONTROL_COUNT = 48;

/** Build the valley from a seeded random stream. */
export function createTerrain(random) {
  const ridge = [];
  const hill = [];
  for (let i = 0; i < CONTROL_COUNT; i += 1) {
    ridge.push(40 + random() * 150); // mountain height in metres
    hill.push(8 + random() * 42); // rolling hill height in metres
  }
  // Ring gates: spread along the course, each at a flyable altitude.
  const rings = [];
  const span = COURSE.farRunwayStart - COURSE.runwayEnd - 600;
  for (let i = 0; i < COURSE.ringCount; i += 1) {
    const d = COURSE.runwayEnd + 500 + (span * i) / (COURSE.ringCount - 1);
    const alt = 90 + random() * 170;
    rings.push({ d, alt, passed: false, perfect: false });
  }
  // River crossings and road bends, fixed by the same stream.
  const riverAt = [900 + random() * 600, 3000 + random() * 600, 4800 + random() * 400];
  const roadBend = random() * Math.PI * 2;
  return { ridge, hill, rings, riverAt, roadBend, seedRings: rings.map((r) => r.alt) };
}

/** Ground height (metres) at distance d. Flat on both runways. */
export function groundHeight(terrain, d) {
  const dd = Math.max(0, Math.min(d, COURSE.length));
  if (dd <= COURSE.runwayEnd || dd >= COURSE.farRunwayStart) return 0;
  const x = dd / 260;
  const ridge = smoothNoise(null, terrain.ridge, x * 0.6) * 0.55;
  const hills = smoothNoise(null, terrain.hill, x * 1.7);
  const edge = Math.min(1, Math.min(dd - COURSE.runwayEnd, COURSE.farRunwayStart - dd) / 500);
  return (ridge * 0.35 + hills) * edge;
}

/** Is distance d on a runway strip? */
export function onRunway(d) {
  return d <= COURSE.runwayEnd || d >= COURSE.farRunwayStart;
}

/** Distance to the next unpassed ring, or null when the course is done. */
export function nextRing(terrain, d) {
  for (const ring of terrain.rings) {
    if (!ring.passed && ring.d > d - 10) return ring;
  }
  return null;
}
