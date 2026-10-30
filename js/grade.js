// Look-Engine: Parameter -> Farbfunktion (V-Log/V-Gamut -> fertiges Bild) -> 3D-LUT.
// Die Vorschau wendet dieselbe LUT an, die exportiert wird. Was man sieht, ist also exakt
// das, was in der Kamera landet (bis auf die kamerainterne Verarbeitung).
(function (root) {
  'use strict';
  const C = root.LutColor;

  const MID_GRAY = 0.18;
  const MID_OUT = C.srgbEncode(MID_GRAY); // ~0.461: Mittelgrau bleibt Mittelgrau
  const BASE_SLOPE = 0.15; // Ausgabe-Codewert pro Blende um Mittelgrau (ungefähr wie sRGB)

  // OKLCh-Farbtöne (Grad) der HSL-Bänder.
  const BANDS = [
    { key: 'red', label: 'Rot', hue: 29 },
    { key: 'orange', label: 'Orange', hue: 60 },
    { key: 'yellow', label: 'Gelb', hue: 105 },
    { key: 'green', label: 'Grün', hue: 142 },
    { key: 'aqua', label: 'Türkis', hue: 195 },
    { key: 'blue', label: 'Blau', hue: 255 },
    { key: 'purple', label: 'Lila', hue: 295 },
    { key: 'magenta', label: 'Magenta', hue: 335 },
  ];

  // Basis-Bildstile der S9 (Tag im .cube laut Handbuch). Die Kamera rechnet zuerst diesen
  // Bildstil und legt die LUT darüber.
  //  vlog: exakt (V-Log/V-Gamut-Formeln), hlg: exakt (BT.2100 HLG, BT.2020),
  //  rel:  relativ – das JPEG im jeweiligen Bildstil wird als fertiges sRGB-Bild gelesen;
  //        die LUT verfeinert es nur und ist in Grundeinstellung neutral.
  const BASE_STYLES = [
    { tag: 'VLOG', name: 'V-Log', mode: 'vlog' },
    { tag: '2100HLGF', name: 'Like2100 (HLG) Full Range', mode: 'hlg', full: true },
    { tag: '2100HLG', name: 'Like2100 (HLG)', mode: 'hlg', full: false },
    { tag: 'STD', name: 'Standard', mode: 'rel' },
    { tag: 'NAT', name: 'Natural', mode: 'rel' },
    { tag: 'VIVD', name: 'Vivid', mode: 'rel' },
    { tag: 'LCLASN', name: 'L.ClassicNeo', mode: 'rel' },
    { tag: 'FLAT', name: 'Flat', mode: 'rel' },
    { tag: 'LAND', name: 'Landschaft', mode: 'rel' },
    { tag: 'PORT', name: 'Porträt', mode: 'rel' },
    { tag: 'CNED2', name: 'Cinelike D2', mode: 'rel' },
    { tag: 'CNEV2', name: 'Cinelike V2', mode: 'rel' },
    { tag: '709L', name: 'Like709', mode: 'rel' },
    { tag: 'MONO', name: 'Monochrom', mode: 'rel', mono: true },
    { tag: 'LMONO', name: 'L.Monochrome', mode: 'rel', mono: true },
    { tag: 'LMONOD', name: 'L.Monochrome D', mode: 'rel', mono: true },
    { tag: 'LMONOS', name: 'L.Monochrome S', mode: 'rel', mono: true },
  ];
  const baseInfo = (tag) => BASE_STYLES.find((b) => b.tag === tag) || BASE_STYLES[0];
  // Wie viele Blenden über Mittelgrau der Eingang maximal reicht (für den Weißpunkt der Tonkurve).
  const HLG_STOPS = Math.log2(1 / C.HLG_REF_WHITE / 0.18);

  // Gewichte für Schwarzweiß, entsprechen klassischen Farbfiltern vor dem Objektiv.
  const MONO_FILTERS = {
    none: { label: 'Kein Filter', w: [0.2126, 0.7152, 0.0722] },
    yellow: { label: 'Gelbfilter', w: [0.33, 0.62, 0.05] },
    orange: { label: 'Orangefilter', w: [0.45, 0.5, 0.05] },
    red: { label: 'Rotfilter', w: [0.65, 0.35, 0.0] },
    green: { label: 'Grünfilter', w: [0.15, 0.8, 0.05] },
  };

  function defaultParams() {
    const hsl = {};
    for (const b of BANDS) hsl[b.key] = { h: 0, s: 0, l: 0 };
    return {
      exposure: 0, temp: 0, tint: 0, wbKelvin: 5500, wbAB: 0, wbGM: 0,
      contrast: 0, highlights: 0, shadows: 0, fade: 0, whiteMatte: 0, hueStability: 60,
      saturation: 0, vibrance: 0, skinProtect: 0, skinGold: 0,
      splitShadowHue: 210, splitShadowAmt: 0, splitMidHue: 40, splitMidAmt: 0,
      splitHighHue: 70, splitHighAmt: 0, splitBalance: 0,
      hsl,
      curves: identityCurves(),
      mono: false, monoFilter: 'none',
      baseStyle: 'VLOG',
    };
  }

  // Punktkurven wie in gängiger Bildbearbeitung: x = Eingang nach den Reglern, y = Ausgang (beides 0..1).
  const CURVE_KEYS = ['lum', 'r', 'g', 'b'];
  function identityCurves() {
    return { lum: [[0, 0], [1, 1]], r: [[0, 0], [1, 1]], g: [[0, 0], [1, 1]], b: [[0, 0], [1, 1]] };
  }

  function normalizeCurve(pts) {
    const out = [];
    for (const p of Array.isArray(pts) ? pts : []) {
      if (!Array.isArray(p) || p.length < 2) continue;
      const x = Number(p[0]), y = Number(p[1]);
      if (isNaN(x) || isNaN(y)) continue;
      out.push([clamp(x, 0, 1), clamp(y, 0, 1)]);
    }
    out.sort((a, b) => a[0] - b[0]);
    if (out.length < 2 || out[0][0] > 0.001 || out[out.length - 1][0] < 0.999) return [[0, 0], [1, 1]];
    out[0][0] = 0; out[out.length - 1][0] = 1;
    return out;
  }

  function isIdentityCurve(pts) {
    return pts.length === 2 && pts[0][0] === 0 && pts[0][1] === 0 && pts[1][0] === 1 && pts[1][1] === 1;
  }

  // Monotone kubische Interpolation (Fritsch–Carlson): glatt, kein Überschwingen.
  function curveFn(pts) {
    const n = pts.length;
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const d = [], m = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) {
      const h = xs[i + 1] - xs[i];
      d.push(h > 1e-9 ? (ys[i + 1] - ys[i]) / h : 0);
    }
    if (n === 2) { m[0] = m[1] = d[0]; }
    else {
      m[0] = d[0]; m[n - 1] = d[n - 2];
      for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
      for (let i = 0; i < n - 1; i++) {
        if (Math.abs(d[i]) < 1e-12) { m[i] = 0; m[i + 1] = 0; continue; }
        const a = m[i] / d[i], b = m[i + 1] / d[i], s2 = a * a + b * b;
        if (s2 > 9) { const t = 3 / Math.sqrt(s2); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
      }
    }
    return function (x) {
      if (x <= xs[0]) return ys[0];
      if (x >= xs[n - 1]) return ys[n - 1];
      let i = 0;
      while (i < n - 2 && x > xs[i + 1]) i++;
      const h = xs[i + 1] - xs[i];
      if (h < 1e-9) return ys[i];
      const t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
    };
  }

  // Tabelle mit 1025 Stützstellen für die schnelle Anwendung; null bei Identität.
  function curveTable(pts) {
    if (isIdentityCurve(pts)) return null;
    const f = curveFn(pts), t = new Float32Array(1025);
    for (let i = 0; i <= 1024; i++) t[i] = clamp(f(i / 1024), 0, 1);
    return t;
  }
  function lookup(t, x) {
    const f = clamp(x, 0, 1) * 1024, i = Math.min(1023, f | 0), fr = f - i;
    return t[i] + (t[i + 1] - t[i]) * fr;
  }

  // Fehlende Felder (z. B. aus alten gespeicherten Looks) mit Standardwerten auffüllen.
  function normalizeParams(p) {
    const d = defaultParams();
    const out = Object.assign(d, JSON.parse(JSON.stringify(p || {})));
    out.hsl = defaultParams().hsl;
    for (const b of BANDS) Object.assign(out.hsl[b.key], (p && p.hsl && p.hsl[b.key]) || {});
    const cv = (p && p.curves) || {};
    out.curves = {};
    for (const k of CURVE_KEYS) out.curves[k] = normalizeCurve(cv[k]);
    if (!MONO_FILTERS[out.monoFilter]) out.monoFilter = 'none';
    out.baseStyle = baseInfo(out.baseStyle).tag;
    return out;
  }

  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

  // Farbe eines Lichts mit Farbtemperatur K (Planck/Tageslicht-Näherung nach Kim et al.)
  // als lineares Rec.709-RGB mit Luminanz 1.
  const WB_REFERENCE_K = 5500; // "wie aufgenommen" = neutral
  function kelvinToRgb(K) {
    const T = clamp(K, 1667, 25000);
    const x = T <= 4000
      ? -0.2661239e9 / (T * T * T) - 0.2343589e6 / (T * T) + 0.8776956e3 / T + 0.17991
      : -3.0258469e9 / (T * T * T) + 2.1070379e6 / (T * T) + 0.2226347e3 / T + 0.24039;
    const x2 = x * x, x3 = x2 * x;
    const y = T <= 2222 ? -1.1063814 * x3 - 1.3481102 * x2 + 2.18555832 * x - 0.20219683
      : T <= 4000 ? -0.9549476 * x3 - 1.37418593 * x2 + 2.09137015 * x - 0.16748867
        : 3.081758 * x3 - 5.8733867 * x2 + 3.75112997 * x - 0.37001483;
    const X = x / y, Z = (1 - x - y) / y;
    const rgb = C.apply3(C.XYZ_TO_REC709, X, 1, Z).map((v) => Math.max(1e-6, v));
    const lum = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    return rgb.map((v) => v / lum);
  }

  // Kanalverstärkungen für eine Weißabgleich-Einstellung K: Wer "3200 K" wählt, sagt der
  // Kamera, das Licht sei warm, also wird das Bild kühler (und umgekehrt). Luminanz-neutral.
  function kelvinGains(K) {
    const ref = kelvinToRgb(WB_REFERENCE_K), cur = kelvinToRgb(K);
    const g = [ref[0] / cur[0], ref[1] / cur[1], ref[2] / cur[2]];
    const lum = 0.2126 * g[0] + 0.7152 * g[1] + 0.0722 * g[2];
    return g.map((v) => v / lum);
  }
  const smooth = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  // Findet s mit s / tanh(s*T) = ratio (monoton steigend ab 1/T).
  function solveSlope(T, ratio) {
    if (ratio <= 1 / T + 1e-9) return 1e-4;
    let lo = 1e-4, hi = 20;
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      if (mid / Math.tanh(mid * T) < ratio) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  // Filmische Tonkurve: Blenden relativ zu Mittelgrau -> Ausgabe-Codewert (0..1).
  // Zwei tanh-Äste mit gleicher Steigung im Mittelgrau; Weiß bei +hiStops, Schwarz bei -shStops.
  function makeToneCurve(p, hiBase) {
    const slope = BASE_SLOPE * Math.pow(2, p.contrast / 100);
    const hiStops = (hiBase || 6) - (p.highlights / 100) * 2; // -100 => 2 Blenden mehr Spielraum (weicher)
    const shStops = 7 + (p.shadows / 100) * 2.5; // +100 => Schatten heller
    const sh = solveSlope(hiStops, slope / (1 - MID_OUT));
    const ss = solveSlope(shStops, slope / MID_OUT);
    const black = (p.fade / 100) * 0.15;
    const white = 1 - (p.whiteMatte / 100) * 0.12;
    const thH = Math.tanh(sh * hiStops), thS = Math.tanh(ss * shStops);
    return function (t) {
      let e;
      if (t >= 0) e = t >= hiStops ? 1 : MID_OUT + (1 - MID_OUT) * Math.tanh(sh * t) / thH;
      else e = -t >= shStops ? 0 : MID_OUT - MID_OUT * Math.tanh(ss * -t) / thS;
      return black + e * (white - black);
    };
  }

  // Gamut-Kompression nach dem Muster des ACES-RGC: zieht Farben außerhalb Rec.709 weich herein.
  const GC_THR = 0.9, GC_LIM = 1.3, GC_P = 1.2;
  const GC_S = (GC_LIM - GC_THR) / Math.pow(Math.pow((1 - GC_THR) / (GC_LIM - GC_THR), -GC_P) - 1, 1 / GC_P);
  function gcDist(d) {
    if (d < GC_THR) return d;
    const x = (d - GC_THR) / GC_S;
    return GC_THR + (GC_S * x) / Math.pow(1 + Math.pow(x, GC_P), 1 / GC_P);
  }
  function gamutCompress(rgb) {
    const ach = Math.max(rgb[0], rgb[1], rgb[2]);
    if (ach <= 1e-9) return [0, 0, 0];
    for (let i = 0; i < 3; i++) rgb[i] = ach - gcDist((ach - rgb[i]) / ach) * ach;
    return rgb;
  }

  // Eingangs-Codewerte (0..1) des Basis-Bildstils -> lineares Rec.709 (Szene, 18 % Grau = 0,18
  // bei V-Log/HLG; bei relativen Profilen einfach das dekodierte Bild).
  function decodeInput(tag, r, g, b) {
    const base = baseInfo(tag);
    if (base.mode === 'vlog') {
      return gamutCompress(C.apply3(C.VGAMUT_TO_709, C.vlogToLinear(r), C.vlogToLinear(g), C.vlogToLinear(b)));
    }
    if (base.mode === 'hlg') {
      const dec = (v) => C.hlgInverseOetf(clamp(base.full ? v : (v * 255 - 16) / 219, 0, 1)) / C.HLG_REF_WHITE;
      return gamutCompress(C.apply3(C.REC2020_TO_709, dec(r), dec(g), dec(b)));
    }
    return [C.srgbDecode(r), C.srgbDecode(g), C.srgbDecode(b)];
  }

  // Umkehrung für Testbild und Kurvenanzeige: lineares Rec.709 -> Eingangs-Codewerte.
  function encodeInput(tag, r, g, b) {
    const base = baseInfo(tag);
    if (base.mode === 'vlog') {
      return C.apply3(C.REC709_TO_VGAMUT, r, g, b).map((x) => clamp(C.linearToVlog(Math.max(0, x)), 0, 1));
    }
    if (base.mode === 'hlg') {
      return C.apply3(C.REC709_TO_2020, r, g, b).map((x) => {
        const e = C.hlgOetf(Math.max(0, x) * C.HLG_REF_WHITE);
        return clamp(base.full ? e : (16 + 219 * e) / 255, 0, 1);
      });
    }
    return [r, g, b].map((x) => clamp(C.srgbEncode(x), 0, 1));
  }

  // Relative Tonkurve für fertige Bilder (Standard, Natural …): Identität in Grundeinstellung,
  // überall glatt (keine unendlichen Steigungen). Kontrast als Mischung mit einer S-Kurve um
  // Mittelgrau, Lichter/Tiefen als weiche Biegung des oberen bzw. unteren Abschnitts.
  function makeRelativeTone(p) {
    const pv = MID_OUT;
    const c = (p.contrast / 100) * (p.contrast < 0 ? 0.6 : 1);
    const hh = (p.highlights / 100) * 0.5, ss = (p.shadows / 100) * 0.5;
    const black = (p.fade / 100) * 0.15;
    const white = 1 - (p.whiteMatte / 100) * 0.12;
    const S = (x) => (x < pv ? pv * Math.pow(x / pv, 2) : 1 - (1 - pv) * Math.pow((1 - x) / (1 - pv), 2));
    return function (x) {
      x = clamp(x, 0, 1);
      let y = x + c * (S(x) - x);
      if (y < pv) { const t = y / pv; y = pv * clamp(t + ss * t * (1 - t), 0, 1); }
      else { const t = (y - pv) / (1 - pv); y = pv + (1 - pv) * clamp(t + hh * t * (1 - t), 0, 1); }
      return black + y * (white - black);
    };
  }

  function inGamut(rgb) {
    return rgb[0] >= -1e-5 && rgb[1] >= -1e-5 && rgb[2] >= -1e-5 &&
      rgb[0] <= 1 + 1e-5 && rgb[1] <= 1 + 1e-5 && rgb[2] <= 1 + 1e-5;
  }

  // Bringt eine OKLCh-Farbe in den darstellbaren Bereich, indem nur die Sättigung sinkt.
  // Ab 70 % der maximal darstellbaren Sättigung wird weich komprimiert statt hart geklemmt:
  // kräftige Farben laufen sanft aus, und die 33er-LUT kann der Funktion besser folgen.
  const GAMUT_KNEE = 0.7;
  function maxChroma(L, h) {
    const ca = Math.cos(h), sa = Math.sin(h);
    let lo = 0, hi = 0.5;
    while (hi < 2 && inGamut(C.oklabToLinear(L, hi * ca, hi * sa))) { lo = hi; hi *= 2; }
    for (let i = 0; i < 12; i++) {
      const k = (lo + hi) / 2;
      if (inGamut(C.oklabToLinear(L, k * ca, k * sa))) lo = k; else hi = k;
    }
    return lo;
  }
  function oklchToLinearClipped(L, Cc, h, keepChroma) {
    L = clamp(L, 0, 1);
    const ca = Math.cos(h), sa = Math.sin(h);
    let rgb = C.oklabToLinear(L, Cc * ca, Cc * sa);
    // Relativer Modus: Sättigung, die schon im Ausgangsbild steckt (keepChroma), bleibt unberührt
    // (Neutral = exakt neutral). Nur was die Regler darüber hinaus hinzufügen, läuft weich aus.
    if (keepChroma != null) {
      if (Cc <= keepChroma + 1e-9 && inGamut(rgb)) return [clamp(rgb[0], 0, 1), clamp(rgb[1], 0, 1), clamp(rgb[2], 0, 1)];
      if (Cc > 1e-6 && !inGamut(C.oklabToLinear(L, (Cc / GAMUT_KNEE) * ca, (Cc / GAMUT_KNEE) * sa))) {
        const cMax = maxChroma(L, h);
        const knee = Math.max(cMax * GAMUT_KNEE, Math.min(keepChroma, cMax));
        if (Cc > knee) {
          const room = cMax - knee;
          const cNew = room > 1e-6 ? knee + room * Math.tanh((Cc - knee) / room) : cMax;
          rgb = C.oklabToLinear(L, cNew * ca, cNew * sa);
        }
      }
      return [clamp(rgb[0], 0, 1), clamp(rgb[1], 0, 1), clamp(rgb[2], 0, 1)];
    }
    // Schneller Vorabtest: Liegt die Farbe auch mit 1/Knie-facher Sättigung noch im Farbraum,
    // ist die Grenze weit genug weg, und die Suche kann entfallen (betrifft die meisten Farben).
    if (Cc > 1e-6 && !inGamut(C.oklabToLinear(L, (Cc / GAMUT_KNEE) * ca, (Cc / GAMUT_KNEE) * sa))) {
      // Maximale Sättigung dieses Farbtons bei dieser Helligkeit (Binärsuche auf der Gamut-Grenze).
      const cMax = maxChroma(L, h), knee = cMax * GAMUT_KNEE;
      if (Cc > knee) {
        const room = cMax - knee;
        const cNew = room > 1e-9 ? knee + room * Math.tanh((Cc - knee) / room) : knee;
        rgb = C.oklabToLinear(L, cNew * ca, cNew * sa);
      }
    }
    return [clamp(rgb[0], 0, 1), clamp(rgb[1], 0, 1), clamp(rgb[2], 0, 1)];
  }

  function bandAdjust(p, hueDeg) {
    const n = BANDS.length;
    let i = n - 1;
    for (let k = 0; k < n; k++) if (hueDeg >= BANDS[k].hue) i = k;
    const j = (i + 1) % n;
    let h0 = BANDS[i].hue, h1 = BANDS[j].hue, h = hueDeg;
    if (h1 <= h0) h1 += 360;
    if (h < h0) h += 360;
    const t = smooth(0, 1, (h - h0) / (h1 - h0));
    const a = p.hsl[BANDS[i].key], b = p.hsl[BANDS[j].key];
    return { h: a.h + (b.h - a.h) * t, s: a.s + (b.s - a.s) * t, l: a.l + (b.l - a.l) * t };
  }

  // Erzeugt die Farbfunktion f(V-Log R,G,B) -> Ausgabe R,G,B (0..1, sRGB/Rec.709-kodiert).
  function makeGrader(params) {
    const p = normalizeParams(params);
    const base = baseInfo(p.baseStyle);
    const relative = base.mode === 'rel';
    const tone = makeToneCurve(p, base.mode === 'hlg' ? HLG_STOPS : 6);
    const relTone = relative ? makeRelativeTone(p) : null;
    const expo = Math.pow(2, p.exposure);
    // Weißabgleich als Verstärkung im linearen Licht, auf gleiche Helligkeit normiert:
    // Kelvin (wie an der Kamera) + Feinkorrektur A–B / G–M (je Stufe wie 6 Regler-Einheiten)
    // + die Regler Temperatur / Tönung.
    const tempAll = clamp(p.temp + p.wbAB * 6, -160, 160), tintAll = clamp(p.tint + p.wbGM * 6, -160, 160);
    const gR = Math.pow(2, (tempAll / 100) * 0.35);
    const gB = Math.pow(2, (-tempAll / 100) * 0.35);
    const gG = Math.pow(2, (-tintAll / 100) * 0.25);
    const kg = kelvinGains(p.wbKelvin);
    const norm = 0.2126 * gR * kg[0] + 0.7152 * gG * kg[1] + 0.0722 * gB * kg[2];
    const gains = [(expo * gR * kg[0]) / norm, (expo * gG * kg[1]) / norm, (expo * gB * kg[2]) / norm];
    const mw = MONO_FILTERS[p.monoFilter].w;
    const mwSum = mw[0] + mw[1] + mw[2];
    const sat = 1 + p.saturation / 100;
    const vib = p.vibrance / 100;
    const deg = Math.PI / 180;
    const sHue = p.splitShadowHue * deg, hHue = p.splitHighHue * deg, mHue = p.splitMidHue * deg;
    const sAmt = (p.splitShadowAmt / 100) * 0.08, hAmt = (p.splitHighAmt / 100) * 0.08;
    const mAmt = (p.splitMidAmt / 100) * 0.08;
    const bal = (p.splitBalance / 100) * 0.6;
    const hueLock = clamp(p.hueStability / 100, 0, 1);
    const skin = clamp(p.skinProtect / 100, 0, 1);
    const skinGold = clamp(p.skinGold / 100, 0, 1);
    const log2mid = (x) => Math.log2(Math.max(x, 1e-7) / MID_GRAY);
    const tLum = curveTable(p.curves.lum);
    const tCh = [curveTable(p.curves.r), curveTable(p.curves.g), curveTable(p.curves.b)];
    const anyCh = tCh.some((t) => t);
    // Punktkurven auf die kodierten Werte nach der Tonkurve: erst die Kanäle, dann Luminanz
    // (als Skalierung aller Kanäle, damit Farbton und Sättigung bleiben).
    const encLum = (e) => 0.2126 * e[0] + 0.7152 * e[1] + 0.0722 * e[2];
    const applyCurves = (e) => {
      if (anyCh) for (let c = 0; c < 3; c++) if (tCh[c]) e[c] = lookup(tCh[c], e[c]);
      if (tLum) {
        const y = encLum(e);
        if (y > 1e-6) {
          const k = lookup(tLum, y) / y;
          for (let c = 0; c < 3; c++) e[c] = clamp(e[c] * k, 0, 1);
        }
      }
      return e;
    };
    // Tonkurve für lineares Licht: filmisch (V-Log/HLG) oder relativ auf dem fertigen Bild.
    const toneFn = relative ? (x) => relTone(C.srgbEncode(x)) : (x) => tone(log2mid(x));
    const toneLum = (y) => { const v = toneFn(y); return tLum ? lookup(tLum, v) : v; };

    return function grade(vr, vg, vb) {
      let rgb = decodeInput(base.tag, vr, vg, vb);
      rgb[0] *= gains[0]; rgb[1] *= gains[1]; rgb[2] *= gains[2];
      if (p.mono) {
        const y = Math.max(0, (mw[0] * rgb[0] + mw[1] * rgb[1] + mw[2] * rgb[2]) / mwSum);
        rgb = [y, y, y];
      }
      // Tonkurve pro Kanal (wie bei Film: helle, gesättigte Farben laufen natürlich aus).
      const e = applyCurves([toneFn(rgb[0]), toneFn(rgb[1]), toneFn(rgb[2])]);

      const lab = C.linearToOklab(C.srgbDecode(e[0]), C.srgbDecode(e[1]), C.srgbDecode(e[2]));
      const inChroma = Math.hypot(lab[1], lab[2]); // Sättigung vor den Farbreglern
      let L = lab[0];
      let a = lab[1], b = lab[2];
      if (!p.mono) {
        let Cc = Math.hypot(a, b);
        const C0 = Cc;
        // Grauschutz: Verstärkungen wirken erst auf echte Farben, damit ein leichter
        // Farbstich in grauen Flächen (Asphalt, Wolken) nicht mitverstärkt wird.
        // Schattenschutz: In tiefen Schatten ist der darstellbare Farbraum winzig; Verstärkungen
        // laufen dort aus, sonst entstehen Plateaus, denen die 33er-LUT nicht folgen kann.
        const guard = smooth(0.02, 0.12, C0) * smooth(0.12, 0.42, L);
        const boost = (f) => (f > 1 ? 1 + (f - 1) * guard : Math.max(0, f));
        let hDeg = (Math.atan2(b, a) / deg + 360) % 360;
        // Farbton-Stabilität: Die Kurve pro Kanal kippt kräftige Farben in den Lichtern
        // (Orange wird gelb). Der Farbton wird teilweise auf den der Luminanz-Kurve gezogen.
        if (hueLock > 0 && C0 > 0.01) {
          const Y = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
          if (Y > 1e-6) {
            const k = C.srgbDecode(toneLum(Y)) / Y;
            const lab2 = C.linearToOklab(rgb[0] * k, rgb[1] * k, rgb[2] * k);
            if (Math.hypot(lab2[1], lab2[2]) > 0.01) {
              const h2 = (Math.atan2(lab2[2], lab2[1]) / deg + 360) % 360;
              let diff = h2 - hDeg;
              if (diff > 180) diff -= 360; else if (diff < -180) diff += 360;
              hDeg += diff * hueLock * smooth(0.01, 0.04, C0);
            }
          }
        }
        const h0 = hDeg, hLocked = hDeg;
        const adj = bandAdjust(p, hDeg);
        const cw = smooth(0, 0.05, C0);
        const cwL = smooth(0.02, 0.12, C0);
        hDeg += (adj.h / 100) * 30 * cw;
        Cc *= boost(1 + (adj.s / 100) * cw);
        L *= 1 + (adj.l / 100) * 0.25 * cwL;
        Cc *= boost(sat);
        Cc *= boost(1 + vib * (1 - Math.min(1, Cc / 0.25)));
        // Hautbereich: OKLCh ~15–75° (rötliche bis goldene Haut), mittlere Sättigung.
        // Kräftige Rottöne (Äpfel, Lippenstift) liegen über der Sättigungsgrenze und bleiben frei.
        let dSkin = h0 - 42; if (dSkin > 180) dSkin -= 360; else if (dSkin < -180) dSkin += 360;
        const skinW = (1 - smooth(15, 50, Math.abs(dSkin))) * smooth(0.01, 0.06, C0) * (1 - smooth(0.11, 0.17, C0));
        // Hauttonschutz: Farbton-, Sättigungs- und Helligkeitsänderungen dieses Blocks abschwächen.
        if (skin > 0 && skinW > 0) {
          const w = skin * skinW;
          let dd = hDeg - hLocked; if (dd > 180) dd -= 360; else if (dd < -180) dd += 360;
          hDeg = hLocked + dd * (1 - w);
          Cc = C0 + (Cc - C0) * (1 - w);
          L = lab[0] + (L - lab[0]) * (1 - w);
        }
        // Haut goldener: Hauttöne sanft Richtung 55° (warmes Orange) ziehen, wie es Porträtfilme tun.
        if (skinGold > 0 && skinW > 0) {
          let dg = 55 - hDeg; if (dg > 180) dg -= 360; else if (dg < -180) dg += 360;
          hDeg += dg * skinGold * skinW * 0.8;
        }
        a = Cc * Math.cos(hDeg * deg);
        b = Cc * Math.sin(hDeg * deg);
      }
      // Split Toning: Schatten und Lichter getrennt einfärben (wirkt auch auf Schwarzweiß).
      const lt = clamp(L, 0, 1);
      const ws = Math.pow(1 - smooth(0, 1, lt), 1.5) * (1 - bal) * Math.min(1, lt / 0.12);
      const wh = Math.pow(smooth(0, 1, lt), 1.5) * (1 + bal);
      const wm = Math.pow(4 * lt * (1 - lt), 2);
      a += sAmt * ws * Math.cos(sHue) + hAmt * wh * Math.cos(hHue) + mAmt * wm * Math.cos(mHue);
      b += sAmt * ws * Math.sin(sHue) + hAmt * wh * Math.sin(hHue) + mAmt * wm * Math.sin(mHue);

      const out = oklchToLinearClipped(L, Math.hypot(a, b), Math.atan2(b, a), relative ? inChroma : null);
      return [C.srgbEncode(out[0]), C.srgbEncode(out[1]), C.srgbEncode(out[2])];
    };
  }

  // 3D-LUT im .cube-Layout: R läuft am schnellsten, dann G, dann B.
  function buildLut(params, size) {
    size = size || 33;
    const grade = makeGrader(params);
    const data = new Float32Array(size * size * size * 3);
    let o = 0;
    for (let bi = 0; bi < size; bi++) {
      for (let gi = 0; gi < size; gi++) {
        for (let ri = 0; ri < size; ri++) {
          const out = grade(ri / (size - 1), gi / (size - 1), bi / (size - 1));
          data[o++] = out[0]; data[o++] = out[1]; data[o++] = out[2];
        }
      }
    }
    return { size, data };
  }

  // Für Video: etwas weicher, mehr Spielraum in den Lichtern, minimal weniger Sättigung.
  function videoVariant(params) {
    const p = normalizeParams(params);
    p.contrast -= 15;
    p.highlights -= 30;
    p.saturation -= 5;
    return p;
  }

  // S9: Dateiname nur alphanumerisch, auf FAT32-Karten maximal 8 Zeichen.
  function sanitizeFileName(name, maxLen) {
    maxLen = maxLen || 8;
    const s = String(name || '')
      .replace(/ß/g, 'SS').replace(/Ä/g, 'AE').replace(/Ö/g, 'OE').replace(/Ü/g, 'UE')
      .replace(/ä/g, 'AE').replace(/ö/g, 'OE').replace(/ü/g, 'UE')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, maxLen);
    return s || 'MYLUT';
  }

  function asciiTitle(title) {
    const t = String(title || 'LUT')
      .replace(/ß/g, 'ss').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
      .replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^\x20-\x7E]/g, '').replace(/"/g, "'").trim();
    return t || 'LUT';
  }

  // .cube-Text für die S9: Titel, dann das Panasonic-Tag für den Basis-Bildstil.
  function cubeText(lut, title, baseTag) {
    const lines = [`TITLE "${asciiTitle(title)}"`, `#LUMIXPHOTOSTYLE ${baseInfo(baseTag).tag}`, `LUT_3D_SIZE ${lut.size}`];
    const d = lut.data;
    for (let i = 0; i < d.length; i += 3) {
      lines.push(`${d[i].toFixed(6)} ${d[i + 1].toFixed(6)} ${d[i + 2].toFixed(6)}`);
    }
    return lines.join('\n') + '\n';
  }

  // Tetraedrische Interpolation (wie in Kameras und Grading-Software üblich):
  // Der Würfel wird je nach Reihenfolge von dr, dg, db in einen von sechs Tetraedern zerlegt.
  // Schreibt das Ergebnis für Kanal c (0..2) als Wert 0..1.
  function tetra(d, i000, i100, i010, i001, i110, i101, i011, i111, dr, dg, db, c) {
    const v0 = d[i000 + c];
    if (dr >= dg) {
      if (dg >= db) return v0 + dr * (d[i100 + c] - v0) + dg * (d[i110 + c] - d[i100 + c]) + db * (d[i111 + c] - d[i110 + c]);
      if (dr >= db) return v0 + dr * (d[i100 + c] - v0) + db * (d[i101 + c] - d[i100 + c]) + dg * (d[i111 + c] - d[i101 + c]);
      return v0 + db * (d[i001 + c] - v0) + dr * (d[i101 + c] - d[i001 + c]) + dg * (d[i111 + c] - d[i101 + c]);
    }
    if (db >= dg) return v0 + db * (d[i001 + c] - v0) + dg * (d[i011 + c] - d[i001 + c]) + dr * (d[i111 + c] - d[i011 + c]);
    if (db >= dr) return v0 + dg * (d[i010 + c] - v0) + db * (d[i011 + c] - d[i010 + c]) + dr * (d[i111 + c] - d[i011 + c]);
    return v0 + dg * (d[i010 + c] - v0) + dr * (d[i110 + c] - d[i010 + c]) + db * (d[i111 + c] - d[i110 + c]);
  }

  // Einzelne Farbe (0..1) durch die LUT, Ergebnis 0..1.
  function sampleLut(lut, r, g, b) {
    const n = lut.size, d = lut.data, m = n - 1, n2 = n * n;
    const fr = clamp(r, 0, 1) * m, fg = clamp(g, 0, 1) * m, fb = clamp(b, 0, 1) * m;
    const r0 = Math.min(fr | 0, m - 1), g0 = Math.min(fg | 0, m - 1), b0 = Math.min(fb | 0, m - 1);
    const dr = fr - r0, dg = fg - g0, db = fb - b0;
    const i000 = (r0 + g0 * n + b0 * n2) * 3;
    const i100 = i000 + 3, i010 = i000 + n * 3, i110 = i010 + 3;
    const i001 = i000 + n2 * 3, i101 = i001 + 3, i011 = i001 + n * 3, i111 = i011 + 3;
    const out = [0, 0, 0];
    for (let c = 0; c < 3; c++) out[c] = tetra(d, i000, i100, i010, i001, i110, i101, i011, i111, dr, dg, db, c);
    return out;
  }

  // Anwendung der LUT auf 8-Bit-RGBA-Pixel (Vorschau), tetraedrisch.
  function applyLut(lut, src, dst) {
    const n = lut.size, d = lut.data, m = n - 1;
    const n2 = n * n;
    for (let i = 0; i < src.length; i += 4) {
      const fr = (src[i] / 255) * m, fg = (src[i + 1] / 255) * m, fb = (src[i + 2] / 255) * m;
      const r0 = Math.min(fr | 0, m - 1), g0 = Math.min(fg | 0, m - 1), b0 = Math.min(fb | 0, m - 1);
      const dr = fr - r0, dg = fg - g0, db = fb - b0;
      const i000 = (r0 + g0 * n + b0 * n2) * 3;
      const i100 = i000 + 3, i010 = i000 + n * 3, i110 = i010 + 3;
      const i001 = i000 + n2 * 3, i101 = i001 + 3, i011 = i001 + n * 3, i111 = i011 + 3;
      for (let c = 0; c < 3; c++) {
        dst[i + c] = tetra(d, i000, i100, i010, i001, i110, i101, i011, i111, dr, dg, db, c) * 255; // Uint8ClampedArray rundet selbst
      }
      dst[i + 3] = src[i + 3];
    }
  }

  root.LutGrade = {
    BANDS, MONO_FILTERS, MID_OUT, CURVE_KEYS, identityCurves, normalizeCurve, isIdentityCurve, curveFn,
    WB_REFERENCE_K, kelvinToRgb, kelvinGains,
    BASE_STYLES, baseInfo, decodeInput, encodeInput, makeRelativeTone,
    defaultParams, normalizeParams, makeToneCurve, makeGrader,
    buildLut, videoVariant, sanitizeFileName, asciiTitle, cubeText, applyLut, sampleLut, oklchToLinearClipped,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
