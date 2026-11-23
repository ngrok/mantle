/**
 * The highlight requests of each streamed code block, sent to one shared
 * module worker, or to the main thread when the worker cannot run.
 * `useCodeBlockStream` is the only caller.
 */

import { loadGrammar, type GrammarId } from "./grammars.js";
import type { HighlightRequest, HighlightResponse } from "./highlight-protocol.js";
import type { CodeLine, LineTokenizerResult, LineTokenizerState } from "./line-tokenizer.js";

type Listener = (result: LineTokenizerResult) => void;

/**
 * One block's highlight requests: the listener, the code of the request in
 * flight, and the newest code that waits for it.
 */
type Stream = {
	listener: Listener;
	grammar: GrammarId;
	inFlight: string | undefined;
	queued: string | undefined;
};

const streams = new Map<number, Stream>();
let lastStreamId = 0;
/** The shared worker; `null` after it failed, so each request runs on the main thread. */
let worker: Worker | null | undefined;
/** The grammars that the worker has, and the grammars that the main thread has, each by its first load. */
const workerGrammars = new Map<GrammarId, Promise<void>>();
const mainGrammars = new Map<GrammarId, Promise<void>>();
const mainStates = new Map<number, LineTokenizerState>();

function getWorker(): Worker | null {
	if (worker !== undefined) {
		return worker;
	}
	try {
		worker = new Worker(new URL("./highlight-worker.js", import.meta.url), { type: "module" });
	} catch {
		// Why a fallback: a CSP without `worker-src 'self'` or a bundler that drops the worker throws here.
		worker = null;
		return worker;
	}
	worker.addEventListener("message", (event: MessageEvent<HighlightResponse>) => {
		const response = event.data;
		if (response.type === "lines") {
			deliver(response.id, response);
		} else {
			failWorker();
		}
	});
	worker.addEventListener("error", failWorker);
	return worker;
}

/** Moves each block to the main-thread tokenizer when the worker cannot load or run. */
function failWorker() {
	worker?.terminate();
	worker = null;
	for (const [id, stream] of streams) {
		const code = stream.queued ?? stream.inFlight;
		stream.inFlight = undefined;
		stream.queued = undefined;
		if (code !== undefined) {
			send(id, code);
		}
	}
}

function deliver(id: number, result: LineTokenizerResult) {
	const stream = streams.get(id);
	if (stream == null) {
		return;
	}
	stream.listener(result);
	stream.inFlight = undefined;
	const queued = stream.queued;
	stream.queued = undefined;
	if (queued !== undefined) {
		send(id, queued);
	}
}

/** Highlights one block on the main thread, for when the worker cannot run. */
async function tokenizeOnMainThread(id: number, code: string, grammar: GrammarId) {
	const { registerGrammar, tokenizeChangedLines } = await import("./line-tokenizer.js");
	let registered = mainGrammars.get(grammar);
	if (registered == null) {
		registered = loadGrammar(grammar).then(registerGrammar);
		mainGrammars.set(grammar, registered);
	}
	await registered;
	let state = mainStates.get(id);
	if (state == null) {
		state = { lines: [], endStates: [] };
		mainStates.set(id, state);
	}
	return tokenizeChangedLines({ state, code, grammar });
}

/**
 * Sends one block's code to the tokenizer, or queues it while a request is in
 * flight. Only the newest queued code goes next, so a fast stream costs one
 * request at a time for each block. The first block of a grammar loads it on
 * the main thread, as its own chunk, and sends it to the worker.
 */
function send(id: number, code: string) {
	const stream = streams.get(id);
	if (stream == null) {
		return;
	}
	if (stream.inFlight !== undefined) {
		stream.queued = code;
		return;
	}
	stream.inFlight = code;
	const target = getWorker();
	if (target == null) {
		void highlightOnMainThread(id, code, stream.grammar);
	} else {
		void highlightInWorker(target, { id, code, grammar: stream.grammar });
	}
}

async function highlightOnMainThread(id: number, code: string, grammar: GrammarId) {
	let result: LineTokenizerResult;
	try {
		result = await tokenizeOnMainThread(id, code, grammar);
	} catch {
		// Why no retry: the grammar failed to load, so the block stays plain text.
		streams.delete(id);
		return;
	}
	deliver(id, result);
}

async function highlightInWorker(
	target: Worker,
	{ id, code, grammar }: { id: number; code: string; grammar: GrammarId },
) {
	let sent = workerGrammars.get(grammar);
	if (sent == null) {
		sent = sendGrammar(target, grammar);
		workerGrammars.set(grammar, sent);
	}
	try {
		await sent;
	} catch {
		streams.delete(id);
		return;
	}
	// Why the check: the worker can fail while the grammar loads, and `failWorker` already sent this code again.
	if (worker === target && streams.get(id)?.inFlight === code) {
		post(target, { type: "highlight", id, code, grammar });
	}
}

async function sendGrammar(target: Worker, grammar: GrammarId) {
	post(target, { type: "grammar", grammar, registrations: await loadGrammar(grammar) });
}

function post(target: Worker, request: HighlightRequest) {
	// oxlint-disable-next-line unicorn/require-post-message-target-origin -- Why: `Worker.postMessage` has no `targetOrigin`, unlike `Window.postMessage`.
	target.postMessage(request);
}

/** Stops one block's requests and drops its tokenizer state. */
function dispose(id: number) {
	streams.delete(id);
	mainStates.delete(id);
	if (worker != null) {
		post(worker, { type: "dispose", id });
	}
}

/** The text of each highlighted line, so a render compares a line to the code without a join for each frame. */
const lineTexts = new WeakMap<CodeLine, string>();

function lineText(line: CodeLine): string {
	let text = lineTexts.get(line);
	if (text == null) {
		text = line.map((token) => token.content).join("");
		lineTexts.set(line, text);
	}
	return text;
}

/**
 * Returns each line of `code`: the highlighted line when its tokens match the
 * line's text, else the text itself. A line whose tokens are for older text
 * shows plain until its new tokens arrive, so a line never shows stale text.
 */
function resolveLines(code: string, highlighted: readonly CodeLine[]): (CodeLine | string)[] {
	return code.split("\n").map((text, index) => {
		const line = highlighted[index];
		return line != null && lineText(line) === text ? line : text;
	});
}

/** A new block ID, unique on the page. */
function createStreamId(): number {
	lastStreamId += 1;
	return lastStreamId;
}

/**
 * Starts the requests of one block for `grammar`, and calls `listener` with
 * each result. A block that changes its grammar starts again with no state.
 */
function openStream(id: number, grammar: GrammarId, listener: Listener) {
	if (streams.get(id)?.grammar === grammar) {
		return;
	}
	// Why a reset: tokens and grammar states of another language do not carry over.
	dispose(id);
	streams.set(id, { listener, grammar, inFlight: undefined, queued: undefined });
}

export {
	//,
	createStreamId,
	dispose,
	openStream,
	resolveLines,
	send,
};
