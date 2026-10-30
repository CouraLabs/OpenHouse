import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'

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
              <TableHead key={`${index}-${header}`}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sample.map((record, rowIndex) => (
            <TableRow key={rowIndex}>
              {headers.map((header, index) => (
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
