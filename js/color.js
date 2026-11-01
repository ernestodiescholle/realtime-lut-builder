// Farbmathematik: Panasonic V-Log/V-Gamut, gemessener Bildstil Natural, Rec.709/sRGB, OKLab.
// Als klassisches Skript geschrieben, damit index.html auch per Doppelklick (file://) läuft.
(function (root) {
  'use strict';

  // V-Log-Kurve laut Panasonic "V-Log/V-Gamut Reference Manual".
  const VLOG = { cut1: 0.01, cut2: 0.181, b: 0.00873, c: 0.241514, d: 0.598206 };

  function vlogToLinear(v) {
    return v < VLOG.cut2 ? (v - 0.125) / 5.6 : Math.pow(10, (v - VLOG.d) / VLOG.c) - VLOG.b;
  }

  function linearToVlog(x) {
    return x < VLOG.cut1 ? 5.6 * x + 0.125 : VLOG.c * Math.log10(x + VLOG.b) + VLOG.d;
  }

  function srgbEncode(x) {
    if (x <= 0) return 0;
    return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  }

  function srgbDecode(e) {
    if (e <= 0) return 0;
    return e <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4);
  }

  // --- 3x3-Matrizen ---------------------------------------------------------
  function mul3(a, b) {
    const r = [];
    for (let i = 0; i < 3; i++) {
      r[i] = [];
      for (let j = 0; j < 3; j++) r[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j];
    }
    return r;
  }

  function inv3(m) {
    const [a, b, c] = m[0], [d, e, f] = m[1], [g, h, i] = m[2];
    const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
    const det = a * A + b * B + c * C;
    return [
      [A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
      [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
      [C / det, -(a * h - b * g) / det, (a * e - b * d) / det],
    ];
  }

  function apply3(m, r, g, b) {
    return [
      m[0][0] * r + m[0][1] * g + m[0][2] * b,
      m[1][0] * r + m[1][1] * g + m[1][2] * b,
      m[2][0] * r + m[2][1] * g + m[2][2] * b,
    ];
  }

  // RGB->XYZ aus Primärvalenzen (xy) und Weißpunkt.
  function npm(prim, white) {
    const col = ([x, y]) => [x / y, 1, (1 - x - y) / y];
    const R = col(prim[0]), G = col(prim[1]), B = col(prim[2]), W = col(white);
    const M = [[R[0], G[0], B[0]], [R[1], G[1], B[1]], [R[2], G[2], B[2]]];
    const S = apply3(inv3(M), W[0], W[1], W[2]);
    return M.map((row) => [row[0] * S[0], row[1] * S[1], row[2] * S[2]]);
  }

  const D65 = [0.3127, 0.3290];
  const VGAMUT_TO_XYZ = npm([[0.730, 0.280], [0.165, 0.840], [0.100, -0.030]], D65);
  const REC709_TO_XYZ = npm([[0.64, 0.33], [0.30, 0.60], [0.15, 0.06]], D65);
  const XYZ_TO_REC709 = inv3(REC709_TO_XYZ);
  const VGAMUT_TO_709 = mul3(XYZ_TO_REC709, VGAMUT_TO_XYZ);
  const REC709_TO_VGAMUT = inv3(VGAMUT_TO_709);
  const REC2020_TO_XYZ = npm([[0.708, 0.292], [0.170, 0.797], [0.131, 0.046]], D65);
  const REC2020_TO_709 = mul3(XYZ_TO_REC709, REC2020_TO_XYZ);
  const REC709_TO_2020 = inv3(REC2020_TO_709);

  // HLG nach ITU-R BT.2100: Szenenlicht E (0..1) <-> Signal E' (0..1).
  const HLG = { a: 0.17883277, b: 0.28466892, c: 0.55991073 };
  function hlgOetf(E) {
    if (E <= 0) return 0;
    return E <= 1 / 12 ? Math.sqrt(3 * E) : HLG.a * Math.log(12 * E - HLG.b) + HLG.c;
  }
  function hlgInverseOetf(e) {
    if (e <= 0) return 0;
    return e <= 0.5 ? (e * e) / 3 : (Math.exp((e - HLG.c) / HLG.a) + HLG.b) / 12;
  }
  // Diffuses Weiß (100 % Reflexion) liegt bei HLG auf 75 % Signal; dort ist E ~0,265.
  const HLG_REF_WHITE = hlgInverseOetf(0.75);

  // Bildstil Natural der S9: Codewert (0..1, 65 Stützstellen) -> Blenden relativ zu 18 % Grau, je Kanal.
  // Gemessen an 14 Bildpaaren V-Log/Natural mit identischer Belichtung (ISO 640, Weißabgleich fest,
  // alle Regler 0): V-Log nach Panasonics Formel als Referenz. Unterhalb der Messung (~Code 15–19)
  // proportional im linearen Licht fortgesetzt; Code 1 = Clip-Punkt bei ~+4,1 Blenden.
  const NAT_STOPS = {
    r: [-14, -5.2991, -4.2991, -3.7013, -3.2072, -2.8288, -2.6681, -2.4735, -2.3015, -2.1246, -1.938, -1.7615, -1.6007, -1.4617, -1.3291, -1.201, -1.0801, -0.9722, -0.8734, -0.7839, -0.6982, -0.6078, -0.5158, -0.4213, -0.3317, -0.2396, -0.1495, -0.0615, 0.0224, 0.103, 0.1823, 0.2564, 0.3316, 0.4107, 0.4952, 0.58, 0.6614, 0.7416, 0.8194, 0.8973, 0.9776, 1.0613, 1.1483, 1.2402, 1.3411, 1.4486, 1.5572, 1.6661, 1.7723, 1.8765, 1.9852, 2.1044, 2.2378, 2.3757, 2.5081, 2.6379, 2.7671, 2.8962, 3.0208, 3.1408, 3.2623, 3.3873, 3.5072, 3.5917, 4.1],
    g: [-14, -5.2884, -4.2884, -3.6906, -3.1965, -2.9846, -2.7614, -2.5255, -2.3156, -2.1362, -1.9695, -1.8186, -1.6711, -1.5332, -1.4056, -1.2876, -1.1721, -1.057, -0.9434, -0.8335, -0.7268, -0.6239, -0.5204, -0.4244, -0.3357, -0.2525, -0.1698, -0.0804, 0.01, 0.1028, 0.1908, 0.2731, 0.3523, 0.4358, 0.5262, 0.6152, 0.7007, 0.7901, 0.8901, 0.9972, 1.1, 1.1831, 1.2564, 1.3302, 1.4138, 1.5116, 1.6157, 1.7203, 1.8223, 1.9231, 2.0323, 2.1488, 2.2761, 2.4018, 2.5282, 2.6493, 2.775, 2.9013, 3.0248, 3.1343, 3.2399, 3.3413, 3.4394, 3.508, 4.1],
    b: [-14, -5.3735, -4.3735, -3.7756, -3.4308, -3.2157, -2.9555, -2.7268, -2.5241, -2.3474, -2.1741, -2.0084, -1.8526, -1.7176, -1.5985, -1.5148, -1.4516, -1.3759, -1.2615, -1.1123, -0.9711, -0.8429, -0.7141, -0.5921, -0.4728, -0.3732, -0.278, -0.1826, -0.0885, 0.0009, 0.0807, 0.1543, 0.2357, 0.3295, 0.4307, 0.5287, 0.618, 0.7113, 0.8051, 0.9016, 0.9967, 1.092, 1.1856, 1.278, 1.3749, 1.4795, 1.5866, 1.695, 1.8037, 1.9136, 2.0247, 2.1393, 2.2635, 2.3961, 2.5274, 2.6518, 2.7742, 2.9027, 3.0273, 3.1524, 3.2641, 3.3773, 3.4783, 3.5538, 4.1],
  };
  const NAT_CLIP_STOPS = NAT_STOPS.r[64];
  const NAT_N = 64;
  function natToLinear(ch, v) {
    const s = NAT_STOPS[ch];
    if (v <= 0) return 0;
    if (v >= 1) return 0.18 * Math.pow(2, s[NAT_N]);
    const x = v * NAT_N, i = Math.floor(x), f = x - i;
    return 0.18 * Math.pow(2, s[i] + (s[i + 1] - s[i]) * f);
  }
  function linearToNat(ch, x) {
    const s = NAT_STOPS[ch];
    if (x <= 0) return 0;
    const st = Math.log2(x / 0.18);
    if (st <= s[0]) return 0;
    if (st >= s[NAT_N]) return 1;
    let lo = 0, hi = NAT_N;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (s[m] <= st) lo = m; else hi = m; }
    return (lo + (st - s[lo]) / (s[hi] - s[lo])) / NAT_N;
  }

  // --- OKLab (Björn Ottosson) auf linearem sRGB/Rec.709 --------------------
  function linearToOklab(r, g, b) {
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [
      0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
    ];
  }

  function oklabToLinear(L, a, b) {
    const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
    const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
    const s = Math.pow(L - 0.0894841775 * a - 1.2914855480 * b, 3);
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    ];
  }

  // Farbe für UI-Farbfelder: OKLCh-Farbton (Grad) -> CSS-Farbe.
  function hueSwatch(hueDeg, L, C) {
    const h = (hueDeg * Math.PI) / 180;
    const rgb = oklabToLinear(L == null ? 0.72 : L, (C == null ? 0.12 : C) * Math.cos(h), (C == null ? 0.12 : C) * Math.sin(h));
    const to8 = (x) => Math.round(255 * Math.min(1, Math.max(0, srgbEncode(x))));
    return `rgb(${to8(rgb[0])}, ${to8(rgb[1])}, ${to8(rgb[2])})`;
  }

  root.LutColor = {
    VLOG, vlogToLinear, linearToVlog, srgbEncode, srgbDecode,
    mul3, inv3, apply3, npm,
    VGAMUT_TO_709, REC709_TO_VGAMUT, REC709_TO_XYZ, XYZ_TO_REC709, REC2020_TO_709, REC709_TO_2020,
    hlgOetf, hlgInverseOetf, HLG_REF_WHITE,
    NAT_STOPS, NAT_CLIP_STOPS, natToLinear, linearToNat,
    linearToOklab, oklabToLinear, hueSwatch,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
