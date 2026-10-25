import { render, screen, waitFor } from "@testing-library/react";
import { useSyncExternalStore } from "react";
import { renderToString } from "react-dom/server";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { commands, page, userEvent } from "vitest/browser";
import { TooltipProvider } from "../tooltip/index.js";
import { AppLayout } from "./app-layout.js";

/**
 * Real-browser geometry for the workspace row and the side panel lane in it.
 * The panel's contract is the layout it produces (a clip box with a fixed basis
 * beside the card, nothing when closed, an inner card that never moves, a
 * floating card below its breakpoint) and the transition that carries one state
 * to the other, gated until a frame after hydration. happy-dom lays nothing out
 * and runs no transition, and `prefers-reduced-motion` is a Playwright page
 * emulation.
 *
 * The stylesheet is Tailwind 4.3.3's own output for the utilities in play,
 * keyed by the same escaped class selectors, with the theme variables resolved.
 * Regenerate it by compiling those class names through `tailwindcss`'s
 * `compile()`. Drop `grow-0`, the inner card's width or inset, or a
 * `data-state-closed:` utility from a part and the matching assertion fails.
 * The removed `mx-auto` and `--app-layout-max-width` cap rules stay loaded with
 * no part that uses them, so a cap that comes back fails the ultrawide test.
 * The ungated `data-state-closed:basis-0` rule stays loaded with no part that
 * uses it, so an ungated utility shows up as a third transition on the floating
 * panel. The row-driven float is loaded for a row
 * with no rail, the only row this file renders, so a lane expectation at a row
 * under the icon-rail threshold fails here the way it does in a real page.
 */
const STYLE = `
@layer theme, base, components, utilities;
@layer theme {
	:root {
		--spacing: 0.25rem;
		--default-transition-duration: 150ms;
		--default-transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
		--ease-out-strong: cubic-bezier(0.23, 1, 0.32, 1);
	}
}
@layer base {
	*, ::after, ::before {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
		border: 0 solid;
	}
}
@layer utilities {
	.absolute { position: absolute; }
	.relative { position: relative; }
	.inset-y-0 { inset-block: calc(var(--spacing) * 0); }
	.right-\\(--_side-panel-content-inset\\) { right: var(--_side-panel-content-inset); }
	.isolate { isolation: isolate; }
	.m-\\(--app-layout-card-gutter\\,0\\.5rem\\) { margin: var(--app-layout-card-gutter,0.5rem); }
	.mx-auto { margin-inline: auto; }
	.my-\\(--app-layout-card-gutter\\,0\\.5rem\\) { margin-block: var(--app-layout-card-gutter,0.5rem); }
	.mr-0 { margin-right: 0px; }
	.ml-0 { margin-left: 0px; }
	.flex { display: flex; }
	.h-full { height: 100%; }
	.w-full { width: 100%; }
	.w-\\(--_side-panel-content-width\\) { width: var(--_side-panel-content-width); }
	.max-w-\\(--app-layout-max-width\\,128rem\\) { max-width: var(--app-layout-max-width,128rem); }
	.max-w-\\[600px\\] { max-width: 600px; }
	.min-w-0 { min-width: 0px; }
	.flex-1 { flex: 1; }
	.shrink-0 { flex-shrink: 0; }
	.grow-0 { flex-grow: 0; }
	.basis-\\(--_side-panel-box-width\\) { flex-basis: var(--_side-panel-box-width); }
	.flex-col { flex-direction: column; }
	.overflow-clip { overflow: clip; }
	.overflow-x-clip { overflow-x: clip; }
	.border { border-style: var(--tw-border-style); border-width: 1px; }
	.transition-\\[flex-basis\\,translate\\,visibility\\] {
		transition-property: flex-basis,translate,visibility;
		transition-timing-function: var(--tw-ease, var(--default-transition-timing-function));
		transition-duration: var(--tw-duration, var(--default-transition-duration));
	}
	.transition-none { transition-property: none; }
	.duration-200 { --tw-duration: 200ms; transition-duration: 200ms; }
	.duration-\\[2000ms\\] { --tw-duration: 2000ms; transition-duration: 2000ms; }
	.ease-out-strong { --tw-ease: var(--ease-out-strong); transition-timing-function: var(--ease-out-strong); }
	.\\[--_side-panel-content-width\\:var\\(--app-layout-side-panel-width\\,clamp\\(21rem\\,24cqw\\,27rem\\)\\)\\] {
		--_side-panel-content-width: var(--app-layout-side-panel-width,clamp(21rem, 24cqw, 27rem));
	}
	.\\[--_side-panel-content-inset\\:var\\(--app-layout-card-gutter\\,0\\.5rem\\)\\] {
		--_side-panel-content-inset: var(--app-layout-card-gutter,0.5rem);
	}
	.\\[--_side-panel-box-width\\:calc\\(var\\(--app-layout-side-panel-width\\,clamp\\(21rem\\,24cqw\\,27rem\\)\\)\\+var\\(--app-layout-card-gutter\\,0\\.5rem\\)\\)\\] {
		--_side-panel-box-width: calc(var(--app-layout-side-panel-width,clamp(21rem, 24cqw, 27rem)) + var(--app-layout-card-gutter,0.5rem));
	}
	.not-data-hydrated\\:transition-none:not([data-hydrated]) { transition-property: none; }
	@media (prefers-reduced-motion: reduce) {
		.motion-reduce\\:transition-none { transition-property: none; }
	}
	@media (width < 64rem) {
		.max-lg\\:absolute { position: absolute; }
		.max-lg\\:inset-y-\\(--app-layout-card-gutter\\,0\\.5rem\\) { inset-block: var(--app-layout-card-gutter,0.5rem); }
		.max-lg\\:right-\\(--app-layout-card-gutter\\,0\\.5rem\\) { right: var(--app-layout-card-gutter,0.5rem); }
		.max-lg\\:z-20 { z-index: 20; }
		.max-lg\\:my-0 { margin-block: 0px; }
		.max-lg\\:w-\\[min\\(24rem\\,calc\\(100cqw-5rem\\)\\)\\] { width: min(24rem, calc(100cqw - 5rem)); }
		.max-lg\\:\\[--_side-panel-content-width\\:100\\%\\] { --_side-panel-content-width: 100%; }
		.max-lg\\:\\[--_side-panel-content-inset\\:0px\\] { --_side-panel-content-inset: 0px; }
	}
	@media (width < 48rem) {
		.max-md\\:absolute { position: absolute; }
		.max-md\\:inset-y-\\(--app-layout-card-gutter\\,0\\.5rem\\) { inset-block: var(--app-layout-card-gutter,0.5rem); }
		.max-md\\:right-\\(--app-layout-card-gutter\\,0\\.5rem\\) { right: var(--app-layout-card-gutter,0.5rem); }
		.max-md\\:left-\\(--app-layout-card-gutter\\,0\\.5rem\\) { left: var(--app-layout-card-gutter,0.5rem); }
		.max-md\\:z-20 { z-index: 20; }
		.max-md\\:my-0 { margin-block: 0px; }
		.max-md\\:w-auto { width: auto; }
		.max-md\\:w-\\[min\\(24rem\\,calc\\(100cqw-5rem\\)\\)\\] { width: min(24rem, calc(100cqw - 5rem)); }
		.max-md\\:\\[--_side-panel-content-width\\:100\\%\\] { --_side-panel-content-width: 100%; }
		.max-md\\:\\[--_side-panel-content-inset\\:0px\\] { --_side-panel-content-inset: 0px; }
	}
	@media (width < 40rem) {
		.max-sm\\:absolute { position: absolute; }
		.max-sm\\:inset-y-\\(--app-layout-card-gutter\\,0\\.5rem\\) { inset-block: var(--app-layout-card-gutter,0.5rem); }
		.max-sm\\:right-\\(--app-layout-card-gutter\\,0\\.5rem\\) { right: var(--app-layout-card-gutter,0.5rem); }
		.max-sm\\:left-\\(--app-layout-card-gutter\\,0\\.5rem\\) { left: var(--app-layout-card-gutter,0.5rem); }
		.max-sm\\:z-20 { z-index: 20; }
		.max-sm\\:my-0 { margin-block: 0px; }
		.max-sm\\:w-auto { width: auto; }
		.max-sm\\:\\[--_side-panel-content-width\\:100\\%\\] { --_side-panel-content-width: 100%; }
		.max-sm\\:\\[--_side-panel-content-inset\\:0px\\] { --_side-panel-content-inset: 0px; }
	}
	.data-state-closed\\:pointer-events-none[data-state~=closed] { pointer-events: none; }
	.data-state-closed\\:basis-0[data-state~=closed] { flex-basis: 0px; }
	.\\@container\\/app-layout-workspace {
		container-type: inline-size;
		container-name: app-layout-workspace;
	}
	@container app-layout-workspace (width < 46.75rem) {
		.\\@max-side-panel-lane-icon-rail\\/app-layout-workspace\\:absolute { position: absolute; }
		.\\@max-side-panel-lane-icon-rail\\/app-layout-workspace\\:inset-y-\\(--app-layout-card-gutter\\,0\\.5rem\\) { inset-block: var(--app-layout-card-gutter,0.5rem); }
		.\\@max-side-panel-lane-icon-rail\\/app-layout-workspace\\:right-\\(--app-layout-card-gutter\\,0\\.5rem\\) { right: var(--app-layout-card-gutter,0.5rem); }
		.\\@max-side-panel-lane-icon-rail\\/app-layout-workspace\\:z-20 { z-index: 20; }
		.\\@max-side-panel-lane-icon-rail\\/app-layout-workspace\\:my-0 { margin-block: 0px; }
		.\\@max-side-panel-lane-icon-rail\\/app-layout-workspace\\:\\[--_side-panel-content-width\\:100\\%\\] { --_side-panel-content-width: 100%; }
		.\\@max-side-panel-lane-icon-rail\\/app-layout-workspace\\:\\[--_side-panel-content-inset\\:0px\\] { --_side-panel-content-inset: 0px; }
		.\\@max-side-panel-lane-icon-rail\\/app-layout-workspace\\:data-state-closed\\:invisible[data-state~=closed] { visibility: hidden; }
		.\\@max-side-panel-lane-icon-rail\\/app-layout-workspace\\:data-state-closed\\:translate-x-\\[calc\\(100\\%\\+var\\(--app-layout-card-gutter\\,0\\.5rem\\)\\)\\][data-state~=closed] {
			--tw-translate-x: calc(100% + var(--app-layout-card-gutter,0.5rem));
			translate: var(--tw-translate-x) var(--tw-translate-y);
		}
	}
	@media (width >= 40rem) {
		@container app-layout-workspace (width < 46.75rem) {
			.sm\\:\\@max-side-panel-lane-icon-rail\\/app-layout-workspace\\:w-\\[min\\(24rem\\,calc\\(100cqw-5rem\\)\\)\\] { width: min(24rem, calc(100cqw - 5rem)); }
		}
	}
	@media (width >= 48rem) {
		@container app-layout-workspace (width < 46.75rem) {
			.md\\:\\@max-side-panel-lane-icon-rail\\/app-layout-workspace\\:w-\\[min\\(24rem\\,calc\\(100cqw-5rem\\)\\)\\] { width: min(24rem, calc(100cqw - 5rem)); }
		}
	}
	@media (width >= 40rem) {
		@container app-layout-workspace (width >= 56.5rem) {
			.sm\\:\\@min-side-panel-lane\\/app-layout-workspace\\:data-state-closed\\:basis-0[data-state~=closed] { flex-basis: 0px; }
		}
		@container app-layout-workspace (width >= 46.75rem) {
			[data-slot~=app-layout-workspace]:not(:has(> [data-slot~=sidebar-nav]:not([data-state~=collapsed]))) .sm\\:\\[\\[data-slot\\~\\=app-layout-workspace\\]\\:not\\(\\:has\\(\\>\\[data-slot\\~\\=sidebar-nav\\]\\:not\\(\\[data-state\\~\\=collapsed\\]\\)\\)\\)_\\&\\]\\:\\@min-side-panel-lane-icon-rail\\/app-layout-workspace\\:data-state-closed\\:basis-0[data-state~=closed] { flex-basis: 0px; }
		}
	}
	@media (width >= 48rem) {
		@container app-layout-workspace (width >= 56.5rem) {
			.md\\:\\@min-side-panel-lane\\/app-layout-workspace\\:data-state-closed\\:basis-0[data-state~=closed] { flex-basis: 0px; }
		}
		@container app-layout-workspace (width >= 46.75rem) {
			[data-slot~=app-layout-workspace]:not(:has(> [data-slot~=sidebar-nav]:not([data-state~=collapsed]))) .md\\:\\[\\[data-slot\\~\\=app-layout-workspace\\]\\:not\\(\\:has\\(\\>\\[data-slot\\~\\=sidebar-nav\\]\\:not\\(\\[data-state\\~\\=collapsed\\]\\)\\)\\)_\\&\\]\\:\\@min-side-panel-lane-icon-rail\\/app-layout-workspace\\:data-state-closed\\:basis-0[data-state~=closed] { flex-basis: 0px; }
		}
	}
	@media (width >= 64rem) {
		@container app-layout-workspace (width >= 56.5rem) {
			.lg\\:\\@min-side-panel-lane\\/app-layout-workspace\\:data-state-closed\\:basis-0[data-state~=closed] { flex-basis: 0px; }
		}
		@container app-layout-workspace (width >= 46.75rem) {
			[data-slot~=app-layout-workspace]:not(:has(> [data-slot~=sidebar-nav]:not([data-state~=collapsed]))) .lg\\:\\[\\[data-slot\\~\\=app-layout-workspace\\]\\:not\\(\\:has\\(\\>\\[data-slot\\~\\=sidebar-nav\\]\\:not\\(\\[data-state\\~\\=collapsed\\]\\)\\)\\)_\\&\\]\\:\\@min-side-panel-lane-icon-rail\\/app-layout-workspace\\:data-state-closed\\:basis-0[data-state~=closed] { flex-basis: 0px; }
		}
	}
	@media (width < 64rem) {
		.max-lg\\:data-state-closed\\:invisible[data-state~=closed] { visibility: hidden; }
		.max-lg\\:data-state-closed\\:translate-x-\\[calc\\(100\\%\\+var\\(--app-layout-card-gutter\\,0\\.5rem\\)\\)\\][data-state~=closed] {
			--tw-translate-x: calc(100% + var(--app-layout-card-gutter,0.5rem));
			translate: var(--tw-translate-x) var(--tw-translate-y);
		}
	}
}
@property --tw-border-style {
	syntax: "*";
	inherits: false;
	initial-value: solid;
}
@property --tw-translate-x {
	syntax: "*";
	inherits: false;
	initial-value: 0;
}
@property --tw-translate-y {
	syntax: "*";
	inherits: false;
	initial-value: 0;
}
`;

/** The card gutter at its default, in pixels. */
const GUTTER = 8;

/** The open width the tests set, in pixels. The box adds the gutter to it. */
const OPEN_WIDTH = 300;

/** The floating panel's width at every row these tests use: 24rem beats `100cqw - 5rem`. */
const FLOATING_PANEL_WIDTH = 384;

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
	await page.viewport(1280, 800);
	await commands.emulateMedia({ reducedMotion: "no-preference" });
});

type ShellOptions = {
	/** Whether the shell renders a side panel, and whether it starts open. */
	panel?: "open" | "closed";
	/** The side panel's `mobileBreakpoint`. */
	mobileBreakpoint?: "sm" | "md" | "lg";
	/** A consumer `className` for the side panel. */
	panelClassName?: string;
	/** A consumer `className` for the workspace. */
	workspaceClassName?: string;
	/** The frame's width. Defaults to the viewport's. */
	rootWidth?: number;
	/** CSS variables set on the frame, as a consumer sets them through `className`. */
	vars?: Record<string, string>;
};

/**
 * A frame, a workspace, a card with the panel's trigger, and (when asked) a
 * side panel. The variables land through the DOM API rather than a style
 * prop, because React's style type has no room for a custom property.
 */
function Shell({
	mobileBreakpoint,
	panel,
	panelClassName,
	rootWidth,
	vars = {},
	workspaceClassName,
}: ShellOptions) {
	return (
		<TooltipProvider>
			<AppLayout.Root
				data-testid="root"
				style={{ height: 400, width: rootWidth }}
				ref={(node) => {
					for (const [name, value] of Object.entries(vars)) {
						node?.style.setProperty(name, value);
					}
				}}
			>
				<AppLayout.SidePanelRoot defaultOpen={panel === "open"}>
					<AppLayout.Workspace className={workspaceClassName} data-testid="workspace">
						<AppLayout.Content data-testid="content">
							<AppLayout.SidePanelTrigger label="Toggle the assistant" />
						</AppLayout.Content>
						{panel != null && (
							<AppLayout.SidePanel
								className={panelClassName}
								data-testid="panel"
								mobileBreakpoint={mobileBreakpoint}
							>
								conversation
							</AppLayout.SidePanel>
						)}
					</AppLayout.Workspace>
				</AppLayout.SidePanelRoot>
			</AppLayout.Root>
		</TooltipProvider>
	);
}

const rectOf = (testId: string) => screen.getByTestId(testId).getBoundingClientRect();

/** The panel's inner card: the element that carries the chrome and lays out the header, the body, and the footer. */
function cardOf(panel: HTMLElement): HTMLElement {
	const card = panel.firstElementChild;
	if (!(card instanceof HTMLElement)) {
		throw new Error("The panel renders no inner card.");
	}
	return card;
}

/** Renders a shell with an open-width panel and returns the box, for the lane tests. */
function renderLane(panel: "open" | "closed", panelClassName?: string): HTMLElement {
	render(
		<Shell
			panel={panel}
			panelClassName={panelClassName}
			rootWidth={1200}
			vars={{ "--app-layout-side-panel-width": `${OPEN_WIDTH}px` }}
		/>,
	);
	return screen.getByTestId("panel");
}

/** Waits for the hydration stamp, so the transition rules apply to what follows. */
async function waitForHydration(panel: HTMLElement) {
	await waitFor(() => {
		expect(panel).toHaveAttribute("data-hydrated", "");
	});
}

/**
 * Records every transition that starts on the panel as its property name. A
 * 200ms transition can end before a click round-trip returns, so the event is
 * the stable observable, not `getAnimations()`.
 */
function recordTransitions(panel: HTMLElement): string[] {
	const transitions: string[] = [];
	panel.addEventListener("transitionrun", (event) => {
		if (event.target === panel) {
			transitions.push(event.propertyName);
		}
	});
	return transitions;
}

/**
 * The transition in flight on the panel's box. Throws when the panel is at
 * rest: a 200ms run ends before a click round-trip returns, so only a run a
 * consumer `duration-*` slowed is there to catch.
 */
function transitionOf(panel: HTMLElement): Animation {
	const [transition] = panel.getAnimations();
	if (transition == null) {
		throw new Error("No transition is in flight on the panel.");
	}
	return transition;
}

const subscribeToNothing = () => () => {};

/**
 * A shell whose server render says open and whose client store says closed:
 * the shape of any storage-backed persistence, where the correction lands in
 * the hydration commit.
 */
function CorrectedShell() {
	const open = useSyncExternalStore(
		subscribeToNothing,
		() => false,
		() => true,
	);
	return (
		<AppLayout.Root data-testid="root" style={{ height: 400, width: 1200 }}>
			<AppLayout.SidePanelRoot open={open}>
				<AppLayout.Workspace>
					<AppLayout.Content data-testid="content">page</AppLayout.Content>
					<AppLayout.SidePanel data-testid="panel">conversation</AppLayout.SidePanel>
				</AppLayout.Workspace>
			</AppLayout.SidePanelRoot>
		</AppLayout.Root>
	);
}

describe("AppLayout.Workspace width", () => {
	test("fills the frame at any width", async () => {
		await page.viewport(3840, 800);
		render(<Shell rootWidth={3840} />);
		const root = rectOf("root");
		const workspace = rectOf("workspace");
		expect(workspace.width).toBe(3840);
		expect(workspace.left).toBe(root.left);
	});
});

describe("AppLayout.SidePanel lane", () => {
	test("an open panel's card sits at its width beside the content card, one gutter apart", async () => {
		await page.viewport(1280, 800);
		const panel = renderLane("open");
		const root = rectOf("root");
		const content = rectOf("content");
		const box = panel.getBoundingClientRect();
		const card = cardOf(panel).getBoundingClientRect();
		// The box runs to the row's end edge and holds the card plus its end inset.
		expect(box.width).toBe(OPEN_WIDTH + GUTTER);
		expect(box.right).toBe(root.right);
		expect(card.width).toBe(OPEN_WIDTH);
		expect(card.right).toBe(root.right - GUTTER);
		// Why: the box has no start margin, so the content card's own end margin
		// is the whole gap; a box `ml-*` would double it.
		expect(card.left - content.right).toBe(GUTTER);
		expect(content.width).toBe(1200 - 3 * GUTTER - OPEN_WIDTH);
	});

	test("a wider --app-layout-card-gutter widens the box, the card's end inset, and the gap to the content card", async () => {
		// Why: the box width, the card's inset, and the panel's vertical margins
		// each read the variable on their own, so a `0.5rem` hard-coded in any
		// one of them passes at the default gutter.
		await page.viewport(1280, 800);
		const gutter = 16;
		render(
			<Shell
				panel="open"
				rootWidth={1200}
				vars={{
					"--app-layout-card-gutter": `${gutter}px`,
					"--app-layout-side-panel-width": `${OPEN_WIDTH}px`,
				}}
			/>,
		);
		const panel = screen.getByTestId("panel");
		const root = rectOf("root");
		const content = rectOf("content");
		const box = panel.getBoundingClientRect();
		const card = cardOf(panel).getBoundingClientRect();
		expect(box.width).toBe(OPEN_WIDTH + gutter);
		expect(card.right).toBe(root.right - gutter);
		expect(card.left - content.right).toBe(gutter);
		expect(box.top).toBe(content.top);
	});

	test("sizes the default open width from the row, not the viewport", async () => {
		// Why: the lane tokens budget the panel at its 21rem floor. A 24vw default
		// on a 1920px viewport is 27rem, and in a 60rem row beside an expanded
		// rail that leaves the page narrower than the panel.
		await page.viewport(1920, 800);
		render(<Shell panel="open" rootWidth={960} />);
		const panel = screen.getByTestId("panel");
		expect(cardOf(panel).getBoundingClientRect().width).toBe(336);
		expect(rectOf("content").width).toBe(960 - 3 * GUTTER - 336);
	});

	test("a closed panel collapses to nothing and the content card takes the row", async () => {
		await page.viewport(1280, 800);
		const panel = renderLane("closed");
		const root = rectOf("root");
		const content = rectOf("content");
		// Why: the basis alone goes to zero. The card inside keeps its width and
		// its border, and the clip hides all of it.
		expect(panel.getBoundingClientRect().width).toBe(0);
		expect(content.right).toBe(root.right - GUTTER);
		expect(content.width).toBe(1200 - 2 * GUTTER);
	});

	test("a closed panel keeps the content card's height, so opening changes width alone", async () => {
		// Why: no margin animates. A vertical margin that closed with the basis
		// would start the open a gutter taller than the card and shrink it into place.
		await page.viewport(1280, 800);
		const panel = renderLane("closed");
		const content = rectOf("content");
		const box = panel.getBoundingClientRect();
		expect(box.top).toBe(content.top);
		expect(box.height).toBe(content.height);
	});

	test("the inner card keeps the open width and its place while the box around it collapses", async () => {
		// Why: the header, the body, and the footer lay out in the inner card, so
		// the box's start edge sweeps across them instead of reflowing or moving them.
		await page.viewport(1280, 800);
		const panel = renderLane("closed");
		const card = cardOf(panel).getBoundingClientRect();
		expect(card.width).toBe(OPEN_WIDTH);
		expect(card.right).toBe(panel.getBoundingClientRect().right - GUTTER);
	});

	test.each([
		["md", 700],
		["lg", 1000],
	] as const)(
		"floats over the card below the %s breakpoint",
		async (mobileBreakpoint, viewportWidth) => {
			await page.viewport(viewportWidth, 800);
			render(<Shell mobileBreakpoint={mobileBreakpoint} panel="open" />);
			const panel = screen.getByTestId("panel");
			const content = rectOf("content");
			const workspace = rectOf("workspace");
			expect(getComputedStyle(panel).position).toBe("absolute");
			const box = panel.getBoundingClientRect();
			expect(box.width).toBe(FLOATING_PANEL_WIDTH);
			expect(box.right).toBe(workspace.right - GUTTER);
			// The inner card fills the floating box edge to edge, whatever the open width is.
			expect(cardOf(panel).getBoundingClientRect().width).toBe(FLOATING_PANEL_WIDTH);
			// Out of flow: the content card keeps the whole row underneath it.
			expect(content.width).toBe(viewportWidth - 2 * GUTTER);
		},
	);

	test.each([
		["sm", 600],
		["md", 600],
		["lg", 700],
	] as const)(
		"covers the card from gutter to gutter one breakpoint below %s",
		async (mobileBreakpoint, viewportWidth) => {
			await page.viewport(viewportWidth, 800);
			render(<Shell mobileBreakpoint={mobileBreakpoint} panel="open" />);
			const panel = screen.getByTestId("panel");
			const workspace = rectOf("workspace");
			expect(getComputedStyle(panel).position).toBe("absolute");
			const box = panel.getBoundingClientRect();
			expect(box.left).toBe(workspace.left + GUTTER);
			expect(box.right).toBe(workspace.right - GUTTER);
			expect(cardOf(panel).getBoundingClientRect().width).toBe(box.width);
		},
	);

	test("a closed floating panel slides off the end edge", async () => {
		await page.viewport(1000, 800);
		render(<Shell panel="closed" />);
		const panel = screen.getByTestId("panel");
		const workspace = rectOf("workspace");
		// Why: the floating box has no basis to collapse, so it leaves by
		// translation, gutter included, and its shadow goes with it.
		expect(panel.getBoundingClientRect().left).toBe(workspace.right);
	});

	test("a closed floating panel is hidden, so a narrow row has no panel strip beside it", async () => {
		// Why: the closed translation is the panel's own width past the row's end
		// edge, and a row narrower than the frame puts that edge inside the frame.
		await page.viewport(900, 800);
		render(<Shell panel="closed" workspaceClassName="max-w-[600px]" />);
		const panel = screen.getByTestId("panel");
		// The premise: the slid-out panel lands inside the frame, past the reach of the frame's clip.
		expect(panel.getBoundingClientRect().left).toBeLessThan(rectOf("root").right);
		expect(getComputedStyle(panel).visibility).toBe("hidden");
	});

	test("a floating panel stays visible through the close slide and hides when it ends", async () => {
		// Why: `visibility` snaps to `hidden` on the first frame unless it rides
		// the transition, and a panel that vanishes mid-slide reads as a cut. A
		// consumer `duration-*` slows the run, so the sample lands mid-flight.
		await page.viewport(900, 800);
		render(
			<Shell panel="open" panelClassName="duration-2000" workspaceClassName="max-w-[600px]" />,
		);
		const panel = screen.getByTestId("panel");
		await waitForHydration(panel);
		const openLeft = panel.getBoundingClientRect().left;
		expect(getComputedStyle(panel).visibility).toBe("visible");
		const transitions = recordTransitions(panel);

		// Why a position: the trigger stretches across the card in this bare flex
		// column, and the open floating panel covers its center.
		await userEvent.click(screen.getByRole("button", { name: "Toggle the assistant" }), {
			position: { x: 8, y: 8 },
		});

		expect(panel).toHaveAttribute("data-state", "closed");
		// Poll the position itself: the run starts on the next frame, not in the click.
		await waitFor(() => {
			expect(panel.getBoundingClientRect().left).toBeGreaterThan(openLeft);
		});
		expect(getComputedStyle(panel).visibility).toBe("visible");
		await waitFor(() => {
			expect(transitions).toContain("visibility");
		});
		// Why: a third property (a margin, or the lane's `flex-basis`, which an
		// absolutely positioned box ignores) moves the floating card's anchor
		// mid-flight or runs an inert transition on every toggle.
		expect(transitions.toSorted()).toEqual(["translate", "visibility"]);
		await waitFor(
			() => {
				expect(getComputedStyle(panel).visibility).toBe("hidden");
			},
			{ timeout: 3000 },
		);
	});

	test.each([
		// Why 760 for sm: the row is the viewport here, and a 700px row is under
		// the icon-rail lane (46.75rem), so the row rule would float the panel.
		["sm", 760],
		["md", 800],
		["lg", 1100],
	] as const)("stays in the row at the %s breakpoint", async (mobileBreakpoint, viewportWidth) => {
		await page.viewport(viewportWidth, 800);
		render(
			<Shell
				mobileBreakpoint={mobileBreakpoint}
				panel="open"
				vars={{ "--app-layout-side-panel-width": `${OPEN_WIDTH}px` }}
			/>,
		);
		const panel = screen.getByTestId("panel");
		expect(getComputedStyle(panel).position).toBe("relative");
		expect(panel.getBoundingClientRect().width).toBe(OPEN_WIDTH + GUTTER);
		expect(cardOf(panel).getBoundingClientRect().width).toBe(OPEN_WIDTH);
		expect(rectOf("content").width).toBe(viewportWidth - 3 * GUTTER - OPEN_WIDTH);
	});

	test("animates the basis, and nothing else, on a close the user triggers after hydration", async () => {
		await page.viewport(1280, 800);
		const panel = renderLane("open");
		await waitForHydration(panel);
		const transitions = recordTransitions(panel);

		await userEvent.click(screen.getByRole("button", { name: "Toggle the assistant" }));

		expect(panel).toHaveAttribute("data-state", "closed");
		await waitFor(() => {
			expect(transitions).toContain("flex-basis");
		});
		// Why: a second animated property (a margin, say) moves the card's anchor
		// mid-flight, and a property that snaps jolts it at either end.
		expect(transitions).toEqual(["flex-basis"]);
	});

	test("reverses mid-flight when the user toggles again", async () => {
		// Why: a CSS transition starts from the current computed value, so a
		// second click turns the panel around instead of waiting for the first
		// run to finish. The Web Animations API holds the close at one width and
		// scrubs the reversal back to its first frame, so no read depends on how
		// long a click round-trip takes.
		await page.viewport(1280, 800);
		const panel = renderLane("open", "duration-[2000ms]");
		await waitForHydration(panel);
		const trigger = screen.getByRole("button", { name: "Toggle the assistant" });

		await userEvent.click(trigger);
		expect(panel).toHaveAttribute("data-state", "closed");
		const close = transitionOf(panel);
		close.pause();
		// Why a quarter in: a reversal runs for the share of the duration the
		// close eased through, so a later hold leaves more of it to catch after
		// the second click returns.
		close.currentTime = 500;
		const midFlight = panel.getBoundingClientRect().width;
		expect(midFlight).toBeGreaterThan(0);
		expect(midFlight).toBeLessThan(OPEN_WIDTH + GUTTER);

		// The held run keeps the trigger still, so a pointer click lands mid-flight.
		await userEvent.click(trigger);
		expect(panel).toHaveAttribute("data-state", "open");
		// The reversal starts from where the close got to, not from zero: its
		// first frame is the held width, wherever the round-trip left it since.
		const reversal = transitionOf(panel);
		reversal.pause();
		reversal.currentTime = 0;
		expect(panel.getBoundingClientRect().width).toBe(midFlight);

		reversal.finish();
		expect(panel.getBoundingClientRect().width).toBe(OPEN_WIDTH + GUTTER);
	});

	test("snaps the close under reduced motion", async () => {
		await page.viewport(1280, 800);
		await commands.emulateMedia({ reducedMotion: "reduce" });
		expect(window.matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);
		const panel = renderLane("open");
		await waitForHydration(panel);
		const transitions = recordTransitions(panel);

		await userEvent.click(screen.getByRole("button", { name: "Toggle the assistant" }));

		expect(panel).toHaveAttribute("data-state", "closed");
		// Why read the width: a running transition would still be mid-flight here.
		expect(panel.getBoundingClientRect().width).toBe(0);
		expect(transitions).toEqual([]);
	});

	test("lets a consumer transition-none replace the default transition", async () => {
		// Why: the default and the consumer utility share one tailwind-merge group,
		// so only the last one in `cx` reaches the element and the cascade never decides.
		await page.viewport(1280, 800);
		const panel = renderLane("open", "transition-none");
		await waitForHydration(panel);
		const transitions = recordTransitions(panel);

		await userEvent.click(screen.getByRole("button", { name: "Toggle the assistant" }));

		expect(panel).toHaveAttribute("data-state", "closed");
		expect(panel.getBoundingClientRect().width).toBe(0);
		expect(transitions).toEqual([]);
	});

	test("snaps a post-hydration correction into place with no transition", async () => {
		await page.viewport(1280, 800);
		container = document.createElement("div");
		container.innerHTML = renderToString(<CorrectedShell />);
		document.body.appendChild(container);
		const panel = container.querySelector('[data-slot~="app-layout-side-panel"]');
		if (!(panel instanceof HTMLElement)) {
			throw new Error('No element carries data-slot="app-layout-side-panel".');
		}
		// Why read the width: a real page paints the server markup before
		// hydration, and only a painted width can be the start value of a
		// transition. In a 1200px row, 24cqw is under the 21rem floor, so the
		// default open width is 336px, and the box adds the end inset.
		expect(panel).toHaveAttribute("data-state", "open");
		expect(panel.getBoundingClientRect().width).toBe(336 + GUTTER);
		const transitions = recordTransitions(panel);

		render(<CorrectedShell />, { container, hydrate: true });
		await waitForHydration(panel);

		expect(panel).toHaveAttribute("data-state", "closed");
		expect(panel.getBoundingClientRect().width).toBe(0);
		expect(transitions).toEqual([]);
	});
});
