---
name: Skill diff pre-injection alignment
description: Skills that claim to pass a diff to an agent must actually pre-inject it with ! backtick syntax — misalignment between the task directive and what is rendered is a recurring source of agent fallback confusion
type: feedback
---

When a skill says "launch the X agent with the diff above," verify that the skill body actually contains a `!` backtick pre-injection (e.g., `!git diff main...HEAD`). If the injection is absent, the agent will silently fall back to running the command itself, the skill's `allowed-tools` declarations become dead weight, and any agent-side guard like "if diff is already provided, do not re-run" is never triggered.

**Why:** Observed in `.claude/skills/branch-review/SKILL.md` — task said "with the branch diff above" but no diff was injected. The mismatch is non-obvious and causes silent behavioral divergence.

**How to apply:** In any review of `.claude/skills/` files, check that every agent delegation that references "the diff above" has a corresponding `!` pre-injection line above the task directive. Flag as Major if absent.
