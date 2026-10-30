import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  XAxis,
  YAxis,
} from 'recharts'

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@workspace/ui/components/chart'
import { cn } from 'cn'

export interface LineSeries {
  key: string
  label: string
  color: string
  values: Array<number | undefined>
}

interface ProjectionLineChartProps {
  series: LineSeries[]
  xLabels: string[]
  formatValue: (value: number) => string
  formatTick: (value: number) => string
  ariaLabel: string
  className?: string
}

export function ProjectionLineChart({
  series,
  xLabels,
  formatValue,
  formatTick,
  ariaLabel,
  className,
}: ProjectionLineChartProps) {
  const config: ChartConfig = Object.fromEntries(
    series.map((line) => [line.key, { label: line.label, color: line.color }])
  )
  const colorByKey = new Map(series.map((line) => [line.key, line.color]))
  const data = xLabels.map((label, index) => ({
    label,
    ...Object.fromEntries(series.map((line) => [line.key, line.values[index]])),
  }))

  return (
    <ChartContainer
      config={config}
      className={cn('aspect-auto h-64 w-full', className)}
      role="img"
      aria-label={ariaLabel}
    >
      <RechartsLineChart data={data} margin={{ top: 8, right: 16, left: 8 }}>
        <CartesianGrid vertical={false} stroke="#ccc" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={72}
          tickFormatter={formatTick}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => (
                <TooltipRow
                  value={Number(value)}
                  name={String(name)}
                  color={colorByKey.get(String(name)) ?? '#898781'}
                  formatValue={formatValue}
                />
              )}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        {series.map((line) => (
          <Line
            key={line.key}
            dataKey={line.key}
            name={line.label}
            stroke={line.color}
            strokeWidth={2}
            dot={false}
            type="monotone"
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </RechartsLineChart>
    </ChartContainer>
  )
}

function TooltipRow({
  value,
  name,
  color,
  formatValue,
}: {
  value: number
  name: string
  color: string
  formatValue: (value: number) => string
}) {
  return (
    <div className="flex w-full items-center justify-between gap-4">
      <span className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-[2px]"
          style={{ backgroundColor: color }}
        />
        <span className="text-muted-foreground">{name}</span>
      </span>
      <span className="font-medium tabular-nums">{formatValue(value)}</span>
    </div>
  )
}
