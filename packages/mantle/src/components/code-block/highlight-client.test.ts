import { beforeEach, describe, expect, test, vi } from "vitest";
import type { HighlightRequest, HighlightResponse } from "./highlight-protocol.js";
import type { LineTokenizerResult } from "./line-tokenizer.js";

/** A worker that records each request and replies only when a test tells it to. */
class FakeWorker extends EventTarget {
	static instances: FakeWorker[] = [];
	requests: HighlightRequest[] = [];
	terminated = false;

	constructor() {
		super();
		FakeWorker.instances.push(this);
	}

	postMessage(request: HighlightRequest) {
		this.requests.push(request);
	}

	terminate() {
		this.terminated = true;
	}

	highlights() {
		return this.requests.filter((request) => request.type === "highlight");
	}

	reply(response: HighlightResponse) {
		this.dispatchEvent(new MessageEvent("message", { data: response }));
	}
}

function linesOf(code: string): LineTokenizerResult {
	const lines = code.split("\n").map((content) => [{ content }]);
	return { start: 0, lines, lineCount: lines.length };
}

function textOf(result: LineTokenizerResult | undefined): string[] | undefined {
	return result?.lines.map((line) => line.map((token) => token.content).join(""));
}

describe("highlight client", () => {
	beforeEach(() => {
		FakeWorker.instances = [];
		vi.resetModules();
		vi.stubGlobal("Worker", FakeWorker);
	});

	test("sends only the newest code while a request is in flight, and drops a reply after dispose", async () => {
		const { createStreamId, dispose, openStream, send } = await import("./highlight-client.js");
		const results: LineTokenizerResult[] = [];
		const id = createStreamId();
		openStream(id, "json", (result) => results.push(result));
		send(id, "{");
		const worker = FakeWorker.instances[0];
		await vi.waitFor(() => expect(worker?.highlights()).toHaveLength(1));
		send(id, "{\n");
		send(id, '{\n  "a": 1');
		expect(worker?.highlights()).toHaveLength(1);

		const first = worker?.highlights()[0];
		worker?.reply({
			type: "lines",
			id: first?.type === "highlight" ? first.id : -1,
			...linesOf("{"),
		});
		expect(results.map(textOf)).toEqual([["{"]]);
		await vi.waitFor(() =>
			expect(worker?.highlights().map((request) => request.code)).toEqual(["{", '{\n  "a": 1']),
		);

		dispose(id);
		const second = worker?.highlights()[1];
		worker?.reply({
			type: "lines",
			id: second?.type === "highlight" ? second.id : -1,
			...linesOf('{\n  "a": 1'),
		});
		expect(results).toHaveLength(1);
	});

	test("drops a reply for the old grammar after a block changes its grammar", async () => {
		const { createStreamId, openStream, send } = await import("./highlight-client.js");
		const results: LineTokenizerResult[] = [];
		const id = createStreamId();
		openStream(id, "json", (result) => results.push(result));
		send(id, "{}");
		const worker = FakeWorker.instances[0];
		await vi.waitFor(() => expect(worker?.highlights()).toHaveLength(1));
		const old = worker?.highlights()[0];

		openStream(id, "yaml", (result) => results.push(result));
		worker?.reply({ type: "lines", id: old?.type === "highlight" ? old.id : -1, ...linesOf("{}") });
		expect(results).toEqual([]);
	});

	test("highlights on the main thread after the worker fails, with the newest code", async () => {
		const { createStreamId, openStream, send } = await import("./highlight-client.js");
		const results: LineTokenizerResult[] = [];
		const id = createStreamId();
		openStream(id, "json", (result) => results.push(result));
		send(id, "{");
		const worker = FakeWorker.instances[0];
		await vi.waitFor(() => expect(worker?.highlights()).toHaveLength(1));
		send(id, '{"a": 1}');

		worker?.dispatchEvent(new Event("error"));
		expect(worker?.terminated).toBe(true);
		await vi.waitFor(() => expect(results.map(textOf)).toEqual([['{"a": 1}']]), { timeout: 5000 });
		// The main thread tokenizes: each line has more than one colored token.
		expect(results[0]?.lines[0]?.length).toBeGreaterThan(1);

		send(id, '{"a": 2}');
		await vi.waitFor(() => expect(results).toHaveLength(2), { timeout: 5000 });
		expect(FakeWorker.instances).toHaveLength(1);
	});
});
