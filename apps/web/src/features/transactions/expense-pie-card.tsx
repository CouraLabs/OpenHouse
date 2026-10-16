import type { TransactionBreakdownGroup } from '@workspace/poco'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@workspace/ui/components/chart'
import { Cell, Pie, PieChart } from 'recharts'

import { formatMoney } from '@/lib/format-money.js'

/**
 * The series colors the slices whose entity carries no color of its own
 * wear, in a fixed order — never cycled, never derived from a value. The
 * validated categorical palette's first eight slots.
 */
const SERIES = [
  '#2a78d6',
  '#eb6834',
  '#1baf7a',
  '#eda100',
  '#e87ba4',
  '#008300',
  '#4a3aa7',
  '#e34948',
] as const

/** The color the tail past the series folds into. */
const OTHER_COLOR = '#898781'

/** How many slices keep their own color before the tail folds into Other. */
const MAX_SLICES = SERIES.length

/**
 * One expense pie: the month's expenses split by the dimension the card
 * names — the categories they belong to or the accounts they moved
 * through — one pie per currency the expenses use. A category paints in
 * the color its tenant picked; an account takes the series colors. The
 * legend under each pie carries every figure, so no slice means color
 * alone.
 */
export function ExpensePieCard({
  title,
  icon,
  groups,
  locale,
  labels,
}: {
  title: string
  /** The icon naming what the card shows, rendered beside the title. */
  icon: React.ReactNode
  groups: TransactionBreakdownGroup[]
  /** The BCP-47 tag the money figures format in. */
  locale: string
  /** The labels the chart cannot derive, translated by the page. */
  labels: { other: string; empty: string }
}) {
  return (
    <Card className="gap-2">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.empty}</p>
        ) : (
          groups.map((group) => (
            <PieGroup
              key={group.currency}
              group={group}
              locale={locale}
              labels={labels}
            />
          ))
        )}
      </CardContent>
    </Card>
  )
}

/** One currency's pie and its legend. */
function PieGroup({
  group,
  locale,
  labels,
}: {
  group: TransactionBreakdownGroup
  locale: string
  labels: { other: string; empty: string }
}) {
  const slices = slicesOf(group, labels.other)

  if (slices.length === 0) {
    return <p className="text-sm text-muted-foreground">{labels.empty}</p>
  }

  const config: ChartConfig = Object.fromEntries(
    slices.map((slice, index) => [
      `slice-${index}`,
      { label: slice.name, color: slice.color },
    ])
  )

  return (
    <div>
      <ChartContainer
        config={config}
        className="mx-auto aspect-square max-h-56 w-full"
      >
        <PieChart>
          <ChartTooltip
            content={<ChartTooltipContent indicator="dot" hideLabel />}
          />
          <Pie data={slices} dataKey="value" nameKey="name" strokeWidth={2}>
            {slices.map((slice) => (
              <Cell key={slice.name} fill={slice.color} stroke="var(--card)" />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="mt-2 flex flex-col gap-1">
        {slices.map((slice) => (
          <li
            key={slice.name}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="truncate text-muted-foreground">
                {slice.name}
              </span>
            </span>
            <span className="font-medium tabular-nums">
              {formatMoney(slice.total, locale, group.currency)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** A slice as the chart and legend read it: the exact money string the
 * legend formats, and the value the geometry plots. */
interface Slice {
  name: string
  total: string
  value: number
  color: string
}

/** The currency's items as slices, largest first: each category paints in
 * its own color, each account in the next series slot, and the tail past
 * eight folds into Other — a ninth hue is never invented. */
function slicesOf(
  group: TransactionBreakdownGroup,
  otherLabel: string
): Slice[] {
  const kept = group.items.slice(0, MAX_SLICES)
  const tail = group.items.slice(MAX_SLICES)
  const slices: Slice[] = kept.map((item, index) => ({
    name: item.name,
    total: item.total,
    value: Number(item.total),
    color: item.color ?? SERIES[index % SERIES.length],
  }))

  if (tail.length > 0) {
    const rest = tail.reduce((sum, item) => sum + centsOf(item.total), 0n)

    slices.push({
      name: otherLabel,
      total: formatCents(rest),
      value: Number(formatCents(rest)),
      color: OTHER_COLOR,
    })
  }

  return slices
}

/** Reads a money string as whole cents, exactly. */
function centsOf(amount: string): bigint {
  const [whole, fraction = ''] = amount.split('.')

  return BigInt(`${whole}${fraction.padEnd(2, '0')}`)
}

/** Renders cents as the decimal money string the wire carries. */
function formatCents(total: bigint): string {
  const digits = total.toString().padStart(3, '0')

  return `${digits.slice(0, -2)}.${digits.slice(-2)}`
}
