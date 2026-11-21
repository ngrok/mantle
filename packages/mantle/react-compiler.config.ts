import remapping from "@jridgewell/remapping";
import MagicString from "magic-string";
import { transform, type ReactCompilerOptions, type TransformResult } from "oxc-transform-react";
import { markMemoFreeComponents } from "./scripts/mark-memo-free-components.ts";

/**
 * The React Compiler options for every compiler pass in the repo: the tsdown
 * build, the vitest suite, and the docs site. One copy keeps the three passes
 * equal, so the tested code and the docs render the shipped code.
 *
 * Why `panicThreshold: "all_errors"`: with the default, the compiler skips a
 * function that it cannot compile and gives no warning, so that component
 * ships without memoization. This setting fails the build instead.
 *
 * Why every validation: each one rejects a pattern that breaks the Rules of
 * React or costs a render. The validations change no output; they only add
 * errors. CONVENTIONS.md § React Compiler says how to fix a failure.
 *
 * @example
 * ```ts
 * const result = await transform(id, code, { jsx: "preserve", reactCompiler: reactCompilerOptions });
 * ```
 */
const reactCompilerOptions = {
	target: "19",
	panicThreshold: "all_errors",
	environment: {
		validateExhaustiveEffectDependencies: "all",
		validateExhaustiveMemoizationDependencies: true,
		validateHooksUsage: true,
		validateNoCapitalizedCalls: [],
		validateNoDerivedComputationsInEffects: true,
		validateNoFreezingKnownMutableFunctions: true,
		validateNoImpureFunctionsInRender: true,
		validateNoJsxInTryStatements: true,
		validateNoSetStateInEffects: true,
		validateNoSetStateInRender: true,
		validateNoVoidUseMemo: true,
		validatePreserveExistingMemoizationGuarantees: true,
		validateRefAccessDuringRender: true,
		validateStaticComponents: true,
	},
} satisfies ReactCompilerOptions;

/** Throws the compiler's errors when it could not compile or validate a module. */
function assertCompiled(id: string, result: TransformResult): void {
	if (result.fatal) {
		const messages = result.errors.map((error) => error.message).join("\n");
		throw new Error(`The React Compiler pass failed for ${id}:\n${messages}`);
	}
}

/**
 * Runs the React Compiler over one module, for the tsdown build, the vitest suite, and the docs
 * site. Each component that memoization cannot help ships as written (see
 * `markMemoFreeComponents`). The source map points at the original module. JSX stays in the output,
 * so the host's own JSX transform still runs.
 *
 * Why compile the original first: `"use no memo"` also turns off the compiler's validations, and
 * every component must still pass them.
 *
 * @example
 * ```ts
 * const { code, map } = await compileReact("/repo/src/card.tsx", source);
 * ```
 */
async function compileReact(id: string, code: string) {
	const options = {
		jsx: "preserve",
		sourcemap: true,
		reactCompiler: reactCompilerOptions,
	} as const;
	const validated = await transform(id, code, options);
	assertCompiled(id, validated);
	const marked = markMemoFreeComponents(id, code);
	const result = marked.hasChanged() ? await transform(id, marked.toString(), options) : validated;
	assertCompiled(id, result);
	// Why strip: the compiler keeps each directive at the top of a function body in its output, and a
	// directive is dead text there.
	const stripped = new MagicString(result.code);
	for (const match of result.code.matchAll(/(?<=\{\s*)"use (?:no )?memo";/g)) {
		stripped.remove(match.index, match.index + match[0].length);
	}
	if (!stripped.hasChanged()) {
		return { code: result.code, map: result.map };
	}
	const maps = [stripped.generateMap({ hires: true }).toString(), JSON.stringify(result.map)];
	if (marked.hasChanged()) {
		maps.push(marked.generateMap({ source: id, hires: true, includeContent: true }).toString());
	}
	return { code: stripped.toString(), map: remapping(maps, () => null).toString() };
}

export {
	//,
	compileReact,
	reactCompilerOptions,
};
