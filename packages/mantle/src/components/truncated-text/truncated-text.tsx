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
	type MouseEvent,
	type PointerEvent,
	type ReactNode,
	type Ref,
	type RefCallback,
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
		 * The most graphemes the head shows before the ellipsis. When set, a value
		 * longer than `head + tail` graphemes always clips to that shape, such as
		 * `ep_…KL123456`, even when its container holds more. A narrower container
		 * clips the head further. Counts grapheme clusters, like `tail`. Must be a
		 * non-negative integer. When omitted, the head fills its container.
		 */
		head?: number;
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
 * What a batch reads from the DOM after a commit or a resize.
 */
type Measurement = {
	/**
	 * The width the head needs to show the lead and the ellipsis, in CSS pixels.
	 * `null` while the value has no lead.
	 */
	headCap: number | null;
	/**
	 * While the value overflows in a font that is not monospace: the width of
	 * the longest prefix of the head that fits beside the tail with the
	 * ellipsis, plus the ellipsis, in CSS pixels. Otherwise `null`.
	 */
	headFit: number | null;
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
 * One mounted instance: the elements a batch reads, and what it last wrote.
 */
type MeasureTarget = {
	root: HTMLElement;
	head: HTMLElement;
	tail: HTMLElement;
	/** The visually hidden element that holds the whole value as one text node. */
	copy: HTMLElement;
	/** The invisible element that holds one ellipsis, in the head's font. */
	ellipsis: HTMLElement;
	/** The lead's length in UTF-16 code units. `null` while the value has no lead. */
	leadLength: number | null;
	/**
	 * Whether the batch sets the root's tab stop: true while the consumer passes
	 * no `tabIndex` and the root is outside a control.
	 */
	ownsTabStop: boolean;
	/**
	 * The measurement the last batch wrote to the DOM. `null` until the first
	 * batch, and again after the value changes.
	 */
	written: Measurement | null;
	/**
	 * What the last batch read about the font. Valid while the tail's text
	 * keeps `tailWidth`: a new font or a new value changes that width.
	 */
	font: { tailWidth: number; ellipsisWidth: number; monospace: boolean } | null;
	/** How many code units of the head the last fit kept. A search starts there. */
	fitLength: number | null;
	/** Called when the value stops overflowing, so an open tooltip closes. */
	onFit: () => void;
};

/**
 * Reads whether the value overflows, how wide its tail is, and how wide the
 * head must be to show the lead and the ellipsis.
 *
 * Compares the natural widths of the two segments against the root's content
 * box, not against the head's clipped box. Once the whole value fits, a head
 * that the `ch` rounding shortened still reads as fitting. `available` is the
 * root's content width when the caller already has it.
 */
function measure(target: MeasureTarget, available = contentWidth(target.root)): Measurement {
	const { ellipsis, leadLength } = target;
	const reading = readText(target);
	const { headWidth, headLength, tailWidth, text } = reading;
	// Why half a pixel: the root's shrink-to-fit width and the text widths come
	// from one layout, but the engines round them at different steps.
	const truncated = headWidth + tailWidth > available + 0.5;
	if (text == null) {
		return { headCap: null, headFit: null, tailWidth, truncated };
	}
	if (target.font?.tailWidth !== tailWidth) {
		const ellipsisWidth = textWidth(ellipsis);
		target.font = {
			tailWidth,
			ellipsisWidth,
			monospace: isMonospace({ ...reading, ellipsisWidth }),
		};
	}
	const { ellipsisWidth, monospace } = target.font;
	let headFit: number | null = null;
	if (truncated && !monospace) {
		const fit = fitPrefix(text, {
			length: headLength,
			limit: available - tailWidth - ellipsisWidth,
			hint: target.fitLength,
		});
		target.fitLength = fit.length;
		headFit = fit.width + ellipsisWidth;
	}
	if (leadLength == null) {
		return { headCap: null, headFit, tailWidth, truncated };
	}
	// Why cells in a monospace font: WebKit snaps a range over part of a node to
	// whole pixels, and the CSS would round that up to one more cell.
	const lead = Math.min(leadLength, headLength);
	const leadWidth = monospace ? lead * ellipsisWidth : prefixWidth(text, lead);
	// Why the min: a head barely longer than its lead shows whole, with no gap.
	const headCap = Math.min(leadWidth + ellipsisWidth, headWidth);
	return { headCap, headFit, tailWidth, truncated };
}

/** The natural widths of the two segments, and a text node to read head prefixes from. */
type TextReading = {
	headWidth: number;
	/** How many UTF-16 code units the head holds. */
	headLength: number;
	tailWidth: number;
	/** How many UTF-16 code units the tail holds. */
	tailLength: number;
	/**
	 * A text node that starts with the head's text, so a prefix of the head is a
	 * range from offset 0. `null` when no such node exists.
	 */
	text: Text | null;
};

/**
 * Reads the natural widths of the head and the tail.
 *
 * Why the hidden copy: WebKit clips a range's geometry at a `text-overflow`
 * ellipsis, so a clipped head reads as its visible part only. The copy draws
 * no ellipsis. A range over a whole node reads exact, and WebKit snaps a range
 * over part of a node to whole pixels, so the head is the copy less the tail.
 * Why the length check: a translation engine can replace the text, and then
 * the head's offsets no longer point into the copy.
 */
function readText({ copy, head, tail }: MeasureTarget): TextReading {
	const headText = head.firstChild;
	const headLength = headText instanceof Text ? headText.length : 0;
	const tailLength = tail.textContent?.length ?? 0;
	const copyText = copy.firstChild;
	if (!(copyText instanceof Text) || copyText.length !== headLength + tailLength) {
		const headWidth = textWidth(head);
		return {
			headWidth,
			headLength,
			tailWidth: textWidth(tail),
			tailLength,
			text: headText instanceof Text ? headText : null,
		};
	}
	const total = textWidth(copy);
	// Why the copy when the head is empty: the tail then draws the ellipsis itself.
	const tailWidth = headLength === 0 ? total : textWidth(tail);
	return { headWidth: total - tailWidth, headLength, tailWidth, tailLength, text: copyText };
}

/**
 * Whether the mean glyph of the head, the mean glyph of the tail, and the
 * ellipsis are one cell wide.
 *
 * Why: in a monospace font, whole `ch` cells in CSS already keep the ellipsis
 * flush, and a resize then needs no search. A wrong `false` costs only speed.
 * Why only whole-node widths: WebKit snaps a range over part of a node to
 * whole pixels. Why 1/32 px: a range snaps each width to a 1/64 px layout unit.
 */
function isMonospace({
	headLength,
	headWidth,
	tailLength,
	tailWidth,
	ellipsisWidth,
}: Omit<TextReading, "text"> & { ellipsisWidth: number }): boolean {
	const means = [
		headLength > 0 ? headWidth / headLength : ellipsisWidth,
		tailLength > 0 ? tailWidth / tailLength : ellipsisWidth,
	];
	return means.every((width) => Math.abs(width - ellipsisWidth) < 1 / 32);
}

/** The width of the first `end` code units of a text node, in CSS pixels. */
function prefixWidth(text: Text, end: number): number {
	const range = document.createRange();
	range.setStart(text, 0);
	range.setEnd(text, end);
	return range.getBoundingClientRect().width;
}

/**
 * The longest prefix of a text node, at most `length` code units, that is no
 * wider than `limit` CSS pixels: its length in code units and its width.
 *
 * Why the hint: a resize moves the fit by a glyph or two, so the search first
 * tries the last fit and its neighbor, and reads two widths in the usual case.
 */
function fitPrefix(
	text: Text,
	{ length, limit, hint }: { length: number; limit: number; hint: number | null },
): { length: number; width: number } {
	// The invariant: the prefix of length `low` fits, and no prefix longer than `high` fits.
	let low = 0;
	let high = length;
	if (hint != null && hint > 0 && hint <= length) {
		const width = prefixWidth(text, hint);
		if (width <= limit) {
			if (hint === length || prefixWidth(text, hint + 1) > limit) {
				return { length: hint, width };
			}
			low = hint + 1;
		} else {
			high = hint - 1;
			const shorter = prefixWidth(text, high);
			if (shorter <= limit) {
				return { length: high, width: shorter };
			}
			high -= 1;
		}
	}
	while (low < high) {
		const middle = Math.ceil((low + high) / 2);
		if (prefixWidth(text, middle) <= limit) {
			low = middle;
		} else {
			high = middle - 1;
		}
	}
	return { length: low, width: prefixWidth(text, low) };
}

/**
 * Sets or removes the root's tab stop. A value that fits hides nothing, so it
 * takes no tab stop. A clipped one needs focus, because the tooltip opens on it.
 */
function writeTabStop(target: MeasureTarget) {
	if (!target.ownsTabStop) {
		return;
	}
	if (target.written?.truncated === true) {
		target.root.tabIndex = 0;
	} else {
		target.root.removeAttribute("tabindex");
	}
}

/**
 * What `write` did: wrote nothing because a width changed under `deferWidths`,
 * wrote a new tail width or head cap, or wrote only the rest.
 */
type WriteResult = "deferred" | "resized" | "written";

/**
 * Writes the widths to the root's style, the flag to `data-truncated`, and the
 * tab stop. Writes nothing when `deferWidths` is set and a width changed.
 */
function write(
	target: MeasureTarget,
	next: Measurement,
	{ deferWidths = false } = {},
): WriteResult {
	const { root, written } = target;
	const widthsChanged =
		written == null || written.tailWidth !== next.tailWidth || written.headCap !== next.headCap;
	// Why defer: a new width can resize the root, and a resize of an observed
	// element inside its own observer callback reports a loop error to `window`.
	if (widthsChanged && deferWidths) {
		return "deferred";
	}
	if (widthsChanged) {
		root.style.setProperty("--_tail-width", `${next.tailWidth}px`);
		if (next.headCap != null) {
			root.style.setProperty("--_head-cap", `${next.headCap}px`);
		}
	}
	// Why no deferral: the fit caps the head inside a percentage `max-width`,
	// which the root's shrink-to-fit width ignores, so the root keeps its size.
	if (written?.headFit !== next.headFit) {
		if (next.headFit == null) {
			root.style.removeProperty("--_head-fit");
		} else {
			root.style.setProperty("--_head-fit", `${next.headFit}px`);
		}
	}
	if (written?.truncated !== next.truncated) {
		root.toggleAttribute("data-truncated", next.truncated);
	}
	target.written = next;
	writeTabStop(target);
	if (!next.truncated) {
		target.onFit();
	}
	return widthsChanged ? "resized" : "written";
}

/**
 * Measures every target, then writes every result.
 *
 * Why all reads before all writes: a write between two reads makes the second
 * read lay out the page again, once for each instance in a large table.
 */
function measureAll(
	targets: Iterable<MeasureTarget>,
	{
		deferWidths = false,
		settle = true,
		contentWidths,
	}: {
		deferWidths?: boolean;
		settle?: boolean;
		/** Root content widths that an observer entry already holds. */
		contentWidths?: Map<MeasureTarget, number>;
	} = {},
) {
	const results = Array.from(
		targets,
		(target) => [target, measure(target, contentWidths?.get(target))] as const,
	);
	const deferred: MeasureTarget[] = [];
	const resized: MeasureTarget[] = [];
	for (const [target, next] of results) {
		const result = write(target, next, { deferWidths });
		if (result === "deferred") {
			deferred.push(target);
		} else if (result === "resized" && target.leadLength != null) {
			resized.push(target);
		}
	}
	// Why a second pass: with a lead, the root shrinks to its segments, so the
	// fit that the first pass read beside the old head cap is stale.
	if (settle && resized.length > 0) {
		measureAll(resized, { deferWidths, settle: false });
	}
	if (deferred.length > 0) {
		requestAnimationFrame(() => {
			measureAll(deferred.filter((target) => target.root.isConnected));
		});
	}
}

/** The event that mounted the tooltip, which its trigger receives once it mounts. */
type PendingEvent =
	| { type: "pointermove"; event: PointerEvent<HTMLSpanElement> }
	| { type: "focus"; event: FocusEvent<HTMLSpanElement> };

/** Whether the last batch flagged the root as overflowing. */
function isTruncated(element: Element): boolean {
	return element.hasAttribute("data-truncated");
}

/** The targets that wait for the next microtask batch. */
const pending = new Set<MeasureTarget>();

/**
 * Adds a target to the batch that runs after the current commit, before the
 * browser paints. One batch serves every instance that mounts or changes in
 * the commit.
 */
function scheduleMeasure(target: MeasureTarget) {
	if (pending.size === 0) {
		queueMicrotask(() => {
			const batch = [...pending].filter((target) => target.root.isConnected);
			pending.clear();
			measureAll(batch);
		});
	}
	pending.add(target);
}

/** The target that owns each observed root and tail. */
const observedTargets = new WeakMap<Element, MeasureTarget>();

let resizeObserver: ResizeObserver | undefined;

/**
 * One observer for every instance. Its callback runs after layout and before
 * paint, so the reads cost no extra layout and the flag never lags a frame.
 */
function observe(target: MeasureTarget) {
	resizeObserver ??= new ResizeObserver((entries) => {
		const targets = new Set<MeasureTarget>();
		// Why: the entry holds the root's content box, so the batch skips a style read.
		const contentWidths = new Map<MeasureTarget, number>();
		for (const entry of entries) {
			const owner = observedTargets.get(entry.target);
			if (owner == null) {
				continue;
			}
			targets.add(owner);
			if (entry.target === owner.root) {
				contentWidths.set(owner, entry.contentRect.width);
			}
		}
		measureAll(targets, { deferWidths: true, contentWidths });
	});
	observedTargets.set(target.root, target);
	observedTargets.set(target.tail, target);
	resizeObserver.observe(target.root);
	resizeObserver.observe(target.tail);
}

function unobserve(target: MeasureTarget) {
	pending.delete(target);
	for (const element of [target.root, target.tail]) {
		if (observedTargets.get(element) === target) {
			observedTargets.delete(element);
			resizeObserver?.unobserve(element);
		}
	}
}

/**
 * Narrows a block of wrapped text to its longest line, so the box around it
 * shrinks too. `text-wrap: balance` evens the lines but leaves the box at its
 * full width.
 */
function fitToLongestLine(element: HTMLElement | null) {
	if (element == null) {
		return;
	}
	// Why the reset: a second call, such as the StrictMode replay of a ref,
	// must measure the lines at the tooltip's full width again.
	element.style.width = "";
	// Why the scale: the tooltip opens with a zoom, and the client rects include
	// that transform. The computed width does not, and unlike `offsetWidth` it
	// keeps the fraction, so a line never ends up a fraction too wide to fit.
	const scale =
		element.getBoundingClientRect().width / Number.parseFloat(getComputedStyle(element).width);
	if (!(scale > 0)) {
		return;
	}
	const lines = lineWidths(element, scale);
	// Why: WebKit does not balance text that breaks between letters, so its
	// last line can hold a few characters. An even share of the text, plus one
	// character of room, gives the same number of lines at near-equal length.
	if (lines.length > 1) {
		const total = lines.reduce((sum, width) => sum + width, 0);
		const character = total / Math.max(element.textContent?.length ?? 1, 1);
		element.style.width = `${Math.ceil(total / lines.length + character)}px`;
	}
	const longest = Math.max(...lineWidths(element, scale));
	if (Number.isFinite(longest)) {
		element.style.width = `${Math.ceil(longest)}px`;
	}
}

/** The width of each line of an element's text, in CSS pixels before `scale`. */
function lineWidths(element: HTMLElement, scale: number): number[] {
	const range = document.createRange();
	range.selectNodeContents(element);
	return Array.from(range.getClientRects(), (rect) => rect.width / scale);
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
// Why `--_head-fit`: in another font, the batch caps the head at the prefix
// that fits plus the ellipsis, so the ellipsis sits flush there too. The
// percentage wins while a resize waits for the observer.
// Why max(1ch …): when the container holds less, the head keeps one cell for
// the ellipsis. A head of zero width also drops out of a copy in Chromium.
// Why the zero-width space: Chromium never swaps the first glyph of a box for
// the ellipsis, so a one-cell head shows that glyph instead. The pseudo-element
// is that first glyph, and generated content never enters a selection.
// Why String.raw: Tailwind reads this file's text, so the class must hold one
// backslash, and a plain string literal spells that with two.
const headClassName = String.raw`inline-block overflow-hidden text-ellipsis whitespace-nowrap align-bottom before:content-['\200B'] max-w-[calc(100%_-_var(--_tail-width)_+_0.5px)] [[data-truncated]>&]:max-w-[max(1ch_+_0.5px,min(100%_-_var(--_tail-width),var(--_head-fit,round(down,100%_-_var(--_tail-width),1ch)))_+_0.5px)]`;

// Why `width`: the root shrinks to its segments, and a percentage `max-width`
// never narrows that. Only a length can cap the head there.
// Why round(up, …, 1ch): the truncated rule rounds the head down to whole `ch`,
// so a cap off the `ch` grid would lose a lead glyph in a proportional font.
const headCapClassName = "w-[calc(round(up,var(--_head-cap)-0.5px,1ch)+0.5px)]";

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

/** The Radix trigger handlers that the root calls with its own events. */
type TriggerHandlers = Pick<
	ComponentProps<"span">,
	"onBlur" | "onClick" | "onFocus" | "onPointerDown" | "onPointerLeave" | "onPointerMove"
>;

/** What Radix's trigger merges onto its child, which the root takes in its place. */
type TriggerBinding = {
	/** Radix's composed ref: its trigger node, its popper anchor, and its own ref. */
	ref: Ref<HTMLElement> | undefined;
	handlers: TriggerHandlers;
	/** The tooltip state for `data-state`. */
	state: string | undefined;
};

type TriggerBridgeProps = TriggerHandlers & {
	ref?: Ref<HTMLElement>;
	"data-state"?: string;
	"aria-describedby"?: string;
	/** Receives the trigger's props after each commit. */
	onBind: (binding: TriggerBinding) => void;
};

/**
 * Renders nothing. It takes the props Radix's trigger merges onto its child and
 * hands them to the root, so the tooltip anchors to the root and listens on it.
 *
 * Why it drops `aria-describedby`: the tooltip's text is the root's own content,
 * so a screen reader would read the value twice.
 */
function TriggerBridge({
	"aria-describedby": _describedBy,
	"data-state": state,
	onBind,
	ref,
	...handlers
}: TriggerBridgeProps) {
	useIsomorphicLayoutEffect(() => {
		onBind({ ref, handlers, state });
	});
	return null;
}

/** Points a ref at a node. Returns the cleanup a ref callback returns. */
function assignRef(ref: Ref<HTMLElement> | undefined, node: HTMLElement | null) {
	if (typeof ref === "function") {
		return ref(node);
	}
	if (ref != null) {
		ref.current = node;
	}
	return undefined;
}

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
 * characters. The ellipsis sits flush against the tail in any font, and it
 * stays flush while the container resizes.
 *
 * The server render reserves one `ch` per grapheme for the tail, which is
 * exact in a monospace font. In another font the server paint of an
 * overflowing value can be off by the difference: a tail of wide glyphs (CJK,
 * emoji) can poke past the container, and a value that fits by less than the
 * over-reserve of narrow glyphs can clip. On the client, the measurement runs
 * after the commit and before the browser paints.
 *
 * **Performance.** Each instance renders once on mount. One batch measures
 * every instance that mounted in the commit: it reads all of them, then writes
 * all of them, so the page lays out once for the batch. The tooltip mounts on
 * the first hover or keyboard focus while the value overflows. One
 * `ResizeObserver` serves every instance, and a resize renders no component.
 * A table still lays out each cell it renders, so paginate a long table.
 *
 * **Head length.** Pass `head` to show at most that many graphemes before the
 * ellipsis. A value longer than `head + tail` graphemes then always clips to
 * that shape, even when its container holds more, and the root shrinks to it.
 * For an ngrok resource ID, `head={id.indexOf("_") + 1}` keeps the type prefix:
 * `mem_…A8KImPbQ`. The head rounds up to whole `ch`, so a proportional font can
 * show one more narrow glyph before the ellipsis.
 *
 * **Segment styles.** Style the head and the tail from the root with
 * `*:data-[slot=truncated-text-head]:` and `*:data-[slot=truncated-text-tail]:`
 * classes. CSS draws the ellipsis at the end of the head, so the ellipsis takes
 * the head's color. A value no longer than `tail` has an empty head, so its
 * tail draws the ellipsis in the tail's color. The two segments render when the
 * value fits too. To color them only while the value overflows, add the
 * `data-truncated:` variant first. Change the color of a segment, not its
 * font: the measurement reads the whole value in the root's font. Set a font
 * on the root.
 *
 * **Selection.** The root carries `user-select: all`, so one click selects the
 * whole value across both segments, and a copy yields the full string. Pass
 * `className="select-text"` to opt out.
 *
 * **Tooltip.** The tooltip shows the full value and opens only while the value
 * overflows. The tooltip is up to 24rem wide, so a resource ID fits on one
 * line. A longer value breaks into lines of near-equal length, and the tooltip
 * narrows to the longest line. It needs a `TooltipProvider` ancestor, like
 * every mantle tooltip, and throws without one when it first mounts. The
 * server render and the first client render assume no overflow; the
 * measurement after mount adds `data-truncated`.
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
 * | `data-state`     | `"closed"` \| `"delayed-open"` \| `"instant-open"` | The tooltip state on the root. `"closed"` until the tooltip mounts. Absent inside a control. |
 *
 * @useWhen Show one long opaque value on one line, and keep its end visible when it clips.
 *
 * @siblings
 * - `Code`: a short fragment of inline code that never overflows.
 * - `CodeBlock`: a value that may wrap over several lines.
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
 * // Show an ID as its type prefix, an ellipsis, and its last eight characters.
 * <TruncatedText className="font-mono text-sm" head={4} value="mem_21h80N9qQuAmhSB8nlTA8KImPbQ" />
 *
 * // Mute the type prefix and the ellipsis, and keep the tail at body color.
 * <TruncatedText
 *   className="font-mono text-sm *:data-[slot=truncated-text-head]:text-muted *:data-[slot=truncated-text-tail]:text-body"
 *   head={4}
 *   value="mem_21h80N9qQuAmhSB8nlTA8KImPbQ"
 * />
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
	onBlur,
	onClick,
	onFocus,
	onPointerDown,
	onPointerLeave,
	onPointerMove,
	ref,
	head,
	style,
	tabIndex,
	tail = 8,
	translate = "no",
	value,
	...props
}: TruncatedTextProps) => {
	const { head: headText, lead, tail: tailText, tailGraphemes } = splitTail(value, { head, tail });
	const headRef = useRef<HTMLSpanElement>(null);
	const tailRef = useRef<HTMLSpanElement>(null);
	const ellipsisRef = useRef<HTMLSpanElement>(null);
	const copyRef = useRef<HTMLSpanElement>(null);
	const targetRef = useRef<MeasureTarget | null>(null);
	const triggerRef = useRef<TriggerBinding | null>(null);
	const pendingEventRef = useRef<PendingEvent | null>(null);
	const pointerDownRef = useRef(false);
	const [armed, setArmed] = useState(false);
	const [open, setOpen] = useState(false);
	const [insideControl, setInsideControl] = useState(false);
	const ownsTabStop = tabIndex == null && !insideControl;

	// Why a ref callback and not an effect: an `asChild` child of a new type
	// remounts the root, and the observer must bind to the new node. A state
	// copy of the node would render every instance a second time on mount.
	// Why it reads `lead` and `ownsTabStop`: a change to either binds a new
	// target, so a remounted root never starts from stale values.
	const bindRoot: RefCallback<HTMLSpanElement> = (node) => {
		const headElement = headRef.current;
		const tailElement = tailRef.current;
		const ellipsisElement = ellipsisRef.current;
		const copyElement = copyRef.current;
		if (
			node == null ||
			headElement == null ||
			tailElement == null ||
			ellipsisElement == null ||
			copyElement == null
		) {
			return;
		}
		const target: MeasureTarget = {
			root: node,
			head: headElement,
			tail: tailElement,
			copy: copyElement,
			ellipsis: ellipsisElement,
			leadLength: lead?.length ?? null,
			ownsTabStop,
			written: null,
			font: null,
			fitLength: null,
			onFit: () => setOpen(false),
		};
		targetRef.current = target;
		observe(target);
		scheduleMeasure(target);
		// Why: a remounted root takes the trigger's place, so the tooltip anchors to it.
		const binding = triggerRef.current;
		if (binding != null) {
			assignRef(binding.ref, node);
		}
		return () => {
			unobserve(target);
			targetRef.current = null;
		};
	};
	const composedRef = useComposedRefs(ref, bindRoot);

	// Why no dependency list: a control above the root can gain or lose its
	// `href` or role without remounting the root, so each commit reads the DOM again.
	// Why `isConnected`: the commit that swaps the root still holds the old node,
	// and a detached node reads as outside every control.
	useIsomorphicLayoutEffect(() => {
		const root = targetRef.current?.root;
		if (root?.isConnected) {
			setInsideControl(isInsideControl(root));
		}
	});

	// Why `written = null`: the style prop writes the `ch` estimate again when
	// the value changes, so the batch must write the measured widths back. The
	// font check and the fit hint belong to the old text, so they reset too.
	useIsomorphicLayoutEffect(() => {
		const target = targetRef.current;
		if (target != null) {
			target.written = null;
			target.font = null;
			target.fitLength = null;
			scheduleMeasure(target);
		}
	}, [value, tail]);

	// Why `ch`: the server has no measurement, and in a monospace font one
	// grapheme is one `ch`, so the first paint already reserves the tail. The
	// batch after mount writes the measured widths over these.
	const tailReserve = `${tailGraphemes}ch`;
	// Why `head + 1`: the ellipsis takes one more cell after the lead.
	const headCap = `${(head ?? 0) + 1}ch`;

	const segments = (
		<>
			{/* Why the hidden copy: a screen reader reads the two boxes below as two
			    strings, so they are hidden from it and this one text node is not. */}
			<span ref={copyRef} data-slot="truncated-text-value" className="sr-only select-none">
				{value}
			</span>
			{/* Why: CSS draws the head's ellipsis, so no text node holds it to measure.
			    Why `translate="no"`: the batch measures this glyph, so it must stay "…". */}
			<span ref={ellipsisRef} aria-hidden translate="no" className="invisible absolute select-none">
				…
			</span>
			<span
				ref={headRef}
				aria-hidden
				data-slot="truncated-text-head"
				className={cx(headClassName, lead != null && headCapClassName)}
			>
				{headText}
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

	/** Whether the root may open the tooltip now. */
	const canOpen = (element: Element) => isTruncated(element) && !insideControl;

	/** Mounts the tooltip, then replays `event` to its trigger. */
	const arm = (event: PendingEvent) => {
		pendingEventRef.current = event;
		setArmed(true);
	};

	const rootProps = {
		ref: composedRef,
		"aria-describedby": describedBy,
		"data-slot": joinDataSlot(dataSlot, "truncated-text"),
		// Why "closed" before the tooltip mounts: Radix stamps the state once it
		// mounts, and the attribute stays a stable styling hook in both states.
		"data-state": insideControl ? undefined : "closed",
		// Why `ltr`: a URL, an ID, or a token reads left to right on an RTL page
		// too, so the tail stays on the right and the head clips at its end.
		dir: "ltr",
		className: cx(rootClassName, className),
		style: $cssProperties({
			"--_tail-width": tailReserve,
			...(lead != null && { "--_head-cap": headCap }),
			...style,
		}),
		// Why only the consumer's: the batch sets the tab stop on the DOM while
		// the value overflows, so a resize never renders the component.
		tabIndex,
		// Why the open events pass only while the value overflows: Radix closes
		// every other tooltip on the page before it reads `open`.
		onPointerMove: (event: PointerEvent<HTMLSpanElement>) => {
			onPointerMove?.(event);
			if (event.pointerType === "touch" || !canOpen(event.currentTarget)) {
				return;
			}
			if (armed) {
				triggerRef.current?.handlers.onPointerMove?.(event);
			} else {
				arm({ type: "pointermove", event });
			}
		},
		onPointerLeave: (event: PointerEvent<HTMLSpanElement>) => {
			onPointerLeave?.(event);
			triggerRef.current?.handlers.onPointerLeave?.(event);
		},
		onPointerDown: (event: PointerEvent<HTMLSpanElement>) => {
			onPointerDown?.(event);
			if (armed) {
				triggerRef.current?.handlers.onPointerDown?.(event);
				return;
			}
			// Why: a focus that a press causes opens no tooltip, like Radix's own trigger.
			pointerDownRef.current = true;
			document.addEventListener(
				"pointerup",
				() => {
					pointerDownRef.current = false;
				},
				{ once: true },
			);
		},
		onFocus: (event: FocusEvent<HTMLSpanElement>) => {
			onFocus?.(event);
			if (!canOpen(event.currentTarget)) {
				return;
			}
			if (armed) {
				triggerRef.current?.handlers.onFocus?.(event);
			} else if (!pointerDownRef.current) {
				arm({ type: "focus", event });
			}
		},
		onBlur: (event: FocusEvent<HTMLSpanElement>) => {
			onBlur?.(event);
			triggerRef.current?.handlers.onBlur?.(event);
		},
		onClick: (event: MouseEvent<HTMLSpanElement>) => {
			onClick?.(event);
			triggerRef.current?.handlers.onClick?.(event);
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
		root = <Slot {...rootProps}>{cloneElement(singleChild, {}, segments)}</Slot>;
	} else {
		root = <span {...rootProps}>{segments}</span>;
	}

	// Why the tooltip is a sibling and mounts on first use: Radix's root and
	// trigger cost more to mount than the rest of the component, and a table
	// mounts one for each row. As a sibling, it mounts without a remount of the root.
	// Why not inside a control: a control cannot hold a second tab stop or tooltip.
	return (
		<>
			{root}
			{armed && !insideControl && (
				<TooltipPrimitiveRoot
					open={open}
					onOpenChange={(next) => {
						const element = targetRef.current?.root;
						setOpen(next && element != null && isTruncated(element));
					}}
				>
					<TooltipPrimitiveTrigger asChild>
						<TriggerBridge
							onBind={(binding) => {
								const previous = triggerRef.current;
								triggerRef.current = binding;
								const element = targetRef.current?.root;
								if (element == null) {
									return;
								}
								if (previous?.ref !== binding.ref) {
									assignRef(previous?.ref, null);
									assignRef(binding.ref, element);
								}
								if (binding.state != null) {
									element.setAttribute("data-state", binding.state);
								}
								const pending = pendingEventRef.current;
								if (pending == null) {
									return;
								}
								pendingEventRef.current = null;
								// Why a microtask: Radix starts its open-delay timer here, and in
								// development StrictMode reruns Radix's effects after this one, which
								// clears that timer. The microtask runs after the commit.
								queueMicrotask(() => {
									const handlers = triggerRef.current?.handlers;
									if (pending.type === "pointermove") {
										handlers?.onPointerMove?.(pending.event);
									} else if (document.activeElement === element) {
										handlers?.onFocus?.(pending.event);
									}
								});
							}}
						/>
					</TooltipPrimitiveTrigger>
					{/* Why 24rem: a resource ID fits on one line, so only a longer value wraps.
					    Why `text-balance`: `break-all` fills each line to the edge, so a value a
					    little wider than the tooltip leaves one or two characters on the last line.
					    Why the key: a new value must measure its lines again. */}
					<Tooltip.Content
						className="max-w-[min(24rem,calc(100vw-2rem))] break-all text-balance"
						translate={translate}
					>
						<span key={value} ref={fitToLongestLine} className="block">
							{value}
						</span>
					</Tooltip.Content>
				</TooltipPrimitiveRoot>
			)}
		</>
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
