import type { LanguageRegistration } from "@shikijs/core";
import type { GrammarId } from "./grammars.js";
import type { LineTokenizerResult } from "./line-tokenizer.js";

/**
 * A message to the highlight worker. `id` names one code block. A `grammar`
 * message comes before the first `highlight` message of its grammar.
 */
type HighlightRequest =
	| { type: "grammar"; grammar: GrammarId; registrations: LanguageRegistration[] }
	| { type: "highlight"; id: number; code: string; grammar: GrammarId }
	| { type: "dispose"; id: number };

/** A message from the highlight worker. */
type HighlightResponse =
	| ({ type: "lines"; id: number } & LineTokenizerResult)
	| { type: "error"; id: number; message: string };

export type {
	//,
	HighlightRequest,
	HighlightResponse,
};
