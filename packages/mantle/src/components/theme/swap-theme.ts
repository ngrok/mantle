import { flushSync } from "react-dom";
import { getPrefersReducedMotion } from "../../hooks/use-prefers-reduced-motion.js";

/**
 * Counts theme swaps. A newer swap replaces a running one, so only the newest
 * one clears the `<html>` attribute.
 */
let themeTransitionCount = 0;

/**
 * Runs `update` inside a view transition, and grows the new theme in a circle
 * from `origin` over the old one. When `origin` is omitted, the circle grows
 * from the focused element, else from the center of the viewport. It runs
 * `update` at once when the browser has no view transitions, when the user
 * prefers reduced motion, or when the page is hidden.
 *
 * Why `flushSync`: React must commit the new theme before the browser takes
 * the snapshot of the new theme.
 *
 * Why the click listener: while a view transition runs, the browser sends each
 * pointer event to `<html>`, so a click on the page would be lost. A click ends
 * the transition at once, then goes to the element under the pointer.
 */
function swapTheme(update: () => void, { origin }: { origin?: Element | null } = {}) {
	if (
		typeof document.startViewTransition !== "function" ||
		getPrefersReducedMotion() ||
		document.visibilityState !== "visible"
	) {
		update();
		return;
	}

	const html = document.documentElement;
	const viewport = { width: window.innerWidth, height: window.innerHeight };
	const circle = revealCircle(revealOrigin(origin, viewport), viewport);

	html.dataset.themeTransition = "";
	const transition = document.startViewTransition(() => flushSync(update));
	const transitionNumber = ++themeTransitionCount;

	function onClick(event: MouseEvent) {
		if (event.target !== html) {
			return;
		}
		transition.skipTransition();
		const target = document.elementFromPoint(event.clientX, event.clientY);
		if (target != null && target !== html) {
			target.dispatchEvent(new MouseEvent("click", event));
		}
	}
	document.addEventListener("click", onClick, { capture: true });

	transition.ready.then(
		() =>
			html.animate(
				{ clipPath: [circle.from, circle.to] },
				// Why not `ease-out-strong` in 300ms: the covered area grows with the
				// square of the radius, so that curve flips most of the screen in about
				// 40ms, like a flash. See `docs/motion.md` § Exceptions.
				{ duration: 400, easing: "ease-out", pseudoElement: "::view-transition-new(root)" },
			),
		// A skipped transition rejects `ready`; the theme is already applied.
		() => {},
	);

	void transition.finished.finally(() => {
		document.removeEventListener("click", onClick, { capture: true });
		if (transitionNumber === themeTransitionCount) {
			delete html.dataset.themeTransition;
		}
	});
}

/**
 * Returns the box the reveal grows from: `origin`, else the focused element,
 * else a point at the center of the viewport.
 */
function revealOrigin(
	origin: Element | null | undefined,
	viewport: { width: number; height: number },
): Pick<DOMRect, "left" | "top" | "width" | "height"> {
	const focused = document.activeElement;
	const element = origin ?? (focused != null && focused !== document.body ? focused : undefined);
	if (element != null) {
		return element.getBoundingClientRect();
	}
	return { left: viewport.width / 2, top: viewport.height / 2, width: 0, height: 0 };
}

/**
 * Returns the start and end `clip-path` of the reveal: a circle centered on
 * `origin` that grows until it covers the farthest corner of the viewport.
 *
 * @example
 * revealCircle({ left: 0, top: 0, width: 20, height: 20 }, { width: 100, height: 100 })
 * // { from: "circle(0px at 10px 10px)", to: "circle(127.28px at 10px 10px)" }
 */
function revealCircle(
	origin: Pick<DOMRect, "left" | "top" | "width" | "height">,
	viewport: { width: number; height: number },
) {
	const x = origin.left + origin.width / 2;
	const y = origin.top + origin.height / 2;
	const radius = Math.hypot(Math.max(x, viewport.width - x), Math.max(y, viewport.height - y));
	const at = `at ${x}px ${y}px`;

	return {
		from: `circle(0px ${at})`,
		to: `circle(${Math.round(radius * 100) / 100}px ${at})`,
	};
}

export {
	//,
	revealCircle,
	swapTheme,
};
