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

/**
 * The packages that the modules of a static import graph load at run time. A
 * dynamic `import()` of a package counts, because the build inlines a dev
 * dependency into a lazy chunk too.
 */
const runtimePackages = (graph: ReadonlySet<string>): Set<string> => {
	const packages = new Set<string>();
	const specifier =
		/^(?:import|export)\s+(?!type\b)(?:[^;]*?\sfrom\s+)?"([^."][^"]*)";|\bimport\(\s*"([^."][^"]*)"\s*\)/gm;
	for (const file of graph) {
		const source = readFileSync(path.resolve(import.meta.dirname, file), "utf8");
		for (const match of source.matchAll(specifier)) {
			packages.add(match[1] ?? match[2] ?? "");
		}
	}
	return packages;
};

// Why: decisions/2026-11-11-chart-svg-renderer.md keeps canvas code out of the
// SVG families, and decisions/2026-11-12-chart-engine-optimization.md keeps
// the scatter code out of them and the 3D code out of every static graph.
const THREE_D_ONLY = ["projection.ts", "scatter-3d.ts", "scatter-3d-renderer.ts"];
const SCATTER_ONLY = [
	"canvas-backend.ts",
	"canvas-colors.ts",
	"scatter-engine.ts",
	"scatter-renderer.ts",
	...THREE_D_ONLY,
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

	test("of ScatterPlot holds the 2D scatter modules and no 3D module", () => {
		const graph = staticGraph("../scatter-plot/index.ts");
		expect(SCATTER_ONLY.filter((file) => !graph.has(file))).toEqual(THREE_D_ONLY);
	});

	test("of the lazy 3D module reaches the projection", () => {
		expect(staticGraph("./scatter-3d.ts")).toContain("projection.ts");
	});

	// Why: decisions/2026-11-13-chart-audit-pass.md ships the charts with no d3
	// code. d3 stays a dev dependency for the test oracles, so the build inlines
	// an import that comes back, and no other check fails.
	test.each([
		"../bar-chart/index.ts",
		"../line-chart/index.ts",
		"../area-chart/index.ts",
		"../scatter-plot/index.ts",
		"./scatter-3d.ts",
	])("of %s loads no d3 package", (entry) => {
		const packages = runtimePackages(staticGraph(entry));
		expect([...packages].filter((name) => /^d3(?:-|$)/.test(name))).toEqual([]);
	});

	test("names the packages a chart family loads", () => {
		// Guards the read: a pattern that matched no package would pass the d3 check.
		expect(runtimePackages(staticGraph("../line-chart/index.ts"))).toContain("tiny-invariant");
	});
});
