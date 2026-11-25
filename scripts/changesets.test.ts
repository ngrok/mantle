import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const changesetDir = path.resolve(import.meta.dirname, "../.changeset");
const migrationDocsDir = path.resolve(import.meta.dirname, "../apps/www/app/docs/migrations");

/** The pending changesets, by file name. */
function pendingChangesets(): string[] {
	return fs
		.readdirSync(changesetDir)
		.filter((entry) => entry.endsWith(".md") && entry !== "README.md")
		.toSorted();
}

/**
 * The bump a changeset gives `@ngrok/mantle`, or `null` when it names another
 * package. The key and the value read with either quote or none, as YAML does.
 */
function mantleBump(source: string): string | null {
	const match = source.match(/^(["']?)@ngrok\/mantle\1:\s*(["']?)(\w+)\2\s*$/m);
	return match?.[3] ?? null;
}

/** The migration guide file names, without `.mdx`. */
function migrationSlugs(): string[] {
	return fs
		.readdirSync(migrationDocsDir)
		.filter((entry) => entry.endsWith(".mdx"))
		.map((entry) => entry.replace(/\.mdx$/, ""));
}

/** The guide slugs in each `mantle.ngrok.com/migrations/<slug>` link. */
function linkedMigrationSlugs(source: string): string[] {
	return Array.from(
		source.matchAll(/mantle\.ngrok\.com\/migrations\/([a-z0-9-]+)/g),
		([, slug]) => slug ?? "",
	);
}

describe("pending changesets", () => {
	const names = pendingChangesets();

	// Why: a link to a guide that does not exist reads as a migration in the
	// changelog and sends the consumer to a missing page. Catches a typo in a slug.
	it.each(names.length > 0 ? names : ["(none)"])(
		"%s links a migration guide that exists",
		(name) => {
			if (name === "(none)") {
				return;
			}
			const source = fs.readFileSync(path.join(changesetDir, name), "utf8");
			// Why the unnumbered slugs: guides 0001 to 0035 redirect from them.
			const targets = new Set(
				migrationSlugs().flatMap((slug) => [slug, slug.replace(/^\d{4}-/, "")]),
			);

			expect(linkedMigrationSlugs(source).filter((slug) => !targets.has(slug))).toEqual([]);
		},
	);

	// Why a changeset that bumps @ngrok/mantle: the release moves its note into
	// the mantle CHANGELOG, and the migration tests then need the guide's link there.
	it("links each unreleased migration guide from a pending @ngrok/mantle changeset", () => {
		const linked = new Set(
			names
				.map((name) => fs.readFileSync(path.join(changesetDir, name), "utf8"))
				.filter((source) => (mantleBump(source) ?? "none") !== "none")
				.flatMap(linkedMigrationSlugs),
		);
		const unlinked = migrationSlugs().filter(
			(slug) =>
				!/^introducedIn:/m.test(
					fs.readFileSync(path.join(migrationDocsDir, `${slug}.mdx`), "utf8"),
				) && !linked.has(slug),
		);

		expect(unlinked).toEqual([]);
	});

	// Why: VERSIONING.md has no major, and a `major` changeset would publish 1.0.0.
	it.each(names.length > 0 ? names : ["(none)"])("%s never bumps @ngrok/mantle major", (name) => {
		if (name === "(none)") {
			return;
		}
		const source = fs.readFileSync(path.join(changesetDir, name), "utf8");

		expect(mantleBump(source)).not.toBe("major");
	});
});
