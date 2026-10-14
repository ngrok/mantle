import type { AgentManifestUtility } from "../../../../packages/mantle/scripts/agent-manifest";
import { buildSiteAgentManifest } from "~/utilities/agent-manifest.server";

/**
 * One entry in the public utilities manifest. The shape is the shipped
 * `dist/agent.json` record.
 */
export type ManifestUtility = AgentManifestUtility;

/** Top-level shape returned by `/api/utils.json`. */
export type UtilitiesManifest = {
	/** Currently published `@ngrok/mantle` version. */
	version: string;
	/** Canonical docs origin. */
	origin: string;
	/** Public utilities, sorted by name. */
	utilities: ManifestUtility[];
};

/**
 * Build the public utilities manifest: the utility records of the site's
 * agent manifest under the `/api/utils.json` envelope.
 */
export async function buildUtilitiesManifest(): Promise<UtilitiesManifest> {
	const manifest = await buildSiteAgentManifest();
	return {
		version: manifest.version,
		origin: manifest.origin,
		utilities: manifest.utilities,
	};
}
