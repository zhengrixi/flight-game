// Chase-view renderer: sky, sun and clouds, parallax mountains, the valley
// floor with its river and road, both runways, the ring gates, the courier
// itself, and the lit instrument HUD. One logical 1280x720 frame, scaled
// to the canvas.
import { COURSE, FIELD, PALETTE, FONT } from './config.js';
import { groundHeight, onRunway } from './terrain.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const PLANE_X = 330;
const ALT_SCALE = 1.55; // screen px per metre of altitude
const DIST_SCALE = 0.16; // screen px per metre of distance ahead

function altToY(alt, groundAlt) {
  const base = FIELD.height - 96 - groundAlt * ALT_SCALE * 0.55;
  return base - alt * ALT_SCALE;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  function fit() {
    // Back the canvas at the element's full size and map the logical
    // 1280x720 field onto the whole backing store, so the game always
    // covers the window with no bare strip at the bottom.
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    ctx.setTransform(canvas.width / FIELD.width, 0, 0, canvas.height / FIELD.height, 0, 0);
  }
  fit();
  window.addEventListener('resize', fit);

  return {
    draw(state, terrain, screen, best) {
      drawScene(ctx, state, terrain, screen, best);
    },
  };
}

function drawScene(ctx, state, terrain, screen, best) {
  const groundAtPlane = groundHeight(terrain, state.d);
  // Sky.
  const sky = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(0.45, PALETTE.skyMid);
  sky.addColorStop(0.72, PALETTE.skyLow);
  sky.addColorStop(1, PALETTE.skyLow);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);

  // Sun and drifting clouds.
  ctx.fillStyle = PALETTE.sun;
  ctx.beginPath();
  ctx.arc(1080, 110, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 215, 106, 0.25)';
  ctx.beginPath();
  ctx.arc(1080, 110, 62, 0, Math.PI * 2);
  ctx.fill();
  drawClouds(ctx, state);

  // Parallax mountain ridges, far to near; the nearest one fills the
  // gap between the horizon and the valley floor with rolling hills.
  drawRidge(ctx, state.d, 0.25, 190, PALETTE.farMountain, false);
  drawRidge(ctx, state.d, 0.55, 130, PALETTE.nearMountain, false);
  drawRidge(ctx, state.d, 0.85, 90, '#55794f', true);

  // Valley floor: rolling ground, river crossings, the valley road.
  drawGround(ctx, state, terrain, groundAtPlane);

  // Ring gates ahead.
  drawRings(ctx, state, terrain, groundAtPlane);

  // The courier, banked with its pitch, cockpit glass lit.
  drawPlane(ctx, state, terrain, groundAtPlane);

  // HUD: altitude, speed, heading, throttle, score, timer, rings.
  drawHud(ctx, state, terrain, screen);

  if (screen === SCREEN_TITLE) drawTitle(ctx, state, best);
  if (screen === SCREEN_PAUSED) drawPaused(ctx);
  if (screen === SCREEN_OVER) drawOver(ctx, state, best);
}

function drawClouds(ctx, state) {
  ctx.fillStyle = PALETTE.cloud;
  ctx.globalAlpha = 0.85;
  for (let i = 0; i < 6; i += 1) {
    const x = (((i * 260 - state.d * 0.35) % 1500) + 1500) % 1500 - 110;
    const y = 60 + (i % 3) * 55;
    ctx.beginPath();
    ctx.ellipse(x, y, 64, 18, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 40, y + 6, 44, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawRidge(ctx, d, parallax, baseY, colour, fillToBottom) {
  // A ridge is a backdrop only: it hangs from the horizon and stops well
  // above the valley floor, so the ground always covers what is below it.
  // The nearest ridge fills to the bottom instead: the ground polygon,
  // drawn after it, covers everything below the valley floor, so only
  // its rolling hills show in the gap between horizon and ground.
  const bottomY = fillToBottom ? FIELD.height : FIELD.horizonY + 70;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(0, bottomY);
  for (let x = 0; x <= FIELD.width; x += 32) {
    const world = (d * parallax + x * 2.2) / 260;
    const h = 60 + 90 * Math.abs(Math.sin(world * 1.3) * 0.7 + Math.sin(world * 0.37) * 0.3);
    ctx.lineTo(x, FIELD.horizonY + 40 - h * 0.6);
  }
  ctx.lineTo(FIELD.width, bottomY);
  ctx.closePath();
  ctx.fill();
  // Snow caps on the far ridge.
  if (parallax < 0.4) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let x = 40; x < FIELD.width; x += 190) {
      const world = (d * parallax + x * 2.2) / 260;
      const h = 60 + 90 * Math.abs(Math.sin(world * 1.3) * 0.7 + Math.sin(world * 0.37) * 0.3);
      const y = FIELD.horizonY + 40 - h * 0.6;
      ctx.beginPath();
      ctx.moveTo(x - 26, y + 22);
      ctx.lineTo(x, y);
      ctx.lineTo(x + 26, y + 22);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawGround(ctx, state, terrain, groundAtPlane) {
  const groundY = altToY(0, groundAtPlane);
  // Rolling ground from the horizon line down.
  ctx.fillStyle = PALETTE.field;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  for (let x = 0; x <= FIELD.width; x += 16) {
    const d = state.d + (x - PLANE_X) / DIST_SCALE;
    const g = groundHeight(terrain, d);
    ctx.lineTo(x, altToY(g, groundAtPlane));
  }
  ctx.lineTo(FIELD.width, FIELD.height);
  ctx.lineTo(0, FIELD.height);
  ctx.closePath();
  ctx.fill();

  // River crossings: a blue ribbon lying on the valley floor, not a slab.
  for (const at of terrain.riverAt) {
    const x = PLANE_X + (at - state.d) * DIST_SCALE;
    if (x < -80 || x > FIELD.width + 80) continue;
    const gy = altToY(groundHeight(terrain, at), groundAtPlane);
    ctx.fillStyle = PALETTE.river;
    ctx.beginPath();
    ctx.ellipse(x, gy + 6, 52, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(x - 8, gy + 4, 26, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // The valley road: a dark ribbon along the ground, smoothed so it reads
  // as a road rather than a crack in the hillside.
  ctx.strokeStyle = PALETTE.road;
  ctx.lineWidth = 7;
  ctx.beginPath();
  let prevY = null;
  for (let x = 0; x <= FIELD.width; x += 32) {
    const d = state.d + (x - PLANE_X) / DIST_SCALE;
    const y = altToY(groundHeight(terrain, d), groundAtPlane) + 16;
    const smoothY = prevY === null ? y : prevY * 0.5 + y * 0.5;
    if (x === 0) ctx.moveTo(x, smoothY);
    else ctx.lineTo(x, smoothY);
    prevY = smoothY;
  }
  ctx.stroke();

  // Runways: grey strips with white centre dashes.
  drawRunway(ctx, state, terrain, COURSE.runwayStart, COURSE.runwayEnd, groundAtPlane);
  drawRunway(ctx, state, terrain, COURSE.farRunwayStart, COURSE.farRunwayEnd, groundAtPlane);
}

function drawRunway(ctx, state, terrain, start, end, groundAtPlane) {
  const x0 = PLANE_X + (start - state.d) * DIST_SCALE;
  const x1 = PLANE_X + (end - state.d) * DIST_SCALE;
  if (x1 < -40 || x0 > FIELD.width + 40) return;
  const y = altToY(0, groundAtPlane);
  ctx.fillStyle = PALETTE.runway;
  ctx.fillRect(Math.max(0, x0), y - 6, Math.min(FIELD.width, x1) - Math.max(0, x0), 22);
  ctx.fillStyle = PALETTE.runwayMark;
  for (let x = Math.max(0, x0 + 10); x < Math.min(FIELD.width, x1 - 14); x += 34) {
    ctx.fillRect(x, y + 2, 18, 4);
  }
}

function drawRings(ctx, state, terrain, groundAtPlane) {
  for (const ring of terrain.rings) {
    const rel = ring.d - state.d;
    if (rel < -60 || rel > 5200) continue;
    const x = PLANE_X + rel * DIST_SCALE;
    const y = altToY(ring.alt, groundAtPlane);
    const scale = Math.max(0.35, Math.min(1.15, 1 - rel / 6000));
    const r = COURSE.ringRadius * ALT_SCALE * 0.62 * scale + 8;
    if (ring.passed) {
      ctx.strokeStyle = 'rgba(123, 228, 149, 0.85)';
    } else {
      ctx.strokeStyle = PALETTE.ring;
      ctx.shadowColor = PALETTE.ringGlow;
      ctx.shadowBlur = 18;
    }
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Distance tag on the next ring.
    if (!ring.passed && rel > 0 && rel < 2600) {
      ctx.fillStyle = PALETTE.hudAmber;
      ctx.font = `bold 15px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(rel)}m`, x, y - r - 10);
    }
  }
}

function drawPlane(ctx, state, terrain, groundAtPlane) {
  const y = altToY(state.alt, groundAtPlane);
  // Shadow on the ground below.
  const groundY = altToY(groundHeight(terrain, state.d), groundAtPlane);
  const h = Math.max(0, groundY - y);
  if (h < 260) {
    ctx.fillStyle = `rgba(0,0,0,${0.28 * (1 - h / 260)})`;
    ctx.beginPath();
    ctx.ellipse(PLANE_X, groundY + 8, 46 * (1 - h / 400), 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(PLANE_X, y);
  ctx.rotate(-state.pitch * 0.22 + state.bank * 0.12);
  // Tail fin and wings.
  ctx.fillStyle = PALETTE.planeWing;
  ctx.beginPath();
  ctx.moveTo(-58, -4);
  ctx.lineTo(-78, -26);
  ctx.lineTo(-66, -24);
  ctx.lineTo(-48, -8);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-6, 10);
  ctx.lineTo(-34, 34);
  ctx.lineTo(-18, 34);
  ctx.lineTo(8, 12);
  ctx.closePath();
  ctx.fill();
  // Fuselage.
  ctx.fillStyle = PALETTE.planeBody;
  ctx.beginPath();
  ctx.moveTo(-72, 0);
  ctx.quadraticCurveTo(-40, -14, 10, -10);
  ctx.quadraticCurveTo(58, -6, 66, 2);
  ctx.quadraticCurveTo(58, 10, 10, 12);
  ctx.quadraticCurveTo(-40, 14, -72, 0);
  ctx.closePath();
  ctx.fill();
  // Lit cockpit glass and cabin windows.
  ctx.fillStyle = PALETTE.planeGlass;
  ctx.beginPath();
  ctx.moveTo(28, -8);
  ctx.quadraticCurveTo(52, -6, 56, 0);
  ctx.quadraticCurveTo(40, 2, 26, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-28, -4, 10, 5);
  ctx.fillRect(-12, -4, 10, 5);
  // Engine glow.
  ctx.fillStyle = state.throttle > 0.6 ? '#ffd76a' : '#ff9d5c';
  ctx.beginPath();
  ctx.arc(-72, 0, 5 + state.throttle * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHud(ctx, state, terrain, screen) {
  // Top instrument bar.
  ctx.fillStyle = PALETTE.hudPanel;
  roundRect(ctx, 12, 12, FIELD.width - 24, 64, 10);
  ctx.fill();
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = `bold 13px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('ALT', 30, 32);
  ctx.fillText('SPD', 210, 32);
  ctx.fillText('HDG', 390, 32);
  ctx.fillText('THR', 560, 32);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = `bold 24px ${FONT}`;
  ctx.fillText(`${Math.round(state.alt)} m`, 30, 60);
  ctx.fillText(`${Math.round(state.speed * 3.6)} km/h`, 210, 60);
  ctx.fillText(`${Math.round(state.heading)}°`, 390, 60);
  // Throttle gauge.
  ctx.fillStyle = '#24344a';
  roundRect(ctx, 560, 44, 150, 14, 7);
  ctx.fill();
  ctx.fillStyle = state.throttle > 0.8 ? PALETTE.hudAmber : PALETTE.hudGreen;
  roundRect(ctx, 560, 44, 150 * state.throttle, 14, 7);
  ctx.fill();
  // Score, rings, timer on the right.
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.hudAmber;
  ctx.font = `bold 26px ${FONT}`;
  ctx.fillText(`SCORE ${state.score}`, FIELD.width - 30, 42);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = `bold 16px ${FONT}`;
  const left = Math.max(0, COURSE.timeLimit - state.time);
  ctx.fillText(`RINGS ${state.ringsHit}/${COURSE.ringCount}   TIME ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`, FIELD.width - 30, 66);
  ctx.textAlign = 'left';

  // Low-altitude warning.
  const clearance = state.alt;
  if (screen === SCREEN_PLAY && state.phase === 'flying' && clearance < 25) {
    ctx.fillStyle = PALETTE.hudRed;
    ctx.font = `bold 22px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('PULL UP — TERRAIN', FIELD.width / 2, 120);
    ctx.textAlign = 'left';
  }
  // Toast message.
  if (state.message) {
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = `bold 18px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(state.message, FIELD.width / 2, FIELD.height - 28);
    ctx.textAlign = 'left';
  }
  // Next-ring compass hint.
  const ring = nextRingHint(terrain, state.d);
  if (screen === SCREEN_PLAY && ring) {
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `15px ${FONT}`;
    ctx.fillText(`NEXT RING ${Math.round(ring.d - state.d)}m · ${Math.round(ring.alt)}m ALT`, 30, 108);
  }
}

function nextRingHint(terrain, d) {
  for (const ring of terrain.rings) {
    if (!ring.passed && ring.d > d) return ring;
  }
  return null;
}

function drawTitle(ctx, state, best) {
  overlay(ctx, 'rgba(8, 18, 32, 0.55)');
  ctx.fillStyle = PALETTE.hudAmber;
  ctx.font = `bold 64px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('SKYLINE COURIER', FIELD.width / 2, 250);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 26px ${FONT}`;
  ctx.fillText('Fly the valley. Thread every ring. Bring her home.', FIELD.width / 2, 300);
  ctx.font = `20px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('↑ / W climb · ↓ / S dive · Shift throttle up · Mouse steers · Space to start', FIELD.width / 2, 350);
  ctx.fillText(`${COURSE.ringCount} rings · ${COURSE.length}m course · land on the far runway for +${250}`, FIELD.width / 2, 382);
  if (best > 0) {
    ctx.fillStyle = PALETTE.hudGreen;
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText(`Best score: ${best}`, FIELD.width / 2, 420);
  }
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = `bold 24px ${FONT}`;
  ctx.fillText('Press SPACE or CLICK to take off', FIELD.width / 2, 470);
  ctx.textAlign = 'left';
}

function drawPaused(ctx) {
  overlay(ctx, 'rgba(8, 18, 32, 0.6)');
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 44px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', FIELD.width / 2, FIELD.height / 2);
  ctx.font = `20px ${FONT}`;
  ctx.fillText('Press P or Space to keep flying', FIELD.width / 2, FIELD.height / 2 + 40);
  ctx.textAlign = 'left';
}

function drawOver(ctx, state, best) {
  overlay(ctx, 'rgba(8, 18, 32, 0.62)');
  const landed = state.phase === 'landed';
  ctx.fillStyle = landed ? PALETTE.hudGreen : PALETTE.hudRed;
  ctx.font = `bold 56px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(landed ? 'LANDED — COURIER DELIVERED' : 'FLIGHT OVER', FIELD.width / 2, 240);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 30px ${FONT}`;
  ctx.fillText(`Score ${state.score}   ·   Rings ${state.ringsHit}/${COURSE.ringCount} (${state.ringsPerfect} perfect)`, FIELD.width / 2, 300);
  ctx.font = `22px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(`Distance ${Math.round(state.d)}m · Time ${state.time.toFixed(1)}s · Best ${Math.max(best, state.score)}`, FIELD.width / 2, 340);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = `bold 24px ${FONT}`;
  ctx.fillText('Press SPACE or CLICK to fly again', FIELD.width / 2, 400);
  ctx.textAlign = 'left';
}

function overlay(ctx, colour) {
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
