import { jsonAgentResponse } from "~/utilities/json-response.server";
import { buildUtilitiesManifest } from "~/utilities/utils-manifest.server";
import type { Route } from "./+types/api.utils[.]json";

/**
 * Serve `/api/utils.json` — a structured, machine-readable manifest of
 * every utility module published by `@ngrok/mantle`, designed for
 * ingestion by LLMs, code-generation agents, IDE plugins, and downstream
 * tooling.
 *
 * Schema is documented inline on `UtilitiesManifest`/`ManifestUtility`
 * types in `~/utilities/utils-manifest.server.ts`.
 */
export async function loader({ request }: Route.LoaderArgs) {
	const manifest = await buildUtilitiesManifest();
	return jsonAgentResponse(manifest, request);
}
