import { jsonAgentResponse } from "~/utilities/json-response.server";
import { buildPackageInfo } from "~/utilities/package-info.server";
import type { Route } from "./+types/api.package[.]json";

/**
 * Serve `/api/package.json` — the bits of `@ngrok/mantle`'s `package.json`
 * that downstream tooling actually needs: the published version, peer/dev
 * dependency ranges, and the sorted list of importable subpaths. Lets an
 * agent validate an `@ngrok/mantle/<name>` import without parsing the
 * consumer's `node_modules` tree.
 */
export function loader({ request }: Route.LoaderArgs) {
	return jsonAgentResponse(buildPackageInfo(), request);
}
