import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

/**
 * The static import graph of each chart family's entry, read from the source.
 * A type-only import and a dynamic `import()` load nothing at runtime, so the
 * walk skips them.
 */
const staticGraph = (entry: string): Set<string> => {
	const seen = new Set<string>();
	const pending = [path.resolve(import.meta.dirname, entry)];
	const specifier = /^(?:import|export)\s+(?!type\b)(?:[^;]*?\sfrom\s+)?"(\.[^"]+)";/gm;
	for (let file = pending.pop(); file != null; file = pending.pop()) {
		if (seen.has(file)) {
			continue;
		}
		seen.add(file);
		for (const match of readFileSync(file, "utf8").matchAll(specifier)) {
			const target = path.resolve(path.dirname(file), match[1] ?? "");
			pending.push(target.replace(/\.js$/, readSource(target)));
		}
	}
	return new Set([...seen].map((file) => path.relative(import.meta.dirname, file)));
};

/** The extension of the source file a `.js` import names: `.ts` or `.tsx`. */
const readSource = (target: string): string => {
	try {
		readFileSync(target.replace(/\.js$/, ".ts"));
		return ".ts";
	} catch {
		return ".tsx";
	}
};

// Why: decisions/2026-11-11-chart-svg-renderer.md keeps canvas code out of the
// SVG families, and decisions/2026-11-12-chart-engine-optimization.md keeps
// the scatter and 3D code out of them.
const SCATTER_ONLY = [
	"canvas-backend.ts",
	"canvas-colors.ts",
	"projection.ts",
	"scatter-engine.ts",
	"scatter-renderer.ts",
];

describe("the static import graph", () => {
	test.each(["../bar-chart/index.ts", "../line-chart/index.ts", "../area-chart/index.ts"])(
		"of %s holds no canvas or scatter module",
		(entry) => {
			const graph = staticGraph(entry);
			// Guards the walk: a graph that never reached the engine would pass the check below.
			expect(graph).toContain("engine.ts");
			expect(SCATTER_ONLY.filter((file) => graph.has(file))).toEqual([]);
		},
	);

	test("of ScatterPlot holds every scatter module", () => {
		const graph = staticGraph("../scatter-plot/index.ts");
		expect(SCATTER_ONLY.filter((file) => !graph.has(file))).toEqual([]);
	});
});
