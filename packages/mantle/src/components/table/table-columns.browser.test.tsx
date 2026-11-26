"use client";

import { render, screen } from "@testing-library/react";
import { commands } from "vitest/browser";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import * as Table from "./table-parts.js";
import type { ColumnWidth } from "./table.js";

let styleElement: HTMLStyleElement;

beforeAll(async () => {
	styleElement = document.createElement("style");
	// Why the compiled CSS: the column layout lives in the parts' class names.
	// The font rule makes text widths the same in each engine.
	styleElement.textContent = `${await commands.tailwindCss("./table.tsx", { theme: true })}\ntd, th { font: 16px/20px monospace; }`;
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

type Column = { label: string; value: string; width?: ColumnWidth; action?: boolean };

function renderTable(tableWidth: number, columns: Column[], { head = true } = {}) {
	render(
		<div style={{ width: tableWidth }}>
			<Table.Element>
				{head && (
					<Table.Head>
						<Table.Row>
							{columns.map((column) => (
								<Table.Header
									key={column.label}
									data-slot={column.action ? "data-table-action-header" : undefined}
									width={column.action ? "fit" : column.width}
								>
									{column.label}
								</Table.Header>
							))}
						</Table.Row>
					</Table.Head>
				)}
				<Table.Body>
					<Table.Row>
						{columns.map((column) => (
							<Table.Cell key={column.label} width={column.action ? "fit" : column.width}>
								{column.value}
							</Table.Cell>
						))}
					</Table.Row>
				</Table.Body>
			</Table.Element>
		</div>,
	);
}

/** The box of the value's text: one line wide, whether or not the cell clips it. */
function textRect(value: string) {
	const cell = screen.getByRole("cell", { name: value });
	const textNode = [...cell.querySelectorAll("*"), cell]
		.flatMap((node) => [...node.childNodes])
		.find((node) => node.nodeType === Node.TEXT_NODE);
	if (textNode == null) {
		throw new Error(`the cell for ${value} has no text`);
	}
	const range = document.createRange();
	range.selectNodeContents(textNode);
	return range.getBoundingClientRect();
}

function textWidth(value: string) {
	return textRect(value).width;
}

/** The height of one line of the value: the font rule sets a 20px line. */
function isOneLine(value: string) {
	return textRect(value).height <= 20;
}

/** The width the cell gives its content, inside its 12px padding on each side. */
function contentBoxWidth(value: string) {
	return screen.getByRole("cell", { name: value }).getBoundingClientRect().width - 24;
}

const longValue = "a description that someone pasted in to explain exactly what this is for";

describe("Table column sizing", () => {
	test("columns of different lengths get equal shares of the spare width", () => {
		// Why the lengths differ: the browser's table layout gives the longest
		// value the largest share, so only an equal split passes.
		renderTable(1000, [
			// Why one-letter labels: a column is as wide as its widest content, and
			// the values must be it.
			// Why values past 6rem: a default column is at least 6rem wide, so a
			// shorter value would count as 6rem.
			{ label: "N", value: "web-production" },
			{ label: "R", value: "us-east-1-staging-cluster" },
			{ label: "C", value: "Oct 22", width: "fit" },
		]);

		const spare = ["web-production", "us-east-1-staging-cluster", "Oct 22"].map(
			(value) => contentBoxWidth(value) - textWidth(value),
		);
		for (const share of spare) {
			expect(share).toBeGreaterThan(100);
			expect(Math.abs(share - (spare[0] ?? 0))).toBeLessThan(2);
		}
	});

	test("a long value takes the spare width, then truncates, and every cell stays on one line", () => {
		renderTable(600, [
			{ label: "Description", value: longValue },
			{ label: "Name", value: "web-10" },
			{ label: "Created", value: "Oct 22, 2026", width: "fit" },
		]);

		expect(screen.getByRole("table").getBoundingClientRect().width).toBeLessThanOrEqual(600);
		expect(contentBoxWidth(longValue)).toBeGreaterThan(300);
		expect(contentBoxWidth(longValue)).toBeLessThan(textWidth(longValue));
		expect(contentBoxWidth("web-10")).toBeGreaterThanOrEqual(textWidth("web-10"));
		expect(contentBoxWidth("Oct 22, 2026")).toBeGreaterThanOrEqual(textWidth("Oct 22, 2026"));
		expect(isOneLine(longValue)).toBe(true);
	});

	test("a table too narrow for its columns grows past its container, so it scrolls", () => {
		renderTable(320, [
			{ label: "Description", value: longValue },
			{ label: "Notes", value: `${longValue} again` },
			{ label: "Created", value: "Oct 22, 2026", width: "fit" },
		]);

		expect(contentBoxWidth(longValue)).toBeGreaterThanOrEqual(96);
		expect(contentBoxWidth(`${longValue} again`)).toBeGreaterThanOrEqual(96);
		expect(contentBoxWidth("Oct 22, 2026")).toBeGreaterThanOrEqual(textWidth("Oct 22, 2026"));
		expect(screen.getByRole("table").getBoundingClientRect().width).toBeGreaterThan(320);
	});

	test("a last action column stays as narrow as its content", () => {
		renderTable(1000, [
			{ label: "Name", value: "web" },
			{ label: "Region", value: "us-east-1" },
			{ label: "Actions", value: "…", action: true },
		]);

		const header = screen.getByRole("columnheader", { name: "Actions" });
		const range = document.createRange();
		range.selectNodeContents(header);
		// The column is as wide as its widest content, the header label: no share of the spare width.
		expect(contentBoxWidth("…") - range.getBoundingClientRect().width).toBeLessThan(2);
		expect(contentBoxWidth("web") - textWidth("web")).toBeGreaterThan(200);
	});

	test("a cell with its own width still fills its column", () => {
		render(
			<div style={{ width: 600 }}>
				<Table.Element>
					<Table.Head>
						<Table.Row>
							<Table.Header>Name</Table.Header>
							<Table.Header>Region</Table.Header>
						</Table.Row>
					</Table.Head>
					<Table.Body>
						<Table.Row>
							{/* Why inline styles: they stand in for a consumer's `w-0` and `max-w-0` classes. */}
							<Table.Cell style={{ width: 0, maxWidth: 0 }}>web-production</Table.Cell>
							<Table.Cell>us-east-1</Table.Cell>
						</Table.Row>
					</Table.Body>
				</Table.Element>
			</div>,
		);

		const header = screen.getByRole("columnheader", { name: "Name" }).getBoundingClientRect();
		const cell = screen.getByRole("cell", { name: "web-production" }).getBoundingClientRect();
		expect(cell.width).toBe(header.width);
		expect(contentBoxWidth("web-production")).toBeGreaterThanOrEqual(textWidth("web-production"));
	});

	test("a wrap column wraps its text and shows all of it", () => {
		renderTable(600, [
			{ label: "Notes", value: longValue, width: "wrap" },
			{ label: "Name", value: "web-10" },
		]);

		const cell = screen.getByRole("cell", { name: longValue });
		expect(isOneLine(longValue)).toBe(false);
		expect(cell.scrollWidth).toBeLessThanOrEqual(cell.clientWidth);
	});

	test("a spanning cell in the last header row keeps the table layout, so the columns line up", () => {
		render(
			<Table.Element>
				<Table.Head>
					<Table.Row>
						<Table.Header colSpan={2}>Endpoint</Table.Header>
						<Table.Header>Created</Table.Header>
					</Table.Row>
				</Table.Head>
				<Table.Body>
					<Table.Row>
						<Table.Cell>web</Table.Cell>
						<Table.Cell>us-east-1</Table.Cell>
						<Table.Cell>Oct 22</Table.Cell>
					</Table.Row>
				</Table.Body>
			</Table.Element>,
		);

		expect(getComputedStyle(screen.getByRole("table")).display).toBe("table");
		expect(screen.getByRole("columnheader", { name: "Endpoint" })).toHaveAttribute(
			"aria-colspan",
			"2",
		);
	});

	test.each([
		{ layout: "grid", span: false },
		{ layout: "table", span: true },
	])(
		"a two-row head draws one line under each header row in the $layout layout",
		({ layout, span }) => {
			// Why a span: when the last header row holds one cell, the table keeps
			// the native layout, and `Name` spans down to the last row.
			render(
				<Table.Element>
					<Table.Head>
						<Table.Row>
							<Table.Header rowSpan={span ? 2 : undefined}>Name</Table.Header>
							<Table.Header>Usage</Table.Header>
						</Table.Row>
						<Table.Row>
							{!span && <Table.Header>Region</Table.Header>}
							<Table.Header>Requests</Table.Header>
						</Table.Row>
					</Table.Head>
					<Table.Body>
						<Table.Row>
							<Table.Cell>web</Table.Cell>
							<Table.Cell>12</Table.Cell>
						</Table.Row>
					</Table.Body>
				</Table.Element>,
			);

			expect(getComputedStyle(screen.getByRole("table")).display).toBe(layout);
			for (const header of screen.getAllByRole("columnheader")) {
				expect(getComputedStyle(header).borderTopWidth).toBe("0px");
				expect(getComputedStyle(header).borderBottomWidth).toBe("1px");
			}
			const bottom = (name: string) =>
				screen.getByRole("columnheader", { name }).getBoundingClientRect().bottom;
			const top = (name: string) =>
				screen.getByRole("columnheader", { name }).getBoundingClientRect().top;
			// The first row's line is the boundary of the second row, so no line doubles.
			expect(bottom("Usage")).toBe(top("Requests"));
			// The line under the last row is the edge of the body, in each column.
			const bodyTop = screen.getByRole("cell", { name: "web" }).getBoundingClientRect().top;
			expect(bottom("Requests")).toBe(bodyTop);
			expect(bottom(span ? "Name" : "Region")).toBe(bodyTop);
		},
	);

	test("a table with no header row keeps the table layout and still truncates", () => {
		renderTable(
			600,
			[
				{ label: "Description", value: longValue },
				{ label: "Name", value: "web-10" },
			],
			{
				head: false,
			},
		);

		expect(getComputedStyle(screen.getByRole("table")).display).toBe("table");
		expect(contentBoxWidth(longValue)).toBeLessThan(textWidth(longValue));
		expect(isOneLine(longValue)).toBe(true);
	});
});
