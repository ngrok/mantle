import { renderToString } from "react-dom/server";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { Sidebar } from "./sidebar.js";

/**
 * Real-browser cascade for `Sidebar.Nav`'s pre-hydration visibility gate. The
 * gate is a `not-data-hydrated:` variant, so tailwind-merge keeps it beside a
 * consumer display utility. Its `:not([data-hydrated])` selector outranks the
 * bare utility's class. happy-dom resolves no stylesheet, so only a
 * computed style can observe which rule wins.
 *
 * The stylesheet below is Tailwind 4.3.3's own output for the utilities in
 * play, keyed by the same escaped class selectors. Regenerate it by compiling
 * those class names through `tailwindcss`'s `compile()`.
 */
const STYLE = `
@layer utilities {
	.flex { display: flex; }
	.not-data-hydrated\\:hidden:not([data-hydrated]) { display: none; }
	@media (width >= 64rem) {
		.lg\\:not-data-hydrated\\:block:not([data-hydrated]) { display: block; }
	}
}
`;

let styleElement: HTMLStyleElement;
let container: HTMLDivElement;

beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = STYLE;
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

afterEach(() => {
	container.remove();
});

/** Mounts server markup as the browser paints it before hydration and returns the panel. */
const mountServerHtml = (html: string): HTMLElement => {
	container = document.createElement("div");
	container.innerHTML = html;
	document.body.appendChild(container);
	const nav = container.querySelector('[data-slot="sidebar-nav"]');
	if (!(nav instanceof HTMLElement)) {
		throw new Error('No element carries data-slot="sidebar-nav".');
	}
	return nav;
};

test("hides the desktop panel below the breakpoint before hydration, under a consumer display utility too", () => {
	// Why the precondition: Vitest's default viewport is narrower than `lg`. A
	// wider one would show the panel for the right reason and prove nothing.
	expect(window.matchMedia("(width >= 64rem)").matches).toBe(false);
	const nav = mountServerHtml(
		renderToString(
			<Sidebar.Root mobileBreakpoint="lg">
				<Sidebar.Nav className="flex" />
			</Sidebar.Root>,
		),
	);
	expect(getComputedStyle(nav).display).toBe("none");

	// Hydration stamps the attribute, which releases the gate to the consumer's utility.
	nav.setAttribute("data-hydrated", "");
	expect(getComputedStyle(nav).display).toBe("flex");
});
