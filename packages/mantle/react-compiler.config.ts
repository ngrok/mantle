import remapping from "@jridgewell/remapping";
import MagicString from "magic-string";
import { parseSync, Visitor } from "oxc-parser";
import { transform, type ReactCompilerOptions, type TransformResult } from "oxc-transform-react";

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

/** Reports whether a module starts with a `"use memo"` directive, which opts in each of its components and hooks. */
function optsInModule(id: string, code: string): boolean {
	const { program } = parseSync(id, code);
	for (const statement of program.body) {
		if (statement.type !== "ExpressionStatement" || statement.directive == null) {
			return false;
		}
		if (statement.directive === "use memo") {
			return true;
		}
	}
	return false;
}

/**
 * Runs the React Compiler over one module, for the tsdown build, the vitest suite, and the docs
 * site. Only a function that starts with `"use memo"`, or each component and hook of a module that
 * starts with it, ships compiled. Every other function ships as written. The source map points at the original module. JSX stays in the output, so the host's own
 * JSX transform still runs.
 *
 * Why two passes: the first pass compiles every component and hook to run the strict validations,
 * and discards its output. The second pass compiles only the opted-in functions. Opt in when a browser
 * benchmark shows that memoization makes an interaction faster, or when a test shows that a caller
 * relies on a stable identity (see decisions/2026-11-22-react-compiler-scope.md).
 *
 * @example
 * ```ts
 * const { code, map } = await compileReact("/repo/src/card.tsx", source);
 * ```
 */
async function compileReact(id: string, code: string) {
	const validated = await transform(id, code, {
		jsx: "preserve",
		reactCompiler: reactCompilerOptions,
	});
	assertCompiled(id, validated);
	const result = await transform(id, code, {
		jsx: "preserve",
		sourcemap: true,
		reactCompiler: optsInModule(id, code)
			? reactCompilerOptions
			: { ...reactCompilerOptions, compilationMode: "annotation" },
	});
	assertCompiled(id, result);
	// Why strip: the compiler keeps each directive in its output, and a directive is dead text there.
	const stripped = new MagicString(result.code);
	new Visitor({
		ExpressionStatement: (node) => {
			if (node.directive === "use memo" || node.directive === "use no memo") {
				stripped.remove(node.start, node.end);
			}
		},
	}).visit(parseSync(id, result.code).program);
	if (!stripped.hasChanged()) {
		return { code: result.code, map: result.map };
	}
	const maps = [stripped.generateMap({ hires: true }).toString(), JSON.stringify(result.map)];
	return { code: stripped.toString(), map: remapping(maps, () => null).toString() };
}

export {
	//,
	compileReact,
	reactCompilerOptions,
};
