---
"@ngrok/mantle": minor
---

Add `PromptInput` (preview) at `@ngrok/mantle/prompt-input`: the message box of a chat.

- `PromptInput.Root` renders a native `<form>`, so you read the message in `onSubmit` or `action`. Its frame draws the focus ring when a control inside it has focus. Set `streaming` and `onStop` while an answer streams. It stamps `data-streaming` while `streaming` is set.
- `PromptInput.TextArea` grows with its text up to `max-h-48`. Enter submits the form and Shift+Enter adds a line. On a touch screen, Return adds a line. The Enter that confirms an input method editor (IME) candidate does not submit, in Safari too. While an answer streams, the field stays editable and Enter does not submit.
- `PromptInput.Footer` holds the message's controls.
- `PromptInput.Submit` sends the message, and stops the answer while one streams. It is one button in both states, so focus stays on it.

Enter activates the form's default submit button, including its click handler and submission overrides. A disabled default button blocks Enter, including a button inside a disabled fieldset. Stopping an answer does not submit the next draft.

Composed triggers cannot change the send/stop button type. Enter preserves default-button behavior when the composer is portaled into another window.

Docs: https://mantle.ngrok.com/components/preview/prompt-input
