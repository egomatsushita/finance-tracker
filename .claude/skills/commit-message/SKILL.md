---
name: commit-message
description: Create a commit message by analyzing git diffs
allowed-tools: Bash(git status:*), Bash(git diff --staged), Bash(git commit:*)
---

## Context

- Current git status: !`git status`
- Current git diff: if the output of `git diff --staged` is already visible earlier in this conversation (whether from a pre-injected hook or a manual `!git diff --staged` run), use it directly and skip the tool call. Otherwise run `Bash(git diff --staged)` to fetch it.

## Format

```
[FT-<number>] <type>: <concise_description>
<optional_body_explaining_why>
```

Extract the FT number from the current branch name. Use present tense and explain "why", not "what". Add a body when the why doesn't fit in the subject line. Example:

```
[FT-n] refactor: decouple business logic from HTTP layer

Services were raising HTTPException directly, making them untestable
outside of a request context. Domain exceptions are now raised instead
and mapped to HTTP responses in exception_handlers.py.
```

## Rules

- DO NOT auto-commit — propose the message and wait for user approval.
