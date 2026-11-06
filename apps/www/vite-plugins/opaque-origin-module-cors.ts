import type { IncomingHttpHeaders } from "node:http";
import type { Plugin } from "vite";

/** The request destinations of a module script, a stylesheet, and a font. */
const MODULE_DESTINATIONS = new Set(["script", "style", "font"]);

/**
 * The dev server paths that the prototype frame loads. Each one serves a file
 * of the public repository or a dependency, never `local/` or a file at the
 * repository root.
 *
 * @example
 * publicModulePaths("/Users/me/mantle"); // => ["/app/", …, "/@fs/Users/me/mantle/packages/", …]
 */
export function publicModulePaths(workspaceRoot: string): string[] {
	return [
		"/app/",
		"/@vite/",
		"/@id/",
		"/node_modules/",
		"/fonts/",
		`/@fs${workspaceRoot}/packages/`,
		`/@fs${workspaceRoot}/node_modules/`,
	];
}

/**
 * Whether the dev server lets a request read its response across origins: a
 * module script, a stylesheet, or a font that an opaque-origin document loads
 * from a public path. A browser sends an opaque origin as `Origin: null` for
 * any site's sandboxed frame, so the path limit is the boundary.
 *
 * @example
 * allowsOpaqueOriginLoad({
 *   headers: { origin: "null", "sec-fetch-dest": "script" },
 *   url: "/app/root.tsx",
 *   publicPaths: ["/app/"],
 * }); // => true
 */
export function allowsOpaqueOriginLoad({
	headers,
	url,
	publicPaths,
}: {
	headers: IncomingHttpHeaders;
	url: string;
	publicPaths: readonly string[];
}): boolean {
	const destination = headers["sec-fetch-dest"];
	if (
		headers.origin !== "null" ||
		typeof destination !== "string" ||
		!MODULE_DESTINATIONS.has(destination)
	) {
		return false;
	}
	// Why the URL parser: it resolves `..` and `%2e%2e`, so a path cannot climb out of a public prefix.
	const { pathname } = new URL(url, "http://dev.invalid");
	return publicPaths.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Lets the MCP prototype frame load its modules from the dev server. The frame
 * has an opaque origin, so it loads them with `Origin: null`. Vite's own CORS
 * check stays in force for every other request.
 */
export function opaqueOriginModuleCors({ workspaceRoot }: { workspaceRoot: string }): Plugin {
	const publicPaths = publicModulePaths(workspaceRoot);
	return {
		name: "opaque-origin-module-cors",
		apply: "serve",
		configureServer(server) {
			server.middlewares.use((request, response, next) => {
				if (
					allowsOpaqueOriginLoad({ headers: request.headers, url: request.url ?? "", publicPaths })
				) {
					response.setHeader("Access-Control-Allow-Origin", "null");
					response.setHeader("Vary", "Origin, Sec-Fetch-Dest");
				}
				next();
			});
		},
	};
}
