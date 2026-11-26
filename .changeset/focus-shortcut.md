---
"@ngrok/mantle": minor
---

Add `FocusShortcut`, and remove `keyboardShortcut` from `Query.Input`. This is a breaking change. Read the [Query Input Focus Shortcut migration guide](https://mantle.ngrok.com/migrations/query-input-focus-shortcut-migration), and run its codemod: `pnpm -w run migrate query-input-focus-shortcut <path>` from a mantle checkout, or `npx --yes --package=@ast-grep/cli@0.51.3 ast-grep scan --rule node_modules/@ngrok/mantle/dist/migrations/query-input-focus-shortcut.yml --update-all <path>` in your project.

`FocusShortcut` (`@ngrok/mantle/focus-shortcut`) makes the slash key (`/`) move focus into one field from anywhere on the page. It wraps any focusable field: `Input`, `InputCapture`, `TextArea`, `Combobox.Input`, or `Query.Input`. The key still types a slash in any text control, and it does nothing with Meta, Ctrl, or Alt held, while an IME composes, on a key repeat, or while the field is disabled, not displayed, or behind a modal. When two fields have the shortcut, `/` goes to the field that mounted first and can take focus.

- `FocusShortcut.Root` connects a field to its hint. It renders no element.
- `FocusShortcut.Field` merges `aria-keyshortcuts="/"` onto its child, and keeps the child's own shortcuts in the list. It joins `focus-shortcut-field` onto the child's `data-slot`.
- `FocusShortcut.Hint` renders the `/` key as a `Kbd` (`data-slot="focus-shortcut-hint kbd"`) where you place it. It shows only while the field is empty, enabled, and not focused, on a device that can hover. Otherwise it carries the native `hidden` attribute. It takes `asChild`.

Docs: https://mantle.ngrok.com/components/forms/focus-shortcut
