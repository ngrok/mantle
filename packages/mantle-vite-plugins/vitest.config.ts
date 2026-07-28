import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		include: ["src/**/*.test.ts"],
		setupFiles: "./vitest.setup.ts",
		// See `packages/mantle/vitest.config.ts` — an un-torn-down spy leaks into every later
		// test in the file, so restoring centrally keeps an inline `mockRestore()` from being
		// load-bearing. CONVENTIONS.md § Testing documents this as repo-wide.
		restoreMocks: true,
		unstubEnvs: true,
		unstubGlobals: true,
	},
});
