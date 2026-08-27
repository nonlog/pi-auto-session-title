# AGENTS.md

## Scope

This repository contains the Pi automatic session-title extension.

## Invariants

- Use Pi-native APIs: `ctx.modelRegistry.complete()` for title generation and `pi.setSessionName()` for persistence.
- Do not use `completeSimple()` for automatic title generation.
- Never overwrite an existing/manual session name during automatic generation.
- Re-check both active session identity and the current session name after asynchronous model work.
- Title failures must fail open and must not block the main Pi turn.
- Keep a deterministic local fallback for empty, failed, or timed-out model responses.
- Never log prompt text, generated titles, credentials, tokens, or provider secrets in normal operation.

## Validation

Run before committing:

```powershell
npm test
npm pack --dry-run
```

For runtime verification, load the extension in Pi and confirm `get_state.sessionName` or the persisted session metadata, not only terminal UI text.

## Git attribution

Use `Codex <codex@openai.com>` as both Git author and committer identity for commits intended for GitHub.
