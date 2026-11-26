"use client";

import { useEffect, useState } from "react";
import { canUseDOM } from "../browser-only/can-use-dom.js";
import { grammarForLanguage, type GrammarId } from "./grammars.js";
import { foldStrategyFor } from "./compute-fold-ranges.js";
import type { FoldableRange } from "./fold-range-utils.js";
import { createStreamId, dispose, openStream, resolveLines, send } from "./highlight-client.js";
import type { CodeLine } from "./line-tokenizer.js";
import { createMantleCodeBlockValue, type MantleCodeBlockValue } from "./mantle-code.js";
import type { SupportedLanguage } from "./supported-languages.js";

/** Options for {@link useCodeBlockStream}. */
type UseCodeBlockStreamOptions = {
	/** The code so far. Each update may append to it or change it. */
	code: string;
	/** The language of the code. Plain-text languages never load a grammar. */
	language: SupportedLanguage;
	/**
	 * Whether to show line numbers.
	 * @default false
	 */
	showLineNumbers?: boolean | undefined;
	/**
	 * Whether the code is final, such as a fence whose answer finished
	 * streaming. Pass it to fold: while `false`, each line of a language that
	 * can fold makes room for the fold gutter; once `true`, the block folds the
	 * same as a pre-rendered one, from its brackets or indentation. Folds that
	 * only the server finds, such as JSX elements and Bash keywords, do not
	 * show. Leave it unset for a block that never folds.
	 */
	complete?: boolean | undefined;
};

/** The fold ranges of a block that can fold but has none yet. Why shared: `Code` compares it by reference. */
const noFolds: FoldableRange[] = [];

/**
 * Highlights code in the browser as it changes, for code that streams in,
 * such as a fence in a model's answer. Returns a value for `CodeBlock.Code`.
 *
 * A module worker loads Shiki and only the grammar of `language`, with no
 * WebAssembly, so a page needs no CSP change beyond `worker-src 'self'`.
 * Each update highlights only the lines that changed: a finished line keeps
 * its tokens and its React element. Lines render as plain text with the same
 * geometry until their tokens arrive, on the server and in the first client
 * render too. When the worker cannot start, the main thread highlights instead.
 *
 * Once `complete` is set, the worker computes the block's fold ranges in
 * one pass, and the block shows fold toggles. In a language that can fold,
 * each line makes room for the fold gutter from the first line, so the
 * toggles shift no code when they appear.
 *
 * Use `mantleCode` or the server highlighter for code that is known before
 * the page renders: they ship no highlighter to the browser.
 *
 * @example
 * ```tsx
 * function AnswerCode({ code, language }: { code: string; language: SupportedLanguage }) {
 *   const value = useCodeBlockStream({ code, language, showLineNumbers: true });
 *   return (
 *     <CodeBlock.Root>
 *       <CodeBlock.Body>
 *         <CodeBlock.CopyButton />
 *         <CodeBlock.Code value={value} />
 *       </CodeBlock.Body>
 *     </CodeBlock.Root>
 *   );
 * }
 * ```
 */
function useCodeBlockStream({
	code: source,
	language,
	showLineNumbers = false,
	complete,
}: UseCodeBlockStreamOptions): MantleCodeBlockValue {
	// Why: lines split on LF, so a CR stays at the end of a line, and the HTML
	// parser reads it as a second line break. `mantleCode` normalizes the same way.
	const code = source.replace(/\r\n?/g, "\n");
	const grammar = grammarForLanguage(language);
	const [id] = useState(createStreamId);
	// Why the grammar with the lines: lines of another language never show, with no reset in an effect.
	const [highlighted, setHighlighted] = useState<{
		grammar: GrammarId | undefined;
		lines: readonly CodeLine[];
		foldableRanges: FoldableRange[] | undefined;
		/** The code that `foldableRanges` is for. */
		foldCode: string | undefined;
	}>({ grammar: undefined, lines: [], foldableRanges: undefined, foldCode: undefined });
	// Why only with `complete`: a caller that never says the code is final gets no fold gutter.
	const canFold = complete !== undefined && grammar != null && foldStrategyFor(language) !== "none";
	// Why the grammar, not `language`: an alias such as `ts` for `typescript` folds the same, so a
	// switch must not send the same code again and reset the reader's folds. Each grammar ID is a language too.
	const foldLanguage = complete === true && canFold ? grammar : undefined;

	useEffect(() => {
		if (grammar == null || !canUseDOM()) {
			return;
		}
		openStream(id, grammar, (result, resultCode) => {
			setHighlighted((previous) => ({
				grammar,
				lines: [
					...(previous.grammar === grammar ? previous.lines.slice(0, result.start) : []),
					...result.lines,
				],
				foldableRanges: result.foldableRanges,
				foldCode: resultCode,
			}));
		});
		send(id, code, foldLanguage);
	}, [code, foldLanguage, grammar, id]);

	useEffect(
		() => () => {
			dispose(id);
		},
		[id],
	);

	const isCurrent = grammar != null && highlighted.grammar === grammar;
	// Why the code too: ranges of the code before an edit would fold the wrong lines.
	const hasCurrentFolds = isCurrent && highlighted.foldCode === code;
	return createMantleCodeBlockValue({
		code,
		language,
		lines: resolveLines(code, isCurrent ? highlighted.lines : []),
		foldableRanges: canFold
			? ((complete && hasCurrentFolds ? highlighted.foldableRanges : undefined) ?? noFolds)
			: undefined,
		showLineNumbers,
	});
}

export {
	//,
	useCodeBlockStream,
};

export type {
	//,
	UseCodeBlockStreamOptions,
};
