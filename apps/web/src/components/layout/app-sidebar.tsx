import { Link } from '@tanstack/react-router'
import {
  ChevronRight,
  House,
  Cuboid,
  FileText,
  LogOut,
  Settings2,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Avatar, AvatarFallback } from '@workspace/ui/components/avatar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@workspace/ui/components/sidebar'
import type { SessionUser } from '@workspace/poco'

import { useSignOut } from '@/lib/auth.js'

/**
 * A navigation entry the sidebar renders as a link. The paths are inert
 * placeholders until their pages exist; the shell itself owns no routes.
 */
type NavItem = {
  key: string
  to: string
  icon?: LucideIcon
}

/** A navigation entry that expands to reveal nested links. */
type CollapsibleNavItem = NavItem & { children: NavItem[] }

/** A navigation group: a labeled list of items. */
type NavGroup = {
  key: string
  items: Array<NavItem | CollapsibleNavItem>
}

const PLATFORM_GROUP: NavGroup = {
  key: 'nav.platform',
  items: [
    {
      key: 'nav.playground',
      to: '/playground',
      icon: Sparkles,
      children: [
        { key: 'nav.history', to: '/playground/history' },
        { key: 'nav.starred', to: '/playground/starred' },
        { key: 'nav.settings', to: '/playground/settings' },
      ],
    },
    { key: 'nav.models', to: '/models', icon: Cuboid },
    { key: 'nav.documentation', to: '/documentation', icon: FileText },
    { key: 'nav.settings', to: '/settings', icon: Settings2 },
  ],
}

const PROJECTS_GROUP: NavGroup = {
  key: 'nav.projects',
  items: [
    { key: 'nav.design-engineering', to: '/projects/design-engineering' },
    { key: 'nav.sales-marketing', to: '/projects/sales-marketing' },
    { key: 'nav.travel', to: '/projects/travel' },
  ],
}

/**
 * The signed-in application sidebar: the brand, the grouped navigation, and
 * the user menu. Renders inside `SidebarProvider`; owns no page content.
 */
export function AppSidebar({ user, tenantName }: { user: SessionUser; tenantName: string }) {
  return (
    <Sidebar>
      <BrandHeader tenantName={tenantName} />
      <SidebarContent>
        <NavGroupContent group={PLATFORM_GROUP} />
        <NavGroupContent group={PROJECTS_GROUP} />
      </SidebarContent>
      <UserFooter user={user} />
    </Sidebar>
  )
}

/** The non-interactive brand block: logo mark, app name, tenant name. */
function BrandHeader({ tenantName }: { tenantName: string }) {
  const { t } = useTranslation()

  return (
    <SidebarHeader>
      <div className="flex items-center gap-2 px-2 py-1.5">
        <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
          <House className="size-4" />
        </div>
        <div className="grid flex-1 leading-tight">
          <span className="truncate font-semibold">{t('app.name')}</span>
          <span className="text-muted-foreground truncate text-xs">
            {tenantName}
          </span>
        </div>
      </div>
    </SidebarHeader>
  )
}

/** One sidebar section: the group label and its items. */
function NavGroupContent({ group }: { group: NavGroup }) {
  const { t } = useTranslation()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t(group.key)}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {group.items.map((item) =>
            'children' in item ? (
              <CollapsibleNavItemView key={item.key} item={item} />
            ) : (
              <NavButtonItem key={item.key} item={item} />
            ),
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

/** A plain navigation entry rendered as a link button. */
function NavButtonItem({ item }: { item: NavItem }) {
  const { t } = useTranslation()
  const Icon = item.icon

  return (
    <SidebarMenuItem>
      <SidebarMenuButton render={<Link to={item.to} />}>
        {Icon ? <Icon /> : null}
        <span>{t(item.key)}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

/** A navigation entry that expands in place to reveal nested links. */
function CollapsibleNavItemView({ item }: { item: CollapsibleNavItem }) {
  const { t } = useTranslation()
  const Icon = item.icon

  return (
    <Collapsible className="group/collapsible" defaultOpen>
      <SidebarMenuItem>
        <CollapsibleTrigger
          render={
            <SidebarMenuButton tooltip={t(item.key)}>
              {Icon ? <Icon /> : null}
              <span>{t(item.key)}</span>
              <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          }
        />
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children.map((child) => (
              <SidebarMenuSubItem key={child.key}>
                <SidebarMenuSubButton render={<Link to={child.to} />}>
                  <span>{t(child.key)}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

/**
 * The user menu: avatar, name, and email in the trigger; account entries and
 * the logout action in the dropdown.
 */
function UserFooter({ user }: { user: SessionUser }) {
  const { t } = useTranslation()
  const signOut = useSignOut()

  return (
    <SidebarFooter>
      <DropdownMenu>
        <DropdownMenuTrigger render={<button type="button" className="flex w-full items-center gap-2 rounded-md p-2 text-left hover:bg-sidebar-accent" />}>
          <Avatar>
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 leading-tight">
            <span className="truncate text-sm font-medium">{user.name}</span>
            <span className="text-muted-foreground truncate text-xs">
              {user.email}
            </span>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex flex-col">
              <span>{user.name}</span>
              <span className="text-muted-foreground text-xs font-normal">
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
