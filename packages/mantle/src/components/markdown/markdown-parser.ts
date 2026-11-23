import { Lexer, Marked, type MarkedExtension, type Token, type TokensList } from "marked";
import remend from "remend";

/** The reference definitions of an answer, such as `[1]: https://ngrok.com`, by label. */
type MarkdownLinks = TokensList["links"];

/**
 * The blocks of an answer at one point in its stream. A block is one
 * top-level Markdown token, such as a paragraph, a list, or a fence.
 */
type MarkdownSnapshot = {
	/** The blocks, in order. A finished block keeps its token object in each later snapshot. */
	blocks: readonly Token[];
	/** The count of finished blocks at the start of `blocks`. The rest can still change. */
	completeCount: number;
	/** The reference definitions that the snapshot read. */
	links: MarkdownLinks;
};

/** Parses one answer as it streams. Create one for each answer. */
type MarkdownParser = {
	/**
	 * Parses the answer so far. Only the text after the last finished block
	 * is lexed. While `streaming`, unfinished syntax at its end is closed.
	 * Without `streaming`, every block counts as finished, and an answer
	 * with a reference definition is lexed whole once more, so a reference
	 * link that comes before its definition resolves.
	 */
	parse: (source: string, options: { streaming: boolean }) => MarkdownSnapshot;
};

/**
 * Marks an extension whose tokenizers read `$$` math, so the parser closes
 * an open `$$` block while it streams.
 */
const closesMath: unique symbol = Symbol("closesMath");

/** A marked extension that can carry {@link closesMath}. */
type MarkdownExtension = MarkedExtension & { [closesMath]?: true };

/** A lexer for the options of one `Marked` instance, seeded with known reference definitions. */
function lex(marked: Marked, source: string, links: MarkdownLinks): TokensList {
	const lexer = new Lexer(marked.defaults);
	Object.assign(lexer.tokens.links, links);
	return lexer.lex(source);
}

/** The index of the last token of `tokens` that is not a blank line, or -1. */
function lastContentIndex(tokens: readonly Token[]): number {
	let index = tokens.length - 1;
	while (index >= 0 && tokens[index]?.type === "space") {
		index -= 1;
	}
	return index;
}

/** Each block of `tokens` that renders: all but the blank lines between blocks. */
function contentTokens(tokens: readonly Token[]): Token[] {
	return tokens.filter((token) => token.type !== "space");
}

/**
 * Creates a parser for one streamed answer.
 *
 * A block is finished once the next block starts: everything before the last
 * block of the unfinished text cannot change. Each parse lexes only the text
 * after the last finished block, so a long answer costs the same for each
 * update as a short one, and a finished block keeps its token object.
 *
 * @example
 * const parser = createMarkdownParser();
 * parser.parse("# Title\n\nSome **bo", { streaming: true });
 * // { blocks: [heading, paragraph "Some **bo**"], completeCount: 1, … }
 * parser.parse("# Title\n\nSome **bold** text.", { streaming: false });
 * // { blocks: [heading (the same object), paragraph], completeCount: 2, … }
 */
function createMarkdownParser({
	extensions = [],
}: { extensions?: readonly MarkdownExtension[] } = {}): MarkdownParser {
	const marked = new Marked(
		{
			gfm: true,
			// Why: GitHub reads `~one~` as strikethrough, and a model writes `20~25` for a range.
			tokenizer: {
				del(source) {
					return source.startsWith("~~") ? false : undefined;
				},
			},
		},
		...extensions,
	);
	const closeMath = extensions.some((extension) => extension[closesMath] === true);

	let frozen: Token[] = [];
	let frozenSource = "";
	let links: MarkdownLinks = Object.create(null);

	/**
	 * Lexes the whole answer once more. Why: a reference link in a finished
	 * block can come before its definition, and only a whole lex resolves it.
	 */
	const parseWhole = (source: string): MarkdownSnapshot => {
		const all = lex(marked, source, Object.create(null));
		const blocks = contentTokens(all);
		frozen = blocks.slice(0, -1);
		frozenSource = all
			.slice(0, Math.max(lastContentIndex(all), 0))
			.map((token) => token.raw)
			.join("");
		links = all.links;
		return { blocks, completeCount: blocks.length, links };
	};

	return {
		parse(rawSource, { streaming }) {
			const source = rawSource.includes("\r") ? rawSource.replace(/\r\n?/g, "\n") : rawSource;
			if (!source.startsWith(frozenSource)) {
				// Why a reset: the text before the last finished block changed, such as for a new answer.
				frozen = [];
				frozenSource = "";
				links = Object.create(null);
			}

			const tail = source.slice(frozenSource.length);
			const text = streaming
				? remend(tail, {
						katex: closeMath,
						linkMode: "text-only",
						// Why off: these two edit text before the end, so finished blocks would not match the source.
						comparisonOperators: false,
						singleTilde: false,
					})
				: tail;
			const tokens = lex(marked, text, links);
			Object.assign(links, tokens.links);

			if (!streaming && frozen.length > 0 && Object.keys(links).length > 0) {
				return parseWhole(source);
			}

			const finished = tokens.slice(0, Math.max(lastContentIndex(tokens), 0));
			const finishedRaw = finished.map((token) => token.raw).join("");
			// Why the check: a finished block must be the source as it is, not text that `remend` closed.
			if (finished.length > 0 && tail.startsWith(finishedRaw)) {
				frozen = [...frozen, ...contentTokens(finished)];
				frozenSource += finishedRaw;
			}
			const blocks = [...frozen, ...contentTokens(tokens.slice(finished.length))];
			// Why not the last block when done: a stream that resumes later can still add to it.
			return { blocks, completeCount: streaming ? frozen.length : blocks.length, links };
		},
	};
}

export {
	//,
	closesMath,
	createMarkdownParser,
};

export type {
	//,
	MarkdownExtension,
	MarkdownLinks,
	MarkdownParser,
	MarkdownSnapshot,
};
