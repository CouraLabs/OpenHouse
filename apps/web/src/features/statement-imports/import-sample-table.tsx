import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'

/** The first rows of the file as the server read them, so the user can tell
 * which column is which while mapping. */
export function ImportSampleTable({
  headers,
  sample,
}: {
  headers: string[]
  sample: string[][]
}) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((header, index) => (
              // Headers may repeat; a column is its position.
              // biome-ignore lint/suspicious/noArrayIndexKey: positional columns
              <TableHead key={`${index}-${header}`}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sample.map((record, rowIndex) => (
            // The sample is a read-only slice of the file: a row has no
            // identity beyond its position.
            // biome-ignore lint/suspicious/noArrayIndexKey: positional rows
            <TableRow key={rowIndex}>
              {headers.map((header, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: positional columns
                <TableCell key={`${index}-${header}`}>
                  {record[index]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
