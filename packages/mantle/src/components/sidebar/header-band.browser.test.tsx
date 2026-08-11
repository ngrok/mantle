"use client";

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { AppLayout } from "../app-layout/app-layout.js";
import { Sidebar } from "./sidebar.js";

/**
 * Real-browser geometry for `Sidebar.Header`'s alignment band: its first child
 * sits on a `--sidebar-header-height` track, and `AppLayout.Header` derives its
 * own height from that same token. happy-dom lays nothing out — every
 * `getBoundingClientRect()` there returns zeros, so the two centers would agree
 * no matter what the components emit.
 *
 * The stylesheet below is Tailwind 4.3.3's own output for the utilities these two
 * parts emit, keyed by the same escaped class selectors. Keyed that way rather
 * than by `data-slot` on purpose: rename the band utility or the derived-height
 * variant in either component and the rule stops matching, the band disappears,
 * and these assertions fail. Regenerate it by compiling those class lists
 * through `@tailwindcss/node`'s `compile()`.
 */
const STYLE = `
/* The layer order is load-bearing: unlayered rules beat every layer, so a bare
   preflight reset here would win over the utilities and zero out the card's
   margin and border — the two values the toolbar's derived height subtracts. */
@layer theme, base, components, utilities;
@layer theme {
	:root {
		--spacing: 0.25rem;
		--radius-xl: 0.75rem;
		--tw-border-style: solid;
	}
}
@layer base {
	*, ::after, ::before, ::backdrop, ::file-selector-button {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
		border: 0 solid;
	}
}
@layer utilities {
	.absolute { position: absolute; }
	.relative { position: relative; }
	.inset-y-0 { inset-block: 0px; }
	.left-0 { left: 0px; }
	.isolate { isolation: isolate; }
	.m-\\(--app-layout-card-gutter\\,0\\.5rem\\) { margin: var(--app-layout-card-gutter,0.5rem); }
	.flex { display: flex; }
	.grid { display: grid; }
	.h-14 { height: calc(var(--spacing) * 14); }
	.h-full { height: 100%; }
	.min-h-0 { min-height: 0px; }
	.w-\\(--sidebar-width\\,13rem\\) { width: var(--sidebar-width,13rem); }
	.w-full { width: 100%; }
	.min-w-0 { min-width: 0px; }
	.flex-1 { flex: 1; }
	.shrink-0 { flex-shrink: 0; }
	.grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
	.grid-rows-\\(--sidebar-header-height\\,4\\.5rem\\) { grid-template-rows: var(--sidebar-header-height,4.5rem); }
	.flex-col { flex-direction: column; }
	.items-center { align-items: center; }
	.overflow-clip { overflow: clip; }
	.overflow-hidden { overflow: hidden; }
	.overflow-x-hidden { overflow-x: hidden; }
	.overflow-y-auto { overflow-y: auto; }
	.border { border-style: var(--tw-border-style); border-width: 1px; }
	.border-b { border-bottom-style: var(--tw-border-style); border-bottom-width: 1px; }
	.px-3 { padding-inline: calc(var(--spacing) * 3); }
	.px-4 { padding-inline: calc(var(--spacing) * 4); }
	.pt-1\\.5 { padding-top: calc(var(--spacing) * 1.5); }
	.pb-4 { padding-bottom: calc(var(--spacing) * 4); }
	.group-has-data-\\[slot\\~\\=sidebar-header\\]\\/app-layout\\:h-\\[calc\\(var\\(--sidebar-header-height\\,4\\.5rem\\)-2\\*var\\(--app-layout-card-gutter\\,0\\.5rem\\)-2px\\)\\]:is(:where(.group\\/app-layout):has([data-slot~="sidebar-header"]) *) {
		height: calc(var(--sidebar-header-height,4.5rem) - 2 * var(--app-layout-card-gutter,0.5rem) - 2px);
	}
	.group-data-\\[state\\=expanded\\]\\/sidebar-nav\\:pr-1:is(:where(.group\\/sidebar-nav)[data-state="expanded"] *) {
		padding-right: var(--spacing);
	}
}
/* What a consumer writes as \`className="[--sidebar-header-height:6rem]"\`. Spelled
   as a rule because Tailwind compiles no arbitrary properties into this test. */
.taller-band { --sidebar-header-height: 6rem; }
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

/** The vertical center of an element, in viewport coordinates. */
function centerY(element: HTMLElement): number {
	const { height, top } = element.getBoundingClientRect();
	return top + height / 2;
}

/** The element's top edge, in viewport coordinates. */
function topY(element: HTMLElement): number {
	return element.getBoundingClientRect().top;
}

/**
 * A shell sized in code rather than by the runner's viewport, so the numbers do
 * not move with the browser window. `Sidebar.Header` needs no `Sidebar.Root`
 * context and `AppLayout.Header`'s `:has()` finds the header at any depth, so the
 * rail is a plain sized column: this measures the band against the toolbar, not
 * the panel's mobile/desktop switch.
 *
 * Every row carries an explicit pixel height, because the contract under test is
 * where the band puts a row — not how tall `Sidebar.SwitcherTrigger` renders.
 */
function Shell({ children, className }: { children: ReactNode; className?: string }) {
	return (
		<AppLayout.Root className={className} style={{ height: 640, width: 1024 }}>
			<AppLayout.Workspace>
				<div className="shrink-0" style={{ width: 256 }}>
					<Sidebar.Header data-testid="header">{children}</Sidebar.Header>
				</div>
				<AppLayout.Content>
					<AppLayout.Header data-testid="toolbar">toolbar</AppLayout.Header>
					<AppLayout.Body>page</AppLayout.Body>
				</AppLayout.Content>
			</AppLayout.Workspace>
		</AppLayout.Root>
	);
}

const switcherRow = <div data-testid="switcher" style={{ height: 36 }} />;
const searchRow = <div data-testid="search" style={{ height: 28 }} />;

describe("Sidebar.Header alignment band", () => {
	test("a single row centers on the band, and the band is the whole header", () => {
		render(<Shell>{switcherRow}</Shell>);
		const header = screen.getByTestId("header");
		// 4.5rem: with one row the header is exactly the band, which is the geometry
		// every shipped single-row shell already renders.
		expect(header.getBoundingClientRect().height).toBeCloseTo(72, 1);
		expect(centerY(screen.getByTestId("switcher")) - topY(header)).toBeCloseTo(36, 1);
	});

	test("a second row stacks below the band instead of squeezing the first", () => {
		// Regression (issue #1399): the header was a fixed `h-` band, so a search row
		// under the switcher either squashed both rows or forced
		// `--sidebar-header-height` up — which dragged the toolbar up with it.
		render(
			<Shell>
				{switcherRow}
				{searchRow}
			</Shell>,
		);
		const header = screen.getByTestId("header");
		expect(centerY(screen.getByTestId("switcher")) - topY(header)).toBeCloseTo(36, 1);
		// band 72 + row 28, with no gap: the band's lower half is the spacing
		expect(header.getBoundingClientRect().height).toBeCloseTo(100, 1);
		expect(topY(screen.getByTestId("search")) - topY(header)).toBeCloseTo(72, 1);
	});

	test("the first row and the toolbar share one center, with one row and with two", () => {
		const { unmount } = render(<Shell>{switcherRow}</Shell>);
		expect(screen.getByTestId("toolbar").getBoundingClientRect().height).toBeCloseTo(54, 1);
		expect(centerY(screen.getByTestId("switcher"))).toBeCloseTo(
			centerY(screen.getByTestId("toolbar")),
			1,
		);
		unmount();

		render(
			<Shell>
				{switcherRow}
				{searchRow}
			</Shell>,
		);
		// The second row grows the header downward, so the toolbar keeps matching the
		// switcher row rather than the whole header.
		expect(screen.getByTestId("toolbar").getBoundingClientRect().height).toBeCloseTo(54, 1);
		expect(centerY(screen.getByTestId("switcher"))).toBeCloseTo(
			centerY(screen.getByTestId("toolbar")),
			1,
		);
	});

	test("overriding the token on a shared ancestor moves the band and the toolbar together", () => {
		render(
			<Shell className="taller-band">
				{switcherRow}
				{searchRow}
			</Shell>,
		);
		// 6rem band: the toolbar is 96 - 2*8 - 2, and the switcher centers on the
		// taller band rather than on the header's own midpoint.
		expect(screen.getByTestId("toolbar").getBoundingClientRect().height).toBeCloseTo(78, 1);
		expect(
			centerY(screen.getByTestId("switcher")) - topY(screen.getByTestId("header")),
		).toBeCloseTo(48, 1);
		expect(centerY(screen.getByTestId("switcher"))).toBeCloseTo(
			centerY(screen.getByTestId("toolbar")),
			1,
		);
	});

	test("the band goes to the first direct child, so a wrapper around both rows takes it", () => {
		// The documented precondition, pinned: the alignment is positional. Wrap the
		// two rows and the wrapper is what centers on the band, which leaves the
		// switcher above the toolbar's center. This is what happens when a consumer
		// ignores "keep the aligned row as the header's first direct child".
		render(
			<Shell>
				<div>
					{switcherRow}
					{searchRow}
				</div>
			</Shell>,
		);
		const header = screen.getByTestId("header");
		expect(header.getBoundingClientRect().height).toBeCloseTo(72, 1);
		// the 64px wrapper centers in the 72px band, so the switcher lands at 4 + 18
		expect(centerY(screen.getByTestId("switcher")) - topY(header)).toBeCloseTo(22, 1);
		expect(centerY(screen.getByTestId("switcher"))).not.toBeCloseTo(
			centerY(screen.getByTestId("toolbar")),
			1,
		);
	});
});
