// Oberfläche: Bilder laden, Look einstellen, Vorschau, Export.
(function () {
  'use strict';
  const G = window.LutGrade, C = window.LutColor, PRESETS = window.LutPresets;
  const I18N = window.I18N;
  const t = I18N.t, tv = I18N.tv;
  const lookText = (p, field) => I18N.look(p, field);
  const $ = (id) => document.getElementById(id);
  const PREVIEW_MAX = 1800; // lange Kante der Vorschau in Pixeln
  const STORE_KEY = 'lutgen.looks.v1';
  // Funktionen, die vorerst ausgeblendet sind. Der Code bleibt, die Oberfläche zeigt sie nicht.
  //  baseStyles: andere Basis-Bildstile als V-Log (HLG, Standard, Natural …)
  const FEATURES = { baseStyles: false };
  const UI_KEY = 'lutgen.ui.v1';

  const state = {
    presetId: 'neutral',
    params: G.normalizeParams({}),
    band: 'red',
    mode: 'look',
    split: 0.5,
    tab: 'edit',
    images: [], // { id, name, src: ImageData, film: canvas, filmSrc: ImageData, thumbSrc: ImageData }
    active: -1,
    out: null,
    lut: null,
    hovering: false,
    preview: { vignette: 0, grain: 0 },
    b: null, // gemerkter Look für den A/B-Vergleich: { params, lut, name }
    fileNameTouched: false,
    titleTouched: false,
  };

  const origCanvas = document.createElement('canvas');
  const lookCanvas = document.createElement('canvas');
  const bCanvas = document.createElement('canvas');
  const view = $('view');
  const current = () => state.images[state.active];
  // Optionale Umleitung früherer Look-IDs (z. B. nach Umbenennungen); standardmäßig leer.
  const ALIASES = window.LutPresetAliases || {};
  const resolveId = (id) => ALIASES[id] || id;
  const preset = () => PRESETS.find((p) => p.id === state.presetId) || PRESETS[0];
  const base = () => G.baseInfo(state.params.baseStyle);
  // Preset-Parameter auf den aktuell gewählten Basis-Bildstil setzen (Presets sind V-Log-Looks).
  const withBase = (params) => Object.assign({}, params, { baseStyle: state.params.baseStyle });

  // --- Hilfen ---------------------------------------------------------------
  let toastTimer = 0;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
  }

  function download(name, text) {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function readUi() {
    try { return JSON.parse(localStorage.getItem(UI_KEY) || '{}'); } catch (e) { return {}; }
  }
  function writeUi(patch) {
    try { localStorage.setItem(UI_KEY, JSON.stringify(Object.assign(readUi(), patch))); } catch (e) { /* egal */ }
  }

  // Skaliert ein Bild auf eine Leinwand, optional mittig auf ein Seitenverhältnis beschnitten.
  function scaled(drawable, w, h, crop) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const sw = drawable.naturalWidth || drawable.width, sh = drawable.naturalHeight || drawable.height;
    let sx = 0, sy = 0, cw = sw, ch = sh;
    if (crop) {
      const r = w / h;
      if (sw / sh > r) { cw = sh * r; sx = (sw - cw) / 2; } else { ch = sw / r; sy = (sh - ch) / 2; }
    }
    // Starke Verkleinerungen stufenweise (höchstens 2× je Schritt): Browser mitteln sonst
    // nicht über alle Pixel, und Thumbnails, Abgleich und Kamera-Vergleich würden verrauschen.
    let src = drawable, ssx = sx, ssy = sy, scw = cw, sch = ch;
    while (scw / w > 2 && sch / h > 2) {
      const tw = Math.ceil(scw / 2), th = Math.ceil(sch / 2);
      const tmp = document.createElement('canvas');
      tmp.width = tw; tmp.height = th;
      const tctx = tmp.getContext('2d');
      tctx.imageSmoothingQuality = 'high';
      tctx.drawImage(src, ssx, ssy, scw, sch, 0, 0, tw, th);
      src = tmp; ssx = 0; ssy = 0; scw = tw; sch = th;
    }
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, ssx, ssy, scw, sch, 0, 0, w, h);
    return cv;
  }
  const dataOf = (cv) => cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, cv.width, cv.height);

  // --- Regler ---------------------------------------------------------------
  const GRAD = {
    temp: 'linear-gradient(90deg, #3f78d8, #9aa7b8 50%, #d9b13e)',
    tint: 'linear-gradient(90deg, #3fae4f, #a0a0a0 50%, #c64fb8)',
    sat: 'linear-gradient(90deg, #808080, #c8504c 40%, #d9b13e 60%, #49a85a 80%, #4a7ed6)',
    expo: 'linear-gradient(90deg, #111, #eee)',
  };

  const SLIDERS = {
    grpLight: [
      { key: 'exposure', label: 'Belichtung', min: -2, max: 2, step: 0.05, decimals: 2, track: GRAD.expo },
      { key: 'contrast', label: 'Kontrast', min: -100, max: 100, step: 1 },
      { key: 'highlights', label: 'Lichter', min: -100, max: 100, step: 1, tip: 'Minus = mehr Reserve in den Lichtern, Plus = härterer Weißpunkt' },
      { key: 'shadows', label: 'Tiefen', min: -100, max: 100, step: 1 },
      { key: 'whiteMatte', label: 'Weiß absenken', min: 0, max: 100, step: 1, unsigned: true, tip: 'Matte Lichter: das hellste Weiß wird grauer' },
      { key: 'fade', label: 'Schwarz anheben', min: 0, max: 100, step: 1, unsigned: true, tip: 'Matte Schatten: das tiefste Schwarz wird grauer' },
      { key: 'hueStability', label: 'Farbton-Stabilität', min: 0, max: 100, step: 1, unsigned: true, tip: 'Hoch: kräftige Farben behalten ihren Farbton in den Lichtern (Orange bleibt Orange). Niedrig: Farben kippen wie bei Film in Richtung Gelb.' },
    ],
    grpWb: [
      { key: 'wbKelvin', label: 'Farbtemperatur', min: 2000, max: 12000, step: 50, fmt: (v) => Math.round(v) + ' K', track: 'linear-gradient(90deg, #3f78d8, #9aa7b8 37%, #d9b13e)', tip: 'Wie der manuelle Weißabgleich an der Kamera: 5500 K = wie aufgenommen, niedriger = kühler, höher = wärmer' },
      { key: 'wbAB', label: 'Feinkorrektur A–B', min: -9, max: 9, step: 1, fmt: (v) => (v > 0 ? 'A' + v : v < 0 ? 'B' + -v : '0'), track: 'linear-gradient(90deg, #3f78d8, #9aa7b8 50%, #d9a24a)', tip: 'Wie die Weißabgleich-Feinkorrektur der Kamera: A = Amber (wärmer), B = Blau (kühler)' },
      { key: 'wbGM', label: 'Feinkorrektur G–M', min: -9, max: 9, step: 1, fmt: (v) => (v > 0 ? 'M' + v : v < 0 ? 'G' + -v : '0'), track: GRAD.tint, tip: 'G = Grün, M = Magenta' },
      { key: 'temp', label: 'Temperatur (fein)', min: -100, max: 100, step: 1, track: GRAD.temp },
      { key: 'tint', label: 'Tönung (fein)', min: -100, max: 100, step: 1, track: GRAD.tint },
    ],
    grpColor: [
      { key: 'vibrance', label: 'Dynamik', min: -100, max: 100, step: 1, track: GRAD.sat },
      { key: 'saturation', label: 'Sättigung', min: -100, max: 100, step: 1, track: GRAD.sat },
      { key: 'skinProtect', label: 'Hauttonschutz', min: 0, max: 100, step: 1, unsigned: true, tip: 'Schirmt Hauttöne (rötlich bis golden, mittlere Sättigung) vor Sättigungs- und Farbtonänderungen ab' },
      { key: 'skinGold', label: 'Haut goldener', min: 0, max: 100, step: 1, unsigned: true, tip: 'Schiebt Hauttöne sanft von Rosa/Rot Richtung warmes Orange, wie Porträtfilme. Gerötete Wangen wirken ruhiger.' },
    ],
    grpGrading: [
      { key: 'splitBalance', label: 'Balance', min: -100, max: 100, step: 1, tip: 'Minus = Schattenfarbe reicht weiter, Plus = Lichterfarbe reicht weiter' },
    ],
  };

  // Nur in der Vorschau, nicht in der LUT
  const PREVIEW_SLIDERS = [
    { key: 'vignette', label: 'Vignette', min: 0, max: 100, step: 1, unsigned: true, previewOnly: true },
    { key: 'grain', label: 'Körnung', min: 0, max: 100, step: 1, unsigned: true, previewOnly: true },
  ];

  const HSL_SLIDERS = [
    { key: 'h', label: 'Farbton', min: -100, max: 100, step: 1 },
    { key: 's', label: 'Sättigung', min: -100, max: 100, step: 1 },
    { key: 'l', label: 'Luminanz', min: -100, max: 100, step: 1 },
  ];

  const SECTION_KEYS = {
    light: ['exposure', 'contrast', 'highlights', 'shadows', 'whiteMatte', 'fade', 'hueStability', 'curves'],
    color: ['wbKelvin', 'wbAB', 'wbGM', 'temp', 'tint', 'vibrance', 'saturation', 'skinProtect', 'skinGold', 'hsl', 'monoFilter'],
    grading: ['splitShadowHue', 'splitShadowAmt', 'splitMidHue', 'splitMidAmt', 'splitHighHue', 'splitHighAmt', 'splitBalance'],
  };

  const controls = [];

  function fmtVal(def, v) {
    if (def.fmt) return def.fmt(v);
    if (def.decimals) return (v > 0 ? '+' : '') + v.toFixed(def.decimals);
    return (v > 0 && !def.unsigned ? '+' : '') + Math.round(v);
  }

  function makeSlider(container, def, get, set) {
    const wrap = document.createElement('div');
    wrap.className = 'slider';
    const id = 'sl_' + Math.random().toString(36).slice(2, 8);
    const head = document.createElement('div');
    head.className = 'head';
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = def.label;
    if (def.tip) label.title = def.tip;
    const val = document.createElement('input');
    val.className = 'val';
    val.setAttribute('aria-label', def.label);
    const input = document.createElement('input');
    Object.assign(input, { type: 'range', id, min: def.min, max: def.max, step: def.step });
    if (def.track) input.style.setProperty('--track', def.track);
    head.append(label, val);
    wrap.append(head, input);
    container.appendChild(wrap);

    const ctl = { input, val, def, get };
    const reset = () => { set(def.reset != null ? def.reset : 0); refreshOne(ctl); if (def.previewOnly) { renderPreview(state.lut, false); writeUi({ preview: state.preview }); } else onParamsChanged(false); };
    input.addEventListener('input', () => { set(Number(input.value)); refreshOne(ctl); if (def.previewOnly) renderPreview(state.lut, false); else onParamsChanged(true); });
    input.addEventListener('change', () => { if (def.previewOnly) writeUi({ preview: state.preview }); else onParamsChanged(false); });
    input.addEventListener('dblclick', reset);
    label.addEventListener('dblclick', reset);
    val.addEventListener('change', () => {
      const raw = val.value.trim().toUpperCase();
      let n = parseFloat(raw.replace(',', '.').replace(/[^0-9.+-]/g, ''));
      if (def.key === 'wbAB' && /^[AB]/.test(raw)) n = (raw[0] === 'A' ? 1 : -1) * Math.abs(n);
      if (def.key === 'wbGM' && /^[GM]/.test(raw)) n = (raw[0] === 'M' ? 1 : -1) * Math.abs(n);
      if (!isNaN(n)) set(Math.min(def.max, Math.max(def.min, n)));
      refreshOne(ctl);
      if (def.previewOnly) { renderPreview(state.lut, false); writeUi({ preview: state.preview }); } else onParamsChanged(false);
    });
    val.addEventListener('keydown', (e) => { if (e.key === 'Enter') val.blur(); });
    controls.push(ctl);
    refreshOne(ctl);
    return ctl;
  }

  function refreshOne(ctl) {
    const v = ctl.get();
    ctl.input.value = v;
    if (document.activeElement !== ctl.val) ctl.val.value = fmtVal(ctl.def, v);
    if (ctl.def.dynTrack) ctl.input.style.setProperty('--track', ctl.def.dynTrack());
  }

  function renderBaseSelect() {
    if (!FEATURES.baseStyles) {
      document.querySelector('.base-row').hidden = true;
      $('baseNote').hidden = true;
      $('tagBefore').textContent = t('Vorher · V-Log');
      return;
    }
    const sel = $('baseStyle');
    if (!sel.options.length) {
      const groups = [['Exakt (Formel bekannt)', (b) => b.mode !== 'rel'], ['Relativ (JPEG im Bildstil)', (b) => b.mode === 'rel']];
      for (const [label, f] of groups) {
        const og = document.createElement('optgroup');
        og.label = label;
        for (const b of G.BASE_STYLES.filter(f)) og.appendChild(new Option(b.name, b.tag));
        sel.appendChild(og);
      }
    }
    const b = base();
    sel.value = b.tag;
    $('tagBefore').textContent = t('Vorher · {name}', { name: t(b.name) });
    const badge = $('baseMode');
    badge.textContent = b.mode === 'rel' ? 'relativ' : 'exakt';
    badge.classList.toggle('rel', b.mode === 'rel');
    const note = $('baseNote');
    if (b.mode === 'rel') {
      note.hidden = false;
      note.textContent = t('Relativer Modus: Lade ein JPEG, das im Bildstil {name} fotografiert ist. Die LUT verfeinert dieses fertige Bild; in Grundeinstellung verändert sie nichts. Die mitgelieferten Looks sind für V-Log abgestimmt und wirken hier kräftiger.', { name: t(b.name) });
    } else if (b.mode === 'hlg') {
      note.hidden = false;
      note.textContent = t('HLG: Lade ein Bild im Bildstil {name}. „Full Range“ und normaler Pegel unterscheiden sich nur in der Tonwertspanne; nimm die Variante, die an der Kamera eingestellt ist.', { name: t(b.name) });
    } else {
      note.hidden = true;
    }
  }

  // Alles, was am Basis-Bildstil hängt (Testbild-Kodierung, Bildprüfung, Rezeptkarte), nachziehen.
  // Wird bei jeder Änderung der Basis aufgerufen, auch durch Rückgängig oder gespeicherte Looks.
  function syncBase() {
    const tag = state.params.baseStyle;
    if (state.syncedBase === tag) return;
    state.syncedBase = tag;
    const ti = state.images.findIndex((im) => im.kind === 'test');
    if (ti >= 0) {
      state.images[ti] = makeImageRecord(window.LutTestImage.makeTestImage(1500, 1000, tag), 'Testbild', 'test');
      renderFilmstrip();
      if (ti === state.active) activate(ti);
    }
    if (current()) checkVlog(current());
    renderRecipe();
    renderPresetThumbs();
  }

  function setBaseStyle(tag) {
    if (tag === state.params.baseStyle) return;
    state.params.baseStyle = G.baseInfo(tag).tag;
    refreshControls();
    onParamsChanged(false);
    toast(t('Basis-Bildstil: {name}', { name: t(base().name) + (base().mode === 'rel' ? ' (' + t('relativ') + ')' : '') }));
  }

  function refreshControls() {
    renderBaseSelect();
    if (state.images.length) syncBase();
    for (const c of controls) refreshOne(c);
    document.body.classList.toggle('mono', state.params.mono);
    for (const b of $('colorMode').children) b.classList.toggle('active', (b.dataset.mono === '1') === state.params.mono);
    $('profileName').textContent = lookText(preset(), 'name');
    renderBandDots();
    renderMonoFilters();
    drawWheels();
    drawCurve();
    for (const b of $('wbPresets').children) {
      const k = Number(b.dataset.k) || G.WB_REFERENCE_K;
      b.classList.toggle('active', state.params.wbKelvin === k && !state.params.wbAB && !state.params.wbGM && (k !== G.WB_REFERENCE_K || (!state.params.temp && !state.params.tint)));
    }
  }

  // Farbverläufe der HSL-Regler passend zum gewählten Farbbereich.
  function bandTrack(kind) {
    const hue = G.BANDS.find((b) => b.key === state.band).hue;
    if (kind === 'h') return `linear-gradient(90deg, ${C.hueSwatch(hue - 35, 0.7, 0.14)}, ${C.hueSwatch(hue, 0.7, 0.14)}, ${C.hueSwatch(hue + 35, 0.7, 0.14)})`;
    if (kind === 's') return `linear-gradient(90deg, ${C.hueSwatch(hue, 0.7, 0)}, ${C.hueSwatch(hue, 0.7, 0.17)})`;
    return `linear-gradient(90deg, ${C.hueSwatch(hue, 0.35, 0.08)}, ${C.hueSwatch(hue, 0.9, 0.08)})`;
  }

  function buildControls() {
    const defaults = G.defaultParams();
    for (const [grp, defs] of Object.entries(SLIDERS)) {
      for (const def of defs) {
        def.reset = defaults[def.key];
        makeSlider($(grp), def, () => state.params[def.key], (v) => { state.params[def.key] = v; });
      }
    }
    Object.assign(state.preview, readUi().preview || {});
    for (const def of PREVIEW_SLIDERS) {
      def.reset = 0;
      makeSlider($('grpPreview'), def, () => state.preview[def.key], (v) => { state.preview[def.key] = v; });
    }
    for (const def of HSL_SLIDERS) {
      def.dynTrack = () => bandTrack(def.key);
      makeSlider($('grpHsl'), def, () => state.params.hsl[state.band][def.key], (v) => { state.params.hsl[state.band][def.key] = v; });
    }
  }

  function renderBandDots() {
    const box = $('bandDots');
    box.textContent = '';
    for (const b of G.BANDS) {
      const a = state.params.hsl[b.key];
      const dot = document.createElement('button');
      dot.className = 'dot' + (b.key === state.band ? ' active' : '') + (a.h || a.s || a.l ? ' changed' : '');
      dot.style.background = C.hueSwatch(b.hue, 0.68, 0.16);
      dot.title = b.label;
      dot.setAttribute('aria-label', b.label);
      dot.addEventListener('click', () => { state.band = b.key; refreshControls(); });
      box.appendChild(dot);
    }
  }

  function renderMonoFilters() {
    const box = $('monoFilters');
    box.textContent = '';
    for (const [k, f] of Object.entries(G.MONO_FILTERS)) {
      const chip = document.createElement('button');
      chip.className = 'chip' + (state.params.monoFilter === k ? ' active' : '');
      chip.textContent = f.label;
      chip.addEventListener('click', () => { state.params.monoFilter = k; renderMonoFilters(); onParamsChanged(false); });
      box.appendChild(chip);
    }
  }

  // --- Farbräder (Color Grading) ---------------------------------------------
  const WHEELS = [
    { el: 'wheelShadow', val: 'wheelShadowVal', hue: 'splitShadowHue', amt: 'splitShadowAmt' },
    { el: 'wheelMid', val: 'wheelMidVal', hue: 'splitMidHue', amt: 'splitMidAmt' },
    { el: 'wheelHigh', val: 'wheelHighVal', hue: 'splitHighHue', amt: 'splitHighAmt' },
  ];
  let wheelBase = null;

  function wheelImage(size) {
    const img = new ImageData(size, size);
    const r = size / 2 - 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - size / 2 + 0.5, dy = size / 2 - y - 0.5;
        const d = Math.hypot(dx, dy);
        const i = (y * size + x) * 4;
        if (d > r + 1) continue;
        const h = Math.atan2(dy, dx);
        const cc = 0.15 * Math.min(1, d / r);
        const lin = C.oklabToLinear(0.66, cc * Math.cos(h), cc * Math.sin(h));
        for (let c = 0; c < 3; c++) img.data[i + c] = 255 * Math.min(1, Math.max(0, C.srgbEncode(Math.max(0, lin[c]))));
        img.data[i + 3] = 255 * Math.min(1, Math.max(0, r + 1 - d));
      }
    }
    return img;
  }

  function drawWheels() {
    for (const w of WHEELS) {
      const cv = $(w.el);
      const ctx = cv.getContext('2d');
      const s = cv.width, r = s / 2 - 2;
      if (!wheelBase) wheelBase = wheelImage(s);
      ctx.putImageData(wheelBase, 0, 0);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(s / 2, s / 2, r, 0, Math.PI * 2); ctx.stroke();
      const hue = (state.params[w.hue] * Math.PI) / 180, amt = state.params[w.amt] / 100;
      const x = s / 2 + Math.cos(hue) * amt * r, y = s / 2 - Math.sin(hue) * amt * r;
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fff';
      ctx.fillStyle = amt > 0 ? C.hueSwatch(state.params[w.hue], 0.66, 0.15) : '#888';
      ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.stroke();
      $(w.val).textContent = `${Math.round(state.params[w.hue])}° · ${Math.round(state.params[w.amt])}`;
    }
  }

  function wireWheels() {
    for (const w of WHEELS) {
      const cv = $(w.el);
      let drag = false;
      const pick = (e) => {
        const rect = cv.getBoundingClientRect();
        const dx = e.clientX - rect.left - rect.width / 2, dy = rect.top + rect.height / 2 - e.clientY;
        const rr = rect.width / 2 - 1;
        state.params[w.hue] = Math.round(((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360);
        state.params[w.amt] = Math.round(Math.min(100, (Math.hypot(dx, dy) / rr) * 100));
        drawWheels();
        onParamsChanged(true);
      };
      cv.addEventListener('pointerdown', (e) => { drag = true; cv.setPointerCapture(e.pointerId); pick(e); });
      cv.addEventListener('pointermove', (e) => { if (drag) pick(e); });
      cv.addEventListener('pointerup', () => { if (drag) { drag = false; onParamsChanged(false); } });
      cv.addEventListener('dblclick', () => { state.params[w.amt] = 0; drawWheels(); onParamsChanged(false); });
    }
  }

  // --- Verlauf (Rückgängig / Wiederholen) -------------------------------------
  const history = { stack: [], index: -1, max: 100, applying: false };
  const snapshot = () => JSON.stringify({ presetId: state.presetId, params: state.params });
  function updateUndoButtons() {
    $('btnUndo').disabled = history.index <= 0;
    $('btnRedo').disabled = history.index >= history.stack.length - 1;
  }
  function commitHistory() {
    if (history.applying) return;
    const s = snapshot();
    if (history.stack[history.index] === s) return;
    history.stack.length = history.index + 1;
    history.stack.push(s);
    if (history.stack.length > history.max) history.stack.shift();
    history.index = history.stack.length - 1;
    updateUndoButtons();
  }
  function restoreSnapshot(s) {
    const o = JSON.parse(s);
    history.applying = true;
    state.presetId = resolveId(o.presetId);
    state.params = G.normalizeParams(o.params);
    markActivePreset();
    renderRecipe();
    refreshControls();
    onParamsChanged(false);
    history.applying = false;
    updateUndoButtons();
  }
  function undo() { if (history.index > 0) { history.index--; restoreSnapshot(history.stack[history.index]); } }
  function redo() { if (history.index < history.stack.length - 1) { history.index++; restoreSnapshot(history.stack[history.index]); } }

  // --- Abschnitte -------------------------------------------------------------
  function wireSections() {
    const ui = readUi();
    const open = ui.open || { light: true, color: true, grading: false, preview: false };
    document.querySelectorAll('.section').forEach((sec) => {
      const key = sec.dataset.sec;
      sec.classList.toggle('open', !!open[key]);
      const head = sec.querySelector('.sec-head');
      head.addEventListener('click', (e) => {
        if (e.target.closest('[data-reset]')) return;
        sec.classList.toggle('open');
        const o = readUi().open || open;
        o[key] = sec.classList.contains('open');
        writeUi({ open: o });
      });
      head.addEventListener('keydown', (e) => {
        if (e.target !== head) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); head.click(); }
      });
    });
    document.querySelectorAll('[data-reset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.reset === 'preview') {
          state.preview = { vignette: 0, grain: 0 };
          writeUi({ preview: state.preview });
          refreshControls();
          renderPreview(state.lut, false);
          toast('Vorschau-Effekte zurückgesetzt');
          return;
        }
        const d = G.defaultParams();
        for (const k of SECTION_KEYS[btn.dataset.reset]) state.params[k] = JSON.parse(JSON.stringify(d[k]));
        refreshControls();
        onParamsChanged(false);
        toast('Zurückgesetzt');
      });
    });
    const subs = [['curveToggle', 'curveWrap', 'curve'], ['mixerToggle', 'mixer', 'mixer']];
    for (const [btnId, boxId, key] of subs) {
      const isOpen = ui[key] != null ? ui[key] : key === 'mixer';
      $(btnId).classList.toggle('open', isOpen);
      $(boxId).classList.toggle('open', isOpen);
      $(btnId).addEventListener('click', () => {
        const o = $(boxId).classList.toggle('open');
        $(btnId).classList.toggle('open', o);
        writeUi({ [key]: o });
        if (key === 'curve') drawCurve();
      });
    }
  }

  // --- Tabs der Werkzeugleiste --------------------------------------------------
  function showTab(tab) {
    state.tab = tab;
    for (const b of $('rail').children) b.classList.toggle('active', b.dataset.tab === tab);
    document.querySelectorAll('.tab').forEach((t) => { t.hidden = t.dataset.tab !== tab; });
    $('panel').scrollTop = 0;
    if (tab === 'looks') renderPresetThumbs();
    if (tab === 'match') updateMatchSource();
  }

  // --- Looks ------------------------------------------------------------------
  const presetEls = new Map();
  const thumbCache = new Map(); // "presetId:imageId" -> ImageData
  const favs = () => new Set((readUi().favs || []).map(resolveId));

  function toggleFav(id) {
    const f = favs();
    if (f.has(id)) f.delete(id); else f.add(id);
    writeUi({ favs: [...f] });
    renderPresets();
    renderPresetThumbs();
  }

  function renderPresets() {
    const box = $('presetGrid');
    box.textContent = '';
    presetEls.clear();
    const f = favs();
    const ordered = [];
    for (const p of PRESETS) if (f.has(p.id)) ordered.push(Object.assign({}, p, { group: 'Favoriten' }));
    for (const p of PRESETS) if (!f.has(p.id)) ordered.push(p);
    const img = current();
    let group = null;
    for (const p of ordered) {
      if (p.group !== group) {
        group = p.group;
        const h = document.createElement('h4');
        h.textContent = group === 'Favoriten' ? t('Favoriten') : I18N.lang === 'en' && p.en && p.en.group ? p.en.group : group;
        box.appendChild(h);
      }
      const btn = document.createElement('button');
      btn.className = 'preset';
      btn.title = lookText(p, 'desc');
      // Suche findet deutsche und englische Namen
      btn.dataset.search = [p.name, p.group, p.desc, p.en && p.en.name, p.en && p.en.group, p.en && p.en.desc].filter(Boolean).join(' ').toLowerCase();
      const thumb = document.createElement('canvas');
      thumb.className = 'thumb';
      thumb.width = 240; thumb.height = 160;
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = lookText(p, 'name');
      const star = document.createElement('button');
      star.className = 'star' + (f.has(p.id) ? ' on' : '');
      star.title = f.has(p.id) ? 'Aus Favoriten entfernen' : 'Als Favorit merken';
      star.setAttribute('aria-label', star.title);
      star.innerHTML = '<svg class="ic"><use href="#i-star"/></svg>';
      star.addEventListener('click', (e) => { e.stopPropagation(); toggleFav(p.id); });
      btn.append(thumb, name, star);
      btn.addEventListener('click', () => applyPreset(p.id));
      btn.addEventListener('mouseenter', () => hoverPreview(p));
      btn.addEventListener('mouseleave', endHover);
      box.appendChild(btn);
      const el = { btn, thumb, rendered: null };
      const cached = img && thumbCache.get(p.id + ':' + img.id + ':' + state.params.baseStyle);
      if (cached) { thumb.getContext('2d').putImageData(cached, 0, 0); el.rendered = img.id; }
      presetEls.set(p.id, el);
    }
    markActivePreset();
    applyLookFilter();
  }

  function applyLookFilter() {
    const q = ($('lookSearch').value || '').trim().toLowerCase();
    const box = $('presetGrid');
    let header = null, visibleInGroup = 0;
    for (const el of box.children) {
      if (el.tagName === 'H4') {
        if (header) header.hidden = visibleInGroup === 0;
        header = el; visibleInGroup = 0;
        continue;
      }
      const show = !q || el.dataset.search.includes(q);
      el.hidden = !show;
      if (show) visibleInGroup++;
    }
    if (header) header.hidden = visibleInGroup === 0;
  }

  function markActivePreset() {
    for (const [id, el] of presetEls) el.btn.classList.toggle('active', id === state.presetId);
  }

  // Vorschaubilder der Looks, nach und nach berechnet, damit die Oberfläche flüssig bleibt.
  let thumbJob = 0;
  function renderPresetThumbs() {
    const img = current();
    if (!img || state.tab !== 'looks') return;
    const job = ++thumbJob;
    const todo = PRESETS.filter((p) => presetEls.get(p.id).rendered !== img.id);
    const step = () => {
      if (job !== thumbJob || !todo.length) return;
      const p = todo.shift();
      const el = presetEls.get(p.id);
      const key = p.id + ':' + img.id + ':' + state.params.baseStyle;
      let out = thumbCache.get(key);
      if (!out) {
        out = new ImageData(img.thumbSrc.width, img.thumbSrc.height);
        G.applyLut(G.buildLut(withBase(p.params), 17), img.thumbSrc.data, out.data);
        thumbCache.set(key, out);
      }
      el.thumb.getContext('2d').putImageData(out, 0, 0);
      el.rendered = img.id;
      setTimeout(step, 0);
    };
    step();
  }

  function hoverPreview(p) {
    if (!current()) return;
    state.hovering = true;
    renderPreview(G.buildLut(withBase(p.params), 17), false);
    $('profileName').textContent = lookText(p, 'name');
  }
  function endHover() {
    if (!state.hovering) return;
    state.hovering = false;
    $('profileName').textContent = lookText(preset(), 'name');
    if (state.lut) renderPreview(state.lut, false);
  }

  function applyPreset(id, params) {
    state.presetId = id;
    const keepBase = FEATURES.baseStyles ? (params && params.baseStyle) || state.params.baseStyle : 'VLOG';
    state.params = G.normalizeParams(Object.assign({}, params || preset().params, { baseStyle: keepBase }));
    state.hovering = false;
    if (!state.fileNameTouched) $('fileName').value = preset().file;
    if (!state.titleTouched) $('lutTitle').value = lookText(preset(), 'name');
    markActivePreset();
    renderRecipe();
    refreshControls();
    onParamsChanged(false);
  }

  // --- Rezeptkarte ----------------------------------------------------------
  function recipeRows() {
    const r = preset().recipe;
    return [
      [t('Bildstil'), t('Real Time LUT (Basis {name}, wird über die LUT gesetzt)', { name: t(base().name) })],
      [t('Weißabgleich'), tv(r.wb)],
      [t('WB-Feinkorrektur (A–B / G–M)'), r.wbShift],
      [t('Belichtungskorrektur'), tv(r.exposure)],
      [t('Rauschminderung'), r.nr],
      [t('Schärfe'), r.sharpness],
      [t('Körnung'), tv(r.grain) + t(' (falls im Bildstil verfügbar)')],
      [t('ISO'), base().mode === 'rel' ? t('Normale Mindest-ISO, niedrige ISO (z. B. 100–200) möglich') : t('In {name} gilt eine höhere Mindest-ISO, dafür möglichst niedrig bleiben', { name: t(base().name) })],
    ];
  }

  function renderRecipe() {
    const box = $('recipe');
    box.textContent = '';
    const table = document.createElement('table');
    for (const [k, v] of recipeRows()) {
      const tr = table.insertRow();
      tr.insertCell().textContent = k;
      tr.insertCell().textContent = v;
    }
    const note = document.createElement('p');
    note.textContent = lookText(preset(), 'note') + t(' Welche Einstellungen im Bildstil Real Time LUT verfügbar sind, hängt von der Firmware ab.');
    box.append(table, note);
  }

  function recipeText(name, videoName) {
    const lines = [
      t('LUT Generator S9 - Rezeptkarte'),
      t('Look: {title} (Ausgangs-Look: {preset})', { title: $('lutTitle').value || lookText(preset(), 'name'), preset: lookText(preset(), 'name') }),
      t('Basis-Bildstil: {name} (Tag {tag})', { name: t(base().name), tag: base().tag + (base().mode === 'rel' ? ', ' + t('relativ') : '') }),
      t('Dateien: {files}', { files: videoName ? t('{name}.cube (Foto), {video}.cube (Video)', { name, video: videoName }) : name + '.cube' }),
      '',
      t('Kamera-Einstellungen:'),
      ...recipeRows().map(([k, v]) => `  ${k}: ${v}`),
      '',
      t('Hinweis: {note}', { note: lookText(preset(), 'note') }),
      '',
      t('LUT laden:'),
      t('  1. .cube-Datei ins Hauptverzeichnis der SD-Karte kopieren.'),
      t('  2. Kamera: MENU > Individual > Bildqualität > LUT-Bibliothek > Speicherplatz wählen > Laden.'),
      t('  3. Bildstil "Real Time LUT" wählen, dann mit der [LUT]-Taste die LUT auswählen.'),
      t('  (Alternativ über die App LUMIX Lab.)'),
      '',
      t('Look-Parameter (zum Nachbauen):'),
      JSON.stringify(state.params, null, 1),
      '',
    ];
    return lines.join('\n');
  }

  // --- Bilder ------------------------------------------------------------------
  let nextId = 1;
  function addImage(drawable, name, kind) {
    state.images.push(makeImageRecord(drawable, name, kind));
    renderFilmstrip();
    return state.images.length - 1;
  }

  function makeImageRecord(drawable, name, kind) {
    const w0 = drawable.naturalWidth || drawable.width, h0 = drawable.naturalHeight || drawable.height;
    const k = Math.min(1, PREVIEW_MAX / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
    const full = scaled(drawable, w, h, false);
    const fh = 128, fw = Math.max(1, Math.round((fh * w) / h));
    const film = document.createElement('canvas');
    film.width = fw; film.height = fh;
    const sw = 96, sh = Math.max(1, Math.round((sw * h) / w));
    const img = {
      id: nextId++, name, kind,
      src: dataOf(full),
      filmSrc: dataOf(scaled(full, fw, fh, false)),
      thumbSrc: dataOf(scaled(full, 240, 160, true)),
      small: dataOf(scaled(full, sw, sh, false)), // für den Referenzbild-Abgleich
      film,
    };
    return img;
  }

  function renderFilmstrip() {
    const box = $('filmstrip');
    box.textContent = '';
    state.images.forEach((img, i) => {
      const b = document.createElement('button');
      b.className = 'film' + (i === state.active ? ' active' : '');
      b.title = img.name;
      b.appendChild(img.film);
      b.addEventListener('click', () => activate(i));
      box.appendChild(b);
    });
  }

  function activate(i) {
    state.active = i;
    const img = current();
    const { width: w, height: h } = img.src;
    for (const cv of [origCanvas, lookCanvas, bCanvas, view]) { cv.width = w; cv.height = h; }
    origCanvas.getContext('2d').putImageData(img.src, 0, 0);
    state.out = new ImageData(w, h);
    $('docName').textContent = img.name;
    [...$('filmstrip').children].forEach((el, j) => el.classList.toggle('active', j === i));
    checkVlog(img);
    if (state.lut) renderPreview(state.lut, false); else onParamsChanged(false);
    renderB();
    renderPresetThumbs();
    updateMatchSource();
  }

  // Vignette und Körnung nur für die Vorschau (nicht Teil der LUT).
  function previewEffects(out) {
    const v = state.preview.vignette / 100, gr = state.preview.grain / 100;
    if (v <= 0 && gr <= 0) return;
    const w = out.width, h = out.height, d = out.data;
    const cx = w / 2, cy = h / 2, rMax = Math.hypot(cx, cy);
    let seed = 12345;
    for (let y = 0; y < h; y++) {
      const dy = (y - cy) / rMax;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        let f = 1;
        if (v > 0) {
          const r = Math.hypot((x - cx) / rMax, dy);
          const t = Math.min(1, Math.max(0, (r - 0.35) / 0.65));
          f = 1 - v * 0.75 * t * t;
        }
        let n = 0;
        if (gr > 0) {
          seed = (seed * 1664525 + 1013904223) >>> 0;
          n = ((seed >>> 8) / 16777216 - 0.5) * gr * 70;
        }
        d[i] = d[i] * f + n; d[i + 1] = d[i + 1] * f + n; d[i + 2] = d[i + 2] * f + n;
      }
    }
  }

  function renderB() {
    const img = current();
    if (!img || !state.b) return;
    const out = new ImageData(img.src.width, img.src.height);
    G.applyLut(state.b.lut, img.src.data, out.data);
    previewEffects(out);
    bCanvas.getContext('2d').putImageData(out, 0, 0);
  }

  function markB() {
    state.b = { params: G.normalizeParams(state.params), lut: G.buildLut(state.params, 33), name: $('lutTitle').value || lookText(preset(), 'name') };
    $('modeB').disabled = false;
    $('modeB').title = t('Gemerkter Look B: {name} (B)', { name: state.b.name });
    renderB();
    toast(t('„{name}“ als B gemerkt. Taste B vergleicht.', { name: state.b.name }));
  }

  // Grobe Prüfung: V-Log hat kein echtes Schwarz (Codewert ~32 von 255).
  function checkVlog(img) {
    const d = img.src.data;
    const hist = new Uint32Array(256);
    let n = 0;
    for (let i = 0; i < d.length; i += 16) { hist[(d[i] * 54 + d[i + 1] * 183 + d[i + 2] * 19) >> 8]++; n++; }
    let acc = 0, p1 = 0, p998 = 255;
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= n * 0.01) { p1 = v; break; } }
    acc = 0;
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= n * 0.998) { p998 = v; break; } }
    // V-Log der S9 hat ein angehobenes Schwarz (Codewert ~32) und erreicht nie volles Weiß
    // (gemessen höchstens ~225). Fertige Bilder (Standard, V-Log mit V709-LUT) haben tiefes
    // Schwarz oder fast volles Weiß.
    const notVlog = p1 < 28 || p998 >= 236;
    const hint = $('hint');
    const b = base();
    if (img.kind === 'test') {
      hint.className = 'hint show';
      hint.textContent = t('Synthetisches Testbild für {name}: Farbtafel, Belichtungsreihe (−8 bis +7 Blenden) und Farbtonverlauf.', { name: t(b.name) });
    } else if (b.mode === 'vlog' && notVlog) {
      hint.className = 'hint show warn';
      hint.textContent = t('„{name}“ sieht nicht nach reinem V-Log aus ({why}). Wahrscheinlich ein fertiges Bild, z. B. Standard oder V-Log mit LUT (V709). Die App würde es doppelt bearbeiten. Bitte im Bildstil V-Log ohne LUT fotografieren.', { name: img.name, why: t(p1 < 28 ? 'zu tiefes Schwarz' : 'fast volles Weiß') });
    } else if (b.mode === 'rel' && !notVlog) {
      hint.className = 'hint show warn';
      hint.textContent = t('„{name}“ sieht nach V-Log aus (flaues Bild), gewählt ist aber „{base}“. Für diesen Basis-Bildstil bitte ein JPEG im Bildstil {base} laden – oder oben V-Log wählen.', { name: img.name, base: t(b.name) });
    } else {
      hint.className = 'hint';
    }
  }

  function loadFiles(fileList) {
    const files = [...(fileList || [])].filter((f) => /^image\//.test(f.type));
    if (!files.length) { toast('Bitte JPEG-Dateien wählen.'); return; }
    let first = -1, done = 0;
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const idx = addImage(img, file.name, 'photo');
        if (first < 0) { first = idx; activate(idx); }
        URL.revokeObjectURL(url);
        if (++done === files.length) { renderFilmstrip(); refreshFilmThumbs(); toast(files.length === 1 ? t('{name} geladen', { name: file.name }) : t('{n} Bilder geladen', { n: files.length })); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); done++; toast(t('{name} konnte nicht gelesen werden.', { name: file.name })); };
      img.src = url;
    });
  }

  // --- Vorschau ---------------------------------------------------------------
  function renderPreview(lut, keep) {
    const img = current();
    if (!img || !lut) return;
    if (keep !== false) state.lut = lut;
    G.applyLut(lut, img.src.data, state.out.data);
    previewEffects(state.out);
    lookCanvas.getContext('2d').putImageData(state.out, 0, 0);
    draw();
    drawHistogram();
  }

  function refreshFilmThumbs() {
    if (!state.lut) return;
    for (const img of state.images) {
      const out = new ImageData(img.filmSrc.width, img.filmSrc.height);
      G.applyLut(state.lut, img.filmSrc.data, out.data);
      img.film.getContext('2d').putImageData(out, 0, 0);
    }
  }

  function draw() {
    if (!current()) return;
    const ctx = view.getContext('2d');
    const w = view.width, h = view.height;
    const line = $('splitLine');
    const showOrig = state.mode === 'orig' && !state.hovering;
    const showB = state.mode === 'b' && state.b && !state.hovering;
    ctx.drawImage(showOrig ? origCanvas : showB ? bCanvas : lookCanvas, 0, 0);
    const split = state.mode === 'split';
    $('viewer').classList.toggle('split', split);
    view.style.cursor = split ? 'ew-resize' : 'default';
    if (split) {
      const x = Math.round(w * state.split);
      ctx.drawImage(origCanvas, 0, 0, x, h, 0, 0, x, h);
      line.style.display = 'block';
      line.style.left = view.offsetLeft + view.clientWidth * state.split + 'px';
      line.style.top = view.offsetTop + 'px';
      line.style.height = view.clientHeight + 'px';
    } else {
      line.style.display = 'none';
    }
  }

  function drawHistogram() {
    const cv = $('histo');
    const ctx = cv.getContext('2d');
    const w = cv.width, h = cv.height;
    const src = state.mode === 'orig' && !state.hovering ? current().src.data : state.out.data;
    const bins = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
    for (let i = 0; i < src.length; i += 12) { bins[0][src[i]]++; bins[1][src[i + 1]]++; bins[2][src[i + 2]]++; }
    let max = 1;
    for (const b of bins) for (let v = 2; v < 254; v++) max = Math.max(max, b[v]);
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    const colors = ['rgba(210,70,70,0.75)', 'rgba(80,190,90,0.75)', 'rgba(70,120,220,0.75)'];
    bins.forEach((b, c) => {
      ctx.fillStyle = colors[c];
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let v = 0; v < 256; v++) ctx.lineTo((v / 255) * w, h - Math.min(1, b[v] / max) * (h - 4));
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
  }

  // Beim Ziehen eine kleine LUT (schnell), danach die volle 33er-LUT.
  // setTimeout statt requestAnimationFrame: läuft auch, wenn das Fenster verdeckt ist.
  let rafId = 0, fullTimer = 0;
  function onParamsChanged(fast) {
    if (!fast) commitHistory();
    clearTimeout(rafId);
    clearTimeout(fullTimer);
    rafId = setTimeout(() => {
      if ($('curveWrap').classList.contains('open')) drawCurve();
      renderBandDots();
      const full = () => { renderPreview(G.buildLut(state.params, 33)); refreshFilmThumbs(); };
      if (fast) {
        renderPreview(G.buildLut(state.params, 17), false);
        fullTimer = setTimeout(full, 250);
      } else {
        full();
      }
    });
  }

  // --- Punktkurven-Editor -------------------------------------------------------
  const CURVE_COLORS = { lum: '#e3e3e3', r: '#d65a5a', g: '#5cc06a', b: '#5a8fe6' };
  const curveUi = { chan: 'lum', drag: -1, pad: 16 };

  function curveGeom() {
    const cv = $('curve');
    return { cv, w: cv.width, h: cv.height, pad: curveUi.pad };
  }
  const curveX = (g, x) => g.pad + x * (g.w - 2 * g.pad);
  const curveY = (g, y) => g.h - g.pad - y * (g.h - 2 * g.pad);

  function drawCurve() {
    const g = curveGeom();
    const ctx = g.cv.getContext('2d');
    const { w, h, pad } = g;
    ctx.clearRect(0, 0, w, h);
    // Raster und Diagonale
    ctx.strokeStyle = '#2b2b2b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const x = curveX(g, i / 4), y = curveY(g, i / 4);
      ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, h - pad); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
    }
    ctx.strokeStyle = '#3a3a3a';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(curveX(g, 0), curveY(g, 0)); ctx.lineTo(curveX(g, 1), curveY(g, 1)); ctx.stroke();
    ctx.setLineDash([]);
    // Inaktive Kurven schwach, aktive kräftig
    const order = G.CURVE_KEYS.filter((k) => k !== curveUi.chan).concat([curveUi.chan]);
    for (const k of order) {
      const pts = state.params.curves[k];
      const active = k === curveUi.chan;
      if (!active && G.isIdentityCurve(pts)) continue;
      const f = G.curveFn(pts);
      ctx.strokeStyle = CURVE_COLORS[k];
      ctx.globalAlpha = active ? 1 : 0.35;
      ctx.lineWidth = active ? 2.5 : 1.5;
      ctx.beginPath();
      for (let i = 0; i <= 120; i++) {
        const x = i / 120, y = Math.min(1, Math.max(0, f(x)));
        if (i === 0) ctx.moveTo(curveX(g, x), curveY(g, y)); else ctx.lineTo(curveX(g, x), curveY(g, y));
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      if (active) {
        pts.forEach((p, i) => {
          ctx.beginPath();
          ctx.arc(curveX(g, p[0]), curveY(g, p[1]), i === curveUi.drag ? 9 : 7, 0, Math.PI * 2);
          ctx.fillStyle = '#1a1a1a';
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = CURVE_COLORS[k];
          ctx.stroke();
        });
      }
    }
    for (const b of $('curveChans').children) {
      b.classList.toggle('active', b.dataset.chan === curveUi.chan);
      b.classList.toggle('changed', !G.isIdentityCurve(state.params.curves[b.dataset.chan]));
    }
  }

  function curvePointAt(e) {
    const g = curveGeom();
    const r = g.cv.getBoundingClientRect();
    const sx = g.w / r.width, sy = g.h / r.height;
    const px = (e.clientX - r.left) * sx, py = (e.clientY - r.top) * sy;
    const x = Math.min(1, Math.max(0, (px - g.pad) / (g.w - 2 * g.pad)));
    const y = Math.min(1, Math.max(0, (g.h - g.pad - py) / (g.h - 2 * g.pad)));
    const pts = state.params.curves[curveUi.chan];
    let hit = -1, best = 14 * sx;
    pts.forEach((p, i) => {
      const d = Math.hypot(curveX(g, p[0]) - px, curveY(g, p[1]) - py);
      if (d < best) { best = d; hit = i; }
    });
    return { x, y, hit, pts };
  }

  function wireCurve() {
    const cv = $('curve');
    cv.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const { x, y, hit, pts } = curvePointAt(e);
      if (hit >= 0) {
        curveUi.drag = hit;
      } else {
        if (pts.length >= 16) { toast('Höchstens 16 Punkte je Kurve'); return; }
        pts.push([x, y]);
        pts.sort((a, b) => a[0] - b[0]);
        curveUi.drag = pts.findIndex((p) => p[0] === x && p[1] === y);
      }
      cv.setPointerCapture(e.pointerId);
      drawCurve();
      onParamsChanged(true);
    });
    cv.addEventListener('pointermove', (e) => {
      if (curveUi.drag < 0) return;
      const { x, y, pts } = curvePointAt(e);
      const i = curveUi.drag, p = pts[i];
      p[1] = y;
      if (i > 0 && i < pts.length - 1) {
        p[0] = Math.min(pts[i + 1][0] - 0.01, Math.max(pts[i - 1][0] + 0.01, x));
      }
      drawCurve();
      onParamsChanged(true);
    });
    const endDrag = () => {
      if (curveUi.drag < 0) return;
      curveUi.drag = -1;
      drawCurve();
      onParamsChanged(false);
    };
    cv.addEventListener('pointerup', endDrag);
    cv.addEventListener('pointercancel', endDrag);
    cv.addEventListener('dblclick', (e) => {
      const { hit, pts } = curvePointAt(e);
      if (hit > 0 && hit < pts.length - 1) {
        pts.splice(hit, 1);
        drawCurve();
        onParamsChanged(false);
      }
    });
    $('curveChans').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      curveUi.chan = b.dataset.chan;
      drawCurve();
    });
    $('curveReset').addEventListener('click', () => {
      state.params.curves = G.identityCurves();
      drawCurve();
      onParamsChanged(false);
      toast('Kurven zurückgesetzt');
    });
  }

  // --- Meine Looks (nur in diesem Browser) ------------------------------------
  function readLooks() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch (e) { return []; }
  }
  function writeLooks(list) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); return true; } catch (e) { toast('Speichern im Browser nicht möglich – bitte „Alle als Datei sichern“ nutzen.'); return false; }
  }
  function renderSaved() {
    const ul = $('savedList');
    ul.textContent = '';
    const list = readLooks();
    if (!list.length) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'Noch keine eigenen Looks gespeichert.';
      ul.appendChild(li);
    }
    list.forEach((look, i) => {
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.textContent = look.name;
      const load = document.createElement('button');
      load.textContent = 'Laden';
      load.addEventListener('click', () => {
        state.fileNameTouched = !!look.fileName;
        state.titleTouched = true;
        if (look.fileName) $('fileName').value = look.fileName;
        $('lutTitle').value = look.name;
        const lookPresetId = resolveId(look.presetId);
        applyPreset(PRESETS.some((p) => p.id === lookPresetId) ? lookPresetId : 'neutral', look.params);
        showTab('edit');
        toast(t('„{name}“ geladen', { name: look.name }));
      });
      const del = document.createElement('button');
      del.textContent = '✕';
      del.title = 'Entfernen';
      del.addEventListener('click', () => {
        if (!confirm(t('Look „{name}“ entfernen?', { name: look.name }))) return;
        const l = readLooks(); l.splice(i, 1); writeLooks(l); renderSaved();
      });
      li.append(name, load, del);
      ul.appendChild(li);
    });
  }

  // --- Referenzbild-Abgleich --------------------------------------------------
  function updateMatchSource() {
    const img = current();
    if (img) $('srcThumb').getContext('2d').putImageData(img.thumbSrc, 0, 0);
    $('btnMatch').disabled = !(img && state.ref) || state.matching;
    $('btnCamCompare').disabled = !(img && state.cam);
  }

  function loadReference(fileList) {
    const files = [...(fileList || [])].filter((f) => /^image\//.test(f.type));
    if (!files.length) { toast('Bitte Bilddateien (JPEG) wählen.'); return; }
    const parts = [];
    let done = 0;
    const finish = () => {
      if (!parts.length) { toast('Referenzbilder konnten nicht gelesen werden.'); return; }
      // Statistik über alle Referenzbilder gemeinsam (Pixel aneinandergehängt)
      let total = 0;
      for (const p of parts) total += p.data.length;
      const all = new Uint8ClampedArray(total);
      let o = 0;
      for (const p of parts) { all.set(p.data, o); o += p.data.length; }
      const name = parts.length === 1 ? parts[0].name : `${parts[0].name} +${parts.length - 1}`;
      state.ref = { name, count: parts.length, stats: window.LutMatch.stats(all) };
      $('refThumb').getContext('2d').drawImage(parts[0].thumb, 0, 0);
      $('refThumb').hidden = false;
      $('refEmpty').hidden = true;
      $('refDrop').classList.add('has');
      $('refCount').hidden = parts.length < 2;
      $('refCount').textContent = t('{n} Bilder', { n: parts.length });
      updateMatchSource();
      toast(parts.length === 1 ? t('Referenz „{name}“ geladen', { name }) : t('{n} Referenzbilder geladen', { n: parts.length }));
    };
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const sw = 160, sh = Math.max(1, Math.round((sw * img.naturalHeight) / img.naturalWidth));
        parts.push({ name: file.name, data: dataOf(scaled(img, sw, sh, false)).data, thumb: scaled(img, 240, 160, true) });
        URL.revokeObjectURL(url); // erst nach dem Zeichnen freigeben
        if (++done === files.length) finish();
      };
      img.onerror = () => { URL.revokeObjectURL(url); if (++done === files.length) finish(); };
      img.src = url;
    });
  }

  // --- Export-Auslieferung: Mac-App (Tauri) schreibt in einen Ordner, Browser lädt herunter ----
  const tauri = () => window.__TAURI__ || null;

  async function pickExportFolder() {
    const t = tauri();
    const ui = readUi();
    let suggestion = ui.exportDir || null;
    try {
      const vols = await t.core.invoke('list_volumes');
      if (vols.length && !suggestion) suggestion = vols[0];
    } catch (e) { /* keine Volumes */ }
    const dir = await t.dialog.open({ directory: true, multiple: false, defaultPath: suggestion || undefined, title: 'Ordner für die LUT wählen (z. B. SD-Karte, Hauptverzeichnis)' });
    if (dir) writeUi({ exportDir: dir });
    return dir;
  }

  const b64 = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); };

  // entries: [{ name, data: string | Uint8Array }]
  async function deliver(entries, baseName) {
    if (tauri()) {
      const dir = await pickExportFolder();
      if (!dir) { toast('Export abgebrochen'); return; }
      const files = entries.map((e) => (typeof e.data === 'string' ? { name: e.name, text: e.data } : { name: e.name, base64: b64(e.data) }));
      try {
        const written = await tauri().core.invoke('write_files', { dir, files });
        toast(t('{n} Dateien gespeichert in {dir}', { n: written.length, dir }));
      } catch (err) {
        toast(t('Speichern fehlgeschlagen: ') + err);
      }
      return;
    }
    if ($('zipToo').checked && window.LutZip) {
      const zip = window.LutZip.build(entries);
      const url = URL.createObjectURL(zip);
      const a = document.createElement('a');
      a.href = url; a.download = baseName + '_LUT.zip';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast(t('Exportiert: {list}', { list: `${baseName}_LUT.zip (${entries.map((e) => e.name).join(', ')})` }));
      return;
    }
    entries.forEach((e, i) => setTimeout(() => {
      const url = URL.createObjectURL(new Blob([e.data], { type: typeof e.data === 'string' ? 'text/plain' : 'image/jpeg' }));
      const a = document.createElement('a');
      a.href = url; a.download = e.name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, i * 400));
    toast(t('Exportiert: {list}', { list: entries.map((e) => e.name).join(', ') }));
  }

  // --- Weißabgleich: Pipette und Auto -------------------------------------------
  // Kamera-Einstellung (Kelvin + Tönung), die eine gemessene lineare Rec.709-Farbe neutral macht.
  // Kelvin wird per Binärsuche gefunden (R/B-Verhältnis), die Tönung rechnet den Grünrest weg.
  function wbFromLinear(r, g, b) {
    if (r <= 1e-6 || g <= 1e-6 || b <= 1e-6) return null;
    let lo = 2000, hi = 15000;
    for (let i = 0; i < 30; i++) {
      const K = Math.sqrt(lo * hi);
      const kg = G.kelvinGains(K);
      if ((r * kg[0]) / (b * kg[2]) < 1) lo = K; else hi = K;
    }
    const K = Math.round(Math.sqrt(lo * hi) / 50) * 50;
    const kg = G.kelvinGains(K);
    const gG = (r * kg[0]) / (g * kg[1]);
    const tint = (-100 * Math.log2(gG)) / 0.25;
    return { kelvin: Math.max(2000, Math.min(12000, K)), tint: Math.round(Math.max(-100, Math.min(100, tint))) };
  }

  function linearAt(img, x, y, radius) {
    const { width: w, height: h, data: d } = img.src;
    let r = 0, g = 0, b = 0, n = 0;
    for (let yy = Math.max(0, y - radius); yy <= Math.min(h - 1, y + radius); yy++) {
      for (let xx = Math.max(0, x - radius); xx <= Math.min(w - 1, x + radius); xx++) {
        const i = (yy * w + xx) * 4;
        const lin = G.decodeInput(state.params.baseStyle, d[i] / 255, d[i + 1] / 255, d[i + 2] / 255);
        r += lin[0]; g += lin[1]; b += lin[2]; n++;
      }
    }
    return n ? [r / n, g / n, b / n] : null;
  }

  function applyWb(wb, what) {
    if (!wb) { toast('Hier lässt sich kein Weißabgleich messen (zu dunkel).'); return; }
    state.params.wbKelvin = wb.kelvin;
    state.params.wbAB = 0; state.params.wbGM = 0;
    state.params.temp = 0;
    state.params.tint = wb.tint;
    refreshControls();
    onParamsChanged(false);
    toast(t('{what}: {k} K, Tönung {tint}', { what, k: wb.kelvin, tint: (wb.tint > 0 ? '+' : '') + wb.tint }));
  }

  function wbAuto() {
    const img = current();
    if (!img) return;
    // Grauwelt-Schätzung über unauffällige Pixel: nicht zu dunkel, nicht zu bunt.
    const { width: w, height: h, data: d } = img.small;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < w * h * 4; i += 4) {
      const lin = G.decodeInput(state.params.baseStyle, d[i] / 255, d[i + 1] / 255, d[i + 2] / 255);
      const mx = Math.max(lin[0], lin[1], lin[2]), mn = Math.min(lin[0], lin[1], lin[2]);
      if (mx < 0.02 || mx > 0.9 || mn <= 0 || mx / mn > 1.6) continue;
      r += lin[0]; g += lin[1]; b += lin[2]; n++;
    }
    if (n < 50) { toast('Zu wenig neutrale Flächen für Auto-Weißabgleich. Pipette nutzen.'); return; }
    applyWb(wbFromLinear(r / n, g / n, b / n), 'Auto-Weißabgleich');
  }

  function wbPickAt(e) {
    const img = current();
    if (!img) return;
    const rect = view.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * view.width);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * view.height);
    const lin = linearAt(img, x, y, 4);
    applyWb(lin && wbFromLinear(...lin), 'Pipette');
  }

  function setPicking(on) {
    state.picking = on;
    $('viewer').classList.toggle('picking', on);
    $('wbPick').classList.toggle('active', on);
    if (on) toast('Jetzt auf eine neutrale Fläche im Bild klicken (Esc bricht ab).');
  }

  // --- Kamera-Vergleich ---------------------------------------------------------
  function loadCamera(file) {
    if (!file || !/^image\//.test(file.type)) { toast('Bitte das Kamera-JPEG wählen.'); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // Vergleich bei niedriger Auflösung, damit Kanten und JPEG-Artefakte nicht dominieren
      const w = 120, h = Math.max(1, Math.round((w * img.naturalHeight) / img.naturalWidth));
      const ws = 40, hs = Math.max(1, Math.round((ws * img.naturalHeight) / img.naturalWidth));
      // 120 px für das Abweichungsbild, 40 px für die Messzahlen (JPEG-Rauschen mittelt sich heraus)
      state.cam = { name: file.name, data: dataOf(scaled(img, w, h, false)), w, h, small: dataOf(scaled(img, ws, hs, false)), ws, hs };
      $('camThumb').getContext('2d').drawImage(scaled(img, 240, 160, true), 0, 0);
      URL.revokeObjectURL(url); // erst nach dem Zeichnen freigeben
      $('camThumb').hidden = false;
      $('camEmpty').hidden = true;
      $('camDrop').classList.add('has');
      $('btnCamCompare').disabled = !current();
      toast(t('Kamera-JPEG „{name}“ geladen', { name: file.name }));
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast('Kamera-JPEG konnte nicht gelesen werden.'); };
    img.src = url;
  }

  function compareCamera() {
    const img = current();
    if (!img || !state.cam || !state.lut) return;
    const { w, h } = state.cam;
    // Vorschau mit dem aktuellen Look: erst die LUT in voller Vorschaugröße anwenden (ohne
    // Vorschau-Effekte), dann wie das Kamera-Bild verkleinern. So zählen Kanten gleich.
    const full = new ImageData(img.src.width, img.src.height);
    G.applyLut(state.lut, img.src.data, full.data);
    const fullCv = document.createElement('canvas');
    fullCv.width = full.width; fullCv.height = full.height;
    fullCv.getContext('2d').putImageData(full, 0, 0);
    const prev = dataOf(scaled(fullCv, w, h, false));
    $('camPreview').getContext('2d').drawImage(scaled(fullCv, 240, 160, true), 0, 0);
    const toLab = (d, i) => C.linearToOklab(C.srgbDecode(d[i] / 255), C.srgbDecode(d[i + 1] / 255), C.srgbDecode(d[i + 2] / 255));
    const deltas = (pa, pb, count) => {
      const dE = new Float32Array(count);
      let sL = 0, sA = 0, sB = 0, sum = 0;
      for (let k = 0, i = 0; k < count; k++, i += 4) {
        const la = toLab(pa, i), lb = toLab(pb, i);
        const dl = lb[0] - la[0], da = lb[1] - la[1], db = lb[2] - la[2];
        sL += dl; sA += da; sB += db;
        dE[k] = Math.hypot(dl, da, db) * 100; // OKLab-Abstand, ×100 ≈ wahrnehmbare Einheiten
        sum += dE[k];
      }
      const sorted = Float32Array.from(dE).sort();
      return { dE, mean: sum / count, p95: sorted[Math.floor(0.95 * (count - 1))], mL: sL / count, mA: sA / count, mB: sB / count };
    };
    // Messzahlen stark verkleinert (Rauschen gemittelt), Abweichungsbild in 120 px
    const { ws, hs } = state.cam;
    const prevSmall = dataOf(scaled(fullCv, ws, hs, false));
    const m = deltas(prevSmall.data, state.cam.small.data, ws * hs);
    const fine = deltas(prev.data, state.cam.data.data, w * h);
    const n = w * h, mean = m.mean, p95 = m.p95, mL = m.mL, mA = m.mA, mB = m.mB;
    const diff = new ImageData(w, h);
    for (let k = 0, i = 0; k < n; k++, i += 4) {
      const v = Math.min(255, (fine.dE[k] / 10) * 255);
      diff.data[i] = v; diff.data[i + 1] = v; diff.data[i + 2] = v; diff.data[i + 3] = 255;
    }
    const dc = document.createElement('canvas'); dc.width = w; dc.height = h; dc.getContext('2d').putImageData(diff, 0, 0);
    $('camDiff').getContext('2d').drawImage(scaled(dc, 240, 160, true), 0, 0);
    const verdict = mean < 1.5 ? 'Vorschau und Kamera stimmen sehr gut überein.' : mean < 3 ? 'Kleine Abweichung, für die Praxis ausreichend.' : 'Deutliche Abweichung: Framing, Belichtung oder V-Log-Kodierung prüfen.';
    const dir = [];
    if (Math.abs(mL) > 0.01) dir.push(t('Kamera ist {how} ({delta})', { how: t(mL > 0 ? 'heller' : 'dunkler'), delta: `ΔL ${(mL * 100).toFixed(1)}` }));
    if (Math.abs(mB) > 0.005) dir.push(t('Kamera ist {how} ({delta})', { how: t(mB > 0 ? 'wärmer/gelber' : 'kühler/blauer'), delta: `Δb ${(mB * 100).toFixed(1)}` }));
    if (Math.abs(mA) > 0.005) dir.push(t('Kamera ist {how} ({delta})', { how: t(mA > 0 ? 'rötlicher' : 'grünlicher'), delta: `Δa ${(mA * 100).toFixed(1)}` }));
    $('camStats').innerHTML = '';
    for (const [k, v] of [['Mittlere Abweichung ΔE', mean.toFixed(2)], ['95 % der Pixel unter ΔE', p95.toFixed(2)], ['Richtung', dir.length ? dir.join(', ') : 'kein systematischer Versatz'], ['Einordnung', verdict]]) {
      const row = document.createElement('div');
      const bEl = document.createElement('b'); bEl.textContent = t(k) + ': ';
      row.append(bEl, document.createTextNode(v));
      $('camStats').appendChild(row);
    }
    $('camResult').hidden = false;
  }

  function runMatch() {
    const img = current();
    if (!img || !state.ref || state.matching) return;
    state.matching = true;
    $('btnMatch').disabled = true;
    const prog = $('matchProgress');
    prog.hidden = false;
    prog.firstElementChild.style.width = '0%';
    $('matchNote').textContent = 'Berechne Vorschlag …';
    const start = $('matchFromCurrent').checked ? state.params : { baseStyle: state.params.baseStyle };
    window.LutMatch.fit(img.small, state.ref.stats, start,
      (f) => { prog.firstElementChild.style.width = Math.round(f * 100) + '%'; },
      (params) => {
        state.matching = false;
        prog.hidden = true;
        $('matchNote').textContent = 'Vorschlag übernommen. Feinjustieren unter „Bearbeiten“; mit ⌘Z lässt sich der Schritt rückgängig machen.';
        state.titleTouched = true;
        $('lutTitle').value = t('Abgleich {name}', { name: state.ref.name.replace(/\.[^.]+$/, '') }).slice(0, 40);
        state.fileNameTouched = false;
        applyPreset('neutral', params);
        $('fileName').value = G.sanitizeFileName(state.ref.name.replace(/\.[^.]+$/, ''));
        state.fileNameTouched = true;
        updateMatchSource();
        showTab('edit');
        toast('Look-Vorschlag aus Referenz übernommen');
      });
  }

  // --- Ereignisse -----------------------------------------------------------
  function setMode(mode) {
    if (mode === 'b' && !state.b) { toast('Erst einen Look als B merken (Lesezeichen unten).'); return; }
    state.mode = mode;
    for (const x of $('viewMode').children) x.classList.toggle('active', x.dataset.mode === mode);
    draw();
    drawHistogram();
  }

  function toggleLoupe() {
    const viewer = $('viewer');
    const on = viewer.classList.toggle('loupe');
    $('btnLoupe').classList.toggle('on', on);
    if (on) {
      // Bildmitte anzeigen
      requestAnimationFrame(() => {
        viewer.scrollLeft = (view.clientWidth - viewer.clientWidth) / 2;
        viewer.scrollTop = (view.clientHeight - viewer.clientHeight) / 2;
        draw();
      });
      toast('1:1-Ansicht der Vorschau (max. 1800 px Kante). Ziehen verschiebt den Ausschnitt.');
    } else {
      draw();
    }
  }

  function wire() {
    for (const id of ['fileInput', 'fileInput2']) {
      $(id).addEventListener('change', (e) => { loadFiles(e.target.files); e.target.value = ''; });
    }
    $('rail').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) showTab(b.dataset.tab); });
    $('baseStyle').addEventListener('change', (e) => setBaseStyle(e.target.value));
    $('btnUndo').addEventListener('click', undo);
    $('btnMarkB').addEventListener('click', markB);
    $('btnLoupe').addEventListener('click', toggleLoupe);
    let pan = null;
    $('viewer').addEventListener('pointerdown', (e) => {
      if (!$('viewer').classList.contains('loupe') || state.mode === 'split') return;
      pan = { x: e.clientX, y: e.clientY, sx: $('viewer').scrollLeft, sy: $('viewer').scrollTop };
      $('viewer').classList.add('panning');
    });
    window.addEventListener('pointermove', (e) => {
      if (!pan) return;
      $('viewer').scrollLeft = pan.sx - (e.clientX - pan.x);
      $('viewer').scrollTop = pan.sy - (e.clientY - pan.y);
    });
    window.addEventListener('pointerup', () => { pan = null; $('viewer').classList.remove('panning'); });
    $('btnRedo').addEventListener('click', redo);
    $('lookSearch').addEventListener('input', applyLookFilter);
    $('refInput').addEventListener('change', (e) => { loadReference(e.target.files); e.target.value = ''; });
    const refDrop = $('refDrop');
    refDrop.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); refDrop.classList.add('drag'); });
    refDrop.addEventListener('dragleave', () => refDrop.classList.remove('drag'));
    refDrop.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); refDrop.classList.remove('drag'); loadReference(e.dataTransfer.files); });
    $('btnMatch').addEventListener('click', runMatch);
    $('camInput').addEventListener('change', (e) => { loadCamera(e.target.files[0]); e.target.value = ''; });
    const camDrop = $('camDrop');
    camDrop.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); camDrop.classList.add('drag'); });
    camDrop.addEventListener('dragleave', () => camDrop.classList.remove('drag'));
    camDrop.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); camDrop.classList.remove('drag'); loadCamera(e.dataTransfer.files[0]); });
    $('btnCamCompare').addEventListener('click', compareCamera);
    $('profileBtn').addEventListener('click', () => showTab('looks'));
    $('btnOpenExport').addEventListener('click', () => showTab('export'));
    $('colorMode').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      state.params.mono = b.dataset.mono === '1';
      refreshControls();
      onParamsChanged(false);
    });

    $('viewMode').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setMode(b.dataset.mode); });
    document.addEventListener('keydown', (e) => {
      const inText = e.target instanceof Element && e.target.closest('input:not([type=range]), textarea, select');
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) {
        if (inText) return;
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      }
      if (inText) return;
      if (e.key === 'Escape' && state.picking) { setPicking(false); return; }
      if (e.key === '\\') setMode(state.mode === 'orig' ? 'look' : 'orig');
      else if (e.key === 'y' || e.key === 'Y') setMode(state.mode === 'split' ? 'look' : 'split');
      else if (e.key === 'b' || e.key === 'B') setMode(state.mode === 'b' ? 'look' : 'b');
      else if (e.key === 'z' || e.key === 'Z') toggleLoupe();
    });

    let dragging = false;
    const setSplit = (e) => {
      const r = view.getBoundingClientRect();
      state.split = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      draw();
    };
    view.addEventListener('pointerdown', (e) => {
      if (state.picking) { e.preventDefault(); setPicking(false); wbPickAt(e); return; }
      if (state.mode !== 'split') return;
      dragging = true; view.setPointerCapture(e.pointerId); setSplit(e);
    });
    $('wbPick').addEventListener('click', () => setPicking(!state.picking));
    $('wbAuto').addEventListener('click', wbAuto);
    $('wbPresets').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const k = Number(b.dataset.k);
      state.params.wbKelvin = k || G.WB_REFERENCE_K;
      state.params.wbAB = 0; state.params.wbGM = 0;
      if (!k) { state.params.temp = 0; state.params.tint = 0; }
      refreshControls();
      onParamsChanged(false);
    });
    view.addEventListener('pointermove', (e) => { if (dragging) setSplit(e); });
    view.addEventListener('pointerup', () => { dragging = false; });
    window.addEventListener('resize', draw);

    const viewer = $('viewer'), drop = $('drop');
    let depth = 0;
    viewer.addEventListener('dragenter', (e) => { e.preventDefault(); depth++; drop.classList.add('show'); });
    viewer.addEventListener('dragleave', () => { if (--depth <= 0) { depth = 0; drop.classList.remove('show'); } });
    viewer.addEventListener('dragover', (e) => e.preventDefault());
    viewer.addEventListener('drop', (e) => {
      e.preventDefault(); depth = 0; drop.classList.remove('show');
      loadFiles(e.dataTransfer.files);
    });

    $('fileName').addEventListener('input', (e) => {
      const raw = e.target.value;
      const clean = /[A-Za-z0-9ÄÖÜäöüß]/.test(raw) ? G.sanitizeFileName(raw) : '';
      if (clean !== raw) e.target.value = clean;
      state.fileNameTouched = clean.length > 0;
    });
    $('lutTitle').addEventListener('input', (e) => { state.titleTouched = e.target.value.length > 0; });

    $('btnExport').addEventListener('click', () => {
      const name = G.sanitizeFileName($('fileName').value || preset().file);
      $('fileName').value = name;
      const title = $('lutTitle').value || preset().name;
      const files = [[name + '.cube', G.cubeText(G.buildLut(state.params, 33), title, state.params.baseStyle)]];
      let videoName = null;
      if ($('videoToo').checked) {
        videoName = name.slice(0, 7) + 'V';
        files.push([videoName + '.cube', G.cubeText(G.buildLut(G.videoVariant(state.params), 33), title + ' Video', state.params.baseStyle)]);
      }
      files.push([name + '.txt', recipeText(name, videoName)]);
      const entries = files.map(([n, t]) => ({ name: n, data: t }));
      const wantPreview = current() && ($('zipToo').checked || tauri());
      if (!wantPreview) { deliver(entries, name); return; }
      // Vorschaubild (lange Kante 1600 px) aus der aktuellen Vorschau
      const src = lookCanvas, k = Math.min(1, 1600 / Math.max(src.width, src.height));
      const pv = scaled(src, Math.round(src.width * k), Math.round(src.height * k), false);
      pv.toBlob((blob) => {
        const go = (jpg) => { if (jpg) entries.push({ name: name + '_vorschau.jpg', data: jpg }); deliver(entries, name); };
        if (blob) blob.arrayBuffer().then((buf) => go(new Uint8Array(buf))); else go(null);
      }, 'image/jpeg', 0.9);
    });

    $('btnSave').addEventListener('click', () => {
      const name = $('saveName').value.trim() || $('lutTitle').value || preset().name;
      const list = readLooks().filter((l) => l.name !== name);
      list.push({ name, presetId: state.presetId, params: state.params, fileName: $('fileName').value, savedAt: new Date().toISOString() });
      if (writeLooks(list)) { renderSaved(); toast(t('„{name}“ gespeichert', { name })); $('saveName').value = ''; }
    });
    $('btnExportJson').addEventListener('click', () => download('meine-looks.json', JSON.stringify(readLooks(), null, 1)));
    $('jsonInput').addEventListener('change', (e) => {
      const f = e.target.files[0];
      e.target.value = '';
      if (!f) return;
      f.text().then((txt) => {
        const incoming = JSON.parse(txt);
        if (!Array.isArray(incoming)) throw new Error('kein Array');
        const valid = incoming.filter((l) => l && typeof l.name === 'string' && l.params && typeof l.params === 'object');
        const byName = new Map(readLooks().map((l) => [l.name, l]));
        for (const l of valid) byName.set(l.name, l);
        writeLooks([...byName.values()]);
        renderSaved();
        toast(t('{n} Looks importiert', { n: valid.length }));
      }).catch(() => toast('Datei konnte nicht gelesen werden.'));
    });
  }

  if (tauri()) {
    $('zipToo').closest('label').hidden = true;
    document.body.classList.add('native');
  }
  // --- Sprache -------------------------------------------------------------------
  function markLang() {
    for (const b of $('langSwitch').children) b.classList.toggle('active', b.dataset.lang === I18N.lang);
  }
  function onLangChange() {
    markLang();
    if (!state.titleTouched) $('lutTitle').value = lookText(preset(), 'name');
    renderPresets();
    renderPresetThumbs();
    renderRecipe();
    refreshControls();
    renderSaved();
    if (current()) checkVlog(current());
    if (state.b) $('modeB').title = t('Gemerkter Look B: {name} (B)', { name: state.b.name });
  }
  $('langSwitch').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b && b.dataset.lang !== I18N.lang) I18N.setLang(b.dataset.lang);
  });
  I18N.onChange(onLangChange);
  I18N.start();
  markLang();

  buildControls();
  wireSections();
  wireWheels();
  wireCurve();
  wire();
  renderPresets();
  renderSaved();
  addImage(window.LutTestImage.makeTestImage(), 'Testbild', 'test');
  state.syncedBase = 'VLOG';
  activate(0);
  applyPreset('neutral');
  document.title = t('LUT Generator S9');
})();
