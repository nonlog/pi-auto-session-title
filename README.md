# Pi Auto Session Title

A small Pi extension that automatically names unnamed sessions using Pi's native `ctx.modelRegistry.complete()` and `pi.setSessionName()` APIs.

This project intentionally avoids `completeSimple()`. It was created after a custom provider repeatedly returned an empty title through that path even though normal Pi model calls worked.

## Behavior

- Runs after the first substantive user prompt through `before_agent_start`.
- Uses `ctx.modelRegistry.complete()` so title requests use Pi's configured provider/model registry.
- Applies names only through `pi.setSessionName()`.
- Never overwrites an existing/manual name during automatic generation.
- Re-checks the active session and current name after the model request, preventing session-switch and manual-rename races.
- Ignores trivial prompts such as `继续`, `continue`, `ok`, and `next` until a substantive request exists.
- Extracts normalized `text` and `output_text` response shapes.
- Falls back silently to a local sanitized title when the model fails or returns no usable text.
- Removes URLs, absolute paths, and common token-like strings from generated/fallback titles.
- Provides `/retitle` to explicitly regenerate the current title.

## Configuration

For compatibility with `pi-session-naming`, the extension reads these existing keys from `~/.pi/agent/settings.json`:

```json
{
  "session": {
    "titleGeneration": {
      "enabled": true,
      "model": "www/gpt-5.6-luna:minimal",
      "retries": 2,
      "maxLength": 64,
      "timeoutMs": 12000
    }
  }
}
```

Environment variables override settings:

- `PI_AUTO_TITLE_ENABLED`
- `PI_AUTO_TITLE_MODEL`
- `PI_AUTO_TITLE_RETRIES`
- `PI_AUTO_TITLE_MAX_CHARS`
- `PI_AUTO_TITLE_MAX_SOURCE_CHARS`
- `PI_AUTO_TITLE_TIMEOUT_MS` (default: `12000` per attempt)
- `PI_AUTO_TITLE_DEBUG`

`model` accepts `provider/model[:thinking]`. Use `current` to title with the session's current model.

## Local development

```powershell
npm install
npm test
```

Load only this extension for a test run:

```powershell
pi --no-extensions -e .\extensions\auto-session-title.ts
```

## Install from Git

After this repository is published:

```powershell
pi install git:https://github.com/nonlog/pi-auto-session-title
```

Remove it with:

```powershell
pi remove git:https://github.com/nonlog/pi-auto-session-title
```



