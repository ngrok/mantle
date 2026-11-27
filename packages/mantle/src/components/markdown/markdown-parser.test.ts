import { describe, expect, test } from "vitest";
import { markdownMath } from "./markdown-math.js";
import { createMarkdownParser, type MarkdownSnapshot } from "./markdown-parser.js";

const answer = [
	"# Endpoints",
	"",
	"An endpoint gets a **public URL**.",
	"",
	"- Agent endpoints",
	"- Cloud endpoints",
	"",
	"```bash",
	"ngrok http 8080",
	"```",
	"",
	"Read [the docs][docs].",
	"",
	"[docs]: https://ngrok.com/docs",
].join("\n");

/** Feeds `source` to a parser in chunks of `size` characters, as a stream would. */
function stream(source: string, size: number) {
	const parser = createMarkdownParser();
	const snapshots = [];
	for (let end = size; end < source.length + size; end += size) {
		snapshots.push(parser.parse(source.slice(0, end), { streaming: true }));
	}
	return { parser, snapshots };
}

describe("createMarkdownParser", () => {
	test("keeps the token object of a finished block in each later snapshot", () => {
		const { snapshots } = stream(answer, 7);
		const firstDone = snapshots.findIndex((snapshot) => snapshot.completeCount >= 1);
		const heading = snapshots[firstDone]?.blocks[0];
		expect(heading?.type).toBe("heading");
		for (const snapshot of snapshots.slice(firstDone)) {
			expect(snapshot.blocks[0]).toBe(heading);
		}
	});

	test("streams to the same blocks as one parse of the whole answer", () => {
		const { parser } = stream(answer, 5);
		const streamed = parser.parse(answer, { streaming: false });
		const whole = createMarkdownParser().parse(answer, { streaming: false });
		expect(streamed.blocks.map((token) => token.raw)).toEqual(
			whole.blocks.map((token) => token.raw),
		);
	});

	test("closes unfinished emphasis at the end of the stream", () => {
		const snapshot = createMarkdownParser().parse("Some **bol", { streaming: true });
		const paragraph = snapshot.blocks[0];
		expect(paragraph?.type).toBe("paragraph");
		expect(
			paragraph && "tokens" in paragraph ? paragraph.tokens?.map((token) => token.type) : [],
		).toEqual(["text", "strong"]);
	});

	test("leaves the last block unfinished until the next block starts", () => {
		const parser = createMarkdownParser();
		expect(parser.parse("- one\n- two\n\n", { streaming: true }).completeCount).toBe(0);
		// Why: after a blank line, an indented line still belongs to the list.
		expect(parser.parse("- one\n- two\n\n  more", { streaming: true }).completeCount).toBe(0);
		expect(parser.parse("- one\n- two\n\n  more\n\nAfter", { streaming: true }).completeCount).toBe(
			1,
		);
	});

	test("resolves a reference link once the stream ends", () => {
		const { snapshots, parser } = stream(answer, 9);
		const isReadParagraph = (token: { raw: string }) => token.raw.startsWith("Read");
		const streamed = snapshots.at(-1)?.blocks.find(isReadParagraph);
		// Why: the paragraph finished before its definition arrived.
		expect(JSON.stringify(streamed)).not.toContain('"type":"link"');
		const done = parser.parse(answer, { streaming: false });
		expect(JSON.stringify(done.blocks.find(isReadParagraph))).toContain(
			'"href":"https://ngrok.com/docs"',
		);
	});

	test("a truncated answer parses as its last frame, and more text can still join its last block", () => {
		// Why a fence in a list item: the item ends at the list's end, which a scan of the whole answer misses.
		const parser = createMarkdownParser();
		const fenced = "[r]: /docs\n\n- ~~~\n  code\n\nNext **bold";
		parser.parse(fenced.slice(0, -7), { streaming: true });
		parser.parse(fenced, { streaming: true });
		const stopped = parser.parse(fenced, { streaming: false, truncated: true });
		expect(JSON.stringify(stopped.blocks.at(-1))).toContain('"type":"strong"');

		// Why math: the closer `$$` splits `$$E` from `Intro`, and the rest of the line joins them again.
		const math = createMarkdownParser({ extensions: [markdownMath()] });
		math.parse("[r]: /docs\n\nIntro", { streaming: true });
		math.parse("[r]: /docs\n\nIntro\n$$E", { streaming: true });
		math.parse("[r]: /docs\n\nIntro\n$$E", { streaming: false, truncated: true });
		const resumed = math.parse("[r]: /docs\n\nIntro\n$$E = mc^2$$ where m is mass.", {
			streaming: true,
		});
		expect(resumed.blocks.map((block) => block.type)).toEqual(["def", "paragraph"]);
	});

	test("starts over when the text before a finished block changes", () => {
		const parser = createMarkdownParser();
		parser.parse("First answer.\n\nMore", { streaming: true });
		const next = parser.parse("Second answer.", { streaming: true });
		expect(next.blocks.map((token) => token.raw)).toEqual(["Second answer."]);
	});

	test("drops a definition that the new text no longer has", () => {
		const parser = createMarkdownParser();
		parser.parse("[docs]: https://old.example", { streaming: true });
		expect(parser.parse("[docs]", { streaming: true }).links).toEqual({});
	});

	test("reads a definition again when the stream completes its URL", () => {
		const parser = createMarkdownParser();
		parser.parse("[r]: https://a", { streaming: true });
		const done = parser.parse("[r]: https://author.example\n\nSee [r].", { streaming: false });
		expect(JSON.stringify(done.blocks)).toContain('"href":"https://author.example"');
	});

	test("drops a link whose definition is gone when the stream ends", () => {
		const parser = createMarkdownParser();
		parser.parse("[link][r]\n\n[r]: /old", { streaming: true });
		const done = parser.parse("[link][r]\n\n[r]: /old extra", { streaming: false });
		expect(JSON.stringify(done.blocks[0])).not.toContain('"type":"link"');
	});

	test("does not finish a paragraph before a fence opener line is whole", () => {
		const parser = createMarkdownParser();
		parser.parse("Intro\n```", { streaming: true });
		const done = parser.parse("Intro\n```code```", { streaming: false });
		expect(done.blocks.map((token) => token.type)).toEqual(["paragraph"]);
	});

	test("keeps each block when the last block starts with no blank line before it", () => {
		const done = createMarkdownParser().parse("# Title\nBody", { streaming: false });
		expect(done.blocks.map((token) => token.type)).toEqual(["heading", "paragraph"]);
	});

	test("keeps a list open after a blank line while the next line can still be its item", () => {
		const parser = createMarkdownParser();
		parser.parse("1. Install\n\n1", { streaming: true });
		const done = parser.parse("1. Install\n\n1. Configure", { streaming: false });
		expect(done.blocks).toMatchObject([{ type: "list", items: [{}, {}] }]);
	});

	test("parses a long run of open emphasis while it streams", () => {
		const snapshot = createMarkdownParser().parse(`a ${"*".repeat(8192)}b`, { streaming: true });
		expect(snapshot.blocks.map((token) => token.type)).toEqual(["paragraph"]);
	});

	test("keeps the links object while the definitions stay the same", () => {
		const parser = createMarkdownParser();
		const first = parser.parse("[a]: https://ngrok.com\n\nSome", { streaming: true });
		expect(parser.parse("[a]: https://ngrok.com\n\nSome text", { streaming: true }).links).toBe(
			first.links,
		);
	});

	test("keeps a line that starts with inline math in its paragraph", () => {
		const parser = createMarkdownParser({ extensions: [markdownMath()] });
		const { blocks } = parser.parse("The energy is\n$$E = mc^2$$ where m is mass.", {
			streaming: false,
		});
		expect(blocks.map((block) => block.type)).toEqual(["paragraph"]);
	});

	test("numbers footnotes by first reference, and streams to the same notes as one parse", () => {
		const source = "A[^b] and B[^a], again[^b].\n\n[^a]: Note a\n[^b]: Note b\n    more b\n";
		const { parser } = stream(source, 3);
		const streamed = parser.parse(source, { streaming: false });
		const whole = createMarkdownParser().parse(source, { streaming: false });
		expect(streamed.notes.references).toEqual({
			B: { number: 1, count: 2 },
			A: { number: 2, count: 1 },
		});
		expect(whole.notes.references).toEqual(streamed.notes.references);
		expect(streamed.blocks.map((token) => token.type)).toEqual([
			"paragraph",
			"footnote",
			"footnote",
		]);
	});

	test("shows a reference with no definition as text once the stream ends, and keeps it in a stopped answer", () => {
		const source = "Claim[^1].\n\nNext paragraph.";
		const { parser, snapshots } = stream(source, 4);
		const inline = (snapshot: MarkdownSnapshot | undefined) => {
			const block = snapshot?.blocks[0];
			return block?.type === "paragraph" ? (block.tokens ?? []).map((token) => token.type) : [];
		};
		expect(inline(snapshots.at(-1))).toEqual(["text", "footnoteRef", "text"]);
		const stopped = createMarkdownParser().parse(source, { streaming: false, truncated: true });
		expect(inline(stopped)).toEqual(["text", "footnoteRef", "text"]);
		expect(inline(parser.parse(source, { streaming: false }))).toEqual(["text"]);
	});

	test.each([
		["a definition right after its paragraph", "Claim[^1].\n[^1]: Note", "1"],
		["a `!` before a reference", "Yes![^1]\n\n[^1]: Note", "1"],
		["a definition with padding", "See[^1].\n\n[^1]:     prose", "1"],
	])("reads %s", (_, source, label) => {
		const { notes, blocks } = createMarkdownParser().parse(source, { streaming: false });
		expect(notes.references[label]).toEqual({ number: 1, count: 1 });
		expect(notes.definitions[label]?.tokens[0]?.type).toBe("paragraph");
		expect(blocks.map((token) => token.type)).toEqual(["paragraph", "footnote"]);
	});

	test("numbers a table's header before its body, and ends an empty note at an unindented line", () => {
		const source = "| H[^x] |\n| --- |\n| B[^y] |\n\n[^x]:\nOutside\n\n[^y]: Y";
		const { notes, blocks } = createMarkdownParser().parse(source, { streaming: false });
		expect(notes.references).toEqual({ X: { number: 1, count: 1 }, Y: { number: 2, count: 1 } });
		expect(blocks.map((token) => token.type)).toEqual([
			"table",
			"footnote",
			"paragraph",
			"footnote",
		]);
	});

	test("resolves a reference whose note arrives after a completed parse", () => {
		const parser = createMarkdownParser();
		parser.parse("A[^x].\n\nTail.", { streaming: false });
		const { notes } = parser.parse("A[^x].\n\nTail.\n\n[^x]: Note", { streaming: false });
		expect(notes.references).toEqual({ X: { number: 1, count: 1 } });
	});

	test("keeps a single tilde as text", () => {
		const snapshot = createMarkdownParser().parse("Use 20~25 or 30~40 workers.", {
			streaming: false,
		});
		expect(JSON.stringify(snapshot.blocks[0])).not.toContain('"type":"del"');
	});
});
