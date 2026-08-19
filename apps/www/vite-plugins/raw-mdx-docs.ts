import { readFileSync } from "node:fs";
import path from "node:path";
import { globSync } from "tinyglobby";
import type { Plugin } from "vite";

/**
 * Vite plugin that bundles raw MDX source files as a virtual module.
 * This makes raw markdown content available at runtime without filesystem access,
 * which is necessary for serverless environments like Vercel.
 */
function rawMdxDocs(docsDir: string): Plugin {
	const virtualModuleId = "virtual:raw-mdx-docs";
	const resolvedId = "\0" + virtualModuleId;

	return {
		name: "raw-mdx-docs",
		resolveId(id) {
			if (id === virtualModuleId) {
				return resolvedId;
			}
		},
		load(id) {
			if (id !== resolvedId) {
				return;
			}

			const files = globSync("**/*.mdx", { cwd: docsDir });
			const entries: Record<string, string> = {};

			for (const file of files) {
				const content = readFileSync(path.join(docsDir, file), "utf-8");
				// Use the same key format as docModules ("../docs/...")
				entries[`../docs/${file}`] = content;
			}

			return `export default ${JSON.stringify(entries)};`;
		},
		hotUpdate({ file }) {
			if (!(file.startsWith(docsDir) && file.endsWith(".mdx"))) {
				return;
			}
			// Only the SSR graph imports the virtual module (docs.ts is loader and
			// server code). Bust it quietly: the next request re-imports it fresh.
			// Returning it as a client update would drag modules with no accepting
			// boundary into the update and demote the edit to a full page reload.
			if (this.environment.name !== "ssr") {
				return;
			}
			const moduleGraph = this.environment.moduleGraph;
			const mod = moduleGraph.getModuleById(resolvedId);
			if (mod) {
				moduleGraph.invalidateModule(mod);
			}
		},
	};
}

export { rawMdxDocs };
