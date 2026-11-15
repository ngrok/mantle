import { createHash } from "node:crypto";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { z } from "zod";
import routes from "~/routes";

/** The name and description rules of the Agent Skills spec, which the discovery client also applies. */
const skillNameSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
const skillDescriptionSchema = z.string().min(1).max(1024);

/** `/.well-known/skills/index.json`: each skill lists the files under `/.well-known/skills/<name>/`. */
const skillsIndexSchema = z.object({
	skills: z
		.array(
			z.object({
				name: skillNameSchema,
				description: skillDescriptionSchema,
				files: z.array(z.string()).refine((files) => files.includes("SKILL.md")),
			}),
		)
		.min(1),
});

/** `/.well-known/agent-skills/index.json`: discovery format 0.2.0. */
const agentSkillsIndexSchema = z.object({
	$schema: z.literal("https://schemas.agentskills.io/discovery/0.2.0/schema.json"),
	skills: z
		.array(
			z.object({
				name: skillNameSchema,
				type: z.literal("skill-md"),
				description: skillDescriptionSchema,
				url: z.string().min(1),
				digest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
			}),
		)
		.min(1),
});

const appDirectory = path.resolve(import.meta.dirname, "..");

/**
 * Answers a URL path through the route table, the way the server does, so a
 * path that no route registers fails the test.
 */
async function fetchRoute(urlPath: string): Promise<Response> {
	const entry = routes.find((candidate) => `/${candidate.path}` === urlPath);
	if (entry == null) {
		throw new Error(`no route serves ${urlPath}`);
	}
	const routeModule: unknown = await import(path.join(appDirectory, entry.file));
	if (
		routeModule == null ||
		typeof routeModule !== "object" ||
		!("loader" in routeModule) ||
		typeof routeModule.loader !== "function"
	) {
		throw new Error(`${entry.file} has no loader`);
	}
	const response: unknown = await routeModule.loader();
	if (!(response instanceof Response)) {
		throw new Error(`${entry.file} did not return a Response`);
	}
	return response;
}

/** Splits `SKILL.md` into its parsed YAML frontmatter and its body. */
function parseSkillMarkdown(markdown: string) {
	const groups = /^---\n(?<frontmatter>[\s\S]*?)\n---\n(?<body>[\s\S]*)$/.exec(markdown)?.groups;
	if (groups?.frontmatter == null || groups.body == null) {
		throw new Error("SKILL.md has no frontmatter");
	}
	const frontmatter: unknown = parse(groups.frontmatter);
	return { frontmatter, body: groups.body };
}

describe("/.well-known/skills/index.json", () => {
	it("lists each skill with a valid name, a description, and its SKILL.md", async () => {
		const response = await fetchRoute("/.well-known/skills/index.json");

		expect(response.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
		expect(skillsIndexSchema.safeParse(await response.json()).error).toBeUndefined();
	});

	it("serves each SKILL.md with frontmatter that matches its index entry", async () => {
		const index = skillsIndexSchema.parse(
			await (await fetchRoute("/.well-known/skills/index.json")).json(),
		);

		for (const skill of index.skills) {
			const response = await fetchRoute(`/.well-known/skills/${skill.name}/SKILL.md`);
			expect(response.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");

			const { frontmatter, body } = parseSkillMarkdown(await response.text());
			expect(frontmatter).toMatchObject({ name: skill.name, description: skill.description });
			expect(body.trim().length).toBeGreaterThan(0);
		}
	});
});

describe("/.well-known/agent-skills/index.json", () => {
	it("points each skill at a SKILL.md whose bytes match its digest", async () => {
		const index = agentSkillsIndexSchema.parse(
			await (await fetchRoute("/.well-known/agent-skills/index.json")).json(),
		);

		for (const skill of index.skills) {
			const url = new URL(
				skill.url,
				"https://mantle.ngrok.com/.well-known/agent-skills/index.json",
			);
			const bytes = await (await fetchRoute(url.pathname)).arrayBuffer();
			const digest = createHash("sha256").update(new Uint8Array(bytes)).digest("hex");
			expect(skill.digest).toBe(`sha256:${digest}`);
		}
	});
});
