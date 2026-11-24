---
"@ngrok/mantle": minor
---

Add `PromptInput` at `@ngrok/mantle/prompt-input`: the message box of a chat.

- `PromptInput.Root` renders a native `<form>`, so you read the message in `onSubmit` or `action`. Its frame draws the focus ring when a control inside it has focus. Set `streaming` and `onStop` while an answer streams. It stamps `data-streaming` while `streaming` is set.
- `PromptInput.TextArea` grows with its text up to `max-h-48`. Enter submits the form and Shift+Enter adds a line. On a touch screen, Return adds a line. The Enter that confirms an input method editor (IME) candidate does not submit, in Safari too. While an answer streams, the field stays editable and Enter does not submit.
- `PromptInput.Footer` holds the message's controls.
- Set `onFilesAdd` on `PromptInput.Root` to take files. `PromptInput.AttachButton` opens the file picker, and a drop on the frame or a paste into the field also passes files. A paste with both text and files keeps the native text insertion. The frame stamps `data-drag-over` while files drag over it.
- `PromptInput.Dictate` is a toggle that turns speech into text in `PromptInput.TextArea` with the browser's speech recognition. Each final phrase replaces the selection and runs the field's `onChange`. The browser supplies spacing; `maxLength` limits the edit. Disabled and read-only fields stay unchanged. Dictated edits do not enter the browser's undo history. The toggle reports `aria-pressed` while it listens. After an error or the end of a session, press it to start again. Disabling the toggle ends the session. It renders nothing on the server and in browsers without speech recognition.
- `PromptInput.Submit` sends the message, and stops the answer while one streams. It is one button in both states, so focus stays on it.

Enter activates the form's default submit button, including its click handler and submission overrides. A disabled default button blocks Enter, including a button inside a disabled fieldset. Stopping an answer does not submit the next draft.

Composed triggers cannot change the send/stop button type. Enter preserves default-button behavior when the composer is portaled into another window.

Docs: https://mantle.ngrok.com/components/ai/prompt-input
