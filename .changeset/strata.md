---
"@ngrok/mantle": minor
---

Add `Strata`, a page of titled sections where each one's title and description sit beside its content. It is
the shape of a settings page, a resource configuration editor, and any form long enough that each group needs
its own sentence — see [the docs](https://mantle.ngrok.com/components/structure/strata).

```tsx
import { Strata } from "@ngrok/mantle/strata";

<Strata.Root>
	<Strata.Section>
		<Strata.Header>
			<Strata.Title>Providers</Strata.Title>
			<Strata.Description>What providers keys may call.</Strata.Description>
		</Strata.Header>
		<Strata.Body>
			<ProviderScopePicker />
		</Strata.Body>
	</Strata.Section>
	<Strata.Section>
		<Strata.Header>
			<Strata.Title>Routing rules</Strata.Title>
			<Strata.Description>Define how requests are authenticated.</Strata.Description>
		</Strata.Header>
		<Strata.Body>
			<RoutingRuleList />
		</Strata.Body>
	</Strata.Section>
</Strata.Root>;
```

The parts:

- **`Root`** is the stack. It rules a hairline between adjacent `Section` children — never above the first or
  below the last — and it scopes `--strata-columns` for all of them.
- **`Section`** is one titled band, and it owns its own vertical rhythm (`py-8 first:pt-0`) rather than taking
  it from `Root`, so a lone section reads correctly. Below the `md` breakpoint it stacks `Header` above `Body`;
  at `md` and up it splits the two into a `1fr 2fr` grid.
- **`Header`** is the introductory column — `Title` and `Description`, spaced by `gap-2`. It renders a semantic
  `<header>`, which is generic rather than a second `banner` landmark because it sits inside `Section`'s
  `<section>`.
- **`Title`** renders an `<h2>`, one level below the page's `<h1>`. Compose `asChild` with the right element
  when the sections sit deeper in the outline.
- **`Description`** renders a `<p>` in muted body text. Optional.
- **`Body`** is the content column, and its `gap-4` spaces stacked controls.

`Section` takes no accessible name, so a page of sections adds no `region` landmarks — the `Title` headings
already carry the outline, and a landmark list only stays useful while `main` and `nav` are easy to find in it.
Set `aria-labelledby` to the `Title`'s `id` only when a section is a destination a reader jumps back to. To tell
apart controls that read alike across two sections, reach for `Field.Set` and `Field.Legend` instead —
assistive technology announces a landmark on entry, never per control.

Public CSS variable:

| CSS Variable        | Default   | Description                                                                                                          |
| ------------------- | --------- | -------------------------------------------------------------------------------------------------------------------- |
| `--strata-columns` | `1fr 2fr` | The `grid-template-columns` value at `md` and up. Set it on `Root` to re-split every section, or on one `Section` to move only that one. |

Every part stamps a `data-slot` (`strata`, `strata-section`, `strata-header`, `strata-title`,
`strata-description`, `strata-body`) and accepts `asChild`.
