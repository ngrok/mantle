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

/** The migration guide slugs a changeset may link. */
function migrationSlugs(): string[] {
	return fs
		.readdirSync(migrationDocsDir)
		.filter((entry) => entry.endsWith(".mdx"))
		.map((entry) => entry.replace(/\.mdx$/, ""));
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
			const links = source.matchAll(/mantle\.ngrok\.com\/migrations\/([a-z0-9-]+)/g);

			for (const [, slug] of links) {
				expect(migrationSlugs()).toContain(slug);
			}
		},
	);

	// Why: the release moves each pending changeset into the CHANGELOG, and the
	// migration tests then need the guide's link in its release's section.
	it("links each unreleased migration guide from a pending changeset", () => {
		const pending = names.map((name) => fs.readFileSync(path.join(changesetDir, name), "utf8"));
		const unlinked = migrationSlugs().filter(
			(slug) =>
				!/^introducedIn:/m.test(
					fs.readFileSync(path.join(migrationDocsDir, `${slug}.mdx`), "utf8"),
				) && !pending.some((source) => source.includes(`mantle.ngrok.com/migrations/${slug}`)),
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
