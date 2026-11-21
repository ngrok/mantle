import { describe, expect, it } from "vitest";
import {
	chunkNeedsUseClient,
	findClientImport,
	hasFileUseNoMemoDirective,
	hasUseClientDirective,
	preserveUseClient,
} from "./preserve-use-client.ts";

describe("hasUseClientDirective", () => {
	it("finds the directive after leading comments", () => {
		expect(hasUseClientDirective('// Why: a note.\n/** Doc. */\n"use client";\nexport {};')).toBe(
			true,
		);
	});

	it("ignores the words after the first statement", () => {
		expect(hasUseClientDirective('import { cx } from "./cx.js";\n"use client";')).toBe(false);
	});

	it("finds the directive after another directive", () => {
		expect(hasUseClientDirective('"use no memo";\n"use client";\nexport {};')).toBe(true);
	});
});

describe("hasFileUseNoMemoDirective", () => {
	it("finds a file-level directive after a Why comment", () => {
		expect(
			hasFileUseNoMemoDirective('// Why "use no memo": a note.\n"use no memo";\nexport {};'),
		).toBe(true);
	});

	it("finds the directive after a directive that does not start with use", () => {
		expect(hasFileUseNoMemoDirective('"custom";\n"use no memo";\nexport {};')).toBe(true);
	});

	it("does not read past the first comment end into a function body", () => {
		expect(
			hasFileUseNoMemoDirective(
				'/* header */ "use client"; function C() { /* Why */ "use no memo"; }',
			),
		).toBe(false);
	});

	it("ignores a directive inside one function", () => {
		expect(
			hasFileUseNoMemoDirective(
				'import { useVirtualizer } from "@tanstack/react-virtual";\nfunction useRows() {\n\t"use no memo";\n}',
			),
		).toBe(false);
	});
});

describe("chunkNeedsUseClient", () => {
	const clientModuleIds = new Set(["/m/src/components/dialog/dialog.tsx"]);

	it("marks a chunk that holds a client module", () => {
		expect(
			chunkNeedsUseClient({
				code: "export const a = 1;",
				moduleIds: ["/m/src/components/dialog/dialog.tsx"],
				clientModuleIds,
			}),
		).toBe(true);
	});

	it("marks a chunk that imports the React Compiler runtime", () => {
		expect(
			chunkNeedsUseClient({
				code: 'import{c as e}from"react/compiler-runtime";',
				moduleIds: ["/m/src/components/badge/badge.tsx"],
				clientModuleIds,
			}),
		).toBe(true);
	});

	it("leaves a pure utility chunk server-callable", () => {
		expect(
			chunkNeedsUseClient({
				code: "export function cx() {}",
				moduleIds: ["/m/src/utils/cx/cx.ts"],
				clientModuleIds,
			}),
		).toBe(false);
	});
});

describe("findClientImport", () => {
	it("finds a client chunk that an entry imports through another chunk", () => {
		expect(
			findClientImport("utils.js", {
				"utils.js": { type: "chunk", code: 'import"./copy.js";', imports: ["copy.js"] },
				"copy.js": { type: "chunk", code: 'import"./dom.js";', imports: ["dom.js"] },
				"dom.js": { type: "chunk", code: '"use client";\nexport {};', imports: [] },
			}),
		).toEqual(["utils.js", "copy.js", "dom.js"]);
	});

	it("passes an entry that reaches only server chunks", () => {
		expect(
			findClientImport("cx.js", {
				"cx.js": { type: "chunk", code: 'import"./clsx.js";', imports: ["clsx.js"] },
				"clsx.js": { type: "chunk", code: "export {};", imports: [] },
			}),
		).toBeUndefined();
	});
});

describe("preserveUseClient", () => {
	const id = "/m/src/components/card/card.tsx";

	it("fails a chunk that holds a file-level opt-out and client code", () => {
		const plugin = preserveUseClient({ serverEntries: [] });
		plugin.transform.handler('"use no memo";\nexport {};', id);
		expect(() =>
			plugin.renderChunk('import{c}from"react/compiler-runtime";', {
				fileName: "card.js",
				moduleIds: [id],
			}),
		).toThrow(/file-level "use no memo"/);
	});

	it("forgets an opt-out that a watch rebuild removes", () => {
		const plugin = preserveUseClient({ serverEntries: [] });
		plugin.transform.handler('"use no memo";\nexport {};', id);
		plugin.transform.handler('"use client";\nexport {};', id);
		expect(plugin.renderChunk("export {};", { fileName: "card.js", moduleIds: [id] })).toBe(
			'"use client";\nexport {};',
		);
	});
});
