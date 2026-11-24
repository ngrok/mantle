"use client";

import { useEffect, useState } from "react";
import { canUseDOM } from "../browser-only/can-use-dom.js";
import { grammarForLanguage, type GrammarId } from "./grammars.js";
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
};

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
	code,
	language,
	showLineNumbers = false,
}: UseCodeBlockStreamOptions): MantleCodeBlockValue {
	const grammar = grammarForLanguage(language);
	const [id] = useState(createStreamId);
	// Why the grammar with the lines: lines of another language never show, with no reset in an effect.
	const [highlighted, setHighlighted] = useState<{
		grammar: GrammarId | undefined;
		lines: readonly CodeLine[];
	}>({ grammar: undefined, lines: [] });

	useEffect(() => {
		if (grammar == null || !canUseDOM()) {
			return;
		}
		openStream(id, grammar, (result) => {
			setHighlighted((previous) => ({
				grammar,
				lines: [
					...(previous.grammar === grammar ? previous.lines.slice(0, result.start) : []),
					...result.lines,
				],
			}));
		});
		send(id, code);
	}, [code, grammar, id]);

	useEffect(
		() => () => {
			dispose(id);
		},
		[id],
	);

	return createMantleCodeBlockValue({
		code,
		language,
		lines: resolveLines(
			code,
			grammar != null && highlighted.grammar === grammar ? highlighted.lines : [],
		),
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
