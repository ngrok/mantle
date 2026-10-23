import { getPrefersReducedMotion } from "../hooks/use-prefers-reduced-motion.js";

/**
 * Plays the `shake` keyframes from `mantle.css` once on an element, to signal a
 * blocked action. The element must compose `motion-safe:data-shake:animate-shake`.
 * A call while a shake runs restarts it from rest. Under reduced motion, or with
 * no Web Animations API, the call does nothing.
 *
 * @example
 * ```tsx
 * <span ref={tagRef} className="motion-safe:data-shake:animate-shake" />;
 *
 * shakeElement(tagRef.current);
 * ```
 */
function shakeElement(element: HTMLElement): void {
	if (getPrefersReducedMotion() || typeof element.getAnimations !== "function") {
		return;
	}

	const running = findShake(element);
	if (running != null) {
		running.currentTime = 0;
		return;
	}

	element.setAttribute("data-shake", "");
	const started = findShake(element);
	// Why remove the attribute when the shake settles: the next call sets it
	// again, which starts a new animation with no forced reflow.
	const clear = () => element.removeAttribute("data-shake");
	if (started == null) {
		clear();
		return;
	}
	started.finished.then(clear, clear);
}

function findShake(element: HTMLElement): Animation | undefined {
	return element
		.getAnimations()
		.find((animation) => animation instanceof CSSAnimation && animation.animationName === "shake");
}

export {
	//,
	shakeElement,
};
