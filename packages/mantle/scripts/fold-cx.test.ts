import { describe, expect, it } from "vitest";
import { cx, cxFolded } from "../src/utils/cx/cx.ts";
import { foldCx } from "./fold-cx.ts";

const CX_IMPORT = 'import { cx } from "../../utils/cx/cx.js";';
const FOLDED_IMPORT = ' import { cxFolded } from "../../utils/cx/cx.js";';

/** Folds `body`, then compiles it as a function of `params` with the real `cx` helpers. */
function compile(params: string[], body: string) {
	const folded = foldCx(`${CX_IMPORT}\nconst result = ${body};`, "/m/src/components/a/a.tsx");
	expect(folded).not.toBeNull();
	const code = (folded ?? "").replace(CX_IMPORT, "").replace(FOLDED_IMPORT, "");
	// oxlint-disable-next-line no-new-func -- the test runs the code that the fold writes.
	const run = new Function("cx", "cxFolded", ...params, `${code}\nreturn result;`);
	return { code, run: (...args: unknown[]) => run(cx, cxFolded, ...args) as string };
}

describe("foldCx", () => {
	it("folds static arguments into one merged string", () => {
		const { code } = compile([], 'cx("p-2 flex", "p-4", null, undefined, false, `text-strong`)');
		expect(code).toBe('\nconst result = "flex p-4 text-strong";');
	});

	it("keeps look-alike classes that set different properties", () => {
		const { code } = compile([], 'cx("text-heading-md text-strong", "text-shadow-sm text-muted")');
		expect(code).toBe('\nconst result = "text-heading-md text-shadow-sm text-muted";');
	});

	it("gives the runtime result for each condition and className", () => {
		const body = `cx(
			"p-2 text-paragraph-md",
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
				for (const className of [undefined, "", "p-1 text-body", { "text-xs": true }]) {
					const expected = cx(
						"p-2 text-paragraph-md",
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
		const folded = foldCx(source, "/m/src/a.tsx") ?? "";
		expect(folded.startsWith('"use client";\n')).toBe(true);
		expect(folded.split("\n")).toHaveLength(source.split("\n").length);
		expect(folded.split("\n")[6]).toBe("const b = 1;");
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
			expect(foldCx(`${CX_IMPORT}\n${call};`, "/m/src/a.tsx")).toBeNull();
		}
	});

	it("folds only the cx that mantle's cx module exports", () => {
		expect(foldCx('import { cx } from "classnames";\ncx("p-2");', "/m/src/a.tsx")).toBeNull();
		expect(
			foldCx('import { cx as merge } from "../utils/cx/cx.js";\ncx("p-2");', "/m/src/a.tsx"),
		).toBeNull();
	});
});
