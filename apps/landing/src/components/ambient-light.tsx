/**
 * The gray bloom: one faint radial light drifting behind the page on a 26s
 * loop, blurred 12px, and still for visitors who prefer reduced motion. Fixed,
 * so it never scrolls. The only gradient the sheet allows.
 */
export function AmbientLight() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="ambient-blob absolute top-[-10%] left-[30%] size-[56vmax] rounded-full bg-[radial-gradient(circle,var(--bloom),var(--bloom-edge)_45%,transparent_68%)] blur-[12px] will-change-transform" />
    </div>
  )
}
