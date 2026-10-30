// Startpunkte für Looks. Alles eigene Looks nach Augenmaß, inspiriert von klassischen
// analogen Filmcharakteren. Keine Kopien fremder Profile, keine Markennamen.
// Die Rezeptkarte enthält Kamera-Einstellungen, die eine LUT nicht abbilden kann.
// OKLCh-Farbtöne der HSL-Bänder zur Orientierung: Rot 29, Orange 60, Gelb 105, Grün 142,
// Türkis 195, Blau 255, Lila 295, Magenta 335. Positive Farbtonverschiebung = höherer Winkel.
(function (root) {
  'use strict';

  const RECIPE_DEFAULT = {
    wb: 'AWB', wbShift: '0 / 0', exposure: '0 EV', nr: '-2', sharpness: '0', grain: 'Aus', note: '',
  };

  const BASE = 'Basis';
  const CLASSIC = 'Kamera-Klassiker';
  const NEG = 'Farbnegativ';
  const SLIDE = 'Dia & Kräftig';
  const CINE = 'Kino';
  const POPULAR = 'Beliebte Stile';
  const BW = 'Schwarzweiß';
  const GROUP_ORDER = [BASE, CLASSIC, NEG, SLIDE, CINE, POPULAR, BW];

  const PRESETS = [
    {
      id: 'neutral', name: 'Neutral', file: 'NEUTRAL', group: BASE,
      desc: 'Saubere Umwandlung von V-Log nach Rec.709. Guter Startpunkt für eigene Looks.',
      params: {},
      recipe: { exposure: '±0 bis +1/3 EV', note: 'Referenz-Look, um die Belichtung der V-Log-Basis einzuschätzen.' },
    },

    {
      id: 'balanced', name: 'Ausgewogen', file: 'BALANCED', group: CLASSIC,
      desc: 'Standard: ausgewogen, natürliche Farben mit etwas Biss.',
      params: { skinProtect: 20, skinGold: 20, contrast: 10, saturation: 5, hsl: { green: { h: -5 }, blue: { s: 5 } } },
      recipe: { note: 'Allrounder für jede Situation.' },
    },
    {
      id: 'vibrant', name: 'Leuchtend', file: 'VIBRANT', group: CLASSIC,
      desc: 'Lebendig: kräftige Farben, tiefe Schatten, sattes Blau und Grün.',
      params: {
        skinProtect: 55, skinGold: 30,
        contrast: 30, shadows: -15, saturation: 35, vibrance: 10,
        hsl: { red: { s: 10 }, green: { h: -5, s: 15 }, aqua: { s: 10 }, blue: { h: 5, s: 15, l: -12 }, magenta: { s: 10 } },
      },
      recipe: { exposure: '0 bis -1/3 EV', sharpness: '+1', note: 'Landschaft und Natur. Für Porträts meist zu kräftig.' },
    },
    {
      id: 'softcolor', name: 'Sanft', file: 'SOFT', group: CLASSIC,
      desc: 'Weich: sanfte Kontraste, schmeichelnde Hauttöne, trotzdem lebendige Farben.',
      params: {
        skinProtect: 40, skinGold: 35,
        contrast: -10, highlights: -15, shadows: 10, saturation: 5,
        hsl: { orange: { s: -5, l: 6 }, green: { s: 5 }, blue: { s: 10 } },
      },
      recipe: { exposure: '+1/3 EV', note: 'Porträts im Freien und Mode.' },
    },
    {
      id: 'documentary', name: 'Dokumentar', file: 'DOCUMENT', group: CLASSIC,
      desc: 'Gedeckte Farben, satte Schatten, cyanstichiges Blau, olivgrüne Töne.',
      params: {
        skinProtect: 20, skinGold: 20,
        contrast: 18, highlights: -10, shadows: -15, saturation: -22, temp: 4,
        splitShadowHue: 205, splitShadowAmt: 12, splitHighHue: 75, splitHighAmt: 8,
        hsl: {
          red: { s: -15 }, orange: { s: -18, l: -5 }, yellow: { h: -10, s: -25 }, green: { h: -15, s: -35, l: -10 },
          aqua: { s: -30 }, blue: { h: -12, s: -25, l: -15 }, purple: { s: -20 }, magenta: { s: -20 },
        },
      },
      recipe: { wb: 'Tageslicht', wbShift: 'A1 / G0', exposure: '0 bis -1/3 EV', nr: '-3', sharpness: '-1', grain: 'Schwach', note: 'Street und Reportage. Bei hartem Licht wirken die Schatten besonders schön.' },
    },
    {
      id: 'truecolor', name: 'Farbtreu', file: 'TRUECOL', group: CLASSIC,
      desc: 'Farbtreu mit knackiger Gradation, wie ein moderner Negativfilm.',
      params: { skinProtect: 20, skinGold: 15, contrast: 15, vibrance: 5, hsl: { orange: { l: 3 }, green: { h: -3 }, blue: { s: 5 } } },
      recipe: { note: 'Wenn es natürlich, aber nicht langweilig aussehen soll.' },
    },
    {
      id: 'portraitpunch', name: 'Porträt Kontrast', file: 'PORTCONT', group: CLASSIC,
      desc: 'Porträtfilm mit etwas mehr Kontrast, zurückhaltende Farben, schöne Haut.',
      params: { skinProtect: 40, skinGold: 35, contrast: 15, saturation: -8, hsl: { red: { s: -5 }, orange: { s: -5, l: 5 }, green: { s: -10 } } },
      recipe: { exposure: '+1/3 EV', sharpness: '-1', note: 'Porträts bei flachem Licht.' },
    },
    {
      id: 'portraitsoft', name: 'Porträt Sanft', file: 'PORTSOFT', group: CLASSIC,
      desc: 'Sehr weich und neutral, wie Studio-Negativfilm.',
      params: { skinProtect: 40, skinGold: 35, contrast: -15, highlights: -10, saturation: -15, hsl: { orange: { l: 5 } } },
      recipe: { exposure: '+1/3 EV', sharpness: '-1', note: 'Porträts bei kontrastreichem Licht, auch Innenräume.' },
    },
    {
      id: 'snapshot', name: 'Schnappschuss', file: 'SNAPSHOT', group: CLASSIC,
      desc: 'Harte Kurve, türkise Schatten, warme Lichter, Rot leicht nach Magenta.',
      params: {
        skinProtect: 20, skinGold: 15,
        contrast: 35, highlights: 10, shadows: -20, saturation: -10, fade: 6,
        splitShadowHue: 190, splitShadowAmt: 25, splitHighHue: 55, splitHighAmt: 12,
        hsl: {
          red: { h: -12, s: 5 }, orange: { s: -10 }, yellow: { h: -15, s: -15 }, green: { h: 15, s: -30, l: -5 },
          aqua: { s: -10 }, blue: { h: -5, s: -20, l: -5 }, purple: { s: -10 }, magenta: { s: -10 },
        },
      },
      recipe: { wbShift: 'A2 / M1', exposure: '0 bis +1/3 EV', nr: '-3', sharpness: '-1', grain: 'Mittel', note: 'Alltags- und Familienfotos mit Schnappschuss-Charakter. Nicht zu knapp belichten.' },
    },
    {
      id: 'nostalgia', name: 'Nostalgie', file: 'NOSTALG', group: CLASSIC,
      desc: 'Bernsteinfarbene Lichter, satte Schatten, Stimmung wie alte Farbabzüge.',
      params: {
        skinProtect: 30, skinGold: 30,
        contrast: 5, highlights: -20, shadows: -5, temp: 6, saturation: -5,
        splitShadowHue: 40, splitShadowAmt: 5, splitHighHue: 75, splitHighAmt: 20,
        hsl: { orange: { s: 5 }, yellow: { h: -5, s: 5 }, green: { h: -12, s: -15 }, blue: { s: -10 } },
      },
      recipe: { wb: 'Tageslicht', wbShift: 'A1 / 0', exposure: '+1/3 EV', grain: 'Schwach', note: 'Stadt, Reisen, Sonnenuntergänge.' },
    },
    {
      id: 'flatcinema', name: 'Kino Flach', file: 'FLATCINE', group: CLASSIC,
      desc: 'Kinofilm: flach, wenig Sättigung, weiche Lichter. Auch sehr gut für Video.',
      params: {
        skinProtect: 20, skinGold: 20,
        contrast: -35, highlights: -30, shadows: 15, saturation: -38, fade: 5,
        splitShadowHue: 200, splitShadowAmt: 15, splitHighHue: 70, splitHighAmt: 5,
        hsl: { yellow: { h: -5, s: -10 }, green: { h: -5, s: -25 }, aqua: { s: -10 }, blue: { s: -20 } },
      },
      recipe: { exposure: '+1/3 EV', sharpness: '-2', note: 'Ruhige, filmische Bilder. Ideal als Video-LUT, weil der Look viel Spielraum lässt.' },
    },
    {
      id: 'bleach', name: 'Bleach Bypass', file: 'BLEACHBY', group: CLASSIC,
      desc: 'Harter Kontrast, stark entsättigt, metallischer Kino-Look.',
      params: { contrast: 45, highlights: 10, shadows: -20, saturation: -60, splitShadowHue: 200, splitShadowAmt: 8 },
      recipe: { exposure: '0 EV', grain: 'Mittel', note: 'Architektur, Street, dramatische Szenen.' },
    },

    {
      id: 'portrait160', name: 'Porträtfilm 160', file: 'PFILM160', group: NEG,
      desc: 'Fein und zurückhaltend, natürliche Hauttöne, sanfte Pastelle.',
      params: {
        skinProtect: 30, skinGold: 35,
        contrast: -10, highlights: -20, shadows: 5, saturation: -15, vibrance: 5, temp: 6,
        splitHighHue: 70, splitHighAmt: 8,
        hsl: { orange: { l: 5 }, green: { h: -15, s: -30 }, blue: { h: -8, s: -15 } },
      },
      recipe: { wb: 'Tageslicht', exposure: '+1/3 bis +2/3 EV', nr: '-3', sharpness: '-1', grain: 'Schwach', note: 'Porträts und Hochzeiten bei gutem Licht.' },
    },
    {
      id: 'portrait400', name: 'Porträtfilm 400', file: 'PFILM400', group: NEG,
      desc: 'Warm, pastellig, leuchtende Hauttöne, gedämpftes Grün, weiche Lichter.',
      params: {
        skinProtect: 30, skinGold: 35,
        contrast: -15, highlights: -25, shadows: 10, fade: 6, whiteMatte: 5, temp: 10,
        saturation: -10, vibrance: 10,
        splitShadowHue: 230, splitShadowAmt: 5, splitHighHue: 70, splitHighAmt: 12,
        hsl: {
          red: { h: 5, s: -10 }, orange: { s: 5, l: 5 }, yellow: { h: -8, s: -10 }, green: { h: -20, s: -35, l: -5 },
          aqua: { s: -20 }, blue: { h: -10, s: -15, l: 5 }, purple: { s: -10 }, magenta: { s: -15 },
        },
      },
      recipe: { wb: 'Tageslicht', wbShift: 'A2 / M1', exposure: '+1/3 bis +2/3 EV', nr: '-3', sharpness: '-1', grain: 'Schwach', note: 'Wie bei Negativfilm: lieber etwas reichlich belichten. Stark bei Porträts und Gegenlicht.' },
    },
    {
      id: 'portrait800', name: 'Porträtfilm 800', file: 'PFILM800', group: NEG,
      desc: 'Wärmer und satter als Porträtfilm 400, leicht kühle Schatten.',
      params: {
        skinProtect: 35, skinGold: 35,
        highlights: -20, temp: 8, vibrance: 10,
        splitShadowHue: 220, splitShadowAmt: 8, splitHighHue: 65, splitHighAmt: 12,
        hsl: { red: { s: 5 }, orange: { s: 5 }, green: { h: -15, s: -25 }, blue: { h: -10, s: -5 } },
      },
      recipe: { wb: 'Tageslicht', exposure: '+1/3 EV', nr: '-3', grain: 'Mittel', note: 'Abendlicht, Innenräume, Konzerte.' },
    },
    {
      id: 'landscape100', name: 'Landschaftsfilm 100', file: 'LANDF100', group: SLIDE,
      desc: 'Feinkörniger Farbfilm: kräftig, kontrastreich, tiefes Blau.',
      params: {
        skinProtect: 50, skinGold: 30,
        contrast: 30, saturation: 25, vibrance: 10, temp: 2,
        hsl: { red: { s: 15 }, orange: { s: 5 }, yellow: { s: 10 }, green: { h: -5, s: 10 }, aqua: { s: 5 }, blue: { s: 10, l: -10 } },
      },
      recipe: { wb: 'Tageslicht', exposure: '0 bis -1/3 EV', note: 'Landschaft und Architektur. Achtung bei Hauttönen, die werden schnell kräftig.' },
    },
    {
      id: 'summer200', name: 'Sommerfilm 200', file: 'SUMMR200', group: NEG,
      desc: 'Sonniger Consumer-Film: warm, kräftige Gelbtöne, nostalgisch.',
      params: {
        skinProtect: 30, skinGold: 30,
        contrast: 10, highlights: -10, temp: 18, tint: 3, saturation: 5,
        splitShadowHue: 45, splitShadowAmt: 6, splitHighHue: 78, splitHighAmt: 15,
        hsl: { red: { s: 5 }, orange: { s: 10 }, yellow: { s: 15 }, green: { h: -15, s: -15 }, aqua: { s: -10 }, blue: { h: -5, s: -10, l: -5 } },
      },
      recipe: { wb: 'Tageslicht', wbShift: 'A3 / 0', exposure: '+1/3 EV', nr: '-3', grain: 'Mittel', note: 'Urlaub, Sommer, goldene Stunde.' },
    },
    {
      id: 'everyday400', name: 'Alltagsfilm 400', file: 'EVRYD400', group: NEG,
      desc: 'Kräftiger Alltagsfilm: warm, satte Rot- und Gelbtöne, etwas Korn-Gefühl.',
      params: {
        skinProtect: 35, skinGold: 25,
        contrast: 15, temp: 10, saturation: 15, fade: 3, splitHighHue: 70, splitHighAmt: 8,
        hsl: { red: { s: 10 }, yellow: { h: -5, s: 10 }, green: { h: -10 }, blue: { s: 5 } },
      },
      recipe: { wb: 'Tageslicht', exposure: '+1/3 EV', nr: '-3', grain: 'Mittel', note: 'Schnappschüsse, Partys, Alltag.' },
    },
    {
      id: 'retro200', name: 'Retrofilm 200', file: 'RETRO200', group: NEG,
      desc: 'Günstiger Retro-Film: warm, leicht matt, gedämpftes Grün und Blau.',
      params: {
        skinProtect: 25, skinGold: 25,
        contrast: 5, fade: 6, temp: 14,
        splitShadowHue: 30, splitShadowAmt: 8, splitHighHue: 70, splitHighAmt: 14,
        hsl: { yellow: { s: 5 }, green: { h: -18, s: -20 }, blue: { h: -5, s: -20 } },
      },
      recipe: { wb: 'Tageslicht', wbShift: 'A2 / 0', exposure: '+1/3 EV', nr: '-3', grain: 'Mittel', note: 'Sommer- und Reisebilder mit 90er-Gefühl.' },
    },
    {
      id: 'classicslide', name: 'Klassisches Dia', file: 'CLSLIDE', group: SLIDE,
      desc: 'Legendärer Diafilm: tiefe Rot- und Blautöne, satte Schatten, Vintage-Kontrast.',
      params: {
        skinProtect: 40, skinGold: 25,
        contrast: 30, highlights: -5, shadows: -20, saturation: 15, temp: 3,
        splitShadowHue: 230, splitShadowAmt: 6,
        hsl: {
          red: { h: -3, s: 20, l: -5 }, orange: { s: 5 }, yellow: { h: -8, s: 10 }, green: { h: -10, s: -5, l: -10 },
          aqua: { h: 5, s: 5 }, blue: { h: -5, s: 20, l: -15 },
        },
      },
      recipe: { wb: 'Tageslicht', exposure: '-1/3 EV', note: 'Wie bei Diafilm: die Lichter schützen, lieber etwas knapper belichten.' },
    },
    {
      id: 'modernslide', name: 'Modernes Dia', file: 'MODSLIDE', group: SLIDE,
      desc: 'Moderner Diafilm: klar, leicht kühl, leuchtendes Blau und Türkis.',
      params: {
        skinProtect: 40, skinGold: 25,
        contrast: 25, saturation: 15, temp: -6,
        hsl: { red: { s: 5 }, green: { s: 5 }, aqua: { s: 15 }, blue: { h: -5, s: 15 } },
      },
      recipe: { wb: 'Tageslicht', exposure: '-1/3 EV', note: 'Wasser, Himmel, Architektur.' },
    },
    {
      id: 'cinenegative', name: 'Kinonegativ', file: 'CINENEG', group: CINE,
      desc: 'Kino-Negativfilm: viel Zeichnung, weiche Lichter, dezente Teal-Orange-Trennung.',
      params: {
        skinProtect: 30, skinGold: 30,
        contrast: -25, highlights: -30, shadows: 5, saturation: -10, temp: 3,
        splitShadowHue: 200, splitShadowAmt: 10, splitHighHue: 60, splitHighAmt: 8,
        hsl: { orange: { l: 3 }, green: { h: -10, s: -20 }, blue: { s: -10 } },
      },
      recipe: { exposure: '+1/3 EV', sharpness: '-1', note: 'Besonders gut als Video-LUT.' },
    },

    {
      id: 'mint400', name: 'Minze 400', file: 'MINT400', group: NEG,
      desc: 'Luftig und hell, minzige Grüntöne, zartes Blau, kühle Pastelle.',
      params: {
        skinProtect: 30, skinGold: 30,
        contrast: -15, highlights: -25, shadows: 10, fade: 5, temp: -3, saturation: -10, vibrance: 5,
        splitShadowHue: 180, splitShadowAmt: 8, splitHighHue: 100, splitHighAmt: 5,
        hsl: { red: { s: -10 }, orange: { s: -5, l: 5 }, green: { h: 15, s: -10, l: 5 }, aqua: { s: 5 }, blue: { h: -10, s: -10, l: 5 } },
      },
      recipe: { exposure: '+2/3 EV', nr: '-3', sharpness: '-1', grain: 'Schwach', note: 'Hochzeiten, Porträts im Grünen. Gerne hell belichten.' },
    },
    {
      id: 'coolneg400', name: 'Kühles Negativ 400', file: 'COOLN400', group: NEG,
      desc: 'Consumer-Film mit leichtem Grünstich: kühle Schatten, kräftiges Grün.',
      params: {
        skinProtect: 25, skinGold: 20,
        contrast: 15, saturation: 5, temp: -2, tint: -6, splitShadowHue: 160, splitShadowAmt: 10,
        hsl: { red: { h: -5, s: 5 }, orange: { s: -5 }, green: { h: 8, s: 10 }, blue: { s: 5 } },
      },
      recipe: { exposure: '+1/3 EV', nr: '-3', grain: 'Mittel', note: 'Alltag, Stadt, Natur.' },
    },
    {
      id: 'simple200', name: 'Einfachfilm 200', file: 'SIMPL200', group: NEG,
      desc: 'Einfacher Consumer-Film: leicht matt, kühl-grünliche Schatten, gedämpftes Blau.',
      params: {
        skinProtect: 20, skinGold: 20,
        contrast: 5, fade: 6, temp: -3, tint: -3, saturation: -5,
        splitShadowHue: 180, splitShadowAmt: 10, splitHighHue: 85, splitHighAmt: 6,
        hsl: { yellow: { h: 5 }, green: { h: 8, s: -5 }, blue: { s: -10 } },
      },
      recipe: { exposure: '+1/3 EV', nr: '-3', grain: 'Mittel', note: 'Lässige Alltags- und Urlaubsbilder.' },
    },

    {
      id: 'redaccent', name: 'Rotakzent', file: 'REDACCNT', group: NEG,
      desc: 'Leuchtende Rottöne, warm, kräftiger Kontrast.',
      params: {
        skinProtect: 40, skinGold: 25,
        contrast: 15, saturation: 15, temp: 5, splitShadowHue: 220, splitShadowAmt: 6,
        hsl: { red: { h: -5, s: 20 }, orange: { s: 5 }, green: { h: -5, s: 5 }, blue: { h: 3, s: 10 } },
      },
      recipe: { wb: 'Tageslicht', exposure: '0 EV', nr: '-3', grain: 'Mittel', note: 'Street mit roten Akzenten, Sommer.' },
    },
    {
      id: 'ultravivid', name: 'Ultrabunt', file: 'ULTRAVIV', group: SLIDE,
      desc: 'Extrem gesättigt, sehr kräftige Grundfarben.',
      params: {
        skinProtect: 55, skinGold: 30,
        contrast: 30, saturation: 35,
        hsl: { red: { s: 15 }, yellow: { s: 10 }, green: { s: 15 }, blue: { s: 15, l: -5 } },
      },
      recipe: { wb: 'Tageslicht', exposure: '-1/3 EV', note: 'Bunte Motive, Pop-Look.' },
    },
    {
      id: 'wild800', name: 'Wild 800', file: 'WILD800', group: SLIDE,
      desc: 'Wild und kräftig: harter Kontrast, türkise Schatten, starke Farben.',
      params: {
        skinProtect: 35, skinGold: 20,
        contrast: 35, shadows: -10, saturation: 25, temp: 5, tint: 5,
        splitShadowHue: 200, splitShadowAmt: 18, splitHighHue: 70, splitHighAmt: 10,
        hsl: { red: { s: 15 }, green: { h: 10, s: 5 }, blue: { s: 15 } },
      },
      recipe: { exposure: '0 EV', nr: '-4', grain: 'Stark', note: 'Party, Nacht, Experimente.' },
    },
    {
      id: 'instant', name: 'Sofortbild', file: 'INSTANT', group: POPULAR,
      desc: 'Wie ein Sofortbild: matt, verblasst, warme Lichter, kühle Schatten.',
      params: {
        skinProtect: 20, skinGold: 20,
        contrast: -20, fade: 18, whiteMatte: 10, temp: 8, saturation: -20,
        splitShadowHue: 190, splitShadowAmt: 18, splitHighHue: 70, splitHighAmt: 15,
        hsl: { green: { h: 10, s: -20 }, blue: { s: -15 } },
      },
      recipe: { exposure: '+1/3 EV', nr: '-3', sharpness: '-2', grain: 'Mittel', note: 'Erinnerungsfotos, Porträts, Innenräume.' },
    },
    {
      id: 'tungsten800', name: 'Kunstlicht 800', file: 'TUNGS800', group: CINE,
      desc: 'Kunstlichtfilm: kühler Grundton, türkise Schatten, rötliche Lichter. Stark bei Nacht und Neon.',
      params: {
        temp: -25, tint: 5, contrast: 15, highlights: -15, saturation: -5, fade: 5,
        splitShadowHue: 205, splitShadowAmt: 25, splitHighHue: 30, splitHighAmt: 10,
        hsl: { red: { h: -5, s: 10 }, orange: { s: -5 }, yellow: { s: -20 }, green: { h: 20, s: -30 }, blue: { h: -10, s: 5 } },
      },
      recipe: { wb: '3200K (Glühlampe) bei Kunstlicht, sonst AWB', wbShift: 'B1 / 0', sharpness: '-1', grain: 'Mittel', note: 'Nachts in der Stadt. Bei Tageslicht wird das Bild bewusst blau, wie beim echten Kunstlichtfilm. Den roten Lichthof (Halation) solcher Filme kann eine LUT nicht erzeugen.' },
    },
    {
      id: 'daylightcine', name: 'Tageslicht-Kino', file: 'DAYCINE', group: CINE,
      desc: 'Tageslicht-Kinofilm: sauber, klares Blau, dezente Teal-Orange-Trennung.',
      params: {
        skinProtect: 30, skinGold: 25,
        contrast: 10, highlights: -15, saturation: 5,
        splitShadowHue: 205, splitShadowAmt: 10, splitHighHue: 60, splitHighAmt: 6,
        hsl: { orange: { s: 5 }, green: { h: -8, s: -15 }, aqua: { s: 10 }, blue: { h: -5, s: 10 } },
      },
      recipe: { wb: 'Tageslicht', exposure: '0 EV', note: 'Strand, Stadt bei Sonne, Reisen.' },
    },

    // --- Kino ---------------------------------------------------------------------
    {
      id: 'tealorange', name: 'Teal & Orange', file: 'TEALORNG', group: CINE,
      desc: 'Der Blockbuster-Klassiker: türkise Schatten und Umgebung, warme Haut. Hauttöne bleiben geschützt.',
      params: {
        contrast: 20, highlights: -15, saturation: -5, skinProtect: 60, skinGold: 35,
        splitShadowHue: 205, splitShadowAmt: 40, splitHighHue: 60, splitHighAmt: 16, splitBalance: -20,
        hsl: {
          red: { h: 5 }, orange: { s: 10, l: 5 }, yellow: { h: -15, s: -15 },
          green: { h: 35, s: -40 }, aqua: { s: 10 }, blue: { h: -20, s: -10, l: -10 },
        },
      },
      recipe: { exposure: '+1/3 EV', sharpness: '-1', note: 'Porträts in der Stadt, Abendlicht, Video. Funktioniert am besten, wenn Haut im Bild ist.' },
    },
    {
      id: 'printwarm', name: 'Kino-Print warm', file: 'PRINTWRM', group: CINE,
      desc: 'Wie ein Kinofilm-Abzug: satte, dichte Schatten, warme Mitten, tiefes Blau. Der Standard vieler Film-LUTs.',
      params: {
        skinProtect: 30, skinGold: 25,
        contrast: 35, highlights: 5, shadows: -15, saturation: 5, temp: 4, hueStability: 30,
        splitShadowHue: 200, splitShadowAmt: 10, splitHighHue: 65, splitHighAmt: 10,
        hsl: {
          red: { h: -3, s: 10 }, orange: { s: 5 }, yellow: { h: -10 }, green: { h: 10, s: -15, l: -10 },
          aqua: { s: 5 }, blue: { h: -10, s: 10, l: -15 },
        },
      },
      recipe: { exposure: '+1/3 EV', note: 'Filmischer Allrounder, auch sehr gut für Video. Lieber etwas reichlicher belichten, die Schatten werden dicht.' },
    },
    {
      id: 'printcool', name: 'Kino-Print kühl', file: 'PRINTCOL', group: CINE,
      desc: 'Kühlerer Kino-Abzug: kräftiger Kontrast, Grün Richtung Cyan, klare Lichter.',
      params: {
        skinProtect: 30, skinGold: 20,
        contrast: 30, shadows: -10, temp: -3, hueStability: 30,
        splitShadowHue: 190, splitShadowAmt: 12, splitHighHue: 80, splitHighAmt: 6,
        hsl: { red: { s: 5 }, green: { h: 15, s: -10 }, aqua: { s: 5 }, blue: { s: 5 } },
      },
      recipe: { exposure: '+1/3 EV', note: 'Stadt, Architektur, Video bei Tageslicht.' },
    },
    {
      id: 'moody', name: 'Moody Kino', file: 'MOODY', group: CINE,
      desc: 'Dunkel und gedämpft: matte, kühle Schatten, entsättigtes Grün, ruhige Stimmung.',
      params: {
        skinProtect: 25, skinGold: 20,
        contrast: 15, highlights: -25, shadows: -20, fade: 8, saturation: -30, temp: -5,
        splitShadowHue: 220, splitShadowAmt: 18, splitHighHue: 55, splitHighAmt: 8,
        hsl: { orange: { s: -5 }, green: { h: -10, s: -35, l: -15 }, aqua: { s: -15 }, blue: { s: -25, l: -10 } },
      },
      recipe: { exposure: '0 EV', sharpness: '-1', grain: 'Schwach', note: 'Regen, Herbst, Innenräume mit Fensterlicht.' },
    },
    {
      id: 'neon', name: 'Neon Nacht', file: 'NEON', group: CINE,
      desc: 'Nachtstadt-Look: blauviolette Schatten, magentafarbene Lichter, leuchtende Neonfarben.',
      params: {
        skinProtect: 40, skinGold: 10,
        temp: -15, tint: 10, contrast: 25, saturation: 10,
        splitShadowHue: 260, splitShadowAmt: 22, splitHighHue: 330, splitHighAmt: 10,
        hsl: {
          red: { h: -10, s: 10 }, yellow: { s: -20 }, green: { h: 20, s: -20 },
          blue: { s: 10 }, purple: { s: 15 }, magenta: { s: 15 },
        },
      },
      recipe: { wb: '4000K oder AWB', exposure: '-1/3 EV', nr: '-2', grain: 'Mittel', note: 'Nachts mit Leuchtreklamen und Straßenlicht. Lichter schützen, sonst laufen Neonfarben aus.' },
    },
    {
      id: 'desert', name: 'Warme Wüste', file: 'DESERT', group: CINE,
      desc: 'Staubig-warmer Endzeit-Look: Orange und Sand betont, Himmel und Grün stark zurückgenommen.',
      params: {
        skinProtect: 20, skinGold: 20,
        temp: 25, contrast: 25, saturation: -10,
        splitShadowHue: 40, splitShadowAmt: 10, splitHighHue: 75, splitHighAmt: 20,
        hsl: { orange: { s: 15 }, yellow: { h: -10, s: 10 }, green: { h: -25, s: -30 }, aqua: { s: -30 }, blue: { h: -20, s: -40 } },
      },
      recipe: { wb: 'Tageslicht', exposure: '0 EV', note: 'Sommer, Strand, Landschaft bei hartem Licht.' },
    },
    {
      id: 'nordic', name: 'Nordisch kühl', file: 'NORDIC', group: CINE,
      desc: 'Klar und kühl wie skandinavische Serien: wenig Farbe, blaugraue Schatten, sanft.',
      params: {
        skinProtect: 20, skinGold: 15,
        temp: -12, contrast: 5, saturation: -25, fade: 6,
        splitShadowHue: 220, splitShadowAmt: 15, splitHighHue: 200, splitHighAmt: 8,
        hsl: { orange: { s: -15 }, green: { h: 10, s: -30 }, blue: { s: -10 } },
      },
      recipe: { exposure: '+1/3 EV', sharpness: '-1', note: 'Winter, Meer, Architektur, bedeckter Himmel.' },
    },

    // --- Beliebte Stile -------------------------------------------------------------
    {
      id: 'airy', name: 'Hell & Luftig', file: 'AIRY', group: POPULAR,
      desc: 'Hell, weich und freundlich: offene Schatten, zarte Farben, schöne Haut.',
      params: {
        exposure: 0.35, contrast: -20, highlights: -30, shadows: 30, fade: 5, saturation: -15, vibrance: 10, temp: 5, skinProtect: 50, skinGold: 30,
        hsl: { orange: { l: 8 }, green: { h: -15, s: -30, l: 10 }, blue: { s: -20, l: 10 } },
      },
      recipe: { exposure: '+1/3 EV', sharpness: '-1', note: 'Familie, Kinder, Hochzeit, helle Innenräume.' },
    },
    {
      id: 'darkmatte', name: 'Dunkel & Matt', file: 'DARKMATT', group: POPULAR,
      desc: 'Der Social-Media-Klassiker: angehobenes Schwarz, gedämpfte Farben, dunkles Grün.',
      params: {
        skinProtect: 25, skinGold: 20,
        exposure: -0.2, contrast: 10, shadows: -25, fade: 18, saturation: -25,
        splitShadowHue: 230, splitShadowAmt: 10,
        hsl: { green: { s: -30, l: -15 }, blue: { s: -20 } },
      },
      recipe: { exposure: '0 EV', grain: 'Schwach', note: 'Street, Kaffee und Essen, Herbst.' },
    },
    {
      id: 'golden', name: 'Goldene Stunde', file: 'GOLDEN', group: POPULAR,
      desc: 'Holt das Abendlicht in jedes Bild: goldene Lichter, warme Mitten, weiche Kontraste.',
      params: {
        skinProtect: 30, skinGold: 30,
        temp: 20, tint: 4, contrast: 5, highlights: -20, saturation: 5, vibrance: 15,
        splitShadowHue: 30, splitShadowAmt: 8, splitMidHue: 55, splitMidAmt: 10, splitHighHue: 70, splitHighAmt: 25,
        hsl: { orange: { s: 10, l: 5 }, yellow: { s: 15 }, green: { h: -15 } },
      },
      recipe: { wb: 'Tageslicht', exposure: '+1/3 EV', note: 'Porträts und Landschaft bei tief stehender Sonne. Bei Mittagslicht wirkt es künstlich warm.' },
    },
    {
      id: 'pastel', name: 'Pastell', file: 'PASTELL', group: POPULAR,
      desc: 'Verträumte Bonbonfarben: helle, sanfte Töne, flache Kontraste, keine harten Schatten.',
      params: {
        skinProtect: 30, skinGold: 25,
        contrast: -25, shadows: 20, fade: 10, whiteMatte: 8, saturation: -20, vibrance: 15,
        hsl: {
          red: { s: -10, l: 10 }, orange: { l: 8 }, yellow: { l: 10 }, green: { h: 10, s: -15, l: 10 },
          aqua: { l: 10 }, blue: { s: -10, l: 10 }, magenta: { l: 10 },
        },
      },
      recipe: { exposure: '+2/3 EV', sharpness: '-1', note: 'Bunte Fassaden, Blumen, Mode, symmetrische Motive.' },
    },
    {
      id: 'vintage70', name: 'Vintage 70er', file: 'VINTAG70', group: POPULAR,
      desc: 'Verblasster Familienalbum-Look: warme, bräunliche Schatten, mattes Schwarz, gelbliches Weiß.',
      params: {
        skinProtect: 20, skinGold: 20,
        temp: 15, contrast: -5, fade: 15, whiteMatte: 6, saturation: -15,
        splitShadowHue: 40, splitShadowAmt: 15, splitHighHue: 80, splitHighAmt: 15,
        hsl: { red: { h: 5 }, yellow: { s: 10 }, green: { h: -25, s: -25 }, blue: { h: -15, s: -35 } },
        curves: { b: [[0, 0.06], [1, 0.92]] },
      },
      recipe: { wb: 'Tageslicht', exposure: '+1/3 EV', nr: '-3', sharpness: '-2', grain: 'Mittel', note: 'Alltag, Familie, Urlaub. Mit Körnung noch überzeugender.' },
    },
    {
      id: 'xpro', name: 'Cross-Entwicklung', file: 'XPRO', group: POPULAR,
      desc: 'Wie Diafilm im Negativ-Bad entwickelt: harter Kontrast, gelbliche Lichter, bläuliche Schatten, schrille Farben.',
      params: {
        contrast: 30, saturation: 5,
        curves: {
          r: [[0, 0], [0.25, 0.2], [0.75, 0.83], [1, 1]],
          g: [[0, 0], [0.5, 0.53], [1, 1]],
          b: [[0, 0.1], [1, 0.86]],
        },
      },
      recipe: { exposure: '0 EV', grain: 'Mittel', note: 'Party, Street, Experimente. Bewusst übertrieben.' },
    },
    {
      id: 'wedding', name: 'Hochzeit sauber', file: 'WEDDING', group: POPULAR,
      desc: 'Natürlich, hell und zeitlos: saubere Haut, ruhiges Grün, weiche Lichter.',
      params: {
        highlights: -20, shadows: 15, saturation: -5, vibrance: 10, temp: 3, skinProtect: 70, skinGold: 35,
        hsl: { orange: { s: -5, l: 6 }, green: { h: -10, s: -15 } },
      },
      recipe: { exposure: '+1/3 EV', sharpness: '-1', note: 'Hochzeiten, Porträts, Feiern. Weißes Kleid: Lichter nicht überbelichten.' },
    },
    {
      id: 'earthy', name: 'Erdtöne', file: 'EARTHY', group: POPULAR,
      desc: 'Natürlich-gedeckt: Grün wird olivbraun, Blau zurückhaltend, warmes Licht. Beliebt für Reisen und Outdoor.',
      params: {
        skinProtect: 25, skinGold: 20,
        temp: 8, contrast: 10, saturation: -20, fade: 5,
        splitHighHue: 65, splitHighAmt: 10,
        hsl: {
          red: { h: 5, s: -10 }, orange: { s: -5 }, yellow: { h: -15, s: -20 }, green: { h: -25, s: -35, l: -10 },
          aqua: { s: -30 }, blue: { h: -10, s: -40, l: -10 },
        },
      },
      recipe: { exposure: '0 EV', grain: 'Schwach', note: 'Wandern, Reisen, Natur, Vanlife.' },
    },

    // --- Schwarzweiß --------------------------------------------------------------
    {
      id: 'bwfine', name: 'SW Fein', file: 'BWFINE', group: BW,
      desc: 'Feines Schwarzweiß mit satten Schwarztönen und klaren Mitteltönen (Gelbfilter).',
      params: { mono: true, monoFilter: 'yellow', contrast: 20, highlights: -5, shadows: -10 },
      recipe: { sharpness: '+1', grain: 'Schwach', note: 'Für alle Motive.' },
    },
    {
      id: 'bwfinered', name: 'SW Fein + Rotfilter', file: 'BWFINER', group: BW,
      desc: 'Dunkler Himmel, helle Haut, dramatisch.',
      params: { mono: true, monoFilter: 'red', contrast: 25, highlights: -5, shadows: -10 },
      recipe: { sharpness: '+1', grain: 'Schwach', note: 'Landschaft mit Wolken, Architektur.' },
    },
    {
      id: 'bwfinegreen', name: 'SW Fein + Grünfilter', file: 'BWFINEG', group: BW,
      desc: 'Helles Laub, natürlich wirkende Hauttöne.',
      params: { mono: true, monoFilter: 'green', contrast: 18, highlights: -5, shadows: -5 },
      recipe: { sharpness: '+1', grain: 'Schwach', note: 'Porträts im Grünen, Wald.' },
    },
    {
      id: 'bwreportage', name: 'SW Reportage', file: 'BWREPORT', group: BW,
      desc: 'Klassischer Reportage-Film: kräftiger Kontrast, leicht angehobenes Schwarz, warmer Ton.',
      params: {
        mono: true, monoFilter: 'orange', contrast: 40, shadows: -5, fade: 4,
        splitShadowHue: 70, splitShadowAmt: 4, splitHighHue: 75, splitHighAmt: 4,
      },
      recipe: { nr: '-3', grain: 'Stark', exposure: '0 bis +1/3 EV', note: 'Street und Menschen. Gerne bei hartem Licht.' },
    },
    {
      id: 'bwclassic', name: 'SW Klassisch', file: 'BWCLASSC', group: BW,
      desc: 'Weicheres Reportage-Schwarzweiß mit viel Zeichnung.',
      params: { mono: true, monoFilter: 'none', contrast: 15, highlights: -10, shadows: 5, fade: 3 },
      recipe: { nr: '-3', grain: 'Mittel', note: 'Alltag, Dokumentation, wechselndes Licht.' },
    },
    {
      id: 'bwcrisp', name: 'SW Klar', file: 'BWCRISP', group: BW,
      desc: 'Sehr klar und fein, knackige Tonwerte.',
      params: { mono: true, monoFilter: 'yellow', contrast: 25, highlights: -5, shadows: -10 },
      recipe: { sharpness: '+1', note: 'Architektur, Produkte, Landschaft.' },
    },
    {
      id: 'bwnight', name: 'SW Nacht', file: 'BWNIGHT', group: BW,
      desc: 'Grobes, kontrastreiches Nacht-Schwarzweiß.',
      params: { mono: true, monoFilter: 'none', contrast: 45, highlights: 15, shadows: -10, fade: 8 },
      recipe: { nr: '-5', grain: 'Stark', note: 'Nacht, Konzerte, Stimmung statt Detail.' },
    },
    {
      id: 'sepia', name: 'Sepia', file: 'SEPIA', group: BW,
      desc: 'Warm getöntes Schwarzweiß wie ein alter Abzug.',
      params: {
        mono: true, monoFilter: 'none', contrast: 5, fade: 5,
        splitShadowHue: 60, splitShadowAmt: 25, splitHighHue: 75, splitHighAmt: 30,
      },
      recipe: { sharpness: '-1', grain: 'Schwach', note: 'Porträts, Familienbilder, Nostalgie.' },
    },
    {
      id: 'bwhigh', name: 'SW Hochkontrast', file: 'BWHIGH', group: BW,
      desc: 'Dramatisches Schwarzweiß mit tiefem Schwarz und strahlenden Lichtern (Rotfilter).',
      params: { mono: true, monoFilter: 'red', contrast: 60, highlights: 15, shadows: -25 },
      recipe: { sharpness: '+1', grain: 'Mittel', note: 'Architektur, Street bei Sonne, Wolkenhimmel.' },
    },
    {
      id: 'bwmatte', name: 'SW Matt', file: 'BWMATT', group: BW,
      desc: 'Weiches, mattes Schwarzweiß mit angehobenem Schwarz.',
      params: { mono: true, monoFilter: 'none', contrast: -10, fade: 15, whiteMatte: 8 },
      recipe: { sharpness: '-1', grain: 'Mittel', note: 'Porträts, ruhige Motive, Innenräume.' },
    },
    {
      id: 'selenium', name: 'Selen-Ton', file: 'SELEN', group: BW,
      desc: 'Schwarzweiß mit kühl-violetten Schatten wie ein selengetonter Barytabzug.',
      params: {
        mono: true, monoFilter: 'yellow', contrast: 25, shadows: -10,
        splitShadowHue: 285, splitShadowAmt: 12, splitHighHue: 70, splitHighAmt: 3,
      },
      recipe: { sharpness: '0', grain: 'Schwach', note: 'Landschaft, Architektur, Fine Art.' },
    },
  ];

  // Englische Texte je Look (Sprachumschaltung).
  const EN = {
    neutral: {"name": "Neutral", "desc": "Clean conversion from V-Log to Rec.709. A good starting point for your own looks.", "note": "Reference look to judge the exposure of the V-Log base."},
    balanced: {"name": "Balanced", "desc": "Standard: balanced, natural colours with a little bite.", "note": "All-rounder for any situation."},
    vibrant: {"name": "Vibrant", "desc": "Lively: strong colours, deep shadows, rich blue and green.", "note": "Landscape and nature. Usually too strong for portraits."},
    softcolor: {"name": "Soft", "desc": "Gentle: soft contrast, flattering skin tones, still lively colours.", "note": "Outdoor portraits and fashion."},
    documentary: {"name": "Documentary", "desc": "Muted colours, rich shadows, cyan-leaning blue, olive greens.", "note": "Street and reportage. Shadows look especially good in hard light."},
    truecolor: {"name": "True Color", "desc": "Faithful colours with crisp tonality, like a modern negative film.", "note": "When it should look natural but not boring."},
    portraitpunch: {"name": "Portrait Contrast", "desc": "Portrait film with a bit more contrast, restrained colours, beautiful skin.", "note": "Portraits in flat light."},
    portraitsoft: {"name": "Portrait Soft", "desc": "Very soft and neutral, like studio negative film.", "note": "Portraits in contrasty light, also indoors."},
    snapshot: {"name": "Snapshot", "desc": "Hard curve, teal shadows, warm highlights, red slightly towards magenta.", "note": "Everyday and family photos with a snapshot feel. Don’t underexpose."},
    nostalgia: {"name": "Nostalgia", "desc": "Amber highlights, rich shadows, the mood of old colour prints.", "note": "City, travel, sunsets."},
    flatcinema: {"name": "Flat Cinema", "desc": "Cinema film: flat, low saturation, soft highlights. Also great for video.", "note": "Calm, filmic images. Ideal as a video LUT because the look leaves plenty of room."},
    bleach: {"name": "Bleach Bypass", "desc": "Hard contrast, strongly desaturated, metallic cinema look.", "note": "Architecture, street, dramatic scenes."},
    portrait160: {"name": "Portrait Film 160", "desc": "Fine and restrained, natural skin tones, soft pastels.", "note": "Portraits and weddings in good light."},
    portrait400: {"name": "Portrait Film 400", "desc": "Warm, pastel, glowing skin tones, muted greens, soft highlights.", "note": "Like negative film: rather expose generously. Strong for portraits and backlight."},
    portrait800: {"name": "Portrait Film 800", "desc": "Warmer and richer than Portrait Film 400, slightly cool shadows.", "note": "Evening light, interiors, concerts."},
    landscape100: {"name": "Landscape Film 100", "desc": "Fine-grain colour film: punchy, contrasty, deep blue.", "note": "Landscape and architecture. Careful with skin tones, they get strong quickly."},
    summer200: {"name": "Summer Film 200", "desc": "Sunny consumer film: warm, strong yellows, nostalgic.", "note": "Holidays, summer, golden hour."},
    everyday400: {"name": "Everyday Film 400", "desc": "Punchy everyday film: warm, rich reds and yellows, a hint of grain feel.", "note": "Snapshots, parties, everyday life."},
    retro200: {"name": "Retro Film 200", "desc": "Budget retro film: warm, slightly matte, muted green and blue.", "note": "Summer and travel photos with a 90s feel."},
    classicslide: {"name": "Classic Slide", "desc": "Legendary-style slide film: deep reds and blues, rich shadows, vintage contrast.", "note": "Like slide film: protect the highlights, rather expose a bit less."},
    modernslide: {"name": "Modern Slide", "desc": "Modern slide film: clean, slightly cool, glowing blue and turquoise.", "note": "Water, sky, architecture."},
    cinenegative: {"name": "Cinema Negative", "desc": "Cinema negative film: lots of detail, soft highlights, subtle teal-orange split.", "note": "Especially good as a video LUT."},
    mint400: {"name": "Mint 400", "desc": "Airy and bright, minty greens, delicate blue, cool pastels.", "note": "Weddings, portraits in greenery. Feel free to expose bright."},
    coolneg400: {"name": "Cool Negative 400", "desc": "Consumer film with a slight green tint: cool shadows, strong greens.", "note": "Everyday, city, nature."},
    simple200: {"name": "Simple Film 200", "desc": "Simple consumer film: slightly matte, cool greenish shadows, muted blue.", "note": "Casual everyday and holiday photos."},
    redaccent: {"name": "Red Accent", "desc": "Glowing reds, warm, strong contrast.", "note": "Street with red accents, summer."},
    ultravivid: {"name": "Ultra Vivid", "desc": "Extremely saturated, very strong primary colours.", "note": "Colourful subjects, pop look."},
    wild800: {"name": "Wild 800", "desc": "Wild and punchy: hard contrast, teal shadows, strong colours.", "note": "Parties, night, experiments."},
    instant: {"name": "Instant Photo", "desc": "Like an instant print: matte, faded, warm highlights, cool shadows.", "note": "Memories, portraits, interiors."},
    tungsten800: {"name": "Tungsten 800", "desc": "Tungsten film: cool base tone, teal shadows, reddish highlights. Strong at night and with neon.", "note": "At night in the city. In daylight the image turns deliberately blue, like real tungsten film. A LUT cannot create the red halation glow of such films."},
    daylightcine: {"name": "Daylight Cinema", "desc": "Daylight cinema film: clean, clear blue, subtle teal-orange split.", "note": "Beach, sunny city, travel."},
    tealorange: {"name": "Teal & Orange", "desc": "The blockbuster classic: teal shadows and surroundings, warm skin. Skin tones stay protected.", "note": "City portraits, evening light, video. Works best with skin in the frame."},
    printwarm: {"name": "Cinema Print Warm", "desc": "Like a cinema print: rich, dense shadows, warm mids, deep blue. The basis of many film LUTs.", "note": "Filmic all-rounder, also great for video. Expose a bit generously, the shadows get dense."},
    printcool: {"name": "Cinema Print Cool", "desc": "Cooler cinema print: strong contrast, green towards cyan, clean highlights.", "note": "City, architecture, daylight video."},
    moody: {"name": "Moody Cinema", "desc": "Dark and muted: matte, cool shadows, desaturated green, calm mood.", "note": "Rain, autumn, interiors with window light."},
    neon: {"name": "Neon Night", "desc": "Night city look: blue-violet shadows, magenta highlights, glowing neon colours.", "note": "At night with neon signs and street lights. Protect highlights or neon colours bleed out."},
    desert: {"name": "Warm Desert", "desc": "Dusty, warm wasteland look: orange and sand emphasised, sky and green strongly held back.", "note": "Summer, beach, landscape in hard light."},
    nordic: {"name": "Nordic Cool", "desc": "Clean and cool like Scandinavian series: little colour, blue-grey shadows, soft.", "note": "Winter, sea, architecture, overcast sky."},
    airy: {"name": "Light & Airy", "desc": "Bright, soft and friendly: open shadows, delicate colours, beautiful skin.", "note": "Family, kids, weddings, bright interiors."},
    darkmatte: {"name": "Dark & Matte", "desc": "The social media classic: lifted blacks, muted colours, dark green.", "note": "Street, coffee and food, autumn."},
    golden: {"name": "Golden Hour", "desc": "Brings evening light into every image: golden highlights, warm mids, soft contrast.", "note": "Portraits and landscape with a low sun. Looks artificially warm at midday."},
    pastel: {"name": "Pastel", "desc": "Dreamy candy colours: bright, soft tones, flat contrast, no hard shadows.", "note": "Colourful facades, flowers, fashion, symmetric subjects."},
    vintage70: {"name": "Vintage 70s", "desc": "Faded family-album look: warm brownish shadows, matte blacks, yellowish whites.", "note": "Everyday, family, holidays. Even more convincing with grain."},
    xpro: {"name": "Cross Process", "desc": "Like slide film developed in negative chemistry: hard contrast, yellowish highlights, bluish shadows, loud colours.", "note": "Parties, street, experiments. Deliberately over the top."},
    wedding: {"name": "Clean Wedding", "desc": "Natural, bright and timeless: clean skin, calm greens, soft highlights.", "note": "Weddings, portraits, celebrations. White dress: don’t overexpose the highlights."},
    earthy: {"name": "Earth Tones", "desc": "Natural and muted: green turns olive-brown, restrained blue, warm light. Popular for travel and outdoors.", "note": "Hiking, travel, nature, vanlife."},
    bwfine: {"name": "B&W Fine", "desc": "Fine black and white with rich blacks and clear midtones (yellow filter).", "note": "For any subject."},
    bwfinered: {"name": "B&W Fine + Red Filter", "desc": "Dark sky, light skin, dramatic.", "note": "Landscape with clouds, architecture."},
    bwfinegreen: {"name": "B&W Fine + Green Filter", "desc": "Bright foliage, natural-looking skin tones.", "note": "Portraits in greenery, forest."},
    bwreportage: {"name": "B&W Reportage", "desc": "Classic reportage film: strong contrast, slightly lifted blacks, warm tone.", "note": "Street and people. Ideally in hard light."},
    bwclassic: {"name": "B&W Classic", "desc": "Softer reportage black and white with lots of detail.", "note": "Everyday, documentary, changing light."},
    bwcrisp: {"name": "B&W Crisp", "desc": "Very clean and fine, crisp tonality.", "note": "Architecture, products, landscape."},
    bwnight: {"name": "B&W Night", "desc": "Gritty, contrasty night black and white.", "note": "Night, concerts, mood over detail."},
    sepia: {"name": "Sepia", "desc": "Warm-toned black and white like an old print.", "note": "Portraits, family photos, nostalgia."},
    bwhigh: {"name": "B&W High Contrast", "desc": "Dramatic black and white with deep blacks and brilliant highlights (red filter).", "note": "Architecture, sunny street, cloudy skies."},
    bwmatte: {"name": "B&W Matte", "desc": "Soft, matte black and white with lifted blacks.", "note": "Portraits, calm subjects, interiors."},
    selenium: {"name": "Selenium Tone", "desc": "Black and white with cool violet shadows like a selenium-toned fibre print.", "note": "Landscape, architecture, fine art."},
  };
  const GROUP_EN = {"Basis": "Basics", "Kamera-Klassiker": "Camera Classics", "Farbnegativ": "Color Negative", "Dia & Kräftig": "Slide & Punchy", "Kino": "Cinema", "Beliebte Stile": "Popular Styles", "Schwarzweiß": "Black & White"};

  for (const p of PRESETS) {
    p.recipe = Object.assign({}, RECIPE_DEFAULT, p.recipe);
    p.en = Object.assign({ group: GROUP_EN[p.group] }, EN[p.id]);
  }
  // Nach Gruppen sortieren (stabil), damit jede Gruppe zusammenhängend angezeigt wird.
  PRESETS.sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));

  root.LutPresets = PRESETS;
})(typeof globalThis !== 'undefined' ? globalThis : this);
