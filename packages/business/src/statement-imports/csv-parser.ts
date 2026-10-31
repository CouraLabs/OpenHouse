import type { ImportDelimiter } from '@workspace/dto'

export interface ParsedCsv {
  records: string[][]
  delimiter: Exclude<ImportDelimiter, 'auto'>
}

export function parseCsv(
  text: string,
  delimiter: ImportDelimiter = 'auto'
): ParsedCsv {
  const resolved = delimiter === 'auto' ? detectDelimiter(text) : delimiter
  const records: string[][] = []
  let record: string[] = []
  let field = ''
  let quoted = false
  let touched = false

  const endField = () => {
    record.push(field)
    field = ''
  }
  const endRecord = () => {
    endField()

    if (touched && record.some((cell) => cell.trim() !== '')) {
      records.push(record)
    }

    record = []
    touched = false
  }

  for (let index = 0; index < text.length; index++) {
    const char = text[index]

    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"'
          index++
        } else {
          quoted = false
        }
      } else {
        field += char
      }

      continue
    }

    if (char === '"' && field === '') {
      quoted = true
      touched = true
    } else if (char === resolved) {
      endField()
      touched = true
    } else if (char === '\r' || char === '\n') {
      if (char === '\r' && text[index + 1] === '\n') {
        index++
      }

      endRecord()
    } else {
      field += char
      touched = true
    }
  }

  endRecord()

  return { records, delimiter: resolved }
}

function detectDelimiter(text: string): Exclude<ImportDelimiter, 'auto'> {
  const counts = { ',': 0, ';': 0, '\t': 0 }
  let quoted = false

  for (const char of text) {
    if (char === '"') {
      quoted = !quoted
    } else if (!quoted && (char === '\n' || char === '\r')) {
      if (Object.values(counts).some((count) => count > 0)) {
        break
      }
    } else if (!quoted && char in counts) {
      counts[char as keyof typeof counts]++
    }
  }

  const [best] = (
    Object.entries(counts) as [keyof typeof counts, number][]
  ).sort((a, b) => b[1] - a[1])

  return best[1] === 0 ? ',' : best[0]
}
