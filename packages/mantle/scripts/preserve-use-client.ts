/** Matches an import of the React Compiler runtime in an output chunk. */
const COMPILER_RUNTIME_IMPORT_RE = /["']react\/compiler-runtime["']/;

/** Builds a regex that matches a module whose directive prologue holds `directive`, after any comments. */
const directiveRe = (directive: string) =>
	new RegExp(
		`^(?:\\s|//[^\\n]*\\n|/\\*[\\s\\S]*?\\*/|["']use [^"'\\n]+["'];?)*["']${directive}["']`,
	);
const USE_CLIENT_RE = directiveRe("use client");
const USE_NO_MEMO_RE = directiveRe("use no memo");

/** Matches the source modules that the build transforms, but not their declarations. */
const SOURCE_RE = /[\\/]src[\\/].+\.tsx?$/;
const DECLARATION_RE = /\.d\.[cm]?ts$/;

/**
 * Reports whether a source module starts with the `"use client"` directive.
 *
 * @example
 * hasUseClientDirective('"use client";\nimport { useState } from "react";'); // => true
 */
function hasUseClientDirective(code: string): boolean {
	return USE_CLIENT_RE.test(code);
}

/**
 * Reports whether a source module opts out of the React Compiler for the whole file. A
 * `"use no memo"` inside one function does not count.
 *
 * @example
 * hasFileUseNoMemoDirective('"use no memo";\nimport { cx } from "./cx.js";'); // => true
 */
function hasFileUseNoMemoDirective(code: string): boolean {
	return USE_NO_MEMO_RE.test(code);
}

/**
 * Reports whether an output chunk must start with `"use client"`: it holds a
 * client module, or it imports `react/compiler-runtime`. The React Compiler
 * adds a hook to each component it compiles, so its output is client code
 * even when the source has no directive.
 *
 * @example
 * chunkNeedsUseClient({ code: 'import{c}from"react/compiler-runtime";', moduleIds: [], clientModuleIds: new Set() }); // => true
 */
function chunkNeedsUseClient({
	code,
	moduleIds,
	clientModuleIds,
}: {
	code: string;
	moduleIds: readonly string[];
	clientModuleIds: ReadonlySet<string>;
}): boolean {
	return (
		COMPILER_RUNTIME_IMPORT_RE.test(code) ||
		moduleIds.some((moduleId) => clientModuleIds.has(moduleId))
	);
}

/** An output chunk, as far as {@link findClientImport} reads it. */
type OutputChunkLike = { type: string; code?: string; imports?: readonly string[] };

/**
 * Finds a client chunk that a server-callable entry imports, directly or
 * through other chunks. Returns the chunk files from the entry to that chunk,
 * or `undefined` when the entry reaches no client chunk.
 *
 * @example
 * findClientImport("utils.js", {
 *   "utils.js": { type: "chunk", code: 'import"./a.js";', imports: ["a.js"] },
 *   "a.js": { type: "chunk", code: '"use client";', imports: [] },
 * }); // => ["utils.js", "a.js"]
 */
function findClientImport(
	entry: string,
	bundle: Readonly<Record<string, OutputChunkLike>>,
): string[] | undefined {
	const seen = new Set<string>();
	const visit = (fileName: string, path: string[]): string[] | undefined => {
		const chunk = bundle[fileName];
		if (chunk == null || chunk.type !== "chunk" || seen.has(fileName)) {
			return undefined;
		}
		seen.add(fileName);
		if (hasUseClientDirective(chunk.code ?? "")) {
			return path;
		}
		for (const imported of chunk.imports ?? []) {
			const found = visit(imported, [...path, imported]);
			if (found != null) {
				return found;
			}
		}
		return undefined;
	};
	return visit(entry, [entry]);
}

/**
 * A rolldown plugin that puts `"use client"` back on each output chunk that
 * needs it (see {@link chunkNeedsUseClient}).
 *
 * Why: rolldown drops module-level directives when it bundles modules into a
 * chunk, so a React Server Components host would treat every mantle part as a
 * server component. A chunk with no client code, such as `cx`, stays free of
 * the directive, so server code can still call it.
 *
 * A module with a file-level `"use no memo"` is a server component (CONVENTIONS.md
 * § React Compiler). The build fails when one lands in a `"use client"` chunk, because a
 * server component would then silently render it as a client component.
 *
 * @example
 * defineConfig({ plugins: [preserveUseClient({ serverEntries: ["cx.js"] })] });
 */
function preserveUseClient({
	serverEntries,
}: {
	/** The entries that server code calls. The build fails when one imports a client chunk. */
	serverEntries: readonly string[];
}) {
	const clientModuleIds = new Set<string>();
	const serverModuleIds = new Set<string>();
	return {
		name: "preserve-use-client",
		transform: {
			order: "pre" as const,
			filter: { id: { include: SOURCE_RE, exclude: DECLARATION_RE } },
			handler: (code: string, id: string) => {
				if (hasUseClientDirective(code)) {
					clientModuleIds.add(id);
				}
				if (hasFileUseNoMemoDirective(code)) {
					serverModuleIds.add(id);
				}
				return null;
			},
		},
		renderChunk: (code: string, chunk: { fileName: string; moduleIds: readonly string[] }) => {
			if (!chunk.fileName.endsWith(".js")) {
				return null;
			}
			if (!chunkNeedsUseClient({ code, moduleIds: chunk.moduleIds, clientModuleIds })) {
				return null;
			}
			const serverModuleId = chunk.moduleIds.find((moduleId) => serverModuleIds.has(moduleId));
			if (serverModuleId != null) {
				throw new Error(
					`${serverModuleId} has a file-level "use no memo" so server components can render it, but its chunk ${chunk.fileName} holds a "use client" or compiled module. Remove "use client" from that file, or keep compiled modules out of its chunk.`,
				);
			}
			return `"use client";\n${code}`;
		},
		generateBundle: (_options: unknown, bundle: Record<string, OutputChunkLike>) => {
			for (const entry of serverEntries) {
				const path = findClientImport(entry, bundle);
				if (path != null) {
					throw new Error(
						`${entry} must stay server-callable, but it imports a client chunk: ${path.join(" -> ")}. Move the pure code out of the "use client" module.`,
					);
				}
			}
		},
	};
}

export {
	//,
	chunkNeedsUseClient,
	findClientImport,
	hasFileUseNoMemoDirective,
	hasUseClientDirective,
	preserveUseClient,
};
