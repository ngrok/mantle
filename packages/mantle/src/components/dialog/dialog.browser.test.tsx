"use client";

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Dialog } from "./dialog.js";

/**
 * Real-browser geometry for `Dialog.Header`: the title and the description
 * stack, and the close button keeps the title's row. happy-dom lays nothing
 * out, so every `getBoundingClientRect()` there returns zeros and a clipped
 * title reads the same as a whole one.
 *
 * The stylesheet is Tailwind 4.3.3's own output for the utilities the header,
 * the title, the description, and the close button emit, keyed by the same
 * escaped class selectors. Rename a slot or a utility in either part and the
 * rule stops matching, the stack collapses into one row, and these assertions
 * fail. Regenerate it by compiling those class lists through
 * `@tailwindcss/node`'s `compile()`.
 */
const STYLE = `
/* Unlayered rules beat every layer, so a bare preflight reset here would win
   over the utilities. */
@layer theme, base, components, utilities;
@layer theme {
	:root {
		--spacing: 0.25rem;
		--text-lg: 1.125rem;
		--text-lg--line-height: calc(1.75 / 1.125);
		--font-weight-medium: 500;
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
	.relative { position: relative; }
	.flex { display: flex; }
	.inline-flex { display: inline-flex; }
	.size-9 { width: calc(var(--spacing) * 9); height: calc(var(--spacing) * 9); }
	.w-full { width: 100%; }
	.shrink-0 { flex-shrink: 0; }
	.flex-col { flex-direction: column; }
	.flex-wrap { flex-wrap: wrap; }
	.items-center { align-items: center; }
	.justify-between { justify-content: space-between; }
	.justify-center { justify-content: center; }
	.gap-2 { gap: calc(var(--spacing) * 2); }
	.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.border { border-style: var(--tw-border-style); border-width: 1px; }
	.border-b { border-bottom-style: var(--tw-border-style); border-bottom-width: 1px; }
	.px-6 { padding-inline: calc(var(--spacing) * 6); }
	.py-4 { padding-block: calc(var(--spacing) * 4); }
	.text-lg { font-size: var(--text-lg); line-height: var(--tw-leading, var(--text-lg--line-height)); }
	.font-medium { font-weight: var(--font-weight-medium); }
	.has-\\[\\.icon-button\\]\\:pr-4:has(:is(.icon-button)) { padding-right: calc(var(--spacing) * 4); }
	.\\[\\&\\>\\[data-slot\\~\\=dialog-description\\]\\]\\:order-last > [data-slot~=dialog-description] { order: 9999; }
	.\\[\\&\\>\\[data-slot\\~\\=dialog-description\\]\\]\\:basis-full > [data-slot~=dialog-description] { flex-basis: 100%; }
	.\\[\\&\\>\\[data-slot\\~\\=dialog-title\\]\\]\\:flex-1 > [data-slot~=dialog-title] { flex: 1; }
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

/** The vertical center of an element, in viewport coordinates. */
function centerY(element: Element): number {
	const { height, top } = element.getBoundingClientRect();
	return top + height / 2;
}

/** The gap between the close button's left edge and the title's right edge. */
function gapBetween(title: Element, closeButton: Element): number {
	return closeButton.getBoundingClientRect().left - title.getBoundingClientRect().right;
}

/**
 * A dialog sized in code rather than by the runner's viewport, so the numbers
 * do not move with the browser window. 400px is narrower than the default
 * `max-w-lg` card, which keeps the long title past the row at any font.
 */
function renderHeader(children: ReactNode) {
	render(
		<Dialog.Root defaultOpen>
			<Dialog.Content style={{ width: 400 }}>
				<Dialog.Header>{children}</Dialog.Header>
			</Dialog.Content>
		</Dialog.Root>,
	);
	return {
		closeButton: screen.getByRole("button", { name: "Close Dialog" }),
		title: screen.getByRole("heading"),
	};
}

const longTitle =
	"Rotate the signing key for every endpoint on the staging cluster and revoke the current key?";

describe("Dialog.Header", () => {
	test("stacks the description under the title, in the title's column", () => {
		// Regression (issue #1548): the header was one unwrapped row, so the
		// description sat beside the title and the title shrank to a few characters.
		const { title } = renderHeader(
			<>
				<Dialog.Title>Request decommission?</Dialog.Title>
				<Dialog.Description>
					The runner drains before it leaves the pool. It keeps its assigned replicas until it
					acknowledges the request, then the scheduler removes it.
				</Dialog.Description>
				<Dialog.CloseIconButton />
			</>,
		);
		const description = screen.getByText(/drains before it leaves the pool/);

		expect(description.getBoundingClientRect().top).toBeGreaterThanOrEqual(
			title.getBoundingClientRect().bottom,
		);
		expect(description.getBoundingClientRect().left).toBeCloseTo(
			title.getBoundingClientRect().left,
			1,
		);
	});

	test("keeps the close button on the title's row and gives the title the rest of it", () => {
		const { closeButton, title } = renderHeader(
			<>
				<Dialog.Title>Request decommission?</Dialog.Title>
				<Dialog.Description>The runner drains before it leaves the pool.</Dialog.Description>
				<Dialog.CloseIconButton />
			</>,
		);

		expect(centerY(closeButton)).toBeCloseTo(centerY(title), 1);
		// `gap-2`: the title grows up to the close button instead of hugging its text.
		expect(gapBetween(title, closeButton)).toBeCloseTo(8, 1);
		expect(title.scrollWidth).toBeLessThanOrEqual(title.clientWidth);
	});

	test("truncates a long title beside the close button instead of wrapping the button", () => {
		// A zero flex basis is what keeps the button on the row: with `basis-auto`
		// the title's text width would push the button onto a second line.
		const { closeButton, title } = renderHeader(
			<>
				<Dialog.Title>{longTitle}</Dialog.Title>
				<Dialog.CloseIconButton />
			</>,
		);

		expect(title.scrollWidth).toBeGreaterThan(title.clientWidth);
		expect(centerY(closeButton)).toBeCloseTo(centerY(title), 1);
		expect(gapBetween(title, closeButton)).toBeCloseTo(8, 1);
	});
});
