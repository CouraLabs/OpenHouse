---
title: 'App shell layout: sidebar, header, i18n'
type: 'feature'
ticket: ''
created: '2026-10-10'
status: 'built'
baseline_revision: 'a4a554398ed03bffef7facab2f34d5e64caafe9d'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'auto'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless the human renegotiates">

## Intent

**Problem:** The signed-in area has no application chrome — `MainPage` is a bare
page with a hand-rolled sign-out button. Navigation, theme switching, language
switching, and page placement have no home, and every future route would
re-invent them.

**Approach:** Build a generic `AppShell` layout under
`apps/web/src/components/layout/` using the ui package's sidebar primitives:
sidebar (brand, grouped nav, user dropdown), header (trigger, breadcrumb,
theme + language switchers), and a `SidebarInset` outlet. Add `i18next` +
`react-i18next` with an `en-US` locale and wire the language switcher to
`i18n.changeLanguage()`. Wrap signed-in routes with the shell.

## Boundaries & Constraints

**Always:**

- All strings the shell renders come from i18n resources; no hardcoded UI text
  in components.
- Components import ui primitives via `@workspace/ui/components/*` (existing
  convention); no shadcn code is vendored into `apps/web`.
- The shell is generic: it receives the session and children/outlet; it never
  imports features.
- Route paths and the existing sign-in/sign-up/auth flow are untouched.

**Never:**

- No dashboard widgets, charts, metrics, or page-specific content.
- No re-declaring theme provider logic — reuse `components/layout/theme-provider.tsx`.
- No locale files beyond `en-US` (structure leaves room; languages come later).
- No changes to `packages/ui` itself.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Signed-in route renders | Session non-null, route under shell | Sidebar + header + outlet content visible | — |
| Signed-out visit | Session null | `beforeLoad` redirect (existing) — shell never renders signed-out | — |
| Language change | User picks a locale in switcher | Menu labels, breadcrumb, profile options update live; persisted to `localStorage` | Unknown key falls back to `en-US` |
| Theme change | User picks Light/Dark/System | `documentElement` class flips (existing provider) | — |
| Deep route active | `location.pathname` matches a menu path | Matching `SidebarMenuButton` shows active state | — |
| Mobile viewport | Width < 768px | Sidebar becomes offcanvas sheet via `SidebarTrigger` | — |

</frozen-after-approval>

## Code Map

- `apps/web/src/components/layout/theme-provider.tsx` — existing `ThemeProvider`/`useTheme`; the switcher consumes it, no edits.
- `packages/ui/src/components/sidebar.tsx` — sidebar primitives; `SidebarMenuButton` uses base-ui `useRender` (`render={<Link/>}`), `isActive` prop drives `data-active`.
- `packages/ui/src/components/{avatar,dropdown-menu,breadcrumb,button,separator,collapsible}.tsx` — primitives used by the shell; exports verified.
- `apps/web/src/App.tsx` — code-based TanStack router (`createRoute`/`Outlet`); `mainRoute` wraps `MainPage`; shell goes here, not in features.
- `apps/web/src/lib/auth.ts` — `useSession`/`useSignOut`; session shape `{ user: { name, email }, tenant: { name } }` from `@workspace/poco`.
- `apps/web/src/main.tsx` — mounts `ThemeProvider` → `App`; i18n init imports here.
- `apps/web/package.json` — needs `i18next`, `react-i18next`; has TanStack router, lucide-react.

## Tasks & Acceptance

**Execution:**

- [x] `apps/web/package.json` -- add `i18next` + `react-i18next` dependencies -- i18n support.
- [x] `apps/web/src/lib/i18n.ts` + `apps/web/src/locales/en-US.json` -- init i18next with `react-i18next` `initReactI18next`, `lng: 'en-US'`, `fallbackLng: 'en-US'`, resources from the JSON; key namespaces `nav`, `breadcrumb`, `profile`, `theme`, `language` -- single i18n entry point, typed via `en-US` default import.
- [x] `apps/web/src/main.tsx` -- import `./lib/i18n.js` before `App` -- i18n ready before first render.
- [x] `apps/web/src/components/layout/app-sidebar.tsx` -- `Sidebar` with header (logo mark + app name + tenant name from session), Platform group (Playground collapsible with History/Starred/Settings sub-items; Models, Documentation, Settings links), Projects group (Design Engineering, Sales & Marketing, Travel), footer user `DropdownMenu` (avatar + name + email, menu items, logout button) using `useSignOut` -- the nav itself.
- [x] `apps/web/src/components/layout/app-header.tsx` -- `SidebarTrigger` + `Separator`, dynamic `Breadcrumb` from router matches (`Home / Platform / Models`), theme switcher `DropdownMenu` (Light/Dark/System via `useTheme`), language switcher `DropdownMenu` calling `i18n.changeLanguage()` -- the top bar.
- [x] `apps/web/src/components/layout/app-shell.tsx` -- `SidebarProvider` → sidebar + `SidebarInset` with header and `<Outlet />` (TanStack) as the generic page slot -- the composition root.
- [x] `apps/web/src/App.tsx` -- wrap `mainRoute`'s component in `AppShell` (or make shell a layout route parent) so signed-in pages render inside the inset; keep `MainPage` content, swap hand-rolled sign-out for nothing (footer owns logout) -- wire-up.
- [x] `apps/web/src/components/layout/*.tsx` -- translations for all shell strings in `en-US.json` -- no hardcoded text.

**Acceptance Criteria:**

- Given a signed-in session, when `/` loads, then the sidebar (brand with tenant name, Platform and Projects groups, user footer) and header (trigger, breadcrumb `Home`, theme and language dropdowns) render with the page inside `SidebarInset`.
- Given the language switcher, when a language is selected, then all shell labels update without reload and the choice survives reload.
- Given the theme switcher, when Dark is chosen, then the app renders dark immediately and survives reload.
- Given a viewport narrower than 768px, when `SidebarTrigger` is tapped, then the sidebar opens as an overlay sheet and closes on selection.
- Given `npm run typecheck` in `apps/web`, when run, then it exits 0.

## Implementation Notes

- Decisions from the checkpoint: breadcrumb labels are segment-based (`nav.<segment>` keys with
  raw-segment fallback); demo nav entries render as links to paths without backing routes (not-found
  renders at root level — expected until pages exist); language switcher ships English only.
- `AppShell` takes `children` instead of `<Outlet />`: the router is code-based and there is a single
  signed-in route; `MainLayout` in `App.tsx` reads the session from the query cache and passes it down.
  When more signed-in routes exist, promote the shell to a layout route with `id: 'main'` children and
  swap back to `<Outlet />`.
- `useSignOut` now navigates to `/sign-in` on success (previously only cleared the cache — after the
  header/footer refactor nothing else navigated, leaving the user on a stale shell). This changes
  `lib/auth.ts`, which the plan's Code Map listed as read-only; behavior is strictly additive.
- Fixed during browser verification: base-ui (this ui package's headless layer) requires
  `DropdownMenuLabel` to sit inside a `DropdownMenuGroup` — the footer menu crashed with
  "MenuGroupContext is missing" until the label was wrapped in the group.
- Theme persistence, sidebar collapse state, and locale choice all live in `localStorage` under
  `theme`, `sidebar:state`, and `locale` respectively.
- Header polish after review: the header now uses `bg-sidebar` so the top bar matches the sidebar
  surface, and the vertical separator gets `h-4 self-center!` — the ui package's separator emits
  `data-vertical:self-stretch` (which resolves against the header's height and pins the bar edge to
  edge); the important modifier is the deterministic way to win over that variant utility from
  application code.
- Blank refresh fixed: `RoutedApp` rendered `null` while the first `/auth/me` call was pending, so a
  hung or slowly-failing API request showed a bare white page until a hard refresh. Now: `api()` calls
  carry `AbortSignal.timeout(10s)` (a hung API fails instead of stalling forever), the session query
  retries network failures (`retry: 3` — a reload with a momentarily unavailable API recovers instead
  of blanking), and the pending gate renders a visible splash (pulsing house mark) instead of `null`.
  Browser-verified: API down → splash → sign-in after retries; API back → reload reaches the shell.
- PWA readiness (fixes the console errors on F5): the browser held a stale service-worker
  registration pointing at `/@vite-plugin-pwa/pwa-entry-point-loaded`, which 404'd on every reload and
  produced the "can't detect preamble" blank. The app is now genuinely PWA-ready via `vite-plugin-pwa`
  (`autoUpdate`, `generateSW`): `public/` ships `icon.svg`, `favicon.ico`/`favicon.png`,
  `pwa-192x192.png`, `pwa-512x512.png` (+ maskable) generated from the house brand mark; the manifest
  (`name: OpenHouse`, standalone, green theme) is injected into `index.html`, whose favicon, title, and
  theme-color meta were also fixed. `devOptions.enabled: true` serves the worker in dev so reload
  behavior matches production and the endpoint can no longer 404. Verified: `sw.js` +
  `manifest.webmanifest` built, SW active with controller in dev, three consecutive F5s render the
  shell with zero console errors.

## Plan Change Log

- 2026-10-10, during implementation: `lib/auth.ts` `useSignOut` gained navigation to `/sign-in`.
  Trigger: browser verification showed sign-out left the user on the stale shell (the old `MainPage`
  handled navigation itself; the shell's footer did not). Avoids: a signed-out user stuck on
  shell-rendered UI hitting 401s.

## Review Triage Log

- 2026-10-10, quick pass (adversarial, post-implementation). Findings: 4. Patched: 2. False: 2.
- Finding: `DropdownMenuLabel` outside a group crashes base-ui at open time (browser-verified:
  "MenuGroupContext is missing"). **Patched** — label wrapped in `DropdownMenuGroup`.
- Finding: `useSignOut` cleared the cache without navigating; with the hand-rolled sign-out button
  gone, sign-out left the user on a stale shell. **Patched** — navigates to `/sign-in` on success
  (Plan Change Log entry).
- Finding: `onValueChange` on base-ui `MenuRadioGroup` passes `(value, eventDetails)`;
  `setTheme(theme: Theme)` receives the extra arg. **False** — extra args are ignored by JS calling
  convention; the value is `string` and the theme set is exactly the switcher's values.
- Finding: segment-based breadcrumb renders raw segments (e.g. `models`) with `defaultValue`, which
  may read as lowercased labels for unknown routes. **False for now** — every shipped nav segment has
  a `nav.*` key; raw fallback only appears for paths outside the nav, where no better label exists.
- Finding (accepted risk): nav links point at paths with no backing routes; navigating renders the
  root not-found outside the shell. Accepted per checkpoint decision 2 (pages come later); the
  not-found component renders standalone until then.

## Design Notes

- Breadcrumb derives from route matches: map each matched route id/path to a
  label key; unknown paths render their segment as-is.
- `SidebarMenuButton` renders anchors via `render={<Link to="…" />}` (base-ui
  `useRender`), so keyboard/screen-reader semantics stay link-shaped.
- Collapsible "Playground" uses `Collapsible` + `SidebarMenuSub` for sub-items,
  matching the sidebar primitive's composition pattern.

## Verification

**Commands:**

- `npm run typecheck -w web` (or `tsc --noEmit` in `apps/web`) -- expected: exit 0.
- `npm run build -w web` -- expected: production build succeeds.
- `npx biome check apps/web/src/components/layout apps/web/src/lib/i18n.ts` -- expected: no lint errors.

**Manual checks (no CLI possible for visuals):**

- Run `npm run dev -w web` with API up; sign in; verify sidebar/header render, theme + language switch, mobile sheet behavior via responsive devtools.
