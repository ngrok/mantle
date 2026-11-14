import { flushSync } from "react-dom";
import { getPrefersReducedMotion } from "../../hooks/use-prefers-reduced-motion.js";

/**
 * The theme view transition that runs now. Only one runs at a time.
 */
let activeTransition: ReturnType<Document["startViewTransition"]> | null = null;

/**
 * The surfaces that can close as a swap starts, such as a command palette.
 * `mantle.css` stops the exit animation of a marked one, so it unmounts before
 * the old snapshot and does not freeze outside the circle.
 */
const EXIT_SURFACES = [
	'[data-slot~="dialog-overlay"]',
	'[data-slot~="dialog-content"]',
	'[data-slot~="dialog-positioner"]',
	'[data-slot~="dropdown-menu-content"]',
	'[data-slot~="dropdown-menu-sub-content"]',
].join(", ");

/** The parts whose descendants keep their own motion during a swap: the icon of a switcher. */
const SWITCHER_PARTS = '[data-slot~="theme-switcher"], [data-slot~="theme-switcher-icon"]';

/**
 * The most elements with a transition for which the swap cancels the
 * transitions in script. Chromium sorts the list that `getAnimations` returns:
 * 2,000 transitions on sibling rows take 37 ms, about the cost of the two
 * style passes that the rule adds on such a page, and 5,000 take 437 ms.
 */
const SCRIPT_CANCEL_LIMIT = 2000;

/** How many elements the swap reads to estimate that count. */
const SAMPLE_SIZE = 256;

/**
 * Runs `update` inside a view transition, and grows the new theme in a circle
 * from `origin` over the old one. When `origin` is omitted, the circle grows
 * from the focused element, else from the center of the viewport. It runs
 * `update` at once when the browser has no view transitions, when the user
 * prefers reduced motion, or when the page is hidden.
 *
 * Why each open surface gets the attribute and no rule hangs under `<html>`:
 * a root attribute with a descendant rule restyles every element that the
 * rule can match, when the attribute comes and again when it goes.
 *
 * Why the click listener: while a view transition runs, the browser sends each
 * pointer event to `<html>`, so a click on the page would be lost. A click ends
 * the transition at once, then goes to the element under the pointer.
 *
 * Why one transition at a time: fast clicks crash the Chrome renderer, probably
 * because each one starts a view transition in the click handler of a skipped one. A swap during a
 * transition skips it and runs `update` without motion. It waits for the
 * update of the skipped transition, or that update restores the old theme.
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

	if (activeTransition != null) {
		activeTransition.skipTransition();
		void activeTransition.updateCallbackDone.finally(() => applyAtOnce(update));
		return;
	}

	const html = document.documentElement;
	const viewport = { width: window.innerWidth, height: window.innerHeight };
	const circle = revealCircle(revealOrigin(origin, viewport), viewport);

	const many = holdsManyTransitions();
	const marked = [html, ...document.querySelectorAll<HTMLElement>(EXIT_SURFACES)];
	for (const element of marked) {
		element.dataset.themeTransition = "";
	}
	const transition = document.startViewTransition(() => {
		if (many) {
			// Why here: the rule that this attribute turns on restyles every
			// element, and in the update that pass is the pass of the new theme.
			html.dataset.themeTransitionMany = "";
		}
		applyAtOnce(update);
	});
	activeTransition = transition;

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

	const reveal = transition.ready.then(
		() =>
			html.animate(
				{ clipPath: [circle.from, circle.to] },
				// Why not `ease-out-strong` in 300ms: the covered area grows with the
				// square of the radius, so that curve flips most of the screen in about
				// 40ms, like a flash. See `docs/motion.md` § Exceptions.
				{ duration: 400, easing: "ease-out", pseudoElement: "::view-transition-new(root)" },
			),
		// A skipped transition rejects `ready`; the theme is already applied.
		() => undefined,
	);

	const finish = async () => {
		// Why cancel: a skip ends the transition, not the animation. The animation
		// would then clip the new root of the next transition.
		(await reveal)?.cancel();
		document.removeEventListener("click", onClick, { capture: true });
		activeTransition = null;
		delete html.dataset.themeTransitionMany;
		for (const element of marked) {
			delete element.dataset.themeTransition;
		}
	};
	void transition.finished.finally(() => {
		void finish();
	});
}

/**
 * Runs `update`, then cancels the CSS transitions that the new theme started.
 * The new snapshot is live, so a color transition would fade inside the circle
 * while the rest of the page shows the new theme.
 *
 * Why `flushSync`: React must commit the new theme before the browser takes
 * the snapshot of the new theme.
 *
 * Why in script and not with a `transition: none` rule on every element: that
 * rule restyles the whole document when it comes and again when it goes, so
 * one swap cost three full style passes. `getAnimations` flushes the one pass
 * that the new theme needs. A page that holds many transitions keeps the rule,
 * because the list that `getAnimations` returns costs more there.
 */
function applyAtOnce(update: () => void) {
	flushSync(update);
	if (document.documentElement.hasAttribute("data-theme-transition-many")) {
		return;
	}
	for (const animation of document.getAnimations()) {
		if (animation instanceof CSSTransition && !isSwitcherMotion(animation)) {
			animation.cancel();
		}
	}
}

/** Whether a transition runs inside a switcher part, which keeps its own swap. */
function isSwitcherMotion(transition: CSSTransition) {
	const target = transition.effect instanceof KeyframeEffect ? transition.effect.target : null;
	return target?.parentElement?.closest(SWITCHER_PARTS) != null;
}

/**
 * Estimates whether more than {@link SCRIPT_CANCEL_LIMIT} elements hold a
 * transition. It reads one element at a random place in each run of n
 * elements, so the estimate costs the same on a small page and on a large one.
 *
 * Why a random place: a fixed stride can match the period of repeated rows
 * and read only the rows' wrappers.
 */
function holdsManyTransitions() {
	const elements = document.getElementsByTagName("*");
	const step = Math.max(1, Math.floor(elements.length / SAMPLE_SIZE));
	let sampled = 0;
	for (let start = 0; start < elements.length; start += step) {
		const element = elements[start + Math.floor(Math.random() * step)];
		if (element != null && hasTransition(element)) {
			sampled += 1;
		}
	}
	return sampled * step > SCRIPT_CANCEL_LIMIT;
}

/** Whether an element has a transition with a duration above zero. */
function hasTransition(element: Element) {
	return getComputedStyle(element)
		.transitionDuration.split(",")
		.some((duration) => Number.parseFloat(duration) > 0);
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
	holdsManyTransitions,
	revealCircle,
	swapTheme,
};
