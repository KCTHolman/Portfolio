/* ==========================================================================
   Cafeïne-demo.

   Een werkende namaak van het log-sheet uit BiohackOS: tik een snelkeuze en
   het komt in het dagoverzicht. De waarschuwing erboven staat er altijd, maar
   zegt iets anders naar gelang het tijdstip van de bezoeker:

     overdag  — hoeveel er al in zit, en wat daar vanavond nog van over is
     's avonds — wat er rond bedtijd nog rondzwerft, en wat dat met slaap doet

   De halfwaardetijd van cafeïne is ~5,5 uur, dus wat je om 21:00 drinkt zit om
   23:00 nog voor ~78% in je systeem. Dat rekensommetje is het hele punt van de
   melding: het is niet "je drinkt veel", het is "dit werkt vanavond nog door".
   ========================================================================== */
(function () {
  'use strict';

  var sheet = document.querySelector('.kh-sheet');
  if (!sheet) return;

  /* ---------- wachten op de release ---------------------------------------- */

  // Staat er een run op deze pagina, dan is dit scherm de ontknoping ervan en
  // hoort het er pas te zijn zodra die run z'n release gehaald heeft. Zonder
  // run (of zonder JS) staat het er gewoon.
  var demo = document.querySelector('.kh-demo');
  var run = document.querySelector('.dsv .dsv-entry');

  if (demo && run) {
    demo.setAttribute('data-locked', '');
    document.addEventListener('dsv:live', function () {
      demo.removeAttribute('data-locked');
      demo.classList.add('is-revealed');
    }, { once: true });
  }

  var HALF_LIFE = 5.5;   // uur
  var BEDTIME = 23;      // uur
  var LIMIT = 400;       // mg per dag, de gangbare richtlijn
  var EVENING = 17;      // vanaf hier gaat de melding over slapen

  var entries = [];

  var warn = sheet.querySelector('.kh-warn');
  var warnText = sheet.querySelector('.kh-warn-text');
  var list = sheet.querySelector('.kh-today-list');
  var totalEl = sheet.querySelector('.kh-today-total');
  var amount = sheet.querySelector('.kh-manual input');
  var tabs = Array.prototype.slice.call(sheet.querySelectorAll('.kh-tab'));

  function nowHours() {
    var d = new Date();
    return d.getHours() + d.getMinutes() / 60;
  }

  function clock(h) {
    var hh = Math.floor(h);
    var mm = Math.round((h - hh) * 60);
    if (mm === 60) { hh += 1; mm = 0; }
    return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  }

  function totalMg() {
    return entries.reduce(function (a, e) { return a + e.mg; }, 0);
  }

  // Wat er van een dosis over is op een later uur.
  function leftAt(mg, from, at) {
    var hours = Math.max(0, at - from);
    return mg * Math.pow(0.5, hours / HALF_LIFE);
  }

  function atBedtime() {
    return entries.reduce(function (a, e) { return a + leftAt(e.mg, e.at, BEDTIME); }, 0);
  }

  /* ---------- de melding --------------------------------------------------- */

  function renderWarning() {
    var total = totalMg();
    var hour = nowHours();
    var evening = hour >= EVENING;
    var rest = Math.round(atBedtime());

    if (!total) {
      warn.setAttribute('data-level', 'rustig');
      warnText.textContent = evening
        ? 'Nog niets gelogd. Wat je nu nog drinkt, zit rond bedtijd voor het grootste deel nog in je systeem — de halfwaardetijd is ongeveer 5,5 uur.'
        : 'Nog niets gelogd vandaag. Vanaf ' + LIMIT + ' mg wordt het merkbaar, en alles van na een uur of vijf telt vanavond nog mee.';
      return;
    }

    var last = entries[entries.length - 1];

    if (evening) {
      var pct = Math.round((rest / total) * 100);
      warn.setAttribute('data-level', 'avond');
      warnText.textContent =
        'Laatste cafeïne om ' + clock(last.at) + '. Bij een halfwaardetijd van ~5,5 uur zit er rond bedtijd nog zo\'n ' +
        pct + '% in je systeem — ' + rest + ' mg. Dat kan je slaap verstoren.';
      return;
    }

    if (total >= LIMIT) {
      warn.setAttribute('data-level', 'avond');
      warnText.textContent =
        'Je zit op ' + total + ' mg, boven de richtlijn van ' + LIMIT + ' mg. Rond bedtijd is daar nog ' +
        rest + ' mg van over — dat is genoeg om je slaap ondieper te maken.';
      return;
    }

    warn.setAttribute('data-level', 'dag');
    warnText.textContent =
      'Je zit op ' + total + ' mg van de ' + LIMIT + ' mg. Het stapelt door: rond bedtijd zit er hiervan nog ' +
      rest + ' mg in je systeem.';
  }

  /* ---------- het dagoverzicht --------------------------------------------- */

  function renderList() {
    var total = totalMg();
    totalEl.textContent = total + ' mg';

    if (!entries.length) {
      list.innerHTML = '<li class="kh-today-empty">Nog niets gelogd.</li>';
      return;
    }

    list.innerHTML = '';
    entries.forEach(function (e) {
      var li = document.createElement('li');
      li.className = 'kh-entry';
      li.innerHTML =
        '<span class="kh-entry-time"></span><span class="kh-entry-name"></span><span class="kh-entry-mg"></span>';
      li.querySelector('.kh-entry-time').textContent = clock(e.at);
      li.querySelector('.kh-entry-name').textContent = e.name;
      li.querySelector('.kh-entry-mg').textContent = e.mg + ' mg';
      list.appendChild(li);
    });
  }

  function render() {
    renderList();
    renderWarning();
  }

  function add(name, mg) {
    if (!mg) return;
    entries.push({ name: name, mg: mg, at: nowHours() });
    render();
  }

  /* ---------- wiring -------------------------------------------------------- */

  Array.prototype.forEach.call(sheet.querySelectorAll('.kh-chip'), function (chip) {
    chip.addEventListener('click', function () {
      add(chip.getAttribute('data-name'), parseInt(chip.getAttribute('data-mg'), 10));
    });
  });

  sheet.querySelector('.kh-log').addEventListener('click', function () {
    var mg = parseInt(amount.value, 10);
    if (!isFinite(mg) || mg <= 0) {
      amount.focus();
      return;
    }
    add('Handmatig', mg);
    amount.value = '';
  });

  amount.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') sheet.querySelector('.kh-log').click();
  });

  sheet.querySelector('.kh-reset').addEventListener('click', function () {
    entries = [];
    render();
  });

  // De watertab is er om te laten zien dat het sheet meer doet dan koffie;
  // de melding hangt aan cafeïne, dus die verdwijnt daar.
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var which = tab.getAttribute('data-tab');
      tabs.forEach(function (t) {
        t.setAttribute('aria-selected', String(t === tab));
      });
      Array.prototype.forEach.call(sheet.querySelectorAll('[data-panel]'), function (panel) {
        panel.hidden = panel.getAttribute('data-panel') !== which;
      });
      warn.hidden = which !== 'cafeine';
    });
  });

  render();
})();
