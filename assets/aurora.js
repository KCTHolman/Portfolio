/* ==========================================================================
   Aurora backdrop.

   Injects the decorative wash into .kh-shell and a row of preset swatches
   into the footer, then drives both by writing CSS custom properties on
   <html>. Everything a preset changes is a variable read by assets/aurora.css,
   so this file never touches layout.

   A preset is not just colour: each one also carries its own geometry —
   swirl strength, brushstroke detail, softness and flow speed — so "Inkt"
   is slow and near-still where "Onweer" churns. Preset 0 is the living one:
   its hue walks, and every other value stays put.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var mount = document.querySelector('.kh-shell') || document.body;

  // geo: scale = swirl strength, freq = brushstroke detail,
  //      soft = blur multiplier, speed = flow speed.
  var PRESETS = [
    { name: 'Levend', auto: true,
      geo: { scale: 20, freq: 0.014, soft: 1.3, speed: 0.5 } },

    { name: 'Aurora',
      geo: { scale: 12, freq: 0.010, soft: 1.5, speed: 0.40 },
      cols: ['hsla(168,94%,58%,0.72)', 'hsla(152,92%,56%,0.66)', 'hsla(272,90%,58%,0.58)', 'hsla(212,94%,60%,0.60)', 'hsla(174,92%,56%,0.62)'],
      tcols: ['#fde047', '#2dd4bf', '#7de0d2'] },

    { name: 'Zonsondergang',
      geo: { scale: 34, freq: 0.020, soft: 1.1, speed: 0.55 },
      cols: ['hsla(330,96%,62%,0.72)', 'hsla(25,96%,58%,0.70)', 'hsla(350,92%,58%,0.62)', 'hsla(45,96%,60%,0.62)', 'hsla(0,92%,64%,0.64)'],
      tcols: ['#fbbf24', '#fb7185', '#f472b6'] },

    { name: 'Nevel',
      geo: { scale: 8, freq: 0.008, soft: 1.8, speed: 0.30 },
      cols: ['hsla(258,94%,64%,0.70)', 'hsla(220,92%,60%,0.64)', 'hsla(320,90%,62%,0.58)', 'hsla(240,92%,62%,0.60)', 'hsla(280,92%,66%,0.62)'],
      tcols: ['#a78bfa', '#60a5fa', '#f0abfc'] },

    { name: 'Weelde',
      geo: { scale: 24, freq: 0.016, soft: 1.25, speed: 0.45 },
      cols: ['hsla(158,94%,50%,0.70)', 'hsla(172,92%,54%,0.64)', 'hsla(88,90%,52%,0.60)', 'hsla(52,94%,58%,0.58)', 'hsla(140,92%,52%,0.62)'],
      tcols: ['#fde047', '#34d399', '#a3e635'] },

    { name: 'Sintel',
      geo: { scale: 52, freq: 0.030, soft: 0.9, speed: 0.70 },
      cols: ['hsla(22,98%,58%,0.74)', 'hsla(0,94%,56%,0.66)', 'hsla(300,88%,56%,0.54)', 'hsla(38,96%,62%,0.62)', 'hsla(14,94%,54%,0.66)'],
      tcols: ['#fdba74', '#fb923c', '#f43f5e'] },

    { name: 'IJs',
      geo: { scale: 4, freq: 0.006, soft: 1.6, speed: 0.25 },
      cols: ['hsla(196,96%,64%,0.68)', 'hsla(228,92%,68%,0.60)', 'hsla(186,88%,74%,0.50)', 'hsla(204,96%,58%,0.62)', 'hsla(214,92%,70%,0.58)'],
      tcols: ['#bae6fd', '#7dd3fc', '#c7d2fe'] },

    { name: 'Citrus',
      geo: { scale: 28, freq: 0.024, soft: 1.0, speed: 0.90 },
      cols: ['hsla(52,98%,60%,0.72)', 'hsla(82,94%,56%,0.64)', 'hsla(172,92%,52%,0.60)', 'hsla(32,96%,60%,0.60)', 'hsla(68,94%,58%,0.62)'],
      tcols: ['#fde047', '#a3e635', '#5eead4'] },

    { name: 'Inkt',
      geo: { scale: 6, freq: 0.007, soft: 1.9, speed: 0.20 },
      cols: ['hsla(226,92%,46%,0.70)', 'hsla(248,90%,52%,0.62)', 'hsla(206,94%,50%,0.56)', 'hsla(266,88%,48%,0.56)', 'hsla(216,92%,44%,0.60)'],
      tcols: ['#93c5fd', '#818cf8', '#a5b4fc'] },

    { name: 'Koraal',
      geo: { scale: 18, freq: 0.013, soft: 1.35, speed: 0.50 },
      cols: ['hsla(6,96%,66%,0.70)', 'hsla(340,94%,66%,0.64)', 'hsla(28,94%,64%,0.60)', 'hsla(316,88%,68%,0.56)', 'hsla(352,94%,62%,0.62)'],
      tcols: ['#fecaca', '#fb7185', '#fda4af'] },

    { name: 'Onweer',
      geo: { scale: 64, freq: 0.035, soft: 0.8, speed: 0.85 },
      cols: ['hsla(210,88%,52%,0.70)', 'hsla(262,84%,54%,0.62)', 'hsla(160,84%,48%,0.56)', 'hsla(196,88%,56%,0.58)', 'hsla(232,86%,50%,0.62)'],
      tcols: ['#a5f3fc', '#c4b5fd', '#67e8f9'] }
  ];

  var BASE = PRESETS[0].geo;
  var HUE_START = 222;
  var HUE_PER_SEC = 9;

  // Hue offsets per blob at full bloom for the living preset. Wide, uneven
  // steps — a near-complement and a violet jump — so it keeps landing on
  // combinations you did not see coming.
  var HUE_STEPS = [0, 72, 186, 276, 138];
  var SATS = [96, 94, 92, 96, 94];
  var LIGHTS = [58, 56, 56, 58, 56];
  var ALPHAS = [0.72, 0.68, 0.62, 0.62, 0.64];

  // The intro: the page opens near-black and blue, then blooms.
  var RAMP_SEC = 16;
  var DIM = { sat: 38, light: 24, alpha: 0.16, paint: 0.34 };
  var FULL_PAINT = 0.62;

  var state = { preset: 0 };

  var t0 = Date.now();
  var raf = null;
  var lastPaint = 0;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function current() { return PRESETS[state.preset] || PRESETS[0]; }
  function isLiving() { return !!current().auto; }

  function hsla(h, s, l, a) {
    // One decimal is well below what the eye resolves, and keeps the string
    // short — this runs eight times a frame.
    var deg = Math.round((((h % 360) + 360) % 360) * 10) / 10;
    return 'hsla(' + deg + ',' + s + '%,' + l + '%,' + a + ')';
  }

  function elapsed() { return (Date.now() - t0) / 1000; }
  function hueNow() { return (HUE_START + elapsed() * HUE_PER_SEC) % 360; }

  // 0 at load, 1 once the wash has fully bloomed. Reduced motion never sees
  // the loop, so it gets the finished state straight away rather than being
  // left on the opening frame forever.
  function bloom() {
    if (reduceMotion.matches) return 1;
    var t = Math.min(1, elapsed() / RAMP_SEC);
    return t * t * (3 - 2 * t);
  }

  /* ---------- session ----------------------------------------------------- */

  // The backdrop carries over between pages: same preset, and — because t0
  // travels along — the same point in the hue walk and the same bloom.
  var STORE_KEY = 'kh-aurora';

  function saveSession() {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify({ preset: state.preset, t0: t0 }));
    } catch (e) {
      // Private mode or a full quota: the backdrop just starts fresh.
    }
  }

  function restoreSession() {
    var saved;
    try {
      saved = JSON.parse(sessionStorage.getItem(STORE_KEY));
    } catch (e) {
      return;
    }
    if (!saved || typeof saved !== 'object') return;

    var i = parseInt(saved.preset, 10);
    // Clamped: a stored index outlives a preset being removed.
    if (isFinite(i)) state.preset = Math.min(PRESETS.length - 1, Math.max(0, i));

    var when = Number(saved.t0);
    if (isFinite(when) && when > 0 && when <= Date.now()) t0 = when;
  }

  /* ---------- markup ------------------------------------------------------ */

  var stage = document.createElement('div');
  stage.setAttribute('aria-hidden', 'true');
  stage.innerHTML =
    '<svg class="aur-defs" aria-hidden="true" focusable="false">' +
      '<filter id="kh-paint">' +
        '<feTurbulence type="fractalNoise" baseFrequency="0.0140 0.0189" numOctaves="3" seed="7" result="n"></feTurbulence>' +
        '<feDisplacementMap in="SourceGraphic" in2="n" scale="20.0" xChannelSelector="R" yChannelSelector="G"></feDisplacementMap>' +
      '</filter>' +
      '<filter id="kh-grain">' +
        '<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2"></feTurbulence>' +
      '</filter>' +
    '</svg>' +
    '<div class="aur-stage">' +
      '<div class="aur-paint">' +
        '<div class="aur-blob aur-blob--1"></div>' +
        '<div class="aur-blob aur-blob--2"></div>' +
        '<div class="aur-blob aur-blob--3"></div>' +
        '<div class="aur-blob aur-blob--4"></div>' +
        '<div class="aur-blob aur-blob--5"></div>' +
        '<div class="aur-blob aur-blob--6"></div>' +
      '</div>' +
      '<svg class="aur-grain" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
        '<rect width="100%" height="100%" filter="url(#kh-grain)"></rect>' +
      '</svg>' +
      '<div class="aur-vignette"></div>' +
    '</div>';

  mount.insertBefore(stage, mount.firstChild);

  var turbulence = stage.querySelector('#kh-paint feTurbulence');
  var displacement = stage.querySelector('#kh-paint feDisplacementMap');

  // The living preset's swatch rides the accent variables, so it shifts along
  // with the wash instead of sitting there as a dead thumbnail.
  function swatchBackground(p) {
    if (p.auto) return 'linear-gradient(120deg, var(--t1), var(--t2) 45%, var(--t3))';
    return 'linear-gradient(120deg,' + p.cols[0] + ',' + p.cols[3] + ' 45%,' + p.cols[2] + ')';
  }

  var swatches = [];
  var footer = document.querySelector('.kh-footer-inner');

  if (footer) {
    var row = document.createElement('div');
    row.className = 'aur-presets';
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', 'Achtergrond');
    row.innerHTML = PRESETS.map(function (p, i) {
      return '<button type="button" class="aur-preset" data-preset="' + i + '" ' +
        'aria-pressed="false" title="' + p.name + '" aria-label="Achtergrond ' + p.name + '" ' +
        'style="background:' + swatchBackground(p) + '"></button>';
    }).join('');

    // Between the two footer lines, so it reads as part of the footer rather
    // than as something bolted onto the end of it.
    footer.insertBefore(row, footer.lastElementChild);
    swatches = Array.prototype.slice.call(row.querySelectorAll('[data-preset]'));
  }

  /* ---------- painting ---------------------------------------------------- */

  // Runs every frame while the living preset is on, so it stays limited to the
  // eight colour variables — nothing here forces layout.
  function paintColors() {
    var cols, tcols;

    if (isLiving()) {
      var h = hueNow();
      var b = bloom();
      var mix = function (from, to) { return from + (to - from) * b; };

      // Hue offsets scale with the bloom too, so the blobs start stacked on
      // one blue and only drift apart as the colour comes up.
      cols = HUE_STEPS.map(function (step, i) {
        return hsla(h + step * b, mix(DIM.sat, SATS[i]), mix(DIM.light, LIGHTS[i]), mix(DIM.alpha, ALPHAS[i]));
      });
      tcols = [
        hsla(h, mix(70, 96), mix(62, 76), 1),
        hsla(h + 72 * b, mix(66, 92), mix(56, 68), 1),
        hsla(h + 186 * b, mix(68, 94), mix(64, 76), 1)
      ];
      root.style.setProperty('--aur-paint-op', mix(DIM.paint, FULL_PAINT).toFixed(3));
    } else {
      cols = current().cols;
      tcols = current().tcols;
      root.style.setProperty('--aur-paint-op', String(FULL_PAINT));
    }

    for (var i = 0; i < cols.length; i++) root.style.setProperty('--c' + (i + 1), cols[i]);
    for (var j = 0; j < tcols.length; j++) root.style.setProperty('--t' + (j + 1), tcols[j]);
  }

  // Geometry only changes when the preset changes.
  function paintGeometry() {
    var geo = current().geo || BASE;
    root.style.setProperty('--soft', geo.soft.toFixed(3));
    root.style.setProperty('--speed', geo.speed.toFixed(3));
    turbulence.setAttribute('baseFrequency', geo.freq.toFixed(4) + ' ' + (geo.freq * 1.35).toFixed(4));
    displacement.setAttribute('scale', geo.scale.toFixed(1));
  }

  function syncSwatches() {
    swatches.forEach(function (btn, i) {
      btn.setAttribute('aria-pressed', String(state.preset === i));
    });
  }

  function render() {
    paintColors();
    paintGeometry();
    syncSwatches();
  }

  /* ---------- animation loop ---------------------------------------------- */

  function loop(now) {
    // ~30fps is plenty for a 9 deg/sec hue walk and halves the wake-ups.
    if (now - lastPaint >= 33) {
      lastPaint = now;
      paintColors();
    }
    raf = requestAnimationFrame(loop);
  }

  function shouldAnimate() {
    return isLiving() && !reduceMotion.matches && document.visibilityState !== 'hidden';
  }

  function syncLoop() {
    if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
    if (shouldAnimate()) raf = requestAnimationFrame(loop);
  }

  /* ---------- interaction -------------------------------------------------- */

  swatches.forEach(function (btn, i) {
    btn.addEventListener('click', function () {
      state.preset = i;
      render();
      syncLoop();
      saveSession();
    });
  });

  document.addEventListener('visibilitychange', syncLoop);

  var onMotionChange = function () { render(); syncLoop(); };
  if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', onMotionChange);
  else if (reduceMotion.addListener) reduceMotion.addListener(onMotionChange);

  restoreSession();
  render();
  syncLoop();
  saveSession();
})();
