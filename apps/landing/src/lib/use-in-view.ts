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

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return [ref, inView]
}
