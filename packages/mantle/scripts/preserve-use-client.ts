/** Matches an import of the React Compiler runtime in an output chunk. */
const COMPILER_RUNTIME_IMPORT_RE = /["']react\/compiler-runtime["']/;

/** Matches a module whose first statement is `"use client"`, after any comments. */
const USE_CLIENT_RE = /^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*["']use client["']/;

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

/**
 * A rolldown plugin that puts `"use client"` back on each output chunk that
 * needs it (see {@link chunkNeedsUseClient}).
 *
 * Why: rolldown drops module-level directives when it bundles modules into a
 * chunk, so a React Server Components host would treat every mantle part as a
 * server component. A chunk with no client code, such as `cx`, stays free of
 * the directive, so server code can still call it.
 *
 * @example
 * defineConfig({ plugins: [preserveUseClient()] });
 */
function preserveUseClient() {
	const clientModuleIds = new Set<string>();
	return {
		name: "preserve-use-client",
		transform: {
			order: "pre" as const,
			filter: { id: { include: SOURCE_RE, exclude: DECLARATION_RE } },
			handler: (code: string, id: string) => {
				if (hasUseClientDirective(code)) {
					clientModuleIds.add(id);
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
			return `"use client";\n${code}`;
		},
	};
}

export {
	//,
	chunkNeedsUseClient,
	hasUseClientDirective,
	preserveUseClient,
};
