import { describe, expect, it } from "vitest";
import {
	chunkNeedsUseClient,
	findClientHelperExports,
	findClientImport,
	hasUseClientDirective,
	isClientModule,
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

describe("isClientModule", () => {
	it("marks a module that imports a Phosphor icon or the React Compiler runtime", () => {
		expect(isClientModule({ code: "", importedIds: ["@phosphor-icons/react/Check"] })).toBe(true);
		expect(isClientModule({ code: "", importedIds: ["react/compiler-runtime"] })).toBe(true);
	});

	it("ignores an import that only a comment shows", () => {
		expect(
			isClientModule({
				code: '/** import { CheckIcon } from "@phosphor-icons/react/Check"; */\nexport {};',
				importedIds: ["tiny-invariant"],
			}),
		).toBe(false);
	});
});

describe("findClientHelperExports", () => {
	const clientChunk = {
		type: "chunk",
		code: '"use client";\nconst t=()=>1;export{t};',
		imports: [],
	};

	it("follows re-exports through server chunks to the client chunk", () => {
		expect(
			findClientHelperExports({
				bundle: {
					"theme.js": {
						type: "chunk",
						isEntry: true,
						code: 'import{t as e}from"./shared.js";export{e as extractThemeCookie};',
						exports: ["extractThemeCookie"],
					},
					"shared.js": { type: "chunk", code: 'export{t}from"./client.js";' },
					"client.js": clientChunk,
				},
				browserOnlyExports: [],
			}),
		).toEqual(["theme.js: extractThemeCookie comes from client.js"]);
	});

	it("checks constants but not components, hooks, or browser-only helpers", () => {
		expect(
			findClientHelperExports({
				bundle: {
					"otp.js": {
						type: "chunk",
						isEntry: true,
						code: '"use client";\nconst a=1,b=()=>{},c=()=>{},d=()=>{};export{a as REGEXP_ONLY_DIGITS,b as OtpInput,c as useOtp,d as readOtp};',
						exports: ["REGEXP_ONLY_DIGITS", "OtpInput", "useOtp", "readOtp"],
					},
				},
				browserOnlyExports: ["readOtp"],
			}),
		).toEqual(["otp.js: REGEXP_ONLY_DIGITS comes from otp.js"]);
	});

	it("passes a helper that a server chunk declares", () => {
		expect(
			findClientHelperExports({
				bundle: {
					"pagination.js": {
						type: "chunk",
						isEntry: true,
						code: 'import{t as e}from"./slice.js";import{t as n}from"./client.js";export{n as Pagination,e as getOffsetPaginatedSlice};',
						exports: ["Pagination", "getOffsetPaginatedSlice"],
					},
					"slice.js": { type: "chunk", code: "const t=()=>[];export{t};" },
					"client.js": clientChunk,
				},
				browserOnlyExports: [],
			}),
		).toEqual([]);
	});
});
