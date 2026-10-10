# DESIGN.md — how it looks

`DESIGN.md` is the visual-identity contract, following the [Google Labs `design.md` spec](https://github.com/google-labs-code/design.md).

## Shape

YAML frontmatter carries the **tokens**; the markdown body carries the **rationale and rules**.

### Frontmatter tokens

```yaml
---
status: draft            # draft | final
colors: {}               # named palette entries
typography: {}           # families, sizes, weights, line-heights
rounded: {}              # corner radii scale
spacing: {}              # spacing scale
components: {}           # per-component token overrides
---
```

### Body sections — order is locked when present

1. **Brand & Style** — the personality and voice that drive every visual choice.
2. **Colors**
3. **Typography**
4. **Layout & Spacing**
5. **Elevation & Depth**
6. **Shapes**
7. **Components**
8. **Do's and Don'ts**

Sections may be omitted, but never reordered. Every token is referenced by name elsewhere as
`{colors.primary}`, `{spacing.md}`, `{typography.body.family}`.

## Rules

- A token name is a contract. Renaming one is a breaking change — call it out.
- When a UI system is in use, tokens **extend or reference** the system's defaults; do not silently redefine them.
- Do not put behavioral specs here. Interaction, states, and accessibility behavior belong in `EXPERIENCE.md`.
- Contrast requirements belong here as token-level constraints (e.g. which pairs are legal on which surfaces).
