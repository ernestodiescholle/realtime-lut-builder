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
  const EDIT = 'Editorial';
  const NIGHT = 'Nacht';
  const BW = 'Schwarzweiß';
  const GROUP_ORDER = [BASE, CLASSIC, NEG, SLIDE, CINE, NIGHT, POPULAR, EDIT, BW];

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
      id: 'sunlit', name: 'Sonnenlicht-Film', file: 'SUNLIT', group: NEG,
      desc: 'Sonniger Negativfilm: sattes Grün, leuchtendes Gelb, blasser dunstiger Himmel, weiche Lichter, warme Steine.',
      params: {
        skinProtect: 30, skinGold: 25,
        temp: 5, exposure: 0.15, contrast: 30, highlights: -25, shadows: -15, fade: 2, whiteMatte: 3, vibrance: 15,
        splitShadowHue: 100, splitShadowAmt: 5, splitMidHue: 75, splitMidAmt: 5, splitHighHue: 95, splitHighAmt: 10,
        hsl: {
          red: { h: 5, s: 8 }, orange: { h: 5, s: 10 }, yellow: { s: 35, l: 10 }, green: { h: -25, s: 25, l: 3 },
          aqua: { s: -40, l: 5 }, blue: { s: -45, l: 12 }, purple: { s: -20 }, magenta: { s: -15 },
        },
      },
      recipe: { wb: 'Tageslicht', exposure: '+1/3 EV', grain: 'Schwach', note: 'Sonne und Gegenlicht in der Natur, Bäume, Küste. Bei bedecktem Himmel wirkt es ruhiger.' },
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
      id: 'tungsten800', name: 'Kunstlicht 800', file: 'TUNGS800', group: NIGHT,
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
      id: 'neon', name: 'Neon Nacht', file: 'NEON', group: NIGHT,
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
      id: 'bwfinered', name: 'SW Fein + Rotfilter', file: 'BWFROT', group: BW,
      desc: 'Dunkler Himmel, helle Haut, dramatisch.',
      params: { mono: true, monoFilter: 'red', contrast: 25, highlights: -5, shadows: -10 },
      recipe: { sharpness: '+1', grain: 'Schwach', note: 'Landschaft mit Wolken, Architektur.' },
    },
    {
      id: 'bwfinegreen', name: 'SW Fein + Grünfilter', file: 'BWFGRN', group: BW,
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
    {
      id: 'eveningsalon', name: 'Abendsalon', file: 'SALON', group: EDIT,
      desc: 'Dunkel und warm wie ein Abend im Salon: tiefe Schatten, warme Mitten, kräftiger Kontrast.',
      params: {
        contrast: 80, highlights: 1, shadows: 16, tint: -1, saturation: -15, vibrance: -7, splitBalance: -4,
        splitShadowHue: 129, splitShadowAmt: 25, splitMidHue: 104, splitMidAmt: 16, splitHighHue: 99, splitHighAmt: 17,
        hsl: {
          red: { h: 8, s: 2, l: -8 }, orange: { h: -3, s: -4, l: -12 }, yellow: { h: -10, l: -14 }, blue: { s: -17, l: -16 }, purple: { h: -1 }, magenta: { h: 4, s: -9, l: -8 },
        },
      },
      recipe: { grain: 'Schwach', note: 'Innenräume mit warmem Licht, Abendstimmung. Eher knapp belichten.' },
    },
    {
      id: 'silkwhite', name: 'Seidenweiß', file: 'SEIDE', group: EDIT,
      desc: 'Hell und weich: cremige Weißtöne, sanfte Kontraste, zurückhaltende Farben.',
      params: {
        contrast: 44, highlights: -7, shadows: 12, whiteMatte: 7, temp: 1, saturation: 1, vibrance: 2, splitBalance: 4,
        splitShadowHue: 300, splitShadowAmt: 11, splitMidHue: 74, splitMidAmt: 14, splitHighHue: 68, splitHighAmt: 21,
        hsl: {
          red: { h: -4, l: -2 }, orange: { h: -1, s: 2, l: -3 }, yellow: { h: -3, s: -8 }, green: { h: -4, s: 1 }, aqua: { h: -3 }, blue: { h: -1, s: -10 }, purple: { h: -2 }, magenta: { h: -4 },
        },
      },
      recipe: { grain: 'Schwach', note: 'Brautkleider, helle Stoffe, Fensterlicht. Gern etwas reichlicher belichten.' },
    },
    {
      id: 'fadedrose', name: 'Rosé matt', file: 'ROSEMT', group: EDIT,
      desc: 'Matt und gedämpft: zarte Rosatöne, ruhiges Grün, weiche Schatten.',
      params: {
        contrast: 50, highlights: -35, shadows: 42, fade: 20, whiteMatte: 20, tint: 1, saturation: -10, vibrance: -4, splitBalance: 2,
        splitHighHue: 33, splitHighAmt: 8,
        hsl: {
          red: { h: -6, s: -11, l: -9 }, orange: { h: 1, s: -8, l: -3 }, yellow: { h: -7, s: -38, l: -6 }, green: { h: -19, s: -38, l: -3 }, aqua: { h: 5, s: -20 }, blue: { h: 5, s: -39, l: 8 }, purple: { h: 4, s: -16 }, magenta: { h: 10, s: -9, l: -9 },
        },
      },
      recipe: { grain: 'Aus', note: 'Blumen, Gärten, Fassaden mit Pflanzen.' },
    },
    {
      id: 'amber', name: 'Bernstein', file: 'AMBER', group: EDIT,
      desc: 'Warmes Gold und satte Farben, kräftiger Kontrast – wie Kerzenlicht in einem alten Saal.',
      params: {
        contrast: 75, highlights: -8, shadows: 4, whiteMatte: 4, temp: 3, tint: -2, saturation: -11, vibrance: -56, splitBalance: 9,
        splitMidHue: 112, splitMidAmt: 55, splitHighHue: 78, splitHighAmt: 21,
        hsl: {
          red: { h: 23, s: 14, l: 28 }, orange: { l: 8 }, yellow: { h: -6, s: -28, l: 6 }, green: { h: -8, s: -22, l: -6 }, blue: { s: -19, l: 2 }, purple: { l: -1 }, magenta: { h: 14, s: -10, l: -4 },
        },
      },
      recipe: { grain: 'Schwach', note: 'Innenräume mit Holz, Gold und warmem Licht.' },
    },
    {
      id: 'linen', name: 'Leinen', file: 'LEINEN', group: EDIT,
      desc: 'Natürlich und ruhig: sanft warm, weiche Kontraste, unaufdringliche Farben.',
      params: {
        contrast: 25, highlights: -14, shadows: 7, whiteMatte: 16, temp: 1, saturation: 5, vibrance: 3, splitBalance: 2,
        splitShadowHue: 144, splitShadowAmt: 8, splitMidHue: 74, splitMidAmt: 12, splitHighHue: 71, splitHighAmt: 10,
        hsl: {
          red: { l: 18 }, orange: { l: 16 }, yellow: { h: 2, s: -6, l: 25 }, green: { h: 1, s: -40, l: 19 }, blue: { s: -10 },
        },
      },
      recipe: { grain: 'Schwach', note: 'Porträts im Grünen, Alltag, wenn es natürlich bleiben soll.' },
    },
    {
      id: 'crispclassic', name: 'Klassisch klar', file: 'KLAR', group: EDIT,
      desc: 'Klar und sauber mit kräftigem Kontrast und neutralen Weißtönen.',
      params: {
        contrast: 80, highlights: 4, shadows: -47, fade: 19, temp: 1, saturation: 3, vibrance: 1, splitBalance: 2,
        splitShadowHue: 86, splitShadowAmt: 3, splitMidHue: 59, splitMidAmt: 8, splitHighHue: 70, splitHighAmt: 11,
        hsl: {
          red: { h: -3, l: -1 }, orange: { h: -6, s: 2, l: -11 }, yellow: { h: -10, s: -8, l: -16 }, green: { h: -7, s: -11 }, aqua: { s: -8 }, blue: { s: -20 }, purple: { s: -2 }, magenta: { s: -4 },
        },
      },
      recipe: { grain: 'Schwach', note: 'Architektur, Autos, Szenen mit viel Weiß und Schwarz.' },
    },
    {
      id: 'forestmood', name: 'Waldgrün', file: 'WALD', group: EDIT,
      desc: 'Dunkel und stimmungsvoll: sattes, tiefes Grün, gedämpfte Lichter, warme Haut.',
      params: {
        contrast: 2, highlights: -42, shadows: 45, fade: 10, whiteMatte: 42, temp: 9, tint: -8, saturation: -12, vibrance: -6, splitBalance: 7,
        splitShadowHue: 263, splitShadowAmt: 22, splitMidHue: 48, splitMidAmt: 15, splitHighHue: 67, splitHighAmt: 23,
        hsl: {
          red: { h: -4, s: -5, l: -4 }, orange: { s: -8, l: -2 }, yellow: { h: -7, s: -37, l: -4 }, green: { h: -24, s: -44, l: -22 }, aqua: { h: 4, s: -21, l: -2 }, blue: { h: 4, s: -49, l: 10 }, purple: { h: 4, s: -16, l: -11 }, magenta: { h: 10, s: -9, l: -16 },
        },
      },
      recipe: { grain: 'Mittel', note: 'Wald, Park, Porträts im Schatten von Bäumen.' },
    },
    {
      id: 'eveningsun', name: 'Abendsonne', file: 'ABENDS', group: EDIT,
      desc: 'Goldener Dunst: warme Beigetöne, weiche Lichter, sanfte Kontraste.',
      params: {
        contrast: 80, highlights: -51, shadows: 54, fade: 12, whiteMatte: 10, temp: 31, tint: -28, vibrance: 3, splitBalance: 4,
        splitShadowHue: 265, splitShadowAmt: 27, splitMidHue: 89, splitMidAmt: 16, splitHighHue: 67, splitHighAmt: 24,
        hsl: {
          red: { h: -2, s: -5, l: 4 }, orange: { h: -2, s: 1, l: 2 }, yellow: { h: -8, s: -34, l: -2 }, green: { h: -19, s: -57 }, aqua: { h: 5, s: -20 }, blue: { h: 3, s: -39, l: 12 }, purple: { h: 4, s: -16 }, magenta: { h: 10, s: -9 },
        },
      },
      recipe: { grain: 'Mittel', note: 'Gegenlicht bei tiefer Sonne, Sommerabende.' },
    },
    {
      id: 'marble', name: 'Marmor', file: 'MARMOR', group: EDIT,
      desc: 'Hell und luftig mit warmen Weißtönen und klaren Farben.',
      params: {
        contrast: 38, highlights: -36, shadows: 33, fade: 26, whiteMatte: 9, temp: -8, tint: -12, saturation: 5, vibrance: 7, splitBalance: 1,
        splitShadowHue: 228, splitShadowAmt: 12, splitHighHue: 218, splitHighAmt: 3,
        hsl: {
          red: { h: 4, s: -11, l: 5 }, orange: { h: 5, s: -25, l: 23 }, yellow: { h: -5, s: -42, l: 9 }, green: { h: -3, s: -24, l: -17 }, aqua: { h: 11, s: -16, l: 6 }, blue: { h: 2, s: -21, l: 16 }, purple: { h: 7, s: -41 }, magenta: { h: 16, s: -40 },
        },
      },
      recipe: { grain: 'Schwach', note: 'Helle Innenräume, Säle, Standesamt, Architektur in Weiß.' },
    },
    {
      id: 'dramatic', name: 'Dramatisch', file: 'DRAMA', group: EDIT,
      desc: 'Kräftiger Kontrast, satte Farben und tiefe Schatten für starke Bilder.',
      params: {
        contrast: 64, highlights: -36, shadows: 28, fade: 28, temp: 10, tint: -16, saturation: -15, vibrance: -7, splitBalance: 35,
        splitShadowHue: 247, splitShadowAmt: 10, splitMidHue: 22, splitMidAmt: 9, splitHighHue: 33, splitHighAmt: 1,
        hsl: {
          red: { h: -4, s: -6, l: -4 }, orange: { h: 1, s: -7, l: -5 }, yellow: { h: -14, s: -42, l: -53 }, green: { h: -23, s: -38, l: -10 }, aqua: { h: 5, s: -20, l: 2 }, blue: { h: 4, s: -39, l: 10 }, purple: { h: 4, s: -16, l: -2 }, magenta: { h: 10, s: -9, l: -1 },
        },
      },
      recipe: { grain: 'Mittel', note: 'Bewegung, Outdoor-Porträts, bewölkter Himmel.' },
    },
    {
      id: 'beigeanalog', name: 'Beige analog', file: 'BEIGE', group: EDIT,
      desc: 'Matter Filmlook: Beige statt Weiß, angehobene Schatten, gedämpfte Farben.',
      params: {
        highlights: -25, shadows: 34, fade: 24, whiteMatte: 11, temp: 19, tint: 2, saturation: 12, vibrance: 13, splitBalance: 52,
        splitShadowHue: 46, splitShadowAmt: 15, splitMidHue: 70, splitMidAmt: 15, splitHighHue: 72, splitHighAmt: 13,
        hsl: {
          red: { h: -2, s: -10, l: -5 }, orange: { h: -1, s: -17, l: 28 }, yellow: { h: -12, s: -40, l: 13 }, green: { h: -28, s: -23, l: 18 }, aqua: { h: 13, s: -43, l: 16 }, blue: { h: -2, s: -34, l: -2 }, purple: { h: -8, s: -12 }, magenta: { h: -16, s: -17 },
        },
      },
      recipe: { grain: 'Mittel', note: 'Hochzeiten, Porträts, Reisen mit Vintage-Gefühl.' },
    },
    {
      id: 'honey', name: 'Honig', file: 'HONIG', group: EDIT,
      desc: 'Warmes Gold und erdige Töne mit weichem Kontrast.',
      params: {
        contrast: 20, highlights: -34, shadows: 30, fade: 3, whiteMatte: 8, temp: 6, tint: -5, saturation: -12, vibrance: 2, splitBalance: -7,
        splitShadowHue: 88, splitShadowAmt: 20, splitMidHue: 48, splitMidAmt: 14, splitHighHue: 69, splitHighAmt: 16,
        hsl: {
          red: { h: -7, s: 5, l: -18 }, orange: { h: -3, s: -14, l: 2 }, yellow: { h: -13, s: -50, l: -13 }, green: { h: -16, s: -37, l: 2 }, aqua: { h: -4, s: -34, l: -6 }, blue: { h: 3, s: -31, l: 6 }, purple: { h: 11, s: -42, l: -10 }, magenta: { h: 8, s: -36, l: -14 },
        },
      },
      recipe: { grain: 'Schwach', note: 'Stadt, Straße, Herbst, warmes Tageslicht.' },
    },
    {
      id: 'terracotta', name: 'Terrakotta', file: 'TERRA', group: EDIT,
      desc: 'Warme Rottöne wie gebrannter Ton, satte Schatten, kräftige Haut.',
      params: {
        contrast: 6, highlights: -8, shadows: 47, fade: 32, whiteMatte: 4, temp: 6, tint: -6, saturation: 11, vibrance: 7, splitBalance: -3,
        splitShadowHue: 245, splitShadowAmt: 6, splitMidHue: 74, splitMidAmt: 12, splitHighHue: 72, splitHighAmt: 13,
        hsl: {
          red: { s: -5, l: -13 }, orange: { h: -2, l: 9 }, yellow: { h: 1, s: -24 }, green: { h: -9, s: -17, l: 14 }, aqua: { h: -3, s: -36 }, blue: { s: -50, l: -8 }, purple: { h: -13, s: -46, l: 14 }, magenta: { h: -15, s: -48, l: 4 },
        },
      },
      recipe: { grain: 'Mittel', note: 'Ziegel, Holz, Innenräume, Porträts mit warmem Licht.' },
    },
    {
      id: 'sandstone', name: 'Sandstein', file: 'SAND', group: EDIT,
      desc: 'Entsättigtes Beige, pastellige Farben und flache Kontraste.',
      params: {
        contrast: 41, highlights: -13, shadows: 27, fade: 22, whiteMatte: 16, temp: 13, tint: -5, saturation: 7, vibrance: -6, splitBalance: -2,
        splitShadowHue: 48, splitShadowAmt: 12, splitMidHue: 55, splitMidAmt: 19, splitHighHue: 60, splitHighAmt: 14,
        hsl: {
          red: { h: 2, s: -9, l: 42 }, orange: { h: -1, s: -22, l: 42 }, yellow: { h: -16, s: -50, l: 20 }, green: { h: -28, s: -40, l: -2 }, aqua: { h: 2, s: 8, l: -11 }, blue: { h: -1, s: -44, l: -9 }, purple: { h: -18, s: -53, l: -19 }, magenta: { h: -4, s: -40, l: -11 },
        },
      },
      recipe: { grain: 'Mittel', note: 'Landschaft in hellem Licht, Wüste, Strand, Reisen.' },
    },
    {
      id: 'morningglow', name: 'Morgenlicht', file: 'MORGEN', group: EDIT,
      desc: 'Hell und warm leuchtend: goldene Lichter, offene Schatten, weiche Haut.',
      params: {
        contrast: 46, highlights: -18, shadows: -12, fade: 21, whiteMatte: 8, temp: 5, tint: -1, vibrance: 45, splitBalance: 4,
        splitShadowHue: 339, splitShadowAmt: 8, splitMidHue: 62, splitMidAmt: 17, splitHighHue: 37, splitHighAmt: 14,
        hsl: {
          red: { h: -1, s: -37, l: -12 }, orange: { h: -6, s: -30, l: -46 }, yellow: { h: -13, s: -52, l: -13 }, green: { s: -52, l: -30 }, aqua: { h: 4, s: -58 }, blue: { s: -46, l: 25 }, purple: { h: 1, s: -43, l: -4 }, magenta: { s: -43, l: -6 },
        },
      },
      recipe: { grain: 'Mittel', note: 'Fensterlicht, Balkon, Morgenstimmung.' },
    },
    {
      id: 'neonrain', name: 'Neonregen', file: 'NEONRG', group: NIGHT,
      desc: 'Nasse Großstadtnacht: tiefblaue Schatten, türkise Lichter, rote und pinke Neonschilder.',
      params: {
        exposure: 0.35, temp: -45, tint: 16, contrast: 20, highlights: -40, saturation: 26, vibrance: 30, skinProtect: 15,
        splitShadowHue: 264, splitShadowAmt: 64, splitMidHue: 290, splitMidAmt: 24, splitHighHue: 352, splitHighAmt: 42, splitBalance: -8,
        hsl: {
          red: { h: -30, s: 40 }, orange: { h: -30, s: 30, l: -5 }, yellow: { h: -30, s: -25 }, green: { h: 30, s: 15 }, aqua: { h: 25, s: 30 }, blue: { h: 5, s: 20 }, purple: { h: 10, s: 25 }, magenta: { h: -10, s: 40 },
        },
      },
      recipe: { exposure: '0 bis -1/3 EV', grain: 'Schwach', note: 'Nachts in der Stadt mit Leuchtreklamen, am besten bei Regen oder nassem Asphalt. Lichter eher schützen (−1/3 EV).' },
    },
    {
      id: 'violethaze', name: 'Violetter Nebel', file: 'VIOLET', group: NIGHT,
      desc: 'Diesige Neonnacht in Lila und Violett, türkise Akzente, weiche Lichter.',
      params: {
        exposure: 0.6, temp: -25, tint: 55, contrast: 5, highlights: -50, shadows: 5, fade: 12, whiteMatte: 10, saturation: 35, vibrance: 25, skinProtect: 15,
        splitShadowHue: 302, splitShadowAmt: 80, splitMidHue: 318, splitMidAmt: 60, splitHighHue: 330, splitHighAmt: 45,
        hsl: {
          red: { h: 20, s: 10 }, orange: { h: -30, s: 10 }, yellow: { h: -30, s: -30 }, green: { h: 30, s: 20 }, aqua: { h: 10, s: 30 }, blue: { h: 30, s: 30 }, purple: { h: 15, s: 35 }, magenta: { s: 30 },
        },
      },
      recipe: { exposure: '0 bis -1/3 EV', grain: 'Schwach', note: 'Nebel, Regen, Gassen mit Neonlicht. Wirkt am stärksten mit Dunst oder Gegenlicht.' },
    },
    {
      id: 'redcyan', name: 'Rot & Cyan', file: 'ROTCYN', group: NIGHT,
      desc: 'Kontrastreiche Neonnacht: fast schwarze, marineblaue Schatten, sattes Rot und leuchtendes Cyan.',
      params: {
        exposure: 0.25, temp: -30, tint: 8, contrast: 30, highlights: -30, shadows: -30, saturation: 15, vibrance: 18, skinProtect: 25,
        splitShadowHue: 250, splitShadowAmt: 60, splitMidHue: 238, splitMidAmt: 12, splitHighHue: 30, splitHighAmt: 10, splitBalance: -20,
        hsl: {
          red: { h: 3, s: 35 }, orange: { h: -20, s: 35 }, yellow: { h: -25, s: -5 }, green: { h: 30, s: 10 }, aqua: { h: 20, s: 30 }, blue: { h: -20, s: 30 }, purple: { h: -15, s: 10 }, magenta: { h: 30, s: 30 },
        },
      },
      recipe: { exposure: '0 bis -1/3 EV', grain: 'Schwach', note: 'Belebte Straßen mit Leuchtreklamen. Lichter schützen, Schwarz darf satt sein.' },
    },
    {
      id: 'tealrain', name: 'Petrol-Regen', file: 'PETROL', group: NIGHT,
      desc: 'Regennacht in gedämpftem Petrol und Türkis, matte Schatten, warme Akzente in Lichtern und Schildern.',
      params: {
        exposure: 0.35, temp: -40, tint: -6, contrast: -5, highlights: -35, shadows: 10, fade: 10, whiteMatte: 6, saturation: -15, vibrance: 10, skinProtect: 30,
        splitShadowHue: 214, splitShadowAmt: 55, splitMidHue: 208, splitMidAmt: 35, splitHighHue: 200, splitHighAmt: 20,
        hsl: {
          red: { s: 15 }, orange: { h: -5, s: 10 }, yellow: { h: 5, s: 5 }, green: { h: 30, s: -30 }, aqua: { h: 10, s: -5 }, blue: { h: -30, s: -30 }, purple: { s: -40 }, magenta: { h: 20, s: -10 },
        },
      },
      recipe: { exposure: '0 bis +1/3 EV', grain: 'Mittel', note: 'Regen, nasse Straßen, Großstadt bei Nacht. Wirkt filmisch ruhig statt knallig.' },
    },
  ];

  // Englische Texte je Look (Sprachumschaltung).
  const EN = {
    neutral: {"name": "Neutral", "desc": "Clean conversion from V-Log to Rec.709. A good starting point for your own looks.", "note": "Reference look to judge the exposure of the V-Log base."},
    balanced: {"name": "Balanced", "desc": "Standard: balanced, natural colours with a little bite.", "note": "All-rounder for any situation."},
    vibrant: {"name": "Vibrant", "desc": "Lively: strong colours, deep shadows, rich blue and green.", "note": "Landscape and nature. Usually too strong for portraits."},
    softcolor: {"name": "Soft", "desc": "Gentle: soft contrast, flattering skin tones, still lively colours.", "note": "Outdoor portraits and fashion."},
    documentary: {"name": "Documentary", "desc": "Muted colours, rich shadows, cyan-leaning blue, olive greens.", "note": "Street and reportage. Shadows look especially good in hard light."},
    portraitpunch: {"name": "Portrait Contrast", "desc": "Portrait film with a bit more contrast, restrained colours, beautiful skin.", "note": "Portraits in flat light."},
    portraitsoft: {"name": "Portrait Soft", "desc": "Very soft and neutral, like studio negative film.", "note": "Portraits in contrasty light, also indoors."},
    snapshot: {"name": "Snapshot", "desc": "Hard curve, teal shadows, warm highlights, red slightly towards magenta.", "note": "Everyday and family photos with a snapshot feel. Don’t underexpose."},
    nostalgia: {"name": "Nostalgia", "desc": "Amber highlights, rich shadows, the mood of old colour prints.", "note": "City, travel, sunsets."},
    flatcinema: {"name": "Flat Cinema", "desc": "Cinema film: flat, low saturation, soft highlights. Also great for video.", "note": "Calm, filmic images. Ideal as a video LUT because the look leaves plenty of room."},
    bleach: {"name": "Bleach Bypass", "desc": "Hard contrast, strongly desaturated, metallic cinema look.", "note": "Architecture, street, dramatic scenes."},
    portrait160: {"name": "Portrait Film 160", "desc": "Fine and restrained, natural skin tones, soft pastels.", "note": "Portraits and weddings in good light."},
    portrait400: {"name": "Portrait Film 400", "desc": "Warm, pastel, glowing skin tones, muted greens, soft highlights.", "note": "Like negative film: rather expose generously. Strong for portraits and backlight."},
    portrait800: {"name": "Portrait Film 800", "desc": "Warmer and richer than Portrait Film 400, slightly cool shadows.", "note": "Evening light, interiors, concerts."},
    summer200: {"name": "Summer Film 200", "desc": "Sunny consumer film: warm, strong yellows, nostalgic.", "note": "Holidays, summer, golden hour."},
    sunlit: {"name": "Sunlit Film", "desc": "Sunny negative film: rich green, glowing yellow, pale hazy sky, soft highlights, warm stone.", "note": "Sun and backlight in nature, trees, coast. Calmer under an overcast sky."},
    everyday400: {"name": "Everyday Film 400", "desc": "Punchy everyday film: warm, rich reds and yellows, a hint of grain feel.", "note": "Snapshots, parties, everyday life."},
    retro200: {"name": "Retro Film 200", "desc": "Budget retro film: warm, slightly matte, muted green and blue.", "note": "Summer and travel photos with a 90s feel."},
    classicslide: {"name": "Classic Slide", "desc": "Legendary-style slide film: deep reds and blues, rich shadows, vintage contrast.", "note": "Like slide film: protect the highlights, rather expose a bit less."},
    modernslide: {"name": "Modern Slide", "desc": "Modern slide film: clean, slightly cool, glowing blue and turquoise.", "note": "Water, sky, architecture."},
    cinenegative: {"name": "Cinema Negative", "desc": "Cinema negative film: lots of detail, soft highlights, subtle teal-orange split.", "note": "Especially good as a video LUT."},
    mint400: {"name": "Mint 400", "desc": "Airy and bright, minty greens, delicate blue, cool pastels.", "note": "Weddings, portraits in greenery. Feel free to expose bright."},
    coolneg400: {"name": "Cool Negative 400", "desc": "Consumer film with a slight green tint: cool shadows, strong greens.", "note": "Everyday, city, nature."},
    simple200: {"name": "Simple Film 200", "desc": "Simple consumer film: slightly matte, cool greenish shadows, muted blue.", "note": "Casual everyday and holiday photos."},
    redaccent: {"name": "Red Accent", "desc": "Glowing reds, warm, strong contrast.", "note": "Street with red accents, summer."},
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
    bwnight: {"name": "B&W Night", "desc": "Gritty, contrasty night black and white.", "note": "Night, concerts, mood over detail."},
    sepia: {"name": "Sepia", "desc": "Warm-toned black and white like an old print.", "note": "Portraits, family photos, nostalgia."},
    bwhigh: {"name": "B&W High Contrast", "desc": "Dramatic black and white with deep blacks and brilliant highlights (red filter).", "note": "Architecture, sunny street, cloudy skies."},
    bwmatte: {"name": "B&W Matte", "desc": "Soft, matte black and white with lifted blacks.", "note": "Portraits, calm subjects, interiors."},
    selenium: {"name": "Selenium Tone", "desc": "Black and white with cool violet shadows like a selenium-toned fibre print.", "note": "Landscape, architecture, fine art."},
    eveningsalon: {"name": "Evening Salon", "desc": "Dark and warm like an evening in a salon: deep shadows, warm midtones, strong contrast.", "note": "Interiors with warm light, evening mood. Rather expose a little less."},
    silkwhite: {"name": "Silk White", "desc": "Bright and soft: creamy whites, gentle contrast, restrained colours.", "note": "Wedding dresses, light fabrics, window light. Feel free to expose a little brighter."},
    fadedrose: {"name": "Faded Rosé", "desc": "Matte and muted: delicate pinks, calm greens, soft shadows.", "note": "Flowers, gardens, facades with plants."},
    amber: {"name": "Amber", "desc": "Warm gold and rich colours, strong contrast – like candlelight in an old hall.", "note": "Interiors with wood, gold and warm light."},
    linen: {"name": "Linen", "desc": "Natural and calm: gently warm, soft contrast, unobtrusive colours.", "note": "Portraits in greenery, everyday life, when it should stay natural."},
    crispclassic: {"name": "Crisp Classic", "desc": "Clear and clean with strong contrast and neutral whites.", "note": "Architecture, cars, scenes with lots of white and black."},
    forestmood: {"name": "Forest Mood", "desc": "Dark and moody: rich, deep greens, subdued highlights, warm skin.", "note": "Forest, park, portraits in the shade of trees."},
    eveningsun: {"name": "Evening Sun", "desc": "Golden haze: warm beige tones, soft highlights, gentle contrast.", "note": "Backlight with a low sun, summer evenings."},
    marble: {"name": "Marble", "desc": "Bright and airy with warm whites and clear colours.", "note": "Bright interiors, halls, registry offices, white architecture."},
    dramatic: {"name": "Dramatic", "desc": "Strong contrast, rich colours and deep shadows for bold images.", "note": "Movement, outdoor portraits, cloudy skies."},
    beigeanalog: {"name": "Beige Analog", "desc": "Matte film look: beige instead of white, lifted shadows, muted colours.", "note": "Weddings, portraits, travel with a vintage feel."},
    honey: {"name": "Honey", "desc": "Warm gold and earthy tones with soft contrast.", "note": "City, street, autumn, warm daylight."},
    terracotta: {"name": "Terracotta", "desc": "Warm reds like fired clay, rich shadows, strong skin tones.", "note": "Brick, wood, interiors, portraits in warm light."},
    sandstone: {"name": "Sandstone", "desc": "Desaturated beige, pastel colours and flat contrast.", "note": "Landscape in bright light, desert, beach, travel."},
    morningglow: {"name": "Morning Glow", "desc": "Bright and warmly glowing: golden highlights, open shadows, soft skin.", "note": "Window light, balcony, morning mood."},
    neonrain: {"name": "Neon Rain", "desc": "Wet city night: deep blue shadows, turquoise lights, red and pink neon signs.", "note": "At night in the city with neon signs, ideally in rain or on wet tarmac. Rather protect the highlights (−1/3 EV)."},
    violethaze: {"name": "Violet Haze", "desc": "Hazy neon night in lilac and violet, turquoise accents, soft highlights.", "note": "Fog, rain, alleys with neon light. Strongest with haze or backlight."},
    redcyan: {"name": "Red & Cyan", "desc": "High-contrast neon night: near-black navy shadows, rich red and glowing cyan.", "note": "Busy streets with neon signs. Protect the highlights, blacks may be deep."},
    tealrain: {"name": "Teal Rain", "desc": "Rainy night in muted teal and turquoise, matte shadows, warm accents in lights and signs.", "note": "Rain, wet streets, big city at night. Looks calm and filmic rather than loud."},
  };
  const GROUP_EN = {"Basis": "Basics", "Kamera-Klassiker": "Camera Classics", "Farbnegativ": "Color Negative", "Dia & Kräftig": "Slide & Punchy", "Kino": "Cinema", "Beliebte Stile": "Popular Styles", "Editorial": "Editorial", "Nacht": "Night", "Schwarzweiß": "Black & White"};

  for (const p of PRESETS) {
    p.recipe = Object.assign({}, RECIPE_DEFAULT, p.recipe);
    p.en = Object.assign({ group: GROUP_EN[p.group] }, EN[p.id]);
  }
  // Nach Gruppen sortieren (stabil), damit jede Gruppe zusammenhängend angezeigt wird.
  PRESETS.sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));

  root.LutPresets = PRESETS;
})(typeof globalThis !== 'undefined' ? globalThis : this);
