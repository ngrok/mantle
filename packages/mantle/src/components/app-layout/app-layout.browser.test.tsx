"use client";

import { render, screen } from "@testing-library/react";
import { StrictMode, type CSSProperties, type ReactNode } from "react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { Combobox } from "../combobox/index.js";
import { Sidebar } from "../sidebar/sidebar.js";
import { TooltipProvider } from "../tooltip/index.js";
import { AppLayout } from "./app-layout.js";

/**
 * Real-browser geometry for the header's three slots. The slots exist to carry
 * the flex a call site used to set by hand, so the contract is the layout they
 * produce: the start and actions slots hold the row's two ends at their own
 * width, and the content slot takes the rest and gives it back first. happy-dom
 * lays nothing out, so `getBoundingClientRect()` there returns zeros for every
 * slot no matter which utilities the parts emit.
 *
 * The stylesheet is Tailwind 4's own output for the utilities the header and its
 * slots emit, keyed by the same class selectors. Drop `min-w-0`, `flex-1`,
 * `shrink-0`, or `ml-auto` from a part and the matching assertion fails: the
 * over-constrained row is the one where `shrink-0` decides the width.
 */
const STYLE = `
@layer theme, base, components, utilities;
@layer theme {
	:root {
		--spacing: 0.25rem;
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
	.ml-auto { margin-left: auto; }
	.flex { display: flex; }
	.h-14 { height: calc(var(--spacing) * 14); }
	.min-w-0 { min-width: 0px; }
	.flex-1 { flex: 1; }
	.shrink-0 { flex-shrink: 0; }
	.items-center { align-items: center; }
	.gap-2 { gap: calc(var(--spacing) * 2); }
	.border-b { border-bottom-width: 1px; }
	.px-4 { padding-inline: calc(var(--spacing) * 4); }
	.relative { position: relative; }
	.\\@container\\/app-layout-workspace {
		container-type: inline-size;
		container-name: app-layout-workspace;
	}
	@container app-layout-workspace (width < 46.75rem) {
		.\\@max-side-panel-lane-icon-rail\\/app-layout-workspace\\:absolute { position: absolute; }
		.\\@max-side-panel-lane-icon-rail\\/app-layout-workspace\\:right-\\(--app-layout-card-gutter\\,0\\.5rem\\) {
			right: var(--app-layout-card-gutter, 0.5rem);
		}
	}
	@container app-layout-workspace (width < 56.5rem) {
		[data-slot~=app-layout-workspace]:has(> [data-slot~=sidebar-nav]:not([data-state~=collapsed])) .\\[\\[data-slot\\~\\=app-layout-workspace\\]\\:has\\(\\>\\[data-slot\\~\\=sidebar-nav\\]\\:not\\(\\[data-state\\~\\=collapsed\\]\\)\\)_\\&\\]\\:\\@max-side-panel-lane\\/app-layout-workspace\\:absolute {
			position: absolute;
		}
		[data-slot~=app-layout-workspace]:has(> [data-slot~=sidebar-nav]:not([data-state~=collapsed])) .\\[\\[data-slot\\~\\=app-layout-workspace\\]\\:has\\(\\>\\[data-slot\\~\\=sidebar-nav\\]\\:not\\(\\[data-state\\~\\=collapsed\\]\\)\\)_\\&\\]\\:\\@max-side-panel-lane\\/app-layout-workspace\\:right-\\(--app-layout-card-gutter\\,0\\.5rem\\) {
			right: var(--app-layout-card-gutter, 0.5rem);
		}
	}
	@media (width >= 40rem) {
		@container app-layout-workspace (width < 46.75rem) {
			.sm\\:\\@max-side-panel-lane-icon-rail\\/app-layout-workspace\\:w-\\[min\\(24rem\\,calc\\(100cqw-5rem\\)\\)\\] {
				width: min(24rem, calc(100cqw - 5rem));
			}
		}
		@container app-layout-workspace (width < 56.5rem) {
			[data-slot~=app-layout-workspace]:has(> [data-slot~=sidebar-nav]:not([data-state~=collapsed])) .sm\\:\\[\\[data-slot\\~\\=app-layout-workspace\\]\\:has\\(\\>\\[data-slot\\~\\=sidebar-nav\\]\\:not\\(\\[data-state\\~\\=collapsed\\]\\)\\)_\\&\\]\\:\\@max-side-panel-lane\\/app-layout-workspace\\:w-\\[min\\(24rem\\,calc\\(100cqw-5rem\\)\\)\\] {
				width: min(24rem, calc(100cqw - 5rem));
			}
		}
	}
	@media (width < 40rem) {
		.max-sm\\:left-\\(--app-layout-card-gutter\\,0\\.5rem\\) { left: var(--app-layout-card-gutter, 0.5rem); }
		.max-sm\\:w-auto { width: auto; }
	}
	.transition-\\[flex-basis\\,translate\\,visibility\\] { transition-property: flex-basis, translate, visibility; }
	.duration-200 { transition-duration: 200ms; }
	.transition-none { transition-property: none; }
	@media (width < 64rem) {
		.max-lg\\:data-state-closed\\:translate-x-\\[calc\\(100\\%\\+var\\(--app-layout-card-gutter\\,0\\.5rem\\)\\)\\][data-state~=closed] {
			translate: calc(100% + var(--app-layout-card-gutter, 0.5rem)) 0;
		}
	}
}
`;

let styleElement: HTMLStyleElement;

beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = STYLE;
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

/** A fixed-width header, so every slot measurement has one known row to resolve against. */
function renderHeader(children: ReactNode) {
	render(
		<AppLayout.Header data-testid="header" style={{ width: 600 }}>
			{children}
		</AppLayout.Header>,
	);
	return screen.getByTestId("header").getBoundingClientRect();
}

/** A child with a fixed width, so a slot's own width is the child's. */
function Box({ width }: { width: number }) {
	return <div style={{ width, height: 20 }} />;
}

/**
 * A child whose max-content width is `width` and whose min-content width is one
 * 100px segment, so the slot around it can shrink and only `shrink-0` on the
 * slot keeps the full width. A fixed `width` would not do: a definite width is
 * also the box's min-content contribution, so the slot could never shrink.
 */
function ShrinkableBox({ width }: { width: number }) {
	return (
		<div style={{ fontSize: 0 }}>
			{Array.from({ length: width / 100 }, (_, index) => (
				<span key={index} style={{ display: "inline-block", width: 100, height: 20 }} />
			))}
		</div>
	);
}

const rectOf = (testId: string) => screen.getByTestId(testId).getBoundingClientRect();

describe("AppLayout.Header slots", () => {
	test("the start and actions slots hold their content width and the content slot fills the rest", () => {
		const header = renderHeader(
			<>
				<AppLayout.HeaderStart data-testid="start">
					<Box width={40} />
				</AppLayout.HeaderStart>
				<AppLayout.HeaderContent data-testid="content">
					<Box width={10} />
				</AppLayout.HeaderContent>
				<AppLayout.HeaderActions data-testid="actions">
					<Box width={100} />
				</AppLayout.HeaderActions>
			</>,
		);
		// px-4 is 16px each side, gap-2 is 8px between each pair of slots.
		const innerWidth = header.width - 32;
		expect(rectOf("start").width).toBe(40);
		expect(rectOf("actions").width).toBe(100);
		expect(rectOf("content").width).toBe(innerWidth - 40 - 100 - 16);
		expect(rectOf("actions").right).toBe(header.right - 16);
	});

	test("the actions slot stays at the row's end when the header renders no content slot", () => {
		const header = renderHeader(
			<>
				<AppLayout.HeaderStart data-testid="start">
					<Box width={40} />
				</AppLayout.HeaderStart>
				<AppLayout.HeaderActions data-testid="actions">
					<Box width={100} />
				</AppLayout.HeaderActions>
			</>,
		);
		expect(rectOf("actions").right).toBe(header.right - 16);
	});

	test("a content child wider than the row shrinks the content slot instead of pushing the actions out", () => {
		const header = renderHeader(
			<>
				<AppLayout.HeaderStart data-testid="start">
					<Box width={40} />
				</AppLayout.HeaderStart>
				<AppLayout.HeaderContent data-testid="content">
					<Box width={2000} />
				</AppLayout.HeaderContent>
				<AppLayout.HeaderActions data-testid="actions">
					<Box width={100} />
				</AppLayout.HeaderActions>
			</>,
		);
		// Why: a flex item's `min-width: auto` is its content width, so without
		// `min-w-0` the slot would be 2000px wide and the actions would sit past
		// the header's right edge.
		expect(rectOf("content").width).toBe(header.width - 32 - 40 - 100 - 16);
		expect(rectOf("actions").right).toBe(header.right - 16);
		expect(rectOf("actions").width).toBe(100);
	});

	test("the start and actions slots keep their width when the row is over-constrained", () => {
		renderHeader(
			<>
				<AppLayout.HeaderStart data-testid="start">
					<ShrinkableBox width={300} />
				</AppLayout.HeaderStart>
				<AppLayout.HeaderContent data-testid="content">
					<Box width={10} />
				</AppLayout.HeaderContent>
				<AppLayout.HeaderActions data-testid="actions">
					<ShrinkableBox width={400} />
				</AppLayout.HeaderActions>
			</>,
		);
		// Why: 300 + 400 is wider than the 568px row, so a slot that can shrink
		// would. `shrink-0` keeps both ends at their content width and lets the
		// row overflow instead of squeezing a control.
		expect(rectOf("start").width).toBe(300);
		expect(rectOf("actions").width).toBe(400);
	});
});

/**
 * The lane float reads the row's width through the container on
 * `AppLayout.Workspace`, not the viewport, so the row is sized inline and the
 * viewport never changes. Only the computed position can observe a container
 * query; happy-dom resolves none.
 */
describe("AppLayout.SidePanel lane float", () => {
	function renderRow(width: string) {
		render(
			<AppLayout.SidePanelRoot defaultOpen>
				<AppLayout.Workspace style={{ width }}>
					<AppLayout.Content />
					<AppLayout.SidePanel aria-label="Assistant" />
				</AppLayout.Workspace>
			</AppLayout.SidePanelRoot>,
		);
		return getComputedStyle(screen.getByRole("complementary", { name: "Assistant" })).position;
	}

	test("floats the panel when a row with no rail is narrower than the icon-rail lane", () => {
		expect(renderRow("45rem")).toBe("absolute");
	});

	test("keeps the panel in a row with no rail that holds the icon-rail lane", () => {
		expect(renderRow("48rem")).toBe("relative");
	});

	/**
	 * The row with a real `Sidebar.Nav` beside the card, so the `:has()` on the
	 * rail's `data-slot` and `data-state` matches what the rail emits. The
	 * viewport is desktop width, so the rail renders in the row and not as a
	 * sheet.
	 */
	async function renderRowWithRail(width: string, { railOpen }: { railOpen: boolean }) {
		await page.viewport(1280, 800);
		render(
			<Sidebar.Root defaultOpen={railOpen}>
				<AppLayout.SidePanelRoot defaultOpen>
					<AppLayout.Workspace style={{ width }}>
						<Sidebar.Nav aria-label="Main" />
						<AppLayout.Content />
						<AppLayout.SidePanel aria-label="Assistant" />
					</AppLayout.Workspace>
				</AppLayout.SidePanelRoot>
			</Sidebar.Root>,
		);
		return getComputedStyle(screen.getByRole("complementary", { name: "Assistant" })).position;
	}

	test("floats the panel beside an expanded rail when the row is narrower than the lane", async () => {
		expect(await renderRowWithRail("48rem", { railOpen: true })).toBe("absolute");
	});

	test("keeps the panel in the same row beside a collapsed rail", async () => {
		expect(await renderRowWithRail("48rem", { railOpen: false })).toBe("relative");
	});

	test("keeps the panel beside an expanded rail once the row holds the lane", async () => {
		expect(await renderRowWithRail("60rem", { railOpen: true })).toBe("relative");
	});

	/** The floating panel's width, with the `md` breakpoint's cover tier below `sm`. */
	function renderFloatingWidth(rowWidth: string) {
		render(
			<AppLayout.SidePanelRoot defaultOpen>
				<AppLayout.Workspace style={{ width: rowWidth }}>
					<AppLayout.Content />
					<AppLayout.SidePanel aria-label="Assistant" mobileBreakpoint="md" />
				</AppLayout.Workspace>
			</AppLayout.SidePanelRoot>,
		);
		return screen.getByRole("complementary", { name: "Assistant" }).getBoundingClientRect().width;
	}

	test("takes the strip width above the cover tier", async () => {
		await page.viewport(800, 600);
		// Why: 45rem is under the icon-rail lane, and 24rem is under 800px minus 5rem.
		expect(renderFloatingWidth("45rem")).toBe(384);
	});

	test("sizes the strip from the row, not the viewport, when the row is narrower than the strip", async () => {
		await page.viewport(1440, 800);
		// Why: a 24rem strip in a 20rem row would hang 72px past the row's start
		// edge, so the strip leaves 5rem of the row instead of 5rem of the viewport.
		expect(renderFloatingWidth("20rem")).toBe(320 - 80);
	});

	test("covers the row from gutter to gutter on a phone", async () => {
		await page.viewport(375, 700);
		// Why: the cover pins both edges inside the 8px gutter, and a strip
		// width from the row rule would pull the panel off the end edge.
		expect(renderFloatingWidth("20rem")).toBe(320 - 16);
	});
});

/**
 * The viewport crosses the default `"lg"` breakpoint, so the closed panel
 * changes from the lane to the float and its `translate` changes. The row
 * keeps one width, so only the media query changes. A running CSS transition
 * shows in `getAnimations()`. `StrictMode` replays each mount effect, the way
 * an app's root does in development.
 */
describe("AppLayout.SidePanel motion across mobileBreakpoint", () => {
	function renderShell({ defaultOpen, style }: { defaultOpen: boolean; style?: CSSProperties }) {
		render(
			<StrictMode>
				<TooltipProvider>
					<AppLayout.SidePanelRoot defaultOpen={defaultOpen}>
						<AppLayout.Workspace style={{ width: "60rem" }}>
							<AppLayout.Content>
								<AppLayout.SidePanelTrigger label="Toggle the assistant" />
							</AppLayout.Content>
							<AppLayout.SidePanel aria-label="Assistant" style={style} />
						</AppLayout.Workspace>
					</AppLayout.SidePanelRoot>
				</TooltipProvider>
			</StrictMode>,
		);
		return screen.getByRole("complementary", { hidden: true });
	}

	test("a closed panel snaps when the viewport crosses the breakpoint", async () => {
		await page.viewport(1280, 800);
		const panel = renderShell({ defaultOpen: false });
		await page.viewport(800, 600);
		await expect.poll(() => getComputedStyle(panel).translate).not.toBe("none");
		expect(panel.getAnimations()).toHaveLength(0);
	});

	test("a close still slides, and the closed panel snaps after the slide ends", async () => {
		await page.viewport(800, 600);
		const panel = renderShell({ defaultOpen: true });
		// Why a listener: under load, the click can return after the 200ms slide ends.
		const slid: string[] = [];
		panel.addEventListener("transitionrun", (event) => slid.push(event.propertyName));
		await userEvent.click(screen.getByRole("button", { name: "Toggle the assistant" }));
		expect(panel).toHaveAttribute("data-state", "closed");
		await expect.poll(() => slid).toContain("translate");
		await expect.poll(() => getComputedStyle(panel).transitionProperty).toBe("none");
		await page.viewport(1280, 800);
		await expect.poll(() => getComputedStyle(panel).translate).toBe("none");
		expect(panel.getAnimations()).toHaveLength(0);
	});

	test("the gate shuts when the longest transition ends, with each delay paired to its duration", async () => {
		await page.viewport(800, 600);
		// Why these lists: the longest entry ends at 1000ms. The longest duration
		// plus the longest delay is 1500ms, from two different entries.
		const panel = renderShell({
			defaultOpen: true,
			style: { transitionDuration: "200ms, 1000ms, 200ms", transitionDelay: "500ms, 0ms, 0ms" },
		});
		await userEvent.click(screen.getByRole("button", { name: "Toggle the assistant" }));
		await expect
			.poll(() => getComputedStyle(panel).transitionProperty, { timeout: 1300 })
			.toBe("none");
	});
});

/**
 * A combobox closes its listbox from a document listener on the same Escape,
 * and the listbox is gone before the event reaches the panel. Only a real
 * engine orders the listeners and flushes the update that way, so the
 * happy-dom case cannot see it.
 */
describe("AppLayout.SidePanel Escape with a nested popup", () => {
	test("Escape inside an open combobox closes the listbox and keeps the floating panel open", async () => {
		await page.viewport(800, 600);
		render(
			<AppLayout.SidePanelRoot defaultOpen>
				<AppLayout.Workspace style={{ width: "45rem" }}>
					<AppLayout.Content />
					<AppLayout.SidePanel aria-label="Assistant" mobileBreakpoint="md">
						<Combobox.Root>
							<Combobox.Input aria-label="Fruit" />
							<Combobox.Content>
								<Combobox.Item value="Apple" />
								<Combobox.Item value="Banana" />
							</Combobox.Content>
						</Combobox.Root>
					</AppLayout.SidePanel>
				</AppLayout.Workspace>
			</AppLayout.SidePanelRoot>,
		);
		const panel = screen.getByRole("complementary", { name: "Assistant" });
		expect(getComputedStyle(panel).position).toBe("absolute");
		await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
		await screen.findByRole("option", { name: "Apple" });
		await userEvent.keyboard("{Escape}");
		await expect.poll(() => screen.queryByRole("option", { name: "Apple" })).toBeNull();
		expect(panel).toHaveAttribute("data-state", "open");
		await userEvent.keyboard("{Escape}");
		await expect.poll(() => panel.getAttribute("data-state")).toBe("closed");
	});
});

/**
 * The swipe reads the panel's computed position at pointer down and its
 * laid-out width at release, so the float and the width come from the real
 * container query above. The `md` breakpoint keeps the strip
 * width rule above the cover tier at an 800px viewport. The pointer is synthetic: a `PointerEvent` with
 * coordinates, dispatched on the header and then on the document, the way a
 * real pointer's events bubble.
 */
describe("AppLayout.SidePanelHeader swipe", () => {
	function renderShell(rowWidth: string) {
		render(
			<AppLayout.SidePanelRoot defaultOpen>
				<AppLayout.Workspace style={{ width: rowWidth }}>
					<AppLayout.Content />
					<AppLayout.SidePanel aria-label="Assistant" mobileBreakpoint="md">
						<AppLayout.SidePanelHeader data-testid="header">Assistant</AppLayout.SidePanelHeader>
					</AppLayout.SidePanel>
				</AppLayout.Workspace>
			</AppLayout.SidePanelRoot>,
		);
		return {
			header: screen.getByTestId("header"),
			panel: screen.getByRole("complementary", { name: "Assistant" }),
		};
	}

	const pointer = { pointerId: 1, isPrimary: true, button: 0, bubbles: true } as const;

	function press(header: HTMLElement, clientX: number) {
		header.dispatchEvent(new PointerEvent("pointerdown", { ...pointer, clientX }));
	}

	function move(clientX: number) {
		document.dispatchEvent(new PointerEvent("pointermove", { ...pointer, clientX }));
	}

	function release(clientX: number) {
		document.dispatchEvent(new PointerEvent("pointerup", { ...pointer, clientX }));
	}

	test("a drag past 25% of the floating panel's width slides it and closes it", async () => {
		await page.viewport(800, 600);
		const { header, panel } = renderShell("45rem");
		// Why 384: the strip width, so the threshold is 96px.
		expect(panel.getBoundingClientRect().width).toBe(384);
		press(header, 100);
		move(150);
		expect(panel.style.translate).toBe("50px");
		move(200);
		release(200);
		await expect.poll(() => panel.getAttribute("data-state")).toBe("closed");
		expect(panel.style.translate).toBe("");
	});

	test("a drag under the threshold springs the floating panel back", async () => {
		await page.viewport(800, 600);
		const { header, panel } = renderShell("45rem");
		press(header, 100);
		move(150);
		release(150);
		expect(panel).toHaveAttribute("data-state", "open");
		expect(panel.style.translate).toBe("");
	});

	test("the same drag on a panel in the lane shrinks its basis and closes it", async () => {
		await page.viewport(800, 600);
		const { header, panel } = renderShell("60rem");
		const width = panel.getBoundingClientRect().width;
		press(header, 100);
		move(150);
		// Why toBeCloseTo: the engine serializes the inline length at a few decimals.
		expect(Number.parseFloat(panel.style.flexBasis)).toBeCloseTo(width - 50, 2);
		expect(panel.style.translate).toBe("");
		move(100 + Math.ceil(width * 0.25));
		release(100 + Math.ceil(width * 0.25));
		await expect.poll(() => panel.getAttribute("data-state")).toBe("closed");
		expect(panel.style.flexBasis).toBe("");
	});
});
