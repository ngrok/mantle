"use client";

import { render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import * as Table from "./table-parts.js";
import type { ColumnWidth } from "./table.js";

/**
 * Mirrors the utilities Tailwind 4 emits for the table and its cells, inlined
 * so the test needs no Tailwind build and no mantle theme.
 */
const COLUMN_STYLE = String.raw`
@layer utilities {
	.table-auto { table-layout: auto; }
	.w-full { width: 100%; }
	.p-3 { padding: 12px; }
	.px-1 { padding-inline: 4px; }
	.-mx-1 { margin-inline: -4px; }
	.grid { display: grid; }
	.min-w-24 { min-width: 96px; }
	.grid-cols-\[minmax\(0\,1fr\)\] { grid-template-columns: minmax(0, 1fr); }
	.overflow-x-clip { overflow-x: clip; }
	.text-ellipsis { text-overflow: ellipsis; }
	.whitespace-nowrap { white-space: nowrap; }
	.w-px { width: 1px; }
}
td, th { font: 16px/20px monospace; }
`;

let columnStyleElement: HTMLStyleElement;

beforeAll(() => {
	columnStyleElement = document.createElement("style");
	columnStyleElement.textContent = COLUMN_STYLE;
	document.head.appendChild(columnStyleElement);
});

afterAll(() => {
	columnStyleElement.remove();
});

type Column = { value: string; width?: ColumnWidth };

function renderRow(tableWidth: number, columns: Column[]) {
	render(
		<div style={{ width: tableWidth }}>
			<Table.Element>
				<Table.Body>
					<Table.Row>
						{columns.map((column) => (
							<Table.Cell key={column.value} width={column.width}>
								{column.value}
							</Table.Cell>
						))}
					</Table.Row>
				</Table.Body>
			</Table.Element>
		</div>,
	);
}

/** The width of the value's text, on one line, whether or not the cell clips it. */
function textWidth(value: string) {
	const cell = screen.getByRole("cell", { name: value });
	const textNode = [...cell.querySelectorAll("*"), cell]
		.flatMap((node) => [...node.childNodes])
		.find((node) => node.nodeType === Node.TEXT_NODE);
	if (textNode == null) {
		throw new Error(`the cell for ${value} has no text`);
	}
	const range = document.createRange();
	range.selectNodeContents(textNode);
	return range.getBoundingClientRect().width;
}

/** The width the cell gives its content, inside its 12px padding on each side. */
function contentBoxWidth(value: string) {
	return screen.getByRole("cell", { name: value }).getBoundingClientRect().width - 24;
}

const longValue = "a description that someone pasted in to explain exactly what this is for";

describe("Table column sizing", () => {
	test("short values share the spare width, including a fit column", () => {
		renderRow(1000, [
			{ value: "web-10" },
			{ value: "us-east-1" },
			{ value: "Oct 22", width: "fit" },
		]);

		for (const value of ["web-10", "us-east-1", "Oct 22"]) {
			// Each column gets more than its text: the spare width is shared.
			expect(contentBoxWidth(value)).toBeGreaterThan(textWidth(value) + 40);
		}
	});

	test("a long value takes the spare width, then truncates; the table does not overflow", () => {
		renderRow(600, [
			{ value: longValue },
			{ value: "web-10" },
			{ value: "Oct 22, 2026", width: "fit" },
		]);

		expect(screen.getByRole("table").getBoundingClientRect().width).toBeLessThanOrEqual(600);
		// The long column takes more than half the row, on one line, and its text
		// still does not fit.
		expect(screen.getByRole("cell", { name: longValue }).getBoundingClientRect().height).toBe(44);
		expect(contentBoxWidth(longValue)).toBeGreaterThan(300);
		expect(contentBoxWidth(longValue)).toBeLessThan(textWidth(longValue));
		// The short columns keep their whole value on one line.
		expect(contentBoxWidth("web-10")).toBeGreaterThanOrEqual(textWidth("web-10"));
		expect(contentBoxWidth("Oct 22, 2026")).toBeGreaterThanOrEqual(textWidth("Oct 22, 2026"));
		expect(screen.getByRole("cell", { name: "Oct 22, 2026" }).getBoundingClientRect().height).toBe(
			44,
		);
	});

	test("a narrow table truncates a default column no narrower than 6rem", () => {
		renderRow(320, [
			{ value: longValue },
			{ value: `${longValue} again` },
			{ value: "Oct 22, 2026", width: "fit" },
		]);

		expect(contentBoxWidth(longValue)).toBeGreaterThanOrEqual(96);
		expect(contentBoxWidth(`${longValue} again`)).toBeGreaterThanOrEqual(96);
		expect(contentBoxWidth("Oct 22, 2026")).toBeGreaterThanOrEqual(textWidth("Oct 22, 2026"));
	});

	test("a wrap column wraps its text and shows all of it", () => {
		renderRow(600, [{ value: longValue, width: "wrap" }, { value: "web-10" }]);

		const cell = screen.getByRole("cell", { name: longValue });
		expect(cell.getBoundingClientRect().height).toBeGreaterThan(44);
		expect(cell.scrollWidth).toBeLessThanOrEqual(cell.clientWidth);
	});
});
