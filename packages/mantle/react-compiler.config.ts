import type { ReactCompilerOptions } from "oxc-transform-react";

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

export {
	//,
	reactCompilerOptions,
};
