---
name: umad-ux
description: 'Capture the user''s UX vision in two documents: DESIGN.md for how the product looks and EXPERIENCE.md for how it behaves. Use when the user says "lets create UX design", "create UX specifications", "help me plan the UX", or asks for design tokens, wireframes, information architecture, interaction states, or an accessibility floor.'
---

# umad-ux

Capture the user's UX vision. **Elicit; never impose.** Probe like a senior practitioner. Do not volunteer colors,
patterns, or directions unless a theme is already in place and the user confirms it. The picks are the user's.

## Two peer contracts

| Document | Owns | Path |
|---|---|---|
| `DESIGN.md` | *How it looks* — visual identity, tokens | `docs/design/DESIGN.md` |
| `EXPERIENCE.md` | *How it works* — IA, behavior, states, accessibility, journeys | `docs/design/EXPERIENCE.md` |

`EXPERIENCE.md` cross-references `DESIGN.md` tokens **by name** using `{path.to.token}` syntax. Both documents win on
conflict with any mock, wireframe, or import.

## Routes

| Route | Produces |
|---|---|
| `design` | `DESIGN.md` only |
| `experience` | `EXPERIENCE.md` only |
| `both` (default) | Both, in that order |

## Steps

1. **Scan sources.** Look for `brief`, `prd`, `spec`, `architecture`, `research` artifacts in `docs/`. Surface the
   paths and let the user confirm which apply. Do not read their full content into the conversation — extract only
   what the UX needs.
2. **Intake.** Let the user brain-dump first, even if they open with paragraphs. Ask one "anything else?" probe. Ask
   for stakes (hobby / internal / consumer / regulated) — it sets the rigor.
3. **Pick a working mode** and say which:
   - **Fast path** — batch the gaps into one numbered set, draft both documents with `[ASSUMPTION]` tags.
   - **Coaching path** — walk the decisions one at a time.
   - **Design handoff** — assemble the captured intent into a prompt the user runs in an external design tool, then
     save the outputs into `docs/design/imports/`.
4. **Concern scan.** Name what this UX carries: accessibility, platforms, brand, regulated language, motion, i18n,
   dark mode, offline, content density, input modalities, notifications. This drives which sections you invent.
5. **Foundation first.** Ask which UI system the product uses (shadcn, MUI, native UIKit, Compose, internal design
   system) or none. When one is named, both documents inherit from it: `DESIGN.md` tokens reference or extend the
   system's defaults; `EXPERIENCE.md` specifies only the behavioral delta.
6. **Write the document(s).** Follow the section order in `references/design-md.md` and
   `references/experience-md.md`. Use the templates as the starting shape.
7. **Journeys.** Get the user to narrate a real session with a named protagonist: entry state, path, climax (the
   moment value lands and how they know), resolution, and one real failure mode.
8. **Show before writing.** Present each document, get approval, then write it. Mark unresolved calls as
   `[ASSUMPTION]`, and list them under Open Questions.

## Rules

- Never invent brand direction, colors, or a visual style the user has not chosen.
- Behavior and appearance stay in their own document — do not put visual specs in `EXPERIENCE.md`.
- No duplicate of upstream product content: reference the spec/PRD, do not restate it.
- Accessibility is a floor, not a feature: state contrast, focus, keyboard, and screen-reader expectations explicitly.
