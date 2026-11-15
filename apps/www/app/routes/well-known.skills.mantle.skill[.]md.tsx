import { skillMarkdownResponse } from "~/utilities/agent-skill.server";

/** Serve `/.well-known/skills/mantle/SKILL.md`, the mantle agent skill. */
export function loader() {
	return skillMarkdownResponse();
}
