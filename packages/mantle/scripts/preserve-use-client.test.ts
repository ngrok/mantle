import { describe, expect, it } from "vitest";
import { chunkNeedsUseClient, hasUseClientDirective } from "./preserve-use-client.ts";

describe("hasUseClientDirective", () => {
	it("finds the directive after leading comments", () => {
		expect(hasUseClientDirective('// Why: a note.\n/** Doc. */\n"use client";\nexport {};')).toBe(
			true,
		);
	});

	it("ignores the words after the first statement", () => {
		expect(hasUseClientDirective('import { cx } from "./cx.js";\n"use client";')).toBe(false);
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
