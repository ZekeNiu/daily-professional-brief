(() => {
  const layer = document.querySelector('.bgmesh');
  const canAnimate = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  if (!layer || !canAnimate.matches) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'fluid-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  let width, height, cellSize, count, pixels;
  let dye, nextDye, original, vx, vy, nextVx, nextVy, divergence, pressure, nextPressure;
  let target = null, stir = null, lastFrame = 0, frame = 0;
  let flowX = 0, flowY = 0;

  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const colors = [
    [80, 221, 171], [33, 198, 195], [47, 155, 228],
    [94, 119, 229], [182, 120, 229]
  ];

  function createField() {
    const screenWidth = innerWidth, screenHeight = innerHeight;
    cellSize = Math.max(12, Math.sqrt(screenWidth * screenHeight / 5000));
    width = Math.ceil(screenWidth / cellSize);
    height = Math.ceil(screenHeight / cellSize);
    count = width * height;
    canvas.width = width;
    canvas.height = height;
    pixels = ctx.createImageData(width, height);
    dye = new Float32Array(count * 3);
    nextDye = new Float32Array(count * 3);
    original = new Float32Array(count * 3);
    vx = new Float32Array(count); vy = new Float32Array(count);
    nextVx = new Float32Array(count); nextVy = new Float32Array(count);
    divergence = new Float32Array(count);
    pressure = new Float32Array(count); nextPressure = new Float32Array(count);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const u = x / width, v = y / height;
        const folds = .23 * Math.sin(v * 27.2 + 1.9 * Math.sin(u * 8.8))
          + .10 * Math.sin(u * 15.7 - v * 18.4)
          + .04 * Math.cos(v * 39 - u * 15);
        const position = clamp(.08 + .74 * u + .10 * v + folds, 0, .999) * (colors.length - 1);
        const left = Math.floor(position), mix = position - left;
        const vein = .5 + .5 * Math.cos(v * 28.1 - u * 9.7 + Math.sin(u * 11.4) * 1.4);
        const haze = .06 + .30 * vein ** 8;
        const at = (y * width + x) * 3;
        for (let channel = 0; channel < 3; channel++) {
          const pigment = colors[left][channel] * (1 - mix) + colors[left + 1][channel] * mix;
          original[at + channel] = dye[at + channel] = pigment * (1 - haze) + 246 * haze;
        }
      }
    }
    target = null; stir = null; flowX = 0; flowY = 0;
    render();
  }

  function stirPaint() {
    if (!target || !stir) return;
    const fromX = stir.x, fromY = stir.y;
    stir.x += (target.x - stir.x) * .13;
    stir.y += (target.y - stir.y) * .13;
    const rawX = stir.x - fromX, rawY = stir.y - fromY;
    const length = Math.hypot(rawX, rawY);
    if (length < .012) return;

    const dx = clamp(rawX, -7, 7), dy = clamp(rawY, -7, 7);
    const radius = Math.min(width, height) * .30;
    const steps = Math.min(10, Math.max(1, Math.ceil(length / (radius * .22))));
    const spin = (dx + dy * .55 >= 0 ? 1 : -1) * Math.min(.075, length * .014);
    const directionLength = Math.hypot(dx, dy) || 1;
    const normalX = -dy / directionLength, normalY = dx / directionLength;
    flowX = clamp(flowX + dx * .02, -.55, .55);
    flowY = clamp(flowY + dy * .02, -.55, .55);

    for (let step = 1; step <= steps; step++) {
      const mx = fromX + rawX * step / steps;
      const my = fromY + rawY * step / steps;
      const x0 = Math.max(0, Math.floor(mx - radius));
      const x1 = Math.min(width - 1, Math.ceil(mx + radius));
      const y0 = Math.max(0, Math.floor(my - radius));
      const y1 = Math.min(height - 1, Math.ceil(my + radius));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const ox = x - mx, oy = y - my;
          const distance = (ox * ox + oy * oy) / (radius * radius);
          if (distance >= 1) continue;
          const weight = (1 - distance) ** 2 * .65 / steps;
          const i = y * width + x;
          vx[i] += (dx * .40 - oy * spin) * weight;
          vy[i] += (dy * .40 + ox * spin) * weight;
          const across = (ox * normalX + oy * normalY) / radius;
          const ribbonA = Math.exp(-(((across - .23) / .08) ** 2));
          const ribbonB = Math.exp(-(((across + .16) / .07) ** 2));
          const inkA = Math.min(.11, ribbonA * weight * .43);
          const inkB = Math.min(.09, ribbonB * weight * .39);
          const at = i * 3;
          for (let channel = 0; channel < 3; channel++) {
            dye[at + channel] = dye[at + channel] * (1 - inkA - inkB)
              + colors[1][channel] * inkA + colors[3][channel] * inkB;
          }
        }
      }
    }
  }

  function advance(dt, time) {
    stirPaint();
    const damping = Math.pow(.982, dt);
    flowX *= Math.pow(.965, dt); flowY *= Math.pow(.965, dt);

    // Move the velocity field before carrying the colors through it.
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const sx = clamp(x - vx[i] * dt, 0, width - 1.001);
        const sy = clamp(y - vy[i] * dt, 0, height - 1.001);
        const x0 = Math.floor(sx), y0 = Math.floor(sy);
        const a = sx - x0, b = sy - y0;
        const j = y0 * width + x0;
        const wa = (1 - a) * (1 - b), wb = a * (1 - b);
        const wc = (1 - a) * b, wd = a * b;
        const u = x / width, v = y / height;
        const ambientX = .016 * Math.sin(v * 9 + time * .00019);
        const ambientY = .014 * Math.cos(u * 10 - time * .00017);
        nextVx[i] = (vx[j] * wa + vx[j + 1] * wb + vx[j + width] * wc + vx[j + width + 1] * wd) * damping
          + ambientX + flowX * (.06 + .05 * Math.sin(v * 5 + u * 4));
        nextVy[i] = (vy[j] * wa + vy[j + 1] * wb + vy[j + width] * wc + vy[j + width + 1] * wd) * damping
          + ambientY + flowY * (.06 + .05 * Math.cos(u * 5 - v * 4));
      }
    }
    [vx, nextVx] = [nextVx, vx];
    [vy, nextVy] = [nextVy, vy];

    // Keep the paint close to incompressible so strokes curl rather than shrink.
    pressure.fill(0);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = y * width + x;
        divergence[i] = (vx[i + 1] - vx[i - 1] + vy[i + width] - vy[i - width]) * .5;
      }
    }
    for (let iteration = 0; iteration < 4; iteration++) {
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const i = y * width + x;
          nextPressure[i] = (pressure[i - 1] + pressure[i + 1]
            + pressure[i - width] + pressure[i + width] - divergence[i]) * .25;
        }
      }
      [pressure, nextPressure] = [nextPressure, pressure];
    }
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = y * width + x;
        vx[i] -= (pressure[i + 1] - pressure[i - 1]) * .5;
        vy[i] -= (pressure[i + width] - pressure[i - width]) * .5;
      }
    }

    const recovery = 1 - Math.pow(.997, dt);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x, at = i * 3;
        const sx = clamp(x - vx[i] * dt, 0, width - 1.001);
        const sy = clamp(y - vy[i] * dt, 0, height - 1.001);
        const x0 = Math.floor(sx), y0 = Math.floor(sy);
        const a = sx - x0, b = sy - y0;
        const j = (y0 * width + x0) * 3;
        const wa = (1 - a) * (1 - b), wb = a * (1 - b);
        const wc = (1 - a) * b, wd = a * b;
        for (let channel = 0; channel < 3; channel++) {
          const pigment = dye[j + channel] * wa + dye[j + channel + 3] * wb
            + dye[j + channel + width * 3] * wc + dye[j + channel + (width + 1) * 3] * wd;
          nextDye[at + channel] = pigment * (1 - recovery)
            + original[at + channel] * recovery;
        }
      }
    }
    [dye, nextDye] = [nextDye, dye];
  }

  function render() {
    const data = pixels.data;
    for (let i = 0; i < count; i++) {
      const pigment = i * 3, pixel = i * 4;
      data[pixel] = dye[pigment];
      data[pixel + 1] = dye[pigment + 1];
      data[pixel + 2] = dye[pigment + 2];
      data[pixel + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
  }

  function tick(time) {
    frame = requestAnimationFrame(tick);
    if (time - lastFrame < 45) return;
    const dt = lastFrame ? clamp((time - lastFrame) / 48, .5, 1.5) : 1;
    lastFrame = time;
    advance(dt, time);
    render();
  }

  createField();
  layer.append(canvas);
  layer.classList.add('fluid-ready');
  frame = requestAnimationFrame(tick);

  addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    const x = event.clientX / innerWidth * (width - 1);
    const y = event.clientY / innerHeight * (height - 1);
    target = { x, y };
    if (!stir) stir = { x, y };
  }, { passive: true });

  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(createField, 180);
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else if (!frame) { lastFrame = 0; frame = requestAnimationFrame(tick); }
  });
})();
