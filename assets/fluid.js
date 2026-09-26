(() => {
  const layer = document.querySelector('.bgmesh');
  if (!layer) return;

  layer.querySelectorAll('.fluid-canvas,.bg-frost-veil,.flow-driver,.frost-veil').forEach(node => node.remove());

  const driver = document.createElement('div');
  driver.className = 'flow-driver';
  driver.setAttribute('aria-hidden', 'true');

  const field = document.createElement('div');
  field.className = 'flow-field';
  field.setAttribute('aria-hidden', 'true');
  driver.append(field);

  const veil = document.createElement('div');
  veil.className = 'frost-veil';
  veil.setAttribute('aria-hidden', 'true');

  layer.append(driver, veil);

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');

  let x = 0, y = 0;
  let targetX = 0, targetY = 0;
  let vx = 0, vy = 0;
  let pointerVX = 0, pointerVY = 0;
  let lastPointerX = null, lastPointerY = null;
  let raf = 0;
  let lastMove = 0;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function render() {
    const speed = Math.min(1, Math.hypot(pointerVX, pointerVY) * 8);
    const rotate = x * .7 + pointerVX * 1.4;
    const scale = 1.08 + speed * .012;
    driver.style.transform = `translate3d(${x * 7.5}vw,${y * 5.2}vh,0) rotate(${rotate}deg) scale(${scale})`;
  }

  function step() {
    raf = 0;
    if (reducedMotion.matches) {
      x = y = vx = vy = pointerVX = pointerVY = 0;
      render();
      return;
    }

    vx += (targetX - x) * .024;
    vy += (targetY - y) * .024;
    vx *= .86;
    vy *= .86;
    x += vx;
    y += vy;

    pointerVX *= .88;
    pointerVY *= .88;
    render();

    const moving = Math.abs(targetX - x) > .001 || Math.abs(targetY - y) > .001 ||
      Math.abs(vx) > .0005 || Math.abs(vy) > .0005 ||
      Math.abs(pointerVX) > .001 || Math.abs(pointerVY) > .001;

    if (moving || performance.now() - lastMove < 900) raf = requestAnimationFrame(step);
  }

  function ensureAnimation() {
    if (!raf && !document.hidden && !reducedMotion.matches) raf = requestAnimationFrame(step);
  }

  function handlePointer(event) {
    if (!finePointer.matches || reducedMotion.matches) return;
    if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;

    const nx = clamp(event.clientX / Math.max(innerWidth, 1) * 2 - 1, -1, 1);
    const ny = clamp(event.clientY / Math.max(innerHeight, 1) * 2 - 1, -1, 1);

    targetX = nx;
    targetY = ny;

    if (lastPointerX !== null) {
      pointerVX = clamp(pointerVX + (event.clientX - lastPointerX) / Math.max(innerWidth, 1) * 1.7, -.16, .16);
      pointerVY = clamp(pointerVY + (event.clientY - lastPointerY) / Math.max(innerHeight, 1) * 1.7, -.16, .16);
    }

    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    lastMove = performance.now();
    ensureAnimation();
  }

  addEventListener('pointermove', handlePointer, { passive: true });

  addEventListener('pointerleave', () => {
    lastPointerX = lastPointerY = null;
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else {
      ensureAnimation();
    }
  });

  reducedMotion.addEventListener?.('change', () => {
    if (reducedMotion.matches) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      x = y = targetX = targetY = vx = vy = pointerVX = pointerVY = 0;
      render();
    } else {
      ensureAnimation();
    }
  });

  finePointer.addEventListener?.('change', () => {
    lastPointerX = lastPointerY = null;
  });

  render();
})();