// A worker thread for scripts/tailwind-canonical.ts: scans files and
// canonicalizes classes for the main thread, with its own design systems.

import { parentPort } from "node:worker_threads";

import { canonicalForms, loadDesignSystem, scanFile } from "./tailwind-canonical.ts";
import type { WorkerRequest, WorkerResponse } from "./tailwind-canonical.ts";

if (parentPort == null) {
	throw new Error("tailwind-canonical-worker.ts runs only as a worker thread");
}
const port = parentPort;

async function handle(request: WorkerRequest): Promise<WorkerResponse> {
	switch (request.type) {
		case "scan": {
			const results = [];
			for (const file of request.files) {
				results.push(await scanFile(file));
			}
			return { id: request.id, type: "scanned", results };
		}
		case "canonicalize": {
			const designSystem = await loadDesignSystem(request.cssEntry);
			return {
				id: request.id,
				type: "canonicalized",
				forms: canonicalForms(designSystem, request.candidates),
			};
		}
	}
}

async function respond(request: WorkerRequest): Promise<void> {
	let response: WorkerResponse;
	try {
		response = await handle(request);
	} catch (error) {
		response = {
			id: request.id,
			type: "failed",
			message: error instanceof Error ? error.message : String(error),
		};
	}
	// oxlint-disable-next-line unicorn/require-post-message-target-origin -- a worker port takes no origin
	port.postMessage(response);
}

port.on("message", (request: WorkerRequest) => {
	void respond(request);
});
