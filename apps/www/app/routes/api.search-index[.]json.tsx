import { jsonAgentResponse } from "~/utilities/json-response.server";
import { buildSearchIndex } from "~/utilities/search-index.server";
import type { Route } from "./+types/api.search-index[.]json";

/**
 * Serve `/api/search-index.json` — every component, hook, and utility
 * flattened into a single sorted array, each entry tagged with `kind`
 * and a small bag of keyword tokens derived from its name and summary.
 * Sized to fit comfortably in an agent context, and shaped to back a
 * future client-side search UI without another fetch round-trip.
 */
export async function loader({ request }: Route.LoaderArgs) {
	return jsonAgentResponse(await buildSearchIndex(), request);
}
