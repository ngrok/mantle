import path from "node:path";
import type { RouteConfigEntry } from "@react-router/dev/routes";
import { globSync } from "tinyglobby";
import { expect, test } from "vitest";
import routes from "~/routes";

/**
 * Drift guard for the hand-maintained page arrays in `app/routes.ts`.
 *
 * Every docs page is an MDX route module, but the route table lists slugs by
 * hand. A slug with no file fails the build loudly; a file with no slug
 * fails silently (the page 404s while `urlToFileMap` still advertises it in
 * the sitemap, `llms.txt`, and the agent manifest). This test pins both
 * directions, plus the invariant the `doc-page` loader depends on: an MDX
 * route's URL path is its file path minus the `./docs/` prefix and `.mdx`
 * extension.
 */

/** Every MDX route module in the config, with the URL path the router serves it at. */
function collectMdxRoutes(
	entries: Array<RouteConfigEntry>,
	parentPath: string,
): Array<{ url: string; file: string }> {
	const collected: Array<{ url: string; file: string }> = [];
	for (const entry of entries) {
		const url = entry.path ? (parentPath ? `${parentPath}/${entry.path}` : entry.path) : parentPath;
		if (entry.file.endsWith(".mdx")) {
			collected.push({ url, file: entry.file });
		}
		if (entry.children) {
			collected.push(...collectMdxRoutes(entry.children, url));
		}
	}
	return collected;
}

const docsDirectory = path.resolve(import.meta.dirname, "../docs");

test("every MDX route module points at the file its URL path names", () => {
	const routedMdx = collectMdxRoutes(routes, "");

	expect(routedMdx.length).toBeGreaterThan(0);
	for (const { url, file } of routedMdx) {
		expect(file).toBe(`./docs/${url === "" ? "index" : url}.mdx`);
	}
});

test("the docs directory and the route table list the same MDX files", () => {
	const routed = new Set(collectMdxRoutes(routes, "").map((entry) => entry.file));
	const onDisk = new Set(
		globSync("**/*.mdx", { cwd: docsDirectory }).map((file) => `./docs/${file}`),
	);

	const unrouted = [...onDisk].filter((file) => !routed.has(file)).toSorted();
	const missingFiles = [...routed].filter((file) => !onDisk.has(file)).toSorted();

	expect(unrouted, "docs files with no routes.ts entry").toEqual([]);
	expect(missingFiles, "routes.ts entries with no docs file").toEqual([]);
});
