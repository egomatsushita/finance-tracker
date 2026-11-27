# Feature Workflow

The staged flow for building a feature, from idea to merged PR. Each stage has a
gate — don't start the next until the current one is approved. Skills named below
come from the `mattpocock-skills` plugin unless marked *(project skill)*.

```
grill-with-docs → spec → plan → implement → code-review → PR → retro
```

## Stages

1. **grill-with-docs** — `/grill-with-docs <idea>`. Relentless Q&A to pin down the
   feature, plus domain modeling (GLOSSARY/ADR only when a term or decision earns it).
   Highest-leverage stage: it catches wrong assumptions and prior art before any code.
   **Gate:** shared understanding confirmed.

2. **spec** — `/spec <title> ticket: <id>` *(project skill)*. Writes
   `docs/features/<slug>/spec.md` (summary, requirements, edge cases, acceptance
   criteria) and creates the feature branch. **Gate:** spec reviewed.

3. **plan** — write `docs/features/<slug>/plan.md`: a second design pass that turns the spec into
   concrete file changes, a commit breakdown, and a verification plan. Treat it as
   design, not transcription — this is where a better approach than the spec's
   assumption often surfaces. **Gate:** plan approved before implementing.

4. **implement** — build it, one concern per commit, TDD (pytest / Vitest + RTL).
   Verify behavior end-to-end, not just that tests pass.

5. **code-review** — `/code-review` (and `/branch-review` for cross-file concerns)
   before opening the PR.

6. **PR** — `/pull-request` *(project skill)*; iterate on review.

7. **retro** — `/retro` while the session is still warm (don't compact first — it
   discards the struggle detail retro mines). Turns this session's friction into a
   durable guardrail (a check, a pointer), not feature code. Run it before merge only
   if you expect it to flag the diff itself; otherwise after merge, in its own PR.

## Conventions

- Create the branch **before** writing spec/plan files.
- Commit `docs/features/<slug>/spec.md` and `docs/features/<slug>/plan.md` together as one docs commit.
- **Check for prior art** right after grilling: scan sibling modules / route groups
  for an existing pattern before investigating or inventing one.
- **Verify the fix kills the observed symptom** before declaring success — a passing
  test is not proof the real problem is gone.
- For large features, stage 3 fans out into per-slice tickets + concurrent worktrees;
  for small ones, a single branch is right — don't over-ceremony it.
