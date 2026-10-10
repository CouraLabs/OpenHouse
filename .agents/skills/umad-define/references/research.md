# Research

Frame research worth running and turn whatever comes back into a decision-grade artifact this project can consume
without reprocessing. Every engagement serves a **decision** — enter a market, pick a stack, scope a product, commit
to a domain. Never research for its own sake; ask what decision this feeds.

## Three services

### Draft — write a research prompt for the user's own tool

Produce a prompt the user runs in ChatGPT, Gemini, Grok, Perplexity, or similar. The prompt must contain:

- The decision the research serves, and the options on the table.
- The specific questions to answer, in priority order.
- What evidence counts (and what does not): recency, primary sources, numbers over adjectives.
- The output shape wanted: a table or short sections, with citations, and an explicit "unknown" bucket.
- Instructions to say "not found" rather than guess.

### Process — turn a finished report into a cited summary

Given a report the user ran elsewhere, produce `docs/research/research-<slug>.md`:

- **Decision** — what this research was for.
- **Findings** — each claim with its source, ranked by how much it moves the decision.
- **Conflicts** — where sources disagree, and which is better evidenced.
- **Unknowns** — what the report did not answer.
- **Recommendation** — what the evidence supports, and the confidence.

Strip narrative padding. Keep numbers and citations.

### Run — research here

Fan out parallel web searches, one per question. Verify each load-bearing claim against a primary source before
reporting it. Cite every claim. If sources are thin, say so rather than filling the gap.

## Research types

Market · domain · technical · competitive · user-voice · literature · choosing-between-candidates. Ask which applies,
or infer it from the decision.

## Rules

- Web-search; do not guess anything past your knowledge cutoff or unfamiliar to you.
- A claim you cannot cite is not a finding — put it in Unknowns.
- Report what the evidence says, including when it says "this is a bad idea".
- Write the artifact only after showing it to the user.
