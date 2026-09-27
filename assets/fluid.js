(() => {
  const layer = document.querySelector('.bgmesh');
  if (!layer) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'fluid-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return; // The CSS gradient remains visible if canvas is unavailable.

  const motion = matchMedia('(min-width: 721px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  let width = 0, height = 0, frame = 0, lastFrame = 0, activeUntil = 0;
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
    frame = requestAnimationFrame(tick);
    if (time - lastFrame < (time < activeUntil ? 45 : 95)) return;
    const step = clamp((time - lastFrame) / 16.67, 1, 5);
    lastFrame = time;
    advance(step);
    draw(time);
  }

  function start() {
    if (frame || !motion.matches || document.hidden) return;
    lastFrame = performance.now();
    frame = requestAnimationFrame(tick);
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
  }

  function resize() {
    const spacing = clamp(Math.sqrt(innerWidth * innerHeight / 26000), 7, 14);
    width = Math.max(120, Math.ceil(innerWidth / spacing));
    height = Math.max(76, Math.ceil(innerHeight / spacing));
    canvas.width = width;
    canvas.height = height;
    draw(performance.now());
  }

  function applyMotionPreference() {
    canvas.style.display = motion.matches ? '' : 'none';
    if (motion.matches) { resize(); start(); }
    else stop();
  }

  addEventListener('pointermove', event => {
    if (!motion.matches || (event.pointerType !== 'mouse' && event.pointerType !== 'pen')) return;
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
    activeUntil = performance.now() + 3200;
    start();
  }, { passive: true });

  addEventListener('pointerout', event => {
    if (event.relatedTarget) return;
    previousX = previousY = null;
    targetX = targetY = 0;
    activeUntil = performance.now() + 2400;
  }, { passive: true });

  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 160);
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else start();
  });
  motion.addEventListener?.('change', applyMotionPreference);
  new MutationObserver(() => draw(performance.now())).observe(document.documentElement, {
    attributes: true, attributeFilter: ['data-theme']
  });

  resize();
  layer.append(canvas);
  applyMotionPreference();
})();
