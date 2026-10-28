import { type RefObject, useEffect, useRef, useState } from 'react'

/**
 * Whether the element behind the returned ref has scrolled into view. It
 * latches: once seen, it stays `true` and the observer disconnects, so a
 * revealed section never animates out again.
 */
export function useInView<T extends Element>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (node === null) return

    // No observer (very old browser): everything is simply visible.
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // Reveal on intersecting — or when the element sits above the
          // viewport: a fast scroll can carry it past between two of the
          // observer's callbacks, and a section that was skipped must not
          // stay stranded invisible.
          if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
            setInView(true)
            observer.disconnect()
            return
          }
        }
      },
      // A bare threshold: a tall section may never reach a high ratio of
      // visibility, and the rootMargin still keeps the reveal from firing
      // while the element is barely peeking at the bottom edge.
      { threshold: 0, rootMargin: '0px 0px -8% 0px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return [ref, inView]
}
