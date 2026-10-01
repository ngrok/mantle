"use client";

import { render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { DescriptionList } from "./description-list.js";

/**
 * Real-browser geometry for the value column. The contract is that a long
 * single-line value truncates inside its row instead of widening the list,
 * which only the track's `0` minimum delivers. happy-dom lays nothing out, so
 * `scrollWidth` and `clientWidth` there are zero whatever the track says.
 *
 * The stylesheet is Tailwind 4's own output for the utilities the parts and the
 * fixture emit, keyed by the same class selectors. The arbitrary-value selector
 * pins the spelling of the Root's grid-template class: change the track back to
 * a bare `1fr` and the `auto` minimum grows the column to the URL's width.
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
	.relative { position: relative; }
	.col-span-full { grid-column: 1 / -1; }
	.block { display: block; }
	.grid { display: grid; }
	.min-w-36 { min-width: calc(var(--spacing) * 36); }
	.grid-cols-\\[auto_minmax\\(0\\,1fr\\)\\] { grid-template-columns: auto minmax(0, 1fr); }
	.grid-cols-subgrid { grid-template-columns: subgrid; }
	.items-center { align-items: center; }
	.gap-x-4 { column-gap: calc(var(--spacing) * 4); }
	.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.overflow-x-auto { overflow-x: auto; }
	.p-1 { padding: calc(var(--spacing) * 1); }
	.p-2 { padding: calc(var(--spacing) * 2); }
	.px-3 { padding-inline: calc(var(--spacing) * 3); }
	.py-2 { padding-block: calc(var(--spacing) * 2); }
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

const LONG_URL =
	"https://example.ngrok.app/api/items?filter=%7B%22name%22%3A%22very-long-value%22%7D&limit=200&offset=0";

describe("DescriptionList value column", () => {
	test("a truncating value clips inside its row instead of widening the list", () => {
		render(
			<DescriptionList.Root data-testid="root" style={{ width: 400 }}>
				<DescriptionList.Item>
					<DescriptionList.Label>Request URL</DescriptionList.Label>
					<DescriptionList.Value>
						<span data-testid="text" className="block truncate">
							{LONG_URL}
						</span>
					</DescriptionList.Value>
				</DescriptionList.Item>
			</DescriptionList.Root>,
		);
		const root = screen.getByTestId("root");
		const text = screen.getByTestId("text");
		// The list has nothing to scroll: the column shrank to the room left beside the label.
		expect(root.scrollWidth).toBe(root.clientWidth);
		// The span clips its own text, which is what paints the ellipsis.
		expect(text.scrollWidth).toBeGreaterThan(text.clientWidth);
	});
});
