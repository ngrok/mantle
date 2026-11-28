---
"@ngrok/mantle": patch
---

Add `CodeBlock.Diff` and `CodeBlock.DiffCallout`, a side-by-side diff of two code values in the style of a code review.

- `CodeBlock.Diff` takes `from` and `to` values from `mantleCode()`, `jsonCodeBlockValue()`, the server highlighter, or `useCodeBlockStream()`, and keeps the highlighting of each. A changed line gets a tint, a `+` or `−` sign, a visually hidden "Added:" or "Removed:", and its changed words marked with `<ins>` and `<del>`, so the change does not depend on color. Each run of unchanged lines keeps three lines beside each change, and a button expands the rest. In JSON, a trailing comma alone does not count as a change. The diff runs in the browser with no Shiki and no diff library, and the server HTML is the final paint.
- Each pane is a `role="group"` named by `fromLabel` (default `"Before"`) and `toLabel` (default `"After"`), and scrolls sideways on its own. `wrapLines` wraps long lines; a line over 100,000 characters always wraps. The diff is `dir="ltr"` unless the call site sets `dir`, and a `CodeBlock.CopyButton` before it in `CodeBlock.Body` copies the `to` code.
- A function child gets each side of each line that shows (`side`, `lineNumber`, `change`, `text`, and, for JSON, the `path` of its value) and can return a `CodeBlock.DiffCallout`. The callout sits under the line, stays in view as the pane scrolls, and carries `translate="yes"`. The other pane keeps a blank row of the same height.
- New data attributes: `data-side` on each `code-block-diff-pane`, and `data-line-number` and `data-change` (`"removed"` or `"added"`) on each `code-block-diff-line`. New `data-slot` values: `code-block-diff`, `code-block-diff-pane`, `code-block-diff-line`, `code-block-diff-filler`, `code-block-diff-spacer`, `code-block-diff-callout-row`, `code-block-diff-expand-row`, `code-block-diff-expand`, and `code-block-diff-callout`.
- `jsonCodeBlockValue` takes `sortKeys`, which writes each object's keys in sorted order, so a change in key order alone shows no change in a diff. Keys that are array indexes come first in numeric order, as in each JavaScript object.

See https://mantle.ngrok.com/components/data-display/code-block#comparing-two-versions.
