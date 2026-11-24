import { createHash } from "node:crypto";
import { canonicalOrigin } from "~/utilities/canonical-origin";
import skillBody from "~/utilities/mantle-skill.md?raw";

/** The skill's name. It is also its directory under `/.well-known/skills/`. */
const SKILL_NAME = "mantle";

/** What the skill does and when an agent loads it. The spec caps it at 1024 characters. */
const SKILL_DESCRIPTION =
	"Build React UI with @ngrok/mantle, ngrok's design system (React, TypeScript, Tailwind CSS). Use when a project depends on @ngrok/mantle or imports from @ngrok/mantle/*, or when the user asks for ngrok-styled UI. Covers how to pick a component, read its props, import it, set up the theme and stylesheet, check the code, and upgrade between versions.";

/** The URL path of the skill's `SKILL.md`. Both discovery indexes point at it. */
const skillMarkdownPath = `/.well-known/skills/${SKILL_NAME}/SKILL.md`;

/**
 * The skill's `SKILL.md`: YAML frontmatter, then the body in `mantle-skill.md`.
 * Why `JSON.stringify`: a JSON string is a valid YAML double-quoted scalar, so
 * the description can hold a colon or a quote.
 */
const skillMarkdown = [
	"---",
	`name: ${SKILL_NAME}`,
	`description: ${JSON.stringify(SKILL_DESCRIPTION)}`,
	"license: MIT",
	"metadata:",
	"  author: ngrok",
	`  website: ${canonicalOrigin}`,
	"---",
	"",
	skillBody,
].join("\n");

/**
 * The index at `/.well-known/skills/index.json`, in the legacy discovery
 * format: a client fetches each of `files` from `/.well-known/skills/<name>/`.
 *
 * @see https://github.com/vercel-labs/skills/blob/main/src/providers/wellknown.ts
 * @example
 * skillsIndex().skills[0].files; // => ["SKILL.md"]
 */
function skillsIndex() {
	return {
		skills: [{ name: SKILL_NAME, description: SKILL_DESCRIPTION, files: ["SKILL.md"] }],
	};
}

/**
 * The index at `/.well-known/agent-skills/index.json`, in the Agent Skills
 * discovery format 0.2.0. A client checks this path first, and it rejects the
 * skill when the `SKILL.md` bytes do not match `digest`.
 *
 * @see https://github.com/vercel-labs/skills/blob/main/src/providers/wellknown.ts
 * @example
 * agentSkillsIndex().skills[0].digest; // => "sha256:…"
 */
function agentSkillsIndex() {
	const digest = createHash("sha256").update(skillMarkdown, "utf8").digest("hex");
	return {
		$schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
		skills: [
			{
				name: SKILL_NAME,
				type: "skill-md",
				description: SKILL_DESCRIPTION,
				url: skillMarkdownPath,
				digest: `sha256:${digest}`,
			},
		],
	};
}

/**
 * Serve the skill's `SKILL.md` as markdown.
 *
 * @example
 * skillMarkdownResponse().headers.get("Content-Type"); // => "text/markdown; charset=utf-8"
 */
function skillMarkdownResponse(): Response {
	return new Response(skillMarkdown, {
		headers: { "Content-Type": "text/markdown; charset=utf-8" },
	});
}

export {
	//,
	agentSkillsIndex,
	skillMarkdownResponse,
	skillsIndex,
};
