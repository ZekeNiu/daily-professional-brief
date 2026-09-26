(() => {
  const layer = document.querySelector('.bgmesh');
  if (!layer) return;

  layer.querySelectorAll('.fluid-canvas,.bg-frost-veil,.flow-driver,.flow-field,.frost-veil').forEach(node => node.remove());

  const field = document.createElement('div');
  field.className = 'flow-field';
  field.setAttribute('aria-hidden', 'true');

  const veil = document.createElement('div');
  veil.className = 'frost-veil';
  veil.setAttribute('aria-hidden', 'true');

  layer.append(field, veil);

  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let lastUpdate = 0;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  addEventListener('pointermove', event => {
    if (!finePointer.matches || reducedMotion.matches) return;
    if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;

    const now = performance.now();
    if (now - lastUpdate < 28) return;
    lastUpdate = now;

    const x = clamp(event.clientX / Math.max(innerWidth, 1) * 2 - 1, -1, 1);
    const y = clamp(event.clientY / Math.max(innerHeight, 1) * 2 - 1, -1, 1);
    const tx = x * 4.8;
    const ty = y * 3.4;
    const rotate = x * .45 - y * .18;

    field.style.transform = `translate3d(${tx}vw,${ty}vh,0) rotate(${rotate}deg) scale(1.055)`;
  }, { passive: true });

  addEventListener('pointerleave', () => {
    if (!reducedMotion.matches) field.style.transform = 'translate3d(0,0,0) scale(1.055)';
  }, { passive: true });
})();
