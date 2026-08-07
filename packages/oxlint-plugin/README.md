# @ngrok/oxlint-plugin

ngrok's house [oxlint](https://oxc.rs) rules, under the `ngrok` namespace.

The three rules it ships read a JSX tree for the shapes a browser translation engine turns into a blank page.
The mechanism, the update-by-update table of what breaks, and the rejected alternatives are in
[`decisions/2026-08-04-translation-safe-label-wrappers.md`](https://github.com/ngrok/mantle/blob/main/decisions/2026-08-04-translation-safe-label-wrappers.md).
[CONVENTIONS.md § Browser Translation](https://github.com/ngrok/mantle/blob/main/CONVENTIONS.md#browser-translation)
states the rules the code follows.

## Requirements

- Node.js 24+
- oxlint 1.77+

oxlint's JS plugin support is in alpha and not subject to semver, so an oxlint bump can break the plugin. The
`oxlint` peer dependency records the floor.

## Installation

```sh
pnpm add -D -E @ngrok/oxlint-plugin
```

## Usage

```json
{
	"jsPlugins": ["@ngrok/oxlint-plugin"],
	"rules": {
		"ngrok/jsx-no-conditional-before-text": "error",
		"ngrok/jsx-no-conditional-text-with-siblings": "error",
		"ngrok/jsx-require-translate-no": "error"
	}
}
```

The mantle repo names the source entry instead — `./packages/oxlint-plugin/src/index.ts`. Its CI lints right
after install with no build step, so a `dist` import would break `pnpm lint`. Node strips the types.

## Rules

### `ngrok/jsx-no-conditional-before-text`

Reports a conditional element that renders immediately before a bare text child.

Google Translate wraps each text node in a `<font>` and reparents the original node. When the condition turns
on, React calls `parent.insertBefore(element, textNode)` against a node the parent no longer owns, the DOM
raises `NotFoundError`, and React re-throws it — so the root tears down and the page goes blank. `Button` hit
this on the first click of every submit button, because `isLoading` synthesizes the icon.

```tsx
// ❌
<button>
	{icon && <Icon svg={icon} />}
	{children}
</button>

// ✅ the icon inserts before an element sibling
<button>
	{icon && <Icon svg={icon} />}
	<span data-slot="button-label">{children}</span>
</button>
```

Two other fixes work. Move the conditional element after the text, which turns the mount into an
`appendChild`. Or mount the element unconditionally and write text into it, which is safe and self-healing.

A child whose every branch renders an element or nothing is not text, so `{footer == null ? null : <div />}`
is not reported. A branch this rule cannot read statically counts as text, because the crash costs a blank
page and the fix costs a `<span>`.

### `ngrok/jsx-no-conditional-text-with-siblings`

Reports a conditional text child that can unmount, or change into an element, while a sibling stays mounted.
React's `removeChild` then names a node the translation engine reparented.

```tsx
// ❌ the text unmounts while the icon remains
<button>
	{label && "Submit"}
	<Icon svg={caret} />
</button>

// ✅ every update is a text write
<button>
	<span data-slot="button-label">{label}</span>
	<Icon svg={caret} />
</button>
```

Three shapes stay quiet on purpose:

- **Every branch renders text** — `{open ? "Show less" : "Show more"}`. React writes the new value through
  `commitTextUpdate`, and the translation reverts.
- **A lone expression child** — React updates it through `setTextContent`. The failure needs a sibling.
- **A branch this rule cannot read statically** — `{expanded && belowTheFold}`. That identifier holds an
  element far more often than a string, so the rule trades the recall for precision.

A nested conditional recurses, so `{wide && (full ? <Full /> : <Compact />)}` reads as element-or-nothing.

### `ngrok/jsx-require-translate-no`

Reports an element that holds untranslatable content but carries no `translate="no"`.

A reader copies or retypes a shortcut key, a CLI flag, an env var, a YAML key, a filename, an ID, or a
one-time passcode. A translated one is wrong, and the reader uses it anyway. The attribute also keeps the
engine out of the subtree, so it doubles as the second fix for the crash the other two rules report.

```tsx
// ❌
<kbd>{shortcut}</kbd>

// ✅
<kbd translate="no">{shortcut}</kbd>
```

The rule stays quiet when the element carries any `translate` attribute, and when an enclosing element already
carries `translate="no"` — descendants inherit it.

#### Options

| Option     | Type       | Default           | Meaning                                         |
| ---------- | ---------- | ----------------- | ----------------------------------------------- |
| `elements` | `string[]` | `["kbd", "samp"]` | The tag names to check. An empty list opts out. |

Name a component the way the JSX spells it, including its object:

```json
{
	"rules": {
		"ngrok/jsx-require-translate-no": ["error", { "elements": ["kbd", "samp", "CodeBlock.Code"] }]
	}
}
```

`code` stays off the default list on purpose — mantle's `Code` also styles terms that are not code, so the
attribute is a default there rather than a lock.

## Suppressing a report

An inline directive must precede the **reported** line, which for the first two rules is the text child
rather than the conditional above it:

```tsx
<button>
	{showLeading && <CaretDownIcon />}
	{/* oxlint-disable-next-line ngrok/jsx-no-conditional-before-text -- the test asserts the crash this rule reports */}
	Create endpoint
</button>
```
