// Sprachumschaltung Deutsch/Englisch.
// Quelltexte sind deutsch; dieses Wörterbuch liefert die englischen Entsprechungen.
//  - Feste Texte im Fenster (auch später per Skript erzeugte) werden automatisch ersetzt:
//    Ein MutationObserver übersetzt jeden Textknoten und die Attribute title/placeholder/
//    aria-label, deren Inhalt exakt einem Schlüssel entspricht. Beim Zurückschalten werden die
//    deutschen Originale wiederhergestellt.
//  - Texte mit eingesetzten Werten laufen über t('… {name} …', { name }).
(function (root) {
  'use strict';

  const EN = {
    // --- Kopfzeile, Werkzeugleisten ---------------------------------------------------
    'LUT Generator S9': 'LUT Generator S9',
    'Importieren': 'Import',
    'V-Log-JPEGs laden': 'Load V-Log JPEGs',
    'Exportieren': 'Export',
    'Rückgängig (⌘Z)': 'Undo (⌘Z)',
    'Wiederholen (⇧⌘Z)': 'Redo (⇧⌘Z)',
    'Sprache / Language': 'Language / Sprache',
    'Bearbeiten': 'Edit',
    'Looks': 'Looks',
    'Abgleich': 'Match',
    'Meine': 'Mine',
    'Export': 'Export',
    'Meine Looks': 'My Looks',
    'Referenzbild-Abgleich': 'Reference match',
    'Bearbeitet': 'Edited',
    'Bearbeitet (\\)': 'Edited (\\)',
    'Geteilt': 'Split',
    'Original': 'Original',
    'Original V-Log (\\)': 'Original V-Log (\\)',
    'Vorher/Nachher geteilt (Y)': 'Before/after split (Y)',
    'Gemerkter Look B (B)': 'Remembered look B (B)',
    'Aktuellen Look als B merken (für den A/B-Vergleich)': 'Remember current look as B (for A/B comparison)',
    '1:1-Ansicht (Z)': '1:1 view (Z)',
    'Weitere Bilder hinzufügen': 'Add more images',
    'V-Log-JPEGs hier ablegen': 'Drop V-Log JPEGs here',
    'Vorher · V-Log': 'Before · V-Log',
    'Nachher': 'After',
    'Testbild': 'Test image',

    // --- Bearbeiten -----------------------------------------------------------------
    'Look': 'Look',
    'Looks durchsuchen': 'Browse looks',
    'Farbe': 'Color',
    'S/W': 'B&W',
    'Basis-Bildstil': 'Base photo style',
    'Bildstil der Kamera, auf den die LUT aufsetzt (Tag im .cube)': 'Camera photo style the LUT builds on (tag in the .cube)',
    'exakt': 'exact',
    'relativ': 'relative',
    'Licht': 'Light',
    'Licht zurücksetzen': 'Reset light',
    'Farbe zurücksetzen': 'Reset color',
    'Color Grading': 'Color Grading',
    'Color Grading zurücksetzen': 'Reset color grading',
    'Nur Vorschau': 'Preview only',
    '· nicht in der LUT': '· not in the LUT',
    'Vorschau-Effekte zurücksetzen': 'Reset preview effects',
    'Vignette und Körnung kann eine LUT nicht enthalten. Hier lässt sich der Gesamteindruck mit den Kamera-Einstellungen aus der Rezeptkarte abschätzen.':
      'A LUT cannot contain vignette or grain. Use these to judge the overall impression together with the camera settings from the recipe card.',
    'Belichtung': 'Exposure',
    'Kontrast': 'Contrast',
    'Lichter': 'Highlights',
    'Tiefen': 'Shadows',
    'Weiß absenken': 'Lower whites',
    'Schwarz anheben': 'Lift blacks',
    'Farbton-Stabilität': 'Hue stability',
    'Minus = mehr Reserve in den Lichtern, Plus = härterer Weißpunkt': 'Minus = more highlight headroom, plus = harder white point',
    'Matte Lichter: das hellste Weiß wird grauer': 'Matte highlights: the brightest white turns greyer',
    'Matte Schatten: das tiefste Schwarz wird grauer': 'Matte shadows: the deepest black turns greyer',
    'Hoch: kräftige Farben behalten ihren Farbton in den Lichtern (Orange bleibt Orange). Niedrig: Farben kippen wie bei Film in Richtung Gelb.':
      'High: strong colours keep their hue in the highlights (orange stays orange). Low: colours shift towards yellow like film.',
    'Tonkurve': 'Tone curve',
    'Luminanz': 'Luminance',
    'Rot': 'Red',
    'Grün': 'Green',
    'Blau': 'Blue',
    'Alle Kurven zurücksetzen': 'Reset all curves',
    'Klick setzt einen Punkt, Ziehen verschiebt ihn, Doppelklick entfernt ihn. Die Kurve wirkt zusätzlich zu den Reglern.':
      'Click adds a point, drag moves it, double-click removes it. The curve works on top of the sliders.',
    'Weißabgleich': 'White balance',
    'Wie aufgenommen': 'As shot',
    'Weißabgleich der Aufnahme beibehalten': 'Keep the white balance of the shot',
    'Tageslicht': 'Daylight',
    'Bewölkt': 'Cloudy',
    'Schatten': 'Shadows',
    'Glühlampe': 'Incandescent',
    'Leuchtstoff': 'Fluorescent',
    'Pipette': 'Eyedropper',
    'Auto': 'Auto',
    'Dann auf eine neutrale Fläche im Bild klicken (Graukarte, weißes Papier, Asphalt)': 'Then click a neutral area in the image (grey card, white paper, asphalt)',
    'Schätzt den Weißabgleich aus dem ganzen Bild': 'Estimates the white balance from the whole image',
    'Farbtemperatur': 'Color temperature',
    'Wie der manuelle Weißabgleich an der Kamera: 5500 K = wie aufgenommen, niedriger = kühler, höher = wärmer':
      'Like the manual white balance on the camera: 5500 K = as shot, lower = cooler, higher = warmer',
    'Feinkorrektur A–B': 'Fine shift A–B',
    'Feinkorrektur G–M': 'Fine shift G–M',
    'Wie die Weißabgleich-Feinkorrektur der Kamera: A = Amber (wärmer), B = Blau (kühler)': 'Like the camera white balance shift: A = amber (warmer), B = blue (cooler)',
    'G = Grün, M = Magenta': 'G = green, M = magenta',
    'Temperatur (fein)': 'Temperature (fine)',
    'Tönung (fein)': 'Tint (fine)',
    'Dynamik': 'Vibrance',
    'Sättigung': 'Saturation',
    'Hauttonschutz': 'Skin tone protection',
    'Schirmt Hauttöne (rötlich bis golden, mittlere Sättigung) vor Sättigungs- und Farbtonänderungen ab':
      'Shields skin tones (reddish to golden, medium saturation) from saturation and hue changes',
    'Haut goldener': 'Golden skin',
    'Schiebt Hauttöne sanft von Rosa/Rot Richtung warmes Orange, wie Porträtfilme. Gerötete Wangen wirken ruhiger.':
      'Gently shifts skin tones from pink/red towards warm orange, like portrait films. Flushed cheeks look calmer.',
    'Farbmischer': 'Color mixer',
    'Farbton': 'Hue',
    'Schwarzweiß-Filter': 'Black & white filter',
    'Kein Filter': 'No filter',
    'Gelbfilter': 'Yellow filter',
    'Orangefilter': 'Orange filter',
    'Rotfilter': 'Red filter',
    'Grünfilter': 'Green filter',
    'Orange': 'Orange',
    'Gelb': 'Yellow',
    'Türkis': 'Aqua',
    'Lila': 'Purple',
    'Magenta': 'Magenta',
    'Mitteltöne': 'Midtones',
    'Balance': 'Balance',
    'Minus = Schattenfarbe reicht weiter, Plus = Lichterfarbe reicht weiter': 'Minus = shadow colour reaches further, plus = highlight colour reaches further',
    'Vignette': 'Vignette',
    'Körnung': 'Grain',
    'Doppelklick setzt zurück': 'Double-click resets',

    // --- Looks ------------------------------------------------------------------------
    'Looks durchsuchen …': 'Search looks …',
    'Mit der Maus über einen Look fahren zeigt ihn in der Vorschau. Klick übernimmt ihn, der Stern merkt ihn als Favorit.':
      'Hover over a look to preview it. Click applies it, the star marks it as a favourite.',
    'Favoriten': 'Favourites',
    'Als Favorit merken': 'Add to favourites',
    'Aus Favoriten entfernen': 'Remove from favourites',

    // --- Abgleich ---------------------------------------------------------------------
    'Ein fertiges Bild, dessen Stimmung dir gefällt, wird mit dem aktiven V-Log-Bild im Filmstreifen verglichen. Die App schlägt dazu Reglerwerte vor, die du danach feinjustierst.':
      'A finished image whose mood you like is compared with the active V-Log image in the filmstrip. The app suggests slider values that you can fine-tune afterwards.',
    'Referenz (fertiger Look)': 'Reference (finished look)',
    'Bilder wählen oder hierher ziehen (mehrere möglich)': 'Choose images or drop them here (several allowed)',
    'Eigenes V-Log-Bild': 'Your V-Log image',
    'Vom aktuellen Look aus starten': 'Start from the current look',
    '· sonst von Neutral': '· otherwise from Neutral',
    'Look vorschlagen': 'Suggest look',
    'Verglichen werden Tonwerte, Farbstich und Sättigung, nicht das Motiv. Ähnliche Motive und ähnliches Licht ergeben die beste Annäherung.':
      'Tonality, colour cast and saturation are compared, not the subject. Similar subjects and light give the best match.',
    'Berechne Vorschlag …': 'Calculating suggestion …',
    'Vorschlag übernommen. Feinjustieren unter „Bearbeiten“; mit ⌘Z lässt sich der Schritt rückgängig machen.':
      'Suggestion applied. Fine-tune under “Edit”; ⌘Z undoes the step.',
    'Look-Vorschlag aus Referenz übernommen': 'Look suggestion from reference applied',
    'Kamera-Vergleich': 'Camera comparison',
    'Prüft, ob die Vorschau zur Kamera passt: dieselbe Szene einmal im Bildstil V-Log (aktives Bild im Filmstreifen) und einmal mit der geladenen LUT fotografiert. Das Kamera-JPEG hier laden, die App rendert die Vorschau mit dem aktuellen Look und misst die Abweichung.':
      'Checks whether the preview matches the camera: shoot the same scene once in the V-Log photo style (active image in the filmstrip) and once with the LUT loaded. Load the camera JPEG here; the app renders the preview with the current look and measures the difference.',
    'Kamera-JPEG mit LUT': 'Camera JPEG with LUT',
    'Kamera-JPEG wählen oder hierher ziehen': 'Choose camera JPEG or drop it here',
    'Vorschau der App': 'App preview',
    'Vergleichen': 'Compare',
    'Abweichung (hell = groß)': 'Difference (bright = large)',
    'Messung': 'Measurement',
    'Mittlere Abweichung ΔE': 'Mean difference ΔE',
    '95 % der Pixel unter ΔE': '95 % of pixels below ΔE',
    'Richtung': 'Direction',
    'Einordnung': 'Assessment',
    'kein systematischer Versatz': 'no systematic offset',
    'Vorschau und Kamera stimmen sehr gut überein.': 'Preview and camera match very well.',
    'Kleine Abweichung, für die Praxis ausreichend.': 'Small difference, good enough in practice.',
    'Deutliche Abweichung: Framing, Belichtung oder V-Log-Kodierung prüfen.': 'Clear difference: check framing, exposure or V-Log encoding.',
    'heller': 'brighter',
    'dunkler': 'darker',
    'wärmer/gelber': 'warmer/yellower',
    'kühler/blauer': 'cooler/bluer',
    'rötlicher': 'redder',
    'grünlicher': 'greener',

    // --- Export -----------------------------------------------------------------------
    'Export für die S9': 'Export for the S9',
    'Dateiname': 'File name',
    '· max. 8 Zeichen, A–Z/0–9': '· max. 8 characters, A–Z/0–9',
    'Titel in der LUT': 'Title inside the LUT',
    'Video-Variante mitexportieren': 'Also export a video variant',
    '· weicher, mehr Reserve in den Lichtern': '· softer, more highlight headroom',
    'Als ZIP-Paket': 'As ZIP package',
    '· LUTs, Rezeptkarte und Vorschaubild in einer Datei': '· LUTs, recipe card and preview image in one file',
    'LUT + Rezeptkarte exportieren': 'Export LUT + recipe card',
    'Die .cube-Datei ins Hauptverzeichnis der SD-Karte kopieren.': 'Copy the .cube file to the root folder of the SD card.',
    'Kamera: MENU › Individual › Bildqualität › LUT-Bibliothek › Laden (oder App LUMIX Lab).':
      'Camera: MENU › Custom › Image Quality › LUT Library › Load (or via the LUMIX Lab app).',
    'Den Bildstil „Real Time LUT“ wählen und mit der [LUT]-Taste den Look aktivieren.': 'Select the photo style “Real Time LUT” and activate the look with the [LUT] button.',
    'In der Mac-App wählst du beim Export direkt den Ordner, z. B. die SD-Karte.': 'In the Mac app you choose the target folder directly, e.g. the SD card.',
    'Rezeptkarte': 'Recipe card',
    '· MIT-Lizenz': '· MIT License',
    'Export abgebrochen': 'Export cancelled',
    'Ordner für die LUT wählen (z. B. SD-Karte, Hauptverzeichnis)': 'Choose a folder for the LUT (e.g. SD card, root folder)',
    // Rezeptkarte
    'Bildstil': 'Photo style',
    'WB-Feinkorrektur (A–B / G–M)': 'WB fine shift (A–B / G–M)',
    'Belichtungskorrektur': 'Exposure compensation',
    'Rauschminderung': 'Noise reduction',
    'Schärfe': 'Sharpness',
    'ISO': 'ISO',
    ' (falls im Bildstil verfügbar)': ' (if available in the photo style)',
    ' Welche Einstellungen im Bildstil Real Time LUT verfügbar sind, hängt von der Firmware ab.': ' Which settings the Real Time LUT photo style offers depends on the firmware.',
    'Normale Mindest-ISO, niedrige ISO (z. B. 100–200) möglich': 'Normal minimum ISO, low ISO (e.g. 100–200) possible',
    'LUT Generator S9 - Rezeptkarte': 'LUT Generator S9 - Recipe card',
    'Kamera-Einstellungen:': 'Camera settings:',
    'LUT laden:': 'Loading the LUT:',
    '  1. .cube-Datei ins Hauptverzeichnis der SD-Karte kopieren.': '  1. Copy the .cube file to the root folder of the SD card.',
    '  2. Kamera: MENU > Individual > Bildqualität > LUT-Bibliothek > Speicherplatz wählen > Laden.': '  2. Camera: MENU > Custom > Image Quality > LUT Library > choose a slot > Load.',
    '  3. Bildstil "Real Time LUT" wählen, dann mit der [LUT]-Taste die LUT auswählen.': '  3. Select the photo style "Real Time LUT", then pick the LUT with the [LUT] button.',
    '  (Alternativ über die App LUMIX Lab.)': '  (Alternatively via the LUMIX Lab app.)',
    'Look-Parameter (zum Nachbauen):': 'Look parameters (to rebuild it):',

    // --- Meine Looks ------------------------------------------------------------------
    'Name des Looks': 'Look name',
    'Speichern': 'Save',
    'Alle als Datei sichern': 'Back up all as file',
    'Datei laden': 'Load file',
    'Noch keine eigenen Looks gespeichert.': 'No looks saved yet.',
    'Laden': 'Load',
    'Entfernen': 'Remove',
    'Speichern im Browser nicht möglich – bitte „Alle als Datei sichern“ nutzen.': 'Saving in the browser is not possible – please use “Back up all as file”.',
    'Datei konnte nicht gelesen werden.': 'The file could not be read.',

    // --- Meldungen ----------------------------------------------------------------------
    'Zurückgesetzt': 'Reset',
    'Kurven zurückgesetzt': 'Curves reset',
    'Vorschau-Effekte zurückgesetzt': 'Preview effects reset',
    'Höchstens 16 Punkte je Kurve': 'At most 16 points per curve',
    'Bitte JPEG-Dateien wählen.': 'Please choose JPEG files.',
    'Bitte Bilddateien (JPEG) wählen.': 'Please choose image files (JPEG).',
    'Bitte das Kamera-JPEG wählen.': 'Please choose the camera JPEG.',
    'Kamera-JPEG konnte nicht gelesen werden.': 'The camera JPEG could not be read.',
    'Referenzbilder konnten nicht gelesen werden.': 'The reference images could not be read.',
    'Erst einen Look als B merken (Lesezeichen unten).': 'Remember a look as B first (bookmark below).',
    '1:1-Ansicht der Vorschau (max. 1800 px Kante). Ziehen verschiebt den Ausschnitt.': '1:1 view of the preview (max. 1800 px edge). Drag to move the view.',
    'Jetzt auf eine neutrale Fläche im Bild klicken (Esc bricht ab).': 'Now click a neutral area in the image (Esc cancels).',
    'Hier lässt sich kein Weißabgleich messen (zu dunkel).': 'No white balance can be measured here (too dark).',
    'Zu wenig neutrale Flächen für Auto-Weißabgleich. Pipette nutzen.': 'Not enough neutral areas for auto white balance. Use the eyedropper.',
    'Auto-Weißabgleich': 'Auto white balance',
    'Speichern fehlgeschlagen: ': 'Saving failed: ',
    'zu tiefes Schwarz': 'blacks too deep',
    'fast volles Weiß': 'almost full white',

    // --- Basis-Bildstile (vorerst ausgeblendet) ---------------------------------------
    'Exakt (Formel bekannt)': 'Exact (known formula)',
    'Relativ (JPEG im Bildstil)': 'Relative (JPEG in that photo style)',
    'Landschaft': 'Landscape',
    'Porträt': 'Portrait',
    'Monochrom': 'Monochrome',

    // --- Texte mit Platzhaltern ---------------------------------------------------------
    '„{name}“ geladen': '“{name}” loaded',
    '{name} geladen': '{name} loaded',
    '{n} Bilder geladen': '{n} images loaded',
    '{n} Bilder': '{n} images',
    '{name} konnte nicht gelesen werden.': '{name} could not be read.',
    'Referenz „{name}“ geladen': 'Reference “{name}” loaded',
    '{n} Referenzbilder geladen': '{n} reference images loaded',
    'Kamera-JPEG „{name}“ geladen': 'Camera JPEG “{name}” loaded',
    '{n} Looks importiert': '{n} looks imported',
    '„{name}“ gespeichert': '“{name}” saved',
    'Look „{name}“ entfernen?': 'Remove look “{name}”?',
    '{what}: {k} K, Tönung {tint}': '{what}: {k} K, tint {tint}',
    '{n} Dateien gespeichert in {dir}': '{n} files saved in {dir}',
    'Exportiert: {list}': 'Exported: {list}',
    'Gemerkter Look B: {name} (B)': 'Remembered look B: {name} (B)',
    '„{name}“ als B gemerkt. Taste B vergleicht.': '“{name}” remembered as B. Press B to compare.',
    'Kamera ist {how} ({delta})': 'Camera is {how} ({delta})',
    'Vorher · {name}': 'Before · {name}',
    'Basis-Bildstil: {name}': 'Base photo style: {name}',
    'Synthetisches Testbild für {name}: Farbtafel, Belichtungsreihe (−8 bis +7 Blenden) und Farbtonverlauf.':
      'Synthetic test image for {name}: colour chart, exposure ramp (−8 to +7 stops) and hue sweep.',
    '„{name}“ sieht nicht nach reinem V-Log aus ({why}). Wahrscheinlich ein fertiges Bild, z. B. Standard oder V-Log mit LUT (V709). Die App würde es doppelt bearbeiten. Bitte im Bildstil V-Log ohne LUT fotografieren.':
      '“{name}” does not look like plain V-Log ({why}). Probably a finished image, e.g. Standard or V-Log with a LUT (V709). The app would process it twice. Please shoot in the V-Log photo style without a LUT.',
    '„{name}“ sieht nach V-Log aus (flaues Bild), gewählt ist aber „{base}“. Für diesen Basis-Bildstil bitte ein JPEG im Bildstil {base} laden – oder oben V-Log wählen.':
      '“{name}” looks like V-Log (flat image), but “{base}” is selected. For this base photo style please load a JPEG shot in {base} – or choose V-Log above.',
    'Relativer Modus: Lade ein JPEG, das im Bildstil {name} fotografiert ist. Die LUT verfeinert dieses fertige Bild; in Grundeinstellung verändert sie nichts. Die mitgelieferten Looks sind für V-Log abgestimmt und wirken hier kräftiger.':
      'Relative mode: load a JPEG shot in the {name} photo style. The LUT refines this finished image; at default settings it changes nothing. The bundled looks are tuned for V-Log and look stronger here.',
    'HLG: Lade ein Bild im Bildstil {name}. „Full Range“ und normaler Pegel unterscheiden sich nur in der Tonwertspanne; nimm die Variante, die an der Kamera eingestellt ist.':
      'HLG: load an image shot in {name}. “Full Range” and normal levels differ only in tonal range; pick the variant set on the camera.',
    'Real Time LUT (Basis {name}, wird über die LUT gesetzt)': 'Real Time LUT (base {name}, set via the LUT)',
    'In {name} gilt eine höhere Mindest-ISO, dafür möglichst niedrig bleiben': '{name} has a higher minimum ISO; stay as low as possible',
    'Look: {title} (Ausgangs-Look: {preset})': 'Look: {title} (starting look: {preset})',
    'Basis-Bildstil: {name} (Tag {tag})': 'Base photo style: {name} (tag {tag})',
    'Dateien: {files}': 'Files: {files}',
    '{name}.cube (Foto), {video}.cube (Video)': '{name}.cube (photo), {video}.cube (video)',
    'Hinweis: {note}': 'Note: {note}',
    'Abgleich {name}': 'Match {name}',
  };

  // Werte in Rezeptkarten (Weißabgleich, Körnung, Belichtung …) Wort für Wort übersetzen.
  const VALUE_WORDS = [
    [/Tageslicht/g, 'Daylight'], [/Glühlampe/g, 'Incandescent'], [/bei Kunstlicht, sonst/g, 'under artificial light, otherwise'],
    [/\boder\b/g, 'or'], [/\bbis\b/g, 'to'], [/^Aus$/, 'Off'], [/^Schwach$/, 'Low'], [/^Mittel$/, 'Medium'], [/^Stark$/, 'Strong'],
  ];

  const STORE = 'lutgen.lang';
  let lang = 'de';
  try {
    const saved = localStorage.getItem(STORE);
    lang = saved === 'de' || saved === 'en' ? saved : (navigator.language || '').toLowerCase().startsWith('de') ? 'de' : 'en';
  } catch (e) {
    lang = (typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().startsWith('de')) ? 'de' : 'en';
  }

  function fill(s, vars) {
    return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m)) : s;
  }
  function t(de, vars) {
    return fill(lang === 'en' && EN[de] != null ? EN[de] : de, vars);
  }
  function tv(value) {
    if (lang !== 'en' || value == null) return value;
    let s = String(value);
    for (const [re, en] of VALUE_WORDS) s = s.replace(re, en);
    return s;
  }
  // Look-Texte: Presets bringen ihre englischen Texte als p.en mit.
  function look(p, field) {
    return lang === 'en' && p.en && p.en[field] ? p.en[field] : field === 'note' ? p.recipe.note : p[field];
  }

  // --- Automatische Übersetzung des Fensters ----------------------------------------------
  const ATTRS = ['title', 'placeholder', 'aria-label'];
  const textOrig = new WeakMap(); // Textknoten -> deutscher Originaltext
  const attrOrig = new WeakMap(); // Element -> { attr: deutscher Originaltext }

  function translateText(node) {
    const cur = node.nodeValue;
    if (!cur || !cur.trim()) return;
    if (lang === 'en') {
      const key = cur.trim().replace(/\s+/g, ' ');
      // Eigene Übersetzung am Element (data-en), falls ein Wort je nach Stelle anders heißt.
      const own = node.parentElement && node.parentElement.childNodes.length === 1 ? node.parentElement.getAttribute('data-en') : null;
      const en = own || EN[key];
      if (en != null && en !== key) {
        textOrig.set(node, cur);
        node.nodeValue = cur.replace(cur.trim(), en);
      }
    } else if (textOrig.has(node)) {
      const orig = textOrig.get(node);
      textOrig.delete(node);
      // Nur zurücksetzen, wenn der Text seit der Übersetzung nicht anderweitig geändert wurde.
      const key = orig.trim().replace(/\s+/g, ' ');
      const own = node.parentElement ? node.parentElement.getAttribute('data-en') : null;
      if (cur.trim() === (own || EN[key])) node.nodeValue = orig;
    }
  }

  function translateAttrs(el) {
    for (const a of ATTRS) {
      if (!el.hasAttribute || !el.hasAttribute(a)) continue;
      const cur = el.getAttribute(a);
      let store = attrOrig.get(el);
      if (lang === 'en') {
        const en = EN[cur];
        if (en != null && en !== cur) {
          if (!store) { store = {}; attrOrig.set(el, store); }
          store[a] = cur;
          el.setAttribute(a, en);
        }
      } else if (store && store[a] != null) {
        if (cur === EN[store[a]]) el.setAttribute(a, store[a]);
        delete store[a];
      }
    }
  }

  function translateTree(rootNode) {
    if (!rootNode) return;
    if (rootNode.nodeType === 3) { translateText(rootNode); return; }
    if (rootNode.nodeType !== 1) return;
    const tag = rootNode.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE') return;
    translateAttrs(rootNode);
    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let n = walker.nextNode();
    while (n) {
      if (n.nodeType === 3) translateText(n);
      else if (n.tagName !== 'SCRIPT' && n.tagName !== 'STYLE') translateAttrs(n);
      n = walker.nextNode();
    }
  }

  let observer = null;
  function observe() {
    if (observer || typeof MutationObserver === 'undefined') return;
    observer = new MutationObserver((list) => {
      if (lang !== 'en') return;
      for (const m of list) {
        if (m.type === 'childList') m.addedNodes.forEach(translateTree);
        else if (m.type === 'characterData') translateText(m.target);
        else if (m.type === 'attributes') translateAttrs(m.target);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  const listeners = [];
  function setLang(l) {
    lang = l === 'en' ? 'en' : 'de';
    try { localStorage.setItem(STORE, lang); } catch (e) { /* egal */ }
    document.documentElement.lang = lang;
    translateTree(document.body);
    document.title = t('LUT Generator S9');
    for (const f of listeners) f(lang);
  }

  function start() {
    document.documentElement.lang = lang;
    observe();
    if (lang === 'en') translateTree(document.body);
  }

  root.I18N = {
    t, tv, look, setLang, start, translateTree,
    get lang() { return lang; },
    onChange(f) { listeners.push(f); },
    EN,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
