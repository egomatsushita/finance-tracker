---
name: commit-message
description: Create a commit message by analyzing git diffs
---

## Context

- Current git status: !`git status`
- Current git diff: !`git diff --staged`

### Your task:

Analyze above stage git changes and create a commit message. Use present tense and explain "why" something has changed, not just "what" has changed.

## Code Review

First, launch the **code-quality-reviewer** agent with the staged diff. Display the full review output. Then ask the user: "Do you want to proceed with the commit? (yes/no)"

- If the user confirms: proceed to generate the commit message.
- If the user declines or does not confirm: stop and wait for further instructions.

## Commit types:

- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Refactoring code
- `test:` - Tests
- `docs:` - Documentation
- `style:` - Styling/formatting
- `perf:` - Performance
- `chore:` - Maintenance tasks

## Format:

Use the following format for making the commit message:

```
[FT-<number>] <type>: <concise_description>
<optional_body_explaining_why>
```

**Note:** Extract the FT number from the current branch name (visible in git status).

**Attention:** Add a body when the "why" can't fit in the subject line. Focus on motivation, not implementation. Keep lines under 72 chars.

### Example:

```
[FT-n] refactor: decouple business logic from HTTP layer

Services were raising HTTPException directly, making them untestable
outside of a request context. Domain exceptions are now raised instead
and mapped to HTTP responses in exception_handlers.py.
```

## Output:

1. Show summary of changes currently staged
2. Propose commit message with appropriate commit type
3. Ask for confirmation before committing

## Rules:

- DO NOT auto-commit - wait for user approval, and only commit if the user says so.