---
"@ngrok/oxlint-plugin": minor
---

Add `@ngrok/oxlint-plugin`, ngrok's house oxlint rules under the `ngrok` namespace. The first three rules read a JSX tree for the shapes that a browser translation engine turns into a blank page. A lint run now reports the shapes that `docs/browser-translation.md` forbids, so review no longer has to find each one.

`ngrok/jsx-no-conditional-before-text` reports a conditional element that renders immediately before a bare text child. Google Translate reparents the text node, so the element's `insertBefore` names a node that the parent no longer owns. The DOM raises `NotFoundError`, and the root tears down. This is the `Button` crash. The rule catches the `{children}` spelling of it without type information.

`ngrok/jsx-no-conditional-text-with-siblings` reports a conditional text child that can unmount, or change into an element, while a sibling stays mounted. This is the `removeChild` half of the same failure. The rule does not report a conditional whose every branch renders text, because React writes the new value in place.

`ngrok/jsx-require-translate-no` reports an element that holds untranslatable content but has no `translate="no"`. It checks `kbd` and `samp` by default, and the `elements` option adds more.

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

oxlint's JS plugin support is in alpha and is not subject to semver, so an oxlint update can break the plugin. The package needs Node 26 and oxlint 1.94 or later.
