import { transform } from "oxc-transform-react";
import { describe, expect, it } from "vitest";
import { reactCompilerOptions } from "../react-compiler.config.ts";
import { markMemoFreeComponents } from "./mark-memo-free-components.ts";

/** Compiles a module the way the build does and reports whether it imports the compiler runtime. */
async function isCompiled(code: string): Promise<boolean> {
	const result = await transform("part.tsx", markMemoFreeComponents("part.tsx", code), {
		jsx: "preserve",
		reactCompiler: reactCompilerOptions,
	});
	expect(result.errors).toEqual([]);
	return result.code.includes("react/compiler-runtime");
}

describe("markMemoFreeComponents", () => {
	it("leaves a part that spreads its props uncompiled", async () => {
		expect(
			await isCompiled(
				'import { cx } from "./cx.js";\nexport const Part = ({ className, ...props }) => (\n\t<div className={cx("p-2", className)} {...props} />\n);',
			),
		).toBe(false);
	});

	it("leaves a function component with a block body uncompiled", async () => {
		expect(
			await isCompiled("export function Part({ label }) {\n\treturn <kbd>⌘{label}</kbd>;\n}"),
		).toBe(false);
	});

	it("compiles a component that calls a hook", async () => {
		expect(
			await isCompiled(
				'import { useState } from "react";\nexport const Counter = () => {\n\tconst [count, setCount] = useState(0);\n\treturn <output>{count}</output>;\n};',
			),
		).toBe(true);
	});

	it("compiles a component that creates a function in render", async () => {
		expect(
			await isCompiled(
				"export const Item = ({ id, onPick }) => <button onClick={() => onPick(id)}>{id}</button>;",
			),
		).toBe(true);
	});

	it('compiles a hook-free component that starts with "use memo"', async () => {
		expect(
			await isCompiled(
				'export const Part = (props) => {\n\t"use memo";\n\treturn <div {...props} />;\n};',
			),
		).toBe(true);
	});

	it("marks each component on its own", () => {
		const marked = markMemoFreeComponents(
			"parts.tsx",
			'import { useId } from "react";\nconst Plain = () => <p />;\nconst Stateful = () => <p id={useId()} />;',
		);
		expect(marked).toContain('const Plain = () => { "use no memo"; return (<p />); };');
		expect(marked).toContain("const Stateful = () => <p id={useId()} />;");
	});

	it("keeps every line in place for source maps", () => {
		const code =
			"const A = () => (\n\t<div>\n\t\ttext\n\t</div>\n);\nfunction B() {\n\treturn <i />;\n}\n";
		expect(markMemoFreeComponents("a.tsx", code).split("\n")).toHaveLength(code.split("\n").length);
	});
});
