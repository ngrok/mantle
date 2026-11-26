import { render } from "@testing-library/react";
import { afterAll, beforeAll, expect, test } from "vitest";
import { cdp, commands, server } from "vitest/browser";
import { Markdown } from "./markdown.js";

let styleElement: HTMLStyleElement;

beforeAll(async () => {
	styleElement = document.createElement("style");
	styleElement.textContent = await commands.tailwindCss(
		["./markdown.tsx", "../code-block/code-block.tsx", "../table/table.tsx"],
		{ mantleCss: true },
	);
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

type TraceEvent = { name: string; args?: { elementCount?: number } };

/** The `elementCount` of each style recalc while `run` runs, from a Chromium trace. */
async function restyledElements(run: () => Promise<void>): Promise<number[]> {
	const session = cdp();
	const events: TraceEvent[] = [];
	session.on("Tracing.dataCollected", ({ value }) => {
		// Why the cast: the protocol types each event as a map of strings, but `args` is an object.
		events.push(...(value as unknown as TraceEvent[]));
	});
	const done = new Promise<void>((resolve) => {
		session.on("Tracing.tracingComplete", () => resolve());
	});
	await session.send("Tracing.start", {
		categories: "devtools.timeline,disabled-by-default-devtools.timeline",
		transferMode: "ReportEvents",
	});
	await run();
	await session.send("Tracing.end");
	await done;
	return events
		.filter((event) => event.name === "UpdateLayoutTree")
		.map((event) => event.args?.elementCount ?? 0);
}

const line = (index: number) => `const value${index} = compute(${index}, "text"); // note\n`;
const rows = (count: number) =>
	Array.from({ length: count }, (_, index) => `| ${index} | cell |\n`).join("");
const items = (count: number) =>
	Array.from({ length: count }, (_, index) => `- item ${index}\n`).join("");

/**
 * Why a count and not a time: the elements that one style recalc touches do
 * not depend on the CPU, so the bound holds on any runner. A `:has()` or a
 * structural rule that restyles a subtree on each insert raises it: on the
 * base of #1940 and #1941 this answer restyled a median of 277 elements for
 * each update and a 90th percentile of 531; with them, 7 and 18.
 */
test.runIf(server.browser === "chromium")(
	"a streamed answer restyles a bounded number of elements for each update",
	async () => {
		const source = `Intro.\n\n\`\`\`ts\n${Array.from({ length: 200 }, (_, index) => line(index)).join("")}\`\`\`\n\n| a | b |\n| --- | --- |\n${rows(40)}\n${items(30)}\nDone.`;
		const view = render(<Markdown streaming>{""}</Markdown>);
		const counts = await restyledElements(async () => {
			for (let end = 64; end < source.length + 64; end += 64) {
				view.rerender(<Markdown streaming>{source.slice(0, end)}</Markdown>);
				await new Promise<void>((resolve) => {
					requestAnimationFrame(() => resolve());
				});
				// Why: a layout read forces the style recalc for this update.
				document.body.getBoundingClientRect();
			}
		});
		const sorted = counts.toSorted((a, b) => a - b);
		expect(sorted[sorted.length >> 1]).toBeLessThanOrEqual(30);
		expect(sorted[Math.floor(sorted.length * 0.9)]).toBeLessThanOrEqual(60);
	},
	60_000,
);
