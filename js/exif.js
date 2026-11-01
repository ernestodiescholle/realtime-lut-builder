// Liest den Bildstil aus den Kameradaten (EXIF-Makernote) eines Panasonic-JPEGs.
// Panasonic speichert ihn im Makernote-Tag 0x0089 ("PhotoStyle"), z. B. 17 = V-Log, 3 = Natural.
// Bei Fotos mit Real Time LUT steht dort der Basis-Bildstil der LUT.
(function (root) {
  'use strict';

  const PHOTO_STYLES = {
    0: 'Auto', 1: 'Standard', 2: 'Vivid', 3: 'Natural', 4: 'Monochrom', 5: 'Landschaft', 6: 'Porträt',
    8: 'Cinelike D', 9: 'Cinelike V', 11: 'L.Monochrome', 12: 'Like709', 15: 'L.Monochrome D', 17: 'V-Log',
  };
  const STYLE_TO_BASE = { 17: 'VLOG', 3: 'NAT' };

  // Bytes (ArrayBuffer oder Uint8Array) -> { style: Zahl, name, base: 'VLOG' | 'NAT' | null } oder null.
  function readPhotoStyle(buf) {
    try {
      const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
      const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
      if (dv.getUint16(0) !== 0xffd8) return null;
      let p = 2;
      while (p + 4 <= u8.length) {
        if (u8[p] !== 0xff) return null;
        const marker = u8[p + 1], len = dv.getUint16(p + 2);
        if (marker === 0xda || marker === 0xd9) return null; // Bilddaten erreicht, kein EXIF
        if (marker === 0xe1 && len > 8 && dv.getUint32(p + 4) === 0x45786966) { // "Exif"
          const style = photoStyleFromTiff(dv, p + 10, p + 2 + len);
          if (style == null) return null;
          return { style, name: PHOTO_STYLES[style] || 'Bildstil ' + style, base: STYLE_TO_BASE[style] || null };
        }
        p += 2 + len;
      }
    } catch (e) { /* kaputte oder abgeschnittene Datei */ }
    return null;
  }

  function photoStyleFromTiff(dv, tiff, end) {
    const bo = dv.getUint16(tiff);
    if (bo !== 0x4949 && bo !== 0x4d4d) return null;
    const le = bo === 0x4949;
    const u16 = (o) => dv.getUint16(o, le), u32 = (o) => dv.getUint32(o, le);
    // Eintrag mit Tag in einem IFD suchen -> Offset des 12-Byte-Eintrags
    const find = (ifd, tag) => {
      if (ifd + 2 > end) return -1;
      const n = u16(ifd);
      for (let i = 0; i < n; i++) {
        const e = ifd + 2 + i * 12;
        if (e + 12 > end) return -1;
        if (u16(e) === tag) return e;
      }
      return -1;
    };
    const exifPtr = find(tiff + u32(tiff + 4), 0x8769);
    if (exifPtr < 0) return null;
    const mn = find(tiff + u32(exifPtr + 8), 0x927c);
    if (mn < 0) return null;
    const mo = tiff + u32(mn + 8);
    // Panasonic-Makernote: "Panasonic\0\0\0", danach ein IFD (Offsets relativ zum TIFF-Anfang)
    const sig = [0x50, 0x61, 0x6e, 0x61, 0x73, 0x6f, 0x6e, 0x69, 0x63];
    for (let i = 0; i < sig.length; i++) if (dv.getUint8(mo + i) !== sig[i]) return null;
    const e = find(mo + 12, 0x0089);
    if (e < 0) return null;
    return u16(e + 8);
  }

  root.LutExif = { readPhotoStyle, PHOTO_STYLES };
})(typeof globalThis !== 'undefined' ? globalThis : this);
