import { describe, expect, test } from "vitest";
import { readConfig, writeConfig } from "./config";

describe("writeConfig", () => {
	test("a written scenario reads back as itself, off-default fields included", () => {
		const config = {
			animate: false,
			kind: "scatter",
			mode: "table",
			n: 100,
			points: 12,
			gate: "cv",
			group: "list",
			noCharts: true,
		} as const;
		expect(readConfig(writeConfig(config))).toEqual(config);
	});

	test("a dense scenario reads back with one chart whatever n it wrote", () => {
		const config = {
			animate: true,
			kind: "line",
			mode: "dense",
			n: 7,
			points: 4_000,
			gate: "none",
			group: "none",
			noCharts: false,
		} as const;
		expect(readConfig(writeConfig(config))).toEqual({ ...config, n: 1 });
	});

	test("an agents scenario reads back as bars whatever kind it wrote", () => {
		const config = {
			animate: true,
			kind: "scatter",
			mode: "agents",
			n: 10,
			points: 30,
			gate: "none",
			group: "none",
			noCharts: false,
		} as const;
		expect(readConfig(writeConfig(config))).toEqual({ ...config, kind: "bar" });
	});
});
