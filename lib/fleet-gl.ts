'use client'

/* ==========================================================================
   De vloot — GPU-rasterisatie.

   use-fleet-scene.ts blijft precies zoals hij was: alle fysica (deining,
   jitter, muis-afstoting, formatie-tweens, lancering) rekent nog steeds op
   de CPU, per deeltje, elk frame — dat is nooit het dure deel geweest. Het
   dure deel was de laatste stap: voor elk deeltje een eigen Canvas2D-pad
   (moveTo/lineTo/lineTo/closePath) opbouwen en met stroke() rasterizen, in
   tot wel enkele tientallen aparte stroke()-aanroepen per frame (één per
   kleur/laag-groep). Canvas2D rasterized dat soort padwerk op veel
   apparaten via de CPU, niet de GPU.

   Dit bestand vervangt alleen die laatste stap. In plaats van een pad per
   deeltje krijgt de GPU één platte lijst instanties (x, y, straal, hoek,
   kleur, alpha) en tekent alle deeltjes — van elke boot, elk stof, elk
   journey-stadium, samen — in één enkele instanced draw call. De vorm zelf
   (een gestreepte driehoek, dezelfde ±120°-rotatie als de oude JS-versie)
   leeft nu in de fragment-shader hieronder als een signed-distance-veld naar
   drie lijnstukken, met dezelfde afronding op de hoeken die lineJoin:'round'
   op Canvas2D gaf (het gevolg van sdSegment()'s eigen "capsule"-vorm rond
   elk segment).

   WebGL2-only, bewust: dit is een decoratieve achtergrond op een site die
   toch al de zwaarste techniek vermijdt op apparaten die het niet aankunnen
   (zie lib/perf-quality.ts) — een WebGL1-pad erbij optuigen zou het
   omgekeerde zijn van "minder complexiteit voor minder GPU-last". Bestaat
   de context niet (zeer oude Safari/WebKit), dan blijft het canvas leeg;
   dezelfde graceful-degradation als de bestaande `if (!ctx) return`. */

const FLOATS_PER_INSTANCE = 8 // x, y, r, angle, red, green, blue, alpha

/** h in graden (0..360), s/l in procent (0..100) — dezelfde eenheden als
 *  paletteStr's `hsl()`-strings. Retourneert r/g/b als 0..1, wat de shader
 *  hierboven verwacht; een canvas-strokeStyle-string heeft de GPU niets aan. */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const S = s / 100
  const L = l / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = S * Math.min(L, 1 - L)
  const f = (n: number) => L - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0), f(8), f(4)]
}

const VERTEX_SRC = `#version 300 es
in vec2 aCorner;
in vec2 aCenter;
in float aRadius;
in float aAngle;
in vec3 aColor;
in float aAlpha;

uniform vec2 uResolution;

out vec2 vLocal;
out vec3 vColor;
out float vAlpha;
flat out float vRadius;
flat out float vAngle;

void main() {
  // Marge boven de straal: 0.5 halve lijndikte + ~1.5px anti-aliasing —
  // ruim genoeg dat de gestreepte driehoek nooit tegen de rand van dit
  // vierkant aanloopt, in welke rotatie dan ook.
  float half_ = aRadius + 2.0;
  vec2 local = aCorner * half_;
  vec2 worldPos = aCenter + local;
  vec2 clip = (worldPos / uResolution) * 2.0 - 1.0;
  // Y-flip: CSS-pixelruimte telt naar beneden, clip-space naar boven —
  // zelfde omrekening die het canvas' eigen transform elders al doet.
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  vLocal = local;
  vColor = aColor;
  vAlpha = aAlpha;
  vRadius = aRadius;
  vAngle = aAngle;
}
`

const FRAGMENT_SRC = `#version 300 es
precision mediump float;

in vec2 vLocal;
in vec3 vColor;
in float vAlpha;
flat in float vRadius;
flat in float vAngle;

out vec4 fragColor;

float sdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

void main() {
  float ca = cos(vAngle);
  float sa = sin(vAngle);
  // Dezelfde optelformules als de oude JS-versie in use-fleet-scene.ts:
  // twee hoekpunten op +120°/+240° afgeleid uit ca/sa, geen extra
  // cos/sin-aanroepen nodig (hier op de GPU is dat toch al verwaarloosbaar,
  // maar de identieke formules garanderen exact dezelfde vorm als voorheen).
  float cb = -0.5 * ca - 0.8660254 * sa;
  float sb = 0.8660254 * ca - 0.5 * sa;
  float cc = -0.5 * ca + 0.8660254 * sa;
  float sc = -0.8660254 * ca - 0.5 * sa;

  vec2 v0 = vec2(ca, sa) * vRadius;
  vec2 v1 = vec2(cb, sb) * vRadius;
  vec2 v2 = vec2(cc, sc) * vRadius;

  float d = min(sdSegment(vLocal, v0, v1), min(sdSegment(vLocal, v1, v2), sdSegment(vLocal, v2, v0)));

  // strokeHalf 0.5 == ctx.lineWidth 1 op het oude canvas; aa is de
  // anti-aliasing-band, in dezelfde CSS-pixel-eenheden als straal/positie.
  float strokeHalf = 0.5;
  float aa = 0.75;
  float coverage = smoothstep(strokeHalf + aa, strokeHalf - aa, d);
  if (coverage <= 0.001) discard;

  // Premultiplied alpha: moet overeenkomen met de blendFunc in
  // createFleetRenderer() hieronder, anders ontstaat een zichtbare rand.
  fragColor = vec4(vColor * vAlpha * coverage, vAlpha * coverage);
}
`

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

export type FleetRenderer = {
  /** Reset de instantie-teller naar 0 — roep dit aan het begin van een
   *  frame, vóór de eerste push(). */
  reset: () => void
  /** Voegt één deeltje toe aan de huidige frame-batch. x/y/r in
   *  CSS-pixels, angle in radialen, r/g/b 0..1, alpha 0..1. Groeit de
   *  interne buffer vanzelf als de capaciteit niet meer volstaat. */
  push: (x: number, y: number, r: number, angle: number, red: number, green: number, blue: number, alpha: number) => void
  /** Werkt canvas.width/height en het GL-viewport bij — hoort in layout(),
   *  net als de oude dpr-berekening die 'm verving. */
  resize: (cssWidth: number, cssHeight: number, dpr: number) => void
  /** Upload de tot nu toe gepushte instanties en tekent ze in één
   *  instanced draw call. Ruimt zelf de framebuffer op (het canvas begint
   *  dus altijd transparant, net als de oude clearRect()). */
  flush: () => void
  /** True zolang de context niet verloren is gegaan — flush()/push() zijn
   *  dan no-ops in plaats van een crash. */
  readonly ok: boolean
  /** Ruimt GPU-resources (program, buffers, VAO) en de contextlost-listener
   *  op — hoort in de cleanup van het effect dat createFleetRenderer()
   *  aanriep, anders lekt elke client-side navigatie een WebGL-context. */
  dispose: () => void
}

export function createFleetRenderer(canvas: HTMLCanvasElement): FleetRenderer | null {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: false,
    premultipliedAlpha: true,
    desynchronized: true,
    powerPreference: 'low-power',
  })
  if (!gl) return null

  // Eén interleaved buffer voor alle instantie-attributen — hergebruikt
  // Float32Array-geheugen tussen frames in plaats van er elke keer een
  // nieuwe te alloceren; groeit alleen als de vloot zelf groeit. Dit
  // CPU-geheugen overleeft contextverlies gewoon (setup() hieronder raakt
  // 'm niet aan); alleen de GPU-zijde moet na herstel opnieuw.
  let capacity = 2048
  let buffer = new Float32Array(capacity * FLOATS_PER_INSTANCE)

  let count = 0
  let cssW = 0
  let cssH = 0
  let contextLost = false
  // Bijgehouden naast `capacity` (de logische grootte in instanties): de
  // GPU-allocatie zelf moet alleen opnieuw met bufferData() gezet worden
  // wanneer de Float32Array daadwerkelijk gegroeid is (of de GPU-buffer net
  // opnieuw is aangemaakt na contextverlies), anders volstaat het veel
  // goedkopere bufferSubData() hieronder.
  let uploadedCapacity = 0

  // Alle GPU-resources (shaders, program, VAO, buffers) — herbouwd door
  // setup() hieronder, zowel bij de eerste aanmaak als na een
  // 'webglcontextrestored'-event. WebGL-objecten van vóór contextverlies
  // zijn dan al ongeldig gemaakt door de browser; er is geen manier om ze
  // te hergebruiken, alleen opnieuw aanmaken op dezelfde context.
  let program: WebGLProgram | null = null
  let uResolution: WebGLUniformLocation | null = null
  let vao: WebGLVertexArrayObject | null = null
  let cornerBuf: WebGLBuffer | null = null
  let instanceBuf: WebGLBuffer | null = null

  // gl als parameter (i.p.v. de closure) omdat TypeScript de
  // niet-null-narrowing van de buitenste `if (!gl) return null` niet
  // doorzet in een geneste functiedeclaratie.
  function setup(gl: WebGL2RenderingContext): boolean {
    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SRC)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC)
    const prog = gl.createProgram()
    if (!vs || !fs || !prog) return false
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false
    gl.deleteShader(vs)
    gl.deleteShader(fs)

    const nextVao = gl.createVertexArray()
    gl.bindVertexArray(nextVao)

    // Vier hoekpunten van een vierkant, als triangle-strip — één keer
    // aangemaakt, nooit instanced (divisor 0, de standaard).
    const nextCornerBuf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, nextCornerBuf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const aCorner = gl.getAttribLocation(prog, 'aCorner')
    gl.enableVertexAttribArray(aCorner)
    gl.vertexAttribPointer(aCorner, 2, gl.FLOAT, false, 0, 0)

    const nextInstanceBuf = gl.createBuffer()
    const STRIDE = FLOATS_PER_INSTANCE * 4

    // Inline (geen losse functie): een geneste closure verliest voor TypeScript
    // de narrowing van `gl` als niet-null die de check hierboven al gaf.
    {
      gl.bindBuffer(gl.ARRAY_BUFFER, nextInstanceBuf)
      const attrs: [string, number, number][] = [
        ['aCenter', 2, 0],
        ['aRadius', 1, 8],
        ['aAngle', 1, 12],
        ['aColor', 3, 16],
        ['aAlpha', 1, 28],
      ]
      for (const [name, size, offset] of attrs) {
        const loc = gl.getAttribLocation(prog, name)
        if (loc < 0) continue
        gl.enableVertexAttribArray(loc)
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, STRIDE, offset)
        gl.vertexAttribDivisor(loc, 1)
      }
    }

    gl.bindVertexArray(null)

    gl.enable(gl.BLEND)
    // ONE, ONE_MINUS_SRC_ALPHA: hoort bij premultiplied-alpha-output in de
    // fragment-shader hierboven — SRC_ALPHA i.p.v. ONE zou dubbel vermenigvuldigen
    // en de rand van elk deeltje zichtbaar te donker maken.
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.clearColor(0, 0, 0, 0)

    program = prog
    uResolution = gl.getUniformLocation(prog, 'uResolution')
    vao = nextVao
    cornerBuf = nextCornerBuf
    instanceBuf = nextInstanceBuf
    // De net aangemaakte GPU-buffer is leeg: forceer een volledige
    // bufferData() bij de eerstvolgende flush() in plaats van de
    // bufferSubData()-kortere weg, die een niet-bestaande allocatie zou
    // aanspreken.
    uploadedCapacity = 0
    return true
  }

  if (!setup(gl)) return null

  const onContextLost = (e: Event) => {
    e.preventDefault()
    contextLost = true
  }
  // Spec-conform herstelpad: dezelfde context blijft geldig, maar alle
  // GPU-resources erop (shaders, program, VAO, buffers) zijn door de browser
  // ongeldig gemaakt en moeten opnieuw aangemaakt — geen nieuwe
  // getContext()-aanroep nodig of mogelijk. Mislukt setup() zelf (zeer
  // zeldzaam), dan blijft de vloot leeg staan in plaats van te crashen.
  const onContextRestored = () => {
    contextLost = !setup(gl)
  }
  canvas.addEventListener('webglcontextlost', onContextLost)
  canvas.addEventListener('webglcontextrestored', onContextRestored)

  function ensureCapacity(needed: number): void {
    if (needed <= capacity) return
    while (capacity < needed) capacity *= 2
    const grown = new Float32Array(capacity * FLOATS_PER_INSTANCE)
    grown.set(buffer.subarray(0, count * FLOATS_PER_INSTANCE))
    buffer = grown
  }

  return {
    get ok() {
      return !contextLost
    },
    reset() {
      count = 0
    },
    push(x, y, r, angle, red, green, blue, alpha) {
      ensureCapacity(count + 1)
      const o = count * FLOATS_PER_INSTANCE
      buffer[o] = x
      buffer[o + 1] = y
      buffer[o + 2] = r
      buffer[o + 3] = angle
      buffer[o + 4] = red
      buffer[o + 5] = green
      buffer[o + 6] = blue
      buffer[o + 7] = alpha
      count++
    },
    resize(cssWidth, cssHeight, dpr) {
      cssW = cssWidth
      cssH = cssHeight
      canvas.width = Math.round(cssWidth * dpr)
      canvas.height = Math.round(cssHeight * dpr)
      gl.viewport(0, 0, canvas.width, canvas.height)
    },
    flush() {
      if (contextLost) return
      gl.bindVertexArray(vao)
      gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuf)
      // Alleen een volledige (her)allocatie als de Float32Array net gegroeid
      // is — capaciteit verandert zelden, dus in de praktijk bijna altijd
      // het veel goedkopere bufferSubData().
      if (capacity !== uploadedCapacity) {
        gl.bufferData(gl.ARRAY_BUFFER, buffer.byteLength, gl.DYNAMIC_DRAW)
        uploadedCapacity = capacity
      }
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, buffer, 0, count * FLOATS_PER_INSTANCE)

      gl.useProgram(program)
      gl.uniform2f(uResolution, cssW, cssH)
      gl.clear(gl.COLOR_BUFFER_BIT)
      if (count > 0) gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count)
      gl.bindVertexArray(null)
    },
    dispose() {
      canvas.removeEventListener('webglcontextlost', onContextLost)
      canvas.removeEventListener('webglcontextrestored', onContextRestored)
      gl.deleteProgram(program)
      gl.deleteBuffer(cornerBuf)
      gl.deleteBuffer(instanceBuf)
      gl.deleteVertexArray(vao)
    },
  }
}
