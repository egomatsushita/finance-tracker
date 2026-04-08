---
name: spec
description: "Create a feature spec file and branch from a short idea."
argument-hint: "[Short feature description, 'ticket: <ticket-id>']"
allowed-tools: Read, Write, Glob, Bash(git switch:*), Bash(git status:*), Bash(git branch:*)
---

You are helping to spin up a new feature spec for this application, from a short idea provided in the user input below. Always adhere to any rules or requirements set out in any CLAUDE.md files when responding.

User input: $ARGUMENTS

## High level behavior

Your job will be to turn the user input above into:

- A human friendly feature title (e.g. GET User Endpoint)
- A safe git branch name not already taken (e.g. FT-n_user-router)
- A detailed markdown spec file under the _specs/ directory

Then save the spec file to disk and print a short summary of what you did.

## Step 1. Check the current branch

Check the current Git branch, and abort this entire process if there are any uncommitted, unstaged, or untracked files in the working directory. Tell the user to commit or stash changes before proceeding, and DO NOT GO ANY FURTHER.

## Step 2. Parse the arguments

From `$ARGUMENTS`, extract:

1. `feature_title`
  - A short, human readable title in Title Case.
  - Example: "GET User Endpoint"

2. `feature_slug`
  - A git safe slug.
  - Rules:
    - Lowercase
    - Kebab-case
    - Only `a-z`, `0-9` and `-`
    - Replace spaces and punctuation with `-`
    - Collapse multiple `-` into one
    - Trim `-` from start and end
    - Maximum length 40 characters
  - Example: `user-model` or `user-endpoints`.

3. `ticket_id`
  - Ticket number linked to the feature
  - If `$ARGUMENTS` contains the substring `ticket:`
  - Then the text after `ticket:` is the ticket id
  - `ticket_id` format must be `FT-n`, where 'n' is a positive number
  - If `ticket:` is absent from `$ARGUMENTS` or no valid `ticket_id` can be parsed from it, then ask them and wait to proceed.
  - If no response or ticket id is returned, then abort.
  - Example input:
    - `/spec User model, ticket: FT-99`
    - `ticket_id` becomes `FT-99`

4. `branch_name`
  - Format: `<ticket_id>_<feature_slug>`
  - Example: `FT-99_user-model`.

**Note:** If you cannot infer a sensible `feature_title` and `feature_slug`, ask the user to clarify instead of guessing.

## Step 3. Switch to a new Git branch

Before making any content, switch to a new Git branch using the `branch_name` derived from the `$ARGUMENTS`. If the branch name is already taken, then append a version number to it: e.g. `FT-99_user-model-01`

## Step 4. Draft the spec content

Create a markdown spec document that Plan mode can use directly and save it in the _specs folder using the `feature_slug`. Use the Read tool to load _specs/template.md and follow its structure exactly. Do not add technical implementation details such as code examples.

## Step 5. Final output to the user

After the file is saved, respond to the user with a short summary in this exact format:

Branch: <branch_name>
Spec: _specs/<feature_slug>.md
Title: <feature_title>

Do not repeat the full spec in the chat output unless the user explicitly asks to see it. The main goal is to save the spec file and report where it lives and what branch name to use.

