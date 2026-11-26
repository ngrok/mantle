import type { LanguageRegistration } from "@shikijs/core";
import type { GrammarId } from "./grammars.js";
import type { LineTokenizerResult } from "./line-tokenizer.js";
import type { SupportedLanguage } from "./supported-languages.js";

/**
 * A message to the highlight worker. `id` names one block's stream for one grammar. A `grammar`
 * message comes before the first `highlight` message of its grammar.
 */
type HighlightRequest =
	| { type: "grammar"; grammar: GrammarId; registrations: LanguageRegistration[] }
	| {
			type: "highlight";
			id: number;
			code: string;
			grammar: GrammarId;
			/** Set when the code is final: the reply carries its fold ranges, as this language. */
			foldLanguage?: SupportedLanguage | undefined;
	  }
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
