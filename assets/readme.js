/* ==========================================================================
   werk/readme/ — twee toevoegingen op een pagina die zonder JS al af is.

     - een kopieerknop per codeblok, gebouwd vanuit hier zodat er geen knop
       in de HTML staat die niets doet als dit bestand niet laadt;
     - de outline-rail volgt waar je bent.

   Verder niets: de tekst, de koppen, de ankers en alle links staan in de
   HTML en werken zonder een regel script.
   ========================================================================== */
(function () {
  'use strict';

  var md = document.querySelector('.gh-md');
  if (!md) return;

  /* ---------- Kopieerknoppen ---------------------------------------------- */

  // navigator.clipboard bestaat alleen in een secure context. Op http:// zou
  // de knop er wel staan en dan stilletjes niets doen — dus dan geen knop.
  if (navigator.clipboard && window.isSecureContext) {
    Array.prototype.forEach.call(md.querySelectorAll('.gh-snippet'), function (snippet) {
      var pre = snippet.querySelector('pre');
      if (!pre) return;

      var lang = snippet.getAttribute('data-lang') || 'code';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gh-copy';
      btn.textContent = 'kopieer';
      btn.setAttribute('aria-label', 'Kopieer het ' + lang + '-blok');

      var reset = null;
      btn.addEventListener('click', function () {
        navigator.clipboard.writeText(pre.textContent).then(function () {
          btn.textContent = 'gekopieerd';
          btn.setAttribute('data-done', '');
        }, function () {
          // Geweigerd door de browser of door beleid. Dat eerlijk zeggen is
          // beter dan een knop die zich voordoet alsof het gelukt is.
          btn.textContent = 'mislukt';
        });

        clearTimeout(reset);
        reset = setTimeout(function () {
          btn.textContent = 'kopieer';
          btn.removeAttribute('data-done');
        }, 2000);
      });

      snippet.appendChild(btn);
      // Zegt tegen readme.css dat de rechterbovenhoek nu bezet is.
      snippet.setAttribute('data-copyable', '');
    });
  }

  /* ---------- De outline volgt de kop waar je bent ------------------------ */

  var links = Array.prototype.slice.call(document.querySelectorAll('.gh-outline a[href^="#"]'));
  if (!links.length) return;

  var targets = links.map(function (link) {
    return document.getElementById(decodeURIComponent(link.getAttribute('href').slice(1)));
  });

  var current = null;

  function mark(index) {
    if (index === current) return;
    current = index;
    links.forEach(function (link, i) {
      if (i === index) link.setAttribute('data-current', '');
      else link.removeAttribute('data-current');
    });
  }

  // De laatste kop die boven de leeslijn is gepasseerd, niet de eerste die in
  // beeld staat: bij een lange sectie staat de kop allang buiten beeld terwijl
  // je er nog middenin leest.
  var LINE = 140;

  function update() {
    var index = 0;
    for (var i = 0; i < targets.length; i++) {
      if (targets[i] && targets[i].getBoundingClientRect().top <= LINE) index = i;
    }

    // Onderaan de pagina kan de laatste kop de lijn nooit meer passeren als de
    // sectie korter is dan het scherm; dan hoort hij toch actief te zijn.
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 2) {
      index = targets.length - 1;
    }

    mark(index);
  }

  // Eén meting per frame in plaats van één per scroll-event.
  var queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      update();
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();
