/* ==========================================================================
   deSchouwVloot showcase widget.

   Two jobs:
     - switch between the three views (gate, verhalend, technisch),
     - run the logboek: reveal one step at a time, and actually stop at a
       human gate until the visitor approves it.

   The steps live in the HTML, so the page reads without this file. Here we
   read them back out, derive the rail ticks and the "jouw kant"-list from
   the same list, and move state onto the DOM via data-attributes.
   ========================================================================== */
(function () {
  'use strict';

  var widget = document.querySelector('.dsv');
  if (!widget) return;

  var PLAY_LABEL = 'Speel de run';
  var RUNNING_LABEL = 'de run loopt…';
  var WAITING_LABEL = 'wacht op jou…';

  var entryEls = Array.prototype.slice.call(widget.querySelectorAll('.dsv-entry'));
  if (!entryEls.length) return;

  var DEFAULT_DWELL = 7000;

  // Single source of truth: read the run back out of the markup. Each step
  // carries its own dwell, so a dense step can hold the screen longer than a
  // short one without any of that pacing living in here.
  var steps = entryEls.map(function (el) {
    var dwell = parseInt(el.getAttribute('data-dwell'), 10);
    return {
      el: el,
      p: el.getAttribute('data-p'),
      who: el.getAttribute('data-who'),
      kind: el.getAttribute('data-kind') || '',
      gate: el.hasAttribute('data-gate'),
      dwell: isFinite(dwell) && dwell > 0 ? dwell : DEFAULT_DWELL,
      t: el.querySelector('.dsv-entry-t').textContent.trim(),
      title: el.querySelector('.dsv-entry-title').textContent.trim()
    };
  });

  var TOTAL = steps.length;

  var state = { n: 1, waiting: false, playing: false };
  var timer = null;
  var gateTimer = null;
  var typeTimer = null;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- element handles --------------------------------------------- */

  var bar = widget.querySelector('.dsv-rail-bar');
  var log = widget.querySelector('.dsv-log');
  var counter = widget.querySelector('.dsv-counter');
  var playButton = widget.querySelector('[data-action="play"]');
  var nextButton = widget.querySelector('[data-action="next"]');

  /* ---------- derived furniture ------------------------------------------- */

  // A tick on the rail for every step that waits for a human.
  var ticks = [];
  steps.forEach(function (s, i) {
    if (!s.gate || !bar) return;
    var tick = document.createElement('span');
    tick.className = 'dsv-rail-tick';
    tick.style.setProperty('--p', s.p + '%');
    bar.appendChild(tick);
    ticks.push({ el: tick, i: i });
  });

  // "Jouw kant van het werk" — the same steps, filtered to the human ones.
  var mine = [];
  var mineHost = widget.querySelector('.dsv-aside-list');
  if (mineHost) {
    steps.forEach(function (s, i) {
      if (s.who !== 'jij') return;
      var row = document.createElement('div');
      row.className = 'dsv-mine';
      row.innerHTML =
        '<span class="dsv-mine-t"></span>' +
        '<span class="dsv-mine-l"></span>' +
        '<span class="dsv-mine-k"></span>';
      row.querySelector('.dsv-mine-t').textContent = s.t;
      row.querySelector('.dsv-mine-l').textContent = s.title;
      row.querySelector('.dsv-mine-k').textContent = s.kind;
      mineHost.appendChild(row);
      mine.push({ el: row, i: i });
    });
  }

  /* ---------- render ------------------------------------------------------- */

  function render() {
    var n = state.n;
    var last = steps[n - 1];

    steps.forEach(function (s, i) {
      var shown = i < n;
      if (shown) s.el.setAttribute('data-shown', '');
      else s.el.removeAttribute('data-shown');

      if (shown && i === n - 1) s.el.setAttribute('data-last', '');
      else s.el.removeAttribute('data-last');

      if (s.gate && i === n - 1 && state.waiting) s.el.setAttribute('data-waiting', '');
      else s.el.removeAttribute('data-waiting');
    });

    if (bar && last) bar.style.setProperty('--dsv-fill', last.p + '%');

    ticks.forEach(function (tick) {
      if (tick.i < n) tick.el.setAttribute('data-reached', '');
      else tick.el.removeAttribute('data-reached');
    });

    mine.forEach(function (row) {
      if (row.i < n) row.el.setAttribute('data-reached', '');
      else row.el.removeAttribute('data-reached');
    });

    if (counter) counter.textContent = n + ' / ' + TOTAL + ' stappen';

    if (playButton) {
      playButton.textContent = state.waiting ? WAITING_LABEL
        : state.playing ? RUNNING_LABEL
        : PLAY_LABEL;
    }

    if (nextButton) nextButton.disabled = state.waiting || n >= TOTAL;

    // Keep the newest step in view; the log scrolls inside its own box. A step
    // taller than the box gets its top lined up instead of its bottom —
    // scrolling to the end of it would drop the reader past its opening.
    if (log && last) {
      var limit = log.scrollHeight - log.clientHeight;
      if (last.el.offsetHeight > log.clientHeight) {
        var delta = last.el.getBoundingClientRect().top - log.getBoundingClientRect().top;
        log.scrollTop = Math.min(log.scrollTop + delta, limit);
      } else {
        log.scrollTop = limit;
      }
    }
  }

  /* ---------- run ---------------------------------------------------------- */

  function stop() {
    clearTimeout(timer);
    clearTimeout(gateTimer);
    clearTimeout(typeTimer);
  }

  /* ---------- the idea being typed in --------------------------------------- */

  var typed = widget.querySelector('.dsv-typed');
  var ideaText = typed ? typed.textContent : '';

  function typeIdea(done) {
    if (!typed) { done(); return; }
    if (reduceMotion.matches) {
      typed.textContent = ideaText;
      done();
      return;
    }
    typed.textContent = '';
    widget.setAttribute('data-typing', '');
    var i = 0;
    (function next() {
      typed.textContent = ideaText.slice(0, ++i);
      if (i < ideaText.length) {
        // A hair of variation per character reads as typing rather than a ticker.
        typeTimer = setTimeout(next, 30 + (i % 5) * 9);
        return;
      }
      widget.removeAttribute('data-typing');
      typeTimer = setTimeout(done, 1100);
    })();
  }

  function tick() {
    if (state.n >= TOTAL) {
      state.playing = false;
      render();
      return;
    }

    var next = steps[state.n];
    state.n += 1;
    state.waiting = next.gate;
    render();

    // A gate holds the run until the visitor clicks Goedkeuren.
    if (next.gate) return;

    timer = setTimeout(tick, next.dwell);
  }

  function play() {
    stop();
    // Nothing has happened yet — the idea is still being typed.
    state.n = 0;
    state.waiting = false;
    state.playing = true;
    render();
    typeIdea(function () {
      state.n = 1;
      render();
      timer = setTimeout(tick, steps[0].dwell);
    });
  }

  // For anyone reading faster than the run: jump straight to the next step and
  // restart the dwell from there. A gate is not skippable — Goedkeuren is the
  // only way past it, which is the whole point of the gate.
  function next() {
    if (state.waiting || state.n >= TOTAL) return;
    stop();
    state.playing = true;
    tick();
  }

  function all() {
    stop();
    widget.removeAttribute('data-typing');
    if (typed) typed.textContent = ideaText;
    state.n = TOTAL;
    state.waiting = false;
    state.playing = false;
    render();
  }

  function approve() {
    if (!state.waiting) return;
    stop();
    state.waiting = false;
    state.playing = true;
    render();
    timer = setTimeout(tick, 1200);
  }

  /* ---------- views -------------------------------------------------------- */

  var VIEWS = ['gate', 'verhalend', 'technisch'];

  // #verhalend / #technisch open that view straight away, so the home page can
  // link a visitor into the side they care about.
  function viewFromHash() {
    var name = (window.location.hash || '').slice(1);
    return VIEWS.indexOf(name) > 0 ? name : null;
  }

  function goTo(view, writeHash) {
    stop();
    if (view !== 'verhalend') {
      state.playing = false;
      state.waiting = false;
      render();
    }
    widget.setAttribute('data-view', view);

    // replaceState, not a hash assignment: switching views is not a page the
    // back button should have to walk through.
    if (writeHash !== false && window.history && window.history.replaceState) {
      window.history.replaceState(null, '',
        view === 'gate' ? window.location.pathname + window.location.search : '#' + view);
    }

    if (view === 'verhalend') play();
  }

  /* ---------- wiring ------------------------------------------------------- */

  Array.prototype.forEach.call(widget.querySelectorAll('[data-goto]'), function (btn) {
    btn.addEventListener('click', function () { goTo(btn.getAttribute('data-goto')); });
  });

  window.addEventListener('hashchange', function () {
    var view = viewFromHash() || 'gate';
    if (view !== widget.getAttribute('data-view')) goTo(view, false);
  });

  Array.prototype.forEach.call(widget.querySelectorAll('[data-action="approve"]'), function (btn) {
    btn.addEventListener('click', approve);
  });

  if (playButton) playButton.addEventListener('click', play);
  if (nextButton) nextButton.addEventListener('click', next);

  var allButton = widget.querySelector('[data-action="all"]');
  if (allButton) allButton.addEventListener('click', all);

  // Same run, one layer deeper: what the backend actually does per step, and
  // what happens when that step fails.
  var depthButton = widget.querySelector('[data-action="depth"]');
  if (depthButton) {
    depthButton.addEventListener('click', function () {
      var deep = widget.getAttribute('data-depth') !== 'tech';
      widget.setAttribute('data-depth', deep ? 'tech' : 'verhaal');
      depthButton.setAttribute('aria-pressed', String(deep));
      depthButton.textContent = deep ? 'Verhalende versie' : 'Technische versie';
      // The step just grew or shrank; put it back in view.
      render();
    });
  }

  // Leaving the page mid-run would otherwise keep the timer chain alive.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden' && state.playing) {
      stop();
      state.playing = false;
      render();
    }
  });

  widget.classList.remove('dsv-nojs');
  render();

  var landed = viewFromHash();
  if (landed) goTo(landed, false);
  // On its own page there is nothing to choose, so the run just starts.
  else if (widget.hasAttribute('data-autoplay')) play();
})();
