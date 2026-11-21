import path from "node:path";
import { pathToFileURL } from "node:url";

import { parseSync } from "oxc-parser";
import { describe, expect, it } from "vitest";
import { foldCx, loadMergeClassList } from "./fold-cx.ts";

type ClassValue = string | null | undefined | boolean | number | Record<string, unknown>;
type Cx = (...inputs: ClassValue[]) => string;

// Why a runtime import: the node tsconfig, which holds this file, must not include `src` modules.
const { cx, cxFolded }: { cx: Cx; cxFolded: (merged: string, className: ClassValue) => string } =
	await import(pathToFileURL(path.join(import.meta.dirname, "../src/utils/cx/cx.ts")).href);
const merge = await loadMergeClassList();

const CX_IMPORT = 'import { cx } from "../../utils/cx/cx.js";';
const FOLDED_IMPORT = 'import { cxFolded } from "../../utils/cx/cx.js"; ';

/** Folds `body`, then compiles it as a function of `params` with the real `cx` helpers. */
function compile(params: string[], body: string) {
	const folded = foldCx(
		`${CX_IMPORT}\nconst result = ${body};`,
		"/m/src/components/a/a.tsx",
		merge,
	);
	expect(folded).not.toBeNull();
	const code = (folded ?? "").replace(CX_IMPORT, "").replace(FOLDED_IMPORT, "");
	// oxlint-disable-next-line no-new-func -- the test runs the code that the fold writes.
	const run = new Function("cx", "cxFolded", ...params, `${code}\nreturn result;`);
	return { code, run: (...args: unknown[]) => run(cx, cxFolded, ...args) as string };
}

describe("foldCx", () => {
	it("folds static arguments into one merged string", () => {
		const { code } = compile([], 'cx("p-2 flex", "p-4", null, false, `text-strong`)');
		expect(code).toBe('\nconst result = "flex p-4 text-strong";');
	});

	it("keeps look-alike classes that set different properties", () => {
		const { code } = compile([], 'cx("text-heading-md text-strong", "text-shadow-sm text-muted")');
		expect(code).toBe('\nconst result = "text-heading-md text-shadow-sm text-muted";');
	});

	it("gives the runtime result for each condition and className", () => {
		const body = `cx(
			"rounded",
			a && "p-4",
			b ? "text-heading-sm text-strong" : (a ? "text-mono" : "text-muted"),
			className,
		)`;
		const fallback = (a: unknown) => (a ? "text-mono" : "text-muted");
		const { code, run } = compile(["a", "b", "className"], body);
		expect(code).toContain("cxFolded(");
		expect(code).not.toContain("cx(");
		for (const a of [true, false, 0, "yes"]) {
			for (const b of [true, false, null]) {
				for (const className of [
					undefined,
					"",
					"p-1 text-body",
					"not-sr-only",
					{ "text-xs": true },
				]) {
					const expected = cx(
						"rounded",
						a && "p-4",
						b ? "text-heading-sm text-strong" : fallback(a),
						className,
					);
					expect(run(a, b, className)).toBe(expected);
				}
			}
		}
	});

	it("evaluates each condition at most once", () => {
		let reads = 0;
		const { run } = compile(["read"], 'cx("p-2", read() && "p-4", read() && "flex")');
		const read = () => {
			reads += 1;
			return true;
		};
		expect(run(read)).toBe("p-4 flex");
		expect(reads).toBe(2);
	});

	it("keeps each source line where it was", () => {
		const source = `"use client";\n${CX_IMPORT}\nconst a = cx(\n\t"p-2",\n\tclassName,\n);\nconst b = 1;`;
		const folded = foldCx(source, "/m/src/a.tsx", merge) ?? "";
		expect(folded.startsWith('"use client";\n')).toBe(true);
		expect(folded.split("\n")).toHaveLength(source.split("\n").length);
		expect(folded.split("\n")[6]).toBe("const b = 1;");
	});

	it("leaves a call alone when the merge removes a static class before className", () => {
		// `not-sr-only` removes `sr-only`, so `p-4` survives: `cx("p-4 sr-only", "not-sr-only")` is
		// `"p-4 not-sr-only"`, while a merged prefix would have lost `p-4`.
		expect(cx("p-4 sr-only", "not-sr-only")).toBe("p-4 not-sr-only");
		expect(foldCx(`${CX_IMPORT}\ncx("p-4 sr-only", className);`, "/m/src/a.tsx", merge)).toBeNull();
		expect(
			foldCx(`${CX_IMPORT}\ncx("p-4", open && "sr-only", className);`, "/m/src/a.tsx", merge),
		).toBeNull();
	});

	it("leaves a module alone when cx or cxFolded may name a local binding", () => {
		for (const source of [
			'function f(cx) { return cx("p-2", "p-4"); }',
			'const f = (className, cxFolded) => cx("p-2", className);',
			'export { cx as merge };\ncx("p-2");',
		]) {
			expect(foldCx(`${CX_IMPORT}\n${source}`, "/m/src/a.tsx", merge)).toBeNull();
		}
	});

	it("reads undefined as a value, which a local binding can shadow", () => {
		const folded = foldCx(
			`${CX_IMPORT}\nfunction f(undefined) { return cx("p-2", undefined); }`,
			"/m/src/a.tsx",
			merge,
		);
		expect(folded).toContain('cxFolded("p-2", undefined)');
	});

	it("imports the helper from cx.js and keeps the module valid", () => {
		const fromBarrel = foldCx(
			'import { cx } from "../utils/cx/index.js";\ncx("p-2", className);',
			"/m/src/a.tsx",
			merge,
		);
		expect(fromBarrel).toContain('import { cxFolded } from "../utils/cx/cx.js";');
		// An import may follow a statement that the fold shortens.
		const importLast = foldCx(
			`const a = cx("p-2   flex", className);\n${CX_IMPORT}`,
			"/m/src/a.tsx",
			merge,
		);
		expect(importLast).toContain(`${FOLDED_IMPORT}${CX_IMPORT}`);
		expect(parseSync("a.tsx", importLast ?? "", { lang: "tsx" }).errors).toEqual([]);
	});

	it("counts the lines that an argument carries before it pads", () => {
		const source = `${CX_IMPORT}\nconst a = cx("p-2", [\n"p-4"\n]);\nconst b = 1;`;
		const folded = foldCx(source, "/m/src/a.tsx", merge) ?? "";
		expect(folded.split("\n")).toHaveLength(source.split("\n").length);
		expect(folded.split("\n")[4]).toBe("const b = 1;");
	});

	it("leaves calls that are not static alone", () => {
		for (const call of [
			'cx(className, "p-2")',
			'cx("p-2", a, b)',
			"cx(className)",
			'cx("p-2", ...rest)',
			'cx("p-2", a || "p-4", className)',
			'cx(variants({ size }), "p-2")',
			'cx(a && "a", b && "b", c && "c", d && "d")',
		]) {
			expect(foldCx(`${CX_IMPORT}\n${call};`, "/m/src/a.tsx", merge)).toBeNull();
		}
	});

	it("folds only the cx that mantle's cx module exports", () => {
		expect(
			foldCx('import { cx } from "classnames";\ncx("p-2");', "/m/src/a.tsx", merge),
		).toBeNull();
		expect(
			foldCx('import { cx as merge } from "../utils/cx/cx.js";\ncx("p-2");', "/m/src/a.tsx", merge),
		).toBeNull();
	});
});
