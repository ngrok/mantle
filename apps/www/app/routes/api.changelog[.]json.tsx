import { buildChangelog } from "~/utilities/changelog.server";
import { jsonAgentResponse } from "~/utilities/json-response.server";
import type { Route } from "./+types/api.changelog[.]json";

/**
 * Serve `/api/changelog.json` — `packages/mantle/CHANGELOG.md` split into
 * one entry per version, each broken out by semver bump and tagged with
 * the PR, commit, and author metadata changesets emits. Cheaper than
 * fetching the markdown changelog and stripping the preamble per bullet
 * when an agent only wants the structured "what changed" view.
 */
export async function loader({ request }: Route.LoaderArgs) {
	return jsonAgentResponse(await buildChangelog(), request);
}
