import { jsonAgentResponse } from "~/utilities/json-response.server";
import { buildManifest } from "~/utilities/manifest.server";

/**
 * Serve `/api/components.json` — a structured, machine-readable manifest of
 * every mantle component, designed for ingestion by LLMs, code-generation
 * agents, IDE plugins, and downstream tooling.
 *
 * Schema is documented inline on `Manifest`/`ManifestComponent` types in
 * `~/utilities/manifest.server.ts`.
 */
export async function loader() {
	const manifest = await buildManifest();
	return jsonAgentResponse(manifest);
}
