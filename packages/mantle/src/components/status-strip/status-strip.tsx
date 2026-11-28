import {
	type ComponentProps,
	cloneElement,
	Fragment,
	type HTMLAttributes,
	isValidElement,
	type ReactNode,
} from "react";
import invariant from "tiny-invariant";
import type { SelfClosingWithAsChild, WithAsChild } from "../../types/as-child.js";
import { $cssProperties } from "../../types/css-properties.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Slot } from "../slot/index.js";

/**
 * How a strip is named, or that it is hidden. A strip that a screen reader
 * reads needs a name; a strip beside text that says the same thing is hidden.
 */
type StatusStripRootLabel =
	| {
			/**
			 * The summary a screen reader reads for the whole strip, such as
			 * `"In stock 82% of the last 30 days"`. Required unless `aria-labelledby`
			 * or `aria-hidden` is set.
			 */
			"aria-label": string;
			"aria-labelledby"?: undefined;
			"aria-hidden"?: undefined;
	  }
	| {
			/**
			 * The id of visible text that summarizes the strip. Use it in place of
			 * `aria-label` when that text is on the page.
			 */
			"aria-labelledby": string;
			"aria-label"?: undefined;
			"aria-hidden"?: undefined;
	  }
	| {
			/**
			 * Hides the strip from assistive technology. Set it only when nearby
			 * text already says what the strip shows.
			 */
			"aria-hidden": true;
			"aria-label"?: undefined;
			"aria-labelledby"?: undefined;
	  };

/**
 * Throws unless an `asChild` part has one element child that renders a host
 * element. A fragment renders no element to carry the part's props.
 */
function invariantAsChildHost({
	asChild,
	children,
	part,
}: {
	asChild: boolean;
	children: ReactNode;
	part: string;
}) {
	invariant(
		!asChild || (isValidElement(children) && children.type !== Fragment),
		`${part} with asChild needs one element child, not a fragment, text, or a list.`,
	);
}

/**
 * Props for `StatusStrip.Root`.
 *
 * @see https://mantle.ngrok.com/components/data-display/status-strip#statusstriproot
 */
type StatusStripRootProps = Omit<
	ComponentProps<"span">,
	"aria-label" | "aria-labelledby" | "aria-hidden" | "role"
> &
	StatusStripRootLabel &
	WithAsChild &
	WithDataSlot;

/**
 * A row of equal segments over time, such as one segment for each hour or day.
 * Each `StatusStrip.Segment` is shaded by its share of the time in one state.
 *
 * It renders a `<span>` grid, so it fits in phrasing content such as a link or
 * a table segment. It is `role="img"` and needs a name: pass `aria-label` with a
 * summary, or `aria-labelledby`. When nearby text already says the same thing,
 * pass `aria-hidden` in place of a name. The segments are not read on their own.
 *
 * Set the colors on the root, and set the segment width with `auto-cols-*`.
 *
 * | CSS Variable           | Default                  | Description                                                         |
 * | ---------------------- | ------------------------ | ------------------------------------------------------------------- |
 * | `--status-strip-fill`  | `var(--color-accent-600)` | The color of a segment with a share above 0. Read by `StatusStrip.Segment`. |
 * | `--status-strip-track` | `var(--color-gray-300)`   | The fill of a segment at 0, and the lines of a segment with no data. Read by `StatusStrip.Segment`. |
 *
 * | Data Attribute | Value            | Description       |
 * | -------------- | ---------------- | ----------------- |
 * | `data-slot`    | `"status-strip"` | The root element. |
 *
 * @see https://mantle.ngrok.com/components/data-display/status-strip#statusstriproot
 *
 * @example
 * ```tsx
 * <StatusStrip.Root aria-label="In stock 50% of the 3 hours with a reading">
 *   <StatusStrip.Segment value={1} title="09:00 UTC: in stock" />
 *   <StatusStrip.Segment value={0.5} title="10:00 UTC: in stock in 1 of 2 readings" />
 *   <StatusStrip.Segment value={0} title="11:00 UTC: sold out" />
 *   <StatusStrip.Segment value={null} title="12:00 UTC: no reading" />
 * </StatusStrip.Root>
 * ```
 */
function Root({
	"aria-hidden": ariaHidden,
	"aria-label": ariaLabel,
	"aria-labelledby": ariaLabelledBy,
	asChild = false,
	children,
	className,
	"data-slot": dataSlot,
	...props
}: StatusStripRootProps) {
	invariant(
		ariaHidden === true || Boolean(ariaLabel?.trim()) || Boolean(ariaLabelledBy?.trim()),
		"StatusStrip.Root needs aria-label or aria-labelledby, or aria-hidden when nearby text says the same thing.",
	);
	invariantAsChildHost({ asChild, children, part: "StatusStrip.Root" });
	const semantics = {
		"aria-hidden": ariaHidden,
		"aria-label": ariaLabel,
		"aria-labelledby": ariaLabelledBy,
		role: ariaHidden ? undefined : "img",
	};
	const rootProps = {
		...props,
		...semantics,
		"data-slot": joinDataSlot(dataSlot, "status-strip"),
		className: cx("grid h-6 w-full auto-cols-fr grid-flow-col gap-px", className),
	};

	if (asChild) {
		// Why clone: `Slot` lets the child's props win, and the root owns its role and its name.
		return (
			<Slot {...rootProps}>
				{isValidElement<HTMLAttributes<HTMLElement>>(children)
					? cloneElement(children, semantics)
					: children}
			</Slot>
		);
	}

	return <span {...rootProps}>{children}</span>;
}

/**
 * The look of a segment: `"no-data"` for `null`, `"none"` for 0, `"all"` for 1,
 * and `"some"` between them.
 */
type StatusStripShare = "no-data" | "none" | "some" | "all";

/**
 * Classifies a segment's share. Throws for a value that is not `null` or a number
 * from 0 to 1, such as `undefined`, a string, or `NaN` from a division by 0.
 */
function shareOf(value: number | null): StatusStripShare {
	// Why a function: a page renders many segments, so the message is built only when it throws.
	const message = () =>
		`StatusStrip.Segment value must be a number from 0 to 1, or null for no data. Received ${String(value)}.`;
	// Why `=== undefined`: a missing value is a caller bug, and only `null` means no data.
	invariant(value !== undefined, message);
	if (value == null) {
		return "no-data";
	}
	invariant(typeof value === "number" && value >= 0 && value <= 1, message);
	if (value === 0) {
		return "none";
	}
	return value === 1 ? "all" : "some";
}

/**
 * Props for `StatusStrip.Segment`.
 *
 * @see https://mantle.ngrok.com/components/data-display/status-strip#statusstripsegment
 */
type StatusStripSegmentProps = Omit<ComponentProps<"span">, "children"> &
	SelfClosingWithAsChild &
	WithDataSlot & {
		/**
		 * The share of the segment's time in the state, from 0 to 1, or `null` when
		 * the segment has no data. `null` is not 0: a segment at 0 fills with the track
		 * color, and a segment with no data is empty between two lines. Required; any other value throws.
		 */
		value: number | null;
	};

/**
 * One segment of a `StatusStrip`, such as one hour or one day. It fills with
 * `--status-strip-fill`, stronger as `value` grows: a share above 0 starts
 * at 35% so a short time still shows. A segment at 0 fills with
 * `--status-strip-track`, and a segment with no data is empty between two lines in that color.
 *
 * Pass `title` for a pointer hint, such as the time span and its share. Put
 * what a reader must know in the root's label, because the segments are not read
 * on their own.
 *
 * Keep the segment non-interactive, also under `asChild`: a screen reader cannot
 * reach a link or a button inside `role="img"`. Put detail links outside the strip.
 *
 * | CSS Variable           | Default                   | Description                                                  |
 * | ---------------------- | ------------------------- | ------------------------------------------------------------ |
 * | `--status-strip-fill`  | `var(--color-accent-600)` | The fill above 0. Set it on `StatusStrip.Root`, or on one segment for its own color, such as a threshold color. |
 * | `--status-strip-track` | `var(--color-gray-300)`   | The fill at 0, and the lines with no data. Set it on `StatusStrip.Root`, or on one segment. |
 *
 * | Data Attribute | Value                                     | Description                                                            |
 * | -------------- | ----------------------------------------- | ---------------------------------------------------------------------- |
 * | `data-slot`    | `"status-strip-segment"`                     | The segment element.                                                      |
 * | `data-share`   | `"no-data"`, `"none"`, `"some"`, `"all"` | `null`, 0, between 0 and 1, and 1. Style a state with `data-[share=none]:`. |
 *
 * @see https://mantle.ngrok.com/components/data-display/status-strip#statusstripsegment
 *
 * @example
 * ```tsx
 * <StatusStrip.Root aria-label="In stock 50% of the 3 hours with a reading">
 *   <StatusStrip.Segment value={1} title="09:00 UTC: in stock" />
 *   <StatusStrip.Segment value={0.5} title="10:00 UTC: in stock in 1 of 2 readings" />
 *   <StatusStrip.Segment value={0} title="11:00 UTC: sold out" />
 *   <StatusStrip.Segment value={null} title="12:00 UTC: no reading" />
 * </StatusStrip.Root>
 * ```
 */
function Segment({
	asChild = false,
	children,
	className,
	"data-slot": dataSlot,
	style,
	value,
	...props
}: StatusStripSegmentProps) {
	const share = shareOf(value);
	invariantAsChildHost({ asChild, children, part: "StatusStrip.Segment" });
	const Component = asChild ? Slot : "span";

	return (
		<Component
			{...props}
			// Why after the spread: `data-share` drives the paint, so a forwarded value must not replace the reading.
			data-share={share}
			data-slot={joinDataSlot(dataSlot, "status-strip-segment")}
			// Why one utility: a page holds many strips of many segments, so the paint is in `status-strip-segment` in mantle.css.
			className={cx("status-strip-segment", className)}
			// Why only for "some": the utility paints 0, 1, and no data without the value, so most segments carry no style.
			style={
				share === "some" ? $cssProperties({ "--_status-strip-value": value ?? 0, ...style }) : style
			}
		>
			{asChild && isValidElement<Record<string, unknown>>(children)
				? // Why clone: `Slot` lets the child's props win, and `data-share` must match `value`.
					cloneElement(children, { "data-share": share })
				: children}
		</Component>
	);
}

export {
	//,
	Root,
	Segment,
};

export type {
	//,
	StatusStripRootProps,
	StatusStripSegmentProps,
};
