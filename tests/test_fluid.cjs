const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function scene(source, { motion = true, available = true, hidden = false } = {}) {
  let now = 0, next = 0, draws = 0, contexts = 0;
  const jobs = new Map(), events = new Map(), documentEvents = new Map();
  const gradient = { addColorStop() {} };
  const ctx = { createLinearGradient() { draws++; return gradient; }, createRadialGradient() { return gradient; }, fillRect() {} };
  const canvas = { style: {}, setAttribute() {}, getContext() { contexts++; return available ? ctx : null; } };
  const media = { matches: motion, addEventListener(_, fn) { this.change = fn; } };
  const document = { hidden, documentElement: { dataset: {} }, querySelector: () => ({ append() {} }), createElement: () => canvas, addEventListener: (name, fn) => documentEvents.set(name, fn) };
  const queue = (fn, delay) => { const id = ++next; jobs.set(id, { at: now + delay, fn }); return id; };
  const sandbox = {
    document, innerWidth: 1440, innerHeight: 1100, matchMedia: () => media,
    addEventListener: (name, fn) => events.set(name, fn),
    performance: { now: () => now },
    requestAnimationFrame: fn => queue(() => fn(now), 16), cancelAnimationFrame: id => jobs.delete(id),
    setTimeout: (fn, delay) => queue(fn, delay), clearTimeout: id => jobs.delete(id),
    MutationObserver: class { constructor(fn) { sandbox.themeChange = fn; } observe() {} }
  };
  vm.runInNewContext(source, sandbox);
  return {
    sandbox, document, canvas, media,
    get draws() { return draws; }, get contexts() { return contexts; }, get pending() { return jobs.size; },
    emit: (name, event) => events.get(name)?.(event),
    visibility(value) { document.hidden = value; documentEvents.get('visibilitychange')(); },
    run(ms) {
      const until = now + ms;
      let iterations = 0;
      while (jobs.size) {
        const [id, job] = [...jobs].sort((a, b) => a[1].at - b[1].at)[0];
        if (job.at > until) break;
        assert.ok(++iterations < 10000, 'scheduler must make progress');
        now = job.at; jobs.delete(id); job.fn();
      }
      now = until;
    }
  };
}

const source = fs.readFileSync(require.resolve('../assets/fluid.js'), 'utf8');
const mouse = (x, y) => ({ pointerType: 'mouse', clientX: x, clientY: y });

test('first paint has no idle work, including after a minute of reading', () => {
  const s = scene(source), initial = s.draws;
  s.run(60000);
  assert.equal(s.draws, initial); assert.equal(s.pending, 0);
  assert.ok(s.canvas.width * s.canvas.height < 24500);
});
test('pointer wakes global flow, inertia settles, and a new gesture wakes it again', () => {
  const s = scene(source), initial = s.draws;
  s.emit('pointermove', mouse(1400, 90)); s.run(1200);
  assert.ok(s.draws > initial); s.run(6800); assert.equal(s.pending, 0);
  const settled = s.draws; s.run(60000); assert.equal(s.draws, settled);
  s.emit('pointermove', mouse(20, 980)); s.run(200); assert.ok(s.draws > settled);
  s.emit('pointerout', { relatedTarget: null }); s.run(8000); assert.equal(s.pending, 0);
});
test('drawing rate stays bounded during sustained pointer input', () => {
  const s = scene(source), initial = s.draws;
  for (let i = 0; i < 100; i++) { s.emit('pointermove', mouse(i * 14, 500)); s.run(10); }
  assert.ok(s.draws - initial <= 26);
});
test('hidden pages stop all animation scheduling and resume without a time jump', () => {
  const s = scene(source); s.emit('pointermove', mouse(1200, 100)); s.run(160);
  s.visibility(true); const hiddenDraws = s.draws;
  s.run(60000); assert.equal(s.draws, hiddenDraws); assert.equal(s.pending, 0);
  s.visibility(false); s.run(8000); assert.equal(s.pending, 0);
});
test('touch/reduced-motion mode allocates no drawing context and can change at runtime', () => {
  const s = scene(source, { motion: false });
  s.emit('pointermove', mouse(1200, 100)); s.emit('resize'); s.run(1000);
  assert.equal(s.contexts, 0); assert.equal(s.draws, 0); assert.equal(s.pending, 0);
  s.media.matches = true; s.media.change(); assert.equal(s.contexts, 1);
  s.emit('pointermove', mouse(1200, 100)); s.run(100);
  s.media.matches = false; s.media.change(); s.run(1000); assert.equal(s.pending, 0);
});
test('unsupported canvas keeps the CSS fallback without throwing or polling', () => {
  const s = scene(source, { available: false });
  s.emit('pointermove', mouse(1200, 100)); s.run(8000);
  assert.equal(s.draws, 0); assert.equal(s.pending, 0);
});
test('resize and theme change repaint once without starting an idle loop', () => {
  const s = scene(source), before = s.draws;
  s.sandbox.innerWidth = 3840; s.sandbox.innerHeight = 2160;
  for (let i = 0; i < 20; i++) s.emit('resize');
  s.run(200); assert.equal(s.draws, before + 1);
  assert.ok(s.canvas.width * s.canvas.height < 24500);
  s.sandbox.themeChange(); assert.equal(s.draws, before + 2); assert.equal(s.pending, 0);
});
