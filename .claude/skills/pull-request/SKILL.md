---
name: pull-request
description: Create a pull request by analyzing git diff.
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(gh pr create:*)
---

## Context

- Current git status: !`git status`
- Current HEAD git diff: if `git diff main...HEAD` output is already visible earlier in this conversation, use it directly and skip the tool call. Otherwise run `Bash(git diff main...HEAD)` to fetch it.

## Format

**Title:** `[FT-<number>] <concise description>`

Extract the FT number from the current branch name. Example:

```
## Summary
- <1-3 bullet points explaining what changed and why>

## Changes
- `path/to/file` — description
```

## Rules

- DO NOT auto-create the PR — propose title and body and wait for user approval.
- Always pass title and body explicitly to `gh pr create` — do not rely on interactive prompts.
- If the branch has no commits ahead of main, report that and stop.
