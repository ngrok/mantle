import type { ComponentProps } from "react";
import { cx } from "../cx/cx.js";

const tabbableSelector = [
	"a[href]",
	"button:not(:disabled)",
	"input:not(:disabled):not([type='hidden'])",
	"select:not(:disabled)",
	"textarea:not(:disabled)",
	"[contenteditable]:not([contenteditable='false'])",
	"[tabindex]:not([tabindex='-1'])",
].join(", ");

/**
 * Moves focus to the first element in `container` that Tab reaches, else to
 * `container` itself. The page does not scroll to it.
 *
 * @example
 * ```ts
 * focusFirst(popoverContent); // focuses the content's first button
 * ```
 */
function focusFirst(container: HTMLElement): void {
	const first = container.querySelector<HTMLElement>(tabbableSelector);
	(first ?? container).focus({ preventScroll: true });
}

type FloatArrowProps = Omit<ComponentProps<"svg">, "children" | "width" | "height"> & {
	/**
	 * The width of the arrow, in pixels.
	 * @default 14
	 */
	width?: number;
	/**
	 * The height of the arrow, in pixels.
	 * @default 7
	 */
	height?: number;
};

/**
 * The arrow of a popover-styled float: a filled tip, plus a stroke along its
 * slanted edges that continues the float's border. `trackFloat` moves its
 * wrapper (`data-float-arrow`) to the edge that faces the anchor and turns it.
 *
 * @example
 * ```tsx
 * <FloatArrow data-slot="popover-arrow" />
 * ```
 */
function FloatArrow({ className, height = 7, width = 14, ...props }: FloatArrowProps) {
	return (
		<span data-float-arrow="" className="block">
			<svg
				aria-hidden="true"
				className={cx(
					"block",
					// The wrapper sits on the float's padding box, so the base lands 1px
					// inside the border box, and the fill covers the border it sits on.
					"fill-(--background-color-popover)",
					// Why filter and clip-path: the float's `shadow-md` stops at its own
					// border, so an unshadowed tip reads as pasted on. The clip trims the
					// tip's shadow at the base, because the arrow paints above the float.
					"[clip-path:inset(0_-200%_-200%_-200%)]",
					"filter-[drop-shadow(0_0_4px_color-mix(in_oklab,var(--shadow-color)_var(--shadow-first-opacity),transparent))]",
					className,
				)}
				height={height}
				preserveAspectRatio="none"
				viewBox="0 0 30 10"
				width={width}
				{...props}
			>
				<polygon points="0,0 30,0 15,10" />
				<polyline
					className="stroke-(--border-color-popover)"
					fill="none"
					points="0,0 15,10 30,0"
					// Why 1.5 against the float's 1px border: antialiasing spreads a
					// diagonal hairline across two device rows, so 1px reads thinner.
					strokeWidth={1.5}
					vectorEffect="non-scaling-stroke"
				/>
			</svg>
		</span>
	);
}

export {
	//,
	FloatArrow,
	focusFirst,
};
