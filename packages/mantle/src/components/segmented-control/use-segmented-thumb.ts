import type { RefObject } from "react";
import { useEffect } from "react";
import { rubberBand } from "../../hooks/use-swipe-to-dismiss.js";
import { getPrefersReducedMotion } from "../../hooks/use-prefers-reduced-motion.js";

/** The pointer travel, in CSS pixels, that turns a press on the checked segment into a drag. */
const dragSlop = 4;

/** How far ahead, in milliseconds, a release carries the thumb at the pointer's last speed. */
const flickProjectionMs = 150;

/** The pause before a release, in milliseconds, after which the last move's speed no longer counts. */
const flickRestMs = 100;

/** The private CSS variable that offsets the thumb from the checked segment while a drag runs. */
const offsetVariable = "--_segmented-control-thumb-offset";

/** The `ease-out-strong` token. `@theme inline` emits no CSS variable for it. */
const easeOutStrong = "cubic-bezier(0.23, 1, 0.32, 1)";

/** The horizontal extent of one segment, in viewport CSS pixels. */
type SegmentBox = {
	left: number;
	right: number;
	disabled: boolean;
};

/**
 * The index of the enabled segment whose center is nearest to `point`, or
 * `-1` when every segment is disabled.
 *
 * @example
 * ```ts
 * const segments = [
 *   { left: 0, right: 100, disabled: false },
 *   { left: 100, right: 200, disabled: true },
 *   { left: 200, right: 300, disabled: false },
 * ];
 * nearestSegment(segments, 160); // 2, because the disabled segment never wins
 * ```
 */
function nearestSegment(segments: readonly SegmentBox[], point: number): number {
	let nearest = -1;
	let nearestDistance = Number.POSITIVE_INFINITY;
	for (const [index, segment] of segments.entries()) {
		const distance = Math.abs((segment.left + segment.right) / 2 - point);
		if (!segment.disabled && distance < nearestDistance) {
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

/** One press on the checked segment, from pointer down to its release. */
type DragSession = {
	pointerId: number;
	startX: number;
	startY: number;
	checked: HTMLElement;
	checkedLeft: number;
	checkedCenter: number;
	segments: readonly HTMLElement[];
	boxes: readonly SegmentBox[];
	min: number;
	max: number;
	/** The group's padding: the thumb never leaves the track. */
	give: number;
	dragging: boolean;
	/** The thumb's offset from the checked segment when the drag started, mid-slide or `0`. */
	base: number;
	offset: number;
	lastX: number;
	lastTime: number;
	/** The pointer's horizontal speed, in CSS pixels per millisecond. */
	velocity: number;
};

/**
 * Moves the thumb of the `SegmentedControl.Root` that `groupRef` points at.
 *
 * When the checked segment changes, from a click, a key, a drag, or a new
 * `value`, the thumb slides from where it is to the checked segment. The
 * slide animates `translate` on the group's `::before` with the Web
 * Animations API, so it runs in every browser and a second change retargets
 * it from where it is. With reduced motion, the thumb moves at once.
 *
 * A press on the checked segment that travels 4px sideways starts a drag.
 * The thumb then follows the pointer. Past either end, it meets rubber-band
 * resistance and stays inside the group's padding. On release, the thumb
 * slides to the nearest enabled segment, carried ahead by a flick, and that
 * segment's click commits the value. A gesture that travels further up or
 * down than sideways never starts, so the page still scrolls. While the drag
 * runs, the group carries `data-dragging` and the segment under the thumb
 * carries `data-thumb-over`.
 */
function useSegmentedThumb(groupRef: RefObject<HTMLElement | null>): void {
	useEffect(() => {
		const group = groupRef.current;
		if (group == null) {
			return;
		}
		let session: DragSession | null = null;
		let suppressClick = false;
		let slide: Animation | null = null;

		const readChecked = () =>
			group.querySelector<HTMLElement>(":scope > [role='radio'][aria-checked='true']");
		// Why the computed value: it holds a running slide's current frame, so a
		// new slide or a drag starts where the thumb is, with no jump.
		const readTranslate = () =>
			Number.parseFloat(getComputedStyle(group, "::before").translate) || 0;

		/** Slides the thumb from `fromLeft`, a viewport x, to the checked segment. */
		const slideFrom = (fromLeft: number) => {
			slide?.cancel();
			slide = null;
			const checked = readChecked();
			if (checked == null || getPrefersReducedMotion()) {
				return;
			}
			const distance = fromLeft - checked.getBoundingClientRect().left;
			if (Math.abs(distance) < 0.5) {
				return;
			}
			slide = group.animate([{ translate: `${distance}px 0` }, { translate: "0 0" }], {
				duration: 200,
				easing: easeOutStrong,
				pseudoElement: "::before",
			});
		};

		let lastChecked = readChecked();
		const observer = new MutationObserver(() => {
			const checked = readChecked();
			if (checked === lastChecked) {
				return;
			}
			const previous = lastChecked;
			lastChecked = checked;
			if (previous?.isConnected) {
				slideFrom(previous.getBoundingClientRect().left + readTranslate());
			}
		});
		observer.observe(group, { attributeFilter: ["aria-checked"], subtree: true });

		const clearDrag = (finished: DragSession) => {
			group.removeAttribute("data-dragging");
			group.style.removeProperty(offsetVariable);
			for (const segment of finished.segments) {
				segment.removeAttribute("data-thumb-over");
			}
		};

		const endSession = () => {
			document.removeEventListener("pointermove", handleMove);
			document.removeEventListener("pointerup", handleRelease);
			document.removeEventListener("pointercancel", handleRelease);
			session = null;
		};

		const handleDown = (event: PointerEvent) => {
			if (!event.isPrimary || event.button !== 0 || session != null) {
				return;
			}
			const checked =
				event.target instanceof Element ? event.target.closest("[role='radio']") : null;
			if (
				!(checked instanceof HTMLElement) ||
				checked.parentElement !== group ||
				checked.getAttribute("aria-checked") !== "true" ||
				checked.getAttribute("aria-disabled") === "true"
			) {
				return;
			}
			const segments = Array.from(group.querySelectorAll<HTMLElement>(":scope > [role='radio']"));
			const boxes = segments.map((segment) => {
				const rect = segment.getBoundingClientRect();
				return {
					left: rect.left,
					right: rect.right,
					disabled: segment.getAttribute("aria-disabled") === "true",
				};
			});
			const first = boxes.at(0);
			const last = boxes.at(-1);
			if (first == null || last == null) {
				return;
			}
			const checkedRect = checked.getBoundingClientRect();
			session = {
				pointerId: event.pointerId,
				startX: event.clientX,
				startY: event.clientY,
				checked,
				checkedLeft: checkedRect.left,
				checkedCenter: (checkedRect.left + checkedRect.right) / 2,
				segments,
				boxes,
				min: first.left - checkedRect.left,
				max: last.right - checkedRect.right,
				give: first.left - group.getBoundingClientRect().left - group.clientLeft,
				dragging: false,
				base: 0,
				offset: 0,
				lastX: event.clientX,
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
			const travel = event.clientX - session.startX;
			if (!session.dragging) {
				const crossTravel = Math.abs(event.clientY - session.startY);
				if (crossTravel >= dragSlop && crossTravel > Math.abs(travel)) {
					endSession();
					return;
				}
				if (Math.abs(travel) < dragSlop) {
					return;
				}
				session.dragging = true;
				session.base = readTranslate();
				slide?.cancel();
				slide = null;
				// Why capture: the segments under the pointer then get no hover tint,
				// and the click after the release lands on the group, not a segment.
				group.setPointerCapture(event.pointerId);
				group.setAttribute("data-dragging", "");
			}
			const elapsed = event.timeStamp - session.lastTime;
			if (elapsed > 0) {
				session.velocity = (event.clientX - session.lastX) / elapsed;
			}
			session.lastX = event.clientX;
			session.lastTime = event.timeStamp;
			session.offset = thumbOffset({ travel: session.base + travel, ...session });
			group.style.setProperty(offsetVariable, `${session.offset}px`);
			const over = nearestSegment(session.boxes, session.checkedCenter + session.offset);
			for (const [index, segment] of session.segments.entries()) {
				segment.toggleAttribute("data-thumb-over", index === over);
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
			clearDrag(finished);
			// Why a slide back first: a group whose `value` ignores the change keeps
			// its checked segment, and the thumb returns to it. A commit retargets
			// this slide through the observer.
			slideFrom(finished.checkedLeft + finished.offset);
			if (event.type === "pointercancel") {
				return;
			}
			const rested = event.timeStamp - finished.lastTime > flickRestMs;
			const velocity = rested ? 0 : finished.velocity;
			const projected = finished.checkedCenter + finished.offset + velocity * flickProjectionMs;
			const target = finished.segments[nearestSegment(finished.boxes, projected)];
			if (target != null && target !== finished.checked) {
				target.click();
			}
			// Why after the commit: the flag must swallow the click the browser
			// sends after the release, not the commit's own click.
			suppressClick = true;
			window.setTimeout(() => {
				suppressClick = false;
			}, 0);
		};

		const handleClick = (event: MouseEvent) => {
			if (!suppressClick) {
				return;
			}
			suppressClick = false;
			event.preventDefault();
			event.stopPropagation();
		};

		group.addEventListener("pointerdown", handleDown);
		// Why capture: a browser that does not retarget the click to the group
		// must still not send it to the segment under the release.
		group.addEventListener("click", handleClick, true);
		return () => {
			observer.disconnect();
			slide?.cancel();
			if (session?.dragging) {
				clearDrag(session);
			}
			endSession();
			group.removeEventListener("pointerdown", handleDown);
			group.removeEventListener("click", handleClick, true);
		};
	}, [groupRef]);
}

export {
	//,
	nearestSegment,
	thumbOffset,
	useSegmentedThumb,
};
