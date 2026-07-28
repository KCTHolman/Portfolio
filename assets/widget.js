/* ==========================================================================
   deSchouwVloot showcase widget.

   The station copy lives in the HTML (the narrow list), so the page is
   readable and indexable before this file runs. Here we:
     - build the wide rail's eight cells from that same list,
     - run the "Speel de run" state machine,
     - mirror the current station into the wide detail card.

   The run models an epic: at Plan the work splits into three phases, and
   Merge hands back to Build until every phase has landed.
   ========================================================================== */
(function () {
  'use strict';

  var widget = document.querySelector('.dsv');
  if (!widget) return;

  var TOTAL_PHASES = 3;
  var PLAY_LABEL = 'Speel de run';
  var PLAYING_LABEL = 'speelt…';

  var items = Array.prototype.slice.call(widget.querySelectorAll('.dsv-item'));
  if (!items.length) return;

  // Single source of truth: read the stations back out of the markup.
  var stations = items.map(function (li) {
    var row = li.querySelector('.dsv-row');
    var epic = li.querySelector('.dsv-row-epic');
    return {
      row: row,
      num: row.getAttribute('data-num'),
      label: row.getAttribute('data-label'),
      lane: row.getAttribute('data-lane'),
      tok: row.getAttribute('data-tok'),
      gate: row.hasAttribute('data-gate'),
      text: li.querySelector('.dsv-row-body').textContent.trim(),
      epic: epic ? epic.textContent.trim() : ''
    };
  });

  var LAST = stations.length - 1;

  var state = { idx: 0, waiting: false, playing: false, phase: 0 };
  var timer = null;

  /* ---------- wide rail cells -------------------------------------------- */

  var cellsHost = widget.querySelector('.dsv-cells');
  var cells = stations.map(function (s, i) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dsv-cell';
    if (s.gate) btn.setAttribute('data-gate', '');
    btn.innerHTML =
      '<span class="dsv-cell-dot"></span>' +
      '<span class="dsv-cell-label">' + s.label + '</span>' +
      '<span class="dsv-cell-lane">' + s.lane + '</span>' +
      '<span class="dsv-cell-gate"></span>';
    btn.addEventListener('click', function () { goTo(i); });
    cellsHost.appendChild(btn);
    return btn;
  });

  /* ---------- element handles -------------------------------------------- */

  var fill = widget.querySelector('.dsv-fill');
  var token = widget.querySelector('.dsv-token');
  var tokenLabel = widget.querySelector('.dsv-token-label');
  var loop = widget.querySelector('.dsv-loop');
  var detail = widget.querySelector('.dsv-detail');
  var detailTitle = widget.querySelector('.dsv-detail-title');
  var detailBadge = widget.querySelector('.dsv-detail-badge');
  var detailText = widget.querySelector('.dsv-detail-text');
  var detailEpic = widget.querySelector('.dsv-detail-epic');
  var phaseGroups = Array.prototype.slice.call(widget.querySelectorAll('.dsv-phases'));
  var playButtons = Array.prototype.slice.call(widget.querySelectorAll('[data-action="play"]'));

  /* ---------- render ------------------------------------------------------ */

  function render() {
    var idx = state.idx;
    var pct = (idx / LAST) * 100;
    // Build..Merge, once the work has been split into phases.
    var inLoop = state.phase > 0 && idx >= 3 && idx <= 6;
    var epicOn = state.phase > 0 && idx >= 2;
    var cur = stations[idx];

    fill.style.width = pct + '%';
    token.style.left = pct + '%';
    tokenLabel.textContent = inLoop ? 'fase ' + state.phase : cur.tok;

    loop.classList.toggle('is-active', inLoop);

    cells.forEach(function (cell, i) {
      cell.setAttribute('data-state', i === idx ? 'active' : (i < idx ? 'passed' : 'future'));
      if (i === idx) cell.setAttribute('aria-current', 'step');
      else cell.removeAttribute('aria-current');

      if (stations[i].gate && i === idx && state.waiting) cell.setAttribute('data-waiting', '');
      else cell.removeAttribute('data-waiting');

      if (stations[i].gate) {
        cell.querySelector('.dsv-cell-gate').textContent =
          (i === idx && state.waiting) ? 'wacht op jou' : 'mens';
      }
    });

    stations.forEach(function (s, i) {
      s.row.setAttribute('data-state', i === idx ? 'active' : (i < idx ? 'passed' : 'future'));
      if (i === idx) s.row.setAttribute('aria-current', 'step');
      else s.row.removeAttribute('aria-current');

      if (s.gate && i === idx && state.waiting) s.row.setAttribute('data-waiting', '');
      else s.row.removeAttribute('data-waiting');

      if (s.epic && epicOn) s.row.setAttribute('data-epic', '');
      else s.row.removeAttribute('data-epic');

      if (s.gate) {
        s.row.querySelector('.dsv-row-tag').textContent =
          (i === idx && state.waiting) ? 'wacht op jou' : 'mens-poort';
      }
    });

    if (cur.gate) detail.setAttribute('data-gate', '');
    else detail.removeAttribute('data-gate');
    detailTitle.textContent = cur.num + '  ' + cur.label;
    detailBadge.textContent = cur.gate ? 'mens-poort' : 'doorstroom';
    detailText.textContent = cur.text;
    detailEpic.textContent = cur.epic;
    detailEpic.hidden = !(epicOn && cur.epic);

    phaseGroups.forEach(function (group) {
      group.hidden = !epicOn;
      Array.prototype.forEach.call(group.children, function (chip, i) {
        var p = i + 1;
        chip.setAttribute('data-state',
          state.phase === p ? 'active' : (state.phase > p ? 'done' : 'todo'));
      });
    });

    playButtons.forEach(function (btn) {
      btn.textContent = state.playing ? PLAYING_LABEL : PLAY_LABEL;
    });
  }

  /* ---------- run ---------------------------------------------------------- */

  function step() {
    var s = stations[state.idx];

    // A human gate holds the token before it is allowed through.
    if (s.gate && !state.waiting) {
      state.waiting = true;
      render();
      timer = setTimeout(step, 1900);
      return;
    }

    // Plan decides the idea is an epic; the build loop starts here.
    if (state.idx === 2 && state.phase === 0) state.phase = 1;

    // After Merge, go back to Build while phases remain.
    if (state.idx === 6 && state.phase > 0 && state.phase < TOTAL_PHASES) {
      state.idx = 3;
      state.phase += 1;
      state.waiting = false;
      render();
      timer = setTimeout(step, 900);
      return;
    }

    var next = state.idx + 1;
    if (next > LAST) {
      state.waiting = false;
      render();
      timer = setTimeout(function () {
        state.playing = false;
        render();
      }, 2400);
      return;
    }

    state.idx = next;
    state.waiting = false;
    render();
    timer = setTimeout(step, 1050);
  }

  function play() {
    clearTimeout(timer);
    state.idx = 0;
    state.waiting = false;
    state.playing = true;
    state.phase = 0;
    // Snap the token home instead of sliding it back across the whole rail.
    token.classList.add('is-jumping');
    render();
    timer = setTimeout(function () {
      token.classList.remove('is-jumping');
      timer = setTimeout(step, 700);
    }, 70);
  }

  function goTo(i) {
    clearTimeout(timer);
    state.idx = i;
    state.waiting = false;
    state.playing = false;
    // Stations before Plan predate the epic split, so they show no phase.
    state.phase = i < 2 ? 0 : Math.min(TOTAL_PHASES, Math.max(1, state.phase || 1));
    render();
  }

  function shift(d) {
    goTo((state.idx + d + stations.length) % stations.length);
  }

  /* ---------- wiring -------------------------------------------------------- */

  stations.forEach(function (s, i) {
    s.row.addEventListener('click', function () { goTo(i); });
  });

  Array.prototype.forEach.call(widget.querySelectorAll('[data-action="prev"]'), function (btn) {
    btn.addEventListener('click', function () { shift(-1); });
  });
  Array.prototype.forEach.call(widget.querySelectorAll('[data-action="next"]'), function (btn) {
    btn.addEventListener('click', function () { shift(1); });
  });
  playButtons.forEach(function (btn) {
    btn.addEventListener('click', play);
  });

  // Leaving the page mid-run would otherwise keep the timer chain alive.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden' && state.playing) {
      clearTimeout(timer);
      state.playing = false;
      render();
    }
  });

  widget.classList.remove('dsv-nojs');
  render();
})();
