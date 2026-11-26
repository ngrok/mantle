/**
 * The module worker that highlights streamed code off the main thread.
 * `use-code-block-stream.tsx` starts it and sends each grammar before the
 * first block of that grammar. Each highlight message carries one block's
 * whole code, and the reply carries only the lines that changed.
 */

import type { GrammarId } from "./grammars.js";
import type { HighlightRequest, HighlightResponse } from "./highlight-protocol.js";
import {
	registerGrammar,
	tokenizeChangedLines,
	type LineTokenizerResult,
	type LineTokenizerState,
} from "./line-tokenizer.js";

const states = new Map<number, LineTokenizerState>();
const grammars = new Map<GrammarId, Promise<void>>();

// Why no `self`: the global `addEventListener` and `postMessage` are the worker scope's.
addEventListener("message", (event: MessageEvent<HighlightRequest>) => {
	const request = event.data;
	if (request.type === "grammar") {
		grammars.set(request.grammar, registerGrammar(request.registrations));
		return;
	}
	if (request.type === "dispose") {
		states.delete(request.id);
		return;
	}
	let state = states.get(request.id);
	if (state == null) {
		state = { lines: [], endStates: [] };
		states.set(request.id, state);
	}
	const blockState = state;
	void highlight(request.id, async () => {
		await (grammars.get(request.grammar) ??
			Promise.reject(new Error(`No grammar for ${request.grammar}.`)));
		return tokenizeChangedLines({
			state: blockState,
			code: request.code,
			grammar: request.grammar,
			foldLanguage: request.foldLanguage,
		});
	});
});

/** Posts the changed lines of one block, or the error that stopped them. */
async function highlight(id: number, tokenize: () => Promise<LineTokenizerResult>) {
	try {
		postMessage({ type: "lines", id, ...(await tokenize()) } satisfies HighlightResponse);
	} catch (error) {
		postMessage({
			type: "error",
			id,
			message: error instanceof Error ? error.message : String(error),
		} satisfies HighlightResponse);
	}
}
