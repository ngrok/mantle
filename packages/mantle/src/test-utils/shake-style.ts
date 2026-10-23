import { afterAll, beforeAll } from "vitest";

/**
 * Tailwind's output for `motion-safe:data-shake:animate-shake`, with the `shake`
 * keyframes from `mantle.css`. Browser tests run no Tailwind build.
 */
const shakeStyle = `
@media (prefers-reduced-motion: no-preference) {
	.motion-safe\\:data-shake\\:animate-shake[data-shake] {
		animation: shake 300ms ease-in-out;
	}
}
@keyframes shake {
	0% { translate: 0; animation-timing-function: ease-out; }
	20% { translate: -4px; }
	40% { translate: 3px; }
	60% { translate: -2px; }
	80% { translate: 1px; }
	100% { translate: 0; }
}
`;

/**
 * Adds the shake stylesheet to the document for the tests in the calling file.
 *
 * @example
 * ```ts
 * installShakeStyle();
 *
 * test("shakes", () => {
 * 	shakeElement(element);
 * });
 * ```
 */
function installShakeStyle() {
	let styleElement: HTMLStyleElement | undefined;

	beforeAll(() => {
		styleElement = document.createElement("style");
		styleElement.textContent = shakeStyle;
		document.head.appendChild(styleElement);
	});

	afterAll(() => {
		styleElement?.remove();
	});
}

/** The running `shake` animations on an element. */
function shakesOf(element: Element) {
	return element
		.getAnimations()
		.filter(
			(animation) => animation instanceof CSSAnimation && animation.animationName === "shake",
		);
}

export {
	//,
	installShakeStyle,
	shakesOf,
};
