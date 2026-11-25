import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { parse as parseYaml } from "yaml";

/**
 * One migration guide's index facts, read from its frontmatter. The
 * `virtual:migration-guides` declaration in `app/virtual-migration-guides.d.ts` repeats this shape.
 */
type MigrationGuideEntry = {
	/** The file name without `.mdx`, which is also the URL slug under `/migrations/`. */
	name: string;
	title: string;
	description: string;
	/** The number the release stamps, or `null` before the guide ships. */
	number: number | null;
};

/**
 * Read the index facts from one guide's source. Throws when the frontmatter
 * lacks a string `title` or `description`, or has a `number` that is not an integer.
 *
 * @example
 * readMigrationGuide("tabs-overflow-migration", '---\ntitle: Tabs Overflow Migration\ndescription: A change.\n---\n');
 * // { name: "tabs-overflow-migration", title: "Tabs Overflow Migration", description: "A change.", number: null }
 */
function readMigrationGuide(name: string, source: string): MigrationGuideEntry {
	const frontmatter: unknown = parseYaml(source.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? "");
	if (
		typeof frontmatter !== "object" ||
		frontmatter == null ||
		!("title" in frontmatter) ||
		typeof frontmatter.title !== "string" ||
		!("description" in frontmatter) ||
		typeof frontmatter.description !== "string"
	) {
		throw new Error(`Add a title and a description to the frontmatter of ${name}.mdx`);
	}
	const number = "number" in frontmatter ? frontmatter.number : null;
	if (number != null && !Number.isInteger(number)) {
		throw new Error(`Fix the number in the frontmatter of ${name}.mdx: it must be an integer`);
	}
	return {
		name,
		title: frontmatter.title,
		description: frontmatter.description,
		number: typeof number === "number" ? number : null,
	};
}

/**
 * Vite plugin that serves `virtual:migration-guides`: the index facts of each
 * guide in `migrationsDir`. The sidebar and the index read the list from this
 * module, so a new guide needs no hand-written entry, and the client bundle
 * holds the frontmatter and not the guide text.
 *
 * @example
 * // in vite.config.ts:
 * plugins: [migrationGuides(path.resolve(import.meta.dirname, "app/docs/migrations"))]
 */
export function migrationGuides(migrationsDir: string): Plugin {
	const virtualModuleId = "virtual:migration-guides";
	const resolvedId = "\0" + virtualModuleId;

	return {
		name: "migration-guides",
		resolveId(id) {
			return id === virtualModuleId ? resolvedId : null;
		},
		load(id) {
			if (id !== resolvedId) {
				return;
			}
			const entries = readdirSync(migrationsDir)
				.filter((file) => file.endsWith(".mdx"))
				.toSorted()
				.map((file) =>
					readMigrationGuide(
						file.replace(/\.mdx$/, ""),
						readFileSync(path.join(migrationsDir, file), "utf8"),
					),
				);
			return `export default ${JSON.stringify(entries)};`;
		},
		hotUpdate({ file, modules }) {
			if (!(file.startsWith(migrationsDir) && file.endsWith(".mdx"))) {
				return;
			}
			const guidesModule = this.environment.moduleGraph.getModuleById(resolvedId);
			if (guidesModule == null) {
				return;
			}
			this.environment.moduleGraph.invalidateModule(guidesModule);
			return [...modules, guidesModule];
		},
	};
}
