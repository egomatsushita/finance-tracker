---
name: Agent and Skill Config Reviews
description: This repo uses Claude agent/skill markdown files under .claude/ that appear in staged diffs and require review — the standard app-code checklist does not apply to these files
type: project
---

The `.claude/agents/` and `.claude/skills/` directories contain markdown-based agent and skill configuration files that are versioned and appear in staged diffs. When reviewing these files, the standard checklist (security, architecture compliance, error handling, etc.) does not apply. Review focuses on:
- Correctness of `allowed-tools` declarations relative to what the skill actually does
- Ambiguity in prompt directives (e.g., diff pre-injection vs. agent re-running the same command)
- Consistency between agent descriptions and their actual behavior
- Duplication across skills that could increase maintenance surface
- **Preservation of quality gates**: skills that previously launched an agent as a review gate before a destructive action (commit, PR creation) must be checked for silent gate removal when the skill body is edited

**Why:** These config files govern the developer workflow tooling (commit gating, PR creation, arch reviews). Errors here affect every contributor's workflow, not just the application. Gate removal is easy to miss because it appears as a simple section deletion with no syntax error.

**How to apply:** When the diff contains only `.claude/` files, skip the standard FastAPI/Pydantic checklist and apply the workflow-tooling lens above. When a skill is modified, explicitly check whether any agent-launch or user-confirmation gate that existed in the previous version is still present.
