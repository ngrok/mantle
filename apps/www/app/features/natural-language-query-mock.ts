import type { TranslateQuery, TranslateResult } from "~/features/natural-language-query";

/** Words that name a project state, and the state each one means. */
const stateWords: ReadonlyArray<readonly [string, string]> = [
	["archived|old", "archived"],
	["shared|team", "shared"],
	["private|personal|mine|only me", "private"],
];

/** A negation before a state word, such as "not", "aren't", or "un". */
const negation = String.raw`(?:(?:not|aren't|isn't|non)[ -]?|un-?)`;

/** Words that carry no meaning for the filter. */
const fillerWords = new Set(
	"a all an and any are by called for from i in is me my named not of only or projects project show that the to un what which with".split(
		" ",
	),
);

/** Topics no project list can answer, so the mock reports them off topic. */
const offTopic = /\b(weather|joke|recipe|pizza|poem)\b/;

/**
 * A stand-in for the translation endpoint. It waits like a network call,
 * honors the abort signal, and maps a few words to the demo grammar. The real
 * endpoint sends the words and the grammar description to a model through the
 * ngrok.ai gateway, which routes the inference.
 */
export const mockTranslateQuery: TranslateQuery = ({ words, signal }) =>
	new Promise<TranslateResult>((resolve, reject) => {
		const timer = setTimeout(() => resolve(translateWords(words)), 700);
		signal.addEventListener("abort", () => {
			clearTimeout(timer);
			reject(signal.reason);
		});
	});

function translateWords(words: string): TranslateResult {
	let text = words.toLowerCase().replaceAll("’", "'");
	if (offTopic.test(text)) {
		return { kind: "off_topic" };
	}

	const qualifiers: string[] = [];
	// "active" and "current" mean not archived.
	text = text.replace(/\b(?:active|current)\b/, " not archived ");
	for (const [stateWord, state] of stateWords) {
		// Read the negated form first, so "not archived" never reads as "archived".
		const negated = new RegExp(String.raw`\b${negation}(?:${stateWord})\b`);
		const plain = new RegExp(String.raw`\b(?:${stateWord})\b`);
		if (negated.test(text)) {
			qualifiers.push(`-is:${state}`);
			text = text.replace(negated, " ");
		} else if (plain.test(text)) {
			qualifiers.push(`is:${state}`);
			text = text.replace(plain, " ");
		}
	}

	// A name after "named" or "called" is a name filter. Other words search as text.
	const named = /\b(?:named|called)\s+(\S+)/.exec(text);
	if (named?.[1] != null) {
		qualifiers.push(`name:${named[1]}`);
		text = text.replace(named[0], " ");
	}
	const terms = text.split(/[^a-z0-9-]+/).filter((term) => term !== "" && !fillerWords.has(term));

	return { kind: "query", query: [...qualifiers, ...terms].join(" ") };
}
