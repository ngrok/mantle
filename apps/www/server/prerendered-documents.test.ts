import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { nodeFiles } from "@ngrok/app-server/node";
import { afterAll, describe, expect, it } from "vitest";
import { prerenderedDocuments } from "./prerendered-documents.ts";

const PAGE = "/components/actions/button";
const THEME_SCRIPT = "document.documentElement.dataset.theme = 'dark';";
const CONTEXT_SCRIPT = "window.__reactRouterContext = {};";

const clientDirectory = mkdtempSync(join(tmpdir(), "www-prerendered-documents-"));
mkdirSync(join(clientDirectory, PAGE), { recursive: true });
writeFileSync(
	join(clientDirectory, PAGE, "index.html"),
	`<html><head><script nonce="baked">${THEME_SCRIPT}</script><script type="module" src="/assets/x.js"></script></head><body><script nonce="baked">${CONTEXT_SCRIPT}</script></body></html>`,
);
writeFileSync(join(clientDirectory, "llms.txt"), "llms");

afterAll(() => {
	rmSync(clientDirectory, { recursive: true, force: true });
});

async function preparedDocuments() {
	const documents = prerenderedDocuments();
	await documents.plugin.setup?.({
		mode: "production",
		files: nodeFiles(clientDirectory),
		prerenderedPaths: [PAGE, "/llms.txt"],
		capturedHeaders: new Map(),
		isDataRequest: () => false,
		contentTypes: {},
		gzip: undefined,
		logger: { log: () => {} },
	});
	return documents;
}

type Context = Parameters<ReturnType<typeof prerenderedDocuments>["headers"]>[1];

function contextFor(path: string, accept = "text/html"): Context {
	const raw = new Request(`https://mantle.ngrok.com${path}`, { headers: { Accept: accept } });
	// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the callbacks read only `req.raw` and `req.path`.
	return { req: { raw, path } } as unknown as Context;
}

const sha256 = (text: string) => `'sha256-${createHash("sha256").update(text).digest("base64")}'`;

describe("prerenderedDocuments", () => {
	it("gives a prerendered page a CSP with the hash of each inline script", async () => {
		const { headers } = await preparedDocuments();

		const csp = headers(PAGE, contextFor(PAGE))?.["Content-Security-Policy"];

		expect(csp).toContain(`script-src 'self' ${sha256(THEME_SCRIPT)} ${sha256(CONTEXT_SCRIPT)};`);
		expect(csp).not.toContain("nonce");
	});

	it("keys a docs page's cache on Accept, because it has a markdown twin", async () => {
		const { headers } = await preparedDocuments();

		expect(headers(PAGE, contextFor(PAGE))?.Vary).toBe("x-ngrok-edge, Accept");
	});

	it("leaves a file that is not a prerendered page alone", async () => {
		const { headers } = await preparedDocuments();

		expect(headers("/llms.txt", contextFor("/llms.txt"))).toBeUndefined();
	});

	it("serves the markdown twin, with Vary: Accept, to a request that prefers markdown", async () => {
		const { headers, rewrite } = await preparedDocuments();
		const context = contextFor(PAGE, "text/markdown");

		const twin = rewrite(PAGE, context);

		expect(twin).toBe(`${PAGE}.md`);
		expect(headers(twin, context)).toEqual({ Vary: "Accept" });
	});

	it("serves the markdown twin to a request for the page with a trailing slash", async () => {
		const { headers, rewrite } = await preparedDocuments();

		expect(rewrite(`${PAGE}/`, contextFor(`${PAGE}/`, "text/markdown"))).toBe(`${PAGE}.md`);
		expect(headers(`${PAGE}/`, contextFor(`${PAGE}/`))?.Vary).toBe("x-ngrok-edge, Accept");
	});

	it("serves the page itself to a browser and to a path with no markdown", async () => {
		const { rewrite } = await preparedDocuments();

		expect(rewrite(PAGE, contextFor(PAGE, "text/html,*/*;q=0.8"))).toBe(PAGE);
		expect(rewrite("/llms.txt", contextFor("/llms.txt", "text/markdown"))).toBe("/llms.txt");
	});
});
