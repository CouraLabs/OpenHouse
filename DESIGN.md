---
name: OpenHouse
description: A drafting sheet for software, with hairline grid, plotted line primitives, and black and white ink in two peer themes.
colors:
  sheet-black: "#0a0a0a"
  sheet-black-raised: "#111111"
  sheet-black-lift: "#181818"
  white-ink: "#f2f2f0"
  white-ink-2: "#b0b0ad"
  white-ink-3: "#8a8a87"
  white-hairline: "rgb(242 242 240 / 0.12)"
  white-hairline-strong: "rgb(242 242 240 / 0.22)"
  white-bloom: "rgb(200 205 198 / 0.13)"
  white-bloom-edge: "rgb(255 255 255 / 0.05)"
  black-nav-glass: "rgb(10 10 10 / 0.62)"
  white-button-hover: "#ffffff"
  wordmark-soft-dark: "#a0a09d"
  paper-white: "#f2f2f0"
  paper-raised: "#e9e9e6"
  paper-lift: "#e0e0dc"
  graphite-ink: "#0c0c0c"
  graphite-ink-2: "#464644"
  graphite-ink-3: "#62625f"
  graphite-hairline: "rgb(12 12 12 / 0.13)"
  graphite-hairline-strong: "rgb(12 12 12 / 0.24)"
  graphite-bloom: "rgb(24 26 24 / 0.2)"
  graphite-bloom-edge: "rgb(0 0 0 / 0.075)"
  paper-nav-glass: "rgb(242 242 240 / 0.7)"
  graphite-button-hover: "#2a2a2a"
  wordmark-soft-light: "#666663"
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
    backgroundColor: "{colors.white-ink}"
    textColor: "{colors.sheet-black}"
    typography: "{typography.button}"
    rounded: "{rounded.ctl}"
    padding: "0 24px"
    height: "46px"
  button-primary-hover:
    backgroundColor: "{colors.white-button-hover}"
  button-primary-disc:
    backgroundColor: "{colors.white-ink}"
    textColor: "{colors.sheet-black}"
    rounded: "{rounded.ctl}"
    size: "46px"
  button-pill:
    backgroundColor: "transparent"
    textColor: "{colors.white-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.ctl}"
    padding: "0 22px"
    height: "46px"
  button-pill-hover:
    backgroundColor: "{colors.white-ink}"
    textColor: "{colors.sheet-black}"
  button-pill-sm:
    textColor: "{colors.white-ink-2}"
    rounded: "{rounded.ctl}"
    padding: "0 14px"
    height: "34px"
  tag:
    backgroundColor: "transparent"
    textColor: "{colors.white-ink-2}"
    typography: "{typography.label}"
    rounded: "{rounded.ctl}"
    padding: "3px 12px"
  tool:
    backgroundColor: "transparent"
    textColor: "{colors.white-ink}"
    rounded: "{rounded.ctl}"
    size: "38px"
  nav-link:
    textColor: "{colors.white-ink-2}"
    rounded: "{rounded.ctl}"
    padding: "7px 12px"
  nav-link-hover:
    backgroundColor: "{colors.sheet-black-lift}"
    textColor: "{colors.white-ink}"
  ledger-row:
    backgroundColor: "{colors.sheet-black}"
    textColor: "{colors.white-ink}"
    padding: "12px clamp(20px, 4.4vw, 64px)"
    height: "64px"
  ledger-row-hover:
    backgroundColor: "{colors.white-ink}"
    textColor: "{colors.sheet-black}"
  tab:
    backgroundColor: "{colors.sheet-black}"
    textColor: "{colors.white-ink}"
    rounded: "{rounded.tab}"
    padding: "16px 18px"
  tab-selected:
    backgroundColor: "{colors.white-ink}"
    textColor: "{colors.sheet-black}"
  panel:
    backgroundColor: "{colors.sheet-black-raised}"
    textColor: "{colors.white-ink}"
    rounded: "{rounded.panel}"
    padding: "clamp(24px, 3.6vw, 44px)"
  run-block:
    backgroundColor: "{colors.sheet-black}"
    rounded: "{rounded.inset}"
    padding: "14px 16px"
---

# Design System: CouraLabs

## Overview

**Creative North Star: "The Drafting Sheet"**

The page is one visible sheet of technical drawing paper. A hairline frame runs its full height, every section is a cell ruled off that frame, and crosshair ticks mark each place where two rules meet. On that sheet each project is a line drawing, plotted stroke by stroke rather than rendered: a broken ring, two overlapping circles (the second dotted), a roof over a square. One bright node dot travels a hairline orbit in the hero, and a faint gray bloom of light sits behind it. Nothing is filled except node dots and the inverted states.

The ink is strictly black, white and near-neutral gray. Dark (black sheet, white ink) and light (paper-white sheet, graphite ink) are peers. Neither is a fallback: the OS setting picks one before first paint, a `data-theme` attribute holds it, and the switch opens the new theme as a circular View Transition from the button that was pressed. The voice is Geist Mono, set large and tight, with Jost for reading and Doto dot-matrix kept to the hero corner note. Density is calm. Large mono headlines and wide cells sit against compact, tabular rows.

Two earlier worlds are confirmed anti-references: the frosted-glass lens over three filled primitives, and the older pixel world before it. Glass survives in exactly one place, the sticky nav.

**Key Characteristics:**
- One hairline frame (1px side rails, max 1320px) with ruled cells and 13px crosshair ticks at every rule intersection; the ticked rules run on to the window edges.
- A shared column rule (`--split`) that runs through the projects and about cells, ticked where it meets the cell rules.
- Line-drawn primitives plotted by stroke-dashoffset on a normalised path length, each with a filled node dot.
- Black, white and neutral gray only, in two peer themes.
- Inversion as the interaction grammar: rows, tabs, pills and tools flip to text colour on the ground.
- Geist Mono 500 with negative tracking as the display voice.

## Colors

A monochrome ink-on-sheet palette. The only "colour" is the gap between ground and ink, plus hairlines drawn as translucent ink.

### Primary
- **White Ink / Graphite Ink** (`white-ink` dark, `graphite-ink` light): text, primitive strokes, node dots, the primary button fill, and the inverted state of every row, tab and pill. Ink is the accent, so there is no other.

### Neutral
- **Sheet Black / Paper White** (`sheet-black`, `paper-white`): the page ground, and the ground under the hero's dot grid.
- **Raised / Lift grounds** (`sheet-black-raised`, `sheet-black-lift`; `paper-raised`, `paper-lift`): the project panel surface (raised), tab hover (raised) and nav-link hover (lift). These two steps are the only tonal layers.
- **Ink 2** (`white-ink-2`, `graphite-ink-2`): secondary copy, sub lines, kinds, tag text, the Doto corner note.
- **Ink 3** (`white-ink-3`, `graphite-ink-3`): crosshair ticks, mono labels (`dt`, path bar, figcaption), the `$` prompt, orbit ticks and dotted rings.
- **Hairline / Hairline Strong** (`white-hairline`, `white-hairline-strong`; graphite equivalents): `line` for frame rails, cell rules, row dividers and arcs; `line-2` for control outlines (pills, tags, tools, keys, panel edge) and the orbit ring.
- **Bloom** (`white-bloom` to `white-bloom-edge`; graphite equivalents): the hero's radial light, blurred 12px and drifting over 26s.
- **Nav Glass** (`black-nav-glass`, `paper-nav-glass`): the sticky nav fill under its backdrop blur.
- **Wordmark Soft** (`wordmark-soft-dark`, `wordmark-soft-light`): "Coura" in the wordmark, set back from full-ink "Labs".

### Named Rules
**The Ink-Only Rule.** No hue enters the system. Every value is black, white, or a gray within a few points of neutral. Project identity comes from the primitive's drawing, never from a colour.

**The Peer Themes Rule.** Every token has a dark and a light value, and both are designed. A new surface is not done until it reads correctly in both.

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
- **Body** (Jost 400, 1.0625rem, 1.6): running copy. Leads and sub copy step to 1.1 to 1.14rem in Ink 2, capped at 42 to 62ch and wrapped with `pretty`.
- **Button** (Jost 500, 1rem): every pill and CTA label.
- **Label** (Geist Mono 400, 0.74 to 0.86rem): nav links, tags, status, path bar, fact terms, `kbd` keys, code. Tabular numerals on code and keys.
- **Dot note** (Doto 700, 1.02rem, 1.45, 0.14em, uppercase): the hero corner note only, three short stacked lines in Ink 2 closed by a 16px rule. Decorative (`aria-hidden`) and hidden below 900px.

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
**The Ticked Intersection Rule.** Wherever a horizontal rule meets the frame or the column rule, a 13px Ink 3 crosshair marks it. A new rule that spans the sheet gets its ticks.

**The One Column Rule.** Two-column cells divide at `split` so their dividers line up down the sheet. Don't invent a second column position.

### The frame in OpenHouse

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
- **`Tick`** is the 13px Ink 3 crosshair, positioned by its centre (`x`, `y` as CSS lengths).

- **Nav links** are mono `/path` labels made from the translated name, lowercased and hyphenated (`/the-house`, `/features` in en-US; `/a-casa`, `/recursos` in pt-BR).
- **Wordmark** (`components/wordmark.tsx`, Jost): "Open" at 500 in Wordmark Soft (`#a0a09d` dark, `#666663` light), "House" at 600 in full ink (`#f2f2f0` dark, `#0c0c0c` light). Nav and footer pair it with the house glyph. The web app draws the same wordmark through `BrandName` (`components/layout/brand-name.tsx`) on the `--wordmark-soft` token in `packages/ui` globals.
- **FAQ** is a ledger right of the `split` column rule, which runs on from the head row to the cell's bottom: a mono `01` index, the question, and a 34px hairline tool (`+`/`−`) that inverts on hover; the row lifts one ground step.

The hero is the one cell without a top rule; the nav's bottom rule closes it. The web app (Operate mode) does not draw the frame: it shares the tokens, type, hairlines and inversion grammar, and keeps its sidebar shell.

## Elevation & Depth

The sheet is flat. Depth comes from three things only: two tonal steps (raised panel, lifted hover), hairline outlines in two strengths, and the hero bloom behind the orbit. There are no drop shadows. The only `box-shadow` in the system is a 1px inset hairline that outlines the ghost CTA. The one translucent material is the sticky nav: nav-glass fill with `backdrop-filter: blur(18px) saturate(140%)`.

### Named Rules
**The One Pane Rule.** Glass exists only on the sticky nav. Panels, cards, tabs and overlays are opaque ground with a hairline edge.

**The Drawn Depth Rule.** If something needs to separate from the sheet, outline it or step its ground one tone. Never lift it with a shadow.

## Shapes

There are two families: hairline geometry drawn on the sheet, and fully rounded controls set on top of it.

- **Primitives.** Stroked line drawings in a 100-unit box with round caps and joins and non-scaling strokes (1 to 1.5px). Codeboros is a ring with a gap and a node at its open end. OpenMixing is two overlapping circles, the second dotted (`stroke-dasharray: 0 0.026` at 1.9x width). OpenHouse is a roof over a square. Every stroke carries `pathLength="1"` and plots in by animating `stroke-dashoffset` from 1 to 0 (1500ms, second stroke 380ms later). The node dot and dotted trace then arrive by scaling up from 0.4. They appear at glyph size (26px), as the tab drawing, in the panel, and inside the hero orbit.
- **Orbit.** A hairline ring (`line-2`) plotted over 2400ms, a dotted inner ring counter-spinning over 160s, four short axis ticks, and a 5px node dot. The node sweeps 76 to 126deg (14s, alternate) on desktop so it stays clear of the headline. Below 900px, where the orbit sits alone above the headline, it spins the full ring over 40s.
- **Circles.** Outline arcs crossing cell edges, the contact pair of rings with a masked dotted trace and node, and hollow 7px bullet rings on line lists.
- **Corners.** Controls are fully round (`ctl`, 999px): pills, CTA labels and discs, tags, tools, status, copy button. Containers step down in radius: panel 20px, tab 16px, facts grid and run block 14px, `kbd` keys and focus rings 6px.

## Components

### Buttons
Two shapes for action, one pressed together, and one outlined.
- **CTA (primary):** a pill label (46px tall, 0 24px, Jost 500 1rem) and a separate 46px round disc holding an arrow, set 4px apart and filled with ink on the ground. On hover both brighten to the button-hover value and the disc rotates -45deg (450ms, ease-out), so the arrow points up and out.
- **CTA ghost:** the same pair, transparent, outlined by a 1px inset `line-2` hairline. On hover it inverts to ink on ground.
- **Pill (secondary):** a 46px hairline pill (1px `line-2`, 0 22px). On hover it inverts to text colour on the ground. The small pill (34px, 0 14px, 0.9rem, Ink 2) carries footer links and toggles.
- **Tool:** a 38px circular hairline button with a mono label or an 18px inline SVG icon (language, theme). It inverts on hover.
- **Focus:** a 2px text-colour outline at 3px offset, radius 6px, everywhere.

### Chips
- **Tag:** a mono 0.78 to 0.82rem hairline pill (`line-2`), used for project status on site sheets and the skills list. It is not interactive.
- **Status:** a mono hairline pill with a 6px ink dot whose ring pings outward every 2.6s, in the panel bar.

### Cards / Containers
- **Project panel:** 20px radius, raised ground, 1px `line-2` edge, no shadow. A path bar (mono repo path in Ink 3, status pill) sits over the body. The body holds the large primitive top right, the mono title, a line list with hairline dividers and hollow ring bullets, a three-column facts grid (14px, hairline cells, mono `dt`), a run block, and actions.
- **Run block:** 14px radius, ground fill, hairline edge. A mono figcaption has a hairline copy pill, then a `pre` where each line is prefixed by a non-selectable Ink 3 `$ `.

### Navigation
A sticky 64px glass bar with a hairline bottom rule and the frame rails. On the left are the CL monogram (24px, its C and L slide in on load, and the L lifts once per hover) and the wordmark ("Coura" soft at 500, "Labs" full ink at 600, Jost). In the centre are mono path links (`/projects`) in Ink 2, which take a lifted pill ground on hover. On the right are the language and theme tools. Links hide at 720px.

### Project Sites (signature)
The hero has no project list. Each project is a site on the plotter grid: on every page load it lands on a random free grid dot (seeded once per visit, confined to the open sheet above the headline: left of the corner note and clear of the orbit on the wide layout, and around the orbit's drawing when stacked; spread at least 260px apart where the sheet allows). Its entrance is a dot that swells and gives way to the project's 46px primitive plotting itself in, one site every 520ms after the hero intro. The site is a 72px round link in Ink 2; the plotted or hovered site comes up to full ink. On hover or focus, a small sheet opens beside it (flipped left past 58% of the width): 14px radius, raised ground, `line-2` edge, mono name, Jost kind, and a hairline-ruled footer with the status tag and "Open in /projects". It fades in from a 4px blur. Clicking selects that project's tab and scrolls to /projects. Hovering or focusing a site plots its primitive into the orbit. On touch, each site shows its mono name under the glyph instead of the sheet.

### Plotter Field (hero)
A 2D canvas behind the hero holds a 24px graph-paper dot grid (Ink 3 at 55%), fading out toward the ledger. A plotter head (an 11px ring, a 2.2px node, and short cross ticks) follows a fine pointer on a spring just short of critical damping. Its hairlines (`line-2`) run frame to frame with Ink 3 ticks where they hit the rails, dots within 170px come up to full ink, and a Geist Mono 11px readout shows `X 0000  Y 0000`. Within 72px of a project site the head locks onto it, its ring opening from 11px to 34px around the glyph, and the readout gives way to the site's sheet. Left idle for 2.6s, the head travels to the site of whichever project the orbit is plotting, labelled `plot <project>`. Under reduced motion the head snaps to the pointer (and to sites) with no spring and never travels on its own. Coarse pointers get the grid alone. The canvas pauses off-screen and re-reads ink on theme change.

### Project Tabs (signature)
A vertical tablist of equal-height rows (`grid-auto-rows: 1fr`, 6px gap). Each tab is 16px radius with a hairline edge and holds a `kbd` key (1 to 3, 6px radius hairline), a mono name over a Jost kind, and the 26px glyph. Hover steps the ground to raised. The selected tab inverts to text colour on the ground. Keys 1 to 3 select from anywhere on the page, and arrows, Home and End move within the list. Selection redraws the primitive in the panel and below the tabs. The column scrolls with the page; it does not stick. Below 900px the tabs become three columns showing only glyph and name.

## Do's and Don'ts

### Do:
- **Do** put every new section in a cell on the frame: a 1px `line` top rule, `pad` padding, and crosshair ticks where the rule meets the rails or the `split` column.
- **Do** draw any new project mark as a stroked primitive in a 100-unit box with `pathLength="1"`, a plot-in by stroke-dashoffset, and one filled node dot.
- **Do** express hover and selection by inversion (text colour on the ground) or by a one-step ground lift, with 200 to 300ms ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`).
- **Do** pair every primary action as a pill label plus a round arrow disc that rotates -45deg on hover. Use the hairline pill for the secondary.
- **Do** set names, titles and labels in Geist Mono 500 with negative tracking, and running copy in Jost.
- **Do** give every new colour a dark and a light value, and check both themes.
- **Do** honour reduced motion: strokes render fully drawn, and orbit, dots and bloom stop.

### Don't:
- **Don't** use frosted glass anywhere but the sticky nav. The glass-lens and pane world is retired.
- **Don't** fill a primitive or render it as a solid shape. Fills are reserved for node dots, status dots and inverted states.
- **Don't** return to the pixel world. Doto's dot matrix is limited to the hero corner note.
- **Don't** introduce hue, gradients beyond the gray bloom, or per-project accent colours.
- **Don't** add drop shadows or offset shadows. Separate surfaces with hairlines and tonal steps.
- **Don't** set small uppercase tracked labels above headings as eyebrows or kickers. Section titles carry their own `/path` name.
- **Don't** use a system or Jost face for display text, or icon glyphs from fonts. Icons are inline SVG strokes.
