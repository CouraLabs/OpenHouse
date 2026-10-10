---
title: {Product Name}
created: {YYYY-MM-DD}
updated: {YYYY-MM-DD}
---

# PRD: {Product Name}

*Working title — confirm.*

## 0. Document Purpose

[One paragraph: who this PRD is for, how it is structured, and which existing artifacts it builds on rather than
duplicates.]

## 1. Vision

[2–3 paragraphs: what this is, what it does for the user, why it matters. Compelling enough to stand alone.]

## 2. Target User

### 2.1 Jobs To Be Done

[Bulleted. Emotional, social, functional, contextual — whichever apply.]

### 2.2 Non-Users (v1)

[Who this is explicitly not for in v1. Add when the audience boundary is non-obvious.]

### 2.3 Key User Journeys

*Named-persona narratives, numbered globally as `UJ-1`…`UJ-N`. FRs reference journeys by ID inline.*

- **UJ-1. {One-line title — persona doing the thing.}**
  - **Persona + context:** one line, grounded enough to explain the *why*.
  - **Entry state:** authenticated? which surface? coming from where?
  - **Path:** 3–5 concrete beats — taps, screens, decisions.
  - **Climax:** the moment value is delivered, and how the user knows.
  - **Resolution:** the state they are left in, and what is next.
  - **Edge case** *(optional)*: one real failure mode and what the user does next.

*Lighter scope: a single sentence (`{Persona}, {context}, {what they do and why}.`) is fine for a hobby/solo project
or when the journey is essentially a JTBD restated.*

## 3. Glossary

*Downstream workflows must use these terms exactly. FRs, UJs, and SMs use Glossary terms verbatim; introducing a
synonym anywhere in the PRD is a discipline violation. If §4 introduces a new domain noun, add it here in the same
pass.*

- **Term** — Definition. Relationships to other terms. Cardinality where relevant.

## 4. Features

*Each subsection is a coherent feature: behavioral description first, FRs nested under it. FRs are numbered globally
(`FR-1`…`FR-N`) so downstream artifacts have stable references even if features are reorganized.*

### 4.1 {Feature Name}

**Description:** [Behavioral narrative — how this works, who uses it, the experience, edge cases. Realizes UJ-X.
Embed inline `[ASSUMPTION: …]` tags where you inferred without confirmation.]

**Functional Requirements:**

#### FR-1: {Short capability name}

[Actor] can [capability] [under conditions]. Realizes UJ-X.

**Consequences (testable):**

- {Specific testable condition.}

**Out of Scope:** *(optional)*

- {What this FR explicitly does not cover.}

## 5. Non-Functional Requirements

<!-- Optional. Security, performance, accessibility, observability. Omit if empty. -->

## 6. Assumptions Index

<!-- Every inline [ASSUMPTION: …] tag, collected here for review. -->

## 7. Open Questions

<!-- Gaps that need a human decision. Omit if empty. -->
