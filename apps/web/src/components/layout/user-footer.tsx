import { LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Avatar, AvatarFallback } from '@workspace/ui/components/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { SidebarFooter } from '@workspace/ui/components/sidebar'
import type { SessionUser } from '@workspace/poco'

import { useSignOut } from '@/lib/auth.js'

/**
 * The user menu: avatar, name, and email in the trigger; account entries and
 * the logout action in the dropdown.
 */
export function UserFooter({ user }: { user: SessionUser }) {
  const { t } = useTranslation()
  const signOut = useSignOut()

  return (
    <SidebarFooter>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md p-2 text-left hover:bg-sidebar-accent"
            />
          }
        >
          <Avatar>
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 leading-tight">
            <span className="truncate text-sm font-medium">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {user.email}
            </span>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex flex-col">
              <span>{user.name}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {user.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuItem>{t('profile.account')}</DropdownMenuItem>
            <DropdownMenuItem>{t('profile.billing')}</DropdownMenuItem>
            <DropdownMenuItem>{t('profile.notifications')}</DropdownMenuItem>
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
    </SidebarFooter>
  )
}

/** The user's initials for the avatar fallback, e.g. "shadcn" → "S". */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)

  return parts.map((part) => part.charAt(0).toUpperCase()).join('')
}
