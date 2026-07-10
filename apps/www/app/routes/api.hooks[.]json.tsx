import { buildHooksManifest } from "~/utilities/hooks-manifest.server";
import { jsonAgentResponse } from "~/utilities/json-response.server";
import type { Route } from "./+types/api.hooks[.]json";

/**
 * Serve `/api/hooks.json` — a structured, machine-readable manifest of
 * every hook re-exported from `@ngrok/mantle/hooks`, designed for
 * ingestion by LLMs, code-generation agents, IDE plugins, and downstream
 * tooling.
 *
 * Schema is documented inline on `HooksManifest`/`ManifestHook` types in
 * `~/utilities/hooks-manifest.server.ts`.
 */
export async function loader({ request }: Route.LoaderArgs) {
	const manifest = await buildHooksManifest();
	return jsonAgentResponse(manifest, request);
}
