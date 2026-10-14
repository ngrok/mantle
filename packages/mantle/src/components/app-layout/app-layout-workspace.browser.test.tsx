import { render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { commands, page, userEvent } from "vitest/browser";
import { AppLayout } from "./app-layout.js";

/**
 * Real-browser geometry for the workspace row: the width cap that centers the
 * rail, the card, and the side panel on a wide screen, and the side panel lane
 * itself. The panel's contract is the layout it produces (a fixed basis beside
 * the card, nothing when closed, a floating card below its breakpoint) and the
 * transition that carries one state to the other. happy-dom lays nothing out
 * and runs no transition, and `prefers-reduced-motion` is a Playwright page
 * emulation.
 *
 * The stylesheet is Tailwind 4.3.3's own output for the utilities in play,
 * keyed by the same escaped class selectors, with the theme variables resolved.
 * Regenerate it by compiling those class names through `tailwindcss`'s
 * `compile()`. Drop `mx-auto`, `w-full`, `ml-0`, `grow-0`, or a
 * `data-state-closed:` utility from a part and the matching assertion fails.
 */
const STYLE = `
@layer theme, base, components, utilities;
@layer theme {
	:root {
		--spacing: 0.25rem;
		--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
		--default-transition-duration: 150ms;
		--default-transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
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
	.relative { position: relative; }
	.isolate { isolation: isolate; }
	.m-\\(--app-layout-card-gutter\\,0\\.5rem\\) { margin: var(--app-layout-card-gutter,0.5rem); }
	.mx-auto { margin-inline: auto; }
	.my-\\(--app-layout-card-gutter\\,0\\.5rem\\) { margin-block: var(--app-layout-card-gutter,0.5rem); }
	.mr-\\(--app-layout-card-gutter\\,0\\.5rem\\) { margin-right: var(--app-layout-card-gutter,0.5rem); }
	.ml-0 { margin-left: 0px; }
	.flex { display: flex; }
	.h-full { height: 100%; }
	.w-full { width: 100%; }
	.max-w-\\(--app-layout-max-width\\,128rem\\) { max-width: var(--app-layout-max-width,128rem); }
	.min-w-0 { min-width: 0px; }
	.flex-1 { flex: 1; }
	.shrink-0 { flex-shrink: 0; }
	.grow-0 { flex-grow: 0; }
	.basis-\\(--app-layout-side-panel-width\\,clamp\\(21rem\\,24vw\\,27rem\\)\\) {
		flex-basis: var(--app-layout-side-panel-width,clamp(21rem, 24vw, 27rem));
	}
	.flex-col { flex-direction: column; }
	.overflow-clip { overflow: clip; }
	.border { border-style: var(--tw-border-style); border-width: 1px; }
	.transition-\\[flex-basis\\,opacity\\,margin\\] {
		transition-property: flex-basis,opacity,margin;
		transition-timing-function: var(--tw-ease, var(--default-transition-timing-function));
		transition-duration: var(--tw-duration, var(--default-transition-duration));
	}
	.transition-none { transition-property: none; }
	.duration-\\[260ms\\] { --tw-duration: 260ms; transition-duration: 260ms; }
	.ease-in-out { --tw-ease: var(--ease-in-out); transition-timing-function: var(--ease-in-out); }
	@media (prefers-reduced-motion: reduce) {
		.motion-reduce\\:transition-none { transition-property: none; }
	}
	@media (width < 64rem) {
		.max-lg\\:absolute { position: absolute; }
		.max-lg\\:inset-y-\\(--app-layout-card-gutter\\,0\\.5rem\\) { inset-block: var(--app-layout-card-gutter,0.5rem); }
		.max-lg\\:right-\\(--app-layout-card-gutter\\,0\\.5rem\\) { right: var(--app-layout-card-gutter,0.5rem); }
		.max-lg\\:z-20 { z-index: 20; }
		.max-lg\\:m-0 { margin: 0px; }
		.max-lg\\:w-\\[min\\(24rem\\,calc\\(100vw-5rem\\)\\)\\] { width: min(24rem, calc(100vw - 5rem)); }
	}
	@media (width < 48rem) {
		.max-md\\:absolute { position: absolute; }
		.max-md\\:inset-y-\\(--app-layout-card-gutter\\,0\\.5rem\\) { inset-block: var(--app-layout-card-gutter,0.5rem); }
		.max-md\\:right-\\(--app-layout-card-gutter\\,0\\.5rem\\) { right: var(--app-layout-card-gutter,0.5rem); }
		.max-md\\:z-20 { z-index: 20; }
		.max-md\\:m-0 { margin: 0px; }
		.max-md\\:w-\\[min\\(24rem\\,calc\\(100vw-5rem\\)\\)\\] { width: min(24rem, calc(100vw - 5rem)); }
	}
	@media (width < 40rem) {
		.max-sm\\:absolute { position: absolute; }
		.max-sm\\:inset-y-\\(--app-layout-card-gutter\\,0\\.5rem\\) { inset-block: var(--app-layout-card-gutter,0.5rem); }
		.max-sm\\:right-\\(--app-layout-card-gutter\\,0\\.5rem\\) { right: var(--app-layout-card-gutter,0.5rem); }
		.max-sm\\:z-20 { z-index: 20; }
		.max-sm\\:m-0 { margin: 0px; }
		.max-sm\\:w-\\[min\\(24rem\\,calc\\(100vw-5rem\\)\\)\\] { width: min(24rem, calc(100vw - 5rem)); }
	}
	.data-state-closed\\:pointer-events-none[data-state~=closed] { pointer-events: none; }
	.data-state-closed\\:m-0[data-state~=closed] { margin: 0px; }
	.data-state-closed\\:basis-0[data-state~=closed] { flex-basis: 0px; }
	.data-state-closed\\:border-0[data-state~=closed] { border-style: var(--tw-border-style); border-width: 0px; }
	.data-state-closed\\:opacity-0[data-state~=closed] { opacity: 0%; }
}
@property --tw-border-style {
	syntax: "*";
	inherits: false;
	initial-value: solid;
}
`;

/** The card gutter at its default, in pixels. */
const GUTTER = 8;

/** The floating panel's width at every viewport these tests use: 24rem beats `100vw - 5rem`. */
const FLOATING_PANEL_WIDTH = 384;

let styleElement: HTMLStyleElement;

beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = STYLE;
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

afterEach(async () => {
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
 * A frame, a workspace, a card, and (when asked) a side panel with a button
 * that toggles it. The variables land through the DOM API rather than a style
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
	const [open, setOpen] = useState(panel === "open");
	return (
		<AppLayout.Root
			data-testid="root"
			style={{ height: 400, width: rootWidth }}
			ref={(node) => {
				for (const [name, value] of Object.entries(vars)) {
					node?.style.setProperty(name, value);
				}
			}}
		>
			<AppLayout.Workspace className={workspaceClassName} data-testid="workspace">
				<AppLayout.Content data-testid="content">
					<button type="button" onClick={() => setOpen((current) => !current)}>
						Toggle the assistant
					</button>
				</AppLayout.Content>
				{panel != null && (
					<AppLayout.SidePanel
						className={panelClassName}
						data-testid="panel"
						mobileBreakpoint={mobileBreakpoint}
						open={open}
					>
						conversation
					</AppLayout.SidePanel>
				)}
			</AppLayout.Workspace>
		</AppLayout.Root>
	);
}

const rectOf = (testId: string) => screen.getByTestId(testId).getBoundingClientRect();

/**
 * Records every transition that starts on the panel as its property name. A
 * 260ms transition can end before a click round-trip returns, so the event is
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

describe("AppLayout.Workspace width cap", () => {
	test("caps the row at --app-layout-max-width and centers it in the frame", async () => {
		await page.viewport(1280, 800);
		render(<Shell rootWidth={1200} vars={{ "--app-layout-max-width": "600px" }} />);
		const root = rectOf("root");
		const workspace = rectOf("workspace");
		expect(workspace.width).toBe(600);
		expect(workspace.left - root.left).toBe(300);
	});

	test("fills the frame when the cap is wider than it", async () => {
		await page.viewport(1280, 800);
		render(<Shell rootWidth={1200} />);
		// Why: auto cross-axis margins turn a stretched flex item into a
		// shrink-to-fit one, so only a stated `w-full` keeps the row at the
		// frame's width under the default 128rem cap.
		expect(rectOf("workspace").width).toBe(1200);
	});

	test("pins the row to the start edge under a merged ml-0", async () => {
		// Why: tailwind-merge keeps `ml-0` beside `mx-auto`, and Tailwind emits
		// `margin-left` after `margin-inline`, so the consumer's utility decides
		// the start margin and the cap only trims the end.
		await page.viewport(1280, 800);
		render(
			<Shell
				rootWidth={1200}
				vars={{ "--app-layout-max-width": "600px" }}
				workspaceClassName="ml-0"
			/>,
		);
		const root = rectOf("root");
		const workspace = rectOf("workspace");
		expect(workspace.width).toBe(600);
		expect(workspace.left).toBe(root.left);
	});
});

describe("AppLayout.SidePanel lane", () => {
	test("an open panel takes its width beside the card, one gutter apart", async () => {
		await page.viewport(1280, 800);
		render(
			<Shell panel="open" rootWidth={1200} vars={{ "--app-layout-side-panel-width": "300px" }} />,
		);
		const root = rectOf("root");
		const content = rectOf("content");
		const panel = rectOf("panel");
		expect(panel.width).toBe(300);
		expect(panel.right).toBe(root.right - GUTTER);
		// Why: the panel has no start margin, so the card's own end margin is the
		// whole gap; a panel `ml-*` would double it.
		expect(panel.left - content.right).toBe(GUTTER);
		expect(content.width).toBe(1200 - 3 * GUTTER - 300);
	});

	test("a closed panel collapses to nothing and the card takes the row", async () => {
		await page.viewport(1280, 800);
		render(
			<Shell panel="closed" rootWidth={1200} vars={{ "--app-layout-side-panel-width": "300px" }} />,
		);
		const root = rectOf("root");
		const content = rectOf("content");
		const panel = rectOf("panel");
		// Why: the basis, the margins, and the hairline border all go to zero, or
		// the closed panel keeps a seam beside the card.
		expect(panel.width).toBe(0);
		expect(content.right).toBe(root.right - GUTTER);
		expect(content.width).toBe(1200 - 2 * GUTTER);
	});

	test.each([
		["sm", 600],
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
			const panelRect = panel.getBoundingClientRect();
			expect(panelRect.width).toBe(FLOATING_PANEL_WIDTH);
			expect(panelRect.right).toBe(workspace.right - GUTTER);
			// Out of flow: the card keeps the whole row underneath it.
			expect(content.width).toBe(viewportWidth - 2 * GUTTER);
		},
	);

	test.each([
		["sm", 700],
		["md", 800],
		["lg", 1100],
	] as const)("stays in the row at the %s breakpoint", async (mobileBreakpoint, viewportWidth) => {
		await page.viewport(viewportWidth, 800);
		render(
			<Shell
				mobileBreakpoint={mobileBreakpoint}
				panel="open"
				vars={{ "--app-layout-side-panel-width": "300px" }}
			/>,
		);
		const panel = screen.getByTestId("panel");
		expect(getComputedStyle(panel).position).toBe("relative");
		expect(panel.getBoundingClientRect().width).toBe(300);
		expect(rectOf("content").width).toBe(viewportWidth - 3 * GUTTER - 300);
	});

	test("animates the close the user triggers", async () => {
		await page.viewport(1280, 800);
		render(
			<Shell panel="open" rootWidth={1200} vars={{ "--app-layout-side-panel-width": "300px" }} />,
		);
		const panel = screen.getByTestId("panel");
		const transitions = recordTransitions(panel);

		await userEvent.click(screen.getByRole("button", { name: "Toggle the assistant" }));

		expect(panel).toHaveAttribute("data-state", "closed");
		await waitFor(() => {
			expect(transitions).toEqual(expect.arrayContaining(["flex-basis", "opacity"]));
		});
	});

	test("snaps the close under reduced motion", async () => {
		await page.viewport(1280, 800);
		await commands.emulateMedia({ reducedMotion: "reduce" });
		expect(window.matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);
		render(
			<Shell panel="open" rootWidth={1200} vars={{ "--app-layout-side-panel-width": "300px" }} />,
		);
		const panel = screen.getByTestId("panel");
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
		render(
			<Shell
				panel="open"
				panelClassName="transition-none"
				rootWidth={1200}
				vars={{ "--app-layout-side-panel-width": "300px" }}
			/>,
		);
		const panel = screen.getByTestId("panel");
		const transitions = recordTransitions(panel);

		await userEvent.click(screen.getByRole("button", { name: "Toggle the assistant" }));

		expect(panel).toHaveAttribute("data-state", "closed");
		expect(panel.getBoundingClientRect().width).toBe(0);
		expect(transitions).toEqual([]);
	});
});
