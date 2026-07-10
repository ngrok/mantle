import { jsonAgentResponse } from "~/utilities/json-response.server";
import { buildManifest } from "~/utilities/manifest.server";
import type { Route } from "./+types/api.components[.]json";

/**
 * Serve `/api/components.json` — a structured, machine-readable manifest of
 * every mantle component, designed for ingestion by LLMs, code-generation
 * agents, IDE plugins, and downstream tooling.
 *
 * Schema is documented inline on `Manifest`/`ManifestComponent` types in
 * `~/utilities/manifest.server.ts`.
 */
export async function loader({ request }: Route.LoaderArgs) {
	const manifest = await buildManifest();
	return jsonAgentResponse(manifest, request);
}
