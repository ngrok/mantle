"use client";

import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import { useCallbackRef } from "../hooks/use-callback-ref.js";
import { useIsomorphicLayoutEffect } from "../hooks/use-isomorphic-layout-effect.js";
import { getPrefersReducedMotion } from "../hooks/use-prefers-reduced-motion.js";
import { rubberBand } from "../hooks/use-swipe-to-dismiss.js";

/** The pointer travel, in CSS pixels, that turns a press on the checked item into a drag. */
const dragSlop = 4;

/** How far ahead, in milliseconds, a release carries the thumb at the pointer's last speed. */
const flickProjectionMs = 150;

/** The pause before a release, in milliseconds, after which the last move's speed no longer counts. */
const flickRestMs = 100;

/** The `ease-out-strong` token. `@theme inline` emits no CSS variable for it. */
const easeOutStrong = "cubic-bezier(0.23, 1, 0.32, 1)";

/** The extent of one item along the group's axis, in viewport CSS pixels. */
type ItemSpan = {
	start: number;
	end: number;
	disabled: boolean;
};

/**
 * The index of the enabled item whose center is nearest to `point`, or `-1`
 * when every item is disabled.
 *
 * @example
 * ```ts
 * const items = [
 *   { start: 0, end: 100, disabled: false },
 *   { start: 100, end: 200, disabled: true },
 *   { start: 200, end: 300, disabled: false },
 * ];
 * nearestItem(items, 160); // 2, because the disabled item never wins
 * ```
 */
function nearestItem(items: readonly ItemSpan[], point: number): number {
	let nearest = -1;
	let nearestDistance = Number.POSITIVE_INFINITY;
	for (const [index, item] of items.entries()) {
		const distance = Math.abs((item.start + item.end) / 2 - point);
		if (!item.disabled && distance < nearestDistance) {
			nearest = index;
			nearestDistance = distance;
		}
	}
	return nearest;
}

/**
 * The thumb offset for a pointer that traveled `travel` pixels. Inside
 * `[min, max]` the thumb follows the pointer one to one. Past an end, it
 * meets rubber-band resistance and never moves more than `give` pixels past
 * that end.
 *
 * @example
 * ```ts
 * thumbOffset({ travel: -40, min: -200, max: 0, give: 4 }); // -40
 * thumbOffset({ travel: 60, min: -200, max: 0, give: 4 }); // ≈ 3.6, less than the 4px give
 * ```
 */
function thumbOffset({
	travel,
	min,
	max,
	give,
}: {
	travel: number;
	min: number;
	max: number;
	give: number;
}): number {
	if (travel < min) {
		return min - rubberBand(min - travel, give);
	}
	if (travel > max) {
		return max + rubberBand(travel - max, give);
	}
	return travel;
}

/** The thumb's box, in viewport CSS pixels. */
type ThumbBox = { x: number; y: number; width: number; height: number };

/** The axis the items line up on. */
type Axis = "x" | "y";

/** The start and end of `rect` along `axis`. */
const spanOf = (rect: DOMRect, axis: Axis) =>
	axis === "y" ? { start: rect.top, end: rect.bottom } : { start: rect.left, end: rect.right };

/** One press on the checked item, from pointer down to its release. */
type DragSession = {
	pointerId: number;
	axis: Axis;
	startPoint: number;
	startCross: number;
	checked: HTMLElement;
	checkedStart: number;
	checkedEnd: number;
	items: readonly HTMLElement[];
	spans: readonly ItemSpan[];
	/** The start of the track: the first item, or the group's visible edge when it scrolls. */
	trackStart: number;
	trackEnd: number;
	/** The group's padding: the thumb never leaves the track. */
	give: number;
	dragging: boolean;
	/** The thumb's offset from the checked item when the drag started, mid-slide or `0`. */
	base: number;
	/** The thumb's offset, clamped to the track: where it draws. */
	offset: number;
	/** The offset the pointer asks for, not clamped: where the thumb lands. */
	reach: number;
	lastPoint: number;
	lastTime: number;
	/** The pointer's speed along the axis, in CSS pixels per millisecond. */
	velocity: number;
};

/**
 * Where a group draws its thumb and how it checks an item. Each item draws the
 * thumb as its own `pseudo` while it matches `checked`, so the server HTML
 * already shows it, and translates it by the `offset` variable during a drag.
 */
type SlidingThumbOptions = {
	/** Matches each item, inside the group. */
	items: string;
	/** Matches the checked item. */
	checked: string;
	/** Matches an item that the thumb skips. */
	disabled: string;
	/** The pseudo-element of an item that draws the thumb. Its `left` and `top` place it. */
	pseudo: "::before" | "::after";
	/** The private CSS variable on the group that offsets the thumb during a drag. */
	offset: `--_${string}`;
	/** Checks `item`, as a press on it with the modifier keys of `release` does. */
	commit: (item: HTMLElement, release: PointerEvent) => void;
};

const parsePixels = (value: string) => Number.parseFloat(value) || 0;

/**
 * The ratio of an element's viewport size to its own size, such as `0.5` under
 * `scale(0.5)`. Why the 1px margin: `offsetWidth` rounds to a whole pixel, so
 * an unscaled item with a fractional width is always within half a pixel.
 */
const scaleOf = (element: HTMLElement) => {
	const { width } = element.getBoundingClientRect();
	return Math.abs(width - element.offsetWidth) > 1 ? width / element.offsetWidth : 1;
};

/**
 * Moves the thumb of the group that `groupRef` points at: the `SegmentedControl`
 * thumb and the `Tabs` indicator. A group with `aria-orientation="vertical"`
 * moves along the y axis.
 *
 * When the checked item changes, from a click, a key, a drag, or a new
 * `value`, the thumb slides and resizes from where it was to the checked
 * item. The slide animates `translate`, `width`, and `height` of the new
 * item's pseudo-element with the Web Animations API, so a second change
 * retargets it from where it is. With reduced motion, the thumb moves at once.
 *
 * A press on the checked item that travels 4px along the axis starts a drag.
 * The thumb then follows the pointer. Past either end, it meets rubber-band
 * resistance and stays inside the group's padding and its visible area. On
 * release, the thumb slides to the nearest enabled item, carried ahead by a
 * flick, and `commit` checks that item. A new `value` during a drag does not
 * slide the thumb: it stays under the pointer. A gesture that travels further
 * across the axis than along it never starts, so the page still scrolls.
 * While the drag runs, the group carries `data-dragging` and the item under
 * the thumb carries `data-thumb-over`.
 */
function useSlidingThumb(
	groupRef: RefObject<HTMLElement | null>,
	value: string | undefined,
	{ commit, ...options }: SlidingThumbOptions,
): void {
	const syncRef = useRef<(() => void) | null>(null);
	const commitItem = useCallbackRef(commit);
	// Why a ref: each part passes a constant object, and the listeners read it at event time.
	const optionsRef = useRef(options);

	// Why a layout effect: a form reset or a new controlled `value` changes the checked item with no event, and the slide must start before paint.
	useIsomorphicLayoutEffect(() => {
		syncRef.current?.();
	}, [value]);

	useEffect(() => {
		const group = groupRef.current;
		if (group == null) {
			return;
		}
		const { items, checked: checkedSelector, disabled, pseudo, offset } = optionsRef.current;
		let session: DragSession | null = null;
		let suppressPress = false;
		let slide: Animation | null = null;

		const readAxis = (): Axis =>
			group.getAttribute("aria-orientation") === "vertical" ? "y" : "x";
		const readItems = () => Array.from(group.querySelectorAll<HTMLElement>(items));
		const readChecked = () => readItems().find((item) => item.matches(checkedSelector)) ?? null;
		// Why the visibility check: an item with `display: none` has an empty box at the
		// viewport's edge, and the thumb must never land on an item the reader cannot see.
		const readSpans = (all: readonly HTMLElement[], axis: Axis): ItemSpan[] =>
			all.map((item) => ({
				...spanOf(item.getBoundingClientRect(), axis),
				disabled:
					item.matches(disabled) ||
					(typeof item.checkVisibility === "function" &&
						!item.checkVisibility({ visibilityProperty: true })),
			}));

		// Why the computed style: it holds a running slide's current frame, so a
		// new slide or a drag starts where the thumb is, with no jump.
		const readThumb = (item: HTMLElement): ThumbBox => {
			const rect = item.getBoundingClientRect();
			const style = getComputedStyle(item, pseudo);
			const [x = "0", y = "0"] = style.translate.split(" ");
			const scale = scaleOf(item);
			return {
				x: rect.left + scale * (item.clientLeft + parsePixels(style.left) + parsePixels(x)),
				y: rect.top + scale * (item.clientTop + parsePixels(style.top) + parsePixels(y)),
				width: parsePixels(style.width),
				height: parsePixels(style.height),
			};
		};
		const readTranslate = (item: HTMLElement) => {
			const [x = "0", y = "0"] = getComputedStyle(item, pseudo).translate.split(" ");
			return parsePixels(readAxis() === "y" ? y : x);
		};

		/** Slides the thumb from the box `from` to the checked item. */
		const slideFrom = (from: ThumbBox) => {
			slide?.cancel();
			slide = null;
			const checked = readChecked();
			if (checked == null || getPrefersReducedMotion()) {
				return;
			}
			const to = readThumb(checked);
			// Why the scale: a transformed ancestor scales the viewport delta, and
			// `translate` applies in the item's own pixels.
			const scale = scaleOf(checked);
			const dx = (from.x - to.x) / scale;
			const dy = (from.y - to.y) / scale;
			if (
				Math.max(
					Math.abs(dx),
					Math.abs(dy),
					Math.abs(from.width - to.width),
					Math.abs(from.height - to.height),
				) < 0.5
			) {
				return;
			}
			// Why `offset: 0` and no end keyframe: the one keyframe is the start, and the
			// thumb settles on its own `translate` and size.
			slide = checked.animate(
				[
					{
						offset: 0,
						translate: `${dx}px ${dy}px`,
						width: `${from.width}px`,
						height: `${from.height}px`,
					},
				],
				{ duration: 200, easing: easeOutStrong, pseudoElement: pseudo },
			);
		};

		/** Moves a running drag onto a new checked item, so the thumb stays where it is. */
		const rebaseDrag = (running: DragSession, checked: HTMLElement) => {
			const { start, end } = spanOf(checked.getBoundingClientRect(), running.axis);
			const shift = running.checkedStart - start;
			running.checked = checked;
			running.checkedStart = start;
			running.checkedEnd = end;
			running.base += shift;
			running.offset += shift;
			running.reach += shift;
			group.style.setProperty(offset, `${running.offset}px`);
		};

		let lastChecked = readChecked();
		const sync = () => {
			const checked = readChecked();
			if (checked === lastChecked) {
				return;
			}
			const previous = lastChecked;
			lastChecked = checked;
			// Why: a new `value` during a drag moves the thumb's anchor. A slide
			// would fight the pointer, so the drag moves onto the new anchor.
			if (session?.dragging) {
				if (checked != null) {
					rebaseDrag(session, checked);
				}
				return;
			}
			// Why: a press can start a drag only on the checked item.
			if (session != null) {
				endSession();
			}
			if (previous?.isConnected) {
				slideFrom(readThumb(previous));
			}
		};
		syncRef.current = sync;

		const clearDrag = (finished: DragSession) => {
			group.removeAttribute("data-dragging");
			group.style.removeProperty(offset);
			for (const item of finished.items) {
				item.removeAttribute("data-thumb-over");
			}
		};

		const endSession = () => {
			document.removeEventListener("pointermove", handleMove);
			document.removeEventListener("pointerup", handleRelease);
			document.removeEventListener("pointercancel", handleRelease);
			session = null;
		};

		const handleDown = (event: PointerEvent) => {
			suppressPress = false;
			if (!event.isPrimary || event.button !== 0 || session != null) {
				return;
			}
			const target = event.target instanceof Node ? event.target : null;
			const all = readItems();
			const checked = all.find((item) => item.contains(target));
			if (checked == null || !checked.matches(checkedSelector) || checked.matches(disabled)) {
				return;
			}
			const axis = readAxis();
			const vertical = axis === "y";
			const spans = readSpans(all, axis);
			// Why only the items with a box: an item with `display: none` would stretch the track.
			const shown = spans.filter((span) => span.end > span.start);
			// Why the visible edges: a list that scrolls clips the items past
			// them, and the thumb must stay where the reader sees it.
			const groupRect = group.getBoundingClientRect();
			const visibleStart = vertical
				? groupRect.top + group.clientTop
				: groupRect.left + group.clientLeft;
			const visibleEnd = visibleStart + (vertical ? group.clientHeight : group.clientWidth);
			// Why the extremes and not the first and last item: in RTL, the first
			// item is on the right.
			const trackStart = Math.max(visibleStart, Math.min(...shown.map((span) => span.start)));
			const trackEnd = Math.min(visibleEnd, Math.max(...shown.map((span) => span.end)));
			const checkedSpan = spanOf(checked.getBoundingClientRect(), axis);
			const point = vertical ? event.clientY : event.clientX;
			session = {
				pointerId: event.pointerId,
				axis,
				startPoint: point,
				startCross: vertical ? event.clientX : event.clientY,
				checked,
				checkedStart: checkedSpan.start,
				checkedEnd: checkedSpan.end,
				items: all,
				spans,
				trackStart,
				trackEnd,
				give: trackStart - visibleStart,
				dragging: false,
				base: 0,
				offset: 0,
				reach: 0,
				lastPoint: point,
				lastTime: event.timeStamp,
				velocity: 0,
			};
			// Why the document: a release outside the group must still end the drag,
			// even where pointer capture does not route it to the group.
			document.addEventListener("pointermove", handleMove);
			document.addEventListener("pointerup", handleRelease);
			document.addEventListener("pointercancel", handleRelease);
		};

		const handleMove = (event: PointerEvent) => {
			if (session == null || event.pointerId !== session.pointerId) {
				return;
			}
			// Why: a release the page never heard, like one outside the window,
			// leaves no button down, and the next move must not drag.
			if ((event.buttons & 1) === 0) {
				handleRelease(event);
				return;
			}
			const vertical = session.axis === "y";
			const point = vertical ? event.clientY : event.clientX;
			const travel = point - session.startPoint;
			if (!session.dragging) {
				const crossTravel = Math.abs(
					(vertical ? event.clientX : event.clientY) - session.startCross,
				);
				if (crossTravel >= dragSlop && crossTravel > Math.abs(travel)) {
					endSession();
					return;
				}
				if (Math.abs(travel) < dragSlop) {
					return;
				}
				session.dragging = true;
				session.base = readTranslate(session.checked);
				// Why the size goes on: a press on a thumb in the middle of a slide keeps
				// its size, and the drag takes over only its position.
				const grabbed = slide == null ? null : readThumb(session.checked);
				slide?.cancel();
				slide =
					grabbed == null || getPrefersReducedMotion()
						? null
						: session.checked.animate(
								[{ offset: 0, width: `${grabbed.width}px`, height: `${grabbed.height}px` }],
								{ duration: 200, easing: easeOutStrong, pseudoElement: pseudo },
							);
				// Why capture: the items under the pointer then get no hover tint,
				// and the click after the release lands on the group, not an item.
				group.setPointerCapture(event.pointerId);
				group.setAttribute("data-dragging", "");
			}
			const elapsed = event.timeStamp - session.lastTime;
			if (elapsed > 0) {
				session.velocity = (point - session.lastPoint) / elapsed;
			}
			session.lastPoint = point;
			session.lastTime = event.timeStamp;
			session.reach = session.base + travel;
			session.offset = thumbOffset({
				travel: session.reach,
				min: session.trackStart - session.checkedStart,
				max: session.trackEnd - session.checkedEnd,
				give: session.give,
			});
			group.style.setProperty(offset, `${session.offset}px`);
			// Why the reach and not the drawn offset: a wide thumb clamped at an end
			// could never reach a narrow item at that end.
			const checkedCenter = (session.checkedStart + session.checkedEnd) / 2;
			const over = nearestItem(session.spans, checkedCenter + session.reach);
			for (const [index, item] of session.items.entries()) {
				item.toggleAttribute("data-thumb-over", index === over);
			}
		};

		const handleRelease = (event: PointerEvent) => {
			if (session == null || event.pointerId !== session.pointerId) {
				return;
			}
			const finished = session;
			endSession();
			if (!finished.dragging) {
				return;
			}
			const released = readThumb(finished.checked);
			clearDrag(finished);
			// Why a slide back first: a group whose `value` ignores the change keeps
			// its checked item, and the thumb returns to it. A commit retargets
			// this slide through `sync`.
			slideFrom(released);
			if (event.type === "pointercancel") {
				return;
			}
			const rested = event.timeStamp - finished.lastTime > flickRestMs;
			const velocity = rested ? 0 : finished.velocity;
			// Why a new read: the items can move, resize, or turn disabled during the
			// drag. The thumb moves with the checked item, so it lands from there.
			const checkedSpan = spanOf(finished.checked.getBoundingClientRect(), finished.axis);
			const checkedCenter = (checkedSpan.start + checkedSpan.end) / 2;
			const projected = checkedCenter + finished.reach + velocity * flickProjectionMs;
			const spans = readSpans(finished.items, finished.axis);
			const target = finished.items[nearestItem(spans, projected)];
			if (target != null && target !== finished.checked) {
				commitItem(target, event);
			}
			// Why after the commit: the flag must swallow the mouse events the browser
			// sends after the release, not the commit's own events. A touch that moved
			// less than the browser's tap slop still gets a `mousedown` and a `click`.
			suppressPress = true;
		};

		// Why `detail`: a key that clicks an item sends a click with no `detail`, and
		// it is never part of a pointer press.
		const handlePress = (event: MouseEvent) => {
			if (!suppressPress || (event.type === "click" && event.detail === 0)) {
				return;
			}
			if (event.type === "click") {
				suppressPress = false;
			}
			event.preventDefault();
			event.stopPropagation();
		};

		group.addEventListener("pointerdown", handleDown);
		// Why capture: a browser that does not retarget the click to the group
		// must still not send it to the item under the release.
		group.addEventListener("mousedown", handlePress, true);
		group.addEventListener("click", handlePress, true);
		return () => {
			syncRef.current = null;
			slide?.cancel();
			if (session?.dragging) {
				clearDrag(session);
			}
			endSession();
			group.removeEventListener("pointerdown", handleDown);
			group.removeEventListener("mousedown", handlePress, true);
			group.removeEventListener("click", handlePress, true);
		};
	}, [groupRef, commitItem]);
}

export {
	//,
	nearestItem,
	thumbOffset,
	useSlidingThumb,
};
export type {
	//,
	SlidingThumbOptions,
};
