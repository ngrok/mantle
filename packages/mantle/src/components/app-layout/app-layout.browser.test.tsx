"use client";

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
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
