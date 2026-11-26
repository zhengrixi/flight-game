// The courier aircraft: arcade flight physics, ring scoring, and the
// take-off / crash / landing states. Altitude and distance are in metres.
import { COURSE, PLANE, STEP } from './config.js';
import { createTerrain, groundHeight, nextRing, onRunway } from './terrain.js';

export const EVENT_RING = 1;
export const EVENT_CRASH = 2;
export const EVENT_LANDED = 4;
export const EVENT_OVER = 8;

export function createWorld(random) {
  const terrain = createTerrain(random);
  const state = freshState();
  return {
    state,
    terrain,
    reset() {
      const next = freshState();
      Object.assign(state, next);
      for (const ring of terrain.rings) {
        ring.passed = false;
        ring.perfect = false;
      }
    },
    /** Advance one fixed step. pitch -1..1 (up positive), throttle 0..1. */
    step(dt, pitch, throttle, autopilot) {
      return stepWorld(state, terrain, dt, pitch, throttle, autopilot);
    },
  };
}

function freshState() {
  return {
    d: 60, // distance along the course (m)
    alt: 0, // altitude above ground level (m)
    speed: 0, // m/s
    heading: 90, // degrees; the course runs east, heading drifts with turns
    pitch: 0,
    throttle: 0.55,
    score: 0,
    ringsHit: 0,
    ringsPerfect: 0,
    time: 0,
    phase: 'taxi', // taxi | flying | landed | crashed
    message: '',
    verticalSpeed: 0,
    bank: 0,
  };
}

function stepWorld(state, terrain, dt, pitch, throttle, autopilot) {
  if (state.phase === 'landed' || state.phase === 'crashed') return 0;
  let events = 0;
  state.time += dt;
  state.throttle = throttle;

  // Speed chases the throttle target; drag grows past cruise speed.
  const target = PLANE.minSpeed + throttle * (PLANE.maxSpeed - PLANE.minSpeed);
  const rate = target > state.speed ? 0.55 : 0.35;
  state.speed += (target - state.speed) * Math.min(1, rate * dt);
  if (state.speed < PLANE.minSpeed * 0.55 && state.alt > 2) {
    // Stalled: the courier sinks whether the pilot likes it or not.
    state.verticalSpeed -= PLANE.sinkRate * dt;
  }

  // Pitch steers altitude; lift only bites once there is airspeed.
  const lift = Math.max(0, (state.speed - PLANE.minSpeed * 0.5) / PLANE.cruiseSpeed);
  const wantedVy = pitch * PLANE.climbRate * lift;
  state.verticalSpeed += (wantedVy - state.verticalSpeed) * Math.min(1, 3.2 * dt);
  state.pitch = pitch;
  state.bank = pitch * 0.55;
  state.alt += state.verticalSpeed * dt;
  state.d += state.speed * dt;
  state.heading = 90 + pitch * 4;

  const ground = groundHeight(terrain, state.d);
  const clearance = state.alt - ground;

  // Take-off: rolling on the runway, lift off once fast enough. Altitude
  // is allowed to build while the wheels are still down; only a slow
  // roll is pinned to the strip.
  if (state.phase === 'taxi') {
    if (state.speed > 62 && state.alt > 3) {
      state.phase = 'flying';
      state.message = 'Airborne — climb and chase the rings!';
    } else if (state.speed <= 62) {
      state.alt = 0;
      state.verticalSpeed = Math.max(0, state.verticalSpeed);
    }
  }

  // Ring gates.
  const ring = nextRing(terrain, state.d);
  if (ring && state.d >= ring.d && state.d - state.speed * dt < ring.d + 30) {
    ring.passed = true;
    const miss = Math.abs(state.alt - ring.alt);
    if (miss <= COURSE.ringRadius) {
      state.ringsHit += 1;
      let gained = PLANE.ringPoints;
      if (miss <= COURSE.ringRadius * 0.35) {
        state.ringsPerfect += 1;
        ring.perfect = true;
        gained += PLANE.perfectBonus;
      }
      state.score += gained;
      state.message = ring.perfect ? `Perfect ring! +${gained}` : `Ring! +${gained}`;
      events |= EVENT_RING;
    } else {
      state.message = 'Ring missed — keep flying';
    }
  }

  // Landing: gentle touchdown on the far runway ends the flight well.
  if (state.d >= COURSE.farRunwayStart && clearance <= 0.5) {
    if (Math.abs(state.verticalSpeed) <= 9 && state.speed <= 110) {
      state.phase = 'landed';
      state.alt = 0;
      state.score += PLANE.landBonus;
      state.message = `Landed safely! +${PLANE.landBonus} landing bonus`;
      return events | EVENT_LANDED | EVENT_OVER;
    }
  }

  // Terrain strike.
  if (clearance <= 0 && state.phase !== 'taxi') {
    if (onRunway(state.d) && Math.abs(state.verticalSpeed) <= 12 && state.d < COURSE.runwayEnd) {
      state.alt = 0;
      state.verticalSpeed = 0;
      return events;
    }
    state.phase = 'crashed';
    state.alt = Math.max(0, ground);
    state.message = clearance <= 0 && state.d >= COURSE.farRunwayStart
      ? 'Hard landing — the courier is down'
      : 'Terrain strike — the courier is down';
    return events | EVENT_CRASH | EVENT_OVER;
  }

  // Out of time or past the course end without landing.
  if (state.time >= COURSE.timeLimit || state.d >= COURSE.length + 200) {
    state.phase = 'crashed';
    state.message = state.time >= COURSE.timeLimit ? 'Out of time — the courier is down' : 'Overshot the runway';
    return events | EVENT_CRASH | EVENT_OVER;
  }
  return events;
}
