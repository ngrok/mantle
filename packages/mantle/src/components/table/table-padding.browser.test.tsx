"use client";

import { render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Table } from "./table.js";

/**
 * Mirrors the padding utilities Tailwind 4 emits, inlined so the test needs no Tailwind
 * build and no mantle theme. Keep the shorthand first, as Tailwind emits it, so a
 * consumer `px-*` beats a default `p-*`.
 */
const PADDING_STYLE = `
@layer utilities {
	.p-3 { padding: 12px; }
	.p-4 { padding: 16px; }
	.px-2 { padding-inline: 8px; }
	.px-3 { padding-inline: 12px; }
	.px-4 { padding-inline: 16px; }
}
`;

let paddingStyleElement: HTMLStyleElement;

beforeAll(() => {
	paddingStyleElement = document.createElement("style");
	paddingStyleElement.textContent = PADDING_STYLE;
	document.head.appendChild(paddingStyleElement);
});

afterAll(() => {
	paddingStyleElement.remove();
});

function renderHeaderAndCell(cellClassName?: string) {
	return render(
		<Table.Root>
			<Table.Element>
				<Table.Head>
					<Table.Row>
						<Table.Header>Invoice</Table.Header>
					</Table.Row>
				</Table.Head>
				<Table.Body>
					<Table.Row>
						<Table.Cell className={cellClassName}>INV001</Table.Cell>
					</Table.Row>
				</Table.Body>
			</Table.Element>
		</Table.Root>,
	);
}

describe("Table padding", () => {
	// Fails if `Table.Header` and `Table.Cell` take different horizontal padding.
	test("a column label lines up with its body cell", () => {
		renderHeaderAndCell();
		const header = getComputedStyle(screen.getByRole("columnheader"));
		const cell = getComputedStyle(screen.getByRole("cell"));

		expect(header.paddingLeft).toBe(cell.paddingLeft);
		expect(header.paddingRight).toBe(cell.paddingRight);
		expect(header.paddingLeft).toBe("12px");
	});

	// The tailwind-merge override contract, read as the merge outcome rather than as a
	// list of the component's defaults.
	test("a consumer className overrides the default horizontal padding", () => {
		renderHeaderAndCell("px-2");

		expect(getComputedStyle(screen.getByRole("cell")).paddingLeft).toBe("8px");
	});

	// Row density is the other half of the contract, so the horizontal pin alone is not
	// enough.
	test("the cell keeps its 12px vertical padding", () => {
		renderHeaderAndCell();
		const cell = getComputedStyle(screen.getByRole("cell"));

		expect(cell.paddingTop).toBe("12px");
		expect(cell.paddingBottom).toBe("12px");
	});
});
