---
"@ngrok/mantle": patch
---

Add `PromptInput.Dictate` (preview): a toggle that turns speech into text in `PromptInput.TextArea` with the browser's speech recognition. Each recognized phrase goes into the field at the caret, as if the person typed it, so the field's `onChange` runs. The toggle reports `aria-pressed` while it listens. It renders nothing on the server and in browsers without speech recognition.

Docs: https://mantle.ngrok.com/components/preview/prompt-input#pick-a-model-and-dictate
