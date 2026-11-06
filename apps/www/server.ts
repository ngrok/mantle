// The docs site's app server. The `appServer` Vite plugin finds this file and bundles it into
// `build/server/app-server.js`.
import type { Plugin } from "@ngrok/app-server";
import { createServer, defaultPlugins, withHeaderHook } from "@ngrok/app-server";
import { assetsCdnOrigin } from "@ngrok/mantle/theme";
import { canonicalOrigin } from "~/utilities/canonical-origin";
import { allowsIndexing, EDGE_HEADER } from "~/utilities/indexing";

/** True for a framed example preview (`/preview/:exampleName`), which a docs page shows in an iframe. */
function isPreviewDocument(path: string): boolean {
	return path === "/preview" || path.startsWith("/preview/");
}

/** True for the sandboxed frame that runs an MCP prototype from a link. */
function isPrototypeFrame(path: string): boolean {
	return path === "/mcp/preview-frame";
}

/**
 * The CSP of the prototype frame. The policy repeats the frame's `sandbox`, so
 * the document has an opaque origin also when someone opens it outside the
 * preview page. `default-src 'none'` blocks each request that the frame does
 * not need, so the code cannot send data out. `'unsafe-eval'` lets the frame
 * run the compiled prototype.
 *
 * Why no `'strict-dynamic'`: it lets the prototype add a script from any host.
 * The frame loads its own modules from `'self'` instead.
 */
function prototypeFramePolicy(scriptSrc: string): string {
	const trustedScripts = scriptSrc
		.split(" ")
		.filter((source) => source !== "'strict-dynamic'")
		.join(" ");
	const pageOrigins = [canonicalOrigin, process.env.MANTLE_PREVIEW_ORIGIN].filter(Boolean);
	return [
		"default-src 'none'",
		`script-src ${trustedScripts} 'self' 'unsafe-eval'`,
		"style-src 'self' 'unsafe-inline'",
		`img-src 'self' data: blob: ${assetsCdnOrigin}`,
		`font-src 'self' ${assetsCdnOrigin}`,
		"form-action 'none'",
		"base-uri 'none'",
		`frame-ancestors 'self' ${pageOrigins.join(" ")}`,
		"sandbox allow-scripts",
	].join("; ");
}

/**
 * Lets any origin load a build asset. The prototype frame has an opaque
 * origin, so it loads its module scripts in CORS mode with `Origin: null`.
 */
const assetsCors: Plugin = {
	name: "assets-cors",
	middleware: (context, next) =>
		context.req.path.startsWith("/assets/")
			? withHeaderHook(context, next, (headers) => {
					headers.set("Access-Control-Allow-Origin", "*");
				})
			: next(),
};

/**
 * Keeps an HTML document out of search indexes when the request did not come
 * through mantle.ngrok.com, and keeps a framed example preview out always: it
 * is a fragment of its docs page.
 */
const documentIndexing: Plugin = {
	name: "document-indexing",
	middleware: (context, next) =>
		withHeaderHook(context, next, (headers) => {
			// Why `staticDocument`: a 304 for a prerendered page has no `Content-Type`, and it must keep the `Vary`.
			const isDocument =
				context.get("staticDocument") != null ||
				headers.get("Content-Type")?.startsWith("text/html") === true;
			if (!isDocument) {
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
					isPrototypeFrame(context.req.path)
						? prototypeFramePolicy(scriptSrc)
						: [
								`script-src ${scriptSrc}`,
								"base-uri 'self'",
								"object-src 'none'",
								"worker-src 'self' blob:",
								// Why: a docs page frames its example previews. Each other document refuses a frame.
								`frame-ancestors ${isPreviewDocument(context.req.path) ? "'self'" : "'none'"}`,
							].join("; "),
			},
			beforeStatic: [documentIndexing, assetsCors],
			prerendered: { markdownTwins: true },
		}),
		trustForwardedProto: process.env.TRUST_FORWARDED_PROTO === "1",
	});
}

export default createDocsServer();
