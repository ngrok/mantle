---
"@ngrok/mantle": minor
---

Add `Attachment` (preview) at `@ngrok/mantle/attachment`: a file attached to a chat message, as a chip.

- `Attachment.List` is the list of chips, which wrap.
- `Attachment.Root` is one chip. Set `busy` while your app reads the file, and the chip sets `aria-busy`.
- `Attachment.Preview` shows a 32-pixel thumbnail of an image, or a file icon without `src`.
- `Attachment.Name` shows the file's name, truncates, and sets `translate="no"`.
- `Attachment.Size` formats a size in bytes, such as "1.5 KB".
- `Attachment.Remove` is an icon button with a required `label`.

Docs: https://mantle.ngrok.com/components/preview/attachment
