/** A plan's price in the serif with the note under it. */
export function PlanPrice({ price, note }: { price: string; note: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-ink font-serif text-5xl leading-[1.1] tracking-[-0.03em]">
        {price}
      </span>
      <span className="text-xs text-muted">{note}</span>
    </div>
  )
}
