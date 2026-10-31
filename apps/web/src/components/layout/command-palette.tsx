import { useNavigate } from '@tanstack/react-router'
import { ArrowLeftRight, Plus, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@workspace/ui/components/command'
import { Kbd } from '@workspace/ui/components/kbd'

import { DASHBOARD_ITEM, NAV_GROUPS, type NavItem } from './nav.js'

function destinations(): NavItem[] {
  const items: NavItem[] = [DASHBOARD_ITEM]

  for (const group of NAV_GROUPS) {
    for (const entry of group.items) {
      if ('items' in entry) {
        items.push(...entry.items)
      } else if ('children' in entry) {
        items.push(entry, ...entry.children)
      } else {
        items.push(entry)
      }
    }
  }

  return items
}

const PAGES = destinations()

export function CommandPalette() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function go(run: () => Promise<void>) {
    setOpen(false)
    void run()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('shell.search-label')}
        className="flex size-10 shrink-0 items-center justify-center gap-2.5 rounded-full border border-border bg-card text-left text-[0.875rem] text-muted-foreground shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-colors hover:text-foreground max-sm:ml-auto sm:h-10 sm:w-auto sm:min-w-0 sm:max-w-md sm:flex-1 sm:justify-start sm:px-4 dark:border-input dark:shadow-none"
      >
        <Search aria-hidden className="size-4 shrink-0" />
        <span className="truncate max-sm:sr-only">{t('shell.search')}</span>
        <Kbd className="ml-auto max-sm:hidden">⌘K</Kbd>
      </button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={t('shell.search-label')}
        description={t('shell.search')}
      >
        <Command>
          <CommandInput placeholder={t('shell.search')} />
          <CommandList className="max-h-[min(26rem,60vh)]">
            <CommandEmpty>{t('shell.search-empty')}</CommandEmpty>
            <CommandGroup heading={t('shell.group-actions')}>
              <CommandItem
                onSelect={() =>
                  go(() =>
                    navigate({ to: '/transactions', search: { new: true } })
                  )
                }
              >
                <Plus />
                {t('shell.new-transaction')}
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  go(() =>
                    navigate({
                      to: '/transactions',
                      search: { transfer: true },
                    })
                  )
                }
              >
                <ArrowLeftRight />
                {t('shell.new-transfer')}
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading={t('shell.group-pages')}>
              {PAGES.map((page) => {
                const Icon = page.icon

                return (
                  <CommandItem
                    key={page.key}
                    value={`${t(page.key)} ${page.to}`}
                    onSelect={() => go(() => navigate({ to: page.to }))}
                  >
                    {Icon ? <Icon /> : null}
                    {t(page.key)}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
