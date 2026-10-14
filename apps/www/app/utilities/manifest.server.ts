import type {
	AgentManifestComponent,
	AgentManifestSibling,
} from "../../../../packages/mantle/scripts/agent-manifest";
import { buildSiteAgentManifest } from "~/utilities/agent-manifest.server";

/**
 * One entry in the public component manifest. The shape is the shipped
 * `dist/agent.json` record, so an agent reads the same fields online and
 * offline.
 */
export type ManifestComponent = AgentManifestComponent;

/** A sibling component that answers an adjacent intent. */
export type ManifestSibling = AgentManifestSibling;

/** Top-level shape returned by `/api/components.json`. */
export type Manifest = {
	/** Currently published `@ngrok/mantle` version. */
	version: string;
	/** Canonical docs origin. */
	origin: string;
	/** Stable and preview components plus layouts, sorted by display name. */
	components: ManifestComponent[];
};

/**
 * Build the public component manifest: the component records of the site's
 * agent manifest under the `/api/components.json` envelope.
 */
export async function buildManifest(): Promise<Manifest> {
	const manifest = await buildSiteAgentManifest();
	return {
		version: manifest.version,
		origin: manifest.origin,
		components: manifest.components,
	};
}
