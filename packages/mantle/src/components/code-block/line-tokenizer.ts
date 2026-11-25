import {
	createCssVariablesTheme,
	createHighlighterCore,
	type GrammarState,
	type HighlighterCore,
	type LanguageRegistration,
} from "@shikijs/core";
import { createJavaScriptRegexEngine } from "@shikijs/engine-javascript";
import { mantleShikiThemeName, mantleShikiTokenColors } from "./shiki-theme.js";
import type { GrammarId } from "./grammars.js";

/**
 * One token of a highlighted line: its text, its color as a CSS value (a
 * `var(--shiki-token-*)` expression), and Shiki's font-style bit flags
 * (1 italic, 2 bold, 4 underline, 8 strikethrough).
 */
type CodeToken = {
	content: string;
	color?: string | undefined;
	fontStyle?: number | undefined;
};

/** One highlighted line: its tokens, in order. */
type CodeLine = readonly CodeToken[];

/**
 * What a tokenizer keeps for one code block between updates: each line's
 * text, and the grammar state at the end of each line.
 */
type LineTokenizerState = {
	lines: string[];
	endStates: (GrammarState | undefined)[];
};

/** The lines that changed since the last update of one block. */
type LineTokenizerResult = {
	/** The index of the first changed line. */
	start: number;
	/** The tokens of each line from `start` to the end. */
	lines: CodeLine[];
	/** The line count of the whole block. */
	lineCount: number;
};

let highlighterPromise: Promise<HighlighterCore> | undefined;

function getHighlighter(): Promise<HighlighterCore> {
	if (highlighterPromise == null) {
		const theme = createCssVariablesTheme({ name: mantleShikiThemeName });
		// Why after Shiki's own scopes: a more specific scope wins over its group.
		theme.tokenColors = [...(theme.tokenColors ?? []), ...mantleShikiTokenColors];
		// Why the regex engine: it runs a grammar's Oniguruma patterns as JavaScript, with no WebAssembly and no CSP change.
		highlighterPromise = createHighlighterCore({
			themes: [theme],
			engine: createJavaScriptRegexEngine(),
		});
	}
	return highlighterPromise;
}

/**
 * Adds a grammar and each grammar it embeds, from `loadGrammar`. Highlight a
 * block of the grammar only after this resolves.
 *
 * @example
 * await registerGrammar(await loadGrammar("yaml"));
 */
async function registerGrammar(registrations: LanguageRegistration[]): Promise<void> {
	const highlighter = await getHighlighter();
	await highlighter.loadLanguage(...registrations);
}

/**
 * Highlights the lines of `code` that changed since `state` saw it last, and
 * updates `state`. A finished line keeps its tokens, and the next line starts
 * from the grammar state at its end, so an appended line costs one line of
 * work, not the whole block.
 *
 * The grammar must be registered first, with `registerGrammar`.
 *
 * @example
 * const state = { lines: [], endStates: [] };
 * await tokenizeChangedLines({ state, code: "const a = 1;\nconst b", grammar: "typescript" });
 * // { start: 0, lines: [[…], […]], lineCount: 2 }
 * await tokenizeChangedLines({ state, code: "const a = 1;\nconst b = 2;", grammar: "typescript" });
 * // { start: 1, lines: [[…]], lineCount: 2 }
 */
async function tokenizeChangedLines({
	state,
	code,
	grammar,
}: {
	state: LineTokenizerState;
	code: string;
	grammar: GrammarId;
}): Promise<LineTokenizerResult> {
	const highlighter = await getHighlighter();
	const lines = code.split("\n");
	let start = 0;
	while (
		start < lines.length &&
		start < state.lines.length &&
		lines[start] === state.lines[start]
	) {
		start += 1;
	}
	// Why one back at the end: a block that only shrank still reports its last line, so the caller sees the new count.
	start = Math.min(start, Math.max(lines.length - 1, 0));
	const changed: CodeLine[] = [];
	for (let index = start; index < lines.length; index += 1) {
		const tokens = highlighter.codeToTokensBase(lines[index] ?? "", {
			lang: grammar,
			theme: mantleShikiThemeName,
			grammarState: index > 0 ? state.endStates[index - 1] : undefined,
		});
		state.endStates[index] = highlighter.getLastGrammarState(tokens);
		changed.push(
			(tokens[0] ?? []).map((token) => ({
				content: token.content,
				color: token.color,
				// Why the floor: Shiki's `NotSet` is -1, which reads as every style bit.
				fontStyle: Math.max(token.fontStyle ?? 0, 0) || undefined,
			})),
		);
	}
	state.lines = lines;
	state.endStates.length = lines.length;
	return { start, lines: changed, lineCount: lines.length };
}

export {
	//,
	registerGrammar,
	tokenizeChangedLines,
};

export type {
	//,
	CodeLine,
	CodeToken,
	LineTokenizerResult,
	LineTokenizerState,
};
