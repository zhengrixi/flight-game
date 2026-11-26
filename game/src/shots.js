// Deterministic screenshot scenes behind ?shot=start|play|rush|end.
// Each one plays the real rules forward from a fresh world, steered by a
// simple autopilot that climbs toward the next ring (or dives for the
// runway on the end scene), so the frame is what a real flight looks like
// and the same seed always gives the same frame.
import { COURSE, STEP } from './config.js';
import { EVENT_OVER } from './aircraft.js';
import { groundHeight } from './terrain.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 3;
const PLAY_SECONDS = 24;
const RUSH_SECONDS = 30;
const END_LIMIT_SECONDS = 400;
const SAMPLE = 1 / 30;

/** Steer toward the next ring's altitude, or down a gentle glide to land. */
function autopilot(world, land) {
  const { state, terrain } = world;
  let targetAlt = 150;
  let throttle = 0.8;
  let pitchCap = 1;
  let ring = null;
  for (const r of terrain.rings) {
    if (!r.passed && r.d > state.d) { ring = r; break; }
  }
  if (land && state.d > 4600) {
    // Final approach: a shallow glide onto the far runway, always
    // clearing the terrain ahead — the glide is above the ground, not
    // at a fixed absolute altitude.
    const groundAhead = groundHeight(terrain, state.d + 150);
    targetAlt = groundAhead + Math.max(0, (COURSE.farRunwayStart - state.d) * 0.02);
    throttle = 0.5;
    pitchCap = 0.5;
  } else if (ring) {
    targetAlt = ring.alt;
  }
  const error = targetAlt - state.alt;
  const pitch = Math.max(-pitchCap, Math.min(pitchCap, error / 60));
  return { pitch, throttle };
}

/** Fly the world forward with the autopilot for up to `seconds`. */
function fly(world, seconds, land) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const { pitch, throttle } = autopilot(world, land);
    const events = world.step(STEP, pitch, throttle, true);
    if (events & EVENT_OVER) return true;
  }
  return false;
}

/**
 * Set `world` to the named scene and return the screen to draw over it
 * and the best score to show. Unknown names stage the title scene.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    fly(world, PLAY_SECONDS, false);
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'rush') {
    // Low pass: fly most of the course, then drop to a fast low run
    // through the next ring. Only restage the altitude while still flying.
    fly(world, RUSH_SECONDS, false);
    const { state } = world;
    if (state.phase === 'flying') {
      state.alt = Math.min(state.alt, 70);
      state.throttle = 1;
      state.speed = 140;
    }
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'end') {
    fly(world, END_LIMIT_SECONDS, true);
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  fly(world, START_SECONDS, false);
  return { screen: SCREEN_TITLE, best: 0 };
}
