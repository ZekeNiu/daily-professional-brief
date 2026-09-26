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
  let dye, original, mapX, mapY, nextMapX, nextMapY;
  let inkA, inkB, nextInkA, nextInkB;
  let vx, vy, nextVx, nextVy, divergence, pressure, nextPressure;
  let target = null, stir = null, lastFrame = 0, frame = 0;
  let flowX = 0, flowY = 0, activeUntil = 0;

  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const colors = [
    [171, 239, 213], [99, 212, 200], [85, 178, 225],
    [126, 145, 229], [193, 170, 235]
  ];

  function createField() {
    const screenWidth = innerWidth, screenHeight = innerHeight;
    cellSize = Math.max(18, Math.sqrt(screenWidth * screenHeight / 2200));
    width = Math.ceil(screenWidth / cellSize);
    height = Math.ceil(screenHeight / cellSize);
    count = width * height;
    canvas.width = width;
    canvas.height = height;
    pixels = ctx.createImageData(width, height);
    dye = new Float32Array(count * 3);
    original = new Float32Array(count * 3);
    mapX = new Float32Array(count); mapY = new Float32Array(count);
    nextMapX = new Float32Array(count); nextMapY = new Float32Array(count);
    inkA = new Float32Array(count); inkB = new Float32Array(count);
    nextInkA = new Float32Array(count); nextInkB = new Float32Array(count);
    vx = new Float32Array(count); vy = new Float32Array(count);
    nextVx = new Float32Array(count); nextVy = new Float32Array(count);
    divergence = new Float32Array(count);
    pressure = new Float32Array(count); nextPressure = new Float32Array(count);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const u = x / width, v = y / height;
        const sweep = .024 * Math.sin(u * 3.6 + v * 2.2);
        const position = clamp(.07 + .80 * u + .08 * v + sweep, 0, .999) * (colors.length - 1);
        const left = Math.floor(position), mix = position - left;
        const haze = .11 + .035 * Math.sin(u * 3.2 - v * 2.5);
        const i = y * width + x, at = i * 3;
        mapX[i] = x; mapY[i] = y;
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
          const ribbonA = Math.exp(-(((across - .23) / .15) ** 2));
          const ribbonB = Math.exp(-(((across + .16) / .14) ** 2));
          inkA[i] = Math.min(.24, inkA[i] + ribbonA * weight * .35);
          inkB[i] = Math.min(.22, inkB[i] + ribbonB * weight * .32);
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
    for (let iteration = 0; iteration < 2; iteration++) {
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

    const recovery = 1 - Math.pow(.995, dt);
    const inkFade = Math.pow(.979, dt);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x, at = i * 3;
        const sx = clamp(x - vx[i] * dt, 0, width - 1.001);
        const sy = clamp(y - vy[i] * dt, 0, height - 1.001);
        const x0 = Math.floor(sx), y0 = Math.floor(sy);
        const a = sx - x0, b = sy - y0;
        const j = y0 * width + x0;
        const wa = (1 - a) * (1 - b), wb = a * (1 - b);
        const wc = (1 - a) * b, wd = a * b;
        nextMapX[i] = (mapX[j] * wa + mapX[j + 1] * wb + mapX[j + width] * wc + mapX[j + width + 1] * wd) * (1 - recovery) + x * recovery;
        nextMapY[i] = (mapY[j] * wa + mapY[j + 1] * wb + mapY[j + width] * wc + mapY[j + width + 1] * wd) * (1 - recovery) + y * recovery;
        nextInkA[i] = (inkA[j] * wa + inkA[j + 1] * wb + inkA[j + width] * wc + inkA[j + width + 1] * wd) * inkFade;
        nextInkB[i] = (inkB[j] * wa + inkB[j + 1] * wb + inkB[j + width] * wc + inkB[j + width + 1] * wd) * inkFade;

        const tx = clamp(nextMapX[i], 0, width - 1.001);
        const ty = clamp(nextMapY[i], 0, height - 1.001);
        const px = Math.floor(tx), py = Math.floor(ty);
        const ca = tx - px, cb = ty - py;
        const source = (py * width + px) * 3;
        const w0 = (1 - ca) * (1 - cb), w1 = ca * (1 - cb);
        const w2 = (1 - ca) * cb, w3 = ca * cb;
        const mixA = nextInkA[i], mixB = nextInkB[i];
        const clear = Math.max(0, 1 - mixA - mixB);
        for (let channel = 0; channel < 3; channel++) {
          const sourceColor = original[source + channel] * w0 + original[source + channel + 3] * w1
            + original[source + channel + width * 3] * w2 + original[source + channel + (width + 1) * 3] * w3;
          dye[at + channel] = sourceColor * clear
            + colors[1][channel] * mixA + colors[3][channel] * mixB;
        }
      }
    }
    [mapX, nextMapX] = [nextMapX, mapX];
    [mapY, nextMapY] = [nextMapY, mapY];
    [inkA, nextInkA] = [nextInkA, inkA];
    [inkB, nextInkB] = [nextInkB, inkB];
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
    if (time - lastFrame < (time < activeUntil ? 55 : 110)) return;
    const dt = lastFrame ? clamp((time - lastFrame) / 55, .5, 1.6) : 1;
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
    activeUntil = performance.now() + 2600;
  }, { passive: true });

  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(createField, 180);
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else if (!frame && canAnimate.matches) { lastFrame = 0; frame = requestAnimationFrame(tick); }
  });
  canAnimate.addEventListener?.('change', () => {
    if (!canAnimate.matches) { cancelAnimationFrame(frame); frame = 0; }
    else if (!document.hidden && !frame) { lastFrame = 0; frame = requestAnimationFrame(tick); }
  });
})();
