import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { closeMarkdown } from "./close-markdown.js";
import { Markdown } from "./markdown.js";

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
		// A footnote reference shows nothing until its `]`, and a bare `[^label]` line can still become a note.
		["See claim[^", "See claim"],
		["See claim[^1", "See claim"],
		["See claim[^1]", "See claim[^1]"],
		["Text\n\n[^1]", "Text\n\n"],
		["Text\n\n[^1]:", "Text\n\n"],
		["x [^a b", "x ^a b"],
		["See[^1](", "See[^1]("],
		["Both[^a][^", "Both[^a]"],
		["one[^_tag]", "one[^_tag]"],
		["Yes![^n", "Yes!"],
		["![^n](/ch", ""],
		["[see[^n]](/pa", "see\\[^n]"],
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
		// Code keeps its text: indented code, and a fence on its item's marker line.
		["    print([1", "    print([1"],
		["- ```js\n  const a = `", "- ```js\n  const a = `"],
		["Text\n    more **b", "Text\n    more **b**"],
		[">     print([1", ">     print([1"],
		["- item\n\n      print([1", "- item\n\n      print([1"],
		["- item\n\n    more **b", "- item\n\n    more **b**"],
		["-     print([1", "-     print([1"],
		["1.     print([1", "1.     print([1"],
		["-\t\tprint([1", "-\t\tprint([1"],
		["- -     print([1", "- -     print([1"],
		["```text\n    ```\nprint([1", "```text\n    ```\nprint([1"],
		["**bold *italic***", "**bold *italic***"],
		["> | a | b |\n> | --- | --- |", "> | a | b |\n> | --- | --- |"],
		["Press <kbd>Ctrl</kb", "Press <kbd>Ctrl</kbd>"],
		["**<kbd>Ct", "**<kbd>Ct</kbd>**"],
		["<span>x", "<span>x"],
		["   ```text\n    ```\nprint([1", "   ```text\n    ```\nprint([1"],
		["```markdown\n> ```\nprint([1", "```markdown\n> ```\nprint([1"],
		["> ```\n> a\noutside [b", "> ```\n> a\noutside b"],
		["**bold\n", "**bold**\n"],
		["- [x", ""],
		["```js\nconsole.log(1);\n``", "```js\nconsole.log(1);\n"],
		["1. Install\n\n2", "1. Install\n\n"],
		["- > ```js\n  > const values = [1", "- > ```js\n  > const values = [1"],
		["| Name | Value |\n--", "| Name | Value |\n| -- | --- |"],
		["| Name | Value |\n:", "| Name | Value |\n| :- | --- |"],
	])("%j → %j", (text, expected) => {
		expect(close(text)).toBe(expected);
	});

	test("closes a paragraph of many `<` and `&` in linear time", () => {
		const start = performance.now();
		close("< ".repeat(256_000));
		close("&a ".repeat(200_000));
		// Why 1,000 ms: a search to the end at each `<` or `&` takes seconds here, and one pass takes milliseconds.
		expect(performance.now() - start).toBeLessThan(1000);
	});

	test("closes many runs of one marker after many of another in linear time, and adds no closers past 32 runs", () => {
		const text = `${"*a ".repeat(40_000)}${"a_ ".repeat(40_000)}`;
		const start = performance.now();
		expect(close(text)).toBe(text);
		// Why 1,000 ms: a scan past each run of the other marker takes seconds here.
		expect(performance.now() - start).toBeLessThan(1000);
	});

	test("closes a `$$` block only with math", () => {
		expect(closeMarkdown("$$\nx^2", { math: true })).toBe("$$\nx^2\n$$");
		expect(closeMarkdown("$$\nx^2", { math: false })).toBe("$$\nx^2");
		expect(closeMarkdown("> $$\n> x^2", { math: true })).toBe("> $$\n> x^2\n> $$");
		expect(closeMarkdown("$$\nx^2\n$", { math: true })).toBe("$$\nx^2\n$$");
		expect(closeMarkdown("$$E = mc^2$", { math: true })).toBe("$$E = mc^2\n$$");
		expect(closeMarkdown("The area is \\(\\pi r^2", { math: true })).toBe(
			"The area is \\(\\pi r^2\\)",
		);
		expect(closeMarkdown("**bold \\(a_1", { math: true })).toBe("**bold \\(a_1\\)**");
		expect(closeMarkdown("costs $5", { math: true })).toBe("costs $5");
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
			"",
			"Limits reset hourly[^reset], per the docs[^2].",
			"",
			"[^reset]: At the top of each **hour**.",
			"[^2]: See [pricing](https://ngrok.com/pricing).",
		].join("\n");
		// Why `streaming` for a prefix: it is the HTML that a reader sees while the answer streams. A footnote
		// reference before its definition is a reference only then.
		const render = (text: string, streaming = true) =>
			// oxlint-disable-next-line react/no-children-prop -- Why: `MarkdownProps` requires `children`, and `createElement` checks the props object.
			renderToStaticMarkup(createElement(Markdown, { streaming, children: text }));
		const visible = (html: string) =>
			html
				.replace(/<pre[\s\S]*?<\/pre>|<code[^>]*>[\s\S]*?<\/code>|<[^>]+>/g, "")
				.replaceAll("&lt;", "<")
				.replaceAll("&amp;", "&");
		const count = (text: string, part: string) => text.split(part).length - 1;
		const finalHtml = render(answer, false);
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
			"<sup",
			"<section",
		];

		const shown: string[] = [];
		for (let end = 1; end <= answer.length; end += 1) {
			const html = render(answer.slice(0, end));
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
