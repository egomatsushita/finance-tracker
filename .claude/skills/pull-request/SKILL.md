---
name: pull-request
description: Create a pull request by analyzing git diff
---

## Context:

- Current git status: !`git status`
- Current HEAD git diff: !`git diff main...HEAD`

## Your task:

Analyze above HEAD git changes and create a PR with a generated title/Body - `gh pr create`

## Code Review:

First, launch the **branch-architect-review** agent with the HEAD diff. Display the full review output. Then ask the user: "Do you want to proceed with the PR? (yes/no)"

- If the user confirms: proceed to generate the PR.
- If the user declines or does not confirm: stop and wait for further instructions.

## Format:

Use the following format for making the pull request:

**Title**: `[FT-<number>] <concise description>`

**Body**:
Summary
<1-3 bullet points explaining what changed and why>

Changes
<bullet points of key changes>

**Note** Extract the FT number from the current branch name (visible in git status).

### Example:

**Title:** `[FT-14] chore: add code-quality-reviewer agent and commit-message gate`

**Body:**
```
## Summary
- Adds a staged-diff reviewer agent to catch quality issues before committing
- Gates the commit-message skill behind a code review step to enforce quality checks

## Changes
- `.claude/agents/code-quality-reviewer.md` — new agent definition
- `.claude/skills/commit-message/SKILL.md` — added code review gate with yes/no confirmation
```

## Output:

1. Show a summary of the branch changes (files modified, overall scope)
2. Propose the PR title and body
3. Ask: "Do you want to create the PR with this title and body? (yes/no)"
   - If yes: run `gh pr create` with the proposed title and body
   - If no: stop and wait for further instructions

## Rules:

- DO NOT auto-create the PR — wait for user approval before running `gh pr create`
- Always pass title and body explicitly to `gh pr create` — do not rely on interactive prompts
- If the branch has no commits ahead of main, report that and stop