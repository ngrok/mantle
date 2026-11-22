import { canUseDOM } from "../../components/browser-only/can-use-dom.js";

/** The side of the anchor that a float sits on. */
type Side = "top" | "right" | "bottom" | "left";

/** How a float lines up with its anchor along the side it sits on. */
type Align = "start" | "center" | "end";

/** The space a float keeps from the edge of the viewport, in pixels. */
const VIEWPORT_PADDING = 8;

const oppositeSide = {
	top: "bottom",
	right: "left",
	bottom: "top",
	left: "right",
} as const satisfies Record<Side, Side>;

type Box = Pick<DOMRect, "top" | "right" | "bottom" | "left" | "width" | "height">;

type Placement = {
	/** The side the float sits on: the preferred side, or its opposite when only that one fits. */
	side: Side;
	/** The left edge of the float, in viewport pixels. */
	x: number;
	/** The top edge of the float, in viewport pixels. */
	y: number;
};

/** Whether a float of `size` fits on `side` of `anchor` inside the viewport. */
function fits({
	anchor,
	side,
	sideOffset,
	size,
	viewport,
}: {
	anchor: Box;
	side: Side;
	sideOffset: number;
	size: { width: number; height: number };
	viewport: { width: number; height: number };
}): boolean {
	switch (side) {
		case "top":
			return anchor.top - sideOffset - size.height >= VIEWPORT_PADDING;
		case "bottom":
			return anchor.bottom + sideOffset + size.height <= viewport.height - VIEWPORT_PADDING;
		case "left":
			return anchor.left - sideOffset - size.width >= VIEWPORT_PADDING;
		case "right":
			return anchor.right + sideOffset + size.width <= viewport.width - VIEWPORT_PADDING;
	}
}

/** Lines up a float of `length` with an anchor span, then keeps it inside the viewport. */
function alignOnAxis({
	align,
	end,
	length,
	start,
	viewportLength,
}: {
	align: Align;
	end: number;
	length: number;
	start: number;
	viewportLength: number;
}): number {
	const aligned = {
		start,
		center: start + (end - start - length) / 2,
		end: end - length,
	}[align];
	const max = viewportLength - VIEWPORT_PADDING - length;
	return Math.max(VIEWPORT_PADDING, Math.min(aligned, max));
}

/**
 * Places a float of `size` next to `anchor`. It flips to the opposite side
 * when the preferred side does not fit and the opposite side does, and it
 * shifts along the side to stay `VIEWPORT_PADDING` inside the viewport. The
 * CSS path takes the side it picks.
 *
 * @example
 * ```ts
 * computePlacement({
 *   anchor: { top: 10, bottom: 30, left: 100, right: 160, width: 60, height: 20 },
 *   size: { width: 80, height: 40 },
 *   viewport: { width: 1280, height: 720 },
 *   side: "top",
 *   align: "center",
 *   sideOffset: 4,
 * }); // { side: "bottom", x: 90, y: 34 }: no room above, so it flips below
 * ```
 */
function computePlacement({
	align,
	anchor,
	side,
	sideOffset,
	size,
	viewport,
}: {
	align: Align;
	anchor: Box;
	side: Side;
	sideOffset: number;
	size: { width: number; height: number };
	viewport: { width: number; height: number };
}): Placement {
	const flipped = oppositeSide[side];
	const placedSide =
		fits({ anchor, side, sideOffset, size, viewport }) ||
		!fits({ anchor, side: flipped, sideOffset, size, viewport })
			? side
			: flipped;
	if (placedSide === "top" || placedSide === "bottom") {
		return {
			side: placedSide,
			x: alignOnAxis({
				align,
				start: anchor.left,
				end: anchor.right,
				length: size.width,
				viewportLength: viewport.width,
			}),
			y: placedSide === "top" ? anchor.top - sideOffset - size.height : anchor.bottom + sideOffset,
		};
	}
	return {
		side: placedSide,
		x: placedSide === "left" ? anchor.left - sideOffset - size.width : anchor.right + sideOffset,
		y: alignOnAxis({
			align,
			start: anchor.top,
			end: anchor.bottom,
			length: size.height,
			viewportLength: viewport.height,
		}),
	};
}

/**
 * Whether the browser places floats with CSS anchor positioning. Safari before
 * 26 and Firefox before 147 do not, so `trackFloat` places floats from script there.
 */
const supportsAnchorPositioning =
	canUseDOM() &&
	typeof CSS !== "undefined" &&
	CSS.supports("anchor-name: --a") &&
	CSS.supports("position-area: top");

/** The `position-area` for each side and alignment, in physical keywords so it matches `computePlacement`. */
const positionArea = {
	top: { start: "top span-right", center: "top", end: "top span-left" },
	bottom: { start: "bottom span-right", center: "bottom", end: "bottom span-left" },
	left: { start: "left span-bottom", center: "left", end: "left span-top" },
	right: { start: "right span-bottom", center: "right", end: "right span-top" },
} as const satisfies Record<Side, Record<Align, string>>;

/**
 * Where an arrow sits for each side the float resolves to. The arrow points
 * down at rest; each side moves it to the edge that faces the anchor and turns it.
 */
const arrowStyles = {
	top: { edge: "bottom", origin: "", transform: "translateY(100%)" },
	right: {
		edge: "left",
		origin: "0 0",
		transform: "translateY(50%) rotate(90deg) translateX(-50%)",
	},
	bottom: { edge: "top", origin: "center 0", transform: "rotate(180deg)" },
	left: {
		edge: "right",
		origin: "100% 0",
		transform: "translateY(50%) rotate(-90deg) translateX(50%)",
	},
} as const satisfies Record<Side, { edge: Side; origin: string; transform: string }>;

const oppositeAlign = { start: "end", end: "start" } as const;

/** The properties that make an element the containing block of a `position: fixed` descendant when they are set. */
const containingBlockProperties = [
	"transform",
	"scale",
	"translate",
	"rotate",
	"filter",
	"perspective",
	"backdrop-filter",
	"-webkit-backdrop-filter",
];

/**
 * The nearest ancestor that a `position: fixed` element measures `left` and
 * `top` from, such as one with a transform or a filter, else `null` for the viewport.
 */
function findFixedContainingBlock(element: HTMLElement): HTMLElement | null {
	for (let parent = element.parentElement; parent != null; parent = parent.parentElement) {
		const style = getComputedStyle(parent);
		// Why `getPropertyValue`: an old browser returns "" for a property it does not know.
		const sets = (property: string) => !["", "none"].includes(style.getPropertyValue(property));
		if (
			containingBlockProperties.some(sets) ||
			/paint|layout|strict|content/.test(style.getPropertyValue("contain")) ||
			/transform|filter|perspective/.test(style.getPropertyValue("will-change"))
		) {
			return parent;
		}
	}
	return null;
}

let anchorCount = 0;

/**
 * Keeps an open float next to `anchor` and returns the cleanup. After each
 * scroll, resize, size change, and end of a transition or animation,
 * `computePlacement` picks the side. With CSS anchor positioning, the browser
 * places the float on that side and keeps it there between frames. Without it,
 * this places the float.
 *
 * Why not `position-try-fallbacks`: WebKit drops the registered custom
 * properties of a float that takes a fallback, so Tailwind's border and shadow
 * utilities paint nothing.
 *
 * Each frame it writes on the float `data-side` (the side it resolved to),
 * `--anchor-width`, `--available-height`, and a `transform-origin` at the
 * anchor. A child with `data-float-arrow` moves to the edge that faces the
 * anchor and centers on the anchor.
 *
 * @example
 * ```ts
 * const stop = trackFloat({ anchor: trigger, floating: content, side: "bottom", align: "start", sideOffset: 4 });
 * // later, when the float closes
 * stop();
 * ```
 */
function trackFloat({
	align: logicalAlign,
	anchor,
	floating,
	side,
	sideOffset,
}: {
	align: Align;
	anchor: HTMLElement;
	floating: HTMLElement;
	side: Side;
	sideOffset: number;
}): () => void {
	const anchorName = `--mantle-float-${++anchorCount}`;
	// Why: `start` and `end` follow the text direction, as they did with Radix.
	// Above or below the anchor in a right-to-left document, `start` is the right edge.
	const align =
		(side === "top" || side === "bottom") &&
		logicalAlign !== "center" &&
		getComputedStyle(anchor).direction === "rtl"
			? oppositeAlign[logicalAlign]
			: logicalAlign;
	const arrow = floating.querySelector<HTMLElement>(":scope > [data-float-arrow]");
	// Why the arrow's height: the arrow sticks out of the float toward the
	// anchor, so `sideOffset` is the gap between its tip and the anchor.
	const gap = sideOffset + (arrow?.offsetHeight ?? 0);
	floating.style.inset = "auto";
	if (supportsAnchorPositioning) {
		// Why a list: one element can anchor two floats, such as a tooltip on a popover trigger.
		const names = anchor.style.getPropertyValue("anchor-name");
		anchor.style.setProperty("anchor-name", names === "" ? anchorName : `${names}, ${anchorName}`);
		floating.style.setProperty("position-anchor", anchorName);
		// Why margins across the side: the browser shifts a float that overflows
		// the viewport back inside its margin box, so these keep it
		// `VIEWPORT_PADDING` from the edge, as `computePlacement` does. The edge
		// that the float aligns to takes none, so the alignment holds.
		const [crossStart, crossEnd] =
			side === "top" || side === "bottom"
				? (["left", "right"] as const)
				: (["top", "bottom"] as const);
		if (align !== "start") {
			floating.style.setProperty(`margin-${crossStart}`, `${VIEWPORT_PADDING}px`);
		}
		if (align !== "end") {
			floating.style.setProperty(`margin-${crossEnd}`, `${VIEWPORT_PADDING}px`);
		}
	}

	let cssSide: Side | null = null;
	/** Puts a float placed by CSS on `next`, `gap` away from the anchor. */
	const setCssSide = (next: Side) => {
		if (next === cssSide) {
			return;
		}
		if (cssSide != null) {
			floating.style.removeProperty(`margin-${oppositeSide[cssSide]}`);
		}
		cssSide = next;
		floating.style.setProperty("position-area", positionArea[next][align]);
		floating.style.setProperty(`margin-${oppositeSide[next]}`, `${gap}px`);
	};
	if (supportsAnchorPositioning) {
		setCssSide(side);
	}

	// Why: with no popover API the float is not in the top layer, so a
	// transformed overlay or float that holds it is its containing block, and
	// `left` and `top` start at that element. An open animation sets and clears
	// the transform, so each placement looks again.
	const inTopLayer = "togglePopover" in HTMLElement.prototype;

	let frame = 0;
	const place = () => {
		const anchorBox = anchor.getBoundingClientRect();
		const width = floating.offsetWidth;
		const height = floating.offsetHeight;
		const viewport = {
			width: document.documentElement.clientWidth,
			height: document.documentElement.clientHeight,
		};
		let placed = computePlacement({
			align,
			anchor: anchorBox,
			side,
			sideOffset: gap,
			size: { width, height },
			viewport,
		});
		if (supportsAnchorPositioning) {
			setCssSide(placed.side);
			// Why the center: the open animation scales the float around its center,
			// so the box edges move while the layout size stays.
			const box = floating.getBoundingClientRect();
			placed = {
				side: placed.side,
				x: (box.left + box.right) / 2 - width / 2,
				y: (box.top + box.bottom) / 2 - height / 2,
			};
		} else {
			const containingBlock = inTopLayer ? null : findFixedContainingBlock(floating);
			const origin = containingBlock?.getBoundingClientRect();
			const originX = origin == null ? 0 : origin.left + (containingBlock?.clientLeft ?? 0);
			const originY = origin == null ? 0 : origin.top + (containingBlock?.clientTop ?? 0);
			floating.style.left = `${placed.x - originX}px`;
			floating.style.top = `${placed.y - originY}px`;
		}
		const anchorCenterX = anchorBox.left + anchorBox.width / 2 - placed.x;
		const anchorCenterY = anchorBox.top + anchorBox.height / 2 - placed.y;
		const availableHeight = {
			top: anchorBox.top - gap,
			bottom: viewport.height - anchorBox.bottom - gap,
			left: viewport.height,
			right: viewport.height,
		}[placed.side];
		floating.dataset.side = placed.side;
		floating.style.setProperty("--anchor-width", `${anchorBox.width}px`);
		floating.style.setProperty(
			"--available-height",
			`${Math.max(availableHeight - VIEWPORT_PADDING, 0)}px`,
		);
		floating.style.transformOrigin = {
			top: `${anchorCenterX}px 100%`,
			bottom: `${anchorCenterX}px 0`,
			left: `100% ${anchorCenterY}px`,
			right: `0 ${anchorCenterY}px`,
		}[placed.side];

		if (arrow != null) {
			const style = arrowStyles[placed.side];
			const vertical = placed.side === "top" || placed.side === "bottom";
			const length = vertical ? width : height;
			const center = vertical ? anchorCenterX : anchorCenterY;
			const offset = Math.max(
				0,
				Math.min(center - arrow.offsetWidth / 2, length - arrow.offsetWidth),
			);
			arrow.style.position = "absolute";
			arrow.style.inset = "auto";
			arrow.style.setProperty(style.edge, "0");
			arrow.style.setProperty(vertical ? "left" : "top", `${offset}px`);
			arrow.style.transformOrigin = style.origin;
			arrow.style.transform = style.transform;
		}
	};
	const schedule = () => {
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(place);
	};
	const observer = new ResizeObserver(schedule);
	observer.observe(anchor);
	observer.observe(floating);
	place();
	window.addEventListener("scroll", schedule, { capture: true, passive: true });
	window.addEventListener("resize", schedule, { passive: true });
	// Why: an overlay's open animation moves the anchor with no resize or scroll.
	window.addEventListener("transitionend", schedule, { capture: true, passive: true });
	window.addEventListener("animationend", schedule, { capture: true, passive: true });
	return () => {
		cancelAnimationFrame(frame);
		observer.disconnect();
		window.removeEventListener("scroll", schedule, { capture: true });
		window.removeEventListener("resize", schedule);
		window.removeEventListener("transitionend", schedule, { capture: true });
		window.removeEventListener("animationend", schedule, { capture: true });
		// Why: the next placement of the same float sets only the margins it needs.
		for (const edge of ["top", "right", "bottom", "left"] as const) {
			floating.style.removeProperty(`margin-${edge}`);
		}
		if (supportsAnchorPositioning) {
			// Why a filter: another float on the same anchor can close after this one.
			const otherNames = anchor.style
				.getPropertyValue("anchor-name")
				.split(",")
				.map((name) => name.trim())
				.filter((name) => name !== "" && name !== anchorName);
			if (otherNames.length === 0) {
				anchor.style.removeProperty("anchor-name");
			} else {
				anchor.style.setProperty("anchor-name", otherNames.join(", "));
			}
		}
	};
}

export {
	//,
	computePlacement,
	supportsAnchorPositioning,
	trackFloat,
};

export type {
	//,
	Align,
	Side,
};
