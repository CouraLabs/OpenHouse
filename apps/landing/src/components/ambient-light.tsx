/**
 * One warm light drifting behind the page on a 28s loop — barely there, and
 * still for visitors who prefer reduced motion. Fixed, so it never scrolls.
 */
export function AmbientLight() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="ambient-blob absolute top-[-10%] left-[20%] size-[60vmax] rounded-full bg-[radial-gradient(circle,var(--ambient),transparent_60%)] will-change-transform" />
    </div>
  )
}
