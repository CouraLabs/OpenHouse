import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

/** One line of a spending list: a label and its formatted total. */
export interface SpendingLine {
  key: string
  label: string
  total: string
  color?: string
}

/** The props `SpendingCard` takes. */
interface SpendingCardProps {
  title: string
  empty: string
  lines: SpendingLine[]
}

/** A titled list of spending totals — per member or per category. */
export function SpendingCard({ title, empty, lines }: SpendingCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {lines.map((line) => (
              <li
                key={line.key}
                className="flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-2">
                  {line.color !== undefined ? (
                    <span
                      aria-hidden="true"
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: line.color }}
                    />
                  ) : null}
                  {line.label}
                </span>
                <span className="tabular-nums">{line.total}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
