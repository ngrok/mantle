import { renderToString } from "react-dom/server";
import { expect, test } from "vitest";
import { commands } from "vitest/browser";
import * as CodeBlock from "./code-block-parts.js";
import { createMantleCodeBlockValue } from "./mantle-code.js";

const text = (code: string) => createMantleCodeBlockValue({ code, language: "text" });

/** Loads server HTML in a frame with mantle's CSS and a policy that drops each `style` attribute. */
async function loadServerHtml(html: string): Promise<Document> {
	const css = await commands.tailwindCss("./code-block-diff.tsx", { mantleCss: true });
	const frame = document.createElement("iframe");
	frame.style.width = "640px";
	frame.style.height = "480px";
	frame.srcdoc = `<meta http-equiv="Content-Security-Policy" content="style-src-elem 'unsafe-inline'; style-src-attr 'none'"><style>${css}</style>${html}`;
	const loaded = new Promise((resolve) => {
		frame.addEventListener("load", resolve, { once: true });
	});
	document.body.append(frame);
	await loaded;
	const frameDocument = frame.contentDocument;
	if (frameDocument == null) {
		throw new Error("expected the frame document");
	}
	return frameDocument;
}

/** The top of each row of a pane, in order. */
function rowTops(frameDocument: Document, side: "from" | "to"): number[] {
	const pane = frameDocument.querySelector(
		`[data-slot~="code-block-diff-pane"][data-side="${side}"]`,
	);
	return [...(pane?.children ?? [])].map((row) => Math.round(row.getBoundingClientRect().top));
}

test("the server HTML lines up the rows of both panes under a strict style policy", async () => {
	const html = renderToString(
		<CodeBlock.Root>
			<CodeBlock.Diff from={text("start\nold\nend")} to={text("start\nnew\nextra\nend")}>
				{(line) =>
					line.change === "added" &&
					line.lineNumber === 2 && (
						<CodeBlock.DiffCallout>
							A note that takes its own row under the line.
						</CodeBlock.DiffCallout>
					)
				}
			</CodeBlock.Diff>
		</CodeBlock.Root>,
	);
	const frameDocument = await loadServerHtml(html);
	const fromTops = rowTops(frameDocument, "from");
	expect(fromTops).toHaveLength(5);
	expect(new Set(fromTops).size).toBe(5);
	expect(fromTops).toEqual(rowTops(frameDocument, "to"));
});

test("the gutter and the callout stay in view as a pane scrolls to the end of a long line", async () => {
	const html = renderToString(
		<CodeBlock.Root>
			<CodeBlock.Diff from={text(`start\n${"x".repeat(400)}\nend`)} to={text("start\nnew\nend")}>
				{(line) =>
					line.side === "from" &&
					line.lineNumber === 2 && <CodeBlock.DiffCallout>Removed.</CodeBlock.DiffCallout>
				}
			</CodeBlock.Diff>
		</CodeBlock.Root>,
	);
	const frameDocument = await loadServerHtml(html);
	const pane = frameDocument.querySelector<HTMLElement>(
		'[data-slot~="code-block-diff-pane"][data-side="from"]',
	);
	if (pane == null) {
		throw new Error("expected the pane");
	}
	pane.scrollLeft = pane.scrollWidth;
	const paneLeft = pane.getBoundingClientRect().left;
	const line = pane.querySelector('[data-line-number="2"]');
	const gutter = line?.firstElementChild?.getBoundingClientRect();
	const callout = pane
		.querySelector('[data-slot~="code-block-diff-callout"]')
		?.getBoundingClientRect();
	expect(pane.scrollLeft).toBeGreaterThan(1000);
	expect(Math.round(gutter?.left ?? Number.NaN)).toBe(Math.round(paneLeft));
	expect(Math.round(callout?.left ?? Number.NaN)).toBe(Math.round(paneLeft));
});
