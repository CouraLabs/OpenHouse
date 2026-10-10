# EXPERIENCE.md — how it works

`EXPERIENCE.md` is the behavioral contract: information architecture, interaction, states, accessibility, and
journeys. It references `DESIGN.md` tokens by name (`{path.to.token}`) rather than restating visual values.

## Sections

### Always

1. **Foundation** — form factor; the UI system when one is present (`DESIGN.md` is the visual-identity reference).
2. **Information Architecture** — screens, hierarchy, navigation model, and how the user moves between them.
3. **Voice and Tone** — microcopy rules: labels, errors, empty states, confirmations. (Brand voice lives in
   `DESIGN.md` → Brand & Style.)
4. **Component Patterns** — behavioral. What each component does, when it appears, and what it triggers. (Visual
   specs live in `DESIGN.md` → Components.)
5. **State Patterns** — loading, empty, error, partial, offline, permission-denied, and success states for every
   surface that can be in one.
6. **Interaction Primitives** — gestures, keyboard model, focus order, motion rules, feedback timing.
7. **Accessibility Floor** — behavioral: focus management, keyboard paths, screen-reader labels, reduced-motion.
   (Visual contrast lives in `DESIGN.md`.)
8. **Key Flows** — named-protagonist journeys with entry state, path, climax, resolution, and one real failure mode.

### When triggered

- **Inspiration & Anti-patterns** — when the user names references or things to avoid.
- **Responsive & Platform** — when more than one form factor or platform is in scope.

Invent sections for product-specific concerns the concern scan surfaced (i18n, offline, notifications, content
density, input modalities).

## Rules

- One behavior, one home. Do not restate `DESIGN.md` values — reference the token.
- Every surface in the IA gets its states named in State Patterns.
- Key Flows use a named protagonist, not "the user".
- An unresolved behavioral decision is written as an Open Question, never as a silent default.
