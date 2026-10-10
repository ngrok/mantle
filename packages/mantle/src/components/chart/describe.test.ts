import { describe, expect, test } from "vitest";
import { describeChart, scanX } from "./describe.js";

const at = (iso: string): Date => new Date(iso);

/** Three minutes of samples, out of order. */
const minutes = [
	{ t: at("2026-07-18T10:02:00Z"), v: 3 },
	{ t: at("2026-07-18T10:00:00Z"), v: 1 },
	{ t: at("2026-07-18T10:01:00Z"), v: 2 },
];

const months = [{ month: "January" }, { month: "February" }, { month: "March" }];

describe("scanX", () => {
	test("a time scale reports the earliest and latest x of unsorted rows", () => {
		expect(scanX(minutes, "t", "time")).toEqual({
			count: 3,
			first: at("2026-07-18T10:00:00Z"),
			last: at("2026-07-18T10:02:00Z"),
			hasTimeOfDay: true,
		});
	});

	test("a linear scale reports numeric bounds", () => {
		expect(scanX([{ x: 9 }, { x: 7 }, { x: 8 }], "x", "linear")).toEqual({
			count: 3,
			first: 7,
			last: 9,
			hasTimeOfDay: false,
		});
	});

	test("a band scale keeps the rows' own order", () => {
		expect(scanX([{ month: "March" }, { month: "January" }], "month", "band")).toEqual({
			count: 2,
			first: "March",
			last: "January",
			hasTimeOfDay: false,
		});
	});

	test("a band scale reads a category date's time of day", () => {
		expect(scanX([{ d: new Date(2026, 6, 18, 9) }], "d", "band").hasTimeOfDay).toBe(true);
	});

	test("a row whose x cannot be read as a time is not counted", () => {
		const summary = scanX(
			[{ t: at("2026-07-18T10:00:00Z") }, { t: null }, { t: at("2026-07-18T10:01:00Z") }],
			"t",
			"time",
		);
		expect(summary.count).toBe(2);
		expect(summary.last).toEqual(at("2026-07-18T10:01:00Z"));
	});

	test("an infinite x is neither counted nor in the range, as the chart does not plot it", () => {
		expect(scanX([{ x: 1 }, { x: Number.POSITIVE_INFINITY }, { x: 3 }], "x", "linear")).toEqual({
			count: 2,
			first: 1,
			last: 3,
			hasTimeOfDay: false,
		});
	});

	test("no readable x leaves the count at zero and no range", () => {
		expect(scanX([{ t: null }], "t", "time")).toEqual({
			count: 0,
			first: null,
			last: null,
			hasTimeOfDay: false,
		});
	});

	test("one row with a time of day marks the whole column", () => {
		// Local-time constructors keep the midnight check TZ-agnostic. The timed
		// row comes last, past where a scan that stops early would look.
		const rows = [
			{ t: new Date(2026, 6, 18) },
			{ t: new Date(2026, 6, 19) },
			{ t: new Date(2026, 6, 19, 10, 30) },
		];
		expect(scanX(rows, "t", "time").hasTimeOfDay).toBe(true);
	});

	test("an ISO string or an epoch number with a time of day marks a time column", () => {
		// Minutes, not hours: a whole-hour zone offset never zeroes them.
		expect(scanX([{ t: "2026-07-18T10:30:00Z" }], "t", "time").hasTimeOfDay).toBe(true);
		expect(scanX([{ t: Date.UTC(2026, 6, 18, 10, 30) }], "t", "time").hasTimeOfDay).toBe(true);
	});

	test("all-midnight rows carry no time of day", () => {
		const rows = [{ t: new Date(2026, 6, 18) }, { t: new Date(2026, 6, 19) }];
		expect(scanX(rows, "t", "time").hasTimeOfDay).toBe(false);
	});
});

describe("describeChart", () => {
	test("reads the count, the range, the series, and the keys, in that order", () => {
		const text = describeChart({
			kind: "line",
			summary: scanX(minutes, "t", "time"),
			seriesLabels: ["p50", "p99"],
			hydrated: true,
		});
		// The config pins TZ=UTC and en-US, so the range reads as short dates with times.
		expect(text).toMatch(
			/^Line chart with 3 data points from Jul 18, 10:00\sAM to Jul 18, 10:02\sAM\. Series: p50, p99\. Use the left and right arrow keys/,
		);
		expect(text).toMatch(/Escape to dismiss the readout\.$/);
	});

	// One row per kind label and per count noun.
	test.each([
		{
			kind: "bar",
			rows: months.slice(0, 1),
			xKey: "month",
			xScale: "band",
			expected: /^Bar chart with 1 category at January\. Use/,
		},
		{
			kind: "bar",
			rows: months,
			xKey: "month",
			xScale: "band",
			expected: /^Bar chart with 3 categories from January to March\. Use/,
		},
		{
			kind: "line",
			rows: minutes.slice(1, 2),
			xKey: "t",
			xScale: "time",
			expected: /^Line chart with 1 data point at Jul 18, 10:00\sAM\. Use/,
		},
		{
			kind: "area",
			rows: minutes,
			xKey: "t",
			xScale: "time",
			expected: /^Area chart with 3 data points from /,
		},
		{
			kind: "scatter",
			rows: [{ x: 1 }, { x: 2 }],
			xKey: "x",
			xScale: "linear",
			expected: /^Scatter plot with 2 data points from 1 to 2\. Use/,
		},
	] as const)("$kind reads $expected", ({ kind, rows, xKey, xScale, expected }) => {
		const summary = scanX(rows, xKey, xScale);
		expect(describeChart({ kind, summary, seriesLabels: [], hydrated: true })).toMatch(expected);
	});

	test("the series clause is omitted with no labels", () => {
		const text = describeChart({
			kind: "line",
			summary: scanX(minutes, "t", "time"),
			seriesLabels: [],
			hydrated: true,
		});
		expect(text).not.toContain("Series:");
		expect(text).toMatch(/AM\. Use the left/);
	});

	test("a chart with no data says so and still lists the series and the keys", () => {
		const text = describeChart({
			kind: "line",
			summary: scanX([], "t", "time"),
			seriesLabels: ["p50"],
			hydrated: true,
		});
		expect(text).toMatch(/^Line chart with no data\. Series: p50\. Use the left/);
	});

	test("before hydration the count is plain and the range waits", () => {
		const rows = Array.from({ length: 1234 }, (_, index) => ({
			t: new Date(Date.UTC(2026, 6, 1) + index * 60_000),
		}));
		const summary = scanX(rows, "t", "time");
		// `Intl` output can differ between the server and the client, so the
		// server text holds nothing locale-formatted.
		expect(describeChart({ kind: "line", summary, seriesLabels: [], hydrated: false })).toMatch(
			/^Line chart with 1234 data points\. Use the left/,
		);
		expect(describeChart({ kind: "line", summary, seriesLabels: [], hydrated: true })).toMatch(
			/^Line chart with 1,234 data points from Jul 1, /,
		);
	});
});
