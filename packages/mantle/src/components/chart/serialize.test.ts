import { describe, expect, test } from "vitest";
import { serializeChartMarkdown } from "./serialize.js";

describe("serializeChartMarkdown", () => {
	test("serializes a time series to a markdown table with ISO dates and plain numbers", () => {
		const markdown = serializeChartMarkdown({
			data: [
				{ time: new Date("2026-07-18T10:00:00Z"), p50: 120, p99: 480 },
				{ time: new Date("2026-07-18T10:01:00Z"), p50: 1284.5, p99: 510 },
			],
			xKey: "time",
			series: [
				{ dataKey: "p50", label: "p50" },
				{ dataKey: "p99", label: "p99" },
			],
		});
		expect(markdown).toBe(
			[
				"| time | p50 | p99 |",
				"| --- | --- | --- |",
				"| 2026-07-18T10:00:00.000Z | 120 | 480 |",
				// Numbers are never locale-separated — "1,284.5" would split cells
				// in CSV round-trips and confuse parsers.
				"| 2026-07-18T10:01:00.000Z | 1284.5 | 510 |",
			].join("\n"),
		);
	});

	test("category and numeric x values pass through machine-stable", () => {
		const markdown = serializeChartMarkdown({
			data: [
				{ label: "January", visitors: 186 },
				{ label: "February", visitors: 305 },
			],
			xKey: "label",
			series: [{ dataKey: "visitors", label: "Visitors" }],
		});
		expect(markdown).toContain("| January | 186 |");
		expect(markdown).toContain("| February | 305 |");
		const numericX = serializeChartMarkdown({
			data: [{ requests: 10000, errors: 3 }],
			xKey: "requests",
			series: [{ dataKey: "errors", label: "Errors" }],
		});
		expect(numericX).toContain("| 10000 | 3 |");
	});

	test("extreme magnitudes keep E-notation and round-trip exactly through Number()", () => {
		// Deliberate contract: String(value), never a fixed-point expansion —
		// capped-precision formatting can silently corrupt (1e-21 rounds to "0"),
		// while E-notation stays exactly re-parseable everywhere.
		const markdown = serializeChartMarkdown({
			data: [{ x: 1, huge: 1e21, tiny: 1e-7 }],
			xKey: "x",
			series: [
				{ dataKey: "huge", label: "huge" },
				{ dataKey: "tiny", label: "tiny" },
			],
		});
		expect(markdown).toContain("| 1 | 1e+21 | 1e-7 |");
		expect(Number("1e+21")).toBe(1e21);
		expect(Number("1e-7")).toBe(1e-7);
	});

	test("null, missing, and non-finite values render as an em dash — never zero", () => {
		const markdown = serializeChartMarkdown({
			data: [
				{ time: "10:00", p50: null, p99: Number.NaN },
				{ time: "10:01", p50: 132 },
			],
			xKey: "time",
			series: [
				{ dataKey: "p50", label: "p50" },
				{ dataKey: "p99", label: "p99" },
			],
		});
		expect(markdown).toContain("| 10:00 | — | — |");
		expect(markdown).toContain("| 10:01 | 132 | — |");
	});

	test("invalid dates render as an em dash instead of throwing", () => {
		const markdown = serializeChartMarkdown({
			data: [{ time: new Date(Number.NaN), p50: 120 }],
			xKey: "time",
			series: [{ dataKey: "p50", label: "p50" }],
		});
		expect(markdown).toContain("| — | 120 |");
	});

	test("pipes and newlines in labels and category values cannot break the table grammar", () => {
		const markdown = serializeChartMarkdown({
			data: [{ "region|zone": "us|east\nprimary", value: 1 }],
			xKey: "region|zone",
			series: [{ dataKey: "value", label: "p50|p99\nlatency" }],
		});
		expect(markdown).toContain("| region\\|zone | p50\\|p99 latency |");
		expect(markdown).toContain("| us\\|east primary | 1 |");
	});

	test("a zKey appends a final column", () => {
		const markdown = serializeChartMarkdown({
			data: [{ x: 1, y: 2, size: 30 }],
			xKey: "x",
			series: [{ dataKey: "y", label: "y" }],
			zKey: "size",
		});
		expect(markdown).toBe(["| x | y | size |", "| --- | --- | --- |", "| 1 | 2 | 30 |"].join("\n"));
	});

	test("empty data yields a header-only table", () => {
		const markdown = serializeChartMarkdown({
			data: [],
			xKey: "time",
			series: [{ dataKey: "p50", label: "p50" }],
		});
		expect(markdown).toBe(["| time | p50 |", "| --- | --- |"].join("\n"));
	});
});
