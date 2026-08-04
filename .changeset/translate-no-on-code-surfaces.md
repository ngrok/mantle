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

Two of the four lock the attribute, and two leave it overridable, on whether the part can ever hold prose.

`Kbd` and `CodeBlock.Code` lock it. A key and a block of code are never translatable, so both omit `translate`
from their props type — passing it is a compile error — and both stamp the attribute after the props spread, so
a wider props object cannot carry a value past the type either.

`Code` and `CodeBlock.Title` keep the prop. `Code` also styles terms that are not code, and `CodeBlock.Title`
takes arbitrary children, so `translate="no"` is a default rather than a rule: pass `translate="yes"` when the
content is prose.

```tsx
import { Code } from "@ngrok/mantle/code";
import { Kbd } from "@ngrok/mantle/kbd";

// <code data-slot="code" … translate="no">npm install</code>
<Code>npm install</Code>;

// <kbd data-slot="kbd" … translate="no">K</kbd>
<Kbd>K</Kbd>;

// <code data-slot="code" … translate="yes">dashboard</code>
<Code translate="yes">dashboard</Code>;
```

`CodeBlock.Title` is included because the title usually names a file — `example.ts` — and a translated filename
names a file that does not exist.
