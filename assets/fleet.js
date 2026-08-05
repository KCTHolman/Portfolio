/* ==========================================================================
   De vloot — het beeldmerk van deze site.

   Honderden losse driehoekjes vormen samen één schouw onder zeil, met een
   vloot kleinere boten eromheen. Geen plaatje maar een veld puntlichten: de
   kleuren komen uit dezelfde --t1..--t3 die assets/aurora.js schrijft, dus de
   vloot verkleurt mee met de wash erachter in plaats van ernaast te staan.

   Twee standen, gekozen met data-fleet op het mountpunt:
     hero     de volle vloot naast de titel op de homepage
     ambient  een handvol verre boten achter de inhoud van een subpagina

   Zelfde afspraken als de aurora: bij reduced motion en op een telefoon
   staat er één stilstaand, volledig gevormd beeld — daar kost een canvas dat
   elke frame honderden paden trekt meer dan het oplevert.
   ========================================================================== */
(function () {
  'use strict';

  var mounts = Array.prototype.slice.call(document.querySelectorAll('[data-fleet]'));
  if (!mounts.length) return;

  var probe = document.createElement('canvas');
  if (!probe.getContext || !probe.getContext('2d')) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var narrowScreen = window.matchMedia('(max-width: 699px)');
  var coarse = window.matchMedia('(pointer: coarse)');

  // Eén klok voor alles. requestAnimationFrame levert een tijdstempel op de
  // performance-klok aan; wie daar een Date.now() naast legt, rekent met een
  // verschil van een halve eeuw en krijgt nooit een animatie die afloopt.
  var clock = (window.performance && performance.now)
    ? function () { return performance.now(); }
    : function () { return Date.now(); };

  /* ---------- willekeur met een geheugen ---------------------------------
     Dezelfde seed geeft dezelfde boot. Dat is geen detail: zonder zaad
     tekent elke paginaovergang een nét andere vloot, en dan is het een
     effect in plaats van een beeldmerk. ---------------------------------- */

  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- de vorm ----------------------------------------------------
     Alles in een genormaliseerd vak: x van achterlijk grootzeil (0) tot
     kluiverboom (1), y van wimpel (0) tot onder de kiel (~0.9). De boeg
     wijst naar rechts.

     Geen rechttoe rechtaan driehoekje op een bak, maar het silhouet van een
     zeiler onder vol tuig: mast met rake naar achteren, grootzeil met een
     bol achterlijk, twee voorzeilen die naar de kluiverboom aflopen, en een
     lage sikkelvormige romp. Drie dingen doen daarbij het echte werk:

       de spleten  smalle stukken zwart tussen de zeilen. Zonder die twee
                   spleten smelt alles samen tot één driehoekige wolk.
       de bollingen elk vrij liggend lijk staat bol. Kaarsrechte lijken
                   lezen als een pictogram, niet als doek onder wind.
       de helling  het geheel ligt een paar graden over stuurboord, en dat
                   is wat het verschil maakt tussen varen en stilliggen.
     -------------------------------------------------------------------- */

  // Punten langs een kwadratische bocht van a naar b; de macht duwt het
  // midden loodrecht opzij, zodat een zeil bol staat en niet als een
  // driehoekje uit een tekenprogramma leest.
  function curve(a, b, bulge, steps) {
    var dx = b[0] - a[0];
    var dy = b[1] - a[1];
    var cx = (a[0] + b[0]) / 2 - dy * bulge;
    var cy = (a[1] + b[1]) / 2 + dx * bulge;
    var out = [];
    for (var i = 1; i < steps; i++) {
      var t = i / steps;
      var u = 1 - t;
      out.push([
        u * u * a[0] + 2 * u * t * cx + t * t * b[0],
        u * u * a[1] + 2 * u * t * cy + t * t * b[1]
      ]);
    }
    return out;
  }

  function poly() {
    var pts = [];
    for (var i = 0; i < arguments.length; i++) {
      var part = arguments[i];
      if (typeof part[0] === 'number') pts.push(part);
      else pts = pts.concat(part);
    }
    return pts;
  }

  // Een spar is geen lijn maar een heel dun vierkantje, anders valt er geen
  // omtrek langs te lopen.
  function spar(a, b, thick) {
    var dx = b[0] - a[0];
    var dy = b[1] - a[1];
    var len = Math.hypot(dx, dy) || 1;
    var nx = (-dy / len) * thick;
    var ny = (dx / len) * thick;
    return [
      [a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny],
      [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]
    ];
  }

  var P = {
    mastTop:   [0.392, 0.044],
    mastFoot:  [0.424, 0.742],
    // grootzeil
    head:      [0.396, 0.070],
    tack:      [0.420, 0.678],
    clew:      [0.038, 0.734],
    // binnenfok
    jibHead:   [0.458, 0.186],
    jibTack:   [0.828, 0.742],
    jibClew:   [0.578, 0.706],
    // kluiver, aangeslagen op het eind van de boegspriet
    flyHead:   [0.474, 0.076],
    flyTack:   [0.972, 0.640],
    flyClew:   [0.802, 0.648],
    // romp
    sternTop:  [0.052, 0.762],
    stemHead:  [0.846, 0.736],
    stemTip:   [0.894, 0.782],
    sternFoot: [0.148, 0.848],
    sprit:     [0.988, 0.634]
  };

  // Grootzeil: het achterlijk bol naar achteren, het onderlijk hangt door
  // tot net onder de giek.
  var MAINSAIL = poly(
    P.head,
    curve(P.head, P.clew, 0.085, 12),
    P.clew,
    curve(P.clew, P.tack, -0.022, 5),
    P.tack
  );

  // Binnenfok: voorlijk staat strak op de stag, achterlijk bol naar voren.
  var JIB = poly(
    P.jibHead,
    curve(P.jibHead, P.jibTack, 0.018, 7),
    P.jibTack,
    curve(P.jibTack, P.jibClew, -0.03, 4),
    P.jibClew,
    curve(P.jibClew, P.jibHead, 0.055, 7)
  );

  // Kluiver: de buitenste, met het meeste doek in de bolling — dit is het
  // zeil dat het silhouet naar voren trekt.
  var FLYER = poly(
    P.flyHead,
    curve(P.flyHead, P.flyTack, 0.030, 8),
    P.flyTack,
    curve(P.flyTack, P.flyClew, -0.035, 4),
    P.flyClew,
    curve(P.flyClew, P.flyHead, 0.048, 7)
  );

  // Romp: laag en sikkelvormig, met een geveegde voorsteven en een
  // doorhangende zeeg. Geen bak — dit is wat 'm slank houdt.
  var HULL = poly(
    P.sternTop,
    curve(P.sternTop, P.stemHead, 0.030, 10),
    P.stemHead,
    P.stemTip,
    curve(P.stemTip, P.sternFoot, -0.020, 10),
    P.sternFoot
  );

  var MAST = spar(P.mastTop, P.mastFoot, 0.007);
  var BOOM = spar([0.062, 0.730], [0.422, 0.680], 0.006);
  var SPRIT = spar(P.stemHead, P.sprit, 0.0055);
  var FLAG = [P.mastTop, [0.392, 0.086], [0.286, 0.048]];

  // edge/fill = aantal driehoekjes op de omtrek en in het vlak, geteld voor
  // de voorste boot op volle grootte. Het moeten er veel zijn: bij een
  // handvol punten per zeil ziet niemand een boot, alleen ruis. Pas als de
  // korrels dichter op elkaar staan dan ze groot zijn, klapt het veld om in
  // een vorm. De omtrek krijgt daarbij meer dan het vlak — een rand die
  // leest doet meer voor de herkenbaarheid dan een dichtere vulling.
  // Ver weg vervalt de vulling (zie buildBoat) en blijft er een lijntekening
  // over; dat is wat afstand hier doet.
  // bias = uit welke hoek van het palet dit deel z'n kleur trekt.
  var SHAPES = [
    { pts: HULL,     edge: 300, fill: 250, bias: [2, 3, 3, 5] },
    { pts: MAINSAIL, edge: 320, fill: 400, bias: [0, 0, 1, 5] },
    { pts: JIB,      edge: 230, fill: 195, bias: [1, 1, 0, 5] },
    { pts: FLYER,    edge: 240, fill: 165, bias: [1, 0, 2, 5] },
    { pts: MAST,     edge: 100, fill: 0,   bias: [3, 5] },
    { pts: BOOM,     edge: 66,  fill: 0,   bias: [3, 5] },
    { pts: SPRIT,    edge: 60,  fill: 0,   bias: [3, 5] },
    { pts: FLAG,     edge: 30,  fill: 0,   bias: [4] }
  ];
  var LEAD_W = 0.72;
  // Hoogte gedeeld door breedte van het genormaliseerde vak: de vorm loopt
  // van x 0.04 tot 0.99 en van y 0.04 tot 0.96, en dat is bijna vierkant.
  var RATIO = 0.96;

  /* ---------- punten uit een vorm halen ---------------------------------- */

  function inside(pts, x, y) {
    var hit = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var a = pts[i], b = pts[j];
      if ((a[1] > y) !== (b[1] > y) &&
          x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) hit = !hit;
    }
    return hit;
  }

  function bounds(pts) {
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (var i = 0; i < pts.length; i++) {
      if (pts[i][0] < x0) x0 = pts[i][0];
      if (pts[i][0] > x1) x1 = pts[i][0];
      if (pts[i][1] < y0) y0 = pts[i][1];
      if (pts[i][1] > y1) y1 = pts[i][1];
    }
    return [x0, y0, x1, y1];
  }

  // Gelijkmatig over de omtrek, met een beetje speling loodrecht op de lijn:
  // kaarsrecht uitgemeten punten lezen als een raster, niet als een sterrenbeeld.
  function edgePoints(pts, count, rnd, out) {
    var segs = [];
    var total = 0;
    for (var i = 0; i < pts.length; i++) {
      var a = pts[i], b = pts[(i + 1) % pts.length];
      var len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len > 0) { segs.push([a, b, len]); total += len; }
    }
    if (!total) return;

    var step = total / count;
    var walked = step * rnd();
    var si = 0;
    var acc = segs[0][2];
    for (var n = 0; n < count; n++) {
      while (walked > acc && si < segs.length - 1) { si++; acc += segs[si][2]; }
      var s = segs[si];
      var t = 1 - (acc - walked) / s[2];
      var dx = (s[1][0] - s[0][0]) / s[2];
      var dy = (s[1][1] - s[0][1]) / s[2];
      var off = (rnd() - 0.5) * 0.013;
      out.push([
        s[0][0] + dx * s[2] * t - dy * off,
        s[0][1] + dy * s[2] * t + dx * off
      ]);
      walked += step;
    }
  }

  function fillPoints(pts, count, rnd, out) {
    var bb = bounds(pts);
    var tries = 0;
    var made = 0;
    while (made < count && tries < count * 60) {
      tries++;
      var x = bb[0] + rnd() * (bb[2] - bb[0]);
      var y = bb[1] + rnd() * (bb[3] - bb[1]);
      if (!inside(pts, x, y)) continue;
      out.push([x, y]);
      made++;
    }
  }

  /* ---------- palet -------------------------------------------------------
     Zes kleuren: drie live accenten van de aurora, het vaste merkgroen, een
     amberen vonk en wit. De verhouding is met opzet scheef — amber en wit
     zijn accenten, geen partij. ------------------------------------------ */

  var FALLBACK = [[172, 62, 68], [172, 66, 56], [222, 68, 64]];
  var FIXED = { 3: [172, 62, 68], 4: [40, 100, 58], 5: [0, 0, 100] };
  var COLORS = 6;
  var TIERS = 8;

  var palette = [
    FALLBACK[0].slice(), FALLBACK[1].slice(), FALLBACK[2].slice(),
    FIXED[3].slice(), FIXED[4].slice(), FIXED[5].slice()
  ];
  var paletteStr = new Array(COLORS);

  function parseHsl(str) {
    var m = /hsla?\(\s*(-?[\d.]+)[,\s]+([\d.]+)%[,\s]+([\d.]+)%/.exec(str || '');
    return m ? [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])] : null;
  }

  // aurora.js zet --t1..--t3 als inline style op <html>, dus dit leest de
  // eigenschap rechtstreeks van het element af — getComputedStyle zou hier
  // per keer een style-recalc afdwingen voor precies dezelfde drie waarden.
  function readAccents() {
    var root = document.documentElement;
    var changed = false;
    for (var i = 0; i < 3; i++) {
      var hsl = parseHsl(root.style.getPropertyValue('--t' + (i + 1)));
      if (!hsl) continue;
      if (palette[i][0] !== hsl[0] || palette[i][1] !== hsl[1] || palette[i][2] !== hsl[2]) {
        palette[i] = hsl;
        changed = true;
      }
    }
    return changed;
  }

  function syncPalette() {
    for (var i = 0; i < COLORS; i++) {
      var c = palette[i];
      paletteStr[i] = 'hsl(' + (Math.round(c[0] * 10) / 10) + ',' + c[1] + '%,' + c[2] + '%)';
    }
  }

  readAccents();
  syncPalette();

  /* ---------- één vloot --------------------------------------------------- */

  // cx/cy in fracties van het canvas, w in fracties van de basismaat, depth
  // stuurt helderheid, korrelgrootte en dichtheid in één keer — dat is wat
  // afstand hier is. vx laat de verre boten langzaam door beeld varen.
  // heel = hoeveel de boot overligt, in radialen. Een graad of drie is genoeg:
  // het oog ziet meteen dat er wind staat, en de horizontale streep kielwater
  // eronder gaat er nog niet zichtbaar van scheef staan.
  var HERO_BOATS = [
    { cx: 0.52, cy: 0.60, w: LEAD_W, depth: 1.00, vx: 0,    par: 1.00, heel: -0.052 },
    { cx: 0.13, cy: 0.22, w: 0.22,   depth: 0.50, vx: 3.4,  par: 0.50, heel: -0.070 },
    { cx: 0.84, cy: 0.17, w: 0.17,   depth: 0.40, vx: -2.6, par: 0.40, heel: 0.048 },
    { cx: 0.36, cy: 0.10, w: 0.13,   depth: 0.30, vx: 2.1,  par: 0.30, heel: -0.040 },
    { cx: 0.66, cy: 0.07, w: 0.10,   depth: 0.24, vx: 1.5,  par: 0.24, heel: -0.062 },
    { cx: 0.95, cy: 0.42, w: 0.11,   depth: 0.28, vx: -1.8, par: 0.28, heel: 0.055 },
    { cx: 0.04, cy: 0.50, w: 0.09,   depth: 0.22, vx: 1.2,  par: 0.22, heel: -0.045 }
  ];

  var AMBIENT_BOATS = [
    { cx: 0.16, cy: 0.22, w: 0.11, depth: 0.30, vx: 2.2,  par: 0.30, heel: -0.06 },
    { cx: 0.78, cy: 0.16, w: 0.08, depth: 0.24, vx: -1.6, par: 0.24, heel: 0.05 },
    { cx: 0.62, cy: 0.72, w: 0.13, depth: 0.34, vx: 1.4,  par: 0.34, heel: -0.045 },
    { cx: 0.30, cy: 0.84, w: 0.07, depth: 0.20, vx: -1.1, par: 0.20, heel: 0.04 },
    { cx: 0.92, cy: 0.55, w: 0.06, depth: 0.18, vx: 1.9,  par: 0.18, heel: -0.05 }
  ];

  function pick(rnd, list) { return list[(rnd() * list.length) | 0]; }

  // Eén boot: omtrek, vulling en een spoor van kielwater eronder. Alles komt
  // terug in het genormaliseerde vak, zodat het bij elke maat canvas opnieuw
  // om te rekenen is zonder de vorm opnieuw te hoeven trekken.
  function buildBoat(boat, index, quality) {
    var rnd = rng(0x5c40 + index * 977);
    var parts = [];
    var d = boat.depth;
    // Dichtheid hangt aan twee dingen tegelijk. Aan afstand, want verder weg
    // hoort ijler. En aan de maat op het scherm: dezelfde aantallen op een
    // boot van zeventig pixels geven een prop in plaats van een tekening.
    var detail = Math.pow(Math.min(1, boat.w / LEAD_W), 0.8) * (0.45 + d * 0.55) * quality;

    for (var s = 0; s < SHAPES.length; s++) {
      var shape = SHAPES[s];
      var pts = [];
      var edge = Math.max(6, Math.round(shape.edge * detail));
      edgePoints(shape.pts, edge, rnd, pts);

      // Vulling alleen dichtbij: verderop is een boot een lijntekening.
      if (shape.fill && d > 0.55) {
        fillPoints(shape.pts, Math.round(shape.fill * detail * (d - 0.35)), rnd, pts);
      }

      for (var i = 0; i < pts.length; i++) {
        // Eén op de twintig driehoekjes pakt een amberen vonk, waar het deel
        // ook uit put. Zonder die uitschieters wordt het veld te netjes.
        var col = rnd() < 0.05 ? 4 : pick(rnd, shape.bias);
        parts.push(particle(pts[i][0], pts[i][1], col, d, rnd));
      }
    }

    // Kielwater: een korte veeg onder de romp die de boot op het water zet
    // zonder dat er een horizon getekend hoeft te worden.
    var wake = Math.round(90 * detail);
    for (var w = 0; w < wake; w++) {
      var t = rnd();
      var x = 0.03 + t * 0.93;
      var spread = Math.sin(t * Math.PI);
      parts.push(particle(
        x,
        0.905 + rnd() * 0.055 * (1.4 - spread),
        rnd() < 0.3 ? 5 : pick(rnd, [2, 3]),
        d * 0.55 * spread,
        rnd
      ));
    }

    return parts;
  }

  function particle(ux, uy, col, depth, rnd) {
    var tier = Math.min(TIERS - 1, Math.max(0,
      Math.round((depth * 0.72 + rnd() * 0.4) * (TIERS - 1))));
    return {
      ux: ux, uy: uy,
      col: col,
      tier: tier,
      // Korrel: dichtbij groter. Onder de 1,4px verdwijnt een omlijnd
      // driehoekje in z'n eigen lijn, dus dat is de bodem.
      r: (1.4 + rnd() * 2.1) * (0.55 + depth * 0.45),
      spin: rnd() * Math.PI * 2,
      jf: 0.25 + rnd() * 0.5,
      jp: rnd() * Math.PI * 2,
      ja: 0.6 + rnd() * 1.5,
      lag: rnd() * 0.45,
      bx: 0, by: 0, sx: 0, sy: 0, boat: 0
    };
  }

  function buildAmbientDust(count, rnd) {
    var out = [];
    for (var i = 0; i < count; i++) {
      out.push({
        ux: rnd(), uy: rnd(),
        col: rnd() < 0.12 ? 4 : (rnd() < 0.3 ? 5 : (rnd() * 3) | 0),
        tier: (rnd() * 4) | 0,
        r: 1.2 + rnd() * 1.6,
        spin: rnd() * Math.PI * 2,
        jf: 0.12 + rnd() * 0.3,
        jp: rnd() * Math.PI * 2,
        ja: 1.5 + rnd() * 3,
        lag: rnd() * 0.45,
        vx: (rnd() - 0.5) * 5,
        bx: 0, by: 0, sx: 0, sy: 0, boat: -1
      });
    }
    return out;
  }

  /* ---------- de scène ----------------------------------------------------- */

  function Fleet(mount) {
    var mode = mount.getAttribute('data-fleet') === 'ambient' ? 'ambient' : 'hero';
    var canvas = document.createElement('canvas');
    canvas.className = 'kh-fleet-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    mount.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    var w = 0, h = 0, dpr = 1;
    var boats = [];
    var parts = [];
    var groups = [];
    var groupPhase = [];
    var tierAlpha = [];
    var raf = null;
    var lastFrame = 0;
    var lastPalette = 0;
    var t0 = clock();
    var pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    var FORM_MS = mode === 'hero' ? 2100 : 1500;

    for (var t = 0; t < TIERS; t++) {
      // Niet lineair: de meeste korrels horen in de stille helft thuis, en
      // een handvol mag echt oplichten.
      tierAlpha.push(0.24 + Math.pow(t / (TIERS - 1), 1.35) * 0.72);
    }
    for (var g = 0; g < COLORS * TIERS; g++) {
      groups.push([]);
      groupPhase.push((g * 2.399) % (Math.PI * 2));
    }

    function still() { return reduceMotion.matches || narrowScreen.matches; }

    function build() {
      var specs = mode === 'hero' ? HERO_BOATS : AMBIENT_BOATS;
      var quality = still() ? 0.5 : 1;
      if (mode === 'ambient') quality *= 0.7;

      parts = [];
      boats = [];

      for (var b = 0; b < specs.length; b++) {
        var spec = specs[b];
        var boat = {
          cx: spec.cx, cy: spec.cy, w: spec.w, depth: spec.depth,
          vx: still() ? 0 : spec.vx, par: spec.par, heel: spec.heel || 0,
          bobA: 0, bobF: 0.22 + (b % 4) * 0.07, bobP: b * 1.7,
          rockA: 0.014 + (b % 3) * 0.008, rockF: 0.17 + (b % 5) * 0.05, rockP: b * 2.3,
          pw: 0, ph: 0, px: 0, py: 0, dx: 0, dy: 0, rot: 0, sin: 0, cos: 1
        };
        boats.push(boat);

        var made = buildBoat(spec, b, quality);
        for (var i = 0; i < made.length; i++) {
          made[i].boat = b;
          parts.push(made[i]);
        }
      }

      var dust = buildAmbientDust(
        Math.round((mode === 'hero' ? 240 : 130) * quality),
        rng(0x21f3)
      );
      for (var d = 0; d < dust.length; d++) parts.push(dust[d]);

      for (var q = 0; q < groups.length; q++) groups[q].length = 0;
      for (var p = 0; p < parts.length; p++) {
        groups[parts[p].col * TIERS + parts[p].tier].push(parts[p]);
      }
    }

    // Genormaliseerde vorm naar pixels. Draait bij elke maatverandering
    // opnieuw; de vorm zelf blijft staan, alleen de schaal verschuift.
    function layout() {
      var rect = mount.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      dpr = Math.min(2, window.devicePixelRatio || 1);

      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 1;
      ctx.lineJoin = 'round';

      // De voorste boot moet in beide richtingen passen mét lucht eromheen —
      // op de breedte alleen schalen levert op een laag canvas een boot op
      // waarvan de romp onder de rand verdwijnt. De rest van de vloot hangt
      // aan diezelfde maat, zodat de onderlinge verhoudingen blijven staan.
      var lead = Math.min(w * 0.84, (h * 0.64) / RATIO);

      for (var b = 0; b < boats.length; b++) {
        var boat = boats[b];
        boat.pw = lead * (boat.w / LEAD_W);
        boat.ph = boat.pw * RATIO;
        boat.px = w * boat.cx;
        boat.py = h * boat.cy;
        boat.bobA = boat.ph * 0.022;
      }

      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (p.boat < 0) {
          p.bx = p.ux * w;
          p.by = p.uy * h;
        } else {
          var owner = boats[p.boat];
          p.bx = (p.ux - 0.5) * owner.pw;
          // 0.48, niet 0.5: de vorm loopt van masttop (0.03) tot kielwater
          // (0.95), dus het optische midden ligt net boven het midden van
          // het genormaliseerde vak.
          p.by = (p.uy - 0.48) * owner.ph;
        }
        // Startpositie van de opbouw: vanaf buiten het beeld naar binnen,
        // zodat de vloot zich verzamelt in plaats van te verschijnen.
        var ax = p.boat < 0 ? p.bx : boats[p.boat].px + p.bx;
        var ay = p.boat < 0 ? p.by : boats[p.boat].py + p.by;
        var vx = ax - w * 0.5;
        var vy = ay - h * 0.52;
        var k = 1.5 + ((i * 37) % 100) / 100;
        p.sx = w * 0.5 + vx * k + ((i * 53) % 60) - 30;
        p.sy = h * 0.52 + vy * k + ((i * 29) % 60) - 30;
      }
    }

    function ease(x) { return 1 - Math.pow(1 - x, 3); }

    function draw(now) {
      var elapsed = (now - t0) / 1000;
      var form = still() ? 1 : Math.min(1, (now - t0) / FORM_MS);
      var forming = form < 1;
      var frozen = still();
      var time = frozen ? 0 : elapsed;

      pointer.x += (pointer.tx - pointer.x) * 0.06;
      pointer.y += (pointer.ty - pointer.y) * 0.06;

      for (var b = 0; b < boats.length; b++) {
        var boat = boats[b];
        boat.dy = Math.sin(time * boat.bobF + boat.bobP) * boat.bobA + pointer.y * boat.par * 8;
        boat.rot = boat.heel + Math.sin(time * boat.rockF + boat.rockP) * boat.rockA;
        boat.sin = Math.sin(boat.rot);
        boat.cos = Math.cos(boat.rot);

        // Verre boten varen door en komen er aan de andere kant weer in. De
        // verplaatsing wordt elke frame opnieuw uit de tijd berekend, niet
        // opgeteld: opgeteld loopt hij weg zodra er een frame overslaat.
        var base = 0;
        if (boat.vx) {
          var span = w + boat.pw * 2;
          var pos = boat.px + boat.vx * time + boat.pw;
          base = (((pos % span) + span) % span) - boat.pw - boat.px;
        }
        boat.dx = base + pointer.x * boat.par * 12;
      }

      ctx.clearRect(0, 0, w, h);

      for (var g = 0; g < groups.length; g++) {
        var list = groups[g];
        if (!list.length) continue;

        // Eén puls per groep in plaats van per korrel: de groepen liggen
        // kriskras door de vloot, dus je ziet een veld dat ademt en niet
        // een aantal vlakken dat samen aan- en uitgaat.
        var pulse = frozen ? 1 : 0.7 + 0.3 * Math.sin(time * 0.7 + groupPhase[g]);
        ctx.globalAlpha = tierAlpha[g % TIERS] * pulse;
        ctx.strokeStyle = paletteStr[(g / TIERS) | 0];
        ctx.beginPath();

        for (var i = 0; i < list.length; i++) {
          var p = list[i];
          var x, y;

          if (p.boat < 0) {
            x = p.bx + (p.vx ? p.vx * time : 0);
            y = p.by;
            x = ((x % w) + w) % w;
          } else {
            var o = boats[p.boat];
            x = o.px + o.dx + p.bx * o.cos - p.by * o.sin;
            y = o.py + o.dy + p.bx * o.sin + p.by * o.cos;
          }

          if (!frozen) {
            x += Math.sin(time * p.jf + p.jp) * p.ja;
            y += Math.cos(time * p.jf * 0.8 + p.jp) * p.ja * 0.7;
          }

          if (forming) {
            var e = ease(Math.min(1, Math.max(0, (form - p.lag) / (1 - 0.45))));
            x = p.sx + (x - p.sx) * e;
            y = p.sy + (y - p.sy) * e;
          }

          var r = p.r;
          var a = p.spin + (frozen ? 0 : time * 0.08);
          ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
          ctx.lineTo(x + Math.cos(a + 2.0944) * r, y + Math.sin(a + 2.0944) * r);
          ctx.lineTo(x + Math.cos(a + 4.1888) * r, y + Math.sin(a + 4.1888) * r);
          ctx.closePath();
        }

        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      return forming;
    }

    function loop(now) {
      // Tijdens de opbouw op volle snelheid, daarna rond de 30 beelden per
      // seconde: het is een deinende achtergrond, geen animatie waar iemand
      // naar zit te kijken.
      var forming = (now - t0) < FORM_MS;
      if (forming || now - lastFrame >= 30) {
        lastFrame = now;
        if (now - lastPalette >= 220) {
          lastPalette = now;
          if (readAccents()) syncPalette();
        }
        draw(now);
      }
      raf = requestAnimationFrame(loop);
    }

    function shouldAnimate() {
      return !still() && document.visibilityState !== 'hidden';
    }

    function sync() {
      if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
      if (shouldAnimate()) raf = requestAnimationFrame(loop);
      else { syncPalette(); draw(t0 + FORM_MS + 1); }
    }

    /* ---------- reageren op de omgeving ---------------------------------- */

    var resizeTimer = null;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        layout();
        if (!shouldAnimate()) draw(t0 + FORM_MS + 1);
      }, 160);
    }

    if (window.ResizeObserver) {
      new ResizeObserver(onResize).observe(mount);
    } else {
      window.addEventListener('resize', onResize);
    }

    if (mode === 'hero' && !coarse.matches) {
      window.addEventListener('pointermove', function (e) {
        pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
        pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
      }, { passive: true });
    }

    document.addEventListener('visibilitychange', sync);

    var onQuery = function () { build(); layout(); t0 = clock(); sync(); };
    [reduceMotion, narrowScreen].forEach(function (q) {
      if (q.addEventListener) q.addEventListener('change', onQuery);
      else if (q.addListener) q.addListener(onQuery);
    });

    build();
    layout();
    sync();
    mount.classList.add('is-varend');
  }

  mounts.forEach(function (mount) { Fleet(mount); });
})();
