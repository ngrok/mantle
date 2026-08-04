---
"@ngrok/mantle": patch
---

`Code`, `Kbd`, `CodeBlock.Code`, and `CodeBlock.Title` now render `translate="no"`, so a browser translation
engine skips the text inside them.

A translation engine translates the text inside `<code>` and `<kbd>` like any other prose. A translated CLI
flag, YAML key, env var, or shortcut key is wrong, and the reader copies it anyway. `translate` is the standard
way to mark a subtree an engine must skip, and code content is the clearest place to set it, because code must
never be translated.

The attribute also protects the render. Google Translate replaces each text node with a `<font>` wrapper, which
detaches the text nodes React holds. React then either writes an update into a node the DOM no longer shows —
stale text, no error — or calls `removeChild` on a node that moved and throws `NotFoundError`, which tears down
the root when no error boundary sits above it. `translate="no"` on the element, or on any ancestor, prevents
both, because the engine never enters the subtree.

The attribute is not overridable. Each part omits `translate` from its props type, so passing it is a compile
error, and each part stamps the attribute after the props spread, so a wider props object cannot carry a value
past the type either:

```tsx
import { Code } from "@ngrok/mantle/code";
import { Kbd } from "@ngrok/mantle/kbd";

// <code data-slot="code" … translate="no">npm install</code>
<Code>npm install</Code>;

// <kbd data-slot="kbd" … translate="no">K</kbd>
<Kbd>K</Kbd>;
```

`CodeBlock.Title` is included because the title usually names a file — `example.ts` — and a translated filename
names a file that does not exist. Wrap prose that should be translated in an element outside these parts.
