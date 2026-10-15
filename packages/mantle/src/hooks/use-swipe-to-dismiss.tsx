import type { RefObject } from "react";
import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * The direction a swipe travels to dismiss the target: the edge it slides
 * off. A panel on the right edge of the page dismisses to the `"right"`.
 *
 * @see https://mantle.ngrok.com/hooks#useswipetodismiss
 */
type SwipeDirection = "left" | "right" | "up" | "down";

/**
 * The CSS property a drag writes on the target. `translate` slides the target
 * toward the edge. `flex-basis` shrinks the target from its current size
 * toward nothing, for a flex item that collapses in a lane when dismissed.
 *
 * @see https://mantle.ngrok.com/hooks#useswipetodismiss
 */
type SwipeProperty = "translate" | "flex-basis";

/**
 * The options for {@link useSwipeToDismiss}.
 *
 * @see https://mantle.ngrok.com/hooks#useswipetodismiss
 *
 * @example
 * ```tsx
 * useSwipeToDismiss(headerRef, {
 *   target: panelRef,
 *   direction: "right",
 *   property: () => (getComputedStyle(panel).position === "absolute" ? "translate" : "flex-basis"),
 *   onDismiss: () => setOpen(false),
 * });
 * ```
 */
type UseSwipeToDismissOptions = {
	/**
	 * Called once when a released drag crosses the threshold or ends in a
	 * flick. The caller hides the target; the hook moves nothing after the
	 * release.
	 */
	onDismiss: () => void;
	/**
	 * The element the drag moves and measures. Defaults to the handle itself.
	 * Pass the panel when a header row is the handle.
	 */
	target?: RefObject<HTMLElement | null>;
	/**
	 * The edge the target slides off. A drag the other way meets rubber-band
	 * resistance and never dismisses.
	 *
	 * @default "right"
	 */
	direction?: SwipeDirection;
	/**
	 * The CSS property the drag writes on the target. A function runs at
	 * pointer down, for a target that slides in one layout and collapses in
	 * another.
	 *
	 * @default "translate"
	 */
	property?: SwipeProperty | (() => SwipeProperty);
	/**
	 * Whether a drag can start. A function runs at pointer down, for a
	 * condition CSS owns.
	 *
	 * @default true
	 */
	active?: boolean | (() => boolean);
	/**
	 * The share of the target's size along the direction a drag must cross to
	 * dismiss, between `0` and `1`.
	 *
	 * @default 0.25
	 */
	threshold?: number;
	/**
	 * The speed toward the edge, in CSS pixels per millisecond, that dismisses
	 * a shorter drag as a flick. A pointer that rests for 100ms before the
	 * release has no speed.
	 *
	 * @default 0.4
	 */
	flickVelocity?: number;
};

/** The pointer travel, in CSS pixels, that turns a press on the handle into a drag. */
const swipeSlop = 8;

/** The pause before a release, in milliseconds, after which the last move's speed no longer counts. */
const flickRestMs = 100;

/**
 * Whether a released swipe dismisses its target: the target moved toward the
 * edge, and the offset crossed `threshold` of the target's size or the
 * pointer was moving toward the edge faster than `flickVelocity` when
 * released. An offset of zero never dismisses, so a drag the wrong way is a
 * spring back even when it ends in a flick back to the resting position.
 *
 * @example
 * ```ts
 * shouldDismissSwipe({ offset: 100, size: 384, velocity: 0, threshold: 0.25, flickVelocity: 0.4 }); // true
 * shouldDismissSwipe({ offset: 40, size: 384, velocity: 0.8, threshold: 0.25, flickVelocity: 0.4 }); // true
 * shouldDismissSwipe({ offset: 40, size: 384, velocity: 0.1, threshold: 0.25, flickVelocity: 0.4 }); // false
 * shouldDismissSwipe({ offset: 0, size: 384, velocity: 8, threshold: 0.25, flickVelocity: 0.4 }); // false
 * ```
 */
function shouldDismissSwipe({
	offset,
	size,
	velocity,
	threshold,
	flickVelocity,
}: {
	/** How far the target moved toward the edge, in CSS pixels, never negative. */
	offset: number;
	/** The target's width or height along the direction, in CSS pixels. */
	size: number;
	/** The pointer's speed toward the edge, in CSS pixels per millisecond. */
	velocity: number;
	threshold: number;
	flickVelocity: number;
}): boolean {
	return offset > 0 && (offset >= size * threshold || velocity >= flickVelocity);
}

/**
 * The displacement for a drag past the resting position, with the resistance
 * of an iOS scroll view: it grows ever more slowly with `distance` and never
 * reaches `size`. Zero when the target has no size.
 *
 * @example
 * ```ts
 * rubberBand(100, 300); // ≈ 46, less than the 100px the pointer moved
 * rubberBand(200, 300); // ≈ 80, less than twice the displacement at 100
 * ```
 */
function rubberBand(distance: number, size: number): number {
	if (size <= 0) {
		return 0;
	}
	// Why 0.55: the constant iOS uses, so the resistance reads as the one the
	// reader knows from a scroll view's edge.
	return (1 - 1 / ((0.55 * distance) / size + 1)) * size;
}

/**
 * One drag, from the pointer going down on the handle to its release.
 * `dragging` turns on once the pointer has moved past {@link swipeSlop} along
 * the direction, so a tap on a control inside the handle stays a tap.
 */
type SwipeSession = {
	target: HTMLElement;
	property: SwipeProperty;
	pointerId: number;
	/** The pointer's position along the direction at pointer down, signed toward the edge. */
	start: number;
	/** The pointer's position across the direction at pointer down. */
	crossStart: number;
	size: number;
	dragging: boolean;
	last: number;
	lastTime: number;
	velocity: number;
	/** How far the target has moved toward the edge, never negative. */
	offset: number;
};

/** The pointer coordinate along the direction's axis, with the sign that grows toward the edge. */
function readPosition(event: PointerEvent, direction: SwipeDirection): number {
	switch (direction) {
		case "right":
			return event.clientX;
		case "left":
			return -event.clientX;
		case "down":
			return event.clientY;
		case "up":
			return -event.clientY;
	}
}

/** The pointer coordinate across the direction's axis. */
function readCrossPosition(event: PointerEvent, direction: SwipeDirection): number {
	return direction === "left" || direction === "right" ? event.clientY : event.clientX;
}

/** The inline `translate` that moves the target `displacement` pixels toward the edge, or away when negative. */
function translateFor(displacement: number, direction: SwipeDirection): string {
	switch (direction) {
		case "right":
			return `${displacement}px`;
		case "left":
			return `${-displacement}px`;
		case "down":
			return `0 ${displacement}px`;
		case "up":
			return `0 ${-displacement}px`;
	}
}

/**
 * Writes the drag's displacement to the target: a `translate` toward the edge,
 * or a `flex-basis` shrunk by it. A negative displacement is the rubber band
 * past the resting position.
 */
function writeDisplacement(session: SwipeSession, displacement: number, direction: SwipeDirection) {
	if (session.property === "flex-basis") {
		session.target.style.flexBasis = `${session.size - displacement}px`;
		return;
	}
	session.target.style.translate = translateFor(displacement, direction);
}

/** Clears what {@link writeDisplacement} wrote, so the target's own styles take over. */
function clearDisplacement(session: SwipeSession) {
	session.target.style.removeProperty("transition");
	session.target.style.removeProperty(
		session.property === "flex-basis" ? "flex-basis" : "translate",
	);
}

/**
 * Makes the element `handle` points at a swipe handle that drags `target`
 * toward one edge and calls `onDismiss` when the drag crosses `threshold` of
 * the target's size or ends in a flick. A shorter drag springs back, and a
 * drag the wrong way meets rubber-band resistance. The target's own
 * transition on the property animates both the spring back and the slide the
 * caller runs after `onDismiss`, so a `motion-reduce:` rule on the target
 * turns them into cuts.
 *
 * The target follows the pointer one to one: while the pointer is down the
 * hook writes the property and `transition: none` on the target's inline
 * style, and clears both on release. `translate` slides the target;
 * `flex-basis` shrinks a flex item from its size toward nothing, the way a
 * lane collapses. A tap on a control inside the handle stays a tap: the drag
 * starts after 8px of travel along the direction, a gesture that travels
 * further across it never starts, and a release after a drag swallows the
 * click that follows it. Give the handle `touch-action: pan-y`
 * (`touch-pan-y`) for a horizontal swipe, or `pan-x` for a vertical one, so
 * the other axis still scrolls.
 *
 * Only the primary pointer with its main button drags, and only one drag runs
 * at a time. The handle must be mounted when the hook runs; it reads the ref
 * once per mount.
 *
 * @see https://mantle.ngrok.com/hooks#useswipetodismiss
 *
 * @example
 * ```tsx
 * function FloatingPanel({ open, setOpen, children }: FloatingPanelProps) {
 *   const panelRef = useRef<HTMLElement>(null);
 *   const headerRef = useRef<HTMLDivElement>(null);
 *   useSwipeToDismiss(headerRef, {
 *     target: panelRef,
 *     onDismiss: () => setOpen(false),
 *   });
 *
 *   return (
 *     <aside
 *       ref={panelRef}
 *       aria-label="Assistant"
 *       data-state={open ? "open" : "closed"}
 *       className="transition-[translate] duration-200 ease-out-strong motion-reduce:transition-none data-state-closed:translate-x-full"
 *     >
 *       <div ref={headerRef} className="touch-pan-y">
 *         Assistant
 *       </div>
 *       {children}
 *     </aside>
 *   );
 * }
 * ```
 */
function useSwipeToDismiss(
	handle: RefObject<HTMLElement | null>,
	options: UseSwipeToDismissOptions,
): void {
	// Why a ref: the listeners attach once per mount, and an inline `onDismiss`
	// or `active` takes a new identity on every render.
	const optionsRef = useRef(options);
	useLayoutEffect(() => {
		optionsRef.current = options;
	});

	useEffect(() => {
		const element = handle.current;
		if (element == null) {
			return;
		}
		let session: SwipeSession | null = null;
		let suppressClick = false;

		const end = () => {
			document.removeEventListener("pointermove", handleMove);
			document.removeEventListener("pointerup", handleRelease);
			document.removeEventListener("pointercancel", handleRelease);
			session = null;
		};

		const handleMove = (event: PointerEvent) => {
			const { direction = "right" } = optionsRef.current;
			if (session == null || event.pointerId !== session.pointerId) {
				return;
			}
			const position = readPosition(event, direction);
			const travel = position - session.start;
			if (!session.dragging) {
				const crossTravel = Math.abs(readCrossPosition(event, direction) - session.crossStart);
				// Why the lock: a mouse gesture that runs across the direction is a
				// scroll or a selection, not a swipe, and must never move the target.
				if (crossTravel >= swipeSlop && crossTravel > Math.abs(travel)) {
					end();
					return;
				}
				if (Math.abs(travel) < swipeSlop) {
					return;
				}
				session.dragging = true;
				// Why inline: the drag follows the pointer, and the target's own
				// transition would lag it.
				session.target.style.transition = "none";
			}
			const elapsed = event.timeStamp - session.lastTime;
			if (elapsed > 0) {
				session.velocity = (position - session.last) / elapsed;
			}
			session.last = position;
			session.lastTime = event.timeStamp;
			session.offset = Math.max(0, travel);
			const displacement = travel >= 0 ? travel : -rubberBand(-travel, session.size);
			writeDisplacement(session, displacement, direction);
		};

		const handleRelease = (event: PointerEvent) => {
			const { onDismiss, threshold = 0.25, flickVelocity = 0.4 } = optionsRef.current;
			if (session == null || event.pointerId !== session.pointerId) {
				return;
			}
			const finished = session;
			end();
			if (!finished.dragging) {
				return;
			}
			suppressClick = true;
			// Why a timeout: the click that follows a release fires in the same
			// task, and a release off the handle fires none, so the flag must
			// clear on its own.
			window.setTimeout(() => {
				suppressClick = false;
			}, 0);
			// Why clear before the dismiss: the spring back, or the slide the
			// caller runs, starts from where the pointer left the target.
			clearDisplacement(finished);
			if (event.type === "pointercancel") {
				return;
			}
			const rested = event.timeStamp - finished.lastTime > flickRestMs;
			const velocity = rested ? 0 : finished.velocity;
			if (shouldDismissSwipe({ ...finished, velocity, threshold, flickVelocity })) {
				onDismiss();
			}
		};

		const handleDown = (event: PointerEvent) => {
			const {
				active = true,
				direction = "right",
				property = "translate",
				target,
			} = optionsRef.current;
			const canStart = typeof active === "function" ? active() : active;
			if (!canStart || !event.isPrimary || event.button !== 0 || session != null) {
				return;
			}
			const targetElement = target?.current ?? element;
			const rect = targetElement.getBoundingClientRect();
			const position = readPosition(event, direction);
			session = {
				target: targetElement,
				property: typeof property === "function" ? property() : property,
				pointerId: event.pointerId,
				start: position,
				crossStart: readCrossPosition(event, direction),
				size: direction === "left" || direction === "right" ? rect.width : rect.height,
				dragging: false,
				last: position,
				lastTime: event.timeStamp,
				velocity: 0,
				offset: 0,
			};
			document.addEventListener("pointermove", handleMove);
			document.addEventListener("pointerup", handleRelease);
			document.addEventListener("pointercancel", handleRelease);
		};

		const handleClick = (event: MouseEvent) => {
			if (!suppressClick) {
				return;
			}
			suppressClick = false;
			event.preventDefault();
			event.stopPropagation();
		};

		element.addEventListener("pointerdown", handleDown);
		// Why capture: the click after a drag must not reach a control inside
		// the handle, and a capture listener on the handle runs before any of them.
		element.addEventListener("click", handleClick, true);
		return () => {
			// Why clear first: a handle that unmounts mid-drag leaves its target
			// behind, and the target must not keep a partial displacement.
			if (session?.dragging) {
				clearDisplacement(session);
			}
			end();
			element.removeEventListener("pointerdown", handleDown);
			element.removeEventListener("click", handleClick, true);
		};
	}, [handle]);
}

export {
	//,
	rubberBand,
	shouldDismissSwipe,
	useSwipeToDismiss,
};

export type {
	//,
	SwipeDirection,
	SwipeProperty,
	UseSwipeToDismissOptions,
};
