---
name: Kantim
description: A drafting sheet for household software, with hairline grid and plotted line primitives, printed in warm linen and coffee ink with a green action color, in two peer themes.
colors:
  linho: "#f7f2ea"
  linho-raised: "#efe8dc"
  linho-lift: "#e8dfd0"
  cafe: "#2a211b"
  cafe-2: "#4a3e34"
  cafe-3: "#6b5d51"
  folha: "#2f6b4f"
  folha-hover: "#245640"
  on-folha: "#f7f2ea"
  terracota: "#c2552f"
  ipe: "#f2b33d"
  ipe-soft: "#fbebc6"
  ipe-foreground: "#6b4700"
  alerta: "#b42335"
  module-finance: "#2f6b4f"
  module-pantry: "#d0643a"
  module-tasks: "#3a6ea8"
  module-pets: "#d9952a"
  module-home-care: "#2e8582"
  module-household: "#9a4a86"
  hairline: "rgb(42 33 27 / 0.14)"
  hairline-strong: "rgb(42 33 27 / 0.52)"
  nav-glass: "rgb(247 242 234 / 0.7)"
  bloom: "rgb(194 85 47 / 0.14)"
  bloom-edge: "rgb(47 107 79 / 0.07)"
  linho-dark: "#1c1714"
  linho-dark-raised: "#251f1b"
  linho-dark-lift: "#2e2722"
  cafe-dark: "#f1e9df"
  cafe-dark-2: "#cfc4b8"
  cafe-dark-3: "#a99c8f"
  folha-dark: "#7cc29f"
  folha-dark-hover: "#94d1b2"
  on-folha-dark: "#10231a"
  terracota-dark: "#e47c55"
  ipe-dark: "#f6cf7a"
  ipe-soft-dark: "#3a2e14"
  ipe-foreground-dark: "#f6cf7a"
  alerta-dark: "#f08a92"
  module-finance-dark: "#7cc29f"
  module-pantry-dark: "#e8845c"
  module-tasks-dark: "#7fa9dc"
  module-pets-dark: "#eab25a"
  module-home-care-dark: "#5cbab6"
  module-household-dark: "#c98bb9"
  hairline-dark: "rgb(241 233 223 / 0.12)"
  hairline-strong-dark: "rgb(241 233 223 / 0.4)"
  nav-glass-dark: "rgb(28 23 20 / 0.62)"
  bloom-dark: "rgb(228 124 85 / 0.13)"
  bloom-edge-dark: "rgb(124 194 159 / 0.06)"
typography:
  display:
    fontFamily: "Geist Mono Variable, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "clamp(2.2rem, 5.7vw, 5.1rem)"
    fontWeight: 500
    lineHeight: 1.02
    letterSpacing: "-0.045em"
  headline:
    fontFamily: "Geist Mono Variable, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "clamp(2.8rem, 8vw, 6rem)"
    fontWeight: 500
    lineHeight: 0.95
    letterSpacing: "-0.05em"
  title:
    fontFamily: "Geist Mono Variable, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "clamp(2rem, 3.8vw, 3.2rem)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.045em"
  name:
    fontFamily: "Geist Mono Variable, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "1.1rem"
    fontWeight: 500
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Jost Variable, Jost, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  body-lead:
    fontFamily: "Jost Variable, Jost, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.1rem"
    fontWeight: 400
    lineHeight: 1.6
  button:
    fontFamily: "Jost Variable, Jost, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
  label:
    fontFamily: "Geist Mono Variable, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "0.78rem"
    fontWeight: 400
  dot-note:
    fontFamily: "Doto Variable, Doto, Geist Mono Variable, ui-monospace, monospace"
    fontSize: "1.02rem"
    fontWeight: 700
    lineHeight: 1.45
    letterSpacing: "0.14em"
  dot-sign:
    fontFamily: "Doto Variable, Doto, Geist Mono Variable, ui-monospace, monospace"
    fontSize: "clamp(3.2rem, 16vw, 14rem)"
    fontWeight: 700
    lineHeight: 0.82
    letterSpacing: "-0.02em"
rounded:
  ctl: "999px"
  panel: "20px"
  tab: "16px"
  inset: "14px"
  key: "6px"
spacing:
  pad: "clamp(20px, 4.4vw, 64px)"
  gutter: "clamp(20px, 2.4vw, 32px)"
  panel-pad: "clamp(24px, 3.6vw, 44px)"
  max: "1320px"
  nav-h: "64px"
  split: "clamp(280px, 31%, 410px)"
  action-gap: "12px"
  tab-gap: "6px"
components:
  button-primary:
    backgroundColor: "{colors.folha}"
    textColor: "{colors.on-folha}"
    typography: "{typography.button}"
    rounded: "{rounded.ctl}"
    padding: "0 24px"
    height: "46px"
  button-primary-hover:
    backgroundColor: "{colors.folha-hover}"
  button-primary-disc:
    backgroundColor: "{colors.folha}"
    textColor: "{colors.on-folha}"
    rounded: "{rounded.ctl}"
    size: "46px"
  button-pill:
    backgroundColor: "transparent"
    textColor: "{colors.cafe}"
    typography: "{typography.button}"
    rounded: "{rounded.ctl}"
    padding: "0 22px"
    height: "46px"
  button-pill-hover:
    backgroundColor: "{colors.cafe}"
    textColor: "{colors.linho}"
  button-pill-sm:
    textColor: "{colors.cafe-2}"
    rounded: "{rounded.ctl}"
    padding: "0 14px"
    height: "34px"
  tag:
    backgroundColor: "transparent"
    textColor: "{colors.cafe-2}"
    typography: "{typography.label}"
    rounded: "{rounded.ctl}"
    padding: "3px 12px"
  tool:
    backgroundColor: "transparent"
    textColor: "{colors.cafe}"
    rounded: "{rounded.ctl}"
    size: "38px"
  nav-link:
    textColor: "{colors.cafe-2}"
    rounded: "{rounded.ctl}"
    padding: "7px 12px"
  nav-link-hover:
    backgroundColor: "{colors.linho-lift}"
    textColor: "{colors.cafe}"
  ledger-row:
    backgroundColor: "{colors.linho}"
    textColor: "{colors.cafe}"
    padding: "12px clamp(20px, 4.4vw, 64px)"
    height: "64px"
  ledger-row-hover:
    backgroundColor: "{colors.cafe}"
    textColor: "{colors.linho}"
  tab:
    backgroundColor: "{colors.linho}"
    textColor: "{colors.cafe}"
    rounded: "{rounded.tab}"
    padding: "16px 18px"
  tab-selected:
    backgroundColor: "{colors.cafe}"
    textColor: "{colors.linho}"
  panel:
    backgroundColor: "{colors.linho-raised}"
    textColor: "{colors.cafe}"
    rounded: "{rounded.panel}"
    padding: "clamp(24px, 3.6vw, 44px)"
  run-block:
    backgroundColor: "{colors.linho}"
    rounded: "{rounded.inset}"
    padding: "14px 16px"
---

# Design System: Kantim

## Overview

**Creative North Star: "The Drafting Sheet"**

The page is one visible sheet of technical drawing paper, now printed on warm linen with coffee-brown ink. A hairline frame runs its full height, every section is a cell ruled off that frame, and crosshair ticks mark each place where two rules meet. On that sheet each project is a line drawing, plotted stroke by stroke rather than rendered. One bright node dot travels a hairline orbit in the hero, and a faint terracotta bloom of light sits behind it.

Color is warm and sparing. Linho (linen) is the ground, Café (coffee) is the ink, and Folha (leaf green) is the one action color. Terracota marks the brand, Ipê (yellow) marks attention, Alerta (red) marks danger, and six module hues identify the household modules. Light (Linho ground, Café ink) and dark (a deep warm brown ground, Linho-toned ink) are peers. Neither is a fallback: the OS setting picks one before first paint, a `data-theme` attribute holds it, and the switch opens the new theme as a circular View Transition from the button that was pressed. The voice is Geist Mono, set large and tight, with Jost for reading and Doto dot-matrix kept to the hero corner note.

Two earlier worlds are confirmed anti-references: the frosted-glass lens over three filled primitives, and the older pixel world before it. A black-and-white, hue-free palette is also retired. Glass survives in exactly one place, the sticky nav.

**Key Characteristics:**
- One hairline frame (1px side rails, max 1320px) with ruled cells and 13px crosshair ticks at every rule intersection; the ticked rules run on to the window edges.
- A shared column rule (`--split`) that runs through the projects and about cells, ticked where it meets the cell rules.
- Line-drawn primitives plotted by stroke-dashoffset on a normalised path length, each with a filled node dot.
- Warm linen and coffee neutrals, one green action color, in two peer themes.
- Inversion as the interaction grammar: rows, tabs, pills and tools flip to ink on the ground; the primary CTA is filled Folha.
- Geist Mono 500 with negative tracking as the display voice.

## Colors

A warm, earthy palette: linen ground, coffee ink, one green for action, and a small set of signal and module hues. Values below name roles; the frontmatter holds the normative hex for light (plain keys) and dark (`-dark` keys). Source: `packages/ui/src/styles/globals.css` (`:root`, `.dark`) and `apps/landing/src/landing.css`, which carry the same values under landing token names (`canvas`, `ink`, `action`, `line`).

### Primary
- **Folha** (`folha` #2f6b4f light, `folha-dark` #7cc29f dark): the action color (`--primary`, landing `--action`). Primary buttons and their disc, selection, focus ring, links of intent, sidebar primary, and positive money. Hover steps to `folha-hover` (#245640 light, #94d1b2 dark). Text on it is `on-folha` (#f7f2ea light, #10231a dark).

### Secondary
- **Terracota** (`terracota` #c2552f light, `terracota-dark` #e47c55 dark): `--brand`. The logo dot, the wordmark's soft "." and the landing's accents (hero bloom, ambient light). Never an action, never a state.
- **Ipê** (`ipe` #f2b33d light, `ipe-dark` #f6cf7a dark): `--attention`. Warnings and things that need a look. It pairs with `ipe-soft` (#fbebc6 light, #3a2e14 dark) as the fill and `ipe-foreground` (#6b4700 light, #f6cf7a dark) as the text on that fill. Yellow itself never carries text.
- **Alerta** (`alerta` #b42335 light, `alerta-dark` #f08a92 dark): `--destructive`. Delete, errors, and negative money.

### Tertiary: module hues
Six hues, one per household module (`--module-*`), each with a light and dark value in the frontmatter: **finance** (green, same as Folha), **pantry** (orange), **tasks** (blue), **pets** (amber), **home-care** (teal), **household** (plum). Charts take `--chart-1..5` from finance, pantry, tasks, pets, household in that order.

### Neutral
- **Linho** (`linho` / `linho-dark`): page ground, `--background`, sidebar. **Linho raised** (`linho-raised` / `linho-dark-raised`): cards, popovers, project panel (landing `surface`). **Linho lift** (`linho-lift` / `linho-dark-lift`): secondary, muted, accent grounds, hover steps (landing `bone`). These steps are the only tonal layers.
- **Café** (`cafe` / `cafe-dark`): text and ink, `--foreground`; primitive strokes, node dots, and the inverted state of rows, tabs and pills.
- **Café 2** (`cafe-2` / `cafe-dark-2`): `--ink-2`, secondary copy, landing `body`. **Café 3** (`cafe-3` / `cafe-dark-3`): `--muted-foreground`, mono labels, crosshair ticks, wordmark soft in the app.
- **Hairline / Hairline strong** (`hairline`, `hairline-strong` and dark pairs): Café (or dark ink) as translucent rules. Hairline is `--border` and landing `line` (alpha .14 light, .12 dark). Hairline strong is `--input` and landing `line-2` (alpha .52 light, .40 dark), used for control outlines and input borders.
- **Bloom** and **Bloom edge** (terracotta and green tints): the hero's radial light. **Nav glass**: the sticky nav fill under its backdrop blur.

### Contrast (WCAG AA, verified)
| Pair | Light | Dark |
|---|---|---|
| foreground on background | 14.15 | 14.77 |
| muted-foreground on background | 5.69 | 6.63 |
| primary on background | 5.65 | 8.52 |
| destructive on background | 5.83 | 7.41 |
| attention-foreground on attention-soft | 7.05 | 8.94 |
| brand on background | 4.07 (graphics and large text only) | 6.19 |
| input border on background | 3:1 at alpha .52 | about 3:1 or better at alpha .40 |

### Named Rules
**The Green Action Rule.** Folha is the action color. Every primary button, selection and focus ring is green; no other hue starts an action.

**The Brand Is Not Action Rule.** Terracota is the logo dot and landing accents only. It never fills a button, marks a state, or sits near an error. Terracota (#c2552f) and Alerta (#b42335) stay distinct in hue and role: red means danger, orange-clay means Kantim.

**The Money Sign Rule.** Positive money uses `primary`, negative money uses `destructive`. Neither is signalled by color alone; the sign or label is always present.

**The Module Hue Rule.** Charts and module identity use the `--module-*` hues (via `--chart-*`). Do not invent chart colors.

**The Yellow Carries No Text Rule.** Ipê as a fill or icon only. Text on an attention surface is `ipe-foreground` on `ipe-soft`.

**The Brand Contrast Rule.** Terracota on Linho is 4.07 in light: use it for graphics and large display only, never small text.

**The Peer Themes Rule.** Every token has a light and a dark value, and both are designed. A new surface is not done until it reads correctly in both.

## Typography

**Display Font:** Geist Mono Variable (with ui-monospace, SF Mono, Menlo)
**Body Font:** Jost Variable (with ui-sans-serif, system-ui)
**Dot-matrix Font:** Doto Variable (with Geist Mono Variable)

**Character:** An engineer's mono drawn large and tight, set against a geometric sans that stays quiet for reading. The dot-matrix face is a stamp, not a voice.

### Hierarchy
- **Display** (Geist Mono 500, clamp(2.2rem, 5.7vw, 5.1rem), 1.02, -0.045em): the hero headline, split into two lines with line one left and line two right across the frame. Each line rises from a clip on load. Below 720px both lines align left at clamp(1.9rem, 8.6vw, 2.8rem).
- **Headline** (Geist Mono 500, clamp(2.8rem, 8vw, 6rem), 0.95, -0.05em): section titles written as paths (`/projects`) and the contact heading. The about name uses the same voice at clamp(2.4rem, 4.3vw, 4rem).
- **Title** (Geist Mono 500, clamp(2rem, 3.8vw, 3.2rem), 1, -0.045em): the project name inside the panel.
- **Name** (Geist Mono 500, 1.08 to 1.1rem, -0.02em): project names on site sheets and tabs.
- **Body** (Jost 400, 1.0625rem, 1.6): running copy. Leads and sub copy step to 1.1 to 1.14rem in Café 2, capped at 42 to 62ch and wrapped with `pretty`.
- **Button** (Jost 500, 1rem): every pill and CTA label.
- **Label** (Geist Mono 400, 0.74 to 0.86rem): nav links, tags, status, path bar, fact terms, `kbd` keys, code. Tabular numerals on code and keys.
- **Dot note** (Doto 700, 1.02rem, 1.45, 0.14em, uppercase): the hero corner note only, three short stacked lines in Café 2 closed by a 16px rule. Decorative (`aria-hidden`) and hidden below 900px.

### Named Rules
**The Mono Voice Rule.** Anything that names something (a headline, a project, a section, a key) is Geist Mono 500 with negative tracking. Jost reads, and it never names.

**The One Stamp Rule.** Doto appears in exactly one place: the hero corner note. It is never used for headings, labels, or body copy.

## Layout

The sheet is a centred frame, `max` 1320px wide, with 1px `line` side rails. The nav repeats the rails in its inner bar so the frame runs unbroken under the glass, with crosshairs where its bottom rule meets them. Every section is a cell: padding `pad` (clamp(20px, 4.4vw, 64px)) and a 1px top rule, with a 13px crosshair centred on each end of the rule. The first cell carries its crosshairs on its bottom edge instead.

Sub-rules that run frame to frame use a negative `pad` margin to reach the rails and carry their own crosshairs. This applies to the projects body rule. A shared column rule at `split` (clamp(280px, 31%, 410px)) divides the projects cell (tabs | panel) and the about cell (identity | text), with a crosshair where it meets each top rule. Thin outline circles (`.arc`, 1px `line`) cross cell edges and are clipped by an inner layer, never by the cell itself, so its crosshairs stay visible.

Every rule that meets the frame at a crosshair (cell top rules, the projects body rule) runs on past the rails to the window edges, drawn with `border-image` outset by 100vw. The sheet reads as a cut-out of an endless drawing, not a box. Row dividers inside a cell stop at the rails.

The hero fills the viewport below the nav on a two-column grid. Its rows are the corner note (top right), a flexible gap, the split headline, then the sub copy and actions under line one. The orbit sits right of centre; the project sites land on free grid dots around it, most often in the open top-left. Rhythm comes from clamp() values, not a fixed scale: `gutter` (clamp(20px, 2.4vw, 32px)) for inner column padding, `panel-pad` for panel interiors, 12px between actions, 6px between tabs.

Breakpoints: 1100px narrows the orbit. 900px stacks the hero (orbit moves above the headline, the corner note hides), stacks projects (tabs become three equal columns showing glyph and name only, the column rule and big tabs drawing hide) and stacks about. 720px hides nav links, left-aligns both headline lines, and stacks facts and the about ledger. At 480px the hero actions go full width. At 420px the nav theme tool hides (the footer still has a theme pill).

### Named Rules
**The Ticked Intersection Rule.** Wherever a horizontal rule meets the frame or the column rule, a 13px Café 3 crosshair marks it. A new rule that spans the sheet gets its ticks.

**The One Column Rule.** Two-column cells divide at `split` so their dividers line up down the sheet. Don't invent a second column position.

### The frame in Kantim

The landing (`apps/landing`) draws the same sheet, built from three primitives in `landing.css` and `components/`:

```
            |  split                  |
   ---------+----------+--------------+---------   ← cell rule, runs to the window edges
            |  /path   |  Mono title  |
            |  lede    |              |
   ---------+----------+--------------+---------   ← head rule, ticked at rails + split
            |  section body           |
            ↑ rail                    ↑ rail  (max 1320px)
```

- **`.sheet`** wraps `main` and the footer: centred, `max` 1320px, 1px `line` side rails. The nav's inner bar repeats the rails and ticks their bottom corners.
- **`Section`** is a cell: `pad` padding, a `.cell` top rule drawn as a pseudo-element outset 100vw (html clips with `overflow-x: clip`), and a `Tick` on each rail.
- **`SectionHeading`** is the cell's head row: path name and lede left of the `split` column, the mono title right of it behind a 1px column rule, closed by a frame-to-frame bottom rule ticked at both rails and at the column. Below 768px the columns stack and the column rule and its ticks hide.
- **`Tick`** is the 13px Café 3 crosshair, positioned by its centre (`x`, `y` as CSS lengths).

- **Nav links** are mono `/path` labels made from the translated name, lowercased and hyphenated (`/the-house`, `/features` in en-US; `/a-casa`, `/recursos` in pt-BR).
- **Wordmark** (`components/wordmark.tsx`, Jost): "kantim" at 600 in full ink (Café `#2a211b` light, `#f1e9df` dark), closed by a period at 500 in Terracota on the landing (`#c2552f` light, `#e47c55` dark) and Café 3 in the app. Nav and footer pair it with the house glyph. The web app's `BrandName` (`components/layout/brand-name.tsx`) draws the same lockup from `app.name-styled` in `apps/web/src/locales/en-US.json`.
- **FAQ** is a ledger right of the `split` column rule, which runs on from the head row to the cell's bottom: a mono `01` index, the question, and a 34px hairline tool (`+`/`−`) that inverts on hover; the row lifts one ground step.

The hero is the one cell without a top rule; the nav's bottom rule closes it. The web app (Operate mode) does not draw the frame: it shares the tokens, type, hairlines and inversion grammar, and keeps its sidebar shell.

## Elevation & Depth

The sheet is flat. Depth comes from three things only: two tonal steps (raised panel, lifted hover), hairline outlines in two strengths, and the terracotta hero bloom behind the orbit. There are no drop shadows. The only `box-shadow` in the system is a 1px inset hairline that outlines the ghost CTA. The one translucent material is the sticky nav: nav-glass fill with `backdrop-filter: blur(18px) saturate(140%)`.

### Named Rules
**The One Pane Rule.** Glass exists only on the sticky nav. Panels, cards, tabs and overlays are opaque ground with a hairline edge.

**The Drawn Depth Rule.** If something needs to separate from the sheet, outline it or step its ground one tone. Never lift it with a shadow.

## Shapes

There are two families: hairline geometry drawn on the sheet, and fully rounded controls set on top of it.

- **Primitives.** Stroked line drawings in a 100-unit box with round caps and joins and non-scaling strokes (1 to 1.5px). Codeboros is a ring with a gap and a node at its open end. OpenMixing is two overlapping circles, the second dotted (`stroke-dasharray: 0 0.026` at 1.9x width). Kantim is a roof over a square. Every stroke carries `pathLength="1"` and plots in by animating `stroke-dashoffset` from 1 to 0 (1500ms, second stroke 380ms later). The node dot and dotted trace then arrive by scaling up from 0.4. They appear at glyph size (26px), as the tab drawing, in the panel, and inside the hero orbit.
- **Orbit.** A hairline ring (`line-2`) plotted over 2400ms, a dotted inner ring counter-spinning over 160s, four short axis ticks, and a 5px node dot. The node sweeps 76 to 126deg (14s, alternate) on desktop so it stays clear of the headline. Below 900px, where the orbit sits alone above the headline, it spins the full ring over 40s.
- **Circles.** Outline arcs crossing cell edges, the contact pair of rings with a masked dotted trace and node, and hollow 7px bullet rings on line lists.
- **Corners.** Controls are fully round (`ctl`, 999px): pills, CTA labels and discs, tags, tools, status, copy button. Containers step down in radius: panel 20px, tab 16px, facts grid and run block 14px, `kbd` keys and focus rings 6px.

## Components

### Buttons
Two shapes for action, one pressed together, and one outlined.
- **CTA (primary):** a pill label (46px tall, 0 24px, Jost 500 1rem) and a separate 46px round disc holding an arrow, set 4px apart and filled with Folha, text and arrow in on-folha. On hover both step to Folha hover and the disc rotates -45deg (450ms, ease-out), so the arrow points up and out.
- **CTA ghost:** the same pair, transparent, outlined by a 1px inset `line-2` hairline. On hover it inverts to Café on the ground.
- **Pill (secondary):** a 46px hairline pill (1px `line-2`, 0 22px). On hover it inverts to text colour on the ground. The small pill (34px, 0 14px, 0.9rem, Café 2) carries footer links and toggles.
- **Tool:** a 38px circular hairline button with a mono label or an 18px inline SVG icon (language, theme). It inverts on hover.
- **Focus:** a 2px text-colour outline at 3px offset, radius 6px, everywhere.

### Chips
- **Tag:** a mono 0.78 to 0.82rem hairline pill (`line-2`), used for project status on site sheets and the skills list. It is not interactive.
- **Status:** a mono hairline pill with a 6px ink dot whose ring pings outward every 2.6s, in the panel bar.

### Cards / Containers
- **Project panel:** 20px radius, raised ground, 1px `line-2` edge, no shadow. A path bar (mono repo path in Café 3, status pill) sits over the body. The body holds the large primitive top right, the mono title, a line list with hairline dividers and hollow ring bullets, a three-column facts grid (14px, hairline cells, mono `dt`), a run block, and actions.
- **Run block:** 14px radius, ground fill, hairline edge. A mono figcaption has a hairline copy pill, then a `pre` where each line is prefixed by a non-selectable Café 3 `$ `.

### Navigation
A sticky 64px glass bar with a hairline bottom rule and the frame rails. On the left are the CL monogram (24px, its C and L slide in on load, and the L lifts once per hover) and the wordmark ("Coura" soft at 500, "Labs" full ink at 600, Jost). In the centre are mono path links (`/projects`) in Café 2, which take a lifted pill ground on hover. On the right are the language and theme tools. Links hide at 720px.

### Project Sites (signature)
The hero has no project list. Each project is a site on the plotter grid: on every page load it lands on a random free grid dot (seeded once per visit, confined to the open sheet above the headline: left of the corner note and clear of the orbit on the wide layout, and around the orbit's drawing when stacked; spread at least 260px apart where the sheet allows). Its entrance is a dot that swells and gives way to the project's 46px primitive plotting itself in, one site every 520ms after the hero intro. The site is a 72px round link in Café 2; the plotted or hovered site comes up to full ink. On hover or focus, a small sheet opens beside it (flipped left past 58% of the width): 14px radius, raised ground, `line-2` edge, mono name, Jost kind, and a hairline-ruled footer with the status tag and "Open in /projects". It fades in from a 4px blur. Clicking selects that project's tab and scrolls to /projects. Hovering or focusing a site plots its primitive into the orbit. On touch, each site shows its mono name under the glyph instead of the sheet.

### Plotter Field (hero)
A 2D canvas behind the hero holds a 24px graph-paper dot grid (Café 3 at about 50%), fading out toward the ledger. A plotter head (an 11px ring, a 2.2px node, and short cross ticks) follows a fine pointer on a spring just short of critical damping. Its hairlines (`line-2`) run frame to frame with Café 3 ticks where they hit the rails, dots within 170px come up to full ink, and a Geist Mono 11px readout shows `X 0000  Y 0000`. Within 72px of a project site the head locks onto it, its ring opening from 11px to 34px around the glyph, and the readout gives way to the site's sheet. Left idle for 2.6s, the head travels to the site of whichever project the orbit is plotting, labelled `plot <project>`. Under reduced motion the head snaps to the pointer (and to sites) with no spring and never travels on its own. Coarse pointers get the grid alone. The canvas pauses off-screen and re-reads ink on theme change.

### Project Tabs (signature)
A vertical tablist of equal-height rows (`grid-auto-rows: 1fr`, 6px gap). Each tab is 16px radius with a hairline edge and holds a `kbd` key (1 to 3, 6px radius hairline), a mono name over a Jost kind, and the 26px glyph. Hover steps the ground to raised. The selected tab inverts to text colour on the ground. Keys 1 to 3 select from anywhere on the page, and arrows, Home and End move within the list. Selection redraws the primitive in the panel and below the tabs. The column scrolls with the page; it does not stick. Below 900px the tabs become three columns showing only glyph and name.

## Do's and Don'ts

### Do:
- **Do** use Folha for every primary action, selection and focus ring, and `on-folha` for text on it.
- **Do** show positive money in `primary` and negative money in `destructive`, with sign or label as well.
- **Do** color charts and module identity from `--module-*` / `--chart-*`.
- **Do** put attention text in `ipe-foreground` on `ipe-soft`.
- **Do** keep terracotta to the logo dot, the wordmark period and landing accents, and large graphics only.
- **Do** put every new section in a cell on the frame: a 1px `line` top rule, `pad` padding, and crosshair ticks where the rule meets the rails or the `split` column.
- **Do** draw any new project mark as a stroked primitive in a 100-unit box with `pathLength="1"`, a plot-in by stroke-dashoffset, and one filled node dot.
- **Do** express hover and selection by inversion (Café on the ground) or by a one-step ground lift, with 200 to 300ms ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`).
- **Do** pair every primary action as a pill label plus a round arrow disc that rotates -45deg on hover. Use the hairline pill for the secondary.
- **Do** set names, titles and labels in Geist Mono 500 with negative tracking, and running copy in Jost.
- **Do** give every new colour a light and a dark value, and check contrast in both themes against the figures above.
- **Do** honour reduced motion: strokes render fully drawn, and orbit, dots and bloom stop.

### Don't:
- **Don't** use terracotta for buttons, links, focus, errors or any state, and don't place it beside Alerta as if they were related.
- **Don't** put text in yellow or use `ipe` as a text color; don't use `brand` for small text in light.
- **Don't** use pure black or white, or cool grays; neutrals stay in the warm Linho and Café family.
- **Don't** use frosted glass anywhere but the sticky nav. The glass-lens and pane world is retired.
- **Don't** fill a primitive or render it as a solid shape. Fills are reserved for node dots, status dots, Folha actions and inverted states.
- **Don't** return to the pixel world. Doto's dot matrix is limited to the hero corner note.
- **Don't** add gradients beyond the soft bloom, or per-project accent colours beyond the six module hues.
- **Don't** add drop shadows or offset shadows. Separate surfaces with hairlines and tonal steps.
- **Don't** set small uppercase tracked labels above headings as eyebrows or kickers. Section titles carry their own `/path` name.
- **Don't** use a system or Jost face for display text, or icon glyphs from fonts. Icons are inline SVG strokes.
