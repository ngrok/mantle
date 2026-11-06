import type { IncomingHttpHeaders } from "node:http";
import type { Plugin } from "vite";

/** The request destinations of a module script and a stylesheet. */
const MODULE_DESTINATIONS = new Set(["script", "style"]);

/**
 * Whether the dev server lets a request read its response across origins: a
 * module script or a stylesheet that an opaque-origin document loads. A
 * `fetch` has the destination `empty`, so another site cannot read the source
 * this way.
 *
 * @example
 * allowsOpaqueOriginLoad({ origin: "null", "sec-fetch-dest": "script" }); // => true
 * allowsOpaqueOriginLoad({ origin: "null", "sec-fetch-dest": "empty" }); // => false
 */
export function allowsOpaqueOriginLoad(headers: IncomingHttpHeaders): boolean {
	const destination = headers["sec-fetch-dest"];
	return (
		headers.origin === "null" &&
		typeof destination === "string" &&
		MODULE_DESTINATIONS.has(destination)
	);
}

/**
 * Lets the MCP prototype frame load its modules from the dev server. The frame
 * has an opaque origin, so it loads them with `Origin: null`. Vite's own CORS
 * check stays in force for every other request.
 */
export function opaqueOriginModuleCors(): Plugin {
	return {
		name: "opaque-origin-module-cors",
		apply: "serve",
		configureServer(server) {
			server.middlewares.use((request, response, next) => {
				if (allowsOpaqueOriginLoad(request.headers)) {
					response.setHeader("Access-Control-Allow-Origin", "null");
					response.setHeader("Vary", "Origin, Sec-Fetch-Dest");
				}
				next();
			});
		},
	};
}
