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
      tcols: ['#fde047', '#34d399', '#a3e635'] }
  ];

  // Values auto-evolve holds steady. Only the hue travels.
  var BASE = { scale: 20, freq: 0.014, soft: 1.3, speed: 0.5 };
  var HUE_START = 168;
  var HUE_PER_SEC = 16;

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

  function hsla(h, s, l, a) {
    // One decimal is well below what the eye resolves, and keeps the string
    // short — this runs eight times a frame.
    var deg = Math.round((((h % 360) + 360) % 360) * 10) / 10;
    return 'hsla(' + deg + ',' + s + '%,' + l + '%,' + a + ')';
  }

  function elapsed() { return (Date.now() - t0) / 1000; }

  function hueNow() { return (HUE_START + elapsed() * HUE_PER_SEC) % 360; }

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
    '<button type="button" class="aur-head" aria-expanded="false" aria-controls="aur-body">' +
      '<span class="aur-head-title"><span class="aur-head-dot"></span>Come play&#8230;</span>' +
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
      cols = [
        hsla(h, 72, 46, 0.44),
        hsla(h + 60, 70, 42, 0.42),
        hsla(h + 150, 68, 44, 0.36),
        hsla(h + 230, 72, 46, 0.36),
        hsla(h + 105, 70, 44, 0.38)
      ];
      tcols = [hsla(h, 92, 74, 1), hsla(h + 60, 88, 64, 1), hsla(h + 130, 90, 76, 1)];
    } else {
      cols = PALETTES[state.palette].cols;
      tcols = PALETTES[state.palette].tcols;
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

  head.addEventListener('click', function () {
    state.collapsed = !state.collapsed;
    head.setAttribute('aria-expanded', String(!state.collapsed));
    body.classList.toggle('is-open', !state.collapsed);
  });

  autoBtn.addEventListener('click', function () {
    if (state.auto) freeze();
    state.auto = !state.auto;
    render();
    syncLoop();
  });

  grainBtn.addEventListener('click', function () {
    state.grain = !state.grain;
    syncPanel();
  });

  sliderInputs.forEach(function (input, i) {
    input.addEventListener('input', function () {
      var s = SLIDERS[i];
      if (state.auto) { freeze(); state.auto = false; }
      state[s.key] = s.fromRaw(parseFloat(input.value));
      render();
      syncLoop();
    });
  });

  swatches.forEach(function (btn, i) {
    btn.addEventListener('click', function () {
      if (state.auto) freeze();
      state.auto = false;
      state.palette = i;
      render();
      syncLoop();
    });
  });

  document.addEventListener('visibilitychange', syncLoop);

  var onMotionChange = function () { render(); syncLoop(); };
  if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', onMotionChange);
  else if (reduceMotion.addListener) reduceMotion.addListener(onMotionChange);

  render();
  syncLoop();
})();
