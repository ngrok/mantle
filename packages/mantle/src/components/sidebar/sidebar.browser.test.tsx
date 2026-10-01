import { render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { commands, page, userEvent } from "vitest/browser";
import { useLocalStorage } from "../../hooks/use-local-storage.js";
import { TooltipProvider } from "../tooltip/index.js";
import { Sidebar } from "./sidebar.js";

/**
 * Real-browser cascade for `Sidebar.Nav`'s hydration gates. The visibility
 * gate is a `max-*:not-data-hydrated:` variant, so tailwind-merge keeps it
 * beside a consumer display utility and its `:not([data-hydrated])` selector
 * outranks the bare utility's class. The transition gates are negated the same
 * way, and only a running `CSSTransition` can observe whether they held or
 * released. happy-dom resolves no stylesheet and runs no transition, and
 * `prefers-reduced-motion` is a Playwright page emulation.
 *
 * The stylesheet below is Tailwind 4.3.3's own output for the utilities in
 * play, keyed by the same escaped class selectors, with the theme variables
 * resolved. Regenerate it by compiling those class names through
 * `tailwindcss`'s `compile()`.
 */
const STYLE = `
@layer utilities {
	.flex { display: flex; }
	.w-\\(--sidebar-width\\,13rem\\) { width: var(--sidebar-width, 13rem); }
	.transition-none { transition-property: none; }
	.transition-\\[width\\] {
		transition-property: width;
		transition-timing-function: var(--tw-ease, cubic-bezier(0.4, 0, 0.2, 1));
		transition-duration: var(--tw-duration, 150ms);
	}
	.transition-opacity {
		transition-property: opacity;
		transition-timing-function: var(--tw-ease, cubic-bezier(0.4, 0, 0.2, 1));
		transition-duration: var(--tw-duration, 150ms);
	}
	.duration-200 { --tw-duration: 200ms; transition-duration: 200ms; }
	.ease-linear { --tw-ease: linear; transition-timing-function: linear; }
	.not-data-hydrated\\:transition-none:not([data-hydrated]) { transition-property: none; }
	.group-not-data-hydrated\\/sidebar-nav\\:transition-none:is(:where(.group\\/sidebar-nav):not([data-hydrated]) *) {
		transition-property: none;
	}
	.group-data-\\[state\\=collapsed\\]\\/sidebar-nav\\:opacity-0:is(:where(.group\\/sidebar-nav)[data-state="collapsed"] *) {
		opacity: 0%;
	}
	.data-\\[state\\=collapsed\\]\\:w-\\(--sidebar-width-icon\\,3\\.25rem\\)[data-state="collapsed"] {
		width: var(--sidebar-width-icon, 3.25rem);
	}
	@media (width < 64rem) {
		.max-lg\\:not-data-hydrated\\:hidden:not([data-hydrated]) { display: none; }
	}
	@media (prefers-reduced-motion: reduce) {
		.motion-reduce\\:transition-none { transition-property: none; }
	}
}
`;

const STORAGE_KEY = "sidebar-state";

let styleElement: HTMLStyleElement;
let container: HTMLDivElement | null = null;

beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = STYLE;
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

afterEach(async () => {
	container?.remove();
	container = null;
	localStorage.removeItem(STORAGE_KEY);
	await commands.emulateMedia({ reducedMotion: "no-preference" });
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

test("hides the desktop panel below the breakpoint before hydration, under a consumer display utility too", async () => {
	await page.viewport(414, 896);
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

test("keeps a consumer display utility above the breakpoint before hydration", async () => {
	// Why: a gate that forced `block` here would flip the panel's display on
	// hydration and relayout a flex consumer on every load.
	await page.viewport(1280, 800);
	const nav = mountServerHtml(
		renderToString(
			<Sidebar.Root mobileBreakpoint="lg">
				<Sidebar.Nav className="flex" />
			</Sidebar.Root>,
		),
	);
	expect(getComputedStyle(nav).display).toBe("flex");
});

/** The docs' localStorage persistence recipe: the server paints `expanded`, the client corrects. */
function PersistedShell() {
	const [storedState, setStoredState] = useLocalStorage(STORAGE_KEY, "expanded");
	return (
		<Sidebar.Root
			open={storedState === "expanded"}
			onOpenChange={(open) => setStoredState(open ? "expanded" : "collapsed")}
		>
			<Sidebar.Nav>
				<Sidebar.Body>
					<Sidebar.Group>
						<Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
					</Sidebar.Group>
				</Sidebar.Body>
			</Sidebar.Nav>
		</Sidebar.Root>
	);
}

test("snaps a persisted-collapsed correction into place with no transition", async () => {
	await page.viewport(1280, 800);
	// `useLocalStorage` stores JSON, so the seed is the encoded string.
	localStorage.setItem(STORAGE_KEY, JSON.stringify("collapsed"));
	const nav = mountServerHtml(renderToString(<PersistedShell />));
	expect(nav).toHaveAttribute("data-state", "expanded");
	// Why read the width: a real page paints the server markup before hydration,
	// and only a painted width can be the start value of a transition.
	expect(getComputedStyle(nav).width).toBe("208px");

	if (container == null) {
		throw new Error("The server markup is not mounted.");
	}
	render(<PersistedShell />, { container, hydrate: true });
	// Why wait: the stamp lands one frame after the correction, and the
	// transition rules apply only once it does.
	await waitFor(() => {
		expect(nav).toHaveAttribute("data-hydrated", "");
	});
	const label = container.querySelector('[data-slot="sidebar-group-label"]');
	if (!(label instanceof HTMLElement)) {
		throw new Error('No element carries data-slot="sidebar-group-label".');
	}
	expect(nav).toHaveAttribute("data-state", "collapsed");
	expect(getComputedStyle(nav).width).toBe("52px");
	expect(nav.getAnimations()).toHaveLength(0);
	expect(getComputedStyle(label).opacity).toBe("0");
	expect(label.getAnimations()).toHaveLength(0);
});

type ShellOptions = {
	/** A consumer `className` for `Sidebar.Nav`. */
	navClassName?: string;
	/** A consumer `className` for `Sidebar.GroupLabel`. */
	labelClassName?: string;
};

/** Renders the panel, a group label, and the trigger, then waits for the gates to release. */
async function renderExpandedShell({ labelClassName, navClassName }: ShellOptions = {}): Promise<{
	label: HTMLElement;
	nav: HTMLElement;
}> {
	await page.viewport(1280, 800);
	render(
		<TooltipProvider>
			<Sidebar.Root>
				<Sidebar.Nav className={navClassName} data-testid="nav">
					<Sidebar.Body>
						<Sidebar.Group>
							<Sidebar.GroupLabel className={labelClassName} data-testid="label">
								Traffic
							</Sidebar.GroupLabel>
						</Sidebar.Group>
					</Sidebar.Body>
				</Sidebar.Nav>
				<Sidebar.Trigger />
			</Sidebar.Root>
		</TooltipProvider>,
	);
	const nav = screen.getByTestId("nav");
	await waitFor(() => {
		expect(nav).toHaveAttribute("data-hydrated", "");
	});
	// Why read the width: only a painted width can be the start value of a transition.
	expect(getComputedStyle(nav).width).toBe("208px");
	return { label: screen.getByTestId("label"), nav };
}

/**
 * Records every transition that starts under `nav` as `<data-slot>:<property>`.
 * A 200ms transition can end before a click round-trip returns, so the event
 * is the stable observable, not `getAnimations()`.
 */
function recordTransitions(nav: HTMLElement): string[] {
	const transitions: string[] = [];
	nav.addEventListener("transitionrun", (event) => {
		const slot = event.target instanceof HTMLElement ? event.target.dataset.slot : "";
		transitions.push(`${slot}:${event.propertyName}`);
	});
	return transitions;
}

test("animates a collapse the user triggers after hydration", async () => {
	const { nav } = await renderExpandedShell();
	const transitions = recordTransitions(nav);

	await userEvent.click(screen.getByRole("button", { name: "Toggle Sidebar" }));

	expect(nav).toHaveAttribute("data-state", "collapsed");
	await waitFor(() => {
		expect(transitions).toEqual(
			expect.arrayContaining(["sidebar-nav:width", "sidebar-group-label:opacity"]),
		);
	});
});

test("snaps a collapse the user triggers under reduced motion", async () => {
	await commands.emulateMedia({ reducedMotion: "reduce" });
	expect(window.matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);
	const { label, nav } = await renderExpandedShell();
	const transitions = recordTransitions(nav);

	await userEvent.click(screen.getByRole("button", { name: "Toggle Sidebar" }));

	expect(nav).toHaveAttribute("data-state", "collapsed");
	expect(getComputedStyle(nav).width).toBe("52px");
	expect(getComputedStyle(label).opacity).toBe("0");
	expect(transitions).toEqual([]);
});

test("lets a consumer transition-none replace the default transition", async () => {
	// Why: the default and the consumer utility share one tailwind-merge group, so
	// only the last one in `cx` reaches the element and the cascade never decides.
	const { label, nav } = await renderExpandedShell({
		labelClassName: "transition-none",
		navClassName: "transition-none",
	});
	const transitions = recordTransitions(nav);

	await userEvent.click(screen.getByRole("button", { name: "Toggle Sidebar" }));

	expect(nav).toHaveAttribute("data-state", "collapsed");
	expect(getComputedStyle(nav).width).toBe("52px");
	expect(getComputedStyle(label).opacity).toBe("0");
	expect(transitions).toEqual([]);
});
