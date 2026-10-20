(() => {
  const layer = document.querySelector('.bgmesh');
  if (!layer) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'fluid-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const motion = matchMedia('(min-width: 721px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  let ctx, width = 0, height = 0, frame = 0, timer = 0, lastFrame = 0, activeUntil = 0;
  let elapsed = 0;
  let x = 0, y = 0, targetX = 0, targetY = 0, velocityX = 0, velocityY = 0;
  let wakeX = 0, wakeY = 0, turn = 0, turnSpeed = 0;
  let previousX = null, previousY = null;

  function glow(cx, cy, radius, core, edge) {
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, core);
    gradient.addColorStop(.54, edge);
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  }

  function draw(time) {
    const dark = document.documentElement.dataset.theme === 'dark';
    const base = ctx.createLinearGradient(0, 0, width, height);
    if (dark) {
      base.addColorStop(0, '#0b1920');
      base.addColorStop(.52, '#0d202a');
      base.addColorStop(1, '#132038');
    } else {
      base.addColorStop(0, '#f2faf7');
      base.addColorStop(.52, '#e9f6f4');
      base.addColorStop(1, '#edf3fb');
    }
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    const seconds = time * .001;
    const angle = turn + Math.sin(seconds * .13) * .035;
    const cosine = Math.cos(angle), sine = Math.sin(angle);
    const driftX = Math.sin(seconds * .11) * .018;
    const driftY = Math.cos(seconds * .09) * .016;
    const place = (bx, by, flowX, flowY) => {
      const offsetX = bx - .5, offsetY = by - .52;
      return [
        width * (.5 + offsetX * cosine - offsetY * sine + flowX + driftX),
        height * (.52 + offsetX * sine + offsetY * cosine + flowY + driftY)
      ];
    };

    // All three broad color fields move. The wake and turn bend them in
    // different directions, so no colored disc sticks to the cursor.
    const teal = place(.18, .28, x * .115 + wakeY * .20, y * .09 - wakeX * .14);
    const blue = place(.82, .40, x * .075 - wakeY * .22, y * .105 + wakeX * .15);
    const lilac = place(.54, .84, x * .09 + wakeY * .12, y * .075 + wakeX * .10);
    const radius = Math.max(width, height) * .72;

    if (dark) {
      glow(...teal, radius, 'rgba(32,151,135,.41)', 'rgba(37,133,128,.17)');
      glow(...blue, radius * .94, 'rgba(54,113,181,.37)', 'rgba(59,105,156,.15)');
      glow(...lilac, radius * .78, 'rgba(100,90,166,.22)', 'rgba(85,94,155,.08)');
    } else {
      glow(...teal, radius, 'rgba(62,191,165,.45)', 'rgba(93,204,184,.19)');
      glow(...blue, radius * .94, 'rgba(98,165,219,.39)', 'rgba(133,187,226,.17)');
      glow(...lilac, radius * .78, 'rgba(157,148,216,.24)', 'rgba(168,176,222,.09)');
    }
  }

  function advance(step) {
    velocityX = (velocityX + (targetX - x) * .009 * step) * Math.pow(.90, step);
    velocityY = (velocityY + (targetY - y) * .009 * step) * Math.pow(.90, step);
    x += velocityX * step;
    y += velocityY * step;
    turnSpeed = (turnSpeed - turn * .004 * step) * Math.pow(.91, step);
    turn = clamp(turn + turnSpeed * step, -.34, .34);
    wakeX *= Math.pow(.91, step);
    wakeY *= Math.pow(.91, step);
  }

  function tick(time) {
    frame = 0;
    if (!motion.matches || document.hidden) return;
    const delta = clamp(time - lastFrame, 0, 80);
    lastFrame = time;
    elapsed += delta;
    // Small integration steps keep inertia stable even on a slow display.
    for (let left = delta / 16.67; left > 0; left -= 1) advance(Math.min(1, left));
    draw(elapsed);
    const settled = Math.abs(targetX - x) + Math.abs(targetY - y)
      + Math.abs(velocityX) + Math.abs(velocityY) + Math.abs(wakeX)
      + Math.abs(wakeY) + Math.abs(turn) + Math.abs(turnSpeed) < .0008;
    // Freeze the complete field once inertia settles; no idle animation loop.
    if (time >= activeUntil && settled) return;
    schedule();
  }

  function schedule() {
    if (frame || timer || !ctx || !motion.matches || document.hidden) return;
    // Avoid waking requestAnimationFrame at display refresh rate just to skip draws.
    timer = setTimeout(() => {
      timer = 0;
      if (motion.matches && !document.hidden) frame = requestAnimationFrame(tick);
    }, Math.max(0, 40 - (performance.now() - lastFrame)));
  }

  function start() {
    if (frame || timer || !ctx || !motion.matches || document.hidden) return;
    lastFrame = performance.now();
    schedule();
  }

  function stop() {
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    frame = timer = 0;
  }

  function resize() {
    if (!motion.matches || document.hidden) return;
    ctx ||= canvas.getContext('2d', { alpha: false });
    if (!ctx) return; // Keep the CSS gradient when canvas is unavailable.
    const viewportWidth = Math.max(1, innerWidth), viewportHeight = Math.max(1, innerHeight);
    const scale = Math.min(1, Math.sqrt(24000 / (viewportWidth * viewportHeight)));
    width = Math.max(1, Math.round(viewportWidth * scale));
    height = Math.max(1, Math.round(viewportHeight * scale));
    canvas.width = width;
    canvas.height = height;
    draw(elapsed);
  }

  function applyMotionPreference() {
    canvas.style.display = motion.matches ? '' : 'none';
    stop();
    if (motion.matches) resize();
  }

  addEventListener('pointermove', event => {
    if (!motion.matches || document.hidden || !ctx || (event.pointerType !== 'mouse' && event.pointerType !== 'pen')) return;
    const nx = clamp(event.clientX / Math.max(1, innerWidth) * 2 - 1, -1, 1);
    const ny = clamp(event.clientY / Math.max(1, innerHeight) * 2 - 1, -1, 1);
    targetX = nx;
    targetY = ny;
    if (previousX !== null) {
      const dx = clamp(nx - previousX, -.30, .30);
      const dy = clamp(ny - previousY, -.30, .30);
      wakeX = clamp(wakeX + dx * .60, -.30, .30);
      wakeY = clamp(wakeY + dy * .60, -.30, .30);
      turnSpeed = clamp(turnSpeed + (previousX * dy - previousY * dx) * .065, -.028, .028);
    }
    previousX = nx;
    previousY = ny;
    activeUntil = performance.now() + 400;
    start();
  }, { passive: true });

  addEventListener('pointerout', event => {
    if (event.relatedTarget) return;
    previousX = previousY = null;
    targetX = targetY = 0;
    activeUntil = performance.now() + 400;
    start();
  }, { passive: true });

  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 160);
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    stop();
    previousX = previousY = null;
    if (!document.hidden && motion.matches) { resize(); start(); }
  });
  motion.addEventListener?.('change', applyMotionPreference);
  new MutationObserver(() => { if (ctx && motion.matches && !document.hidden) draw(elapsed); }).observe(document.documentElement, {
    attributes: true, attributeFilter: ['data-theme']
  });

  layer.append(canvas);
  applyMotionPreference();
})();
