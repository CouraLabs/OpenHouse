/**
 * The OpenHouse wordmark in Jost: "Open" set back in the soft wordmark gray
 * at 500, "House" in full ink at 600.
 */
export function Wordmark() {
  return (
    <span className="font-sans text-[1.02rem] tracking-[-0.01em]">
      <span className="font-medium text-(--wordmark-soft)">Open</span>
      <span className="text-ink font-semibold">House</span>
    </span>
  )
}
