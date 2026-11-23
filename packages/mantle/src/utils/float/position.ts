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

/**
 * The side a float takes when neither its preferred side nor the opposite one
 * fits: the preferred side, or the side with more room, such as for a list
 * that its `--available-height` caps.
 */
type Fallback = "preferred" | "larger";

/** The room on `side` of `anchor` inside the viewport, in pixels. */
function roomOn(anchor: Box, side: Side, viewport: { width: number; height: number }): number {
	return {
		top: anchor.top,
		bottom: viewport.height - anchor.bottom,
		left: anchor.left,
		right: viewport.width - anchor.right,
	}[side];
}

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
 * when the preferred side does not fit and the opposite side does, or, with
 * `fallback: "larger"`, when neither fits and the opposite side has more room. It
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
	fallback = "preferred",
	side,
	sideOffset,
	size,
	viewport,
}: {
	align: Align;
	anchor: Box;
	fallback?: Fallback;
	side: Side;
	sideOffset: number;
	size: { width: number; height: number };
	viewport: { width: number; height: number };
}): Placement {
	const flipped = oppositeSide[side];
	const flips =
		!fits({ anchor, side, sideOffset, size, viewport }) &&
		(fits({ anchor, side: flipped, sideOffset, size, viewport }) ||
			(fallback === "larger" &&
				roomOn(anchor, flipped, viewport) > roomOn(anchor, side, viewport)));
	const placedSide = flips ? flipped : side;
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

/**
 * Converts a viewport point to the coordinates that `left` and `top` take in a
 * fixed element's containing block: from its padding box, after its scroll
 * and its scale.
 */
function toLocalPoint(
	containingBlock: HTMLElement,
	x: number,
	y: number,
): { x: number; y: number } {
	const box = containingBlock.getBoundingClientRect();
	const scaleX = containingBlock.offsetWidth === 0 ? 1 : box.width / containingBlock.offsetWidth;
	const scaleY = containingBlock.offsetHeight === 0 ? 1 : box.height / containingBlock.offsetHeight;
	return {
		x: (x - box.left) / scaleX - containingBlock.clientLeft + containingBlock.scrollLeft,
		y: (y - box.top) / scaleY - containingBlock.clientTop + containingBlock.scrollTop,
	};
}

/**
 * The zoom that scales `element` from viewport pixels, its own `zoom` times
 * that of each ancestor. Why the walk: Safari has no `currentCSSZoom`.
 */
function zoomOf(element: HTMLElement): number {
	// Why `typeof`: the DOM types declare it in each browser.
	if (typeof element.currentCSSZoom === "number") {
		return element.currentCSSZoom;
	}
	let zoom = 1;
	for (let node: Element | null = element; node != null; node = node.parentElement) {
		zoom *= Number.parseFloat(getComputedStyle(node).zoom) || 1;
	}
	return zoom;
}

/** The anchor box and the viewport size, as one value to compare between frames. */
const keyOf = (rect: DOMRect): string =>
	`${rect.left} ${rect.top} ${rect.width} ${rect.height} ${document.documentElement.clientWidth} ${document.documentElement.clientHeight}`;

/**
 * Calls `onMove` when `element` moves in the viewport for any cause, such as a
 * layout shift above it, or a transform or animation on an ancestor, and
 * returns the cleanup. Why an `IntersectionObserver`: its root margin crops the
 * viewport to the element's box, so any move changes the visible ratio, and the
 * browser checks it with no script while nothing moves. After each report it
 * crops to the new box again.
 */
function observeMove(element: HTMLElement, onMove: () => void): () => void {
	let observer: IntersectionObserver | undefined;
	let stopped = false;
	const watch = (threshold = 1) => {
		observer?.disconnect();
		const { left, top, width, height } = element.getBoundingClientRect();
		if (width === 0 || height === 0) {
			return;
		}
		const root = document.documentElement;
		const crop = [top, root.clientWidth - left - width, root.clientHeight - top - height, left].map(
			(inset) => `${-Math.floor(inset)}px`,
		);
		let first = true;
		observer = new IntersectionObserver(
			([entry]) => {
				if (stopped) {
					return;
				}
				const ratio = entry?.intersectionRatio ?? threshold;
				// Why the first report: the browser reports the start state, and a
				// ratio other than the threshold means the element moved since the
				// crop, or that the viewport clips it. Then the observer watches for
				// a change from that ratio.
				if (first) {
					first = false;
					if (ratio !== threshold) {
						onMove();
						watch(ratio);
					}
					return;
				}
				onMove();
				watch();
			},
			{ rootMargin: crop.join(" "), threshold },
		);
		observer.observe(element);
	};
	// Why a size observer too: a box that shrinks inside the crop shows all of
	// itself, so the ratio does not change, and a box with no size has no crop.
	const sizeObserver = new ResizeObserver(() => {
		if (!stopped) {
			onMove();
			watch();
		}
	});
	sizeObserver.observe(element);
	return () => {
		stopped = true;
		sizeObserver.disconnect();
		observer?.disconnect();
	};
}

/**
 * Keeps an open float next to `anchor` and returns the cleanup. When the
 * anchor moves or changes size, the viewport changes size, or the float
 * changes size, it places the float with `left` and `top` on the side that
 * `computePlacement` picks, before the next paint.
 *
 * Why not CSS anchor positioning: Chromium recalculates style and layout of
 * an anchor-positioned element on each frame of a transition on it, even an
 * opacity transition, so each open fade costs a layout per frame. The script
 * places the float once for each change.
 *
 * With `fallback: "larger"`, it sizes the float by its content height
 * (`scrollHeight`), so a list that `--available-height` caps can still move
 * to the side with more room.
 *
 * Each frame it writes on the float `data-side` (the side it resolved to),
 * `--anchor-width`, `--anchor-height`, `--available-height`, and a `transform-origin` at the
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
	fallback = "preferred",
	dir,
	floating,
	side,
	sideOffset,
}: {
	align: Align;
	anchor: HTMLElement;
	fallback?: Fallback;
	/** The reading direction that `start` and `end` follow. Defaults to the anchor's direction. */
	dir?: "ltr" | "rtl";
	floating: HTMLElement;
	side: Side;
	sideOffset: number;
}): () => void {
	// Why: `start` and `end` follow the text direction, as they did with Radix.
	// Above or below the anchor in a right-to-left document, `start` is the right edge.
	const align =
		(side === "top" || side === "bottom") &&
		logicalAlign !== "center" &&
		(dir ?? getComputedStyle(anchor).direction) === "rtl"
			? oppositeAlign[logicalAlign]
			: logicalAlign;
	const arrow = floating.querySelector<HTMLElement>(":scope > [data-float-arrow]");
	floating.style.inset = "auto";
	// Why: with no popover API the float is not in the top layer, so a
	// transformed overlay or float that holds it is its containing block, and
	// `left` and `top` start at that element. An open animation sets and clears
	// the transform, so each placement looks again.
	const inTopLayer = "togglePopover" in HTMLElement.prototype;

	/** The anchor box and viewport size of the last placement, to see a move. */
	let placedFor = "";
	/** The float or the arrow changed size since the last placement. */
	let resized = false;
	const place = () => {
		resized = false;
		// Why the arrow's height, read on each placement: the arrow sticks out of
		// the float toward the anchor, so `sideOffset` is the gap between its tip
		// and the anchor, and the arrow can change size while the float is open.
		const gap = sideOffset + (arrow?.offsetHeight ?? 0);
		const rect = anchor.getBoundingClientRect();
		placedFor = keyOf(rect);
		// Why the zoom: `left`, `top`, and sizes on the float are in its own CSS
		// pixels, which an inherited or own `zoom` scales from viewport pixels.
		const zoom = zoomOf(floating);
		const anchorBox: Box = {
			top: rect.top / zoom,
			right: rect.right / zoom,
			bottom: rect.bottom / zoom,
			left: rect.left / zoom,
			width: rect.width / zoom,
			height: rect.height / zoom,
		};
		// Why before the reads: a float sized by the anchor, such as a picker list,
		// takes its final width and wrapped height in this placement.
		floating.style.setProperty("--anchor-width", `${anchorBox.width}px`);
		floating.style.setProperty("--anchor-height", `${anchorBox.height}px`);
		const width = floating.offsetWidth;
		const height = floating.offsetHeight;
		const contentHeight =
			fallback === "larger" ? floating.scrollHeight + height - floating.clientHeight : height;
		const viewport = {
			width: document.documentElement.clientWidth / zoom,
			height: document.documentElement.clientHeight / zoom,
		};
		let placed = computePlacement({
			align,
			anchor: anchorBox,
			fallback,
			side,
			sideOffset: gap,
			size: { width, height: contentHeight },
			viewport,
		});
		const availableHeight = {
			top: anchorBox.top - gap,
			bottom: viewport.height - anchorBox.bottom - gap,
			left: viewport.height,
			right: viewport.height,
		}[placed.side];
		floating.style.setProperty(
			"--available-height",
			`${Math.max(availableHeight - VIEWPORT_PADDING, 0)}px`,
		);
		// Why read the height again: the new `--available-height` can cap a float,
		// such as a long menu, that sits its rendered height above the anchor.
		if (placed.side === "top") {
			placed = { ...placed, y: anchorBox.top - gap - floating.offsetHeight };
		}
		const containingBlock = inTopLayer ? null : findFixedContainingBlock(floating);
		const local =
			containingBlock == null
				? { x: placed.x, y: placed.y }
				: toLocalPoint(containingBlock, placed.x * zoom, placed.y * zoom);
		floating.style.left = `${local.x}px`;
		floating.style.top = `${local.y}px`;
		const anchorCenterX = anchorBox.left + anchorBox.width / 2 - placed.x;
		const anchorCenterY = anchorBox.top + anchorBox.height / 2 - placed.y;
		floating.dataset.side = placed.side;
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
	place();
	let frame = 0;
	/** Places the float in the next frame if its anchor, the viewport, or its size changed. */
	const schedule = () => {
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(() => {
			if (resized || keyOf(anchor.getBoundingClientRect()) !== placedFor) {
				place();
			}
		});
	};
	const resizeObserver = new ResizeObserver(() => {
		resized = true;
		schedule();
	});
	resizeObserver.observe(floating);
	if (arrow != null) {
		resizeObserver.observe(arrow);
	}
	// Why the listeners too: the observer reports after a paint, and a scroll
	// or resize places the float before the paint, so it does not lag a frame.
	window.addEventListener("scroll", schedule, { capture: true, passive: true });
	window.addEventListener("resize", schedule, { passive: true });
	const stopObservingMove = observeMove(anchor, schedule);

	return () => {
		cancelAnimationFrame(frame);
		resizeObserver.disconnect();
		stopObservingMove();
		window.removeEventListener("scroll", schedule, { capture: true });
		window.removeEventListener("resize", schedule);
	};
}

export {
	//,
	computePlacement,
	trackFloat,
};

export type {
	//,
	Align,
	Fallback,
	Side,
};
