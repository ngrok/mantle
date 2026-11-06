// The docs site's app server. The `appServer` Vite plugin finds this file and bundles it into
// `build/server/app-server.js`.
import type { Plugin } from "@ngrok/app-server";
import { createServer, defaultPlugins, withHeaderHook } from "@ngrok/app-server";
import { allowsIndexing, EDGE_HEADER } from "~/utilities/indexing";

/** True for a framed example preview (`/preview/:exampleName`), which a docs page shows in an iframe. */
function isPreviewDocument(path: string): boolean {
	return path === "/preview" || path.startsWith("/preview/");
}

/**
 * Keeps an HTML document out of search indexes when the request did not come
 * through mantle.ngrok.com, and keeps a framed example preview out always: it
 * is a fragment of its docs page.
 */
const documentIndexing: Plugin = {
	name: "document-indexing",
	middleware: (context, next) =>
		withHeaderHook(context, next, (headers) => {
			if (!headers.get("Content-Type")?.startsWith("text/html")) {
				return;
			}
			// Why: the edge and a direct request get different headers, so a cache must key on it.
			headers.append("Vary", EDGE_HEADER);
			if (!allowsIndexing(context.req.raw) || isPreviewDocument(context.req.path)) {
				headers.set("X-Robots-Tag", "noindex, nofollow");
			}
		}),
};

/**
 * The docs site's app: the default plugins, with a CSP for each document, the
 * indexing rule, and the markdown twin of each docs page. A test makes a new
 * one for each server, because an app runs the `setup` of its plugins one time.
 *
 * @example
 * const app = createDocsServer();
 */
export function createDocsServer() {
	return createServer({
		plugins: defaultPlugins({
			contentSecurityPolicy: {
				policy: (scriptSrc, context) =>
					[
						`script-src ${scriptSrc}`,
						"base-uri 'self'",
						"object-src 'none'",
						"worker-src 'self' blob:",
						// Why: a docs page frames its example previews. Each other document refuses a frame.
						`frame-ancestors ${isPreviewDocument(context.req.path) ? "'self'" : "'none'"}`,
					].join("; "),
			},
			beforeStatic: [documentIndexing],
			prerendered: { markdownTwins: true },
		}),
		trustForwardedProto: process.env.TRUST_FORWARDED_PROTO === "1",
	});
}

export default createDocsServer();
