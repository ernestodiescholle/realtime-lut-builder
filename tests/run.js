// Mathe-Tests ohne Abhängigkeiten: node tests/run.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = { console };
ctx.globalThis = ctx;
vm.createContext(ctx);
ctx.localStorage = { getItem: () => null, setItem: () => {} };
ctx.navigator = { language: 'de-DE' };
for (const f of ['i18n.js', 'color.js', 'grade.js', 'presets.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), ctx, { filename: f });
}
const { LutColor: C, LutGrade: G, LutPresets: P } = ctx;

let failed = 0, passed = 0;
function check(name, cond, info) {
  if (cond) { passed++; return; }
  failed++;
  console.log(`FEHLER: ${name}${info !== undefined ? ' -> ' + JSON.stringify(info) : ''}`);
}
const near = (a, b, eps) => Math.abs(a - b) <= (eps || 1e-6);

// V-Log
check('V-Log: 18 % Grau = 0.4233', near(C.linearToVlog(0.18), 0.4233, 1e-4), C.linearToVlog(0.18));
check('V-Log: Schwarz = 0.125', near(C.linearToVlog(0), 0.125));
for (const x of [0, 0.005, 0.01, 0.05, 0.18, 1, 10, 40]) {
  // An der Knickstelle (0.01) weichen die beiden Äste der Panasonic-Formel minimal voneinander ab.
  check(`V-Log Hin/Rück ${x}`, near(C.vlogToLinear(C.linearToVlog(x)), x, x === 0.01 ? 1e-5 : 1e-9 + x * 1e-9));
}
check('V-Log stetig an der Knickstelle', near(C.vlogToLinear(0.181 - 1e-9), C.vlogToLinear(0.181), 1e-6));

// Gamut-Matrix: Weiß bleibt Weiß
for (const row of C.VGAMUT_TO_709) check('V-Gamut->709: Zeilensumme 1', near(row[0] + row[1] + row[2], 1, 1e-6), row);
const back = C.mul3(C.VGAMUT_TO_709, C.REC709_TO_VGAMUT);
check('Matrix * Inverse = Einheit', back.every((r, i) => r.every((v, j) => near(v, i === j ? 1 : 0, 1e-9))));

// OKLab
for (const rgb of [[1, 0, 0], [0.2, 0.5, 0.9], [0.18, 0.18, 0.18]]) {
  const lab = C.linearToOklab(...rgb);
  const r2 = C.oklabToLinear(...lab);
  check(`OKLab Hin/Rück ${rgb}`, r2.every((v, i) => near(v, rgb[i], 1e-6)), r2);
}
check('OKLab: Weiß L=1', near(C.linearToOklab(1, 1, 1)[0], 1, 1e-4));

// Tonkurve
const tc = G.makeToneCurve(G.normalizeParams({}));
check('Tonkurve: Mittelgrau', near(tc(0), G.MID_OUT, 1e-9), tc(0));
check('Tonkurve: Weiß bei +6', near(tc(6), 1, 1e-9));
check('Tonkurve: Schwarz bei -7', near(tc(-7), 0, 1e-9));
let prev = -1, mono = true;
for (let t = -9; t <= 9; t += 0.05) { const e = tc(t); if (e < prev - 1e-12) mono = false; prev = e; }
check('Tonkurve monoton', mono);
const slopeAt = (f) => (f(0.001) - f(-0.001)) / 0.002;
check('Tonkurve: Steigung 0.15/Blende', near(slopeAt(tc), 0.15, 2e-3), slopeAt(tc));
const tcHard = G.makeToneCurve(G.normalizeParams({ contrast: 100, highlights: 100, shadows: -100 }));
check('Tonkurve extrem: monoton', (() => { let p = -1; for (let t = -9; t <= 9; t += 0.05) { if (tcHard(t) < p - 1e-12) return false; p = tcHard(t); } return true; })());

// Neutraler Look: 18-%-Grau in V-Log ergibt neutrales Mittelgrau
const gN = G.makeGrader({});
const gv = C.linearToVlog(0.18);
const out = gN(gv, gv, gv);
check('Neutral: Grau bleibt neutral', near(out[0], out[1], 2e-3) && near(out[1], out[2], 2e-3), out);
check('Neutral: Mittelgrau ~0.461', near(out[1], G.MID_OUT, 5e-3), out);

// Grauschutz: Sättigung verstärkt einen leichten Farbstich in Grau kaum, echte Farben schon
const chromaOf = (o) => { const l = C.linearToOklab(...o.map(C.srgbDecode)); return Math.hypot(l[1], l[2]); };
const grayish = [88 / 255, 93 / 255, 101 / 255], colorful = [130 / 255, 106 / 255, 76 / 255];
const gSat = G.makeGrader({ saturation: 60, hsl: { blue: { s: 50 } } });
const ratioGray = chromaOf(gSat(...grayish)) / chromaOf(gN(...grayish));
const ratioColor = chromaOf(gSat(...colorful)) / chromaOf(gN(...colorful));
check('Grauschutz: Grau mit Stich bleibt fast gleich', ratioGray < 1.2, ratioGray);
check('Grauschutz: echte Farbe wird kräftiger', ratioColor > 1.15, ratioColor);
const gDesat = G.makeGrader({ saturation: -60 });
check('Entsättigen wirkt auch auf Grau mit Stich', chromaOf(gDesat(...grayish)) < chromaOf(gN(...grayish)) * 0.6);

// Farbton-Stabilität: kräftiges Orange darf mit steigender Helligkeit nicht nach Gelb wandern
const hueOf = (o) => { const l = C.linearToOklab(...o.map(C.srgbDecode)); return (Math.atan2(l[2], l[1]) * 180 / Math.PI + 360) % 360; };
const hueDiff = (a, b) => { let d = a - b; if (d > 180) d -= 360; if (d < -180) d += 360; return Math.abs(d); };
const orangeAt = (stops) => C.apply3(C.REC709_TO_VGAMUT, ...[0.35, 0.12, 0.015].map((x) => x * Math.pow(2, stops))).map((x) => C.linearToVlog(Math.max(0, x)));
const gFree = G.makeGrader({ hueStability: 0, contrast: 30 }), gLock = G.makeGrader({ hueStability: 100, contrast: 30 });
const driftFree = hueDiff(hueOf(gFree(...orangeAt(2.5))), hueOf(gFree(...orangeAt(0.5))));
const driftLock = hueDiff(hueOf(gLock(...orangeAt(2.5))), hueOf(gLock(...orangeAt(0.5))));
check('Farbton-Stabilität: freie Kurve wandert in den Lichtern', driftFree > 10, driftFree);
check('Farbton-Stabilität: 100 hält den Farbton über 2 Blenden', driftLock < 2, driftLock);
const inHue = (() => { const l = C.linearToOklab(0.35, 0.12, 0.015); return (Math.atan2(l[2], l[1]) * 180 / Math.PI + 360) % 360; })();
check('Farbton-Stabilität: gehaltener Farbton nahe am Eingang', hueDiff(hueOf(gLock(...orangeAt(0.5))), inHue) < 5, [hueOf(gLock(...orangeAt(0.5))), inHue]);
const gLockGray = G.makeGrader({ hueStability: 100 })(gv, gv, gv);
check('Farbton-Stabilität: Grau bleibt neutral', near(gLockGray[0], gLockGray[1], 2e-3) && near(gLockGray[1], gLockGray[2], 2e-3));

// Mitteltöne-Farbrad: wirkt auf Mittelgrau, kaum auf Schwarz und Weiß
const gMid = G.makeGrader({ splitMidHue: 30, splitMidAmt: 100 });
const midC = chromaOf(gMid(gv, gv, gv));
const blackC = chromaOf(gMid(0.14, 0.14, 0.14));
const whiteC = chromaOf(gMid(0.95, 0.95, 0.95));
check('Mitteltöne-Rad färbt Mittelgrau', midC > 0.03, midC);
check('Mitteltöne-Rad lässt Schwarz/Weiß fast neutral', blackC < midC * 0.25 && whiteC < midC * 0.25, [blackC, whiteC]);

// Tetraedrische Interpolation: Gitterpunkte exakt, Vorschau = sampleLut, Genauigkeit zwischen den Punkten
const lutT = G.buildLut({}, 17);
const gridHit = G.sampleLut(lutT, 8 / 16, 4 / 16, 12 / 16);
const gridRef = gN(8 / 16, 4 / 16, 12 / 16);
check('sampleLut: Gitterpunkt exakt', gridHit.every((v, i) => near(v, gridRef[i], 1e-6)), [gridHit, gridRef]);
const srcT = new Uint8ClampedArray([200, 90, 40, 255, 60, 140, 220, 255, 128, 128, 128, 255]);
const dstT = new Uint8ClampedArray(srcT.length);
G.applyLut(lutT, srcT, dstT);
let sameAsSample = true;
for (let i = 0; i < srcT.length; i += 4) {
  const s = G.sampleLut(lutT, srcT[i] / 255, srcT[i + 1] / 255, srcT[i + 2] / 255);
  for (let c = 0; c < 3; c++) if (Math.abs(dstT[i + c] - s[c] * 255) > 1) sameAsSample = false;
}
check('applyLut entspricht sampleLut', sameAsSample);

// Punktkurven
const fId = G.curveFn([[0, 0], [1, 1]]);
check('Kurve: Identität', [0, 0.25, 0.5, 0.9].every((x) => near(fId(x), x, 1e-9)));
const fS = G.curveFn([[0, 0], [0.25, 0.18], [0.5, 0.5], [0.75, 0.82], [1, 1]]);
check('Kurve: geht durch die Punkte', near(fS(0.25), 0.18, 1e-9) && near(fS(0.75), 0.82, 1e-9) && near(fS(0.5), 0.5, 1e-9));
let mono2 = true, prev2 = -1;
for (let x = 0; x <= 1; x += 0.005) { const y = fS(x); if (y < prev2 - 1e-12) mono2 = false; prev2 = y; }
check('Kurve: monoton ohne Überschwingen', mono2 && fS(0.1) >= 0 && fS(0.95) <= 1);
const fFlat = G.curveFn([[0, 0], [0.4, 0.5], [0.6, 0.5], [1, 1]]);
check('Kurve: flaches Stück bleibt flach', near(fFlat(0.5), 0.5, 1e-9) && fFlat(0.45) >= 0.5 - 1e-9 && fFlat(0.55) <= 0.5 + 1e-9);
check('Kurve: normalize verwirft Unsinn', G.isIdentityCurve(G.normalizeCurve([[0.3, 0.2]])) && G.isIdentityCurve(G.normalizeCurve(null)));
check('Kurve: normalize sortiert und klemmt', JSON.stringify(G.normalizeCurve([[1, 1], [0.5, 1.4], [0, 0]])) === '[[0,0],[0.5,1],[1,1]]');
const gCurveId = G.makeGrader({ curves: G.identityCurves() });
check('Kurven: Identität ändert nichts', gCurveId(gv, gv, gv).every((v, i) => near(v, gN(gv, gv, gv)[i], 1e-9)));
const gLum = G.makeGrader({ curves: { lum: [[0, 0], [0.46, 0.6], [1, 1]] } });
const oLum = gLum(gv, gv, gv);
check('Luminanz-Kurve hellt Mittelgrau auf', oLum[1] > G.MID_OUT + 0.08 && near(oLum[0], oLum[1], 2e-3) && near(oLum[1], oLum[2], 2e-3), oLum);
const gRedCurve = G.makeGrader({ curves: { r: [[0, 0.15], [1, 1]] } });
const oRed = gRedCurve(gv, gv, gv), oRef = gN(gv, gv, gv);
check('R-Kurve wirkt nur auf Rot', oRed[0] > oRef[0] + 0.02 && near(oRed[1], oRef[1], 1e-6) && near(oRed[2], oRef[2], 1e-6), [oRed, oRef]);
const normC = G.normalizeParams({ curves: { lum: [[0, 0], [0.5, 0.6], [1, 1]] } });
check('normalizeParams: fehlende Kurven werden Identität', G.isIdentityCurve(normC.curves.r) && normC.curves.lum.length === 3);
check('normalizeParams: alte Looks ohne curves laufen', G.normalizeParams({ contrast: 10 }).curves.lum.length === 2);

// Hauttonschutz: Hautton bleibt bei kräftiger Sättigung fast unverändert, Blau nicht
const skinV = C.apply3(C.REC709_TO_VGAMUT, 0.42, 0.22, 0.13).map((x) => C.linearToVlog(Math.max(0, x)));
const blueV = C.apply3(C.REC709_TO_VGAMUT, 0.15, 0.2, 0.4).map((x) => C.linearToVlog(Math.max(0, x)));
const gSatOnly = G.makeGrader({ saturation: 60, hsl: { orange: { h: 40 } } });
const gSatSkin = G.makeGrader({ saturation: 60, hsl: { orange: { h: 40 } }, skinProtect: 100 });
const cSkinRef = chromaOf(gN(...skinV)), cSkinSat = chromaOf(gSatOnly(...skinV)), cSkinProt = chromaOf(gSatSkin(...skinV));
check('Hauttonschutz: ohne Schutz wird Haut kräftiger', cSkinSat > cSkinRef * 1.2, [cSkinRef, cSkinSat]);
check('Hauttonschutz: mit Schutz bleibt Haut nahe am Original', Math.abs(cSkinProt - cSkinRef) < (cSkinSat - cSkinRef) * 0.25, [cSkinRef, cSkinProt]);
check('Hauttonschutz: Farbton von Haut bleibt', hueDiff(hueOf(gSatSkin(...skinV)), hueOf(gN(...skinV))) < 3, [hueOf(gSatSkin(...skinV)), hueOf(gN(...skinV))]);
check('Hauttonschutz: Blau wird weiterhin kräftiger', chromaOf(gSatSkin(...blueV)) > chromaOf(gN(...blueV)) * 1.1);

// Weißabgleich wie an der Kamera
check('Kelvin: 5500 K ist neutral', G.kelvinGains(5500).every((v) => near(v, 1, 1e-9)));
const g32 = G.kelvinGains(3200), g75 = G.kelvinGains(7500);
check('Kelvin: 3200 K kühlt (mehr Blau als Rot)', g32[2] > g32[0] * 1.3, g32);
check('Kelvin: 7500 K wärmt', g75[0] > g75[2] * 1.1, g75);
check('Kelvin: Luminanz bleibt', near(0.2126 * g32[0] + 0.7152 * g32[1] + 0.0722 * g32[2], 1, 1e-9));
const oK = G.makeGrader({ wbKelvin: 3200 })(gv, gv, gv);
check('Kelvin 3200 macht Grau blau', oK[2] > oK[0] + 0.05, oK);
check('Feinkorrektur A3 wärmt', (() => { const o = G.makeGrader({ wbAB: 3 })(gv, gv, gv); return o[0] > o[2] + 0.01; })());
check('Feinkorrektur G3 grünt', (() => { const o = G.makeGrader({ wbGM: -3 })(gv, gv, gv); return o[1] > o[0] + 0.005 && o[1] > o[2] + 0.005; })());
{
  // Pipette: Kelvin per Suche + Tönung neutralisiert einen kräftigen Warmstich
  const warm = [0.3, 0.22, 0.14];
  let lo = 2000, hi = 15000;
  for (let i = 0; i < 30; i++) { const K = Math.sqrt(lo * hi); const kg = G.kelvinGains(K); if ((warm[0] * kg[0]) / (warm[2] * kg[2]) < 1) lo = K; else hi = K; }
  const K = Math.sqrt(lo * hi), kg = G.kelvinGains(K);
  const tint = (-100 * Math.log2((warm[0] * kg[0]) / (warm[1] * kg[1]))) / 0.25;
  const v = C.apply3(C.REC709_TO_VGAMUT, ...warm).map((x) => C.linearToVlog(Math.max(0, x)));
  const o = G.makeGrader({ wbKelvin: K, tint })(...v);
  check('Pipette (Kelvin + Tönung) neutralisiert einen Farbstich', near(o[0], o[1], 4e-3) && near(o[1], o[2], 4e-3), [o, K, tint]);
  check('Pipette: Kelvin im Kamera-Bereich', K > 2000 && K < 10000, K);
}
check('normalizeParams: alte Looks ohne Kelvin bleiben neutral', G.normalizeParams({ temp: 5 }).wbKelvin === 5500);

// Haut goldener: rötliche Haut (wie gerötete Wangen) wandert Richtung Orange, anderes bleibt
{
  const pinkSkinV = C.apply3(C.REC709_TO_VGAMUT, 0.30, 0.15, 0.12).map((x) => C.linearToVlog(Math.max(0, x)));
  const hBase = hueOf(gN(...pinkSkinV)), hGold = hueOf(G.makeGrader({ skinGold: 100 })(...pinkSkinV));
  check('Haut goldener: rötliche Haut wird goldener', hGold > hBase + 8 && hGold < 60, [hBase, hGold]);
  const gGold = G.makeGrader({ skinGold: 100 });
  check('Haut goldener: Grau bleibt neutral', (() => { const o = gGold(gv, gv, gv); return near(o[0], o[1], 2e-3) && near(o[1], o[2], 2e-3); })());
  check('Haut goldener: Blau unverändert', hueDiff(hueOf(gGold(...blueV)), hueOf(gN(...blueV))) < 1);
  const redV = C.apply3(C.REC709_TO_VGAMUT, 0.6, 0.02, 0.03).map((x) => C.linearToVlog(Math.max(0, x)));
  check('Haut goldener: kräftiges Rot (Apfel) bleibt rot', hueDiff(hueOf(gGold(...redV)), hueOf(gN(...redV))) < 3, [hueOf(gGold(...redV)), hueOf(gN(...redV))]);
  const sp = G.makeGrader({ saturation: 60, skinProtect: 100 });
  check('Hauttonschutz erfasst auch rötliche Haut', chromaOf(sp(...pinkSkinV)) < chromaOf(gN(...pinkSkinV)) * 1.08, [chromaOf(sp(...pinkSkinV)), chromaOf(gN(...pinkSkinV))]);
}

// --- Basis-Bildstile ----------------------------------------------------------------
check('Basis: Standard ist V-Log', G.normalizeParams({}).baseStyle === 'VLOG');
check('Basis: unbekanntes Tag fällt auf V-Log zurück', G.normalizeParams({ baseStyle: 'XYZ' }).baseStyle === 'VLOG');
check('Basis: Tags eindeutig, ASCII, Großbuchstaben/Ziffern', new Set(G.BASE_STYLES.map((b) => b.tag)).size === G.BASE_STYLES.length && G.BASE_STYLES.every((b) => /^[A-Z0-9]+$/.test(b.tag)));

// HLG nach BT.2100
for (const e of [0, 0.1, 0.3, 0.5, 0.6, 0.75, 0.9, 1]) check(`HLG Hin/Rück ${e}`, near(C.hlgOetf(C.hlgInverseOetf(e)), e, 1e-9));
check('HLG: diffuses Weiß bei 75 % Signal', near(C.hlgOetf(C.HLG_REF_WHITE), 0.75, 1e-9));
check('HLG: 18-%-Grau bei ~38 % Signal', near(G.encodeInput('2100HLGF', 0.18, 0.18, 0.18)[1], 0.378, 3e-3), G.encodeInput('2100HLGF', 0.18, 0.18, 0.18));
check('HLG Video-Pegel: Schwarz bei 16/255', near(G.encodeInput('2100HLG', 0, 0, 0)[0], 16 / 255, 1e-9));
for (const tag of ['2100HLGF', '2100HLG']) {
  const v = G.encodeInput(tag, 0.18, 0.18, 0.18);
  const o = G.makeGrader({ baseStyle: tag })(...v);
  check(`${tag}: Mittelgrau -> Mittelgrau, neutral`, near(o[1], G.MID_OUT, 5e-3) && near(o[0], o[1], 2e-3) && near(o[1], o[2], 2e-3), o);
  const top = G.makeGrader({ baseStyle: tag })(1, 1, 1);
  check(`${tag}: maximales Signal wird Weiß`, top.every((x) => x > 0.98), top);
}
// Kodieren/Dekodieren je Basis
for (const b of G.BASE_STYLES) {
  const col = b.mono ? [0.3, 0.3, 0.3] : [0.35, 0.2, 0.1];
  const back = G.decodeInput(b.tag, ...G.encodeInput(b.tag, ...col));
  check(`Basis ${b.tag}: Kodieren/Dekodieren`, back.every((x, i) => near(x, col[i], 2e-3)), back);
}
// Relative Profile: Grundeinstellung ist exakt neutral (Funktion und 33er-LUT)
for (const b of G.BASE_STYLES.filter((x) => x.mode === 'rel')) {
  const g = G.makeGrader({ baseStyle: b.tag });
  const lut = G.buildLut({ baseStyle: b.tag }, 33);
  let maxF = 0, maxL = 0;
  for (const s of [[0.1, 0.1, 0.1], [0.5, 0.5, 0.5], [0.9, 0.9, 0.9], [0.8, 0.3, 0.2], [0.2, 0.6, 0.3], [0.25, 0.35, 0.85], [0.95, 0.85, 0.2], [0.55, 0.45, 0.4], [1, 0, 0], [0, 0, 1]]) {
    const o = g(...s), l = G.sampleLut(lut, ...s);
    for (let c = 0; c < 3; c++) { maxF = Math.max(maxF, Math.abs(o[c] - s[c])); maxL = Math.max(maxL, Math.abs(l[c] - s[c])); }
  }
  check(`Relativ ${b.tag}: Neutral ändert nichts (Funktion)`, maxF < 1 / 255, maxF * 255);
  check(`Relativ ${b.tag}: Neutral ändert nichts (LUT)`, maxL < 1.5 / 255, maxL * 255);
}
// Relative Tonkurve: monoton, Endpunkte fest, Regler wirken in die richtige Richtung
{
  const rt = (q) => G.makeRelativeTone(G.normalizeParams(q));
  for (const q of [{ contrast: 100 }, { contrast: -100 }, { highlights: 100 }, { highlights: -100 }, { shadows: 100 }, { shadows: -100 }, { contrast: 60, highlights: -80, shadows: 70 }]) {
    const f = rt(q); let prev = -1, mono = true;
    for (let x = 0; x <= 1.0001; x += 0.002) { const y = f(x); if (y < prev - 1e-12) mono = false; prev = y; }
    check(`Relative Tonkurve ${JSON.stringify(q)}: monoton, 0->0, 1->1`, mono && near(f(0), 0, 1e-9) && near(f(1), 1, 1e-9));
  }
  check('Relativ: Kontrast + dunkelt Schatten, hellt Lichter', rt({ contrast: 50 })(0.25) < 0.25 && rt({ contrast: 50 })(0.75) > 0.75);
  check('Relativ: Tiefen + hellt Schatten', rt({ shadows: 60 })(0.2) > 0.2);
  check('Relativ: Lichter − dunkelt Lichter', rt({ highlights: -60 })(0.8) < 0.8);
  check('Relativ: Mittelgrau bleibt bei Kontrast', near(rt({ contrast: 80 })(G.MID_OUT), G.MID_OUT, 1e-9));
  const gs = G.makeGrader({ baseStyle: 'STD', saturation: 40 });
  check('Relativ: Sättigung wirkt', chromaOf(gs(0.7, 0.45, 0.35)) > chromaOf([0.7, 0.45, 0.35]) * 1.15);
  // Genauigkeit des 33er-Gitters bei typischen Einstellungen im relativen Modus
  const pr = { baseStyle: 'NAT', contrast: 40, highlights: -30, shadows: 20, saturation: 25, skinProtect: 40, skinGold: 30, splitShadowAmt: 20, hsl: { green: { h: -20, s: -30 }, blue: { s: 20 } } };
  const lr = G.buildLut(pr, 33), gr = G.makeGrader(pr);
  let meDay = 0, meEdge = 0;
  for (let i = 0; i < 400; i++) {
    const s = [((i * 37) % 97) / 96, ((i * 53) % 89) / 88, ((i * 71) % 83) / 82];
    const a = G.sampleLut(lr, ...s), b2 = gr(...s);
    const e = Math.max(...a.map((v, c) => Math.abs(v - b2[c])));
    // Alltagsfarbe: im Ausgangsbild nicht am Farbraumrand
    const lin = G.decodeInput('NAT', ...s), mx = Math.max(...lin), mn = Math.min(...lin);
    if (mn > 0.02 && mx / mn < 4) meDay = Math.max(meDay, e); else meEdge = Math.max(meEdge, e);
  }
  check('Relativ: 33er-LUT trifft die Funktion bei Alltagsfarben (< 4/255)', meDay < 4 / 255, meDay * 255);
  check('Relativ: Farbraumrand bleibt unter 40/255 (Regressionsschutz)', meEdge < 40 / 255, meEdge * 255);
}
// Export-Tag
check('.cube: Tag folgt dem Basis-Bildstil', G.cubeText(G.buildLut({ baseStyle: 'LCLASN' }, 2), 'x', 'LCLASN').split('\n')[1] === '#LUMIXPHOTOSTYLE LCLASN');
check('.cube: ohne Angabe V-Log', G.cubeText(G.buildLut({}, 2), 'x').split('\n')[1] === '#LUMIXPHOTOSTYLE VLOG');

// --- Sprache ----------------------------------------------------------------------
{
  const I = ctx.I18N;
  const ph = (s) => (s.match(/\{(\w+)\}/g) || []).sort().join(',');
  let bad = [];
  for (const [de, en] of Object.entries(I.EN)) if (ph(de) !== ph(en)) bad.push(de);
  check('Übersetzung: Platzhalter stimmen überein', bad.length === 0, bad);
  check('Übersetzung: keine leeren Texte', Object.values(I.EN).every((v) => typeof v === 'string' && v.length > 0));
  check('t(): Deutsch mit Platzhalter', I.t('{n} Bilder geladen', { n: 3 }) === '3 Bilder geladen');
  for (const p of P) {
    check(`Look ${p.id}: englischer Name, Text, Notiz, Gruppe`, !!(p.en && p.en.name && p.en.desc && p.en.note && p.en.group), p.en);
  }
  check('Looks: englische Namen eindeutig', new Set(P.map((p) => p.en.name)).size === P.length);
  check('Looks: deutsche Namen eindeutig', new Set(P.map((p) => p.name)).size === P.length);
  check('Looks: Gruppen zusammenhängend', (() => { const seen = new Set(); let last = null; for (const p of P) { if (p.group !== last) { if (seen.has(p.group)) return false; seen.add(p.group); last = p.group; } } return true; })());
  // Markennamen dürfen in Look-Namen und -Texten nicht vorkommen
  const brands = /fuji|kodak|portra\b|velvia|provia|astia|acros|eterna|reala|superia|ektar|ektachrome|kodachrome|vision ?3|cinestill|agfa|lomo|ilford|tri-?x|hp5|t-?max|delta\s?3200|polaroid|instagram|lightroom|leica/i;
  const offenders = P.filter((p) => brands.test([p.name, p.desc, p.recipe.note, p.en.name, p.en.desc, p.en.note, p.group, p.en.group, p.file].join(' '))).map((p) => p.id);
  check('Looks: keine Markennamen', offenders.length === 0, offenders);
  check('Keine Liste alter IDs im Code (enthielt Markennamen)', ctx.LutPresetAliases === undefined);
}

// Alle Presets: LUT im Wertebereich, Grauachse monoton, keine NaN
check('Presets vorhanden', P.length >= 8);
check('Preset-Dateinamen eindeutig', new Set(P.map((p) => p.file)).size === P.length);
const ids = new Set();
for (const pr of P) {
  check(`Preset-ID eindeutig ${pr.id}`, !ids.has(pr.id)); ids.add(pr.id);
  check(`Preset-Dateiname <= 8 ${pr.file}`, G.sanitizeFileName(pr.file) === pr.file && pr.file.length <= 8, pr.file);
  const keys = Object.keys(G.defaultParams());
  for (const k of Object.keys(pr.params)) check(`Preset ${pr.id}: Parameter ${k} bekannt`, keys.includes(k));
  for (const k of Object.keys(pr.params.hsl || {})) check(`Preset ${pr.id}: Farbbereich ${k} bekannt`, G.BANDS.some((b) => b.key === k));
  check(`Preset ${pr.id}: Rezept vollständig`, ['wb', 'wbShift', 'exposure', 'nr', 'sharpness', 'grain', 'note'].every((k) => typeof pr.recipe[k] === 'string'));
  for (const variant of [pr.params, G.videoVariant(pr.params)]) {
    const lut = G.buildLut(variant, 17);
    let ok = true;
    for (const v of lut.data) if (!(v >= 0 && v <= 1)) { ok = false; break; }
    check(`Preset ${pr.id}: Werte 0..1`, ok);
    let p2 = -1, m = true;
    for (let i = 0; i < 17; i++) {
      const idx = (i + i * 17 + i * 289) * 3;
      const y = 0.2126 * lut.data[idx] + 0.7152 * lut.data[idx + 1] + 0.0722 * lut.data[idx + 2];
      if (y < p2 - 1e-6) m = false;
      p2 = y;
    }
    check(`Preset ${pr.id}: Grauachse monoton`, m);
  }
  // Banding-Prüfung: Die 33er-LUT muss die Farbfunktion zwischen den Gitterpunkten gut treffen
  {
    const lut33 = G.buildLut(pr.params, 33);
    const g = G.makeGrader(pr.params);
    let maxErr = 0;
    const samples = [];
    for (let i = 0; i < 32; i++) { const v = (i + 0.5) / 32; samples.push([v, v, v]); }
    // Alltagsfarben aus dem echten V-Log-Testbild (Haut, Orange, Laub, Asphalt, Weiß) plus Grauachse
    samples.push([0.55, 0.42, 0.33], [0.62, 0.5, 0.3], [0.285, 0.306, 0.296], [0.509, 0.418, 0.298], [0.347, 0.365, 0.397], [0.48, 0.44, 0.38], [0.79, 0.77, 0.74], [0.437, 0.45, 0.476]);
    for (const s of samples) {
      const a = G.sampleLut(lut33, ...s), b = g(...s);
      for (let c = 0; c < 3; c++) maxErr = Math.max(maxErr, Math.abs(a[c] - b[c]));
    }
    check(`Preset ${pr.id}: 33er-LUT trifft die Kurve bei Alltagsfarben (max. Fehler < 6/255)`, maxErr < 6 / 255, maxErr * 255);
    // Kräftige Farben nahe der Gamut-Grenze: dort glättet das 33er-Gitter die Funktion (Regressionsschutz)
    let satErr = 0;
    for (const s of [[0.36, 0.4, 0.36], [0.4, 0.46, 0.4], [0.45, 0.5, 0.62], [0.6, 0.5, 0.38], [0.45, 0.52, 0.4]]) {
      const a = G.sampleLut(lut33, ...s), b = g(...s);
      for (let c = 0; c < 3; c++) satErr = Math.max(satErr, Math.abs(a[c] - b[c]));
    }
    check(`Preset ${pr.id}: Gamut-Rand bleibt unter 24/255`, satErr < 24 / 255, satErr * 255);
  }
  if (pr.params.mono) {
    const g = G.makeGrader(Object.assign({}, pr.params, { splitShadowAmt: 0, splitHighAmt: 0 }));
    const o = g(0.6, 0.3, 0.4);
    check(`Preset ${pr.id}: Schwarzweiß ohne Tönung ist neutral`, near(o[0], o[1], 2e-3) && near(o[1], o[2], 2e-3), o);
  }
}

// .cube-Format
const lut = G.buildLut({}, 33);
const txt = G.cubeText(lut, 'Chrome Klassik – für die S9');
const lines = txt.trimEnd().split('\n');
check('.cube: Titel ASCII', lines[0] === 'TITLE "Chrome Klassik  fuer die S9"', lines[0]);
check('.cube: LUMIX-Tag direkt unter dem Titel', lines[1] === '#LUMIXPHOTOSTYLE VLOG');
check('.cube: Größe 33', lines[2] === 'LUT_3D_SIZE 33');
check('.cube: 33^3 Datenzeilen', lines.length - 3 === 33 * 33 * 33, lines.length);
check('.cube: nur ASCII', /^[\x0A\x20-\x7E]*$/.test(txt));
check('.cube: Zeilenformat', /^\d\.\d{6} \d\.\d{6} \d\.\d{6}$/.test(lines[1000]), lines[1000]);
// R läuft am schnellsten: Eintrag 24 = (r=24/32, g=0, b=0) muss rot sein, Eintrag 24*33*33 blau
const eR = lines[3 + 24].split(' ').map(Number);
const eB = lines[3 + 24 * 33 * 33].split(' ').map(Number);
check('.cube: R-Achse läuft zuerst', eR[0] > eR[2] && eB[2] > eB[0], [eR, eB]);

// Dateinamen
check('Name: Umlaute', G.sanitizeFileName('Größe Ü') === 'GROESSEU', G.sanitizeFileName('Größe Ü'));
check('Name: max. 8', G.sanitizeFileName('Kunstlicht800') === 'KUNSTLIC');
check('Name: leer', G.sanitizeFileName('!!') === 'MYLUT');

// Vorschau-Anwendung = Farbfunktion (Interpolation an Gitterpunkten exakt)
const src = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255, 255, 0, 0, 255]);
const dst = new Uint8ClampedArray(src.length);
G.applyLut(lut, src, dst);
const gOne = gN(1, 1, 1), gZero = gN(0, 0, 0), gRed = gN(1, 0, 0);
check('applyLut Gitterpunkt schwarz', Math.abs(dst[0] - gZero[0] * 255) <= 1, [dst[0], gZero[0] * 255]);
check('applyLut Gitterpunkt weiß', Math.abs(dst[4] - gOne[0] * 255) <= 1);
check('applyLut Gitterpunkt rot', Math.abs(dst[8] - gRed[0] * 255) <= 1 && Math.abs(dst[10] - gRed[2] * 255) <= 1);
check('applyLut Alpha', dst[3] === 255 && dst[11] === 255);

// Laufzeit der 33er-LUT
const t0 = Date.now();
G.buildLut(P[1].params, 33);
const ms = Date.now() - t0;
check('LUT-Berechnung < 500 ms', ms < 500, ms);

console.log(`${passed} bestanden, ${failed} fehlgeschlagen (33er-LUT in ${ms} ms)`);
process.exit(failed ? 1 : 0);
