import type { ComponentProps } from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Slot } from "../slot/index.js";

/**
 * The stack of sections. Renders a `<div>` with `divide-card-muted divide-y`, so
 * a hairline falls between adjacent `Parfait.Section` children and never above
 * the first or below the last. Vertical rhythm belongs to `Section`
 * (`py-8 first:pt-0`) rather than here, which keeps a lone `Section` usable
 * without a `Root` around it. Set `--parfait-columns` on `Root` to re-split
 * every section at once — custom properties inherit, so one declaration reaches
 * all of them.
 *
 * | Data Attribute | Value       | Description                                                        |
 * | -------------- | ----------- | ------------------------------------------------------------------ |
 * | `data-slot`    | `"parfait"` | Stable styling hook. Survives `className` overrides and `asChild`. |
 *
 * @see https://mantle.ngrok.com/components/structure/parfait#parfaitroot
 *
 * @example
 * ```tsx
 * <Parfait.Root>
 *   <Parfait.Section>
 *     <Parfait.Header>
 *       <Parfait.Title>Providers</Parfait.Title>
 *       <Parfait.Description>What providers keys may call.</Parfait.Description>
 *     </Parfait.Header>
 *     <Parfait.Body>
 *       <ProviderScopePicker />
 *     </Parfait.Body>
 *   </Parfait.Section>
 *   <Parfait.Section>
 *     <Parfait.Header>
 *       <Parfait.Title>Routing rules</Parfait.Title>
 *       <Parfait.Description>Define how requests are authenticated.</Parfait.Description>
 *     </Parfait.Header>
 *     <Parfait.Body>
 *       <RoutingRuleList />
 *     </Parfait.Body>
 *   </Parfait.Section>
 * </Parfait.Root>
 * ```
 */
const Root = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	...props
}: ComponentProps<"div"> & WithAsChild & WithDataSlot) => {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			data-slot={joinDataSlot(dataSlot, "parfait")}
			className={cx("divide-card-muted divide-y", className)}
			{...props}
		>
			{children}
		</Comp>
	);
};

/**
 * One titled band of the page. Renders a `<section>` that stacks
 * `Parfait.Header` above `Parfait.Body` below the `md` breakpoint, then splits
 * the two into a `1fr 2fr` grid at `md` and up. It carries its own vertical
 * rhythm (`py-8 first:pt-0`), so it reads correctly as the only child of a
 * `Root` and as one of many.
 *
 * The `<section>` takes no accessible name, which keeps it generic in the
 * accessibility tree instead of adding one `region` landmark per band — the
 * `Parfait.Title` headings already carry the page outline, and a landmark list
 * only stays useful while `main` and `nav` are easy to find in it. Set
 * `aria-labelledby` to the `Title`'s `id` only when the section is a
 * destination a reader jumps back to, not merely a division of the page. To
 * tell apart controls that read alike across two sections, reach for
 * `Field.Set` and `Field.Legend` instead — assistive technology announces a
 * landmark on entry, never per control.
 *
 * | CSS Variable        | Default   | Description                                                                                                                 |
 * | ------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------- |
 * | `--parfait-columns` | `1fr 2fr` | The `grid-template-columns` value at `md` and up. Set it on `Parfait.Root` to re-split every section, or here for this section alone. |
 *
 * | Data Attribute | Value               | Description                                                        |
 * | -------------- | ------------------- | ------------------------------------------------------------------ |
 * | `data-slot`    | `"parfait-section"` | Stable styling hook. Survives `className` overrides and `asChild`. |
 *
 * @see https://mantle.ngrok.com/components/structure/parfait#parfaitsection
 *
 * @example
 * ```tsx
 * <Parfait.Root>
 *   <Parfait.Section>
 *     <Parfait.Header>
 *       <Parfait.Title>Providers</Parfait.Title>
 *       <Parfait.Description>What providers keys may call.</Parfait.Description>
 *     </Parfait.Header>
 *     <Parfait.Body>
 *       <ProviderScopePicker />
 *     </Parfait.Body>
 *   </Parfait.Section>
 *   <Parfait.Section>
 *     <Parfait.Header>
 *       <Parfait.Title>Routing rules</Parfait.Title>
 *       <Parfait.Description>Define how requests are authenticated.</Parfait.Description>
 *     </Parfait.Header>
 *     <Parfait.Body>
 *       <RoutingRuleList />
 *     </Parfait.Body>
 *   </Parfait.Section>
 * </Parfait.Root>
 * ```
 */
const Section = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	...props
}: ComponentProps<"section"> & WithAsChild & WithDataSlot) => {
	const Comp = asChild ? Slot : "section";

	return (
		<Comp
			data-slot={joinDataSlot(dataSlot, "parfait-section")}
			className={cx(
				"grid gap-6 py-8 first:pt-0",
				"md:grid-cols-(--parfait-columns,1fr_2fr) md:gap-12",
				className,
			)}
			{...props}
		>
			{children}
		</Comp>
	);
};

/**
 * A section's introductory column — its `Parfait.Title` and
 * `Parfait.Description`. Renders a `<header>` with `flex flex-col gap-2`, so
 * anything else composed in (a `Badge`, a count) picks up the same spacing. At
 * `md` and up it takes the grid's first column; below the breakpoint it stacks
 * above `Parfait.Body`.
 *
 * Why `<header>`: it groups the introductory content of its nearest sectioning
 * ancestor, which is `Parfait.Section`'s `<section>`. Nested inside sectioning
 * content, a `<header>` is not the `banner` landmark, so a page carries as many
 * as it has sections.
 *
 * | Data Attribute | Value              | Description                                                        |
 * | -------------- | ------------------ | ------------------------------------------------------------------ |
 * | `data-slot`    | `"parfait-header"` | Stable styling hook. Survives `className` overrides and `asChild`. |
 *
 * @see https://mantle.ngrok.com/components/structure/parfait#parfaitheader
 *
 * @example
 * ```tsx
 * <Parfait.Root>
 *   <Parfait.Section>
 *     <Parfait.Header>
 *       <Parfait.Title>Providers</Parfait.Title>
 *       <Parfait.Description>What providers keys may call.</Parfait.Description>
 *     </Parfait.Header>
 *     <Parfait.Body>
 *       <ProviderScopePicker />
 *     </Parfait.Body>
 *   </Parfait.Section>
 *   <Parfait.Section>
 *     <Parfait.Header>
 *       <Parfait.Title>Routing rules</Parfait.Title>
 *       <Parfait.Description>Define how requests are authenticated.</Parfait.Description>
 *     </Parfait.Header>
 *     <Parfait.Body>
 *       <RoutingRuleList />
 *     </Parfait.Body>
 *   </Parfait.Section>
 * </Parfait.Root>
 * ```
 */
const Header = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	...props
}: ComponentProps<"header"> & WithAsChild & WithDataSlot) => {
	const Comp = asChild ? Slot : "header";

	return (
		<Comp
			data-slot={joinDataSlot(dataSlot, "parfait-header")}
			className={cx("flex flex-col gap-2", className)}
			{...props}
		>
			{children}
		</Comp>
	);
};

/**
 * The section's heading. Renders an `<h2>`, one level below the page's `<h1>`,
 * because a `Parfait.Section` is a top-level division of its page. Compose
 * `asChild` with the right element when a page nests its sections deeper —
 * heading level is document structure, so mantle does not guess it.
 *
 * | Data Attribute | Value             | Description                                                        |
 * | -------------- | ----------------- | ------------------------------------------------------------------ |
 * | `data-slot`    | `"parfait-title"` | Stable styling hook. Survives `className` overrides and `asChild`. |
 *
 * @see https://mantle.ngrok.com/components/structure/parfait#parfaittitle
 *
 * @example
 * ```tsx
 * <Parfait.Root>
 *   <Parfait.Section>
 *     <Parfait.Header>
 *       <Parfait.Title>Providers</Parfait.Title>
 *       <Parfait.Description>What providers keys may call.</Parfait.Description>
 *     </Parfait.Header>
 *     <Parfait.Body>
 *       <ProviderScopePicker />
 *     </Parfait.Body>
 *   </Parfait.Section>
 *   <Parfait.Section>
 *     <Parfait.Header>
 *       <Parfait.Title>Routing rules</Parfait.Title>
 *       <Parfait.Description>Define how requests are authenticated.</Parfait.Description>
 *     </Parfait.Header>
 *     <Parfait.Body>
 *       <RoutingRuleList />
 *     </Parfait.Body>
 *   </Parfait.Section>
 * </Parfait.Root>
 * ```
 */
const Title = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	...props
}: ComponentProps<"h2"> & WithAsChild & WithDataSlot) => {
	const Comp = asChild ? Slot : "h2";

	return (
		<Comp
			data-slot={joinDataSlot(dataSlot, "parfait-title")}
			className={cx("text-strong text-base font-medium", className)}
			{...props}
		>
			{children}
		</Comp>
	);
};

/**
 * The sentence that says what the section's controls do, and what changing them
 * costs. Renders a `<p>` in muted body text beneath `Parfait.Title`. Optional —
 * a section whose title says everything may omit it.
 *
 * | Data Attribute | Value                   | Description                                                        |
 * | -------------- | ----------------------- | ------------------------------------------------------------------ |
 * | `data-slot`    | `"parfait-description"` | Stable styling hook. Survives `className` overrides and `asChild`. |
 *
 * @see https://mantle.ngrok.com/components/structure/parfait#parfaitdescription
 *
 * @example
 * ```tsx
 * <Parfait.Root>
 *   <Parfait.Section>
 *     <Parfait.Header>
 *       <Parfait.Title>Providers</Parfait.Title>
 *       <Parfait.Description>What providers keys may call.</Parfait.Description>
 *     </Parfait.Header>
 *     <Parfait.Body>
 *       <ProviderScopePicker />
 *     </Parfait.Body>
 *   </Parfait.Section>
 *   <Parfait.Section>
 *     <Parfait.Header>
 *       <Parfait.Title>Routing rules</Parfait.Title>
 *       <Parfait.Description>Define how requests are authenticated.</Parfait.Description>
 *     </Parfait.Header>
 *     <Parfait.Body>
 *       <RoutingRuleList />
 *     </Parfait.Body>
 *   </Parfait.Section>
 * </Parfait.Root>
 * ```
 */
const Description = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	...props
}: ComponentProps<"p"> & WithAsChild & WithDataSlot) => {
	const Comp = asChild ? Slot : "p";

	return (
		<Comp
			data-slot={joinDataSlot(dataSlot, "parfait-description")}
			className={cx("text-body text-sm", className)}
			{...props}
		>
			{children}
		</Comp>
	);
};

/**
 * The section's content column — the controls, cards, or table that
 * `Parfait.Header` describes. Renders a `<div>` with `flex flex-col gap-4`, so
 * stacked controls space themselves and a consumer's own `gap-*` replaces the
 * default cleanly. At `md` and up it takes the grid's second column; below the
 * breakpoint it stacks under the header.
 *
 * | Data Attribute | Value            | Description                                                        |
 * | -------------- | ---------------- | ------------------------------------------------------------------ |
 * | `data-slot`    | `"parfait-body"` | Stable styling hook. Survives `className` overrides and `asChild`. |
 *
 * @see https://mantle.ngrok.com/components/structure/parfait#parfaitbody
 *
 * @example
 * ```tsx
 * <Parfait.Root>
 *   <Parfait.Section>
 *     <Parfait.Header>
 *       <Parfait.Title>Providers</Parfait.Title>
 *       <Parfait.Description>What providers keys may call.</Parfait.Description>
 *     </Parfait.Header>
 *     <Parfait.Body>
 *       <ProviderScopePicker />
 *     </Parfait.Body>
 *   </Parfait.Section>
 *   <Parfait.Section>
 *     <Parfait.Header>
 *       <Parfait.Title>Routing rules</Parfait.Title>
 *       <Parfait.Description>Define how requests are authenticated.</Parfait.Description>
 *     </Parfait.Header>
 *     <Parfait.Body>
 *       <RoutingRuleList />
 *     </Parfait.Body>
 *   </Parfait.Section>
 * </Parfait.Root>
 * ```
 */
const Body = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	...props
}: ComponentProps<"div"> & WithAsChild & WithDataSlot) => {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			data-slot={joinDataSlot(dataSlot, "parfait-body")}
			className={cx("flex flex-col gap-4", className)}
			{...props}
		>
			{children}
		</Comp>
	);
};

/**
 * A page of titled sections, each one explained beside its content. Every
 * section pairs a `Parfait.Header` — its `Title` and `Description` — with a
 * `Parfait.Body` of controls. `Parfait.Root` stacks the sections with a
 * hairline between them. Below the `md` breakpoint the header stacks above its
 * own content, so the pairing survives a narrow viewport. It is the shape of a
 * settings page, a resource configuration editor, and any form long enough that
 * each group needs its own explanation.
 *
 * It owns structure only — the grid, the rhythm, and the rules between sections.
 * Reach for [Card](https://mantle.ngrok.com/components/structure/card) when a
 * group needs a raised surface of its own, for
 * [MediaObject](https://mantle.ngrok.com/components/structure/media-object)
 * when the thing beside the text is an image or an icon, and for
 * [DescriptionList](https://mantle.ngrok.com/components/data-display/description-list)
 * when the pairs are read-only term/value data rather than headed sections.
 *
 * @see https://mantle.ngrok.com/components/structure/parfait
 *
 * @example
 * Composition:
 * ```
 * Parfait.Root
 * └── Parfait.Section
 *     ├── Parfait.Header
 *     │   ├── Parfait.Title
 *     │   └── Parfait.Description
 *     └── Parfait.Body
 * ```
 *
 * @example
 * ```tsx
 * <Parfait.Root>
 *   <Parfait.Section>
 *     <Parfait.Header>
 *       <Parfait.Title>Providers</Parfait.Title>
 *       <Parfait.Description>What providers keys may call.</Parfait.Description>
 *     </Parfait.Header>
 *     <Parfait.Body>
 *       <ProviderScopePicker />
 *     </Parfait.Body>
 *   </Parfait.Section>
 *   <Parfait.Section>
 *     <Parfait.Header>
 *       <Parfait.Title>Routing rules</Parfait.Title>
 *       <Parfait.Description>Define how requests are authenticated.</Parfait.Description>
 *     </Parfait.Header>
 *     <Parfait.Body>
 *       <RoutingRuleList />
 *     </Parfait.Body>
 *   </Parfait.Section>
 * </Parfait.Root>
 * ```
 */
const Parfait = {
	/**
	 * The stack of sections. Renders a `<div>` with `divide-card-muted divide-y`,
	 * so a hairline falls between adjacent `Section` children and never above the
	 * first or below the last. Vertical rhythm belongs to `Section`
	 * (`py-8 first:pt-0`) rather than here, which keeps a lone `Section` usable
	 * without a `Root` around it. Set `--parfait-columns` on `Root` to re-split
	 * every section at once.
	 *
	 * | Data Attribute | Value       | Description                                                        |
	 * | -------------- | ----------- | ------------------------------------------------------------------ |
	 * | `data-slot`    | `"parfait"` | Stable styling hook. Survives `className` overrides and `asChild`. |
	 *
	 * @see https://mantle.ngrok.com/components/structure/parfait#parfaitroot
	 *
	 * @example
	 * ```tsx
	 * <Parfait.Root>
	 *   <Parfait.Section>
	 *     <Parfait.Header>
	 *       <Parfait.Title>Providers</Parfait.Title>
	 *       <Parfait.Description>What providers keys may call.</Parfait.Description>
	 *     </Parfait.Header>
	 *     <Parfait.Body>
	 *       <ProviderScopePicker />
	 *     </Parfait.Body>
	 *   </Parfait.Section>
	 *   <Parfait.Section>
	 *     <Parfait.Header>
	 *       <Parfait.Title>Routing rules</Parfait.Title>
	 *       <Parfait.Description>Define how requests are authenticated.</Parfait.Description>
	 *     </Parfait.Header>
	 *     <Parfait.Body>
	 *       <RoutingRuleList />
	 *     </Parfait.Body>
	 *   </Parfait.Section>
	 * </Parfait.Root>
	 * ```
	 */
	Root,
	/**
	 * One titled band of the page. Renders a `<section>` that stacks `Header`
	 * above `Body` below the `md` breakpoint, then splits the two into a
	 * `1fr 2fr` grid at `md` and up, and carries its own vertical rhythm
	 * (`py-8 first:pt-0`). It takes no accessible name, which keeps it generic in
	 * the accessibility tree instead of adding one `region` landmark per band —
	 * the `Title` headings already carry the page outline. Set `aria-labelledby`
	 * to the `Title`'s `id` only when the section is a destination a reader jumps
	 * back to, not merely a division of the page. To tell apart controls that read
	 * alike across two sections, reach for `Field.Set` and `Field.Legend` instead
	 * — assistive technology announces a landmark on entry, never per control.
	 *
	 * | CSS Variable        | Default   | Description                                                                                                            |
	 * | ------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------- |
	 * | `--parfait-columns` | `1fr 2fr` | The `grid-template-columns` value at `md` and up. Set it on `Root` to re-split every section, or here for this section alone. |
	 *
	 * | Data Attribute | Value               | Description                                                        |
	 * | -------------- | ------------------- | ------------------------------------------------------------------ |
	 * | `data-slot`    | `"parfait-section"` | Stable styling hook. Survives `className` overrides and `asChild`. |
	 *
	 * @see https://mantle.ngrok.com/components/structure/parfait#parfaitsection
	 *
	 * @example
	 * ```tsx
	 * <Parfait.Root>
	 *   <Parfait.Section>
	 *     <Parfait.Header>
	 *       <Parfait.Title>Providers</Parfait.Title>
	 *       <Parfait.Description>What providers keys may call.</Parfait.Description>
	 *     </Parfait.Header>
	 *     <Parfait.Body>
	 *       <ProviderScopePicker />
	 *     </Parfait.Body>
	 *   </Parfait.Section>
	 *   <Parfait.Section>
	 *     <Parfait.Header>
	 *       <Parfait.Title>Routing rules</Parfait.Title>
	 *       <Parfait.Description>Define how requests are authenticated.</Parfait.Description>
	 *     </Parfait.Header>
	 *     <Parfait.Body>
	 *       <RoutingRuleList />
	 *     </Parfait.Body>
	 *   </Parfait.Section>
	 * </Parfait.Root>
	 * ```
	 */
	Section,
	/**
	 * A section's introductory column — its `Title` and `Description`. Renders a
	 * `<header>` with `flex flex-col gap-2`, so anything else composed in picks
	 * up the same spacing. At `md` and up it takes the grid's first column; below
	 * the breakpoint it stacks above `Body`. Nested inside `Section`'s
	 * `<section>`, a `<header>` is not the `banner` landmark, so a page carries
	 * as many as it has sections.
	 *
	 * | Data Attribute | Value              | Description                                                        |
	 * | -------------- | ------------------ | ------------------------------------------------------------------ |
	 * | `data-slot`    | `"parfait-header"` | Stable styling hook. Survives `className` overrides and `asChild`. |
	 *
	 * @see https://mantle.ngrok.com/components/structure/parfait#parfaitheader
	 *
	 * @example
	 * ```tsx
	 * <Parfait.Root>
	 *   <Parfait.Section>
	 *     <Parfait.Header>
	 *       <Parfait.Title>Providers</Parfait.Title>
	 *       <Parfait.Description>What providers keys may call.</Parfait.Description>
	 *     </Parfait.Header>
	 *     <Parfait.Body>
	 *       <ProviderScopePicker />
	 *     </Parfait.Body>
	 *   </Parfait.Section>
	 *   <Parfait.Section>
	 *     <Parfait.Header>
	 *       <Parfait.Title>Routing rules</Parfait.Title>
	 *       <Parfait.Description>Define how requests are authenticated.</Parfait.Description>
	 *     </Parfait.Header>
	 *     <Parfait.Body>
	 *       <RoutingRuleList />
	 *     </Parfait.Body>
	 *   </Parfait.Section>
	 * </Parfait.Root>
	 * ```
	 */
	Header,
	/**
	 * The section's heading. Renders an `<h2>`, one level below the page's
	 * `<h1>`, because a `Section` is a top-level division of its page. Compose
	 * `asChild` with the right element when a page nests its sections deeper —
	 * heading level is document structure, so mantle does not guess it.
	 *
	 * | Data Attribute | Value             | Description                                                        |
	 * | -------------- | ----------------- | ------------------------------------------------------------------ |
	 * | `data-slot`    | `"parfait-title"` | Stable styling hook. Survives `className` overrides and `asChild`. |
	 *
	 * @see https://mantle.ngrok.com/components/structure/parfait#parfaittitle
	 *
	 * @example
	 * ```tsx
	 * <Parfait.Root>
	 *   <Parfait.Section>
	 *     <Parfait.Header>
	 *       <Parfait.Title>Providers</Parfait.Title>
	 *       <Parfait.Description>What providers keys may call.</Parfait.Description>
	 *     </Parfait.Header>
	 *     <Parfait.Body>
	 *       <ProviderScopePicker />
	 *     </Parfait.Body>
	 *   </Parfait.Section>
	 *   <Parfait.Section>
	 *     <Parfait.Header>
	 *       <Parfait.Title>Routing rules</Parfait.Title>
	 *       <Parfait.Description>Define how requests are authenticated.</Parfait.Description>
	 *     </Parfait.Header>
	 *     <Parfait.Body>
	 *       <RoutingRuleList />
	 *     </Parfait.Body>
	 *   </Parfait.Section>
	 * </Parfait.Root>
	 * ```
	 */
	Title,
	/**
	 * The sentence that says what the section's controls do, and what changing
	 * them costs. Renders a `<p>` in muted body text beneath `Title`. Optional —
	 * a section whose title says everything may omit it.
	 *
	 * | Data Attribute | Value                   | Description                                                        |
	 * | -------------- | ----------------------- | ------------------------------------------------------------------ |
	 * | `data-slot`    | `"parfait-description"` | Stable styling hook. Survives `className` overrides and `asChild`. |
	 *
	 * @see https://mantle.ngrok.com/components/structure/parfait#parfaitdescription
	 *
	 * @example
	 * ```tsx
	 * <Parfait.Root>
	 *   <Parfait.Section>
	 *     <Parfait.Header>
	 *       <Parfait.Title>Providers</Parfait.Title>
	 *       <Parfait.Description>What providers keys may call.</Parfait.Description>
	 *     </Parfait.Header>
	 *     <Parfait.Body>
	 *       <ProviderScopePicker />
	 *     </Parfait.Body>
	 *   </Parfait.Section>
	 *   <Parfait.Section>
	 *     <Parfait.Header>
	 *       <Parfait.Title>Routing rules</Parfait.Title>
	 *       <Parfait.Description>Define how requests are authenticated.</Parfait.Description>
	 *     </Parfait.Header>
	 *     <Parfait.Body>
	 *       <RoutingRuleList />
	 *     </Parfait.Body>
	 *   </Parfait.Section>
	 * </Parfait.Root>
	 * ```
	 */
	Description,
	/**
	 * The section's content column — the controls, cards, or table that `Header`
	 * describes. Renders a `<div>` with `flex flex-col gap-4`, so stacked
	 * controls space themselves and a consumer's own `gap-*` replaces the default
	 * cleanly. At `md` and up it takes the grid's second column; below the
	 * breakpoint it stacks under the header.
	 *
	 * | Data Attribute | Value            | Description                                                        |
	 * | -------------- | ---------------- | ------------------------------------------------------------------ |
	 * | `data-slot`    | `"parfait-body"` | Stable styling hook. Survives `className` overrides and `asChild`. |
	 *
	 * @see https://mantle.ngrok.com/components/structure/parfait#parfaitbody
	 *
	 * @example
	 * ```tsx
	 * <Parfait.Root>
	 *   <Parfait.Section>
	 *     <Parfait.Header>
	 *       <Parfait.Title>Providers</Parfait.Title>
	 *       <Parfait.Description>What providers keys may call.</Parfait.Description>
	 *     </Parfait.Header>
	 *     <Parfait.Body>
	 *       <ProviderScopePicker />
	 *     </Parfait.Body>
	 *   </Parfait.Section>
	 *   <Parfait.Section>
	 *     <Parfait.Header>
	 *       <Parfait.Title>Routing rules</Parfait.Title>
	 *       <Parfait.Description>Define how requests are authenticated.</Parfait.Description>
	 *     </Parfait.Header>
	 *     <Parfait.Body>
	 *       <RoutingRuleList />
	 *     </Parfait.Body>
	 *   </Parfait.Section>
	 * </Parfait.Root>
	 * ```
	 */
	Body,
} as const;

export {
	//,
	Parfait,
};
