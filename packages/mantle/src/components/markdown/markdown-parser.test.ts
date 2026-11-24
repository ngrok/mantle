import { describe, expect, test } from "vitest";
import { createMarkdownParser } from "./markdown-parser.js";

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
		expect(done.links["r"]?.href).toBe("https://author.example");
	});

	test("keeps the links object while the definitions stay the same", () => {
		const parser = createMarkdownParser();
		const first = parser.parse("[a]: https://ngrok.com\n\nSome", { streaming: true });
		expect(parser.parse("[a]: https://ngrok.com\n\nSome text", { streaming: true }).links).toBe(
			first.links,
		);
	});

	test("keeps a single tilde as text", () => {
		const snapshot = createMarkdownParser().parse("Use 20~25 or 30~40 workers.", {
			streaming: false,
		});
		expect(JSON.stringify(snapshot.blocks[0])).not.toContain('"type":"del"');
	});
});
