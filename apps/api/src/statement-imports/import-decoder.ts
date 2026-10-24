import type { ImportEncoding } from '@workspace/poco'

/** The encodings an import reads: the two Brazilian and US bank files use. */
export type ResolvedEncoding = Exclude<ImportEncoding, 'auto'>

/** A file's text and the encoding it was read as. */
export interface DecodedText {
  text: string
  encoding: ResolvedEncoding
}

/**
 * Decodes the bytes of a bank file. A forced encoding is honored as is. Left
 * to `auto`, a UTF-8 BOM and then a UTF-8 validity check decide, and any
 * bytes that are not valid UTF-8 are read as Windows-1252 — what Brazilian
 * banks export, and a superset of ISO-8859-1 for every printable character.
 * A BOM never reaches the text.
 */
export function decodeImportBytes(
  bytes: Uint8Array,
  encoding: ImportEncoding = 'auto'
): DecodedText {
  const hasBom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf
  const body = hasBom ? bytes.subarray(3) : bytes

  if (encoding === 'windows-1252') {
    return { text: new TextDecoder('windows-1252').decode(body), encoding }
  }

  if (encoding === 'utf-8') {
    return { text: new TextDecoder('utf-8').decode(body), encoding }
  }

  if (hasBom) {
    return { text: new TextDecoder('utf-8').decode(body), encoding: 'utf-8' }
  }

  try {
    return {
      text: new TextDecoder('utf-8', { fatal: true }).decode(body),
      encoding: 'utf-8',
    }
  } catch {
    return {
      text: new TextDecoder('windows-1252').decode(body),
      encoding: 'windows-1252',
    }
  }
}

/**
 * Reads the encoding an OFX file declares in its header: `CHARSET:1252`,
 * `CHARSET:ISO-8859-1`, or `CHARSET:UTF-8` in the SGML header, or the
 * `encoding` of the XML prolog of OFX 2. `auto` when the file declares none
 * (`CHARSET:NONE` included) — the bytes decide then.
 */
export function ofxEncodingHint(bytes: Uint8Array): ImportEncoding {
  // The header is ASCII whatever the body is; Latin-1 reads every byte.
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 2048))
  const charset = /^\s*CHARSET\s*:\s*([^\r\n]*)/im.exec(head)?.[1]?.trim()
  const prolog = /<\?xml[^>]*encoding\s*=\s*["']([^"']+)["']/i.exec(head)?.[1]
  const declared = (charset ?? prolog ?? '').toLowerCase().replace(/[\s_]/g, '')

  if (declared === '') {
    return 'auto'
  }

  if (declared.startsWith('utf')) {
    return 'utf-8'
  }

  if (
    declared === '1252' ||
    declared === 'windows-1252' ||
    declared === 'cp1252' ||
    declared.includes('8859-1') ||
    declared === 'latin1' ||
    declared === 'iso88591'
  ) {
    return 'windows-1252'
  }

  return 'auto'
}
