// Referenzbild-Abgleich: Aus einem fertig bearbeiteten Referenzbild und dem eigenen V-Log-Bild
// wird ein Look-Vorschlag als Reglerwerte berechnet. Verglichen werden Bildstatistiken
// (Tonwertverteilung, Farbstich je Helligkeitsbereich, Sättigung), nicht einzelne Pixel,
// weil die Motive verschieden sind. Das Ergebnis ist ein Startpunkt zum Feinjustieren.
(function (root) {
  'use strict';
  const C = root.LutColor, G = root.LutGrade;

  const PCT = [0.02, 0.1, 0.25, 0.5, 0.75, 0.9, 0.98];

  // Statistik eines fertigen sRGB-Bildes (8-Bit-RGBA).
  function stats(data) {
    const n = data.length / 4;
    const Ls = new Float32Array(n);
    const bandA = [0, 0, 0], bandB = [0, 0, 0], bandN = [0, 0, 0], bandC = [0, 0, 0];
    let sumC = 0;
    const cs = new Float32Array(n);
    for (let i = 0, k = 0; i < data.length; i += 4, k++) {
      const lab = C.linearToOklab(C.srgbDecode(data[i] / 255), C.srgbDecode(data[i + 1] / 255), C.srgbDecode(data[i + 2] / 255));
      const L = lab[0], cc = Math.hypot(lab[1], lab[2]);
      Ls[k] = L; cs[k] = cc; sumC += cc;
      const b = L < 0.4 ? 0 : L < 0.7 ? 1 : 2;
      bandA[b] += lab[1]; bandB[b] += lab[2]; bandN[b]++; bandC[b] += cc;
    }
    Ls.sort(); cs.sort();
    const out = { L: PCT.map((p) => Ls[Math.min(n - 1, Math.floor(p * n))]), a: [], b: [], c: [], meanC: sumC / n, c90: cs[Math.floor(0.9 * (n - 1))] };
    for (let b = 0; b < 3; b++) {
      const m = bandN[b] || 1;
      out.a.push(bandA[b] / m); out.b.push(bandB[b] / m); out.c.push(bandC[b] / m);
      out['n' + b] = bandN[b] / n;
    }
    return out;
  }

  // Abstand zweier Statistiken. Bänder ohne Pixel im Referenzbild werden übersprungen.
  function distance(s, ref) {
    let d = 0;
    for (let i = 0; i < PCT.length; i++) d += 1.0 * Math.pow(s.L[i] - ref.L[i], 2);
    for (let b = 0; b < 3; b++) {
      if (ref['n' + b] < 0.02 || s['n' + b] < 0.02) continue;
      d += 25 * (Math.pow(s.a[b] - ref.a[b], 2) + Math.pow(s.b[b] - ref.b[b], 2));
      d += 6 * Math.pow(s.c[b] - ref.c[b], 2);
    }
    d += 10 * Math.pow(s.meanC - ref.meanC, 2) + 4 * Math.pow(s.c90 - ref.c90, 2);
    return d;
  }

  // Welche Regler der Abgleich bewegen darf, mit Schrittweiten und Grenzen.
  const FREE = [
    { key: 'exposure', step: 0.4, min: -2, max: 2 },
    { key: 'contrast', step: 30, min: -100, max: 100 },
    { key: 'highlights', step: 30, min: -100, max: 100 },
    { key: 'shadows', step: 30, min: -100, max: 100 },
    { key: 'fade', step: 20, min: 0, max: 60 },
    { key: 'whiteMatte', step: 15, min: 0, max: 50 },
    { key: 'temp', step: 25, min: -100, max: 100 },
    { key: 'tint', step: 20, min: -100, max: 100 },
    { key: 'saturation', step: 25, min: -100, max: 100 },
    { key: 'splitShadowHue', step: 60, min: 0, max: 360, circular: true },
    { key: 'splitShadowAmt', step: 25, min: 0, max: 100 },
    { key: 'splitHighHue', step: 60, min: 0, max: 360, circular: true },
    { key: 'splitHighAmt', step: 25, min: 0, max: 100 },
  ];

  // Statistik des V-Log-Bildes nach Anwendung eines Parametersatzes.
  function render(params, src) {
    const grade = G.makeGrader(params);
    const d = src.data, out = new Uint8ClampedArray(d.length);
    for (let i = 0; i < d.length; i += 4) {
      const o = grade(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255);
      out[i] = o[0] * 255; out[i + 1] = o[1] * 255; out[i + 2] = o[2] * 255; out[i + 3] = 255;
    }
    return stats(out);
  }

  // Koordinatenabstieg mit schrumpfenden Schritten. Läuft in Häppchen, damit die
  // Oberfläche nicht einfriert; onProgress(0..1) wird zwischendurch gerufen.
  function fit(src, refStats, startParams, onProgress, onDone) {
    const p = G.normalizeParams(startParams || {});
    p.mono = refStats.meanC < 0.012;
    const scales = [1, 0.5, 0.25];
    const total = scales.length * FREE.length;
    let done = 0;
    let best = distance(render(p, src), refStats);
    const queue = [];
    for (const sc of scales) for (const f of FREE) queue.push([sc, f]);

    function stepOne() {
      if (!queue.length) { onDone(p, best); return; }
      const [sc, f] = queue.shift();
      if (!(p.mono && (f.key === 'saturation'))) {
        for (let tries = 0; tries < 3; tries++) {
          let improved = false;
          for (const dir of [1, -1]) {
            const old = p[f.key];
            let v = old + dir * f.step * sc;
            if (f.circular) v = (v + 360) % 360; else v = Math.min(f.max, Math.max(f.min, v));
            if (v === old) continue;
            p[f.key] = v;
            const d = distance(render(p, src), refStats);
            if (d < best - 1e-9) { best = d; improved = true; break; }
            p[f.key] = old;
          }
          if (!improved) break;
        }
      }
      done++;
      onProgress(done / total);
      setTimeout(stepOne, 0);
    }
    setTimeout(stepOne, 0);
  }

  root.LutMatch = { stats, distance, fit, render, FREE };
})(typeof globalThis !== 'undefined' ? globalThis : this);
