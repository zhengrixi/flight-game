// Skyline Courier — tuning numbers and colours in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it
// to the window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720, horizonY: 300 };

export const STEP = 1 / 60;

/** Course: take off, fly the ring course, land on the far runway. */
export const COURSE = {
  length: 6200, // metres from the start runway to the far runway
  runwayStart: 0,
  runwayEnd: 420,
  farRunwayStart: 5780,
  farRunwayEnd: 6200,
  ringCount: 8,
  ringRadius: 42,
  timeLimit: 150, // seconds
};

export const PLANE = {
  minSpeed: 38, // m/s; below this the courier stalls and sinks
  cruiseSpeed: 95,
  maxSpeed: 150,
  climbRate: 46, // m/s of vertical speed at full pitch and cruise speed
  sinkRate: 26,
  ringPoints: 100,
  perfectBonus: 50, // extra when the ring is flown near its centre
  landBonus: 250,
};

export const PALETTE = {
  skyTop: '#1d4e89',
  skyMid: '#7fb2e5',
  skyLow: '#cfe8f7',
  sun: '#ffd76a',
  cloud: '#ffffff',
  farMountain: '#5b7ba6',
  nearMountain: '#3d5a3f',
  hill: '#6f9e5a',
  ground: '#8a6f4d',
  field: '#7fae62',
  river: '#4d9bd6',
  road: '#4a4a52',
  runway: '#3a3f46',
  runwayMark: '#f5f5f5',
  planeBody: '#e8542f',
  planeWing: '#c93a1d',
  planeGlass: '#bfe6ff',
  ring: '#ffc93c',
  ringGlow: '#ff9d00',
  hudPanel: 'rgba(10, 22, 38, 0.78)',
  hudText: '#eaf6ff',
  hudAmber: '#ffc93c',
  hudGreen: '#7be495',
  hudRed: '#ff6b5e',
  text: '#f2f7fb',
  muted: '#b9c9d6',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const BEST_KEY = 'skyline-courier.best';
