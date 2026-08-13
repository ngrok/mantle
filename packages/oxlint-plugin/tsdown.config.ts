import { defineConfig } from "tsdown";

export default defineConfig({
	dts: true,
	clean: true,
	minify: false,
	sourcemap: true,
	target: "ES2025",
	tsconfig: "tsconfig.json",
	fixedExtension: false,
	format: "esm",
	entry: {
		index: "./src/index.ts",
	},
});
