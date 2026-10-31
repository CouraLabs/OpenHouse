import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts'

import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '@workspace/ui/components/chart'
import { cn } from 'cn'

export interface ForecastPoint {
  label: string
  value: number
  step: boolean
}

interface ForecastChartProps {
  points: ForecastPoint[]
  seriesLabel: string
  formatValue: (value: number) => string
  formatTick: (value: number) => string
  ariaLabel: string
  className?: string
}

export function ForecastChart({
  points,
  seriesLabel,
  formatValue,
  formatTick,
  ariaLabel,
  className,
}: ForecastChartProps) {
  const config: ChartConfig = {
    value: { label: seriesLabel, color: 'var(--primary)' },
  }
  const dipsBelowZero = points.some((point) => point.value < 0)

  return (
    <ChartContainer
      config={config}
      className={cn('aspect-auto h-60 w-full', className)}
      role="img"
      aria-label={ariaLabel}
    >
      <AreaChart
        data={points}
        margin={{ top: 12, right: 12, left: 4, bottom: 0 }}
      >
        <defs>
          <linearGradient id="forecast-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--data-in)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--data-in)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          stroke="var(--muted-foreground)"
          strokeOpacity={0.22}
          strokeDasharray="1 5"
          strokeLinecap="round"
        />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          minTickGap={40}
          tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={76}
          domain={['auto', 'auto']}
          tickFormatter={formatTick}
          tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
        />
        {dipsBelowZero ? (
          <ReferenceLine
            y={0}
            stroke="var(--negative)"
            strokeDasharray="3 4"
            strokeOpacity={0.7}
          />
        ) : null}
        <ChartTooltip
          cursor={{ stroke: 'var(--muted-foreground)', strokeOpacity: 0.3 }}
          content={({ active, payload }) => {
            const point = payload?.[0]?.payload as ForecastPoint | undefined

            if (active !== true || point === undefined) {
              return null
            }

            return (
              <div className="flex flex-col gap-0.5 rounded-xl bg-popover px-3 py-2 text-xs shadow-lift ring-1 ring-border">
                <span className="text-muted-foreground">{point.label}</span>
                <span className="text-sm font-semibold tabular-nums">
                  {formatValue(point.value)}
                </span>
              </div>
            )
          }}
        />
        <Area
          dataKey="value"
          type="stepAfter"
          stroke="var(--primary)"
          strokeWidth={2}
          strokeDasharray="6 5"
          fill="url(#forecast-fill)"
          isAnimationActive
          animationDuration={400}
          dot={(props) => {
            const { cx, cy, index, payload } = props as {
              cx?: number
              cy?: number
              index: number
              payload: ForecastPoint
            }

            if (cx === undefined || cy === undefined) {
              return <g key={index} />
            }

            if (index === 0) {
              return (
                <circle
                  key={index}
                  cx={cx}
                  cy={cy}
                  r={4.5}
                  fill="var(--primary)"
                  stroke="var(--card)"
                  strokeWidth={2}
                />
              )
            }

            return payload.step ? (
              <circle
                key={index}
                cx={cx}
                cy={cy}
                r={3.5}
                fill="var(--card)"
                stroke="var(--data-orange)"
                strokeWidth={1.75}
              />
            ) : (
              <g key={index} />
            )
          }}
          activeDot={{ r: 4, fill: 'var(--primary)', stroke: 'var(--card)' }}
        />
      </AreaChart>
    </ChartContainer>
  )
}
