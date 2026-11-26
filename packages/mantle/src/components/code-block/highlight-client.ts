/**
 * The highlight requests of each streamed code block, sent to one shared
 * module worker, or to the main thread when the worker cannot run.
 * `useCodeBlockStream` is the only caller.
 */

import { loadGrammar, type GrammarId } from "./grammars.js";
import type { HighlightRequest, HighlightResponse } from "./highlight-protocol.js";
import type { CodeLine, LineTokenizerResult, LineTokenizerState } from "./line-tokenizer.js";
import type { SupportedLanguage } from "./supported-languages.js";

/** Gets each result with the code it is for, so fold ranges never reach other code. */
type Listener = (result: LineTokenizerResult, code: string) => void;

/**
 * One block's highlight requests for one grammar: the listener, the code of
 * the request in flight, and the newest code that waits for it. `key` names
 * the requests to the tokenizer. Why apart from the block ID: a block that
 * changes its grammar opens a new stream, and a result for the old one must
 * not reach it.
 */
type Stream = {
	id: number;
	key: number;
	listener: Listener;
	grammar: GrammarId;
	inFlight: string | undefined;
	queued: string | undefined;
	/** The language of the request in flight's fold ranges, when its code is final. */
	foldLanguage: SupportedLanguage | undefined;
	/** The same for the queued code. Why apart: a final request must not make the one in flight compute folds too. */
	queuedFoldLanguage: SupportedLanguage | undefined;
};

const streams = new Map<number, Stream>();
const streamsByKey = new Map<number, Stream>();
let lastStreamId = 0;
let lastKey = 0;
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
		const stream = streamsByKey.get(response.id);
		if (stream == null) {
			// Why: the block closed or changed its grammar after its request.
			return;
		}
		if (response.type === "lines") {
			deliver(stream, response);
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
	for (const stream of streams.values()) {
		const isQueued = stream.queued !== undefined;
		const code = stream.queued ?? stream.inFlight;
		stream.inFlight = undefined;
		stream.queued = undefined;
		if (code !== undefined) {
			send(stream.id, code, isQueued ? stream.queuedFoldLanguage : stream.foldLanguage);
		}
	}
}

/** Gives a result to its stream, unless the block closed or opened a new stream since the request. */
function deliver(stream: Stream, result: LineTokenizerResult) {
	if (streams.get(stream.id) !== stream) {
		return;
	}
	stream.listener(result, stream.inFlight ?? "");
	stream.inFlight = undefined;
	const queued = stream.queued;
	stream.queued = undefined;
	if (queued !== undefined) {
		send(stream.id, queued, stream.queuedFoldLanguage);
	}
}

/**
 * Highlights one block on the main thread, for when the worker cannot run.
 * Returns `undefined` when the stream closed while its grammar loaded.
 */
async function tokenizeOnMainThread(stream: Stream, code: string) {
	const { registerGrammar, tokenizeChangedLines } = await import("./line-tokenizer.js");
	const { key, grammar } = stream;
	let registered = mainGrammars.get(grammar);
	if (registered == null) {
		registered = loadGrammar(grammar).then(registerGrammar);
		mainGrammars.set(grammar, registered);
	}
	await registered;
	// Why the check: a closed stream must not create its state again.
	if (streams.get(stream.id) !== stream) {
		return undefined;
	}
	let state = mainStates.get(key);
	if (state == null) {
		state = { lines: [], endStates: [] };
		mainStates.set(key, state);
	}
	return tokenizeChangedLines({ state, code, grammar, foldLanguage: stream.foldLanguage });
}

/**
 * Sends one block's code to the tokenizer, or queues it while a request is in
 * flight. Only the newest queued code goes next, so a fast stream costs one
 * request at a time for each block. The first block of a grammar loads it on
 * the main thread, as its own chunk, and sends it to the worker.
 *
 * Pass `foldLanguage` when the code is final: the result then carries the
 * block's fold ranges.
 */
function send(id: number, code: string, foldLanguage?: SupportedLanguage) {
	const stream = streams.get(id);
	if (stream == null) {
		return;
	}
	if (stream.inFlight !== undefined) {
		stream.queued = code;
		stream.queuedFoldLanguage = foldLanguage;
		return;
	}
	stream.inFlight = code;
	stream.foldLanguage = foldLanguage;
	const target = getWorker();
	if (target == null) {
		void highlightOnMainThread(stream, code);
	} else {
		void highlightInWorker(target, stream, code);
	}
}

async function highlightOnMainThread(stream: Stream, code: string) {
	let result: LineTokenizerResult | undefined;
	try {
		result = await tokenizeOnMainThread(stream, code);
	} catch {
		// Why no retry: the grammar failed to load, so the block stays plain text.
		close(stream);
		return;
	}
	if (result !== undefined) {
		deliver(stream, result);
	}
}

async function highlightInWorker(target: Worker, stream: Stream, code: string) {
	let sent = workerGrammars.get(stream.grammar);
	if (sent == null) {
		sent = sendGrammar(target, stream.grammar);
		workerGrammars.set(stream.grammar, sent);
	}
	try {
		await sent;
	} catch {
		close(stream);
		return;
	}
	// Why the check: the worker can fail while the grammar loads, and `failWorker` already sent this code again.
	if (worker === target && streams.get(stream.id) === stream && stream.inFlight === code) {
		post(target, {
			type: "highlight",
			id: stream.key,
			code,
			grammar: stream.grammar,
			foldLanguage: stream.foldLanguage,
		});
	}
}

async function sendGrammar(target: Worker, grammar: GrammarId) {
	post(target, { type: "grammar", grammar, registrations: await loadGrammar(grammar) });
}

function post(target: Worker, request: HighlightRequest) {
	// oxlint-disable-next-line unicorn/require-post-message-target-origin -- Why: `Worker.postMessage` has no `targetOrigin`, unlike `Window.postMessage`.
	target.postMessage(request);
}

/** Stops the requests of one stream and drops its tokenizer state. */
function close(stream: Stream) {
	if (streams.get(stream.id) === stream) {
		streams.delete(stream.id);
	}
	streamsByKey.delete(stream.key);
	mainStates.delete(stream.key);
	if (worker != null) {
		post(worker, { type: "dispose", id: stream.key });
	}
}

/** Stops one block's requests and drops its tokenizer state. */
function dispose(id: number) {
	const stream = streams.get(id);
	if (stream != null) {
		close(stream);
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
	lastKey += 1;
	const stream: Stream = {
		id,
		key: lastKey,
		listener,
		grammar,
		inFlight: undefined,
		queued: undefined,
		foldLanguage: undefined,
		queuedFoldLanguage: undefined,
	};
	streams.set(id, stream);
	streamsByKey.set(stream.key, stream);
}

export {
	//,
	createStreamId,
	dispose,
	openStream,
	resolveLines,
	send,
};
