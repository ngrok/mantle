import { render } from "@testing-library/react";
import { afterAll, beforeAll, expect, test } from "vitest";
import { commands } from "vitest/browser";
import { Markdown } from "./markdown.js";

let styleElement: HTMLStyleElement;

beforeAll(async () => {
	styleElement = document.createElement("style");
	styleElement.textContent = await commands.tailwindCss(
		["./markdown.tsx", "../code-block/code-block.tsx"],
		{ mantleCss: true },
	);
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

const code = [
	"function greet(name: string) {",
	'\tconst text = "{ not a fold";',
	"\treturn text + name;",
	"}",
	'greet("a");',
].join("\n");
const answer = `Intro.\n\n\`\`\`ts\n${code}\n\`\`\`\n`;

test("a streamed fence keeps its gutter and folds once the answer ends", async () => {
	const { container, rerender } = render(<Markdown streaming>{answer}</Markdown>);
	const pre = container.querySelector("pre");
	const firstContent = () => container.querySelector(".mantle-code-line-content");
	await expect
		.poll(() => container.querySelectorAll(".mantle-code-line-content > span").length)
		.toBeGreaterThan(0);
	// Why the gutter while streaming: the toggles appear at the end and must shift no code.
	expect(pre).toHaveAttribute("data-foldable");
	expect(container.querySelector(".mantle-code-fold-toggle")).toBeNull();
	const leftWhileStreaming = firstContent()?.getBoundingClientRect().left;

	rerender(<Markdown>{answer}</Markdown>);
	await expect.poll(() => container.querySelectorAll(".mantle-code-fold-toggle").length).toBe(1);
	// Why one toggle: the brace in the string is not a fold.
	const opener = container.querySelector(".mantle-code-line-opener");
	expect(opener?.getAttribute("data-line-number")).toBe("1");
	// The opener line drops its gutter margin because its toggle fills the gutter.
	const lines = [...container.querySelectorAll<HTMLElement>(".mantle-code-line")];
	expect(lines[1]?.querySelector(".mantle-code-line-content")?.getBoundingClientRect().left).toBe(
		leftWhileStreaming,
	);

	container.querySelector<HTMLButtonElement>(".mantle-code-fold-toggle")?.click();
	await expect
		.poll(() => lines.map((line) => getComputedStyle(line).display !== "none"))
		.toEqual([true, false, false, true, true]);
	expect(container.querySelector(".mantle-code-fold-toggle")).toHaveAttribute(
		"aria-expanded",
		"false",
	);
	// Copy, find in page, and crawlers still read the whole code.
	expect(container.querySelector("pre code")?.textContent).toBe(code);
});
