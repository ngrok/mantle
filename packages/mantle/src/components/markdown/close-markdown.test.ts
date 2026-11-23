import { marked } from "marked";
import { describe, expect, test } from "vitest";
import { closeMarkdown } from "./close-markdown.js";

const close = (text: string) => closeMarkdown(text, { math: false });

describe("closeMarkdown", () => {
	test.each([
		// Emphasis, strikethrough, and code spans close.
		["Some **bo", "Some **bo**"],
		["Some **bo ", "Some **bo** "],
		["_it", "_it_"],
		["***bi", "***bi***"],
		["**bold *it", "**bold *it***"],
		["**bold*", "**bold**"],
		["~~old", "~~old~~"],
		["~~old~", "~~old~~"],
		["Run `co", "Run `co`"],
		["**a `b", "**a `b`**"],
		["`` a `b`", "`` a `b` ``"],
		["> quote **b\n> more", "> quote **b\n> more**"],
		["| a | b |\n| --- | --- |\n| 1 | **2", "| a | b |\n| --- | --- |\n| 1 | **2**"],
		// A marker with no content yet shows nothing.
		["Some **", "Some "],
		["Run `", "Run "],
		["Hi\n\n#", "Hi\n\n"],
		["Hi\n\n1. ", "Hi\n\n"],
		["- [x] Done\n- [ ] ", "- [x] Done\n"],
		["Title\n-", "Title\n"],
		// Links show their text; images, tags, autolinks, and entities show nothing yet.
		["see [the gu", "see the gu"],
		["see [the guide]", "see the guide"],
		["see [**the** guide](https://ng", "see **the** guide"],
		["**[guide](htt", "**guide**"],
		["![alt](http", ""],
		["a <spa", "a "],
		["Visit <https://ngr", "Visit "],
		["AT&T and &am", "AT&T and "],
		// Tables: the header waits for its delimiter row, which completes.
		["| a | b |", ""],
		["| a | b |\n", ""],
		["| a | b |\n|", "| a | b |\n| --- | --- |"],
		["| a | b |\n| :-- | -", "| a | b |\n| :-- | - |"],
		// Text that is not markup stays as it is.
		["snake_case_na", "snake_case_na"],
		["word_", "word_"],
		["2 * 3", "2 * 3"],
		["a*b", "a*b"],
		["x \\*not", "x \\*not"],
		["- [ ] tas", "- [ ] tas"],
		["# Title **bo\nnext", "# Title **bo\nnext"],
		["para one **b\n\npara two", "para one **b\n\npara two"],
		["Title\n---\n", "Title\n---\n"],
		["```js\nconst a = `x **y", "```js\nconst a = `x **y"],
		["- item\n\n  ```sh\n  ngrok **", "- item\n\n  ```sh\n  ngrok **"],
	])("%j → %j", (text, expected) => {
		expect(close(text)).toBe(expected);
	});

	test("closes a `$$` block only with math", () => {
		expect(closeMarkdown("$$\nx^2", { math: true })).toBe("$$\nx^2\n$$");
		expect(closeMarkdown("$$\nx^2", { math: false })).toBe("$$\nx^2");
	});

	test("no prefix of an answer shows a marker or a block that the whole answer does not", () => {
		const answer = [
			"Here's how to **rate-limit** your API with a [Traffic Policy](https://ngrok.com/docs/traffic-policy/) and `ngrok`:",
			"",
			"1. Install the agent: `brew install ngrok`.",
			"2. Add your _authtoken_ with `ngrok config add-authtoken $TOKEN`.",
			"",
			"```yaml\non_http_request:\n  - actions:\n      - type: rate-limit\n```",
			"",
			"| Option | Default | Notes |",
			"| :--- | :---: | ---: |",
			"| `capacity` | 100 | requests per `rate` |",
			"| `rate` | `60s` | ~~30s~~ changed in v3 |",
			"",
			"> **Note:** limits apply per account, see [pricing](https://ngrok.com/pricing).",
			"",
			"Use 2 * 3 = 6 and a_b_c names, plus AT&T &amp; friends. <kbd>Ctrl</kbd> works too.",
			"",
			"- [x] Done task",
			"- [ ] Open task with ***both*** styles",
			"",
			"Heading below",
			"---",
			"",
			"![diagram](https://ngrok.com/diagram.png)",
		].join("\n");
		const render = (text: string) => marked.parse(text, { gfm: true, async: false });
		const visible = (html: string) =>
			html
				.replace(/<pre[\s\S]*?<\/pre>|<code>[\s\S]*?<\/code>|<[^>]+>/g, "")
				.replaceAll("&lt;", "<")
				.replaceAll("&amp;", "&");
		const count = (text: string, part: string) => text.split(part).length - 1;
		const finalHtml = render(answer);
		const finalText = visible(finalHtml);
		const markers = ["**", "__", "~~", "`", "[", "|", "<", "&"];
		const tags = [
			"<h1",
			"<h2",
			"<hr",
			"<table",
			"<li",
			"<blockquote",
			"<em>",
			"<strong>",
			"<del>",
			"<img",
		];

		const shown: string[] = [];
		for (let end = 1; end <= answer.length; end += 1) {
			const html = render(close(answer.slice(0, end)));
			const text = visible(html);
			const extra = [
				...markers.filter((marker) => count(text, marker) > count(finalText, marker)),
				...tags.filter((tag) => count(html, tag) > count(finalHtml, tag)),
			];
			if (extra.length > 0) {
				shown.push(
					`${JSON.stringify(answer.slice(Math.max(0, end - 30), end))}: ${extra.join(" ")}`,
				);
			}
		}
		expect(shown).toEqual([]);
	});
});
