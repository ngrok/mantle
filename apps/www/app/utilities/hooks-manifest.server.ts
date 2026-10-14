import type { AgentManifestHook } from "../../../../packages/mantle/scripts/agent-manifest";
import { buildSiteAgentManifest } from "~/utilities/agent-manifest.server";

/**
 * One entry in the public hooks manifest. The shape is the shipped
 * `dist/agent.json` record.
 */
export type ManifestHook = AgentManifestHook;

/** Top-level shape returned by `/api/hooks.json`. */
export type HooksManifest = {
	/** Currently published `@ngrok/mantle` version. */
	version: string;
	/** Canonical docs origin. */
	origin: string;
	/** Public hooks, sorted by name. */
	hooks: ManifestHook[];
};

/**
 * Build the public hooks manifest: the hook records of the site's agent
 * manifest under the `/api/hooks.json` envelope.
 */
export async function buildHooksManifest(): Promise<HooksManifest> {
	const manifest = await buildSiteAgentManifest();
	return {
		version: manifest.version,
		origin: manifest.origin,
		hooks: manifest.hooks,
	};
}
