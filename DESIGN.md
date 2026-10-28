---
name: OpenHouse
description: Open-source household finance — editorial warm surfaces, shared books
colors:
  background: "oklch(0.99 0.004 85)"
  foreground: "oklch(0.24 0.014 60)"
  card: "oklch(1 0 0 / 0.55)"
  popover: "oklch(0.995 0.003 85 / 0.78)"
  primary: "oklch(0.46 0.085 163)"
  primary-foreground: "oklch(0.985 0.01 160)"
  secondary: "oklch(0.955 0.009 80)"
  secondary-foreground: "oklch(0.28 0.014 60)"
  muted: "oklch(0.958 0.008 80)"
  muted-foreground: "oklch(0.52 0.016 65)"
  accent: "oklch(0.95 0.012 160)"
  accent-foreground: "oklch(0.3 0.04 163)"
  destructive: "oklch(0.56 0.19 28)"
  border: "oklch(0.915 0.01 78)"
  input: "oklch(0.9 0.011 78)"
  ring: "oklch(0.62 0.08 163)"
  chart-1: "oklch(0.82 0.11 164)"
  chart-2: "oklch(0.68 0.12 162)"
  chart-3: "oklch(0.56 0.1 163)"
  chart-4: "oklch(0.46 0.085 163)"
  chart-5: "oklch(0.72 0.09 70)"
  sidebar: "oklch(0.97 0.008 82 / 0.5)"
  sidebar-foreground: "oklch(0.26 0.014 60)"
  sidebar-primary: "oklch(0.46 0.085 163)"
typography:
  display:
    fontFamily: "Fraunces Variable, ui-serif, Georgia, serif"
    fontSize: "2.25rem"
    fontWeight: 300
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Fraunces Variable, ui-serif, Georgia, serif"
    fontSize: "1.875rem"
    fontWeight: 300
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
  eyebrow:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 500
    letterSpacing: "0.2em"
    lineHeight: 1
rounded:
  sm: "0.45rem"
  md: "0.6rem"
  lg: "0.75rem"
  xl: "1.05rem"
  2xl: "1.35rem"
  3xl: "1.65rem"
  4xl: "1.95rem"
  full: "9999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  section: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.full}"
    height: "2.25rem"
    padding: "0 1rem"
  button-outline:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.full}"
    height: "2.25rem"
    padding: "0 1rem"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.2xl}"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "2.25rem"
    padding: "0 0.75rem"
  eyebrow-tag:
    backgroundColor: "oklch(0.46 0.085 163 / 0.1)"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: "0.25rem 0.75rem"
---

# Design System: OpenHouse

## Overview

**Creative North Star: "The Ledger in Warm Light"**

OpenHouse renders money the way a careful bookkeeper keeps a ledger: on warm
paper, in espresso ink, with one quiet green accent that behaves like the
seal on an envelope — present, meaningful, never loud. The app world is
*editorial warm*: a cream canvas carries translucent glass cards that float
over a fixed ambient mesh, serif headlines in Fraunces set the tone, and Geist
does the working. Density is comfortable, not dense; motion is a soft spring
(300 ms), never a snap.

Depth reads as **layered paper + glass** (user-confirmed): surfaces rest on
each other with warm-tinted, diffuse shadows and a hairline inner highlight,
while translucent card/popover/sidebar tokens refract a fixed ambient glow —
paper resting on paper, glass floating over light.

The landing page (Persuade mode) runs a deliberate sister world: **warm
monochrome** — bone canvas, charcoal ink, Newsreader serif, hairline rules,
and four washed pastels reserved strictly for tags and icon wells. It shares
the paper metaphor and the light/dark duality but not the palette; the two
worlds must never borrow each other's accents mid-page.

**Key Characteristics:**
- Cream paper and espresso ink; one muted sage-emerald voice
- Translucent glass surfaces over a fixed ambient mesh, with fixed paper grain
- Fraunces (light serif) headlines; Geist body and data
- Two-tier shadow vocabulary: `soft` at rest, `lift` when floating
- Spring motion, 300 ms, transform and opacity only
- Everything in both themes, always

## Colors

The palette is a paper world with a single accent voice: warm neutrals do the
work, sage-emerald speaks, and destructive red is the only other hue allowed
to carry meaning.

### Primary
- **Ledger Green** (`oklch(0.46 0.085 163)`): the one accent — primary
  buttons, active nav, focus rings, selection tint, the BrandMark core.
  Dark theme lifts it to a mint `oklch(0.74 0.11 163)`.
- **Ledger Green Tint** (`oklch(0.95 0.012 160)`): the accent's resting
  surface (accent tokens, eyebrow tags at 10% opacity).

### Secondary (omitted)
The system has one accent; secondary/muted tones are warm neutrals, not a
second accent. Charts extend the green family (chart-1…4, hue ≈162–164) with
one warm counterpoint (**Amber Ledger**, `oklch(0.72 0.09 70)`, chart-5).

### Neutral
- **Cream Paper** (`oklch(0.99 0.004 85)`): the page canvas.
- **Espresso Ink** (`oklch(0.24 0.014 60)`): all primary text and icons.
- **Parchment** (`oklch(0.955 0.009 80)` / `oklch(0.958 0.008 80)`): secondary
  and muted surfaces — subtle washes, never competitors to cards.
- **Faded Ink** (`oklch(0.52 0.016 65)`): secondary text, placeholders.
- **Hairline Sand** (`oklch(0.915 0.01 78)` borders, `oklch(0.9 0.011 78)`
  inputs): the only borders inputs and hairline rules get.
- **Glass Card** (`oklch(1 0 0 / 0.55)`): cards are white at 55% over the
  ambient mesh; popovers 78%, sidebar tray 50%. In dark theme they invert to
  4–8% white over warm near-black (`oklch(0.195 0.008 60)`).
- **Alarm Red** (`oklch(0.56 0.19 28)`): destructive only — never decorative.
  Dark theme: `oklch(0.7 0.17 24)`.

### Landing variant — warm monochrome
The landing swaps the palette, not the temperament: Bone `#fbfbfa` canvas,
Charcoal `#111111` ink, `#eaeaea` hairline, and four meaning-only washes
(red `#fdebec`/`#9f2f2d`, blue `#e1f3fe`/`#1f6c9f`, green `#edf3ec`/`#346538`,
yellow `#fbf3db`/`#956400`). Dark theme is a warm-charcoal twin
(`#161615` canvas). Serif is Newsreader, not Fraunces. Two documented
exceptions to the app ramp: the product mockups inside hero and feature
sections deliberately use 11–13px micro-labels (they depict a UI at reduced
scale — never smaller than 11px), and the `.line-grid` two-axis background
(`landing.css`) is the landing's own graph-paper texture, reserved for that
world.

### Named Rules
**The Semantic Only Rule.** No hex, no `oklch(...)`, no Tailwind palette
colors in feature code — only the semantic classes (`bg-card`,
`text-muted-foreground`, `ring-foreground/[0.06]`). Charts use
`--chart-1…5`. The values above live in `globals.css` alone.

**The Meaning Rule** (landing). Color carries meaning or it does not appear:
the four washes are reserved for tags and icon wells that encode state.

## Typography

**Display Font:** Fraunces Variable (fallback ui-serif, Georgia)
**Body Font:** Geist Variable (fallback system sans)
**Mono:** Geist Mono Variable (landing)

**Character:** a bookish serif that carries warmth and authority over a
crisp, tabular sans that does the accounting. The serif is set light and
tight — elegance by restraint, not weight.

### Hierarchy
- **Display** (Fraunces, 300, `text-3xl md:text-4xl` / 1.875–2.25rem,
  tight tracking): every page opens with it in the `PageHeader` `h1`.
- **Title** (Fraunces, 300–400, `text-xl–2xl`, tight): card and section
  headings.
- **Body** (Geist, 400, `text-sm`–base): all prose, tables, and forms.
  Prose blocks use `text-pretty`; headlines `text-balance`.
- **Label** (Geist, 500, `text-xs–sm`): buttons, nav, table headers.
- **Eyebrow** (Geist, 500, `text-[10px]`, 0.2em tracking, uppercase): the
  small pill above hero headlines.

### Named Rules
**The Never-Bold Rule.** Serif headings never take `font-bold` — `font-light`
or `font-normal` and `tracking-tight` only. Body stays the default sans.

**The Tabular Money Rule.** Money and number columns stay tabular; tables
get `font-variant-numeric: tabular-nums` automatically — never break it.

## Layout

- **Page recipe:** every signed-in page opens
  `mx-auto flex w-full max-w-7xl flex-1 animate-page-in flex-col gap-8 px-4
  py-8 md:px-10 md:py-12`, with a `PageHeader` (serif h1, muted subtitle,
  toolbar right-aligned in `actions`), then forms, a `DataTable`, or a card
  grid.
- **Exceptions:** full-height pages that virtualize (transactions) keep
  `min-h-0`, drop `mx-auto max-w-7xl`, and use `gap-6`.
- **Grids:** card grids `grid gap-4 md:grid-cols-2 xl:grid-cols-3`;
  dashboards may use asymmetric `md:col-span-*` bento; all collapse to one
  column on mobile.
- **Toolbars:** `FilterDialog` first, then the primary `Button` (leading
  lucide icon) on the far right of the page header.
- **Shell:** inset sidebar on a `bg-sidebar` tray, glass `AppHeader` sticky
  at `z-10`; overlays at `z-50`. No other z-layers.
- **Rhythm:** Tailwind spacing; 4px base with generous section air (`gap-8`
  pages, `gap-4` grids, `gap-2` label stacks).

## Elevation & Depth

Depth is layered paper plus glass. Two warm-tinted shadow tokens carry all
elevation, each with a top inner highlight like light catching a paper edge;
a hairline `ring-1 ring-foreground/[0.06]` draws the paper's edge without a
border. Cards, popovers, and the sidebar are translucent glass over a fixed
three-point ambient mesh; a fixed 3.5%-opacity grain keeps the paper tactile
without repainting on scroll.

### Shadow Vocabulary
- **Soft** (`shadow-soft`): resting surfaces — cards, tables, outline
  buttons. `inset 0 1px 0 rgb(255 255 255/0.7), 0 1px 2px rgb(60 40 20/0.04),
  0 12px 32px -16px rgb(60 40 20/0.12)`.
- **Lift** (`shadow-lift`): floating surfaces — dialogs, sheets.
  `inset 0 1px 0 rgb(255 255 255/0.7), 0 2px 6px rgb(60 40 20/0.05),
  0 32px 64px -24px rgb(60 40 20/0.22)`.
- Dark theme swaps the warm rgba for neutral black at higher opacity and a
  5–6% white top highlight.

### Named Rules
**The No Grey Shadow Rule.** Never `shadow-md/lg/xl` or dark rgba shadows —
only `shadow-soft` / `shadow-lift`, always paired with
`ring-1 ring-foreground/[0.06]` instead of a border.

**The Sticky Glass Rule.** `backdrop-blur` lives only on sticky or fixed
elements (header, overlays) — never on scrolling content.

## Shapes

The form language is concentric softness: everything curves, nothing is
square, and nested containers keep concentric radii. Cards and tables
`rounded-2xl` (1.35rem); dialogs and hero panels `rounded-3xl` (1.65rem);
inputs `rounded-lg` (0.75rem); buttons, chips, and tags are full pills. The
**double bezel** is the signature silhouette — an outer tray
`rounded-[2rem] bg-foreground/[0.03] p-1.5 ring-1 ring-foreground/[0.06]`
holding an inner core `rounded-[calc(2rem-0.375rem)] bg-card shadow-soft` —
used once per page, on the focal element only. The BrandMark is the same
idea miniaturized: a tinted tray holding the primary core.

## Components

### Buttons
- **Shape:** full pill, `h-9` default (36px), spring 300 ms transition.
- **Primary:** `bg-primary` on `text-primary-foreground` with a subtle inset
  top highlight; hover `bg-primary/90`; active scale 0.97.
- **Outline:** `bg-card` + `shadow-soft`, hairline border; hover to muted.
- **Ghost / Destructive / Link:** muted-hover ghost; destructive is a 10%
  red tint with red text (no solid red fill); link is green underlined.
- **Focus:** `ring-3 ring-ring/50` — visible, soft, green.

### Inputs / Fields
- **Style:** `h-9`, `rounded-lg` (0.75rem), `border-input` hairline,
  `bg-card` (dark: `bg-input/30`), 16px padding.
- **Focus:** border shifts to `ring`, `ring-3 ring-ring/50` — no glow
  bloom.
- **Error:** `aria-invalid` swaps border and ring to destructive with a 20%
  red ring; disabled at 50% opacity.

### Cards / Containers
- **Corner:** `rounded-2xl` (1.35rem).
- **Background:** translucent `bg-card` glass over the ambient mesh.
- **Shadow:** `shadow-soft` at rest; `shadow-lift` only when floating
  (dialogs, sheets).
- **Border:** none — `ring-1 ring-foreground/[0.06]` hairline instead.
- **Padding:** `--card-spacing` token (24px), content stacks `gap-3`.

### Data Table
The workhorse. Rows on hairline separators inside a `rounded-2xl
shadow-soft` frame, tabular numerals throughout, sticky headers in dense
ledgers. Pagination is a pill `ButtonGroup`.

### Sidebar
Inset tray on `bg-sidebar` glass. Nav items are pills with
`data-[status=active]` styling; links use `activeOptions={{ exact: true }}`.
Collapsible groups keep one trail — never two active states.

### Dialogs & Sheets
`rounded-3xl` (1.65rem) core, `shadow-lift`, overlay at `z-50` with
backdrop-blur. Spring entrance, never a fade-only pop.

### BrandMark (signature)
A house glyph in a machined double-bezel tile: tinted outer tray
(`rounded-[0.8rem] bg-primary/10 ring-1 ring-primary/15`) holding the
primary-colored core. Always `<BrandMark />` — never redraw the logo tile.

### Eyebrow Tag
`rounded-full bg-primary/10 px-3 py-1 text-[10px] font-medium
tracking-[0.2em] text-primary uppercase ring-1 ring-primary/15` above a
headline.

### Ambient Glow
Behind a hero: an `aria-hidden` absolute `rounded-full bg-primary/15
blur-3xl` circle inside an `overflow-hidden` parent.

## Do's and Don'ts

### Do:
- **Do** use semantic token classes only; add a missing token to
  `globals.css` (both themes) and document it here first.
- **Do** keep radii concentric when nesting (tray 2rem → core
  `calc(2rem-0.375rem)`).
- **Do** animate only `transform` and `opacity`, on the spring curve
  (`ease-spring` or inherited 300 ms default).
- **Do** check `.dark` before finishing — every surface ships in both themes.
- **Do** route all new user-facing copy through `locales/en-US.json`
  (`packages/ui` components stay label-agnostic).
- **Do** render lucide icons at the global 1.5 stroke; never pass
  `strokeWidth`.

### Don't:
- **Don't** use hex, oklch literals, or Tailwind palette colors in feature
  code.
- **Don't** set `font-bold` on serif headings.
- **Don't** use `shadow-md/lg/xl`, dark rgba shadows, or `border` where the
  hairline ring is the idiom.
- **Don't** use `ease-linear`, `ease-in-out`, or bare `transition-all`.
- **Don't** put `backdrop-blur` on scrolling content.
- **Don't** add new z-layers beyond sticky `z-10` and overlays `z-50`.
- **Don't** use the double bezel or ambient glow more than once per page —
  one focal element.
- **Don't** animate table rows or list items; page-level sections may use
  `animate-page-in`.
- **Don't** mix the landing's monochrome world into app screens, or the
  app's green into landing pages — each world keeps its own accent economy.
