import { render } from "@testing-library/react";
import { afterAll, beforeAll, expect, test } from "vitest";
import { cdp, commands, server } from "vitest/browser";
import { Markdown } from "./markdown.js";

let styleElement: HTMLStyleElement;

beforeAll(async () => {
	styleElement = document.createElement("style");
	styleElement.textContent = await commands.tailwindCss(
		[
			"./markdown.tsx",
			"../code-block/code-block.tsx",
			"../button/icon-button.tsx",
			"../button/icon-button-variants.ts",
			"../table/table.tsx",
		],
		{ mantleCss: true },
	);
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

type TraceEvent = {
	name: string;
	ts: number;
	args?: { elementCount?: number; beginData?: { frame?: string } };
};

/** The name of the mark that starts each update. */
const UPDATE_MARK = "mantle-restyle-update";
/** The elements of the recalc that names this test's frame in the trace. */
const FRAME_MARKER_SIZE = 2027;

/**
 * The elements that the style recalcs of each update restyled, from a
 * Chromium trace. `run` calls `mark` before each update.
 */
async function restyledPerUpdate(run: (mark: () => void) => Promise<void>): Promise<number[]> {
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
		categories: "devtools.timeline,disabled-by-default-devtools.timeline,blink.user_timing",
		transferMode: "ReportEvents",
	});
	// Why a marker: the trace is browser-wide, and other test files run in parallel in their own frames.
	const marker = document.createElement("div");
	marker.innerHTML = "<i></i>".repeat(FRAME_MARKER_SIZE);
	document.body.append(marker);
	marker.getBoundingClientRect();
	marker.remove();
	await run(() => performance.mark(UPDATE_MARK));
	await session.send("Tracing.end");
	await done;
	// Why only events with a count: a recalc traced as a begin and an end event counts only on the end.
	const recalcs = events
		.filter((event) => event.name === "UpdateLayoutTree" && event.args?.elementCount !== undefined)
		.toSorted((a, b) => a.ts - b.ts);
	const frame = recalcs.find((event) => {
		// Why a narrow band: another frame can recalc more than the marker first.
		const count = event.args?.elementCount ?? 0;
		return count >= FRAME_MARKER_SIZE && count <= FRAME_MARKER_SIZE + 4;
	})?.args?.beginData?.frame;
	const marks = events
		.filter((event) => event.name === UPDATE_MARK)
		.map((event) => event.ts)
		.toSorted((a, b) => a - b);
	// Why a sum for each update: one update can force more than one recalc.
	const perUpdate = marks.map(() => 0);
	for (const event of recalcs) {
		const update = marks.findLastIndex((ts) => ts <= event.ts);
		if (update >= 0 && event.args?.beginData?.frame === frame) {
			perUpdate[update] = (perUpdate[update] ?? 0) + (event.args?.elementCount ?? 0);
		}
	}
	return perUpdate;
}

const line = (index: number) => `const value${index} = compute(${index}, "text"); // note\n`;
const rows = (count: number) =>
	Array.from({ length: count }, (_, index) => `| ${index} | cell |\n`).join("");
const items = (count: number) =>
	Array.from({ length: count }, (_, index) => `- item ${index}\n`).join("");

/**
 * Why a count and not a time: the elements that one style recalc touches do
 * not depend on the CPU, so the bound holds on any runner. A `:has()` or a
 * structural rule that restyles a subtree on each insert raises it. On the
 * base of #1940 and #1941 this answer restyled a median of 1,393 elements
 * for each of its 158 updates, a 90th percentile of 2,777, and 218,291 in
 * total; with them, 19, 25, and about 3,200.
 */
test.runIf(server.browser === "chromium")(
	"a streamed answer restyles a bounded number of elements for each update",
	async () => {
		const source = `Intro.\n\n\`\`\`ts\n${Array.from({ length: 200 }, (_, index) => line(index)).join("")}\`\`\`\n\n| a | b |\n| --- | --- |\n${rows(40)}\n${items(30)}\nDone.`;
		const view = render(<Markdown streaming>{""}</Markdown>);
		const counts = await restyledPerUpdate(async (mark) => {
			for (let end = 64; end < source.length + 64; end += 64) {
				mark();
				view.rerender(<Markdown streaming>{source.slice(0, end)}</Markdown>);
				await new Promise<void>((resolve) => {
					requestAnimationFrame(() => resolve());
				});
				// Why: a layout read forces the style recalc for this update.
				document.body.getBoundingClientRect();
			}
		});
		const sorted = counts.toSorted((a, b) => a - b);
		// Why a floor on the count: a stream that reached the page in a few updates proves nothing.
		expect(counts.length).toBeGreaterThan(100);
		expect(counts.filter((count) => count > 0).length).toBeGreaterThan(100);
		expect(sorted[sorted.length >> 1]).toBeLessThanOrEqual(60);
		expect(sorted[Math.floor(sorted.length * 0.9)]).toBeLessThanOrEqual(100);
		// Why the total too: a cost in the table's updates alone moves no percentile.
		expect(counts.reduce((sum, count) => sum + count, 0)).toBeLessThanOrEqual(10_000);
	},
	60_000,
);
