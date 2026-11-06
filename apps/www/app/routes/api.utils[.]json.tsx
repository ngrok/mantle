import { jsonAgentResponse } from "~/utilities/json-response.server";
import { buildUtilitiesManifest } from "~/utilities/utils-manifest.server";

/**
 * Serve `/api/utils.json` — a structured, machine-readable manifest of
 * every utility module published by `@ngrok/mantle`, designed for
 * ingestion by LLMs, code-generation agents, IDE plugins, and downstream
 * tooling.
 *
 * Schema is documented inline on `UtilitiesManifest`/`ManifestUtility`
 * types in `~/utilities/utils-manifest.server.ts`.
 */
export async function loader() {
	const manifest = await buildUtilitiesManifest();
	return jsonAgentResponse(manifest);
}
