---
name: spec
description: "Create a feature spec file and branch from a short idea."
argument-hint: "[Short feature description, 'ticket: <ticket-id>']"
allowed-tools: Read, Write, Glob, Bash(git switch:*), Bash(git status:*), Bash(git branch:*)
---

Create a feature spec from the user input below. Always follow rules in any CLAUDE.md files.

User input: $ARGUMENTS

## Step 1. Check the current branch

Check the current Git branch, and abort if there are any uncommitted, unstaged, or untracked files. Tell the user to commit or stash changes before proceeding.

## Step 2. Parse the arguments

From `$ARGUMENTS`, extract:

1. `feature_title` — short, human readable, Title Case (e.g. "GET User Endpoint")
2. `feature_slug` — lowercase kebab-case, only `a-z 0-9 -`, max 40 chars (e.g. `user-endpoints`)
3. `ticket_id`
  - Required. Parse from `ticket: <id>` in `$ARGUMENTS`. Format must be `FT-n`.
  - If missing, ask the user and wait. If no valid response, abort.
4. `branch_name` — `<ticket_id>_<feature_slug>` (e.g. `FT-99_user-model`)

If `feature_title` or `feature_slug` can't be inferred, ask the user to clarify.

## Step 3. Switch to a new Git branch

Switch to a new branch using `branch_name`. If already taken, append a version number (e.g. `FT-99_user-model-01`).

## Step 4. Draft the spec

Read `_specs/template.md` and follow its structure exactly. Save to `_specs/<feature_slug>.md`. Do not add code examples.

## Step 5. Final output

Respond with exactly:

```
Branch: <branch_name>
Spec: _specs/<feature_slug>.md
Title: <feature_title>
```

Do not repeat the full spec unless the user asks.
