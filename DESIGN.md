---
name: Kantim
description: Obolo, a calm editorial fintech language for the whole home. A private bank's ledger on a warm washed canvas, forest-green action, pastel data hues, Geist with tabular numerals, in two peer themes.
colors:
  primary: "#2e6a55"
  primary-hover: "#255a47"
  primary-soft: "#dcebe2"
  on-primary: "#ffffff"
  primary-dark: "#9dd8bc"
  primary-hover-dark: "#b4e3cc"
  on-primary-dark: "#0f1f18"
  brand-coral: "#de9466"
  brand-coral-dark: "#e7ad88"
  canvas: "#f1f1ec"
  canvas-wash-mint: "#e2eee5"
  canvas-wash-blush: "#f7e5dc"
  card: "#fafaf7"
  surface-2: "#f0f0eb"
  accent: "#e9ebe5"
  ink: "#18221e"
  ink-2: "#3c4842"
  muted-ink: "#5f6a65"
  border: "rgb(20 30 25 / 0.07)"
  input-border: "rgb(20 30 25 / 0.1)"
  canvas-dark: "#121815"
  card-dark: "#1a211d"
  surface-2-dark: "#222a26"
  ink-dark: "#e7ede9"
  ink-2-dark: "#c3ccc7"
  muted-ink-dark: "#8e9a94"
  border-dark: "rgb(255 255 255 / 0.07)"
  sidebar: "#1f2b26"
  sidebar-dark: "#19211d"
  sidebar-ink: "#e7ede9"
  sidebar-muted: "#9aa6a0"
  sidebar-active: "#9dd8bc"
  sidebar-active-ink: "#0f1f18"
  positive: "#2f7a4a"
  positive-dark: "#8fd3a0"
  negative: "#c2413a"
  negative-soft: "#f6dedb"
  negative-dark: "#f08a80"
  warning: "#a8522f"
  warning-soft: "#f6e1d6"
  info: "#345d94"
  info-soft: "#dce6f4"
  data-in: "#5e9e7e"
  data-out: "#e3a386"
  data-blue: "#6f96cb"
  data-pink: "#d9849b"
  data-olive: "#6e9b47"
  data-slate: "#6c7782"
  data-orange: "#de9466"
  pastel-pink: "#f3dce1"
  pastel-sage: "#ddebdf"
  pastel-blue: "#dce5f2"
  pastel-peach: "#f6e0d4"
  pastel-butter: "#eeebd4"
  pastel-ink: "#2c3631"
typography:
  display:
    fontFamily: "Geist Variable, Inter Tight, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 5.6vw, 4.75rem)"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  section:
    fontFamily: "Geist Variable, Inter Tight, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4.2vw, 3.25rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Geist Variable, Inter Tight, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.875rem, 3.4vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  figure-hero:
    fontFamily: "Geist Variable, Inter Tight, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 4.6vw, 3.25rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontFeature: "tnum"
  figure-kpi:
    fontFamily: "Geist Variable, Inter Tight, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.625rem, 2.6vw, 2rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
    fontFeature: "tnum"
  title:
    fontFamily: "Geist Variable, Inter Tight, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.375
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Geist Variable, Inter Tight, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
    fontFeature: "tnum, ss01"
  body-landing:
    fontFamily: "Geist Variable, Inter Tight, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    fontFeature: "tnum"
  meta:
    fontFamily: "Geist Variable, Inter Tight, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.375
  label:
    fontFamily: "Geist Variable, Inter Tight, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1rem
    letterSpacing: "0.12em"
  mono:
    fontFamily: "Geist Mono Variable, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
rounded:
  tile: "10px"
  date: "12px"
  field: "14px"
  card: "20px"
  sheet: "24px"
  frame: "28px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  card-sm: "16px"
  card: "24px"
  gutter-mobile: "16px"
  gutter: "32px"
  landing-pad: "clamp(20px, 4.4vw, 64px)"
  landing-max: "1240px"
  app-max: "1440px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "40px"
    typography: "{typography.meta}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-outline:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "40px"
  button-outline-hover:
    backgroundColor: "{colors.surface-2}"
  button-secondary:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "40px"
  button-destructive:
    backgroundColor: "{colors.negative-soft}"
    textColor: "{colors.negative}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "40px"
  button-icon:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "40px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "24px"
  kpi-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "24px"
    typography: "{typography.figure-kpi}"
  input:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "0 16px"
    height: "52px"
  filter-chip:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "36px"
  filter-chip-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
  status-pill:
    rounded: "{rounded.pill}"
    padding: "0 10px"
    height: "24px"
  status-pill-positive:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.positive}"
  status-pill-negative:
    backgroundColor: "{colors.negative-soft}"
    textColor: "{colors.negative}"
  icon-tile:
    rounded: "{rounded.tile}"
    size: "32px"
  date-tile:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.date}"
    size: "44px"
  tabs-list:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.muted-ink}"
    rounded: "{rounded.pill}"
    height: "40px"
  tabs-trigger-active:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
  sidebar:
    backgroundColor: "{colors.sidebar}"
    textColor: "{colors.sidebar-ink}"
    rounded: "{rounded.sheet}"
  sidebar-item-active:
    backgroundColor: "{colors.sidebar-active}"
    textColor: "{colors.sidebar-active-ink}"
    rounded: "{rounded.pill}"
    padding: "8px 12px"
  brand-mark:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.tile}"
    size: "36px"
  payment-card:
    rounded: "{rounded.card}"
    padding: "20px"
---

# Design System: Kantim

## Overview

**Creative North Star: "The Private Ledger for the Home"**

Obolo is calm editorial fintech for a household. The canvas is a warm off-white (dark: a near-black forest) washed at its top corners with faint mint and blush light; on it sit soft cards that hold numbers as the hero. Hierarchy comes from type weight and size, not from color: bold Geist figures, a quiet muted line beneath each one, and color reserved for meaning (money in, problems, and data hues inside graphics). Every card explains itself with a title and a one-line description; the member never has to decode a widget.

Structure is a floating dark sidebar on the left (dark in both themes), a transparent top bar of pill tools, a context line and a 40px H1, then a KPI strip and a two-column body with a right rail. Forms and detail work open in drawers and dialogs on a blurred scrim, so the ledger stays in view. Light theme is lifted by barely-there shadows; dark theme is drawn with 1px hairlines. Shapes are rounded and friendly: pill buttons and chips, 20px cards, 24px sheets.

The landing is product-led: the hero is a large H1 and lead with pill CTAs beside a live-built Kantim home screen (sidebar, KPI strip, Going out soon, limits) floating on the same washed canvas. The landing uses the same values under its own token names (`action`, `surface`, `chrome`, `line`), so the visitor sees the exact product material. The world refuses the dense admin-table dashboard and the neon fintech look.

**Key Characteristics:**
- Numbers are the hero: bold, tight-tracked, always tabular.
- Hierarchy by weight, not by color; color carries meaning only.
- Warm washed canvas, soft 20px cards, pill controls.
- Floating dark sidebar in both themes.
- Whisper shadows in light, 1px borders in dark.
- Pastel data palette shared by charts, module hues, category pills, and avatars.
- Product-led landing built from the app's own components and values.

## Colors

A warm neutral ground with one deep forest-green voice, a coral brand spark, and a pastel data family that lives in graphics.

### Primary
- **Forest Ledger Green** (`primary`; dark `primary-dark`, a pale mint): the action color. Primary buttons, the active text link, focus rings, the input caret, selection tint, the forecast line, and active progress. Its soft form (`primary-soft`) backs secondary buttons, the brand-mark tile, default badges, and selected rows.

### Secondary
- **Coral Spark** (`brand-coral`; dark `brand-coral-dark`): the brand accent. The period of the "kantim." wordmark, the roof dot of the house glyph, and the hollow step markers on the forecast. It is never a fill for controls and never a text color for content.

### Tertiary: the data palette
- **In Green** (`data-in`), **Out Peach** (`data-out`), **Cornflower** (`data-blue`), **Rose** (`data-pink`), **Olive** (`data-olive`), **Slate** (`data-slate`), **Apricot** (`data-orange`): the chart series and the module hues. Tinted tiles mix the hue at 18 to 24% over transparent with text mixed at 58 to 70% toward ink, so every tone stays legible in both themes.
- **Pastels** (`pastel-pink`, `pastel-sage`, `pastel-blue`, `pastel-peach`, `pastel-butter`, with `pastel-ink` text): initials avatars, assigned by a stable hash of the name.

### Neutral
- **Washed Canvas** (`canvas`, with `canvas-wash-mint` top-left and `canvas-wash-blush` top-right radial washes; dark is one centered mint wash at 7%): the page ground, fixed behind scroll.
- **Card Paper** (`card`): cards, popovers, dialogs, sheets.
- **Second Surface** (`surface-2`): input wells, tab tracks, date tiles, hover fill, gauge tracks.
- **Ink** (`ink`), **Ink 2** (`ink-2`), **Muted Ink** (`muted-ink`): headings and figures, body on the landing, and every secondary line.
- **Hairline** (`border`, `input-border`): 7% and 10% ink; row dividers and field strokes.
- **Sidebar Night** (`sidebar`, `sidebar-dark`, with `sidebar-ink`, `sidebar-muted`, and the mint `sidebar-active` pill).

### Status
- **Positive** (`positive`): money in and healthy states. **Negative** (`negative`, `negative-soft`): problems only. **Warning** (`warning`, `warning-soft`): a copper for approaching limits. **Info** (`info`, `info-soft`).

### Named Rules
**The Green-In Rule.** Money in is `positive` green and always carries an explicit `+` (signed display).

**The Ink-Out Rule.** Money out is ink, never red, and its sign is a real minus (U+2212 "−"), never a hyphen. Out Peach appears only in graphics: chart series, the out tone tile, legend swatches.

**The Red-Means-Trouble Rule.** `negative` red is reserved for problems: overdue dates, limits over pace or over budget, failed loads, destructive actions, field errors. A normal expense is never red.

**The Module Hue Rule.** Modules map onto the data palette and nowhere else: finance = In Green, pantry = Apricot, tasks = Cornflower, pets = Olive, home care = Slate, household = Rose.

**The Coral Period Rule.** The wordmark is lowercase "kantim." in bold ink with a coral period; the house glyph sits on a `primary-soft` tile with a coral roof dot. Coral is the brand's spark, not a UI color.

## Typography

**Display Font:** Geist Variable (with Inter Tight, system sans)
**Body Font:** Geist Variable
**Label/Mono Font:** Geist Mono Variable, for identifiers only

**Character:** One neo-grotesque carries everything, so hierarchy is weight and size alone: 700 for H1s and figures with tight negative tracking, 600 for titles, 400 for prose. Stylistic set `ss01` is on in the app.

### Hierarchy
- **Display** (700, clamp 44 to 76px, 0.98, -0.035em): landing hero H1 only.
- **Section** (700, clamp 32 to 52px, 1.05, -0.03em): landing section H2, max 18ch, with a lede beside it at 17px muted.
- **Headline** (700, clamp 30 to 40px, 1.08, -0.025em): the app page H1.
- **Figure Hero / Figure KPI** (700, clamp 36 to 52px and 26 to 32px, tabular): balances and KPI values.
- **Title** (600, 18px, -0.015em): card titles; 16px on small cards.
- **Body** (400, 15px app, 16px landing, 1.55 to 1.6): prose and row names; subtitles max-prose, landing lede 46 to 52ch.
- **Meta** (13px): card descriptions, row meta lines, KPI footnotes, the context line above H1.
- **Label** (600, 11px, +0.12em, uppercase): list-group headers and section labels inside chrome only.
- **Mono** (13px Geist Mono): account last-4 numbers, currency codes, recovery and invite codes, terminal snippets, keyboard keys.

### Named Rules
**The Tabular Everywhere Rule.** Body text sets `font-variant-numeric: tabular-nums` globally in the app and the landing; every figure aligns in columns.

**The Mono-For-Identifiers Rule.** Geist Mono is for things a person copies or matches (codes, card digits, currency codes, commands), never for amounts or labels.

**The No-Eyebrow Rule.** Nothing uppercase sits above a heading. Above an H1 goes a muted 13px breadcrumb trail or, on Home, the date. Landing section headings have no kicker.

**The Caps-In-Chrome Rule.** The 11px uppercase label appears only as a list-group header (day groups, upcoming groups, table heads) or a section label inside chrome (sidebar groups, the sidebar month summary, the command palette, form fieldset legends).

## Layout

The app is a three-zone shell: the floating sidebar (offcanvas below `md`), a transparent header row (pill search with a command-K chip, a live month-net pill, round 40px icon tools, the "New transaction" pill), and a centered main column capped at 90rem with 16px gutters on mobile and 32px from `md`. Pages stack with 24px gaps: page header, KPI strip (4 up on desktop), then a body grid of `1fr` plus a 24rem right rail from `xl`. Pages enter with a 0.4s rise of 6px.

Home's primary visualization is the projected-balance stepped forecast ("Can we cover it?"): a dashed `stepAfter` primary line over an In Green fade, hollow coral markers where a payment lands, a dashed red zero line only when the balance would cross it, and a one-line verdict below. The diverging monthly in/out chart from the brief is deferred because no endpoint returns that history and the web computes nothing.

Transaction lists group by day under sticky blurred 11px caps headers that carry in, out and net totals; desktop rows are a fixed column grid (check, date, avatar plus name and meta, category pill, amount over running balance, status, actions), mobile collapses to a two-line card row.

The landing is a single column capped at 1240px with fluid padding (clamp 20 to 64px), a sticky floating pill nav of glass (72% canvas, 18px blur), a 0.72 / 1.28 hero split from `lg`, and reveal-on-scroll (12px rise, 600ms, 80ms stagger) that is off under reduced motion. Breakpoints are Tailwind's defaults.

## Elevation & Depth

Hybrid and theme-aware. In light, cards float on whisper shadows that are barely visible, and depth reads mostly as card paper against the washed canvas. In dark, shadows are replaced by 1px white hairlines, and the primary glow is removed. Overlays (dialogs, sheets, menus) take the lift shadow over a scrim blurred 7px.

### Shadow Vocabulary
- **Soft** (`0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -12px rgb(20 40 30 / 0.1)`; dark `0 0 0 1px rgb(255 255 255 / 0.07)`): every card, KPI card, the landing nav.
- **Lift** (`0 1px 2px rgb(0 0 0 / 0.05), 0 14px 32px -14px rgb(20 40 30 / 0.16)`; dark `0 0 0 1px rgb(255 255 255 / 0.1)`): dialogs and sheets.
- **Glow** (`0 1px 2px rgb(20 50 40 / 0.12), 0 8px 18px -8px rgb(46 106 85 / 0.55)`; dark `none`): primary buttons only.
- **Sidebar float** (`0 18px 40px -20px rgb(15 25 20 / 0.55)`, light only, plus a 1px sidebar ring).

### Named Rules
**The Whisper-and-Hairline Rule.** Light theme uses barely-there shadows; dark theme uses 1px borders. A card never gets a heavier shadow to win attention.

**The Glow-In-Light-Only Rule.** The primary button glows green in light theme and is flat in dark.

## Shapes

Rounded and soft throughout. Every button, chip, badge, status pill, tab track, search field and sidebar item is a full pill. Cards and payment cards are 20px, sheets, dialogs and the floating sidebar 24px, the landing hero frame 28px. Text inputs, selects and textareas are 14px wells; icon tiles and the brand-mark tile 10px; date tiles 12px. People are circles and organizations are 12px rounded squares in initials avatars. Lucide icons draw at a 1.5 stroke. Ring gauges and gauge bars have round caps on a `surface-2` track.

## Components

### Buttons
- **Shape:** full pill; 40px default, 36px small, 48px large, round 40px icon buttons.
- **Primary:** forest green with white text and the green glow (light only); hover darkens to `primary-hover`; press scales to 0.98 over 150ms on the spring ease.
- **Outline:** card paper with a hairline and a 1px shadow, hover `surface-2`. **Secondary:** `primary-soft` with green text. **Ghost:** transparent, hover `surface-2`. **Destructive:** `negative-soft` with red text, never solid red.

### Chips and pills
- **Filter chip:** 36px pill on card paper with a hairline; active inverts to ink with canvas text and a count bubble.
- **Status pill:** 24px pill in a tone tile, optional leading dot.
- **Category pill:** the category's own hue at 16% with 62% text and a 6px dot; empty color falls back to Slate.

### Cards / Containers
- **Corner Style:** 20px.
- **Background:** card paper.
- **Shadow Strategy:** Soft (see Elevation).
- **Internal Padding:** 24px (16px small); KPI cards 16, 20, 24px by breakpoint.
- **Header:** 18px semibold title over a 13px muted description, optional action at top right. Every card states what it shows.

### KPI card
An icon tile (tone by meaning: out tone for money out, negative only when something is late), a 13px muted label, a 26 to 32px bold tabular figure, then a pill and footnote line.

### Inputs / Fields
- **Style:** 52px wells in `surface-2` with a 10% ink stroke, 14px radius, 16px horizontal padding.
- **Focus:** stroke goes to 50% primary with a 4px 25% primary halo; caret is primary.
- **Error / Disabled:** red stroke with a 3px red halo; disabled at 50% opacity.

### Navigation
- **Sidebar:** floating 24px panel in Sidebar Night in both themes. Brand header with the house tile and "kantim." over the household name; 11px caps group labels; pill items with 18px icons at 85% ink, hover 6% white, active a mint pill with dark ink and semibold weight. A month summary panel (in green with +, out in ink with −) sits above the user row. Offcanvas sheet on mobile.
- **Tabs:** pill track in `surface-2`; the active tab is a card-paper pill with a small shadow (accent fill in dark). A line variant underlines in primary.
- **Landing nav:** sticky glass pill with the wordmark, 14px links, a locale and theme toggle, and a primary "Start free" pill.

### Payment card
A 1.586 aspect card face, 20px radius, layered drop shadow, three faint concentric rings at 14% and a gold chip. The gradient is chosen by account type: checking Emerald, savings Olive, wallet Coral, credit card Onyx, and any inactive account Frozen Ice. The last-4 digits are mono with wide tracking; the 10px uppercase tier and caption are printed card-face text, native to this object only.

### Date tile, gauges and avatars
- **Date tile:** 44px `surface-2` square with a bold day over a 10px caps month; overdue turns red-soft.
- **Ring gauge / Gauge bar:** 3px round-capped arc or 6px bar on `surface-2`, filled by tone; the bar can carry a dotted threshold and a solid "now" tick.
- **Initials avatar:** pastel by name hash, `pastel-ink` text.

## Do's and Don'ts

### Do:
- **Do** show money in as `positive` green with an explicit `+`, and money out in ink with U+2212.
- **Do** set every figure in tabular numerals and let weight (700) carry its importance.
- **Do** give every card a title and a one-line muted description.
- **Do** put a muted breadcrumb line or the date above an H1.
- **Do** use the Soft shadow in light and the 1px hairline in dark; keep the glow on primary buttons in light only.
- **Do** keep the sidebar dark in both themes.
- **Do** pick module hues and chart series from the data palette by the module map.
- **Do** choose payment-card gradients by account type, and Frozen Ice for any inactive account.
- **Do** build landing visuals from the product's own components and values.

### Don't:
- **Don't** color an ordinary expense red or peach in text; peach is for graphics, red is for problems.
- **Don't** place an uppercase eyebrow or kicker above any heading.
- **Don't** use the 11px caps label outside list-group headers and chrome section labels.
- **Don't** set amounts, labels or headings in Geist Mono.
- **Don't** use a hyphen-minus for negative money.
- **Don't** add heavier shadows, hard offset shadows, or neon glows; dark theme gets no glow at all.
- **Don't** use coral as a control fill or text color.
- **Don't** compute a chart in the web that no endpoint returns; defer it instead.
