import type { ComponentProps } from "react";
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
 * A row of equal cells over time, such as one cell for each hour or day.
 * Each `StatusStrip.Cell` is shaded by its share of the time in one state.
 *
 * It renders a `<span>` grid, so it fits in phrasing content such as a link or
 * a table cell. It is `role="img"` and needs a name: pass `aria-label` with a
 * summary, or `aria-labelledby`. When nearby text already says the same thing,
 * pass `aria-hidden` in place of a name. The cells are not read on their own.
 *
 * Set the colors on the root, and set the cell width with `auto-cols-*`.
 *
 * | CSS Variable           | Default                  | Description                                                         |
 * | ---------------------- | ------------------------ | ------------------------------------------------------------------- |
 * | `--status-strip-fill`  | `var(--color-accent-600)` | The color of a cell with a share above 0. Read by `StatusStrip.Cell`. |
 * | `--status-strip-track` | `var(--color-gray-300)`   | The fill of a cell at 0, and the outline of a cell with no data. Read by `StatusStrip.Cell`. |
 *
 * | Data Attribute | Value            | Description       |
 * | -------------- | ---------------- | ----------------- |
 * | `data-slot`    | `"status-strip"` | The root element. |
 *
 * @see https://mantle.ngrok.com/components/data-display/status-strip#statusstriproot
 *
 * @example
 * ```tsx
 * <StatusStrip.Root aria-label="In stock 75% of the last 4 hours">
 *   <StatusStrip.Cell value={1} title="09:00 UTC: in stock" />
 *   <StatusStrip.Cell value={0.5} title="10:00 UTC: in stock in 1 of 2 readings" />
 *   <StatusStrip.Cell value={0} title="11:00 UTC: sold out" />
 *   <StatusStrip.Cell value={null} title="12:00 UTC: no reading" />
 * </StatusStrip.Root>
 * ```
 */
function Root({
	"aria-hidden": ariaHidden,
	"aria-label": ariaLabel,
	"aria-labelledby": ariaLabelledBy,
	asChild = false,
	className,
	"data-slot": dataSlot,
	...props
}: StatusStripRootProps) {
	invariant(
		ariaHidden === true || Boolean(ariaLabel) || Boolean(ariaLabelledBy),
		"StatusStrip.Root needs aria-label or aria-labelledby, or aria-hidden when nearby text says the same thing.",
	);
	const Component = asChild ? Slot : "span";

	return (
		<Component
			aria-hidden={ariaHidden}
			aria-label={ariaLabel}
			aria-labelledby={ariaLabelledBy}
			role={ariaHidden ? undefined : "img"}
			data-slot={joinDataSlot(dataSlot, "status-strip")}
			className={cx("grid h-6 auto-cols-fr grid-flow-col gap-px", className)}
			{...props}
		/>
	);
}

/**
 * The look of a cell: `"no-data"` for `null`, `"none"` for 0, `"all"` for 1,
 * and `"some"` between them.
 */
type StatusStripShare = "no-data" | "none" | "some" | "all";

/**
 * Classifies a cell's share. Throws for a value that is not a number from 0 to 1,
 * such as `NaN` from a division by 0.
 */
function shareOf(value: number | null | undefined): StatusStripShare {
	if (value == null) {
		return "no-data";
	}
	invariant(
		value >= 0 && value <= 1,
		`StatusStrip.Cell value must be a number from 0 to 1, or null for no data. Received ${value}.`,
	);
	if (value === 0) {
		return "none";
	}
	return value === 1 ? "all" : "some";
}

/**
 * Props for `StatusStrip.Cell`.
 *
 * @see https://mantle.ngrok.com/components/data-display/status-strip#statusstripcell
 */
type StatusStripCellProps = Omit<ComponentProps<"span">, "children"> &
	SelfClosingWithAsChild &
	WithDataSlot & {
		/**
		 * The share of the cell's time in the state, from 0 to 1, or `null` when
		 * the cell has no data. `null` is not 0: a cell at 0 fills with the track
		 * color, and a cell with no data is an outline. Required; any other value throws.
		 */
		value: number | null;
	};

/**
 * One cell of a `StatusStrip`, such as one hour or one day. It fills with
 * `--status-strip-fill`, stronger as `value` grows: a share above 0 starts
 * at 35% so a short time still shows. A cell at 0 fills with
 * `--status-strip-track`, and a cell with no data is an outline in that color.
 *
 * Pass `title` for a pointer hint, such as the time span and its share. Put
 * what a reader must know in the root's label, because the cells are not read
 * on their own.
 *
 * | CSS Variable           | Default                   | Description                                                  |
 * | ---------------------- | ------------------------- | ------------------------------------------------------------ |
 * | `--status-strip-fill`  | `var(--color-accent-600)` | Read, not owned: set it on `StatusStrip.Root`. The fill above 0. |
 * | `--status-strip-track` | `var(--color-gray-300)`   | Read, not owned: set it on `StatusStrip.Root`. The fill at 0, and the outline with no data. |
 *
 * | Data Attribute | Value                                     | Description                                                            |
 * | -------------- | ----------------------------------------- | ---------------------------------------------------------------------- |
 * | `data-slot`    | `"status-strip-cell"`                     | The cell element.                                                      |
 * | `data-share`   | `"no-data"`, `"none"`, `"some"`, `"all"` | `null`, 0, between 0 and 1, and 1. Style a state with `data-[share=none]:`. |
 *
 * @see https://mantle.ngrok.com/components/data-display/status-strip#statusstripcell
 *
 * @example
 * ```tsx
 * <StatusStrip.Root aria-label="In stock 75% of the last 4 hours">
 *   <StatusStrip.Cell value={1} title="09:00 UTC: in stock" />
 *   <StatusStrip.Cell value={0.5} title="10:00 UTC: in stock in 1 of 2 readings" />
 *   <StatusStrip.Cell value={0} title="11:00 UTC: sold out" />
 *   <StatusStrip.Cell value={null} title="12:00 UTC: no reading" />
 * </StatusStrip.Root>
 * ```
 */
function Cell({
	asChild = false,
	className,
	"data-slot": dataSlot,
	style,
	value,
	...props
}: StatusStripCellProps) {
	const share = shareOf(value);
	const Component = asChild ? Slot : "span";

	return (
		<Component
			data-slot={joinDataSlot(dataSlot, "status-strip-cell")}
			data-share={share}
			className={cx(
				"rounded-[1px]",
				"bg-[color-mix(in_oklab,var(--status-strip-fill,var(--color-accent-600))_calc(35%_+_65%_*_var(--_status-strip-value)),transparent)]",
				"data-[share=none]:bg-(--status-strip-track,var(--color-gray-300))",
				"data-[share=no-data]:border data-[share=no-data]:border-(--status-strip-track,var(--color-gray-300)) data-[share=no-data]:bg-transparent",
				className,
			)}
			style={$cssProperties({ "--_status-strip-value": value ?? 0, ...style })}
			{...props}
		/>
	);
}

export {
	//,
	Root,
	Cell,
};

export type {
	//,
	StatusStripRootProps,
	StatusStripCellProps,
};
