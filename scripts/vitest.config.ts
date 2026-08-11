import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		name: "scripts",
		environment: "node",
		// Why `dir`: vitest resolves `include` from the working directory, and this config runs from the repo root.
		dir: import.meta.dirname,
		include: ["**/*.test.ts"],
		restoreMocks: true,
		unstubEnvs: true,
		unstubGlobals: true,
	},
});
