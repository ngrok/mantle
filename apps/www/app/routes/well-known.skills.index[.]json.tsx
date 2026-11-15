import { skillsIndex } from "~/utilities/agent-skill.server";
import { jsonAgentResponse } from "~/utilities/json-response.server";

/**
 * Serve `/.well-known/skills/index.json`, the index that `npx skills add
 * https://mantle.ngrok.com` reads to find the mantle agent skill.
 */
export function loader() {
	return jsonAgentResponse(skillsIndex());
}
