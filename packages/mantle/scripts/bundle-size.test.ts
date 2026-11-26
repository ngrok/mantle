import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { formatReport, gzipBytesOf, measure, splitChunks } from "./bundle-size.ts";

describe("formatReport", () => {
	it("lists changed bundles first, largest change first, and folds unchanged ones", () => {
		const report = formatReport({
			base: { button: 1000, slot: 800, switch: 500 },
			head: { button: 1010, slot: 700, switch: 500, dictate: 50 },
		});
		expect(report).toContain("**3 of 4 bundles changed: -40 B in total.** Largest: `slot` -100 B.");
		const slot = report.indexOf("| ▼ `slot` | 800 B | 700 B | -100 B (-12.5%) |");
		const dictate = report.indexOf("| ✚ `dictate` | — | 50 B | new |");
		const button = report.indexOf("| ▲ `button` | 1000 B | 1010 B | +10 B (+1.0%) |");
		const folded = report.indexOf("<summary>1 unchanged</summary>");
		expect([slot, dictate, button, folded].every((index) => index > -1)).toBe(true);
		expect(slot < dictate && dictate < button && button < folded).toBe(true);
		expect(report.indexOf("| `switch` | 500 B | 500 B | 0 B |")).toBeGreaterThan(folded);
	});
});

describe("splitChunks", () => {
	it("counts the entry and its static imports as eager, and a dynamic import's chunks as lazy", () => {
		const chunk = (fileName: string, imports: string[] = [], isEntry = false) => ({
			fileName,
			code: fileName,
			isEntry,
			imports,
		});
		expect(
			splitChunks([
				chunk("entry.js", ["shared.js"], true),
				chunk("shared.js", ["deep.js"]),
				chunk("deep.js"),
				// A lazy chunk that imports an eager chunk does not make the eager chunk lazy.
				chunk("grammar.js", ["shared.js", "grammar-dep.js"]),
				chunk("grammar-dep.js"),
			]),
		).toEqual({
			eager: ["entry.js", "shared.js", "deep.js"],
			lazy: ["grammar.js", "grammar-dep.js"],
		});
	});
});

describe("gzipBytesOf", () => {
	it("sums the gzip size of each file, so files with shared text cost what a browser fetches", () => {
		const file =
			"export const grammar = " + JSON.stringify("x".repeat(64) + "keyword ".repeat(200)) + ";";
		const one = gzipSync(file, { level: 9 }).length;
		expect(gzipBytesOf([file, file])).toBe(2 * one);
	});
});

describe("measure", () => {
	it("counts a page with an import() as an app does: one eager chunk, and no preload helper", async () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bundle-size-"));
		// Why this name: only Vite's own helper is the app's, not a module whose path looks like it.
		fs.writeFileSync(
			path.join(dir, "preload-helper.js"),
			"export const shared = () => 'shared code';\n",
		);
		fs.writeFileSync(
			path.join(dir, "lazy.js"),
			`import { shared } from "${dir}/preload-helper.js";\nexport const lazy = () => shared() + " lazy";\n`,
		);
		const result = await measure({
			name: "import-fixture",
			entry: `import { shared } from "${dir}/preload-helper.js";\nexport default [shared, () => import("${dir}/lazy.js")];\n`,
			checkImports: false,
		});
		const files = fs.readdirSync(path.join(result.dir, "assets"));
		const page = files.find((file) => file.startsWith("_bundle-size_import-fixture"));
		const lazy = files.find((file) => file.startsWith("lazy"));
		// Why the helper is still on disk: the page imports it, and Node loads it for the import check.
		expect(files.some((file) => file.startsWith("preload-helper"))).toBe(true);
		expect(result.lazy).toEqual([`assets/${lazy}`]);
		// Why one chunk: the page exports the shared code to the lazy chunk, and the helper is the app's.
		const code = fs.readFileSync(path.join(result.dir, "assets", page ?? ""), "utf8");
		expect(code).toContain("shared code");
		expect(result.gzipBytes).toBe(gzipBytesOf([code]));
	}, 30_000);
});
