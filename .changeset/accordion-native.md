---
"@ngrok/mantle": minor
---

Add `@ngrok/mantle/accordion/native`: the `Accordion` parts and props on native `<details>` and `<summary>` elements. To swap, change the import from `@ngrok/mantle/accordion` to `@ngrok/mantle/accordion/native`. The browser owns each section's open state, so the accordion ships no open-state JavaScript, a long page hydrates faster, and a section opens before the page hydrates.

```tsx
import { Accordion } from "@ngrok/mantle/accordion/native";

<Accordion.Root type="single" defaultValue="dns">
	<Accordion.Item value="dns">
		<Accordion.Trigger>
			How do I point my custom domain at an ngrok endpoint?
			<Accordion.TriggerIcon />
		</Accordion.Trigger>
		<Accordion.Content>
			<Accordion.Body>Add a CNAME record at your DNS provider.</Accordion.Body>
		</Accordion.Content>
	</Accordion.Item>
</Accordion.Root>;
```

- `Accordion.Root`, `Accordion.Item`, `Accordion.Trigger`, `Accordion.TriggerIcon`, `Accordion.Content`, and `Accordion.Body` carry the same `data-slot` values as `Accordion` and share its class recipes.
- `Accordion.Item` is a `<details>`, and `Accordion.Trigger` is a `<summary>` that must be its first child. `Trigger` takes no `asChild` and no `<button>` props such as `disabled`, so a swap that depends on them fails typecheck.
- `type="single"` sets one `<details name>` on every item. Browsers before Chrome 120, Safari 17.2, and Firefox 130 let several sections open at once.
- `onValueChange` reports from the `toggle` event after the browser opens or closes a section. A controlled `value` that rejects a change does not close the section again.
- The open slide needs `::details-content` and `interpolate-size`. Without them, sections open and close with no motion.
- No part stamps `data-state`. Style the open state from the native `open` attribute on `Accordion.Item` with Tailwind's `open:` variant.

Docs: https://mantle.ngrok.com/components/data-display/accordion-native
