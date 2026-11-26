import { Children, cloneElement, type ComponentProps, isValidElement, type ReactNode } from "react";
import invariant from "tiny-invariant";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import { joinDataSlot, type WithDataSlot } from "../../utils/data-slot.js";
import { Slot } from "../slot/index.js";

/**
 * The stubbed marker silhouettes, in a `0 0 40 50` viewBox: a circle of `r=20`
 * at `(20,25)`, plus the 4-wide stubs that run to the edges at `x=18..22`. Each
 * stub flares into the circle through cubic Bézier fillets, so the junction
 * reads as one liquid shape and not as a butt joint. An only step needs no
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
 * The numbered marker for one step: the blob, and the number that the CSS
 * counter writes into it.
 *
 * The `<ol>` already announces the step's position. `aria-hidden` keeps the
 * visible number out of that announcement, so a reader hears one number and
 * not two that can disagree. The number is generated content, so no text node
 * exists for a translation engine to reach.
 *
 * Positioning: the box sits `22px` before the item's padding box, which is
 * `18px` before its border box. That offset lands the stubs on the item's
 * `4px` rail, and the same color plus that overlap makes the pair read as one
 * continuous stick. The two are exact at a 16px root font size, and within half
 * a pixel at each other size, because a border rounds to whole pixels and the
 * SVG stub does not.
 */
const StepMarker = () => (
	<div
		aria-hidden="true"
		data-slot="steps-marker"
		className={cx(
			"pointer-events-none absolute -top-1.5 -inset-s-5.5 h-12.5 w-10 select-none",
			// The number covers the circle, which spans y 5..45 of the 50-tall box.
			"after:absolute after:inset-x-0 after:top-1.25 after:grid after:h-10 after:place-items-center",
			// Why tabular-nums: 1 and 8 take the same width, so a double-digit step stays
			// centered. The forced-colors pair keeps the number legible on the forced blob.
			"after:text-steps-number after:text-lg after:font-medium after:tabular-nums",
			"forced-colors:after:text-[Canvas]",
			// Why: forced colors draw a Canvas backplate behind text, which hides a
			// Canvas number on the CanvasText blob.
			"forced-colors:after:forced-color-adjust-none",
			// The counter is generated content, so it is not a text node that a
			// translation engine can reach or that React moves.
			"after:content-[counter(mantle-steps)]",
		)}
	>
		{/* Why the forced-colors pair: Windows High Contrast forces `border-color`
		    and `color` but not SVG `fill`, so the rail and the blob would split
		    into two colors and show the joint. */}
		<svg
			viewBox="0 0 40 50"
			className="fill-steps-rail forced-colors:fill-[CanvasText] absolute inset-0 size-full"
		>
			{/* Each shape reads one display value that its own item sets, so a guide
			    nested inside a step reads its own position and not the outer one. */}
			<path className="[display:var(--_steps-first)]" d={SILHOUETTE.first} />
			<path className="[display:var(--_steps-middle)]" d={SILHOUETTE.middle} />
			<path className="[display:var(--_steps-last)]" d={SILHOUETTE.last} />
			<circle className="[display:var(--_steps-only)]" cx="20" cy="25" r="20" />
		</svg>
	</div>
);

/**
 * The label slot that the step's own children render into. It lays out
 * nothing: `display: contents` gives each child back to the item.
 *
 * Why it exists: without it, the marker is a sibling of a lone text child, and
 * React then removes that text node by itself instead of with one
 * `textContent` write. A translation engine moves the node into a `<font>`, so
 * the removal throws and the page goes blank.
 *
 * Why a `<div>`: a step's children are flow content (a heading, a paragraph, a
 * `Card`), and a `<span>` takes phrasing content only. The box never renders,
 * so the element that validates costs nothing.
 *
 * @see https://mantle.ngrok.com/browser-translation
 */
const StepLabel = ({ children }: { children: ReactNode }) => (
	<div data-slot="steps-item-label" className="contents">
		{children}
	</div>
);

/**
 * Props for `Steps.Root`. Every `<ol>` attribute except three:
 * - `role`: the part owns it, because the guide's accessible contract is that
 *   it stays a list.
 * - `start` and `reversed`: the visible number is a CSS counter that always
 *   counts up from 1, so these would make the list's own numbering disagree
 *   with the numbers a reader sees.
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
type StepsRootProps = Omit<ComponentProps<"ol">, "role" | "start" | "reversed"> &
	WithAsChild &
	WithDataSlot;

/**
 * The ordered list that holds every step. Renders an `<ol role="list">` that
 * resets the step counter and opens the gutter that the markers sit in.
 *
 * It restates `role="list"` because the design removes `list-style`, and
 * WebKit drops list semantics from a list that has none. That would also drop
 * the "2 of 3" position. Two mechanisms keep the role:
 * - `StepsRootProps` omits `role`, so a caller cannot pass one.
 * - Under `asChild`, the part clones the role onto the child, because `Slot`
 *   merges a child's props over the slot's own.
 *
 * Composition order is the numbering. The number is a CSS counter that counts
 * up from 1, so `StepsRootProps` omits `start` and `reversed`.
 *
 * `Steps.Root` paints with two design tokens. Each theme sets both, so
 * override them only to re-theme the rail, and override them together: the
 * number must stay readable on the fill.
 *
 * | CSS Variable           | Default                    | Description                                                                                            |
 * | ---------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------ |
 * | `--color-steps-rail`   | `var(--color-neutral-300)` | The rail and the marker blob. Keep it opaque: a translucent fill shows a seam where the stubs overlap. |
 * | `--color-steps-number` | `var(--color-neutral-950)` | The number on the blob.                                                                                |
 *
 * | Data Attribute | Value     | Description                                                                                       |
 * | -------------- | --------- | ------------------------------------------------------------------------------------------------- |
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
 *     <p>
 *       Run <Code>ngrok config add-authtoken</Code> with the token from your dashboard.
 *     </p>
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
	// Slot merges child props over slot props, so with asChild the role must
	// be on the child element itself or the child can override it.
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
			// Why after the spread: `StepsRootProps` omits `role`, but a wider
			// props object can still carry one, and the list must keep its role.
			role="list"
		>
			{content}
		</Comp>
	);
};

/**
 * Props for `Steps.Item`. Every `<li>` attribute except two, plus `asChild`:
 * - `value`: the visible number is a CSS counter, so a `value` would make the
 *   list's own numbering disagree with it.
 * - `dangerouslySetInnerHTML`: the item always renders its marker as a child,
 *   and React throws when an element has both.
 *
 * Under `asChild`, the child must render an `<li>`.
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
type StepsItemProps = Omit<ComponentProps<"li">, "value" | "dangerouslySetInnerHTML"> &
	WithAsChild &
	WithDataSlot;

/**
 * One step. Renders an `<li>` that increments the step counter, draws its own
 * segment of the rail, and mounts the numbered marker before its children.
 *
 * The rail is this item's `border-inline-start`, not a drawn line. A border
 * spans the item at each content height, and the bottom padding is inside the
 * border box, so the rail also runs through the gap to the next step. The last
 * item keeps the width and drops the color, so removing a step moves nothing
 * sideways.
 *
 * Under `asChild` the child must render an `<li>`. Any other element between
 * the `<ol>` and its items is invalid HTML, and the item's position in the
 * list then stops describing the step. A `hidden` item and a `<template>`
 * take no position.
 *
 * Set `dir` on the step's content, not on the item: the list's gutter is on
 * the list's own start side, and an item in the other direction puts its rail
 * and marker outside that gutter.
 *
 * | Data Attribute | Value                | Description                                                                                                        |
 * | -------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------ |
 * | `data-slot`    | `"steps-item"`       | On the list item. Stable styling hook that survives a `className` override or an `asChild` swap.                 |
 * | `data-slot`    | `"steps-marker"`     | On the `aria-hidden` marker in the gutter. Target it to hide the marker column on a narrow surface.               |
 * | `data-slot`    | `"steps-item-label"` | On the `display: contents` label slot that the step's own children render into. It lays out nothing; style your child. |
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
 *     <p>
 *       Run <Code>ngrok config add-authtoken</Code> with the token from your dashboard.
 *     </p>
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
		className: cx(
			// Why a rem rail width and not `border-s-4`: the marker scales with the
			// root font size, and the stub must stay as wide as the border under it.
			"border-s-steps-rail relative border-s-[0.25rem] pt-1.5 pb-10 ps-8.5",
			"[counter-increment:mantle-steps]",
			// Why `of :not([hidden], template)`: a hidden item and a server Suspense
			// placeholder take no number, so they must not take a position either.
			// The width stays so the content keeps its indent; only the color goes.
			"[&:nth-last-child(1_of_:not([hidden],template))]:border-s-transparent",
			// Why Canvas: forced colors paint a transparent border in CanvasText, but
			// keep a system color that the page sets.
			"forced-colors:[&:nth-last-child(1_of_:not([hidden],template))]:border-s-[Canvas]",
			// Why a variable per silhouette: the item's own position picks the shape,
			// with no structural selector before a combinator. The four conditions
			// do not overlap, so no cascade order picks the shape.
			"[--_steps-first:none] [--_steps-middle:none] [--_steps-last:none] [--_steps-only:none]",
			"[&:nth-child(1_of_:not([hidden],template)):not(:nth-last-child(1_of_:not([hidden],template)))]:[--_steps-first:inline]",
			"[&:not(:nth-child(1_of_:not([hidden],template))):not(:nth-last-child(1_of_:not([hidden],template)))]:[--_steps-middle:inline]",
			"[&:nth-last-child(1_of_:not([hidden],template)):not(:nth-child(1_of_:not([hidden],template)))]:[--_steps-last:inline]",
			"[&:nth-child(1_of_:not([hidden],template)):nth-last-child(1_of_:not([hidden],template))]:[--_steps-only:inline]",
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
						<StepLabel>{children.props.children}</StepLabel>
					</>,
				)}
			</Slot>
		);
	}

	return (
		<li ref={ref} {...itemProps}>
			<StepMarker />
			<StepLabel>{children}</StepLabel>
		</li>
	);
};

/**
 * Props for `Steps.Title`. Every heading attribute, plus `asChild` to fit the
 * document outline around the guide.
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
 * default; pass `asChild` to fit the document outline around the guide. Keep it
 * a heading element (`h1`-`h6`) for accessibility.
 *
 * The marker sits at a fixed offset from the top of the item, so keep the title
 * the item's first child at the default type size.
 *
 * | Data Attribute | Value           | Description                                                                                          |
 * | -------------- | --------------- | ---------------------------------------------------------------------------------------------------- |
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
 *     <p>
 *       Run <Code>ngrok config add-authtoken</Code> with the token from your dashboard.
 *     </p>
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

export {
	//,
	Root,
	Item,
	Title,
};

export type {
	//,
	StepsItemProps,
	StepsRootProps,
	StepsTitleProps,
};
