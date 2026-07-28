/* ==========================================================================
   Aurora backdrop.

   Injects the decorative wash into .kh-shell and a row of preset swatches
   into the footer, then drives both by writing CSS custom properties on
   <html>. Everything a preset changes is a variable read by assets/aurora.css,
   so this file never touches layout.

   A preset is three things: colour, geometry (swirl, brushstroke, softness,
   flow) and a drift — a slow hue-and-light sway with its own amplitude and
   period, so nothing ever stands completely still and no two presets breathe
   alike. Preset 0 is the living one: instead of swaying, its hue walks.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var mount = document.querySelector('.kh-shell') || document.body;

  // cols: five blobs as [hue, saturation, lightness, alpha].
  // tcols: three accents as [hue, saturation, lightness].
  // geo:  scale = swirl strength, freq = brushstroke detail,
  //       soft = blur multiplier, speed = flow speed.
  // drift: amp = degrees of hue sway, period = seconds for a full sway.
  var PRESETS = [
    { name: 'Levend', auto: true,
      geo: { scale: 20, freq: 0.014, soft: 1.3, speed: 0.5 } },

    { name: 'Aurora',
      geo: { scale: 12, freq: 0.010, soft: 1.5, speed: 0.40 },
      drift: { amp: 10, period: 70 },
      cols: [[168, 94, 58, 0.72], [152, 92, 56, 0.66], [272, 90, 58, 0.58], [212, 94, 60, 0.60], [174, 92, 56, 0.62]],
      tcols: [[50, 98, 64], [172, 66, 50], [172, 62, 68]] },

    { name: 'Zonsondergang',
      geo: { scale: 34, freq: 0.020, soft: 1.1, speed: 0.55 },
      drift: { amp: 14, period: 55 },
      cols: [[330, 96, 62, 0.72], [25, 96, 58, 0.70], [350, 92, 58, 0.62], [45, 96, 60, 0.62], [0, 92, 64, 0.64]],
      tcols: [[43, 96, 56], [353, 95, 71], [330, 86, 70]] },

    { name: 'Nevel',
      geo: { scale: 8, freq: 0.008, soft: 1.8, speed: 0.30 },
      drift: { amp: 18, period: 95 },
      cols: [[258, 94, 64, 0.70], [220, 92, 60, 0.64], [320, 90, 62, 0.58], [240, 92, 62, 0.60], [280, 92, 66, 0.62]],
      tcols: [[255, 92, 76], [213, 94, 68], [292, 91, 83]] },

    { name: 'Weelde',
      geo: { scale: 24, freq: 0.016, soft: 1.25, speed: 0.45 },
      drift: { amp: 8, period: 60 },
      cols: [[158, 94, 50, 0.70], [172, 92, 54, 0.64], [88, 90, 52, 0.60], [52, 94, 58, 0.58], [140, 92, 52, 0.62]],
      tcols: [[50, 98, 64], [160, 64, 52], [82, 78, 55]] },

    { name: 'Sintel',
      geo: { scale: 52, freq: 0.030, soft: 0.9, speed: 0.70 },
      drift: { amp: 12, period: 45 },
      cols: [[22, 98, 58, 0.74], [0, 94, 56, 0.66], [300, 88, 56, 0.54], [38, 96, 62, 0.62], [14, 94, 54, 0.66]],
      tcols: [[27, 97, 72], [27, 96, 61], [350, 89, 60]] },

    { name: 'IJs',
      geo: { scale: 4, freq: 0.006, soft: 1.6, speed: 0.25 },
      drift: { amp: 6, period: 120 },
      cols: [[196, 96, 64, 0.68], [228, 92, 68, 0.60], [186, 88, 74, 0.50], [204, 96, 58, 0.62], [214, 92, 70, 0.58]],
      tcols: [[201, 94, 86], [199, 95, 74], [226, 96, 89]] },

    { name: 'Citrus',
      geo: { scale: 28, freq: 0.024, soft: 1.0, speed: 0.90 },
      drift: { amp: 16, period: 38 },
      cols: [[52, 98, 60, 0.72], [82, 94, 56, 0.64], [172, 92, 52, 0.60], [32, 96, 60, 0.60], [68, 94, 58, 0.62]],
      tcols: [[50, 98, 64], [82, 78, 55], [168, 76, 64]] },

    { name: 'Inkt',
      geo: { scale: 6, freq: 0.007, soft: 1.9, speed: 0.20 },
      drift: { amp: 5, period: 140 },
      cols: [[226, 92, 46, 0.70], [248, 90, 52, 0.62], [206, 94, 50, 0.56], [266, 88, 48, 0.56], [216, 92, 44, 0.60]],
      tcols: [[213, 97, 79], [234, 89, 74], [229, 94, 82]] },

    { name: 'Koraal',
      geo: { scale: 18, freq: 0.013, soft: 1.35, speed: 0.50 },
      drift: { amp: 11, period: 65 },
      cols: [[6, 96, 66, 0.70], [340, 94, 66, 0.64], [28, 94, 64, 0.60], [316, 88, 68, 0.56], [352, 94, 62, 0.62]],
      tcols: [[0, 96, 89], [353, 95, 71], [353, 96, 82]] },

    { name: 'Onweer',
      geo: { scale: 64, freq: 0.035, soft: 0.8, speed: 0.85 },
      drift: { amp: 20, period: 30 },
      cols: [[210, 88, 52, 0.70], [262, 84, 54, 0.62], [160, 84, 48, 0.56], [196, 88, 56, 0.58], [232, 86, 50, 0.62]],
      tcols: [[186, 94, 82], [253, 95, 85], [187, 92, 69]] }
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
    return 'hsla(' + deg + ',' + Math.round(s * 10) / 10 + '%,' + Math.round(l * 10) / 10 + '%,' + a + ')';
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
  // travels along — the same point in the walk, sway and bloom.
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

  // Every swatch rides the live accent variables of its own preset, so the
  // row keeps swaying along instead of being a wall of dead thumbnails.
  function swatchBackground(p, i) {
    if (p.auto) return 'linear-gradient(120deg, var(--t1), var(--t2) 45%, var(--t3))';
    var c = p.cols;
    return 'linear-gradient(120deg,' + hsla(c[0][0], c[0][1], c[0][2], 1) +
      ',' + hsla(c[3][0], c[3][1], c[3][2], 1) + ' 45%,' + hsla(c[2][0], c[2][1], c[2][2], 1) + ')';
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
        'style="background:' + swatchBackground(p, i) + '"></button>';
    }).join('');

    // Between the two footer lines, so it reads as part of the footer rather
    // than as something bolted onto the end of it.
    footer.insertBefore(row, footer.lastElementChild);
    swatches = Array.prototype.slice.call(row.querySelectorAll('[data-preset]'));
  }

  /* ---------- painting ---------------------------------------------------- */

  // Runs on the loop, so it stays limited to the eight colour variables —
  // nothing here forces layout.
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
      var p = current();
      var d = p.drift || { amp: 8, period: 80 };
      var phase = (2 * Math.PI * elapsed()) / d.period;

      // Each blob sits a little further along the same sway, so the palette
      // breathes instead of sliding as one block.
      var amp = d.amp * 1.8;
      cols = p.cols.map(function (c, i) {
        var local = phase + i * 0.6;
        return hsla(
          c[0] + Math.sin(local) * amp,
          c[1],
          c[2] + Math.sin(local * 0.7) * 5,
          Math.max(0.2, Math.min(0.85, c[3] + Math.sin(local * 1.3) * 0.06))
        );
      });
      tcols = p.tcols.map(function (c, i) {
        var local = phase + i * 0.9;
        return hsla(c[0] + Math.sin(local) * amp * 0.6, c[1], c[2], 1);
      });
      root.style.setProperty('--aur-paint-op', String(FULL_PAINT));
    }

    for (var i = 0; i < cols.length; i++) root.style.setProperty('--c' + (i + 1), cols[i]);
    for (var j = 0; j < tcols.length; j++) root.style.setProperty('--t' + (j + 1), tcols[j]);
  }

  // Geometry breathes too, not just colour: the swirl, the brushstroke and the
  // softness each ride their own multiple of the preset's period, so they never
  // move in lockstep and the wash keeps changing shape as well as hue.
  var GEO_SWAY = { scale: 0.5, freq: 0.38, soft: 0.16 };
  var lastGeo = { scale: null, freq: null, soft: null };

  function geoNow() {
    var p = current();
    var base = p.geo || BASE;
    var period = (p.drift && p.drift.period) || 60;
    var t = elapsed();
    var wave = function (mult, phase) { return Math.sin((2 * Math.PI * t) / (period * mult) + phase); };

    return {
      scale: Math.max(0, base.scale * (1 + GEO_SWAY.scale * wave(1.7, 0))),
      freq: Math.max(0.001, base.freq * (1 + GEO_SWAY.freq * wave(2.3, 1.1))),
      soft: Math.max(0.2, base.soft * (1 + GEO_SWAY.soft * wave(3.1, 2.2))),
      speed: base.speed
    };
  }

  function paintGeometry() {
    var geo = reduceMotion.matches ? (current().geo || BASE) : geoNow();

    var soft = geo.soft.toFixed(3);
    var freq = geo.freq.toFixed(4);
    var scale = geo.scale.toFixed(1);

    // Rewriting a filter forces the whole wash to re-rasterise, so only touch
    // it when the rounded value actually moved.
    if (soft !== lastGeo.soft) { root.style.setProperty('--soft', soft); lastGeo.soft = soft; }
    if (freq !== lastGeo.freq) {
      turbulence.setAttribute('baseFrequency', freq + ' ' + (geo.freq * 1.35).toFixed(4));
      lastGeo.freq = freq;
    }
    if (scale !== lastGeo.scale) { displacement.setAttribute('scale', scale); lastGeo.scale = scale; }

    root.style.setProperty('--speed', geo.speed.toFixed(3));
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

  var lastGeoPaint = 0;

  function loop(now) {
    // The living preset walks 9 deg/sec and wants ~30fps; a sway of a few
    // degrees a minute does not, so it repaints a third as often.
    var interval = isLiving() ? 33 : 100;
    if (now - lastPaint >= interval) {
      lastPaint = now;
      paintColors();
    }
    // Geometry runs far cooler: every write re-rasterises the filter.
    if (now - lastGeoPaint >= 250) {
      lastGeoPaint = now;
      paintGeometry();
    }
    raf = requestAnimationFrame(loop);
  }

  function shouldAnimate() {
    return !reduceMotion.matches && document.visibilityState !== 'hidden';
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
