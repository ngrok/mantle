import { SourceMap } from "node:module";
import { describe, expect, it } from "vitest";
import { compileReact } from "../react-compiler.config.ts";
import { markMemoFreeComponents } from "./mark-memo-free-components.ts";

/** Compiles a module the way every compiler pass does and reports whether it imports the compiler runtime. */
async function isCompiled(code: string): Promise<boolean> {
	const result = await compileReact("/m/src/part.tsx", code);
	return result.code.includes("react/compiler-runtime");
}

describe("compileReact", () => {
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
				'import { useState } from "react";\nexport const Counter = () => {\n\tconst [count] = useState(0);\n\treturn <output>{count}</output>;\n};',
			),
		).toBe(true);
	});

	it("compiles a component that calls a hook under another name", async () => {
		expect(
			await isCompiled(
				'import { use as read } from "react";\nexport function Part({ promise }) {\n\treturn <div>{read(promise)}</div>;\n}',
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

	it("compiles a component that creates a function in a parameter default", async () => {
		expect(
			await isCompiled(
				"export function Part({ Child, onClick = () => 1 }) {\n\treturn <Child onClick={onClick} />;\n}",
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

	it("still rejects a memo-free component that breaks the Rules of React", async () => {
		await expect(
			compileReact(
				"/m/src/part.tsx",
				"export function Part() {\n\treturn <span>{Date.now()}</span>;\n}",
			),
		).rejects.toThrow(/impure/i);
	});

	it("maps the output back to the columns of the original source", async () => {
		const code = "export const Part = () => <span />; export const tail = 3;";
		const { code: output, map } = await compileReact("/m/src/part.tsx", code);
		const line = output.split("\n").findIndex((text) => text.includes("tail"));
		const column = output.split("\n")[line]?.indexOf("tail") ?? -1;
		const entry = new SourceMap(JSON.parse(JSON.stringify(map))).findEntry(line, column);
		expect("originalColumn" in entry && entry.originalColumn).toBe(code.indexOf("tail"));
	});
});

describe("markMemoFreeComponents", () => {
	it("marks each component on its own", () => {
		const marked = markMemoFreeComponents(
			"parts.tsx",
			'import { useId } from "react";\nconst Plain = () => <p />;\nconst Stateful = () => <p id={useId()} />;',
		).toString();
		expect(marked).toContain('const Plain = () => { "use no memo"; return (<p />); };');
		expect(marked).toContain("const Stateful = () => <p id={useId()} />;");
	});
});
