import { lexMarkdown, type MarkdownTokenizer } from "./markdown-lexer.js";
import { closeMarkdown } from "./close-markdown.js";
import type {
	FootnoteToken,
	MarkdownFootnotes,
	MarkdownLinks,
	MarkdownToken as Token,
} from "./markdown-tokens.js";

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
	/** The footnotes that the snapshot read. */
	notes: MarkdownFootnotes;
};

/** Parses one answer as it streams. Create one for each answer. */
type MarkdownParser = {
	/**
	 * Parses the answer so far. Only the text after the last finished block
	 * is lexed. While `streaming`, or when the answer is `truncated`,
	 * unfinished syntax at its end is closed. Without `streaming`, every block
	 * counts as finished, and an answer with a reference definition is lexed
	 * whole once more, so a reference link that comes before its definition
	 * resolves.
	 */
	parse: (source: string, options: { streaming: boolean; truncated?: boolean }) => MarkdownSnapshot;
};

/**
 * Marks an extension whose tokenizers read `$$` math, so the parser closes
 * an open `$$` block while it streams.
 */
const closesMath: unique symbol = Symbol("closesMath");

/** Tokenizers that read more kinds of tokens, such as math. It can carry {@link closesMath}. */
type MarkdownExtension = {
	extensions: readonly MarkdownTokenizer[];
	[closesMath]?: true;
};

/** The index of the last token of `tokens` that is not a blank line, or -1. */
function lastContentIndex(tokens: readonly Token[]): number {
	let index = tokens.length - 1;
	while (index >= 0 && tokens[index]?.type === "space") {
		index -= 1;
	}
	return index;
}

/** Adds the reference definitions in `tokens` and in their children to `links`. The first definition of a label wins. */
function addDefinitions(links: MarkdownLinks, tokens: readonly Token[]) {
	for (const token of tokens) {
		if (token.type === "def") {
			links[token.tag] ??= { href: token.href, title: token.title ?? "" };
		} else if (token.type === "list") {
			addDefinitions(links, token.items);
		} else if ("tokens" in token && token.tokens != null && token.type !== "paragraph") {
			addDefinitions(links, token.tokens);
		}
	}
}

const noNotes = (): MarkdownFootnotes => ({
	definitions: Object.create(null),
	references: Object.create(null),
});

/** Narrows a token to a footnote. Why a guard: an extension token's `type` is any string, so `===` cannot narrow it. */
function isFootnote(token: Token): token is FootnoteToken {
	return token.type === "footnote";
}

/** Adds the footnotes and footnote references in `tokens` and in their children to `notes`, in order. */
function addNotes(notes: MarkdownFootnotes, tokens: readonly Token[]) {
	for (const token of tokens) {
		if (token.type === "footnoteRef") {
			notes.references[token.label] = { number: token.number, count: token.occurrence };
		} else if (isFootnote(token)) {
			notes.definitions[token.label] ??= token;
		}
		if (token.type === "list") {
			addNotes(notes, token.items);
		} else if (token.type === "table") {
			addNotes(
				notes,
				[...token.header, ...token.rows.flat()].flatMap((cell) => cell.tokens),
			);
		} else if ("tokens" in token && token.tokens != null) {
			addNotes(notes, token.tokens);
		}
	}
}

/**
 * Whether two sets of footnotes hold the same numbers, counts, and defined
 * labels: all that a reference in the answer renders from.
 */
function isSameCitations(previous: MarkdownFootnotes, next: MarkdownFootnotes): boolean {
	if (previous === next) {
		return true;
	}
	const labels = Object.keys(next.references);
	const defined = Object.keys(next.definitions);
	return (
		labels.length === Object.keys(previous.references).length &&
		defined.length === Object.keys(previous.definitions).length &&
		labels.every(
			(label) =>
				previous.references[label]?.number === next.references[label]?.number &&
				previous.references[label]?.count === next.references[label]?.count,
		) &&
		defined.every((label) => label in previous.definitions)
	);
}

/** Whether two sets of footnotes hold the same citations, and each note the same source. */
function isSameNotes(previous: MarkdownFootnotes, next: MarkdownFootnotes): boolean {
	return (
		isSameCitations(previous, next) &&
		Object.keys(next.definitions).every(
			(label) => previous.definitions[label]?.raw === next.definitions[label]?.raw,
		)
	);
}

/** Whether two sets of reference definitions hold the same labels and targets. */
function isSameLinks(previous: MarkdownLinks, next: MarkdownLinks): boolean {
	const labels = Object.keys(next);
	return (
		labels.length === Object.keys(previous).length &&
		labels.every(
			(label) =>
				previous[label]?.href === next[label]?.href &&
				previous[label]?.title === next[label]?.title,
		)
	);
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
	const tokenizers = extensions.flatMap((extension) => extension.extensions);
	const lex = (
		source: string,
		seed: { links: MarkdownLinks; notes: MarkdownFootnotes; awaitNotes: boolean },
	) => lexMarkdown(source, { ...seed, extensions: tokenizers });
	const closeMath = extensions.some((extension) => extension[closesMath] === true);

	let frozen: Token[] = [];
	let frozenSource = "";
	// The definitions in the finished blocks, and in the whole answer so far. Why apart: the text after the last
	// finished block can still change, so its definitions are read again on each parse.
	let frozenLinks: MarkdownLinks = Object.create(null);
	let links: MarkdownLinks = Object.create(null);
	// Whether a finished block was lexed with definitions. Why: a definition that later changes or goes away
	// leaves a stale link in it, so the final parse must lex the whole answer again.
	let frozenReadLinks = false;
	// The footnotes in the finished blocks, and in the whole answer so far.
	let frozenNotes = noNotes();
	// Why the same object: the lexer returns its seed when it reads no footnote, so the check of `setNotes` is one compare.
	let notes = frozenNotes;
	// Whether the finished blocks were lexed while the answer streamed. Why: a static parse reads a reference with
	// no note as text, and a stream that resumes must read it again as a reference.
	let frozenAwaits = true;
	/** Keeps the `links` object while its definitions stay the same, so a memoized block does not render again. */
	const setLinks = (next: MarkdownLinks) => {
		if (!isSameLinks(links, next)) {
			links = next;
		}
	};
	/** Keeps the `notes` object while its footnotes stay the same, so the footnote list does not render again. */
	const setNotes = (next: MarkdownFootnotes) => {
		if (!isSameNotes(notes, next)) {
			notes = next;
		}
	};

	/**
	 * Lexes the whole answer once more. Why: a reference link in a finished
	 * block can come before its definition, and only a whole lex resolves it.
	 */
	const parseWhole = (source: string): MarkdownSnapshot => {
		const all = lex(source, { links: Object.create(null), notes: noNotes(), awaitNotes: false });
		const blocks = contentTokens(all);
		frozen = blocks.slice(0, -1);
		frozenSource = all
			.slice(0, Math.max(lastContentIndex(all), 0))
			.map((token) => token.raw)
			.join("");
		frozenLinks = Object.create(null);
		addDefinitions(frozenLinks, frozen);
		frozenReadLinks = Object.keys(all.links).length > 0;
		frozenNotes = noNotes();
		addNotes(frozenNotes, frozen);
		frozenAwaits = false;
		// Why a new object: the blocks are new tokens, and each must read the definitions again.
		links = all.links;
		notes = all.notes;
		return { blocks, completeCount: blocks.length, links, notes };
	};

	return {
		parse(rawSource, { streaming, truncated = false }) {
			const source = rawSource.includes("\r") ? rawSource.replace(/\r\n?/g, "\n") : rawSource;
			const closes = streaming || truncated;
			const reset =
				!source.startsWith(frozenSource) ||
				(closes && !frozenAwaits && frozenSource.includes("[^"));
			if (reset) {
				// Why a reset: the text before the last finished block changed, such as for a new answer.
				frozenAwaits = true;
				frozen = [];
				frozenSource = "";
				frozenLinks = Object.create(null);
				frozenReadLinks = false;
				frozenNotes = noNotes();
			}

			const tail = source.slice(frozenSource.length);
			const text = closes ? closeMarkdown(tail, { math: closeMath }) : tail;
			// Why `closes`: a stopped answer keeps each reference that showed while it streamed.
			const tokens = lex(text, { links: frozenLinks, notes: frozenNotes, awaitNotes: closes });
			const previousLinks = links;
			setLinks(tokens.links);
			if (links === previousLinks && !reset) {
				setNotes(tokens.notes);
			} else {
				// Why: a note's link can resolve to a new target, or a reference take a new occurrence, with no change to
				// the source of its block.
				notes = tokens.notes;
			}
			// Why: a finished block can hold a reference to a footnote that the answer never defined, and GFM shows it
			// as text. A stopped answer keeps it, as it showed while it streamed.
			const undefinedNote =
				!closes && Object.keys(notes.references).some((label) => !(label in notes.definitions));

			if (
				!streaming &&
				frozen.length > 0 &&
				(frozenReadLinks ||
					Object.keys(links).length > 0 ||
					// Why: a reference in a finished block that came before its note was read as text.
					Object.keys(notes.definitions).length > 0 ||
					undefinedNote)
			) {
				if (truncated) {
					// Why the closed tail, and no frozen state: it is the text the last frame showed, and a closer can
					// split a block that more text would join again.
					const all = lex(frozenSource + text, {
						links: Object.create(null),
						notes: noNotes(),
						awaitNotes: true,
					});
					const blocks = contentTokens(all);
					return { blocks, completeCount: blocks.length, links: all.links, notes: all.notes };
				}
				return parseWhole(source);
			}

			const finished = tokens.slice(0, Math.max(lastContentIndex(tokens), 0));
			const finishedRaw = finished.map((token) => token.raw).join("");
			// Why the checks: a finished block must be the source as it is, not text that `closeMarkdown` closed. And
			// with no blank line before it, the next block's first line must be whole: more of that line can join
			// the two blocks, as a fence opener ``` can become a code span.
			// A list or indented code can go on past a blank line: a line that starts with an indent, a bullet, or a
			// digit can still become its next item or line, so it must be whole first.
			const last = contentTokens(finished).at(-1);
			const goesOn =
				(last?.type === "list" || (last?.type === "code" && last.codeBlockStyle === "indented")) &&
				/^[\t +*\d-]/.test(tail.slice(finishedRaw.length));
			const freezes =
				finished.length > 0 &&
				tail.startsWith(finishedRaw) &&
				((finished.at(-1)?.type === "space" && !goesOn) || tail.includes("\n", finishedRaw.length));
			if (freezes) {
				frozen = [...frozen, ...contentTokens(finished)];
				frozenSource += finishedRaw;
				frozenReadLinks ||= Object.keys(tokens.links).length > 0;
				addDefinitions(frozenLinks, finished);
				// Why the check: most blocks hold no footnote, and the walk reads each of their tokens.
				if (finishedRaw.includes("[^")) {
					// Why a copy: the lexer returns its seed when it adds no footnote, so `notes` can be this object.
					const next = {
						definitions: Object.assign(Object.create(null), frozenNotes.definitions),
						references: Object.assign(Object.create(null), frozenNotes.references),
					};
					addNotes(next, finished);
					// Why the check: `[^` in code adds no footnote, and a new object costs the identity check of `setNotes`.
					if (!isSameNotes(frozenNotes, next)) {
						frozenNotes = next;
					}
				}
				frozenAwaits &&= closes;
			}
			const blocks = [
				...frozen,
				...contentTokens(freezes ? tokens.slice(finished.length) : tokens),
			];
			// Why not the last block when done: a stream that resumes later can still add to it.
			return { blocks, completeCount: streaming ? frozen.length : blocks.length, links, notes };
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
	MarkdownTokenizer,
	MarkdownParser,
	MarkdownSnapshot,
};
