import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	cancelActivation,
	flushActivations,
	promoteActivation,
	queueActivation,
} from "./activation.js";

const rect = (top: number): DOMRectReadOnly =>
	DOMRectReadOnly.fromRect({ x: 0, y: top, width: 100, height: 50 });

/** A plot element and the spy its activation runs. */
const chart = () => {
	const element = document.createElement("div");
	document.body.append(element);
	const run = vi.fn<(rect: DOMRectReadOnly | null) => void>();
	return { element, run };
};

let now = 0;

beforeEach(() => {
	now = 0;
	vi.spyOn(performance, "now").mockImplementation(() => now);
});

afterEach(() => {
	document.body.replaceChildren();
});

describe("flushActivations", () => {
	test("runs on-screen charts before off-screen ones, each band in document order", () => {
		const order: string[] = [];
		const entries = [
			{ name: "far", top: 3000 },
			{ name: "second", top: 400 },
			{ name: "near", top: 1200 },
			{ name: "first", top: 100 },
		];
		for (const { name, top } of entries) {
			const { element } = chart();
			queueActivation(element, {
				rect: rect(top),
				run: () => {
					order.push(name);
				},
			});
		}
		flushActivations();
		// The viewport is 768 px tall in happy-dom; 1200 and 3000 sit below it.
		expect(order).toEqual(["first", "second", "near", "far"]);
	});

	test("hands each activation the rect it was queued with", () => {
		const { element, run } = chart();
		queueActivation(element, { rect: rect(10), run });
		flushActivations();
		expect(run).toHaveBeenCalledTimes(1);
		expect(run).toHaveBeenLastCalledWith(rect(10));
	});

	test("yields after the slice budget and runs the rest later", async () => {
		const runs: ReturnType<typeof chart>[] = [];
		for (let index = 0; index < 4; index += 1) {
			const entry = chart();
			runs.push(entry);
			entry.run.mockImplementation(() => {
				// Every activation costs 3 ms of the 4 ms slice.
				now += 3;
			});
			queueActivation(entry.element, { rect: rect(index * 10), run: entry.run });
		}
		flushActivations();
		// Two fit in the first slice: the second pushes the clock past the budget.
		expect(runs.map((entry) => entry.run.mock.calls.length)).toEqual([1, 1, 0, 0]);
		await vi.waitFor(() => {
			expect(runs.map((entry) => entry.run.mock.calls.length)).toEqual([1, 1, 1, 1]);
		});
	});

	test("a flush during a pending continuation runs the new chart now", async () => {
		const slow = chart();
		slow.run.mockImplementation(() => {
			now += 5;
		});
		const waiting = chart();
		queueActivation(slow.element, { rect: rect(0), run: slow.run });
		queueActivation(waiting.element, { rect: rect(10), run: waiting.run });
		flushActivations();
		expect(waiting.run).toHaveBeenCalledTimes(0);
		// A second delivery before the yield lands must not wait for it.
		const urgent = chart();
		queueActivation(urgent.element, { rect: rect(20), run: urgent.run });
		flushActivations();
		expect(urgent.run).toHaveBeenCalledTimes(1);
		await vi.waitFor(() => {
			expect(waiting.run).toHaveBeenCalledTimes(1);
		});
	});

	test("a second queue for the same chart replaces the first", () => {
		const { element, run } = chart();
		const stale = vi.fn<(rect: DOMRectReadOnly | null) => void>();
		queueActivation(element, { rect: rect(0), run: stale });
		queueActivation(element, { rect: rect(0), run });
		flushActivations();
		expect(stale).toHaveBeenCalledTimes(0);
		expect(run).toHaveBeenCalledTimes(1);
	});
});

describe("cancelActivation", () => {
	test("drops a queued chart", () => {
		const { element, run } = chart();
		queueActivation(element, { rect: rect(0), run });
		cancelActivation(element);
		flushActivations();
		expect(run).toHaveBeenCalledTimes(0);
	});
});

describe("promoteActivation", () => {
	test("moves an off-screen chart ahead of the other off-screen ones", () => {
		const order: string[] = [];
		const entries = [
			{ name: "below", top: 2000 },
			{ name: "promoted", top: 4000 },
		];
		const elements = new Map<string, HTMLElement>();
		for (const { name, top } of entries) {
			const { element } = chart();
			elements.set(name, element);
			queueActivation(element, {
				rect: rect(top),
				run: () => {
					order.push(name);
				},
			});
		}
		const promoted = elements.get("promoted");
		if (promoted != null) {
			promoteActivation(promoted);
		}
		flushActivations();
		expect(order).toEqual(["promoted", "below"]);
	});
});
