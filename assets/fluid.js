(() => {
  const layer = document.querySelector('.bgmesh');
  if (!layer) return;

  const style = document.createElement('style');
  style.id = 'background-frost-v2';
  style.textContent = `
    .bgmesh{
      background:linear-gradient(128deg,#f2f9f6 0%,#eaf6f4 46%,#edf3fa 100%) !important;
      animation:none !important;
      pointer-events:none;
      isolation:isolate;
    }
    .bgmesh:before,.bgmesh:after{
      content:"";
      position:absolute;
      border-radius:50%;
      filter:blur(116px) !important;
      opacity:.28 !important;
      will-change:transform;
      z-index:0;
    }
    .bgmesh:before{
      width:82vw;height:82vw;min-width:720px;min-height:720px;
      left:-31vw;top:-37vh;
      background:radial-gradient(circle at 52% 50%,rgba(92,205,184,.42) 0%,rgba(134,221,209,.20) 45%,transparent 73%) !important;
      animation:frostDriftA 30s ease-in-out infinite alternate !important;
    }
    .bgmesh:after{
      width:86vw;height:86vw;min-width:760px;min-height:760px;
      right:-34vw;top:-25vh;
      background:radial-gradient(circle at 48% 48%,rgba(119,181,222,.36) 0%,rgba(155,208,225,.18) 46%,transparent 74%) !important;
      animation:frostDriftB 34s ease-in-out infinite alternate !important;
    }
    .fluid-canvas{
      position:absolute;
      inset:-8%;
      width:116%;height:116%;
      z-index:1;
      display:block;
      filter:blur(34px) saturate(106%);
      transform:scale(1.04);
      opacity:.62;
      mix-blend-mode:normal;
      image-rendering:auto;
      will-change:transform;
    }
    .bg-frost-veil{
      position:absolute;
      inset:0;
      z-index:2;
      pointer-events:none;
      background:
        linear-gradient(125deg,rgba(255,255,255,.18),rgba(255,255,255,.08) 45%,rgba(246,250,253,.16)),
        radial-gradient(circle at 50% 15%,rgba(255,255,255,.22),transparent 54%);
      box-shadow:inset 0 0 140px rgba(255,255,255,.16);
    }
    html[data-theme="dark"] .bgmesh{
      background:linear-gradient(128deg,#09151a 0%,#0b2024 48%,#101c2c 100%) !important;
    }
    html[data-theme="dark"] .bgmesh:before{opacity:.22 !important;}
    html[data-theme="dark"] .bgmesh:after{opacity:.20 !important;}
    html[data-theme="dark"] .fluid-canvas{
      opacity:.32;
      filter:blur(38px) saturate(112%) brightness(.76);
      mix-blend-mode:screen;
    }
    html[data-theme="dark"] .bg-frost-veil{
      background:linear-gradient(125deg,rgba(7,16,21,.24),rgba(10,20,30,.10) 48%,rgba(7,14,26,.22));
      box-shadow:inset 0 0 150px rgba(6,16,24,.20);
    }
    @keyframes frostDriftA{
      0%{transform:translate3d(-4%,-3%,0) scale(1)}
      100%{transform:translate3d(20%,14%,0) scale(1.08)}
    }
    @keyframes frostDriftB{
      0%{transform:translate3d(4%,-4%,0) scale(1.04)}
      100%{transform:translate3d(-20%,18%,0) scale(.98)}
    }
    @media(max-width:720px){
      .fluid-canvas{display:none}
      .bgmesh:before,.bgmesh:after{filter:blur(78px) !important;opacity:.24 !important}
    }
    @media(prefers-reduced-motion:reduce){
      .bgmesh:before,.bgmesh:after{animation:none !important}
      .fluid-canvas{display:none !important}
    }
  `;
  if (!document.getElementById(style.id)) document.head.append(style);

  const canvas = document.createElement('canvas');
  canvas.className = 'fluid-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  const veil = document.createElement('div');
  veil.className = 'bg-frost-veil';
  veil.setAttribute('aria-hidden', 'true');

  layer.append(canvas, veil);
  layer.classList.add('fluid-ready');

  const motionOK = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  let width = 0, height = 0;
  let px = 0, py = 0, targetX = 0, targetY = 0;
  let vx = 0, vy = 0;
  let lastPointerX = null, lastPointerY = null;
  let impulseX = 0, impulseY = 0;
  let lastFrame = 0, raf = 0, activeUntil = 0;

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function resize() {
    const d = Math.max(7, Math.min(12, Math.sqrt(innerWidth * innerHeight / 16500)));
    width = Math.max(120, Math.ceil(innerWidth / d));
    height = Math.max(76, Math.ceil(innerHeight / d));
    canvas.width = width;
    canvas.height = height;
    draw(performance.now());
  }

  function radial(x, y, radius, inner, mid) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, inner);
    g.addColorStop(.46, mid);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }

  function draw(time) {
    const t = time * .00012;
    const dark = document.documentElement.dataset.theme === 'dark';

    const base = ctx.createLinearGradient(0, 0, width, height);
    if (dark) {
      base.addColorStop(0, '#102a2b');
      base.addColorStop(.50, '#123039');
      base.addColorStop(1, '#16263d');
    } else {
      base.addColorStop(0, '#eaf7f3');
      base.addColorStop(.50, '#e8f5f3');
      base.addColorStop(1, '#edf3fa');
    }
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    const flowX = px + impulseX;
    const flowY = py + impulseY;
    const ambientX = Math.sin(t) * .028;
    const ambientY = Math.cos(t * .83) * .024;

    const x1 = width * (.22 + flowX * .065 + ambientX);
    const y1 = height * (.30 + flowY * .055 + ambientY);
    const x2 = width * (.72 + flowX * .050 - ambientX * .7);
    const y2 = height * (.52 + flowY * .040 - ambientY * .8);
    const x3 = width * (.47 + flowX * .035 + Math.sin(t * .61) * .018);
    const y3 = height * (.82 + flowY * .045 + Math.cos(t * .72) * .016);
    const r = Math.max(width, height) * .72;

    if (dark) {
      radial(x1, y1, r, 'rgba(52,169,153,.42)', 'rgba(61,143,141,.18)');
      radial(x2, y2, r * .92, 'rgba(63,126,179,.34)', 'rgba(50,112,158,.14)');
      radial(x3, y3, r * .68, 'rgba(66,167,172,.18)', 'rgba(71,130,160,.08)');
    } else {
      radial(x1, y1, r, 'rgba(115,210,194,.48)', 'rgba(142,220,209,.20)');
      radial(x2, y2, r * .92, 'rgba(139,192,226,.40)', 'rgba(163,208,229,.18)');
      radial(x3, y3, r * .68, 'rgba(157,222,214,.26)', 'rgba(176,219,225,.10)');
    }
  }

  function advance() {
    vx += (targetX - px) * .018;
    vy += (targetY - py) * .018;
    vx *= .88;
    vy *= .88;
    px += vx;
    py += vy;
    impulseX *= .90;
    impulseY *= .90;
  }

  function tick(time) {
    raf = requestAnimationFrame(tick);
    const interval = time < activeUntil ? 44 : 92;
    if (time - lastFrame < interval) return;
    lastFrame = time;
    advance();
    draw(time);
  }

  function start() {
    if (!motionOK.matches || raf || document.hidden) return;
    lastFrame = 0;
    raf = requestAnimationFrame(tick);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  addEventListener('pointermove', event => {
    if (!motionOK.matches || (event.pointerType !== 'mouse' && event.pointerType !== 'pen')) return;
    const nx = clamp(event.clientX / Math.max(1, innerWidth) * 2 - 1, -1, 1);
    const ny = clamp(event.clientY / Math.max(1, innerHeight) * 2 - 1, -1, 1);
    targetX = nx;
    targetY = ny;

    if (lastPointerX !== null) {
      impulseX = clamp(impulseX + (event.clientX - lastPointerX) / Math.max(1, innerWidth) * .85, -.18, .18);
      impulseY = clamp(impulseY + (event.clientY - lastPointerY) / Math.max(1, innerHeight) * .85, -.18, .18);
    }
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    activeUntil = performance.now() + 2200;
    start();
  }, { passive: true });

  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 160);
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else start();
  });

  motionOK.addEventListener?.('change', () => {
    if (motionOK.matches) start(); else { stop(); draw(performance.now()); }
  });

  new MutationObserver(() => draw(performance.now())).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  });

  resize();
  start();
})();