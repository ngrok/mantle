---
"@ngrok/oxlint-plugin": minor
---

Add `@ngrok/oxlint-plugin`, ngrok's house oxlint rules under the `ngrok` namespace. The first three read a JSX
tree for the shapes a browser translation engine turns into a blank page, so review no longer carries the whole
burden of `CONVENTIONS.md § Browser Translation`.

`ngrok/jsx-no-conditional-before-text` reports a conditional element that renders immediately before a bare
text child. Google Translate reparents the text node, so the element's `insertBefore` names a node the parent
no longer owns, the DOM raises `NotFoundError`, and the root tears down. This is the `Button` crash, and the
rule catches the `{children}` spelling of it without type information.

`ngrok/jsx-no-conditional-text-with-siblings` reports a conditional text child that can unmount, or change into
an element, while a sibling stays mounted — the `removeChild` half of the same failure. A conditional whose
every branch renders text is safe and the rule leaves it alone, because React writes the new value in place.

`ngrok/jsx-require-translate-no` reports an element that holds untranslatable content but carries no
`translate="no"`. It checks `kbd` and `samp` by default, and `elements` names more.

```json
{
	"jsPlugins": ["@ngrok/oxlint-plugin"],
	"rules": {
		"ngrok/jsx-no-conditional-before-text": "error",
		"ngrok/jsx-no-conditional-text-with-siblings": "error",
		"ngrok/jsx-require-translate-no": ["error", { "elements": ["kbd", "samp", "CodeBlock.Code"] }]
	}
}
```

oxlint's JS plugin support is in alpha and not subject to semver, so an oxlint bump can break the plugin. The
package needs Node 24 and oxlint 1.77 or later.
