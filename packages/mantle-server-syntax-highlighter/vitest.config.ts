import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		include: ["src/**/*.test.ts"],
		// See `packages/mantle/vitest.config.ts` — an un-torn-down spy leaks into every later
		// test in the file, so restoring centrally keeps an inline `mockRestore()` from being
		// load-bearing. CONVENTIONS.md § Testing documents this as repo-wide.
		restoreMocks: true,
		unstubEnvs: true,
		unstubGlobals: true,
		// The timezone pin lives here rather than in the `test` script so it survives a
		// single-file run and an editor-driven run, per CONVENTIONS.md § Determinism.
		env: {
			TZ: "UTC",
		},
	},
});
