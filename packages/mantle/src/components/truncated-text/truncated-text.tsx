"use client";

import {
	Root as TooltipPrimitiveRoot,
	Trigger as TooltipPrimitiveTrigger,
} from "@radix-ui/react-tooltip";
import {
	Children,
	type ComponentProps,
	cloneElement,
	type FocusEvent,
	isValidElement,
	type PointerEvent,
	type ReactNode,
	useRef,
	useState,
} from "react";
import invariant from "tiny-invariant";
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js";
import type { SelfClosingWithAsChild } from "../../types/as-child.js";
import { $cssProperties } from "../../types/css-properties.js";
import { useComposedRefs } from "../../utils/compose-refs/compose-refs.js";
import { cx } from "../../utils/cx/cx.js";
import { joinDataSlot, type WithDataSlot } from "../../utils/data-slot.js";
import { Slot } from "../slot/index.js";
import { Tooltip } from "../tooltip/index.js";
import { splitTail } from "./split-tail.js";

/**
 * Props for `TruncatedText`. The type omits `children`: `value` is the content,
 * and `asChild` takes the single element to render it in.
 */
type TruncatedTextProps = Omit<ComponentProps<"span">, "children" | "translate"> &
	SelfClosingWithAsChild &
	WithDataSlot & {
		/**
		 * How many graphemes stay visible at the end of the value. Counts grapheme
		 * clusters, so an emoji or a letter with a combining mark counts once. Must
		 * be a non-negative integer.
		 *
		 * @default 8
		 */
		tail?: number;
		/**
		 * Whether a browser translation engine may translate the value and its
		 * tooltip. When the value is prose, pass `"yes"`.
		 *
		 * @default "no"
		 */
		translate?: "yes" | "no";
		/**
		 * The full value. A prop and not `children`, because the component splits
		 * it and renders the two parts itself.
		 */
		value: string;
	};

/**
 * What the layout effect reads from the DOM after a paint.
 */
type Measurement = {
	/**
	 * The width of the tail's text, in CSS pixels.
	 */
	tailWidth: number;
	/**
	 * Whether the head and the tail together are wider than the root's content box.
	 */
	truncated: boolean;
};

/**
 * The width of an element's text in CSS pixels, including the part an overflow
 * clip hides.
 */
function textWidth(element: HTMLElement): number {
	const range = document.createRange();
	range.selectNodeContents(element);
	return range.getBoundingClientRect().width;
}

/**
 * The width of an element's content box in CSS pixels.
 */
function contentWidth(element: HTMLElement): number {
	const style = getComputedStyle(element);
	const inset = [
		style.paddingLeft,
		style.paddingRight,
		style.borderLeftWidth,
		style.borderRightWidth,
	].reduce((sum, length) => sum + (Number.parseFloat(length) || 0), 0);
	return element.getBoundingClientRect().width - inset;
}

/**
 * Reads whether the value overflows and how wide its tail is.
 *
 * Compares the natural widths of the two segments against the root's content
 * box, not against the head's clipped box. Once the whole value fits, a head
 * that the `ch` rounding shortened still reads as fitting.
 */
function measure(root: HTMLElement, head: HTMLElement, tail: HTMLElement): Measurement {
	const tailWidth = textWidth(tail);
	// Why half a pixel: the root's shrink-to-fit width and the text widths come
	// from one layout, but the engines round them at different steps.
	const truncated = textWidth(head) + tailWidth > contentWidth(root) + 0.5;
	return { tailWidth, truncated };
}

/**
 * The elements that take focus or a click of their own. A root inside one of
 * them is content of that control, so it takes no tab stop and no tooltip.
 */
const controlSelector =
	'a[href], button, input, select, textarea, summary, [contenteditable=""], [contenteditable="true"], [role="button"], [role="checkbox"], [role="link"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="option"], [role="radio"], [role="switch"], [role="tab"], [role="treeitem"]';

/**
 * Whether an element sits inside a control. Starts from the parent, so a root
 * that `asChild` renders as a control is not inside one.
 */
function isInsideControl(element: HTMLElement): boolean {
	return element.parentElement?.closest(controlSelector) != null;
}

// Why inline-block and not flex: a flex item is a block, and Chromium and WebKit
// serialize a selection with a newline between blocks, so a copy pastes the
// value as two lines.
// Why no ligatures: a ligature such as `//` shapes as one glyph, so a clip
// inside it drops both characters and the ellipsis lands a cell away.
const rootClassName =
	"inline-block min-w-0 max-w-full rounded whitespace-nowrap select-all [font-variant-ligatures:none] focus:outline-hidden focus-visible:ring-3 focus-visible:ring-focus-accent";

// Why 0.5px: without the slack, WebKit clips a value that fits exactly.
// Why round(down, …, 1ch): while the value overflows, whole `ch` cells keep the
// clipped glyphs, the ellipsis, and the tail flush in a monospace font.
// Why max(1ch …): when the container holds less, the head keeps one cell for
// the ellipsis. A head of zero width also drops out of a copy in Chromium.
// Why the zero-width space: Chromium never swaps the first glyph of a box for
// the ellipsis, so a one-cell head shows that glyph instead. The pseudo-element
// is that first glyph, and generated content never enters a selection.
// Why String.raw: Tailwind reads this file's text, so the class must hold one
// backslash, and a plain string literal spells that with two.
const headClassName = String.raw`inline-block overflow-hidden text-ellipsis whitespace-nowrap align-bottom before:content-['\200B'] max-w-[calc(100%_-_var(--_tail-width)_+_0.5px)] [[data-truncated]>&]:max-w-[max(1ch_+_0.5px,calc(round(down,100%_-_var(--_tail-width),1ch)_+_0.5px))]`;

// Why min-w: while the reserve is still the `ch` estimate, the tail holds the
// width the head subtracts, so a value that fits never clips its head.
// Why `dir="rtl"` here and `ltr` inside: an RTL box overflows to the left, so a
// tail wider than its box loses its start and keeps its end. The LTR isolate
// inside keeps the characters in logical order.
// Why text-left: while the tail fits, its text stays at the box's left edge, so
// the estimate's spare width sits after the text and not before it.
// Why round(down, …) from the tail's own width: the clip lands on the tail's
// glyph grid, so a monospace tail loses whole glyphs and never half of one.
// Why `:empty+&`: a value no longer than `tail` has no head to draw the
// ellipsis, so the tail draws its own and takes the head's cell back.
const tailClassName =
	"inline-block overflow-hidden whitespace-nowrap text-left align-bottom min-w-(--_tail-width) [[data-truncated]>&]:min-w-0 [[data-truncated]>&]:max-w-[calc(round(down,100%_-_1ch_-_var(--_tail-width),1ch)_+_var(--_tail-width))] [[data-truncated]>:empty+&]:max-w-[calc(round(down,100%_-_var(--_tail-width),1ch)_+_var(--_tail-width)_+_0.5px)] [[data-truncated]>:empty+&]:text-ellipsis";

type TruncatedTextRootProps = ComponentProps<"span"> & {
	/** Whether to render through `Slot` onto the consumer's element. */
	asChild?: boolean;
	/** The consumer's own `aria-describedby`, carried past the trigger merge. */
	describedBy: string | undefined;
};

/**
 * The root element, rendered after Radix merges the trigger props onto it.
 *
 * Why it drops `aria-describedby`: Radix joins the tooltip id onto the
 * trigger, and here the tooltip's text is the root's own content, so a screen
 * reader would read the value twice. Only the consumer's own ids land.
 */
const TruncatedTextRoot = ({
	"aria-describedby": _merged,
	asChild = false,
	describedBy,
	...props
}: TruncatedTextRootProps) => {
	const Component = asChild ? Slot : "span";
	return <Component aria-describedby={describedBy} {...props} />;
};

/**
 * Renders one long opaque value (a URL, a resource ID, an image reference, a
 * token) on a single line. When the value overflows its container, the head
 * clips with one ellipsis and the last `tail` graphemes stay visible, because
 * the tail is the part that tells two values apart. When the value fits, it
 * renders plain. A visually hidden copy of the value gives a screen reader the
 * whole value as one string. A tooltip shows the full value on hover only while
 * it overflows.
 *
 * **When to use**
 * - A URL, an ID, an image reference, or a token in a table cell, a description
 *   list, or a card, where the end of the value matters.
 *
 * **When not to use**
 * - For prose that may lose its end. Use the `truncate` utility.
 * - For a value that may wrap over several lines. Let it wrap, or use
 *   {@link https://mantle.ngrok.com/components/data-display/code-block CodeBlock}.
 * - For a short fragment of inline code. Use
 *   {@link https://mantle.ngrok.com/components/data-display/code Code}.
 *
 * **Layout.** The root is an `inline-block` that grows to its container's width
 * and no further. The container decides the width:
 * - A flex item needs `min-w-0`.
 * - A grid track needs `minmax(0, 1fr)`.
 * - An auto-layout table grows its column to the full value, even with a column
 *   width. Set `table-layout: fixed` on the table and give the table a width.
 *
 * When the container holds less than the tail and one cell, the ellipsis is all
 * that remains of the head. The tail then clips at its start, so the end of the
 * value is the last thing to go. A value no longer than `tail` has no head, so
 * its tail draws the ellipsis itself. Give the value a line of its own: beside
 * other inline text, an overflowing value wraps to the next line at the
 * container's full width. The root sets `dir="ltr"`, because a URL, an ID, or
 * a token reads left to right on an RTL page too; a `dir` prop wins. CSS draws
 * the ellipsis, so a selection never contains it. The component sets no font,
 * but it turns ligatures off, so a `//` or `=>` clips between its two
 * characters. In a monospace font the clipped head sits flush against the
 * tail; a proportional font leaves a gap smaller than one glyph.
 *
 * Until the first measurement, the tail reserves one `ch` per grapheme, which
 * is exact in a monospace font. In another font the first paint of an
 * overflowing value can be off by the difference: a tail of wide glyphs (CJK,
 * emoji) can poke past the container, and a value that fits by less than the
 * over-reserve of narrow glyphs can clip. The layout effect after mount
 * replaces the estimate with the measured width.
 *
 * **Selection.** The root carries `user-select: all`, so one click selects the
 * whole value across both segments, and a copy yields the full string. Pass
 * `className="select-text"` to opt out.
 *
 * **Tooltip.** The tooltip shows the full value and opens only while the value
 * overflows. A value that wraps breaks into lines of near-equal length. It
 * needs a `TooltipProvider` ancestor, like every mantle tooltip, and throws
 * without one. The server render and the first client render assume
 * no overflow; the measurement after mount adds the tooltip and `data-truncated`.
 * While the value overflows, the root is focusable, so Tab reaches it, a screen
 * reader announces the whole value, and the tooltip opens. A value that fits is
 * not a tab stop. A `tabIndex` prop wins in both states.
 *
 * Inside a control (a `<button>`, an `<a href>`, a radio, a menu item, a tab)
 * the root takes no tab stop and opens no tooltip, because a control cannot
 * hold a second one. The segments still clip, `data-truncated` still lands,
 * and the hidden copy gives the control's accessible name the whole value.
 * Wrap the control in `Tooltip` when a sighted reader needs the full value.
 * The server render and the first client render assume no control, like they
 * assume no overflow; each commit after that reads the DOM again.
 *
 * **Accessibility.** The two visible segments are `aria-hidden`, because
 * Chromium puts a space between two inline-block boxes in an accessible name.
 * A visually hidden `<span data-slot="truncated-text-value">` holds the whole
 * value instead, with `user-select: none`, so one click still copies the value
 * once. A page-wide select-all copies it twice, like any visually hidden label.
 *
 * **Translation.** The root and the tooltip carry `translate="no"` by default,
 * because the component exists for values a reader copies. When the value is
 * prose, pass `translate="yes"`.
 *
 * **Polymorphism.** Pass `asChild` to render the value inside a different
 * element, such as a `<code>`. The child must have no children of its own,
 * because `value` is the content, and it must render `children` directly, as
 * `<code>` does.
 *
 * **Data attributes:**
 *
 * | Data Attribute   | Value                                              | Description                                                                        |
 * | ---------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------- |
 * | `data-slot`      | `"truncated-text"`                                 | On the root, and joined onto the child via `asChild`.                              |
 * | `data-slot`      | `"truncated-text-head"`                            | On the `<span>` that clips. Holds everything before the tail.                      |
 * | `data-slot`      | `"truncated-text-tail"`                            | On the `<span>` that stays visible. Holds the last `tail` graphemes.               |
 * | `data-slot`      | `"truncated-text-value"`                           | On the visually hidden `<span>` that holds the whole value for assistive technology. |
 * | `data-truncated` | present while the value overflows                  | Presence-only. Style with `data-truncated:`. Absent on the server render.          |
 * | `data-state`     | `"closed"` \| `"delayed-open"` \| `"instant-open"` | The tooltip state Radix stamps on the root. Absent inside a control.               |
 *
 * @see https://mantle.ngrok.com/components/data-display/truncated-text
 *
 * @example
 * ```tsx
 * import { TruncatedText } from "@ngrok/mantle/truncated-text";
 *
 * // A URL whose last path segment tells it apart from its neighbors.
 * <TruncatedText
 *   className="font-mono text-sm"
 *   value="https://example.ngrok.app/api/items?filter=%7B%22name%22%3A%22x%22%7D&limit=200"
 * />
 *
 * // Keep the six characters that tell two IDs apart.
 * <TruncatedText className="font-mono text-sm" tail={6} value="ep_2abcdEFGhijKL123456" />
 *
 * // As a <code> element.
 * <TruncatedText asChild tail={12} value="ghcr.io/ngrok/ngrok-operator:0.14.0">
 *   <code />
 * </TruncatedText>
 * ```
 */
const TruncatedText = ({
	"aria-describedby": describedBy,
	asChild = false,
	children,
	className,
	"data-slot": dataSlot,
	onFocus,
	onPointerMove,
	ref,
	style,
	tabIndex,
	tail = 8,
	translate = "no",
	value,
	...props
}: TruncatedTextProps) => {
	const { head, tail: tailText, tailGraphemes } = splitTail(value, tail);
	// Why state and not a ref: an `asChild` child of a new type remounts the
	// root, and the effect below must bind its observer to the new node.
	const [rootNode, setRootNode] = useState<HTMLSpanElement | null>(null);
	const headRef = useRef<HTMLSpanElement>(null);
	const tailRef = useRef<HTMLSpanElement>(null);
	const composedRef = useComposedRefs(ref, setRootNode);
	const [measurement, setMeasurement] = useState<Measurement | null>(null);
	const [open, setOpen] = useState(false);
	const [insideControl, setInsideControl] = useState(false);
	const isTruncated = measurement?.truncated === true;

	// Why no dependency list: a control above the root can gain or lose its
	// `href` or role without remounting the root, so each commit reads the DOM again.
	// Why `isConnected`: the commit that swaps the root still holds the old node,
	// and a detached node reads as outside every control.
	useIsomorphicLayoutEffect(() => {
		if (rootNode?.isConnected) {
			setInsideControl(isInsideControl(rootNode));
		}
	});

	useIsomorphicLayoutEffect(() => {
		const headElement = headRef.current;
		const tailElement = tailRef.current;
		if (rootNode == null || headElement == null || tailElement == null) {
			return;
		}

		const update = () => {
			const next = measure(rootNode, headElement, tailElement);
			setMeasurement((previous) =>
				previous != null &&
				previous.tailWidth === next.tailWidth &&
				previous.truncated === next.truncated
					? previous
					: next,
			);
			// Why: while the `open` prop already reads false, Radix skips
			// `onOpenChange`, so a stale `true` here reopens the tooltip by itself
			// the next time the value overflows.
			if (!next.truncated) {
				setOpen(false);
			}
		};

		update();

		const observer = new ResizeObserver(update);
		observer.observe(rootNode);
		observer.observe(tailElement);
		return () => {
			observer.disconnect();
		};
	}, [rootNode, value, tail]);

	// Why `ch` first: the server has no measurement, and in a monospace font
	// one grapheme is one `ch`, so the first paint already reserves the tail.
	const tailReserve = measurement == null ? `${tailGraphemes}ch` : `${measurement.tailWidth}px`;

	const segments = (
		<>
			{/* Why the hidden copy: a screen reader reads the two boxes below as two
			    strings, so they are hidden from it and this one text node is not. */}
			<span data-slot="truncated-text-value" className="sr-only select-none">
				{value}
			</span>
			<span ref={headRef} aria-hidden data-slot="truncated-text-head" className={headClassName}>
				{head}
			</span>
			<span
				ref={tailRef}
				aria-hidden
				data-slot="truncated-text-tail"
				dir="rtl"
				className={tailClassName}
			>
				<span dir="ltr">{tailText}</span>
			</span>
		</>
	);

	const rootProps = {
		ref: composedRef,
		"data-slot": joinDataSlot(dataSlot, "truncated-text"),
		"data-truncated": isTruncated ? "" : undefined,
		// Why `ltr`: a URL, an ID, or a token reads left to right on an RTL page
		// too, so the tail stays on the right and the head clips at its end.
		dir: "ltr",
		className: cx(rootClassName, className),
		style: $cssProperties({ "--_tail-width": tailReserve, ...style }),
		// Why only while truncated and outside a control: a value that fits hides
		// nothing, and a control already owns the focus, so neither earns a tab
		// stop. A clipped one on its own needs focus, because the tooltip opens on it.
		tabIndex: isTruncated && !insideControl ? (tabIndex ?? 0) : tabIndex,
		// Why preventDefault: Radix runs its global open path before it reads
		// `open`, and that path closes every other tooltip on the page. A value
		// that fits has no tooltip to open, so it must not run.
		// Why not inside a control: the root is no trigger there, and a prevented
		// event also stops the tooltip a consumer wraps around the control.
		onPointerMove: (event: PointerEvent<HTMLSpanElement>) => {
			onPointerMove?.(event);
			if (!isTruncated && !insideControl) {
				event.preventDefault();
			}
		},
		onFocus: (event: FocusEvent<HTMLSpanElement>) => {
			onFocus?.(event);
			if (!isTruncated && !insideControl) {
				event.preventDefault();
			}
		},
		translate,
		...props,
	};

	let root: ReactNode;
	if (asChild) {
		const singleChild = Children.only(children);
		invariant(
			isValidElement<{ children?: ReactNode }>(singleChild),
			"When using `asChild`, TruncatedText must be passed a single child as a JSX tag.",
		);
		invariant(
			singleChild.props.children == null,
			"When using `asChild`, the child of TruncatedText must have no children of its own. `value` is the content.",
		);
		root = (
			<TruncatedTextRoot asChild describedBy={describedBy} {...rootProps}>
				{cloneElement(singleChild, {}, segments)}
			</TruncatedTextRoot>
		);
	} else {
		root = (
			<TruncatedTextRoot describedBy={describedBy} {...rootProps}>
				{segments}
			</TruncatedTextRoot>
		);
	}

	// Why a bare root and not a gated trigger: a gated trigger needs its pointer
	// events prevented, and a prevented event also stops a tooltip wrapped
	// around the control.
	// Why the root remounts once inside a control: the first render assumes no
	// control, and this swap changes the element type above the root.
	if (insideControl) {
		return root;
	}

	return (
		<TooltipPrimitiveRoot
			open={isTruncated && open}
			onOpenChange={(next) => setOpen(isTruncated && next)}
		>
			{/* Why Radix's trigger and not `Tooltip.Trigger`: the mantle part stamps its
			    own `data-slot`, which `Slot` joins into the root's. */}
			<TooltipPrimitiveTrigger asChild>{root}</TooltipPrimitiveTrigger>
			{/* Why `text-balance`: `break-all` fills each line to the edge, so a value a
			    little wider than the tooltip leaves one or two characters on the last line. */}
			<Tooltip.Content className="break-all text-balance" translate={translate}>
				{value}
			</Tooltip.Content>
		</TooltipPrimitiveRoot>
	);
};

export {
	//,
	TruncatedText,
};

export type {
	//,
	TruncatedTextProps,
};
