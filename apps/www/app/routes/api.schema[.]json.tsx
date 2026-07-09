import { canonicalHref } from "~/utilities/canonical-origin";
import { jsonAgentResponse } from "~/utilities/json-response.server";
import type { Route } from "./+types/api.schema[.]json";

/**
 * Bump when a manifest shape changes in a non-additive way (renames,
 * removed fields, narrowed unions). Additive changes can leave it alone.
 */
const SCHEMA_VERSION = 1;

/**
 * `additionalProperties: true` everywhere intentional: agents validating
 * against the schema should keep working when we add new fields. Bump
 * `SCHEMA_VERSION` when removing or renaming.
 */
const ComponentEntry = {
	type: "object",
	required: ["name", "slug", "kind", "status", "importPath", "docsUrl", "markdownUrl"],
	additionalProperties: true,
	properties: {
		name: { type: "string", description: "Display name (e.g. 'Data Table')." },
		slug: {
			type: "string",
			description: "Docs slug without leading slash (e.g. 'components/data-display/data-table').",
		},
		kind: {
			type: "string",
			enum: ["component", "layout"],
			description:
				"'component' owns an interaction/widget (documented under /components/<category>/); 'layout' owns page/viewport structure (documented under /layouts/).",
		},
		category: {
			type: "string",
			description: "Docs sidebar category (e.g. 'Data Display'). Components only.",
		},
		status: { type: "string", enum: ["stable", "preview"] },
		importPath: { type: "string", description: "ESM import path (e.g. '@ngrok/mantle/button')." },
		docsUrl: { type: "string", format: "uri" },
		markdownUrl: { type: "string", format: "uri" },
		summary: { type: "string", description: "One-line summary from docs frontmatter." },
		jsdoc: { type: "string", description: "First sentence of the source JSDoc, if available." },
	},
} as const;

const HookEntry = {
	type: "object",
	required: ["name", "importPath", "docsUrl", "markdownUrl"],
	additionalProperties: true,
	properties: {
		name: { type: "string" },
		importPath: { type: "string", const: "@ngrok/mantle/hooks" },
		docsUrl: { type: "string", format: "uri" },
		markdownUrl: { type: "string", format: "uri" },
		summary: { type: "string" },
	},
} as const;

const UtilityEntry = {
	type: "object",
	required: ["name", "importPath", "docsUrl", "markdownUrl"],
	additionalProperties: true,
	properties: {
		name: { type: "string" },
		importPath: { type: "string" },
		docsUrl: { type: "string", format: "uri" },
		markdownUrl: { type: "string", format: "uri" },
		summary: { type: "string" },
	},
} as const;

const SearchEntry = {
	type: "object",
	required: ["name", "kind", "importPath", "docsUrl", "markdownUrl", "keywords"],
	additionalProperties: true,
	properties: {
		name: { type: "string" },
		kind: { type: "string", enum: ["component", "layout", "hook", "utility"] },
		importPath: { type: "string" },
		docsUrl: { type: "string", format: "uri" },
		markdownUrl: { type: "string", format: "uri" },
		summary: { type: "string" },
		keywords: { type: "array", items: { type: "string" } },
		status: { type: "string", enum: ["stable", "preview"] },
		category: { type: "string", description: "Docs sidebar category. Components only." },
	},
} as const;

const ChangelogChange = {
	type: "object",
	required: ["bump", "summary"],
	additionalProperties: true,
	properties: {
		bump: { type: "string", enum: ["major", "minor", "patch"] },
		summary: { type: "string", description: "Markdown body the changeset author wrote." },
		pr: { type: "string", description: "Pull request URL, if extractable." },
		commit: { type: "string", description: "Commit URL, if extractable." },
		author: { type: "string", description: "GitHub username, if extractable." },
	},
} as const;

const ChangelogVersion = {
	type: "object",
	required: ["version", "changes"],
	additionalProperties: true,
	properties: {
		version: { type: "string", description: "Semver string (e.g. '0.71.0')." },
		changes: { type: "array", items: { $ref: "#/definitions/ChangelogChange" } },
	},
} as const;

const ComponentsManifest = {
	type: "object",
	required: ["version", "origin", "components"],
	additionalProperties: true,
	properties: {
		version: { type: "string" },
		origin: { type: "string", format: "uri" },
		components: { type: "array", items: { $ref: "#/definitions/ComponentEntry" } },
	},
} as const;

const HooksManifest = {
	type: "object",
	required: ["version", "origin", "hooks"],
	additionalProperties: true,
	properties: {
		version: { type: "string" },
		origin: { type: "string", format: "uri" },
		hooks: { type: "array", items: { $ref: "#/definitions/HookEntry" } },
	},
} as const;

const UtilitiesManifest = {
	type: "object",
	required: ["version", "origin", "utilities"],
	additionalProperties: true,
	properties: {
		version: { type: "string" },
		origin: { type: "string", format: "uri" },
		utilities: { type: "array", items: { $ref: "#/definitions/UtilityEntry" } },
	},
} as const;

const PackageInfo = {
	type: "object",
	required: ["name", "version", "subpaths"],
	additionalProperties: true,
	properties: {
		name: { type: "string" },
		version: { type: "string" },
		description: { type: "string" },
		homepage: { type: "string", format: "uri" },
		repository: { type: "string", format: "uri" },
		license: { type: "string" },
		peerDependencies: { type: "object", additionalProperties: { type: "string" } },
		devDependencies: { type: "object", additionalProperties: { type: "string" } },
		subpaths: { type: "array", items: { type: "string" } },
	},
} as const;

const Changelog = {
	type: "object",
	required: ["package", "origin", "versions"],
	additionalProperties: true,
	properties: {
		package: { type: "string", const: "@ngrok/mantle" },
		origin: { type: "string", format: "uri" },
		versions: { type: "array", items: { $ref: "#/definitions/ChangelogVersion" } },
	},
} as const;

const SearchIndex = {
	type: "object",
	required: ["version", "origin", "entries"],
	additionalProperties: true,
	properties: {
		version: { type: "string" },
		origin: { type: "string", format: "uri" },
		entries: { type: "array", items: { $ref: "#/definitions/SearchEntry" } },
	},
} as const;

const SchemaDocument = {
	type: "object",
	required: ["$schema", "$id", "title", "description", "version", "endpoints", "definitions"],
	additionalProperties: true,
	properties: {
		$schema: { type: "string" },
		$id: { type: "string", format: "uri" },
		title: { type: "string" },
		description: { type: "string" },
		version: { type: "number" },
		endpoints: { type: "object", additionalProperties: { type: "string" } },
		definitions: { type: "object", additionalProperties: true },
	},
} as const;

const SCHEMA = {
	$schema: "http://json-schema.org/draft-07/schema#",
	$id: canonicalHref("/api/schema.json"),
	title: "@ngrok/mantle agent API schemas",
	description:
		"Schema definitions for every machine-readable endpoint under /api/*.json, including this schema document. Use the keys under `definitions` to validate the corresponding payloads.",
	version: SCHEMA_VERSION,
	endpoints: {
		"/api/components.json": "#/definitions/ComponentsManifest",
		"/api/hooks.json": "#/definitions/HooksManifest",
		"/api/utils.json": "#/definitions/UtilitiesManifest",
		"/api/package.json": "#/definitions/PackageInfo",
		"/api/changelog.json": "#/definitions/Changelog",
		"/api/search-index.json": "#/definitions/SearchIndex",
		"/api/schema.json": "#/definitions/SchemaDocument",
	},
	definitions: {
		ComponentEntry,
		HookEntry,
		UtilityEntry,
		SearchEntry,
		ChangelogChange,
		ChangelogVersion,
		ComponentsManifest,
		HooksManifest,
		UtilitiesManifest,
		PackageInfo,
		Changelog,
		SearchIndex,
		SchemaDocument,
	},
} as const;

/**
 * Serve `/api/schema.json` — JSON Schema (draft-07) definitions for every
 * `/api/*.json` payload this site emits. One fetch is enough for an agent
 * to validate the rest of the surface or to introspect each endpoint's
 * field set without reading our source.
 */
export function loader({ request }: Route.LoaderArgs) {
	return jsonAgentResponse(SCHEMA, request, {
		contentType: "application/schema+json; charset=utf-8",
	});
}
