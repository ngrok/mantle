import { act, render, screen, within } from "@testing-library/react";
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
					"See [the docs](https://ngrok.com/docs) or [settings](/settings).",
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
		expect(screen.getByRole("link", { name: "settings" })).not.toHaveAttribute("target");
	});

	test("renders a fence as a code block that keeps the code's text", () => {
		const { container } = render(
			<Markdown>{"```yaml\non_http_request:\n  - name: block\n```"}</Markdown>,
		);
		const code = container.querySelector("[data-slot='code-block-code']");
		expect(code).toHaveAttribute("data-lang", "yaml");
		const lines = [...(code?.querySelectorAll("[data-slot='line-content']") ?? [])];
		expect(lines.map((line) => line.textContent)).toEqual(["on_http_request:", "  - name: block"]);
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
		expect(container.querySelector("script")).toBeNull();
		expect(container).toHaveTextContent("on <your-domain> <script>x</script>");
	});

	test("decodes character references in text, not in code", () => {
		const { container } = render(<Markdown>{"Fish &amp; chips &rarr; `&amp;`"}</Markdown>);
		expect(container).toHaveTextContent("Fish & chips → &amp;");
	});

	test("renders unfinished syntax closed while it streams", () => {
		const { container } = render(<Markdown streaming>{"Some **bol"}</Markdown>);
		expect(container.querySelector("strong")).toHaveTextContent("bol");
		expect(container).not.toHaveTextContent("**");
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

	test("reads each finished block in a live region while it streams", () => {
		const { container, rerender } = render(<Markdown streaming>{"First block."}</Markdown>);
		const region = within(container).getByRole("status");
		expect(region).toHaveTextContent("");
		rerender(<Markdown streaming>{"First block.\n\nSecond"}</Markdown>);
		expect(region).toHaveTextContent("First block.");
		expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
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
		const { container, rerender } = render(<Markdown streaming>{""}</Markdown>);
		for (let end = 1; end <= answer.length; end += 1) {
			translateTextNodes(container);
			act(() => {
				rerender(<Markdown streaming>{answer.slice(0, end)}</Markdown>);
			});
		}
		translateTextNodes(container);
		act(() => {
			rerender(<Markdown>{answer}</Markdown>);
		});
		expect(screen.getByRole("link", { name: "link" })).toHaveAttribute("href", "https://ngrok.com");
	});
});
