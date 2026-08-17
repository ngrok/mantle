import { Children, cloneElement, type ComponentProps, isValidElement, type ReactNode } from "react";
import invariant from "tiny-invariant";
import type { WithAsChild } from "../../types/index.js";
import { cx } from "../../utils/cx/cx.js";
import { joinDataSlot, type WithDataSlot } from "../../utils/data-slot.js";
import { Slot } from "../slot/index.js";

/**
 * The stubbed marker silhouettes, in a `0 0 40 50` viewBox: a circle of `r=20`
 * at `(20,25)`, plus the 4-wide stubs that run to the edges at `x=18..22`. Each
 * stub flares into the circle through cubic Bézier fillets, so the junction
 * reads as one liquid shape rather than a butt joint. An only step needs no
 * stub, and takes the plain `<circle>` below instead.
 */
const SILHOUETTE = {
	/** Circle, with the stub that runs down to the next step. */
	first:
		"M26.418 43.948C23.983 44.772 22 46.86 22 49.43V50h-4v-.57c0-2.57-1.983-4.658-4.418-5.482C5.685 41.274 0 33.801 0 25 0 13.954 8.954 5 20 5s20 8.954 20 20c0 8.801-5.685 16.274-13.582 18.948Z",
	/** Circle, with both stubs. */
	middle:
		"M18 .57V0h4v.57c0 2.57 1.983 4.658 4.418 5.482C34.315 8.726 40 16.199 40 25s-5.685 16.274-13.582 18.948C23.983 44.772 22 46.86 22 49.43V50h-4v-.57c0-2.57-1.983-4.658-4.418-5.482C5.685 41.274 0 33.801 0 25S5.685 8.726 13.582 6.052C16.017 5.228 18 3.14 18 .57Z",
	/** Circle, with the stub that runs up to the step above. */
	last: "M18 0v.57c0 2.57-1.983 4.658-4.418 5.482C5.685 8.726 0 16.199 0 25c0 11.046 8.954 20 20 20s20-8.954 20-20c0-8.801-5.685-16.274-13.582-18.948C23.983 5.228 22 3.14 22 .57V0h-4Z",
} as const;

/**
 * The numbered marker for one step: the blob, and the number the CSS counter
 * writes into it.
 *
 * The `<ol>` already announces the step's position. `aria-hidden` keeps the
 * visible number out of that announcement, so a reader hears one number rather
 * than two that can disagree. The number is generated content, so no text node
 * exists for a translation engine to reach.
 *
 * Positioning: the box sits `22px` before the item's padding box, which is
 * `18px` before its border box — the offset that lands the stubs on the item's
 * `4px` rail. Same color plus that overlap is what makes the pair read as one
 * continuous stick. The two are exact at a 16px root font size, and within half
 * a pixel of each other at every other size, because a border rounds to whole
 * pixels and the SVG stub does not.
 */
const StepMarker = () => (
	<div
		aria-hidden="true"
		data-slot="steps-marker"
		className={cx(
			"pointer-events-none absolute -top-1.5 -start-5.5 h-12.5 w-10 select-none",
			// The number covers the circle, which spans y 5..45 of the 50-tall box.
			"after:absolute after:inset-x-0 after:top-1.25 after:grid after:h-10 after:place-items-center",
			// tabular-nums keeps 1 and 8 the same width, so a double-digit step stays
			// centered in the circle. It sets a font feature, never the family.
			// The forced-colors pair keeps the number legible once the blob is forced
			// to CanvasText, which the svg below opts into for the same reason.
			"after:text-steps-number after:text-lg after:font-medium after:tabular-nums",
			"forced-colors:after:text-[Canvas]",
			// The counter is generated content, so it is neither a text node a
			// translation engine can reach nor a node React ever moves.
			"after:content-[counter(mantle-steps)]",
		)}
	>
		{/* Why the forced-colors pair: Windows High Contrast forces `border-color`
		    and `color` but leaves SVG `fill` alone, which would split the rail and
		    the blob into two colors and put the joint back. */}
		<svg
			viewBox="0 0 40 50"
			className="fill-steps-rail forced-colors:fill-[CanvasText] absolute inset-0 size-full"
		>
			{/* Each silhouette states its whole position, so no two ever both match
			    and no cascade order decides which one paints. Why the `>*>svg` tail:
			    a plain group variant is a descendant selector, so a guide nested
			    inside a step would read its position off the outer step too. */}
			<path
				className="hidden group-[&:first-child:not(:only-child)>*>svg]/steps-item:block"
				d={SILHOUETTE.first}
			/>
			<path
				className="hidden group-[&:not(:first-child):not(:last-child)>*>svg]/steps-item:block"
				d={SILHOUETTE.middle}
			/>
			<path
				className="hidden group-[&:last-child:not(:only-child)>*>svg]/steps-item:block"
				d={SILHOUETTE.last}
			/>
			<circle
				className="hidden group-[&:only-child>*>svg]/steps-item:block"
				cx="20"
				cy="25"
				r="20"
			/>
		</svg>
	</div>
);

/**
 * The wrapper the step's own children render into. It lays out nothing —
 * `display: contents` hands every child straight back to the item.
 *
 * Why it exists: the marker would otherwise be a sibling of a lone text child,
 * which is what turns React's safe `setTextContent` write into a per-node
 * `removeChild`. Under a browser translation engine that node has been
 * reparented into a `<font>`, so the removal throws and the page goes blank.
 *
 * Why a `<div>`: a step's children are flow content — a heading, a paragraph, a
 * `Card` — and a `<span>` takes phrasing content only. The box never renders
 * either way, so the element that validates is free.
 *
 * @see CONVENTIONS.md § Browser Translation
 */
const StepContent = ({ children }: { children: ReactNode }) => (
	<div data-slot="steps-item-content" className="contents">
		{children}
	</div>
);

/**
 * Props for `Steps.Root`. Every `<ol>` attribute except `role`, which the part
 * owns: the guide's whole accessible contract is that it stays a list, so a
 * value here could only take that away.
 *
 * @see https://mantle.ngrok.com/components/structure/steps#stepsroot
 *
 * @example
 * ```tsx
 * <Steps.Root className="max-w-xl">
 *   <Steps.Item>
 *     <Steps.Title>Install the ngrok agent</Steps.Title>
 *   </Steps.Item>
 * </Steps.Root>
 * ```
 */
type StepsRootProps = Omit<ComponentProps<"ol">, "role"> & WithAsChild & WithDataSlot;

/**
 * The ordered list every step hangs off. Renders an `<ol role="list">` that
 * resets the step counter and opens the gutter the markers sit in.
 *
 * It restates `role="list"` because the design strips `list-style`, and WebKit
 * drops list semantics from a list that has none — which would take the "2 of
 * 3" position with it. Two mechanisms hold the role, and both are load-bearing:
 * `StepsRootProps` omits `role`, so nothing can pass one; and under `asChild`
 * the role is cloned onto the child, because `Slot` merges a child's props over
 * the slot's own.
 *
 * Composition order is the numbering. The number is a CSS counter, so `start`
 * and `reversed` move the native marker this component hides, not the number a
 * reader sees.
 *
 * `Steps.Root` paints with two design tokens. Both resolve per theme, so
 * override them only to re-theme the rail, and override both together — the
 * number has to stay readable on the fill.
 *
 * | CSS Variable            | Default                                                                  | Description                                                                                      |
 * | ----------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
 * | `--color-steps-rail`    | `var(--color-neutral-300)`; `var(--color-black)` in the high-contrast themes | The rail and the marker blob. Must stay opaque — a translucent fill seams where the two overlap. |
 * | `--color-steps-number`  | `var(--color-neutral-950)`; `var(--color-white)` in the high-contrast themes | The number painted on the blob.                                                                 |
 *
 * | Data Attribute | Value     | Description                                                                                    |
 * | -------------- | --------- | ------------------------------------------------------------------------------------------------ |
 * | `data-slot`    | `"steps"` | On the list element. Stable styling hook that survives a `className` override or an `asChild` swap. |
 *
 * @see https://mantle.ngrok.com/components/structure/steps#stepsroot
 *
 * @example
 * ```tsx
 * <Steps.Root>
 *   <Steps.Item>
 *     <Steps.Title>Install the ngrok agent</Steps.Title>
 *     <p>Download the agent for your platform.</p>
 *   </Steps.Item>
 *   <Steps.Item>
 *     <Steps.Title asChild>
 *       <h2>Add your authtoken</h2>
 *     </Steps.Title>
 *     <p>Run ngrok config add-authtoken with the token from your dashboard.</p>
 *   </Steps.Item>
 *   <Steps.Item>
 *     <Steps.Title>Get a public URL for your app</Steps.Title>
 *     <p>Start a tunnel to the port your app listens on.</p>
 *   </Steps.Item>
 * </Steps.Root>
 * ```
 */
const Root = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	ref,
	...props
}: StepsRootProps) => {
	const Comp = asChild ? Slot : "ol";
	// Slot merges child props over slot props, so with asChild the role has to
	// land on the child element itself to stay un-overridable.
	const content =
		asChild && isValidElement<ComponentProps<"ol">>(children)
			? cloneElement(children, { role: "list" })
			: children;

	return (
		<Comp
			ref={ref}
			data-slot={joinDataSlot(dataSlot, "steps")}
			className={cx(
				// The gutter keeps the marker inside the list box, so an ancestor
				// that clips overflow cannot cut it off.
				"list-none ps-4.5 [counter-reset:mantle-steps]",
				className,
			)}
			{...props}
			// Why stamped, and why after the spread: `list-style: none` costs a
			// WebKit reader the list semantics, and those semantics are the only
			// numbering it gets. `StepsRootProps` omits `role`, so the spread cannot
			// carry one — this holds even when a wider props object does.
			role="list"
		>
			{content}
		</Comp>
	);
};

/**
 * Props for `Steps.Item`. Every `<li>` attribute, plus `asChild` — whose child
 * must itself render an `<li>`.
 *
 * @see https://mantle.ngrok.com/components/structure/steps#stepsitem
 *
 * @example
 * ```tsx
 * <Steps.Root>
 *   <Steps.Item className="pb-6">
 *     <Steps.Title>Install the ngrok agent</Steps.Title>
 *   </Steps.Item>
 * </Steps.Root>
 * ```
 */
type StepsItemProps = ComponentProps<"li"> & WithAsChild & WithDataSlot;

/**
 * One step. Renders an `<li>` that increments the step counter, draws its own
 * segment of the rail, and mounts the numbered marker ahead of its children.
 *
 * The rail is this item's `border-inline-start`, not a drawn line: a border
 * spans the item however tall its content grows, and the bottom padding sits
 * inside the border box, so the rail runs through the gap to the next step as
 * well. The last item keeps the width and drops the color, so removing a step
 * shifts nothing.
 *
 * Under `asChild` the child must render an `<li>` — anything else between the
 * `<ol>` and its items is invalid HTML, and `:first-child` / `:last-child` stop
 * describing the step.
 *
 * | Data Attribute | Value                   | Description                                                                                                     |
 * | -------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
 * | `data-slot`    | `"steps-item"`          | On the list item. Stable styling hook that survives a `className` override or an `asChild` swap.                |
 * | `data-slot`    | `"steps-marker"`        | On the `aria-hidden` marker in the gutter. Target it to hide the marker column, as the responsive recipe does.   |
 * | `data-slot`    | `"steps-item-content"`  | On the `display: contents` wrapper the step's own children render into. It lays out nothing — style your child. |
 *
 * @see https://mantle.ngrok.com/components/structure/steps#stepsitem
 *
 * @example
 * ```tsx
 * <Steps.Root>
 *   <Steps.Item>
 *     <Steps.Title>Install the ngrok agent</Steps.Title>
 *     <p>Download the agent for your platform.</p>
 *   </Steps.Item>
 *   <Steps.Item>
 *     <Steps.Title asChild>
 *       <h2>Add your authtoken</h2>
 *     </Steps.Title>
 *     <p>Run ngrok config add-authtoken with the token from your dashboard.</p>
 *   </Steps.Item>
 *   <Steps.Item>
 *     <Steps.Title>Get a public URL for your app</Steps.Title>
 *     <p>Start a tunnel to the port your app listens on.</p>
 *   </Steps.Item>
 * </Steps.Root>
 * ```
 */
const Item = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	ref,
	...props
}: StepsItemProps) => {
	const itemProps = {
		"data-slot": joinDataSlot(dataSlot, "steps-item"),
		// Why the rail width is a rem and not `border-s-4`: the marker scales with
		// the root font size, and a stub wider or narrower than the border it lands
		// on puts a step in the goo.
		className: cx(
			"group/steps-item border-s-steps-rail relative border-s-[0.25rem] pt-1.5 pb-10 ps-8.5",
			"[counter-increment:mantle-steps]",
			// The width stays so the content keeps its indent; only the color goes.
			"last:border-s-transparent",
			className,
		),
		...props,
	};

	if (asChild) {
		invariant(
			isValidElement<{ children?: ReactNode }>(children) && Children.only(children),
			"When using `asChild`, Steps.Item must be passed a single child as a JSX tag.",
		);

		return (
			<Slot ref={ref} {...itemProps}>
				{cloneElement(
					children,
					{},
					<>
						<StepMarker />
						<StepContent>{children.props.children}</StepContent>
					</>,
				)}
			</Slot>
		);
	}

	return (
		<li ref={ref} {...itemProps}>
			<StepMarker />
			<StepContent>{children}</StepContent>
		</li>
	);
};

/**
 * Props for `Steps.Title`. Every heading attribute, plus `asChild` for fitting
 * the surrounding document outline.
 *
 * @see https://mantle.ngrok.com/components/structure/steps#stepstitle
 *
 * @example
 * ```tsx
 * <Steps.Root>
 *   <Steps.Item>
 *     <Steps.Title asChild>
 *       <h2>Install the ngrok agent</h2>
 *     </Steps.Title>
 *   </Steps.Item>
 * </Steps.Root>
 * ```
 */
type StepsTitleProps = ComponentProps<"h3"> & WithAsChild & WithDataSlot;

/**
 * The heading of one step, and what the marker aligns to. Renders an `h3` by
 * default — pass `asChild` to fit the surrounding document outline. Keep it a
 * heading element (`h1`-`h6`) for accessibility.
 *
 * The marker sits at a fixed offset from the top of the item, so keep the title
 * the item's first child at the default type size.
 *
 * | Data Attribute | Value           | Description                                                                                       |
 * | -------------- | --------------- | --------------------------------------------------------------------------------------------------- |
 * | `data-slot`    | `"steps-title"` | On the heading element. Stable styling hook that survives a `className` override or an `asChild` swap. |
 *
 * @see https://mantle.ngrok.com/components/structure/steps#stepstitle
 *
 * @example
 * ```tsx
 * <Steps.Root>
 *   <Steps.Item>
 *     <Steps.Title>Install the ngrok agent</Steps.Title>
 *     <p>Download the agent for your platform.</p>
 *   </Steps.Item>
 *   <Steps.Item>
 *     <Steps.Title asChild>
 *       <h2>Add your authtoken</h2>
 *     </Steps.Title>
 *     <p>Run ngrok config add-authtoken with the token from your dashboard.</p>
 *   </Steps.Item>
 *   <Steps.Item>
 *     <Steps.Title>Get a public URL for your app</Steps.Title>
 *     <p>Start a tunnel to the port your app listens on.</p>
 *   </Steps.Item>
 * </Steps.Root>
 * ```
 */
const Title = ({ asChild, className, "data-slot": dataSlot, ref, ...props }: StepsTitleProps) => {
	const Comp = asChild ? Slot : "h3";

	return (
		<Comp
			ref={ref}
			data-slot={joinDataSlot(dataSlot, "steps-title")}
			className={cx("text-strong mb-3 text-lg font-medium", className)}
			{...props}
		/>
	);
};

/**
 * A read-only setup guide: an ordered list of steps down a page, each marked by
 * a numbered circle in a left gutter, joined by one continuous vertical rail.
 * Every step stays visible, and nothing is interactive.
 *
 * Composition order is the numbering. The number is a CSS counter and the
 * marker's silhouette comes from `:first-child` / `:last-child` / `:only-child`,
 * so inserting, removing, or conditionally rendering a step renumbers the rest
 * natively — correct on the server-rendered first paint, with no effect, no
 * registration, and no index to keep in sync.
 *
 * The markers are `aria-hidden` decoration. Step position comes from the
 * `<ol>`, which is what a screen reader announces as "2 of 3".
 *
 * For one panel at a time, where a reader clicks a step to reveal it, reach for
 * [Tabs](https://mantle.ngrok.com/components/navigation/tabs) — that intent
 * carries tab semantics and a keyboard contract this component has none of. For
 * a step that collapses, reach for
 * [Accordion](https://mantle.ngrok.com/components/data-display/accordion).
 *
 * @see https://mantle.ngrok.com/components/structure/steps
 *
 * @example
 * Composition:
 * ```
 * Steps.Root
 * └── Steps.Item
 *     └── Steps.Title
 * ```
 *
 * @example
 * ```tsx
 * <Steps.Root>
 *   <Steps.Item>
 *     <Steps.Title>Install the ngrok agent</Steps.Title>
 *     <p>Download the agent for your platform.</p>
 *   </Steps.Item>
 *   <Steps.Item>
 *     <Steps.Title asChild>
 *       <h2>Add your authtoken</h2>
 *     </Steps.Title>
 *     <p>Run ngrok config add-authtoken with the token from your dashboard.</p>
 *   </Steps.Item>
 *   <Steps.Item>
 *     <Steps.Title>Get a public URL for your app</Steps.Title>
 *     <p>Start a tunnel to the port your app listens on.</p>
 *   </Steps.Item>
 * </Steps.Root>
 * ```
 */
const Steps = {
	/**
	 * The ordered list every step hangs off. Renders an `<ol role="list">` that
	 * resets the step counter and opens the gutter the markers sit in.
	 *
	 * @see https://mantle.ngrok.com/components/structure/steps#stepsroot
	 *
	 * @example
	 * ```tsx
	 * <Steps.Root>
	 *   <Steps.Item>
	 *     <Steps.Title>Install the ngrok agent</Steps.Title>
	 *     <p>Download the agent for your platform.</p>
	 *   </Steps.Item>
	 *   <Steps.Item>
	 *     <Steps.Title asChild>
	 *       <h2>Add your authtoken</h2>
	 *     </Steps.Title>
	 *     <p>Run ngrok config add-authtoken with the token from your dashboard.</p>
	 *   </Steps.Item>
	 *   <Steps.Item>
	 *     <Steps.Title>Get a public URL for your app</Steps.Title>
	 *     <p>Start a tunnel to the port your app listens on.</p>
	 *   </Steps.Item>
	 * </Steps.Root>
	 * ```
	 */
	Root,
	/**
	 * One step. Renders an `<li>` that increments the step counter, draws its own
	 * segment of the rail, and mounts the numbered marker ahead of its children.
	 *
	 * @see https://mantle.ngrok.com/components/structure/steps#stepsitem
	 *
	 * @example
	 * ```tsx
	 * <Steps.Root>
	 *   <Steps.Item>
	 *     <Steps.Title>Install the ngrok agent</Steps.Title>
	 *     <p>Download the agent for your platform.</p>
	 *   </Steps.Item>
	 *   <Steps.Item>
	 *     <Steps.Title asChild>
	 *       <h2>Add your authtoken</h2>
	 *     </Steps.Title>
	 *     <p>Run ngrok config add-authtoken with the token from your dashboard.</p>
	 *   </Steps.Item>
	 *   <Steps.Item>
	 *     <Steps.Title>Get a public URL for your app</Steps.Title>
	 *     <p>Start a tunnel to the port your app listens on.</p>
	 *   </Steps.Item>
	 * </Steps.Root>
	 * ```
	 */
	Item,
	/**
	 * The heading of one step, and what the marker aligns to. Renders an `h3` by
	 * default — pass `asChild` to fit the surrounding document outline.
	 *
	 * @see https://mantle.ngrok.com/components/structure/steps#stepstitle
	 *
	 * @example
	 * ```tsx
	 * <Steps.Root>
	 *   <Steps.Item>
	 *     <Steps.Title>Install the ngrok agent</Steps.Title>
	 *     <p>Download the agent for your platform.</p>
	 *   </Steps.Item>
	 *   <Steps.Item>
	 *     <Steps.Title asChild>
	 *       <h2>Add your authtoken</h2>
	 *     </Steps.Title>
	 *     <p>Run ngrok config add-authtoken with the token from your dashboard.</p>
	 *   </Steps.Item>
	 *   <Steps.Item>
	 *     <Steps.Title>Get a public URL for your app</Steps.Title>
	 *     <p>Start a tunnel to the port your app listens on.</p>
	 *   </Steps.Item>
	 * </Steps.Root>
	 * ```
	 */
	Title,
} as const;

export {
	//,
	Steps,
};

export type {
	//,
	StepsItemProps,
	StepsRootProps,
	StepsTitleProps,
};
