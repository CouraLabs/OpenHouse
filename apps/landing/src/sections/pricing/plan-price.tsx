export function PlanPrice({ price, note }: { price: string; note: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-ink font-display text-5xl leading-[1.1] font-bold tracking-[-0.02em]">
        {price}
      </span>
      <span className="text-xs text-muted">{note}</span>
    </div>
  )
}
