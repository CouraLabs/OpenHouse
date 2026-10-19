import { Link } from '@tanstack/react-router'
import { ChevronDown, LogOut, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Avatar, AvatarFallback } from '@workspace/ui/components/avatar'
import { Button } from '@workspace/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import type { SessionUser } from '@workspace/poco'

import { useSignOut } from '@/lib/auth.js'

/**
 * The user menu at the header's right end: the avatar, first name, and a
 * chevron as the trigger; the name and email, Settings, and the logout action in the dropdown.
 */
export function UserMenu({ user }: { user: SessionUser }) {
  const { t } = useTranslation()
  const signOut = useSignOut()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full pl-1"
            aria-label={user.name}
          />
        }
      >
        <Avatar size="sm">
          <AvatarFallback>{initials(user.name)}</AvatarFallback>
        </Avatar>
        <span>{firstName(user.name)}</span>
        <ChevronDown data-icon="inline-end" className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col">
            <span>{user.name}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {user.email}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuItem render={<Link to="/settings" />}>
            <Settings />
            {t('profile.settings')}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => signOut.mutate(undefined)}
        >
          <LogOut />
          {t('profile.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** The first word of the user's name, e.g. "Ada Lovelace" → "Ada". */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? ''
}

/** The user's initials for the avatar fallback, e.g. "shadcn" → "S". */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)

  return parts.map((part) => part.charAt(0).toUpperCase()).join('')
}
