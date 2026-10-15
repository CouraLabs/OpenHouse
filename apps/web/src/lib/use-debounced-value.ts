import { useEffect, useState } from 'react'

/**
 * Holds a value back until it has stayed unchanged for `delay` ms. Filter
 * inputs use it so a keystroke storm never becomes a request storm.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [settled, setSettled] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay)

    return () => clearTimeout(timer)
  }, [value, delay])

  return settled
}
