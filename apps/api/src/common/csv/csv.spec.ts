import {
  CSV_BOM,
  CSV_FORMATS,
  csvChunks,
  day,
  encodeRow,
  guardInjection,
  money,
  pagesOf,
  type CsvColumn,
} from './csv.js'

async function collect(chunks: AsyncIterable<string>): Promise<string> {
  let text = ''
  for await (const chunk of chunks) {
    text += chunk
  }

  return text
}

describe('guardInjection', () => {
  it.each(['=SUM(A1)', '+1', '-1', '@cmd', '\tx', '\rx'])(
    'prefixes %j with a quote',
    (text) => {
      expect(guardInjection(text)).toBe(`'${text}`)
    }
  )

  it('leaves safe text and the empty string alone', () => {
    expect(guardInjection('Groceries')).toBe('Groceries')
    expect(guardInjection('')).toBe('')
    expect(guardInjection('a=b')).toBe('a=b')
  })
})

describe('encodeRow', () => {
  const cells = [
    'Rent, March',
    money('-1234.50'),
    day('2026-03-05'),
    '=HYPERLINK("x")',
    null,
  ]

  it('writes en-US with commas, a dot decimal, and ISO dates', () => {
    expect(encodeRow(cells, CSV_FORMATS['en-US'])).toBe(
      '"Rent, March",-1234.50,2026-03-05,"\'=HYPERLINK(""x"")",\r\n'
    )
  })

  it('writes pt-BR with semicolons, a comma decimal, and DD/MM/YYYY', () => {
    expect(encodeRow(cells, CSV_FORMATS['pt-BR'])).toBe(
      'Rent, March;-1234,50;05/03/2026;"\'=HYPERLINK(""x"")";\r\n'
    )
  })

  it('does not prefix a negative amount: it is a number, not text', () => {
    expect(encodeRow([money('-5.00')], CSV_FORMATS['en-US'])).toBe('-5.00\r\n')
  })

  it('treats a money cell that is not an amount as guarded text', () => {
    expect(encodeRow([money('=1+1')], CSV_FORMATS['en-US'])).toBe("'=1+1\r\n")
  })
})

describe('csvChunks', () => {
  const columns: CsvColumn<{ name: string }>[] = [
    { header: 'Name', cell: (row) => row.name },
  ]

  it('starts with the UTF-8 BOM and the header, then the rows', async () => {
    const text = await collect(
      csvChunks(
        columns,
        pagesOf(async () => [{ name: 'Café' }], 5),
        'pt-BR'
      )
    )

    expect(text).toBe(`${CSV_BOM}Name\r\nCafé\r\n`)
  })

  it('reads page by page until a short page', async () => {
    const reads: number[] = []
    const rows = [{ name: 'a' }, { name: 'b' }, { name: 'c' }]
    const read = async (skip: number, size: number) => {
      reads.push(skip)

      return rows.slice(skip, skip + size)
    }

    const text = await collect(csvChunks(columns, pagesOf(read, 2), 'en-US'))

    expect(reads).toEqual([0, 2])
    expect(text).toBe(`${CSV_BOM}Name\r\na\r\nb\r\nc\r\n`)
  })
})
