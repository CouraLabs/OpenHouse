---
name: design-system
description: OpenHouse's "editorial warm" visual language for apps/web — page recipe, tokens, reusable patterns, guardrails, and known UI pitfalls. Use before building or restyling any signed-in or signed-out page, form, dialog, or component in apps/web or packages/ui.
---

# Design system — follow it on every new page

The web app uses one visual language: **editorial warm** (cream paper and espresso ink, a muted sage-emerald accent, serif headings, soft depth, spring motion). It is encoded in tokens and primitives, so a new page gets it by composing what already exists. Do not restyle per page.

## Where the design lives

- `packages/ui/src/styles/globals.css`: every color, radius, shadow, easing, and animation token, for light (`:root`) and dark (`.dark`). Change the look here, never in a feature.
- `packages/ui/src/components/*`: primitives already carry the style (pill `Button`, `Card`, `DataTable`, `Dialog`, `Input`, `Table`, inset `Sidebar`).
- `apps/web/src/components/page-header.tsx`: the serif page title block.
- `apps/web/src/components/layout/`: shell chrome (`BrandMark`, `AuthLayout`, `AuthHero`, glass `AppHeader`).

## Page recipe

Every signed-in page opens with exactly this wrapper and a `PageHeader`:

```tsx
<main className="mx-auto flex w-full max-w-7xl flex-1 animate-page-in flex-col gap-8 px-4 py-8 md:px-10 md:py-12">
  <PageHeader title={t('x.title')} subtitle={t('x.subtitle')} actions={toolbar} />
  {/* form (when open), then DataTable or a card grid */}
</main>
```

- Full-height pages that virtualize (transactions) keep `min-h-0`, drop `mx-auto max-w-7xl`, and use `gap-6`.
- Toolbars go in `PageHeader.actions`: `FilterDialog`, then the primary `Button` (with a leading lucide icon) on the far right.
- Signed-out pages render inside `AuthLayout`. It already provides the split hero and the double-bezel form card, so the page supplies only the form.

## Tokens, not values

- **Colors:** only semantic classes (`bg-background`, `bg-card`, `bg-muted`, `text-muted-foreground`, `bg-primary`, `text-primary`, `ring-foreground/[0.06]`, `bg-sidebar` for tray surfaces). No hex, no `oklch(...)`, no Tailwind palette colors (`bg-gray-100`, `text-emerald-600`). Charts use `--chart-1…5`.
- **Typography:** headings use `font-heading` (Fraunces serif) with `font-light` or `font-normal` and `tracking-tight`. Never `font-bold` on serif headings. Body stays the default sans. Money and number columns stay tabular (tables get this automatically). Prefer `text-balance` for headlines and `text-pretty` for prose.
- **Depth:** `shadow-soft` for resting surfaces and `shadow-lift` for floating ones (dialogs, the app sheet). Pair them with a hairline `ring-1 ring-foreground/[0.06]` instead of a `border`. Never use `shadow-md/lg/xl` or dark `rgba` shadows.
- **Radius:** cards and tables `rounded-2xl`/`rounded-[1.25rem]`, dialogs and hero panels `rounded-3xl`/`rounded-[2rem]`, inputs `rounded-lg`, buttons and tags `rounded-full`.
- **Motion:** transitions inherit the spring curve and 300ms by default. Write `transition-colors` / `transition-transform` without an easing class, or use `ease-spring` explicitly. Never `ease-linear`, `ease-in-out`, or bare `transition-all`. Animate only `transform` and `opacity`. New page-level sections may use `animate-page-in`; table rows and list items do not.
- **Icons:** lucide, rendered at a 1.5 stroke by the global rule. Do not pass `strokeWidth`.

## Patterns to reuse

- **Double bezel**, for a hero container or a featured form: an outer tray `rounded-[2rem] bg-foreground/[0.03] p-1.5 ring-1 ring-foreground/[0.06]` holding an inner core `rounded-[calc(2rem-0.375rem)] bg-card shadow-soft`. Keep the radii concentric. Use it for one focal element per page, not every card.
- **Eyebrow tag** above a headline: `rounded-full bg-primary/10 px-3 py-1 text-[10px] font-medium tracking-[0.2em] text-primary uppercase ring-1 ring-primary/15`.
- **Ambient glow** behind a hero: an `aria-hidden` absolute `rounded-full bg-primary/15 blur-3xl` circle inside an `overflow-hidden` parent.
- **Card grids:** `grid gap-4 md:grid-cols-2 xl:grid-cols-3` (or an asymmetric `md:col-span-*` bento for dashboards) that collapses to one column on mobile.
- **Brand:** always `<BrandMark />`. Never redraw the logo tile.
- **Sidebar links:** use `activeOptions={{ exact: true }}` and the existing `data-[status=active]:…` classes from `nav-button-item.tsx`.
- **Table toolbar:** `FilterDialog` (entity-parameterized fields: `text`, `number`, `select` with options) immediately left of the insert button; applying a filter resets the table to page 1.

## Guardrails

- `backdrop-blur` only on sticky or fixed elements (the header, overlays), never on scrolling content.
- No new `z-*` layers beyond the existing system (sticky header `z-10`, overlays `z-50`).
- Every new surface must look right in both themes. Check `.dark` before finishing.
- New user-facing copy (including hero and eyebrow text) goes through `locales/en-US.json`. `packages/ui` components stay label-agnostic.
- If a page needs a style that no token expresses, add the token to `globals.css` (both themes) and document it here first.

## Pitfalls

- A row deletion once left the edit form open on the deleted item: any destructive row action must also clear the page's form state (`formOpen`/`editing`), not just its own dialog state.
- A companion control (color picker) placed left of its text field indented the label out of alignment with sibling fields: in a field row, the labeled text field goes first, the control after it — and the text input is `readOnly` so the control is the only source of the value.
- base-ui `Select` does not render the trigger's label for a value that was set while the popup was closed (a prefilled edit form showed the placeholder instead of the selection): render the label explicitly as `SelectValue` children (resolved from the same option list), do not rely on the `items`-derived label. `Select`/`RadioGroup` take generic `value`/`onValueChange` — numbers work at runtime, but the prop's default generic only admits strings, so cast at the boundary.
