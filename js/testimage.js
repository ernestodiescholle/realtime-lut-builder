// Synthetisches V-Log-Testbild: Farbtafel, Belichtungsreihe und Farbtonverlauf,
// so kodiert, wie die S9 sie im Bildstil V-Log aufzeichnen würde.
(function (root) {
  'use strict';
  const C = root.LutColor;

  // Näherungswerte der klassischen 24-Felder-Farbtafel in sRGB (8 Bit).
  const CHART = [
    [115, 82, 68], [194, 150, 130], [98, 122, 157], [87, 108, 67], [133, 128, 177], [103, 189, 170],
    [214, 126, 44], [80, 91, 166], [193, 90, 99], [94, 60, 108], [157, 188, 64], [224, 163, 46],
    [56, 61, 150], [70, 148, 73], [175, 54, 60], [231, 199, 31], [187, 86, 149], [8, 133, 161],
    [243, 243, 242], [200, 200, 200], [160, 160, 160], [122, 122, 121], [85, 85, 85], [52, 52, 52],
  ];

  // Lineares Rec.709-Licht -> V-Log-Codewerte (0..255).
  function toVlog8(r, g, b) {
    const v = C.apply3(C.REC709_TO_VGAMUT, r, g, b);
    return v.map((x) => Math.round(255 * Math.min(1, Math.max(0, C.linearToVlog(Math.max(0, x))))));
  }

  // Wie toVlog8, aber für den gewählten Basis-Bildstil (V-Log, HLG oder fertiges Bild).
  function encoder(baseTag) {
    if (!baseTag || baseTag === 'VLOG' || !root.LutGrade) return toVlog8;
    return (r, g, b) => root.LutGrade.encodeInput(baseTag, Math.max(0, r), Math.max(0, g), Math.max(0, b)).map((x) => Math.round(255 * x));
  }

  function makeTestImage(width, height, baseTag) {
    const toVlog8 = encoder(baseTag);
    width = width || 1500;
    height = height || 1000;
    const cv = document.createElement('canvas');
    cv.width = width; cv.height = height;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(width, height);
    const px = img.data;
    const set = (x, y, rgb) => {
      const i = (y * width + x) * 4;
      px[i] = rgb[0]; px[i + 1] = rgb[1]; px[i + 2] = rgb[2]; px[i + 3] = 255;
    };

    const bg = toVlog8(0.05, 0.05, 0.05);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) set(x, y, bg);

    // Farbtafel (oben, 6 x 4)
    const chartH = Math.round(height * 0.56);
    const cw = Math.floor((width - 40) / 6), ch = Math.floor((chartH - 30) / 4);
    CHART.forEach((srgb, k) => {
      const lin = srgb.map((c) => C.srgbDecode(c / 255));
      const v = toVlog8(lin[0], lin[1], lin[2]);
      const x0 = 20 + (k % 6) * cw, y0 = 20 + Math.floor(k / 6) * ch;
      for (let y = y0 + 6; y < y0 + ch - 6; y++) for (let x = x0 + 6; x < x0 + cw - 6; x++) set(x, y, v);
    });

    // Belichtungsreihe: -8 bis +7 Blenden um Mittelgrau
    const rampY0 = chartH + 10, rampH = Math.round(height * 0.14);
    for (let x = 20; x < width - 20; x++) {
      const stops = -8 + (15 * (x - 20)) / (width - 41);
      const l = 0.18 * Math.pow(2, stops);
      const v = toVlog8(l, l, l);
      for (let y = rampY0; y < rampY0 + rampH; y++) set(x, y, v);
    }

    // Farbtonverlauf: oben gesättigt, unten zum Grau hin; Helligkeit etwa Mittelgrau
    const hueY0 = rampY0 + rampH + 10, hueH = height - hueY0 - 20;
    for (let x = 20; x < width - 20; x++) {
      const h = (360 * (x - 20)) / (width - 41);
      for (let y = hueY0; y < hueY0 + hueH; y++) {
        const t = (y - hueY0) / hueH;
        const Cc = 0.2 * (1 - t);
        const lin = C.oklabToLinear(0.68, Cc * Math.cos((h * Math.PI) / 180), Cc * Math.sin((h * Math.PI) / 180));
        set(x, y, toVlog8(Math.max(0, lin[0]), Math.max(0, lin[1]), Math.max(0, lin[2])));
      }
    }

    ctx.putImageData(img, 0, 0);
    return cv;
  }

  root.LutTestImage = { makeTestImage, toVlog8 };
})(typeof globalThis !== 'undefined' ? globalThis : this);
