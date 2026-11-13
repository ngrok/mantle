import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	cancelActivation,
	flushActivations,
	isOnScreen,
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

	test("repeat flushes with no new chart run one slice in the caller's task", async () => {
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
		// One delivery reaches the observer of every band, and each of them flushes.
		flushActivations();
		flushActivations();
		flushActivations();
		// A slice per flush runs all four charts before the browser gets a turn.
		expect(runs.map((entry) => entry.run.mock.calls.length)).toEqual([1, 1, 0, 0]);
		await vi.waitFor(() => {
			expect(runs.map((entry) => entry.run.mock.calls.length)).toEqual([1, 1, 1, 1]);
		});
	});

	test("a chart that throws in the first slice leaves the rest of the queue to run", async () => {
		const broken = chart();
		broken.run.mockImplementation(() => {
			throw new Error("tickFormat failed");
		});
		const second = chart();
		const third = chart();
		queueActivation(broken.element, { rect: rect(0), run: broken.run });
		queueActivation(second.element, { rect: rect(10), run: second.run });
		queueActivation(third.element, { rect: rect(20), run: third.run });
		// The first slice runs in the caller's task, so the caller gets the error.
		expect(() => flushActivations()).toThrow("tickFormat failed");
		await vi.waitFor(() => {
			expect(second.run).toHaveBeenCalledTimes(1);
			expect(third.run).toHaveBeenCalledTimes(1);
		});
	});

	test("a chart that throws after a yield reports the error, and the queue runs on", async () => {
		const reportError = vi.fn<(error: unknown) => void>();
		vi.stubGlobal("reportError", reportError);
		const failure = new Error("tickFormat failed");
		const slow = chart();
		slow.run.mockImplementation(() => {
			now += 5;
		});
		const broken = chart();
		broken.run.mockImplementation(() => {
			now += 5;
			throw failure;
		});
		const last = chart();
		queueActivation(slow.element, { rect: rect(0), run: slow.run });
		queueActivation(broken.element, { rect: rect(10), run: broken.run });
		queueActivation(last.element, { rect: rect(20), run: last.run });
		flushActivations();
		expect(broken.run).toHaveBeenCalledTimes(0);
		await vi.waitFor(() => {
			expect(last.run).toHaveBeenCalledTimes(1);
		});
		// No caller awaits a yielded slice, so the error goes to the page's handlers.
		expect(reportError).toHaveBeenCalledTimes(1);
		expect(reportError).toHaveBeenLastCalledWith(failure);
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

	test("a chart promoted while a continuation is pending runs in the next flush", async () => {
		const order: string[] = [];
		// Every activation overspends the slice, so each slice runs one chart.
		const queued = [
			{ name: "first", top: 100 },
			{ name: "below", top: 2000 },
			{ name: "promoted", top: 4000 },
		].map(({ name, top }) => {
			const { element } = chart();
			queueActivation(element, {
				rect: rect(top),
				run: () => {
					now += 5;
					order.push(name);
				},
			});
			return element;
		});
		flushActivations();
		expect(order).toEqual(["first"]);
		const promoted = queued[2];
		if (promoted != null) {
			promoteActivation(promoted);
		}
		flushActivations();
		// The viewport reached it, so it does not wait for the yield.
		expect(order).toEqual(["first", "promoted"]);
		await vi.waitFor(() => {
			expect(order).toEqual(["first", "promoted", "below"]);
		});
	});

	test("a promotion of a chart that is already on screen starts no slice", async () => {
		const slow = chart();
		slow.run.mockImplementation(() => {
			now += 5;
		});
		const waiting = chart();
		// Both rects are inside the 768 px viewport, so both queue as on screen.
		queueActivation(slow.element, { rect: rect(100), run: slow.run });
		queueActivation(waiting.element, { rect: rect(200), run: waiting.run });
		flushActivations();
		// At page load the `visible` band reports the charts the `near` band queued.
		promoteActivation(waiting.element);
		flushActivations();
		expect(waiting.run).toHaveBeenCalledTimes(0);
		await vi.waitFor(() => {
			expect(waiting.run).toHaveBeenCalledTimes(1);
		});
	});
});

describe("isOnScreen", () => {
	test.each([
		{ name: "inside the viewport", top: 100, expected: true },
		{ name: "below the fold", top: 2000, expected: false },
		{ name: "above the viewport", top: -200, expected: false },
	])("a rect $name is on screen: $expected", ({ top, expected }) => {
		const { element } = chart();
		expect(isOnScreen(element, rect(top))).toBe(expected);
	});
});
