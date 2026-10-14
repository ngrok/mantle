import mantlePackageJson from "@ngrok/mantle/package.json" with { type: "json" };
import {
	buildAgentManifest,
	importableSubpaths,
	type AgentManifest,
	type DocPage,
} from "../../../../packages/mantle/scripts/agent-manifest";
import { canonicalOrigin } from "~/utilities/canonical-origin";
import { loadFrontmatter, urlToFileMap } from "~/utilities/docs";
import { loadSourceFiles, sourceReader } from "~/utilities/mantle-source.server";

/** Every docs page the site serves, with its frontmatter. */
async function loadDocs(): Promise<DocPage[]> {
	return Promise.all(
		Array.from(urlToFileMap, async ([slug, filePath]): Promise<DocPage> => ({
			slug,
			frontmatter: (await loadFrontmatter(filePath)) ?? {},
		})),
	);
}

/** One build from the current docs and source. */
async function build(): Promise<AgentManifest> {
	const [docs, sourceFiles] = await Promise.all([loadDocs(), loadSourceFiles()]);
	return buildAgentManifest({
		name: mantlePackageJson.name,
		version: mantlePackageJson.version,
		origin: canonicalOrigin,
		subpaths: importableSubpaths(mantlePackageJson.exports),
		docs,
		readSource: sourceReader(sourceFiles),
	});
}

let cached: Promise<AgentManifest> | null = null;

/**
 * The agent manifest as the site serves it: the same records the package's
 * pack step writes into `dist/agent.json`, built here from the bundled docs
 * frontmatter and raw package source so the site needs no built `dist`, with
 * every URL on the canonical origin.
 *
 * In prod the inputs are fixed at build time, so one build serves the process.
 * In dev every call rebuilds, so a JSDoc or frontmatter edit shows on the next
 * request.
 *
 * @example
 * const manifest = await buildSiteAgentManifest();
 * manifest.components.find((entry) => entry.name === "Button")?.importPath;
 * // => "@ngrok/mantle/button"
 */
export function buildSiteAgentManifest(): Promise<AgentManifest> {
	if (!import.meta.env.PROD) {
		return build();
	}
	if (cached == null) {
		cached = build();
	}
	return cached;
}
