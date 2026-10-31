import { cn } from 'cn'

const pastels = [
  'bg-[#f3dce1] dark:bg-[#4a3038]',
  'bg-[#ddebdf] dark:bg-[#2c4236]',
  'bg-[#dce5f2] dark:bg-[#2f3c50]',
  'bg-[#f6e0d4] dark:bg-[#4a362c]',
  'bg-[#eeebd4] dark:bg-[#444129]',
] as const

export function InitialsTile({
  name,
  round = false,
  className,
}: {
  name: string
  round?: boolean
  className?: string
}) {
  let hash = 0

  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0
  }

  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

  return (
    <span
      aria-hidden
      className={cn(
        'text-ink flex size-9 shrink-0 items-center justify-center text-[0.75rem] font-semibold',
        round ? 'rounded-full' : 'rounded-[0.7rem]',
        pastels[Math.abs(hash) % pastels.length],
        className
      )}
    >
      {initials}
    </span>
  )
}
