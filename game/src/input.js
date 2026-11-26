// Keyboard and mouse steering for Skyline Courier.
// Arrow keys / WASD pitch the courier, Shift or W/S raise and lower the
// throttle, the mouse steers toward the pointer, Space / click confirms.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseY = null;
  let mouseActive = false;

  function onKeyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    keys.add(event.key.toLowerCase());
    if (event.key === ' ' || event.key === 'Enter') actions |= ACTION_CONFIRM;
    if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') actions |= ACTION_PAUSE;
  }
  function onKeyUp(event) {
    keys.delete(event.key.toLowerCase());
  }
  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouseY = (event.clientY - rect.top) / rect.height;
    mouseActive = true;
  }
  function onMouseDown(event) {
    if (event.button === 0) actions |= ACTION_CONFIRM;
    mouseActive = true;
    onMouseMove(event);
  }
  function onMouseLeave() {
    mouseActive = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mouseleave', onMouseLeave);

  return {
    /** Pitch -1..1 for this frame; mouse steers toward the pointer. */
    pitch() {
      let pitch = 0;
      if (keys.has('arrowup') || keys.has('w')) pitch += 1;
      if (keys.has('arrowdown') || keys.has('s')) pitch -= 1;
      if (pitch !== 0) return pitch;
      if (mouseActive && mouseY !== null) {
        // Pointer above centre climbs, below centre dives.
        const offset = 0.5 - mouseY;
        if (Math.abs(offset) > 0.06) return Math.max(-1, Math.min(1, offset * 3));
      }
      return 0;
    },
    /** Throttle 0..1; Shift speeds up, Ctrl / C slows down. */
    throttle(current) {
      let next = current;
      if (keys.has('shift')) next += 0.012;
      if (keys.has('control') || keys.has('c')) next -= 0.012;
      if (keys.has('arrowright') || keys.has('d')) next += 0.006;
      if (keys.has('arrowleft') || keys.has('a')) next -= 0.006;
      return Math.max(0.15, Math.min(1, next));
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
