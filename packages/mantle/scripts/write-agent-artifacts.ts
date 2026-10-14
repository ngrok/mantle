import fs from "node:fs";
import path from "node:path";
import {
	buildAgentManifest,
	importableSubpaths,
	parseFrontmatter,
	renderLlmsTxt,
	type AgentManifest,
	type DocPage,
} from "./agent-manifest.ts";

/** The docs origin every URL in the shipped manifest points at. */
const DOCS_ORIGIN = "https://mantle.ngrok.com";

/** The package directory, `packages/mantle`. */
const packageDir = path.resolve(import.meta.dirname, "..");

/** The docs pages the manifest reads: the site's MDX tree, two workspaces over. */
const docsDir = path.resolve(packageDir, "../../apps/www/app/docs");

/** The package source the manifest reads JSDoc from. */
const srcDir = path.join(packageDir, "src");

/** The ast-grep rules, one directory per migration that has a codemod. */
const migrationsDir = path.join(packageDir, "migrations");

/** Every `.mdx` file under `dir`, as docs slugs with their parsed frontmatter. */
function readDocs(dir: string): DocPage[] {
	const docs: DocPage[] = [];
	for (const entry of fs.readdirSync(dir, { recursive: true, withFileTypes: true })) {
		if (!entry.isFile() || !entry.name.endsWith(".mdx")) {
			continue;
		}
		const filePath = path.join(entry.parentPath, entry.name);
		const slug = path
			.relative(dir, filePath)
			.replace(/\.mdx$/, "")
			.split(path.sep)
			.join("/");
		docs.push({ slug, frontmatter: parseFrontmatter(fs.readFileSync(filePath, "utf8")) });
	}
	return docs;
}

/**
 * Read one package source file by its `packages/mantle/src`-relative base
 * path, with or without its `.ts` or `.tsx` extension.
 */
function readSource(basePath: string): string | undefined {
	for (const candidate of [`${basePath}.tsx`, `${basePath}.ts`, basePath]) {
		const filePath = path.join(srcDir, candidate);
		if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
			return fs.readFileSync(filePath, "utf8");
		}
	}
	return undefined;
}

/**
 * Build the agent manifest from the filesystem: the docs tree in `apps/www`,
 * the package source, and `package.json`. The pack step calls this; a test
 * calls it to pin the output against the site's committed snapshot.
 *
 * @example
 * const manifest = buildAgentManifestFromFilesystem();
 * manifest.components.some((entry) => entry.name === "Button"); // => true
 */
function buildAgentManifestFromFilesystem(): AgentManifest {
	const packageJson: { name: string; version: string; exports: Record<string, unknown> } =
		JSON.parse(fs.readFileSync(path.join(packageDir, "package.json"), "utf8"));
	return buildAgentManifest({
		name: packageJson.name,
		version: packageJson.version,
		origin: DOCS_ORIGIN,
		subpaths: importableSubpaths(packageJson.exports),
		docs: readDocs(docsDir),
		readSource,
	});
}

/**
 * Copy every migration's `rules.yml` into `dist/migrations/<migration>.yml`,
 * so a consumer runs a codemod straight from `node_modules`. Returns the
 * written file names.
 */
async function copyMigrationRules(distDir: string): Promise<string[]> {
	if (!fs.existsSync(migrationsDir)) {
		return [];
	}
	const outDir = path.join(distDir, "migrations");
	await fs.promises.mkdir(outDir, { recursive: true });
	const written: string[] = [];
	for (const entry of fs.readdirSync(migrationsDir, { withFileTypes: true })) {
		const rules = path.join(migrationsDir, entry.name, "rules.yml");
		if (!entry.isDirectory() || !fs.existsSync(rules)) {
			continue;
		}
		const fileName = `${entry.name}.yml`;
		await fs.promises.copyFile(rules, path.join(outDir, fileName));
		written.push(fileName);
	}
	return written.toSorted((a, b) => a.localeCompare(b));
}

/**
 * Write the offline agent artifacts into `dist`: `agent.json` with the full
 * manifest, `llms.txt` with the one-line index, and `migrations/*.yml` with
 * the codemods. All ship in the npm package, so an agent with no network reads
 * them from `node_modules`. The `prepack` script runs this, so every tarball
 * carries them.
 *
 * @example
 * await writeAgentArtifacts(path.join(packageDir, "dist"));
 * // dist/agent.json, dist/llms.txt, and dist/migrations/ now exist
 */
async function writeAgentArtifacts(distDir: string): Promise<void> {
	const manifest = buildAgentManifestFromFilesystem();
	await fs.promises.mkdir(distDir, { recursive: true });
	await Promise.all([
		fs.promises.writeFile(
			path.join(distDir, "agent.json"),
			`${JSON.stringify(manifest, null, "\t")}\n`,
		),
		fs.promises.writeFile(path.join(distDir, "llms.txt"), renderLlmsTxt(manifest)),
		copyMigrationRules(distDir),
	]);
}

if (import.meta.main) {
	await writeAgentArtifacts(path.join(packageDir, "dist"));
}

export { buildAgentManifestFromFilesystem, DOCS_ORIGIN, writeAgentArtifacts };
