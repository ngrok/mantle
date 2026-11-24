---
"@ngrok/mantle": patch
---

Add `PromptInput.Dictate` (preview): a toggle that turns speech into text in `PromptInput.TextArea` with the browser's speech recognition. Each final phrase replaces the selection and runs the field's `onChange`. The browser supplies spacing; `maxLength` limits the edit. Disabled and read-only fields stay unchanged. Dictated edits do not enter the browser's undo history. The toggle reports `aria-pressed` while it listens. After an error or the end of a session, press it to start again. Disabling the toggle ends the session. It renders nothing on the server and in browsers without speech recognition.

Docs: https://mantle.ngrok.com/components/preview/prompt-input#pick-a-model-and-dictate
