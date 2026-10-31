import { cn } from 'cn'

import { HouseGlyph } from './house-glyph.js'

export function LogoTile({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-[0.625rem] bg-[#dcebe2] text-[#2e6a55]',
        className
      )}
    >
      <HouseGlyph weight={8} className="size-[60%]" />
    </span>
  )
}
