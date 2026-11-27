import { act, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import { Markdown, type MarkdownBlockEvent, type MarkdownComponents } from "./markdown.js";
import { markdownMath } from "./markdown-math.js";

describe("Markdown", () => {
	test("renders GitHub Markdown as mantle parts", () => {
		render(
			<Markdown>
				{[
					"## Agents",
					"",
					"| Name | Port |",
					"| --- | ---: |",
					"| web | 8080 |",
					"",
					"- [x] Install the agent",
					"- [ ] Add a domain",
					"",
					"See [the docs](https://ngrok.com/docs), [status](//status.ngrok.com), or [settings](/settings).",
					"",
					"![**Agent** &amp; `ngrok` status](/status.png)",
				].join("\n")}
			</Markdown>,
		);
		expect(screen.getByRole("heading", { level: 2, name: "Agents" })).toBeInTheDocument();
		expect(screen.getByRole("columnheader", { name: "Port" })).toBeInTheDocument();
		expect(screen.getByRole("cell", { name: "8080" })).toBeInTheDocument();
		expect(screen.getByRole("checkbox", { name: "Install the agent" })).toBeChecked();
		expect(screen.getByRole("checkbox", { name: "Add a domain" })).not.toBeChecked();
		const docs = screen.getByRole("link", { name: "the docs" });
		expect(docs).toHaveAttribute("target", "_blank");
		expect(docs).toHaveAttribute("rel", "noopener noreferrer");
		expect(screen.getByRole("link", { name: "status" })).toHaveAttribute("target", "_blank");
		expect(screen.getByRole("link", { name: "settings" })).not.toHaveAttribute("target");
		expect(screen.getByRole("img")).toHaveAccessibleName("Agent & ngrok status");
	});

	test("renders a fence as a code block that keeps the code's text", () => {
		const { container } = render(
			<Markdown>{"```yaml\non_http_request:\n  - name: block\n```"}</Markdown>,
		);
		const code = container.querySelector("[data-slot='code-block-code']");
		expect(code).toHaveAttribute("data-lang", "yaml");
		// Why the whole text: copy, find in page, and crawlers read it, so it must be the code itself.
		expect(code?.textContent).toBe("on_http_request:\n  - name: block");
		expect(screen.getByRole("heading", { name: "yaml" })).toBeInTheDocument();
	});

	test("renders a link or an image with an unsafe URL as text", () => {
		const { container } = render(
			<Markdown>
				{"[click](javascript:alert(1)) and ![pixel](data:image/png;base64,AAAA)"}
			</Markdown>,
		);
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
		expect(container.querySelector("img")).toBeNull();
		expect(container).toHaveTextContent("click and pixel");
	});

	test("renders the allowed inline tags and shows other HTML as text", () => {
		const { container } = render(
			<Markdown>
				{"H<sub>2</sub>O, press <kbd>Ctrl</kbd>, run `ngrok` on <your-domain> <script>x</script>"}
			</Markdown>,
		);
		expect(container.querySelector("sub")).toHaveTextContent("2");
		expect(container.querySelector("kbd")).toHaveTextContent("Ctrl");
		expect(container.querySelector("kbd")).toHaveAttribute("translate", "no");
		expect(container.querySelector("sub")).not.toHaveAttribute("translate");
		expect(container.querySelector("script")).toBeNull();
		expect(container).toHaveTextContent("on <your-domain> <script>x</script>");
	});

	test("decodes character references in text and links, not in code", () => {
		const { container } = render(
			<Markdown>
				{"Fish &amp; chips &rarr; `&amp;` &ouml; &constructor; [q](/s?a=1&amp;b=2)"}
			</Markdown>,
		);
		expect(container).toHaveTextContent("Fish & chips → &amp; ö &constructor; q");
		expect(screen.getByRole("link", { name: "q" })).toHaveAttribute("href", "/s?a=1&b=2");
	});

	test("renders unfinished syntax closed while it streams", () => {
		const { container } = render(<Markdown streaming>{"Some **bol"}</Markdown>);
		expect(container.querySelector("strong")).toHaveTextContent("bol");
		expect(container).not.toHaveTextContent("**");
	});

	test("a truncated answer keeps its unfinished end closed after the stream ends", () => {
		const text = "See [the docs][docs] for **ngrok http";
		const { container, rerender } = render(<Markdown streaming>{text}</Markdown>);
		rerender(<Markdown truncated>{text}</Markdown>);
		expect(container.querySelector("strong")).toHaveTextContent("ngrok http");
		expect(container).not.toHaveTextContent("**");

		// Why a finished block, then a definition: the final parse then reads the whole answer again, which must close it too.
		const streamed = "First.\n\nSecond.\n\n";
		rerender(<Markdown streaming>{streamed}</Markdown>);
		const withDefinition = `${streamed}[docs]: https://ngrok.com/docs\n\n${text}`;
		rerender(<Markdown streaming>{withDefinition}</Markdown>);
		rerender(<Markdown truncated>{withDefinition}</Markdown>);
		expect(screen.getByRole("link", { name: "the docs" })).toHaveAttribute(
			"href",
			"https://ngrok.com/docs",
		);
		expect(container.querySelector("strong")).toHaveTextContent("ngrok http");

		rerender(<Markdown>{text}</Markdown>);
		expect(container).toHaveTextContent("**ngrok http");
	});

	test("never renders a finished block again while the answer streams", () => {
		const paragraph = vi.fn<NonNullable<MarkdownComponents["paragraph"]>>(({ children }) => (
			<p>{children}</p>
		));
		const components: MarkdownComponents = { paragraph };
		const { rerender } = render(
			<Markdown streaming components={components}>
				{"First paragraph.\n\nSecond"}
			</Markdown>,
		);
		const firstRenders = paragraph.mock.calls.filter(
			([props]) => props.token.raw === "First paragraph.",
		);
		expect(firstRenders).toHaveLength(1);

		rerender(
			<Markdown streaming components={components}>
				{"First paragraph.\n\nSecond paragraph, longer."}
			</Markdown>,
		);
		expect(
			paragraph.mock.calls.filter(([props]) => props.token.raw === "First paragraph."),
		).toHaveLength(1);
		expect(screen.getByText("Second paragraph, longer.")).toBeInTheDocument();
	});

	test("keeps the element of a block when it finishes, so it never remounts", () => {
		const { container, rerender } = render(<Markdown streaming>{"Hello wor"}</Markdown>);
		const streamed = container.querySelector("p");
		rerender(<Markdown streaming>{"Hello world.\n\nNext"}</Markdown>);
		rerender(<Markdown>{"Hello world.\n\nNext block."}</Markdown>);
		expect(container.querySelector("p")).toBe(streamed);
		expect(streamed).toHaveTextContent("Hello world.");
	});

	test("reports each finished block once, then the end of the stream", () => {
		const onBlockComplete = vi.fn<(event: MarkdownBlockEvent) => void>();
		const onStreamEnd = vi.fn<() => void>();
		const props = { onBlockComplete, onStreamEnd };
		const { rerender } = render(
			<Markdown streaming {...props}>
				{"# Title"}
			</Markdown>,
		);
		expect(onBlockComplete).toHaveBeenCalledTimes(0);
		rerender(
			<Markdown streaming {...props}>
				{"# Title\n\nBody"}
			</Markdown>,
		);
		expect(onBlockComplete).toHaveBeenCalledTimes(1);
		expect(onBlockComplete).toHaveBeenLastCalledWith(
			expect.objectContaining({ index: 0, token: expect.objectContaining({ type: "heading" }) }),
		);
		rerender(<Markdown {...props}>{"# Title\n\nBody text."}</Markdown>);
		expect(onBlockComplete).toHaveBeenCalledTimes(2);
		expect(onBlockComplete).toHaveBeenLastCalledWith(expect.objectContaining({ index: 1 }));
		expect(onStreamEnd).toHaveBeenCalledTimes(1);
	});

	test("marks the answer busy while it streams, and never makes it a live region", () => {
		const { container, rerender } = render(
			<Markdown streaming>{"First block.\n\nSecond"}</Markdown>,
		);
		const root = container.firstElementChild;
		expect(root).toHaveAttribute("aria-busy", "true");
		expect(container.querySelector("[aria-live], [role=status], [role=log]")).toBeNull();
		rerender(<Markdown>{"First block.\n\nSecond block."}</Markdown>);
		expect(root).not.toHaveAttribute("aria-busy");
	});

	test("reads math with the math extension, and leaves prices as text", () => {
		const extensions = [markdownMath()];
		const components: MarkdownComponents = {
			math: ({ token }) => (
				<span data-testid={token.display ? "display" : "inline"}>{token.text}</span>
			),
		};
		render(
			<Markdown extensions={extensions} components={components}>
				{"Area is $\\pi r^2$ for $5 and $10.\n\n$$\nE = mc^2\n$$"}
			</Markdown>,
		);
		expect(screen.getByTestId("inline")).toHaveTextContent("\\pi r^2");
		expect(screen.getByTestId("display")).toHaveTextContent("E = mc^2");
		expect(screen.getByText(/for \$5 and \$10\./)).toBeInTheDocument();
	});

	test("decodes character references in a link destination before its check", () => {
		render(
			<Markdown>{"[q](/s?a=1&amp;b=2) [x](&#106;avascript:alert(1)) &constructor;"}</Markdown>,
		);
		expect(screen.getByText(/&constructor;/)).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "q" })).toHaveAttribute("href", "/s?a=1&b=2");
		expect(screen.queryByRole("link", { name: "x" })).toBeNull();
	});

	test("pairs inline tags in linear time", () => {
		const start = performance.now();
		render(<Markdown>{"x <b>".repeat(8000)}</Markdown>);
		// Why 1,000 ms: a scan for each unclosed tag takes seconds here, and one pass takes milliseconds.
		expect(performance.now() - start).toBeLessThan(1000);
	});

	test("renders deeply nested inline tags past the depth limit as text", () => {
		const { container } = render(
			<Markdown>{`x ${"<b>".repeat(5000)}y${"</b>".repeat(5000)}`}</Markdown>,
		);
		expect(container.querySelectorAll("b")).toHaveLength(32);
	});

	test("keeps one element for each token when an inline run changes", () => {
		const { container, rerender } = render(<Markdown>{"x <b>y *z*</b> a **b** c `d` e"}</Markdown>);
		rerender(<Markdown>{"x <b>y z</b> a **b** c `d` e"}</Markdown>);
		expect(container.querySelectorAll("strong")).toHaveLength(1);
		expect(container).toHaveTextContent(/^x y z a b c d e$/);
	});

	test("renders each item of a list as loose when a later blank line makes the list loose", () => {
		const { container, rerender } = render(<Markdown streaming>{"- a\n- b"}</Markdown>);
		rerender(<Markdown>{"- a\n- b\n\n- c"}</Markdown>);
		expect(container.querySelectorAll("li > p")).toHaveLength(3);
	});

	test("renders inline HTML with an `html` component when one is set", () => {
		const components: MarkdownComponents = {
			html: ({ token }) => <span data-testid="html">{token.raw}</span>,
		};
		render(<Markdown components={components}>{"Press <kbd>Ctrl</kbd>."}</Markdown>);
		expect(screen.getAllByTestId("html").map((node) => node.textContent)).toEqual([
			"<kbd>",
			"</kbd>",
		]);
	});

	test("renders display math inside a paragraph without a block element", () => {
		const { container } = render(
			<Markdown extensions={[markdownMath()]}>{"Before $$x$$ after."}</Markdown>,
		);
		expect(container.querySelector("p pre")).toBeNull();
		expect(container.querySelector("p")).toHaveTextContent("Before x after.");
	});

	test("resolves a reference link in a list item when the stream ends", () => {
		const answer = "- [docs][ref]\n\nAfter\n\n[ref]: https://ngrok.com";
		// Why the prefix: the list finishes before its definition arrives.
		const { rerender } = render(<Markdown streaming>{answer.slice(0, 22)}</Markdown>);
		expect(screen.queryByRole("link", { name: "docs" })).toBeNull();
		rerender(<Markdown>{answer}</Markdown>);
		expect(screen.getByRole("link", { name: "docs" })).toHaveAttribute("href", "https://ngrok.com");
	});

	test("renders footnotes as superscript links and a list with back links", () => {
		const { container } = render(
			<Markdown>
				{"One[^x], two[^y], one again[^x].\n\n[^y]: Note **why**\n[^x]: Note x\n[^z]: Unused"}
			</Markdown>,
		);
		const refs = screen.getAllByRole("link", { name: /^\d$/ });
		expect(refs.map((ref) => ref.textContent)).toEqual(["1", "2", "1"]);
		const list = screen.getByRole("region", { name: "Footnotes" });
		const items = list.querySelectorAll("li");
		expect([...items].map((item) => item.textContent)).toEqual(["Note x↩︎↩︎2", "Note why↩︎"]);
		const back = screen.getByRole("link", { name: "Back to reference 1-2" });
		const target = container.querySelector(back.getAttribute("href")?.replace("#", "#") ?? "");
		expect(document.getElementById(back.getAttribute("href")?.slice(1) ?? "")).toBe(refs[2]);
		expect(target).toBe(refs[2]);
		expect(document.getElementById(refs[1]?.getAttribute("href")?.slice(1) ?? "")).toBe(items[1]);
		expect(refs[0]).toHaveAccessibleDescription("Footnotes");
	});

	test("renders a reference with no note as text once a one-paragraph answer ends", () => {
		const { container, rerender } = render(<Markdown streaming>{"Claim[^1]."}</Markdown>);
		// Why no link: the note has not arrived, so there is nothing to go to yet.
		expect(container.querySelector("sup[data-footnote-ref]")).toHaveTextContent("1");
		expect(screen.queryByRole("link")).toBeNull();
		rerender(<Markdown>{"Claim[^1]."}</Markdown>);
		expect(container.querySelector("sup")).toBeNull();
		expect(screen.getByText("Claim[^1].")).toBeInTheDocument();
	});

	test("numbers only the notes that the answer cites, and keeps a reference in a label as text", () => {
		const { container } = render(
			<Markdown>
				{
					"[^unused]: Hidden[^b]\n\nBody[^a] and [the docs[^a]](/docs).\n\n> Quote[^q]\n>\n> [^q]: Quoted\n\n[^a]: Note a\n[^b]: Note b"
				}
			</Markdown>,
		);
		const list = screen.getByRole("region", { name: "Footnotes" });
		expect([...list.querySelectorAll("li")].map((item) => item.id.split("fn-")[1])).toEqual([
			"1",
			"2",
		]);
		expect(list).toHaveTextContent("Note a");
		expect(list).toHaveTextContent("Quoted");
		expect(list).not.toHaveTextContent("Note b");
		expect(screen.getByRole("link", { name: "the docs[^a]" })).toHaveAttribute("href", "/docs");
		expect(container.querySelector("a a")).toBeNull();
	});

	test("keeps each back link's target when a citation moves to another paragraph", () => {
		const { container, rerender } = render(
			<Markdown>{"One[^a].\n\nMiddle[^a].\n\nThree.\n\n[^a]: Note"}</Markdown>,
		);
		rerender(<Markdown>{"One.\n\nMiddle[^a].\n\nThree[^a].\n\n[^a]: Note"}</Markdown>);
		const targets = [...container.querySelectorAll("[data-footnote-backref]")].map(
			(link) => container.querySelectorAll(`[id="${link.getAttribute("href")?.slice(1)}"]`).length,
		);
		expect(targets).toEqual([1, 1]);
	});

	test("renders an image whose alt text starts with a caret", () => {
		render(<Markdown>{"![^ caret](/image.png)"}</Markdown>);
		expect(screen.getByRole("img")).toHaveAccessibleName("^ caret");
	});

	test("resolves a reference link in a note's list item when the stream ends", () => {
		const answer =
			"Text[^1]\n\n[^1]: Steps:\n    - [docs][ref]\n\nMore.\n\n[ref]: https://ngrok.com/docs";
		const { rerender } = render(
			<Markdown streaming>{answer.slice(0, answer.indexOf("[ref]:"))}</Markdown>,
		);
		rerender(<Markdown>{answer}</Markdown>);
		expect(screen.getByRole("link", { name: "docs" })).toHaveAttribute(
			"href",
			"https://ngrok.com/docs",
		);
	});

	test("gives the footnotes of two answers different ids", () => {
		render(
			<>
				<Markdown>{"A[^1]\n\n[^1]: a"}</Markdown>
				<Markdown>{"B[^1]\n\n[^1]: b"}</Markdown>
			</>,
		);
		const [first, second] = screen.getAllByRole("link", { name: "1" });
		expect(first?.getAttribute("href")).not.toBe(second?.getAttribute("href"));
	});

	test("joins the `data-slot` of an `asChild` parent", () => {
		const { container } = render(<Markdown data-slot="card-body">{"Text"}</Markdown>);
		expect(container.firstElementChild).toHaveAttribute("data-slot", "card-body markdown");
	});

	test("survives a browser translation at each step of a stream", () => {
		const answer = [
			"Run **ngrok** *now*, then `ngrok http 80` on <your-domain>.",
			"",
			"- See [the docs](https://ngrok.com/docs) and ~~old~~ notes_with_underscores.",
			"- H<sub>2</sub>O at 20~25 °C, *mixed **bold** text*, and ***both***.",
			"",
			"> A quote with a [link][ref] and an image ![alt](https://ngrok.com/a.png).",
			"",
			"| a | b |",
			"| - | - |",
			"| **x** | [y](https://y.com) |",
			"",
			"[ref]: https://ngrok.com",
		].join("\n");
		// Why fake frames: the answer renders once per frame, and each step must commit before the next translation.
		vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
		const { container, rerender } = render(<Markdown streaming>{""}</Markdown>);
		for (let end = 1; end <= answer.length; end += 1) {
			translateTextNodes(container);
			act(() => {
				rerender(<Markdown streaming>{answer.slice(0, end)}</Markdown>);
			});
			act(() => {
				vi.advanceTimersToNextFrame();
			});
		}
		vi.useRealTimers();
		translateTextNodes(container);
		act(() => {
			rerender(<Markdown>{answer}</Markdown>);
		});
		expect(screen.getByRole("link", { name: "link" })).toHaveAttribute("href", "https://ngrok.com");
	});
});
