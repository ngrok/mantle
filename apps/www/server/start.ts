import { existsSync, readdirSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { serve } from "@hono/node-server";
import pino from "pino";
import { createRequestHandler, type ServerBuild } from "react-router";
import { createApp } from "./app.ts";

/** Above the ngrok edge's 90 s idle pool, so the edge never reuses a socket that Node is closing. */
const KEEP_ALIVE_TIMEOUT_MS = 95_000;
/** How long open requests get to finish after a stop signal. */
const DRAIN_DEADLINE_MS = 10_000;

/** Every `.md` file under `directory`, as URL paths that start with `/`. */
function findMarkdownPaths(directory: string): Set<string> {
	return new Set(
		readdirSync(directory, { recursive: true, encoding: "utf8" })
			.filter((file) => file.endsWith(".md"))
			.map((file) => `/${file.split(sep).join("/")}`),
	);
}

/** Whether a prerendered path has its file: `<path>/index.html`, or the path itself for a resource. */
function hasPrerenderedFile(clientDirectory: string, path: string): boolean {
	return (
		existsSync(join(clientDirectory, path, "index.html")) || existsSync(join(clientDirectory, path))
	);
}

/**
 * Loads the server build and listens on `PORT` (default 3000) and `HOST`.
 * Logs JSON to stdout with pino. On `SIGTERM` or `SIGINT`, stops taking
 * connections, waits up to 10 s for open requests, then closes the rest.
 */
export async function start({ buildPath }: { buildPath: string }): Promise<void> {
	const log = pino({ base: { service: "mantle-www" } });
	const build: ServerBuild & { prerender?: unknown } = await import(
		pathToFileURL(resolve(buildPath)).href
	);
	const clientDirectory = relative(process.cwd(), resolve(build.assetsBuildDirectory));

	// Why warn: a prerendered path with no file falls through to SSR, which still answers.
	const prerendered = Array.isArray(build.prerender) ? build.prerender : [];
	const missing = prerendered.filter(
		(path): path is string =>
			typeof path === "string" && !hasPrerenderedFile(clientDirectory, path),
	);
	if (missing.length > 0) {
		log.warn({ missing }, "prerendered paths with no file");
	}

	const app = createApp({
		clientDirectory,
		markdownPaths: findMarkdownPaths(clientDirectory),
		handleRequest: createRequestHandler(build, process.env.NODE_ENV),
		log,
		trustForwardedProto: process.env.TRUST_FORWARDED_PROTO === "1",
	});

	const port = Number(process.env.PORT ?? 3000);
	const server = serve(
		{
			fetch: app.fetch,
			port,
			hostname: process.env.HOST,
			serverOptions: {
				keepAliveTimeout: KEEP_ALIVE_TIMEOUT_MS,
				headersTimeout: KEEP_ALIVE_TIMEOUT_MS + 1_000,
			},
		},
		(info) => {
			log.info({ port: info.port }, "listening");
		},
	);

	for (const signal of ["SIGTERM", "SIGINT"] as const) {
		process.once(signal, () => {
			log.info({ signal }, "draining");
			const deadline = setTimeout(() => {
				if ("closeAllConnections" in server) {
					server.closeAllConnections();
				}
			}, DRAIN_DEADLINE_MS);
			deadline.unref();
			server.close((error) => {
				if (error != null) {
					log.error({ error: { message: error.message } }, "close failed");
					process.exitCode = 1;
				}
			});
			if ("closeIdleConnections" in server) {
				server.closeIdleConnections();
			}
		});
	}
}
