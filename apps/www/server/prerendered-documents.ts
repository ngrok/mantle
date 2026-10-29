import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Plugin, PrerenderedOptions } from "@ngrok/app-server";
import { documentHeaders } from "~/utilities/document-headers";
import { hasMarkdownVariant, markdownTwinPath } from "~/utilities/markdown-negotiation";
import { prefersMarkdown } from "~/utilities/prefers-markdown";

/** A `<script>` with no `src` attribute. Group 1 is its text. */
const INLINE_SCRIPT = /<script\b(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g;

/** A page path with no trailing slash. The root stays `/`. */
function pageKey(path: string): string {
	return path.replace(/\/+$/, "") || "/";
}

/** The base64 SHA-256 of each inline script in `html`, for a CSP hash source. */
function inlineScriptHashes(html: string): string[] {
	return Array.from(html.matchAll(INLINE_SCRIPT), ([, text = ""]) =>
		createHash("sha256").update(text).digest("base64"),
	);
}

/** The HTML of the prerendered page at `path`, or `undefined` when the path is not a page. */
async function readPage(clientDirectory: string, path: string): Promise<string | undefined> {
	try {
		return await readFile(join(clientDirectory, path, "index.html"), "utf8");
	} catch {
		return undefined;
	}
}

/**
 * How the app server answers for the prerendered docs pages, so the answer
 * matches the one `app/entry.server.tsx` gives for a rendered page:
 *
 * - A page gets the document headers. Its CSP trusts the inline scripts of
 *   the file by hash, which the plugin reads once, at startup.
 * - A request that prefers markdown gets the page's prerendered `.md` twin,
 *   with `Vary: Accept`.
 *
 * Put `plugin` in the pipeline and pass the rest to `prerendered`.
 *
 * @example
 * const { plugin, ...prerendered } = prerenderedDocuments();
 * defaultPlugins({ beforeStatic: [plugin], prerendered });
 */
export function prerenderedDocuments(): {
	plugin: Plugin;
} & Required<PrerenderedOptions> {
	let scriptHashes: ReadonlyMap<string, readonly string[]> = new Map();
	return {
		plugin: {
			name: "prerendered-documents",
			setup: async (info) => {
				if (info.mode !== "production") {
					return;
				}
				const entries = await Promise.all(
					info.prerenderedPaths.map(async (path) => {
						const html = await readPage(info.clientDirectory, path);
						return html == null ? [] : [[pageKey(path), inlineScriptHashes(html)] as const];
					}),
				);
				scriptHashes = new Map(entries.flat());
			},
		},
		rewrite: (path, context) =>
			(prefersMarkdown(context.req.raw) && markdownTwinPath(path)) || path,
		headers: (path, context) => {
			if (path !== context.req.path) {
				// Why: the request path answers HTML or markdown, so a cache must key on `Accept`.
				return { Vary: "Accept" };
			}
			const hashes = scriptHashes.get(pageKey(path));
			return hashes == null
				? undefined
				: documentHeaders({
						request: context.req.raw,
						scriptHashes: hashes,
						isDev: false,
						hasMarkdownVariant: hasMarkdownVariant(path),
					});
		},
	};
}
