import type { ImportEncoding } from '@workspace/poco'

export type ResolvedEncoding = Exclude<ImportEncoding, 'auto'>

export interface DecodedText {
  text: string
  encoding: ResolvedEncoding
}

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

export function ofxEncodingHint(bytes: Uint8Array): ImportEncoding {
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
