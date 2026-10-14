import { expect, it } from "vitest";

import { buildManifest, type ManifestComponent } from "./manifest.server";

/**
 * Drift guard for the agent-facing component surface served at
 * `/api/components.json` and shipped as `dist/agent.json`.
 *
 * The committed `__snapshots__/components-surface.json` file is *generated*
 * from each component's docs frontmatter and source JSDoc (summary, every
 * `@example` block, the `@siblings` and `@useWhen` tags), never hand-edited.
 * It is the source-of-truth shape of the structured surface agents consume,
 * so a change to a component's docs, summary, or tags that isn't reflected
 * here means the two have drifted. The package's own test pins the pack-time
 * build against the same file, so the site and the tarball cannot diverge.
 *
 * Regenerate after intentional changes:
 *
 *     pnpm -F @app/www test -u
 *
 * CI's "Vibe Check" runs `vitest` without `-u`, so any un-regenerated change
 * fails this test. Volatile fields (`version`, absolute `docsUrl`/
 * `markdownUrl`) are dropped — they're derivable from `slug` + the published
 * version — so the snapshot only churns on real content changes, not on
 * version bumps.
 */

/** The stable, content-bearing projection we guard against drift. */
type SurfaceEntry = Pick<
	ManifestComponent,
	| "name"
	| "slug"
	| "kind"
	| "category"
	| "status"
	| "importPath"
	| "summary"
	| "jsdoc"
	| "examples"
	| "aliases"
	| "siblings"
	| "useWhen"
>;

/** Project a manifest component down to the drift-guarded {@link SurfaceEntry}. */
function toSurface(component: ManifestComponent): SurfaceEntry {
	return {
		name: component.name,
		slug: component.slug,
		kind: component.kind,
		category: component.category,
		status: component.status,
		importPath: component.importPath,
		summary: component.summary,
		jsdoc: component.jsdoc,
		examples: component.examples,
		aliases: component.aliases,
		siblings: component.siblings,
		useWhen: component.useWhen,
	};
}

it("component manifest matches the committed snapshot (regenerate with `pnpm -F @app/www test -u`)", async () => {
	const manifest = await buildManifest();
	const surface = manifest.components.map(toSurface);

	// Why the oxfmt ignore (`.prettierignore`): the check compares the exact
	// string, and oxfmt would collapse a short `aliases` array onto one line.
	await expect(`${JSON.stringify(surface, null, 2)}\n`).toMatchFileSnapshot(
		"./__snapshots__/components-surface.json",
	);
});
