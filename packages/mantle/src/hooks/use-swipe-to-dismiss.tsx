import type { RefObject } from "react";
import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * The CSS property a drag writes on the target. `translate` slides the target
 * toward the right edge. `flex-basis` shrinks the target from its current
 * width toward nothing, for a flex item that collapses in a lane when
 * dismissed.
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
	 * The CSS property the drag writes on the target. A function runs at
	 * pointer down, for a target that slides in one layout and collapses in
	 * another.
	 *
	 * @default "translate"
	 */
	property?: SwipeProperty | (() => SwipeProperty);
	/**
	 * Whether a drag can start.
	 *
	 * @default true
	 */
	active?: boolean;
};

/** The pointer travel, in CSS pixels, that turns a press on the handle into a drag. */
const swipeSlop = 8;

/** The share of the target's width a released drag must cross to dismiss. */
const swipeThreshold = 0.25;

/** The speed toward the edge, in CSS pixels per millisecond, that dismisses a shorter drag as a flick. */
const flickVelocity = 0.4;

/** The pause before a release, in milliseconds, after which the last move's speed no longer counts. */
const flickRestMs = 100;

/**
 * Whether a released swipe dismisses its target: the target moved toward the
 * edge, and the offset crossed a quarter of the target's width or the pointer
 * was moving toward the edge at 0.4 CSS pixels per millisecond or faster when
 * released. An offset of zero never dismisses, so a drag the wrong way is a
 * spring back even when it ends in a flick back to the resting position.
 *
 * @example
 * ```ts
 * shouldDismissSwipe({ offset: 100, size: 384, velocity: 0 }); // true
 * shouldDismissSwipe({ offset: 40, size: 384, velocity: 0.8 }); // true
 * shouldDismissSwipe({ offset: 40, size: 384, velocity: 0.1 }); // false
 * shouldDismissSwipe({ offset: 0, size: 384, velocity: 8 }); // false
 * ```
 */
function shouldDismissSwipe({
	offset,
	size,
	velocity,
}: {
	/** How far the target moved toward the edge, in CSS pixels, never negative. */
	offset: number;
	/** The target's width, in CSS pixels. */
	size: number;
	/** The pointer's speed toward the edge, in CSS pixels per millisecond. */
	velocity: number;
}): boolean {
	return offset > 0 && (offset >= size * swipeThreshold || velocity >= flickVelocity);
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
 * `dragging` turns on once the pointer has moved past {@link swipeSlop} to
 * the right or the left, so a tap on a control inside the handle stays a tap.
 */
type SwipeSession = {
	target: HTMLElement;
	property: SwipeProperty;
	pointerId: number;
	/** The pointer's `clientX` at pointer down. */
	startX: number;
	/** The pointer's `clientY` at pointer down. */
	startY: number;
	/** The target's width at pointer down, in CSS pixels. */
	size: number;
	dragging: boolean;
	lastX: number;
	lastTime: number;
	velocity: number;
	/** How far the target has moved toward the edge, never negative. */
	offset: number;
};

/**
 * Writes the drag's displacement to the target: a `translate` toward the
 * right edge, or a `flex-basis` shrunk by it. A negative displacement is the
 * rubber band past the resting position.
 */
function writeDisplacement(session: SwipeSession, displacement: number) {
	if (session.property === "flex-basis") {
		session.target.style.flexBasis = `${session.size - displacement}px`;
		return;
	}
	session.target.style.translate = `${displacement}px`;
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
 * toward the right edge and calls `onDismiss` when the drag crosses a quarter
 * of the target's width or ends in a flick. A shorter drag springs back, and
 * a drag to the left meets rubber-band resistance. The target's own
 * transition on the property animates both the spring back and the slide the
 * caller runs after `onDismiss`, so a `motion-reduce:` rule on the target
 * turns them into cuts.
 *
 * The target follows the pointer one to one: while the pointer is down the
 * hook writes the property and `transition: none` on the target's inline
 * style, and clears both on release. `translate` slides the target;
 * `flex-basis` shrinks a flex item from its width toward nothing, the way a
 * lane collapses. A tap on a control inside the handle stays a tap: the drag
 * starts after 8px of horizontal travel, a gesture that travels further
 * vertically never starts, and a release after a drag swallows the click that
 * follows it. Give the handle `touch-action: pan-y` (`touch-pan-y`), so a
 * vertical swipe on it still scrolls.
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
	// or `property` takes a new identity on every render.
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
			if (session == null || event.pointerId !== session.pointerId) {
				return;
			}
			const travel = event.clientX - session.startX;
			if (!session.dragging) {
				const crossTravel = Math.abs(event.clientY - session.startY);
				// Why the lock: a vertical gesture is a scroll or a selection, not a
				// swipe, and must never move the target.
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
				session.velocity = (event.clientX - session.lastX) / elapsed;
			}
			session.lastX = event.clientX;
			session.lastTime = event.timeStamp;
			session.offset = Math.max(0, travel);
			const displacement = travel >= 0 ? travel : -rubberBand(-travel, session.size);
			writeDisplacement(session, displacement);
		};

		const handleRelease = (event: PointerEvent) => {
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
			if (shouldDismissSwipe({ offset: finished.offset, size: finished.size, velocity })) {
				optionsRef.current.onDismiss();
			}
		};

		const handleDown = (event: PointerEvent) => {
			const { active = true, property = "translate", target } = optionsRef.current;
			if (!active || !event.isPrimary || event.button !== 0 || session != null) {
				return;
			}
			const targetElement = target?.current ?? element;
			session = {
				target: targetElement,
				property: typeof property === "function" ? property() : property,
				pointerId: event.pointerId,
				startX: event.clientX,
				startY: event.clientY,
				size: targetElement.getBoundingClientRect().width,
				dragging: false,
				lastX: event.clientX,
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
	SwipeProperty,
	UseSwipeToDismissOptions,
};
