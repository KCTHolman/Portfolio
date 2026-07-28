/* ==========================================================================
   Aurora backdrop.

   Injects the decorative wash and the "Come play…" control panel into
   .kh-shell, then drives them by writing CSS custom properties on <html>.
   Everything the panel changes is a variable read by assets/aurora.css, so
   this file never touches layout.

   Auto-evolve walks the hue at 16 deg/sec and derives the whole palette from
   it. Turning it off — or touching any control — freezes the current geometry
   and hands the colours over to a fixed palette.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var mount = document.querySelector('.kh-shell') || document.body;

  var PALETTES = [
    { name: 'Aurora',
      cols: ['rgba(45,212,191,0.55)', 'rgba(52,211,153,0.50)', 'rgba(124,58,237,0.42)', 'rgba(96,165,250,0.42)', 'rgba(56,189,170,0.46)'],
      tcols: ['#fde047', '#2dd4bf', '#7de0d2'] },
    { name: 'Sunset',
      cols: ['rgba(244,114,182,0.52)', 'rgba(251,146,60,0.50)', 'rgba(244,63,94,0.42)', 'rgba(250,204,21,0.42)', 'rgba(251,113,133,0.46)'],
      tcols: ['#fbbf24', '#fb7185', '#f472b6'] },
    { name: 'Nebula',
      cols: ['rgba(139,92,246,0.54)', 'rgba(59,130,246,0.48)', 'rgba(236,72,153,0.44)', 'rgba(99,102,241,0.44)', 'rgba(167,139,250,0.46)'],
      tcols: ['#a78bfa', '#60a5fa', '#f0abfc'] },
    { name: 'Verdant',
      cols: ['rgba(16,185,129,0.54)', 'rgba(45,212,191,0.48)', 'rgba(132,204,22,0.42)', 'rgba(253,224,71,0.40)', 'rgba(52,211,153,0.46)'],
      tcols: ['#fde047', '#34d399', '#a3e635'] },
    { name: 'Ember',
      cols: ['rgba(249,115,22,0.56)', 'rgba(220,38,38,0.48)', 'rgba(217,70,239,0.36)', 'rgba(253,186,116,0.42)', 'rgba(234,88,12,0.48)'],
      tcols: ['#fdba74', '#fb923c', '#f43f5e'] },
    { name: 'Ijs',
      cols: ['rgba(56,189,248,0.52)', 'rgba(129,140,248,0.46)', 'rgba(224,242,254,0.34)', 'rgba(14,165,233,0.44)', 'rgba(147,197,253,0.44)'],
      tcols: ['#bae6fd', '#7dd3fc', '#c7d2fe'] },
    { name: 'Citrus',
      cols: ['rgba(250,204,21,0.54)', 'rgba(163,230,53,0.46)', 'rgba(20,184,166,0.42)', 'rgba(251,146,60,0.42)', 'rgba(190,242,100,0.44)'],
      tcols: ['#fde047', '#a3e635', '#5eead4'] }
  ];

  // Values auto-evolve holds steady. Only the hue travels, and it travels
  // slowly on purpose: the motion stays calm, the colour does the work.
  var BASE = { scale: 20, freq: 0.014, soft: 1.3, speed: 0.5 };
  var HUE_START = 222;
  var HUE_PER_SEC = 9;

  // Hue offsets per blob at full bloom. Wide, deliberately uneven steps — a
  // near-complement and a violet jump — so the wash keeps landing on
  // combinations you did not see coming instead of one analogous ramp.
  var HUE_STEPS = [0, 72, 186, 276, 138];
  var SATS = [96, 94, 92, 96, 94];
  var LIGHTS = [58, 56, 56, 58, 56];
  var ALPHAS = [0.72, 0.68, 0.62, 0.62, 0.64];

  // The intro: the page opens near-black and blue — every blob on one hue, low
  // and dim — then over RAMP_SEC the hues fan apart and the colour comes up.
  var RAMP_SEC = 16;
  var DIM = { sat: 38, light: 24, alpha: 0.16, paint: 0.34 };
  var FULL_PAINT = 0.62;

  var SLIDERS = [
    { key: 'scale', label: 'Swirl strength',     min: 0,  max: 70,  toRaw: function (v) { return Math.round(v); },        fromRaw: function (v) { return v; } },
    { key: 'freq',  label: 'Brushstroke detail', min: 0,  max: 100, toRaw: function (v) { return Math.round(v * 2000); }, fromRaw: function (v) { return v / 2000; } },
    { key: 'soft',  label: 'Softness',           min: 40, max: 180, toRaw: function (v) { return Math.round(v * 100); },  fromRaw: function (v) { return v / 100; } },
    { key: 'speed', label: 'Flow speed',         min: 30, max: 260, toRaw: function (v) { return Math.round(v * 100); },  fromRaw: function (v) { return v / 100; } }
  ];

  var state = {
    auto: true,
    scale: BASE.scale,
    freq: BASE.freq,
    soft: BASE.soft,
    speed: BASE.speed,
    palette: 0,
    grain: true,
    collapsed: true
  };

  var t0 = Date.now();
  var raf = null;
  var lastPaint = 0;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- session ----------------------------------------------------- */

  // The backdrop carries over between pages: same palette, same sliders, and
  // — because t0 travels along — the same point in the hue walk and the same
  // bloom. Without t0 every navigation would snap back to the dark blue open.
  var STORE_KEY = 'kh-aurora';

  function saveSession() {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify({
        auto: state.auto,
        scale: state.scale, freq: state.freq, soft: state.soft, speed: state.speed,
        palette: state.palette, grain: state.grain, collapsed: state.collapsed,
        t0: t0
      }));
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

    var num = function (v, fallback) { return typeof v === 'number' && isFinite(v) ? v : fallback; };

    state.auto = saved.auto !== false;
    state.scale = num(saved.scale, BASE.scale);
    state.freq = num(saved.freq, BASE.freq);
    state.soft = num(saved.soft, BASE.soft);
    state.speed = num(saved.speed, BASE.speed);
    state.grain = saved.grain !== false;
    state.collapsed = saved.collapsed !== false;
    // Clamped: a stored index outlives a palette being removed.
    state.palette = Math.min(PALETTES.length - 1, Math.max(0, num(saved.palette, 0) | 0));

    var when = num(saved.t0, 0);
    if (when > 0 && when <= Date.now()) t0 = when;
  }

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

  /* ---------- markup ---------------------------------------------------- */

  function swatchBackground(p) {
    return 'linear-gradient(120deg,' + p.cols[0] + ',' + p.cols[3] + ' 45%,' + p.cols[2] + ')';
  }

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

  var panel = document.createElement('aside');
  panel.className = 'aur-panel';
  panel.setAttribute('aria-label', 'Achtergrond bijstellen');
  panel.innerHTML =
    // Collapsed, this is just the glowing dot in the corner; the label and
    // chevron only appear once it is open.
    '<button type="button" class="aur-head" aria-expanded="false" aria-controls="aur-body" ' +
        'title="Come play&#8230;" aria-label="Achtergrond bijstellen">' +
      '<span class="aur-head-title"><span class="aur-head-dot"></span>' +
        '<span class="aur-head-text">Come play&#8230;</span></span>' +
      '<span class="aur-chevron" aria-hidden="true">&#8964;</span>' +
    '</button>' +
    '<div class="aur-body" id="aur-body">' +
      '<button type="button" class="aur-row" data-role="auto" aria-pressed="true">' +
        '<span class="aur-row-label"><span class="aur-row-dot"></span>Auto-evolve</span>' +
        '<span class="aur-switch"><span class="aur-knob"></span></span>' +
      '</button>' +
      SLIDERS.map(function (s, i) {
        return '<div class="aur-slider">' +
            '<div class="aur-slider-head">' +
              '<label for="aur-s' + i + '">' + s.label + '</label>' +
              '<span class="aur-slider-val" data-val="' + i + '"></span>' +
            '</div>' +
            '<input type="range" id="aur-s' + i + '" data-slider="' + i + '" ' +
              'min="' + s.min + '" max="' + s.max + '" step="1">' +
          '</div>';
      }).join('') +
      '<div class="aur-field">' +
        '<div class="aur-field-label" id="aur-pal-label">Palette</div>' +
        '<div class="aur-swatches" role="group" aria-labelledby="aur-pal-label">' +
          PALETTES.map(function (p, i) {
            return '<button type="button" class="aur-swatch" data-palette="' + i + '" ' +
              'aria-pressed="false" title="' + p.name + '" aria-label="Palet ' + p.name + '" ' +
              'style="background:' + swatchBackground(p) + '"></button>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<button type="button" class="aur-toggle-row" data-role="grain" aria-pressed="true">' +
        '<span class="aur-toggle-label">Painterly grain</span>' +
        '<span class="aur-switch"><span class="aur-knob"></span></span>' +
      '</button>' +
    '</div>';

  mount.insertBefore(panel, mount.firstChild);
  mount.insertBefore(stage, mount.firstChild);

  var turbulence = stage.querySelector('#kh-paint feTurbulence');
  var displacement = stage.querySelector('#kh-paint feDisplacementMap');
  var grainLayer = stage.querySelector('.aur-grain');
  var head = panel.querySelector('.aur-head');
  var body = panel.querySelector('.aur-body');
  var autoBtn = panel.querySelector('[data-role="auto"]');
  var grainBtn = panel.querySelector('[data-role="grain"]');
  var sliderInputs = Array.prototype.slice.call(panel.querySelectorAll('[data-slider]'));
  var sliderVals = Array.prototype.slice.call(panel.querySelectorAll('[data-val]'));
  var swatches = Array.prototype.slice.call(panel.querySelectorAll('[data-palette]'));

  /* ---------- painting -------------------------------------------------- */

  // Runs every frame while auto-evolve is on, so it stays limited to the
  // eight colour variables — nothing here forces layout.
  function paintColors() {
    var cols, tcols;
    if (state.auto) {
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
      cols = PALETTES[state.palette].cols;
      tcols = PALETTES[state.palette].tcols;
      root.style.setProperty('--aur-paint-op', String(FULL_PAINT));
    }
    for (var i = 0; i < cols.length; i++) root.style.setProperty('--c' + (i + 1), cols[i]);
    for (var j = 0; j < tcols.length; j++) root.style.setProperty('--t' + (j + 1), tcols[j]);
  }

  // Geometry only changes when a slider moves or auto-evolve flips.
  function paintGeometry() {
    var scale = state.auto ? BASE.scale : state.scale;
    var freq = state.auto ? BASE.freq : state.freq;
    var soft = state.auto ? BASE.soft : state.soft;
    var speed = state.auto ? BASE.speed : state.speed;

    root.style.setProperty('--soft', soft.toFixed(3));
    root.style.setProperty('--speed', speed.toFixed(3));
    turbulence.setAttribute('baseFrequency', freq.toFixed(4) + ' ' + (freq * 1.35).toFixed(4));
    displacement.setAttribute('scale', scale.toFixed(1));
  }

  function syncPanel() {
    autoBtn.setAttribute('aria-pressed', String(state.auto));
    grainBtn.setAttribute('aria-pressed', String(state.grain));
    grainLayer.hidden = !state.grain;

    SLIDERS.forEach(function (s, i) {
      var live = state.auto ? BASE[s.key] : state[s.key];
      var raw = s.toRaw(live);
      // Skip the element the user is currently dragging, so writing back
      // never fights their pointer.
      if (document.activeElement !== sliderInputs[i]) sliderInputs[i].value = String(raw);
      sliderVals[i].textContent = String(raw);
    });

    swatches.forEach(function (btn, i) {
      btn.setAttribute('aria-pressed', String(!state.auto && state.palette === i));
    });
  }

  function render() {
    paintColors();
    paintGeometry();
    syncPanel();
  }

  /* ---------- animation loop -------------------------------------------- */

  function loop(now) {
    // ~30fps is plenty for a 16 deg/sec hue walk and halves the wake-ups.
    if (now - lastPaint >= 33) {
      lastPaint = now;
      paintColors();
    }
    raf = requestAnimationFrame(loop);
  }

  function shouldAnimate() {
    return state.auto && !reduceMotion.matches && document.visibilityState !== 'hidden';
  }

  function syncLoop() {
    if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
    if (shouldAnimate()) raf = requestAnimationFrame(loop);
  }

  /* ---------- interaction ------------------------------------------------ */

  // Freeze auto-evolve's current geometry so nothing jumps when it turns off.
  function freeze() {
    state.scale = BASE.scale;
    state.freq = BASE.freq;
    state.soft = BASE.soft;
    state.speed = BASE.speed;
  }

  function applyCollapsed() {
    head.setAttribute('aria-expanded', String(!state.collapsed));
    body.classList.toggle('is-open', !state.collapsed);
    panel.classList.toggle('is-open', !state.collapsed);
  }

  head.addEventListener('click', function () {
    state.collapsed = !state.collapsed;
    applyCollapsed();
    saveSession();
  });

  autoBtn.addEventListener('click', function () {
    if (state.auto) freeze();
    state.auto = !state.auto;
    render();
    syncLoop();
    saveSession();
  });

  grainBtn.addEventListener('click', function () {
    state.grain = !state.grain;
    syncPanel();
    saveSession();
  });

  sliderInputs.forEach(function (input, i) {
    input.addEventListener('input', function () {
      var s = SLIDERS[i];
      if (state.auto) { freeze(); state.auto = false; }
      state[s.key] = s.fromRaw(parseFloat(input.value));
      render();
      syncLoop();
      saveSession();
    });
  });

  swatches.forEach(function (btn, i) {
    btn.addEventListener('click', function () {
      if (state.auto) freeze();
      state.auto = false;
      state.palette = i;
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
  applyCollapsed();
  render();
  syncLoop();
  saveSession();
})();
