import { agentSkillsIndex } from "~/utilities/agent-skill.server";
import { jsonAgentResponse } from "~/utilities/json-response.server";

/**
 * Serve `/.well-known/agent-skills/index.json`, the Agent Skills discovery
 * index with the digest of the mantle skill's `SKILL.md`.
 */
export function loader() {
	return jsonAgentResponse(agentSkillsIndex());
}
