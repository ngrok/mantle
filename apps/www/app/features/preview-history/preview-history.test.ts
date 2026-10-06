import { NavigationType } from "react-router";
import { describe, expect, it } from "vitest";
import {
	canGoBack,
	canGoForward,
	historyEdges,
	parsePreviewHistoryGoMessage,
	parsePreviewHistoryMessage,
	previewHistoryMessage,
	readNavigationApi,
	recordNavigation,
	startPreviewHistory,
} from "./preview-history";

describe("recordNavigation", () => {
	const loaded = startPreviewHistory("a");

	it("starts with one entry and nowhere to go", () => {
		expect(canGoBack(loaded)).toBe(false);
		expect(canGoForward(loaded)).toBe(false);
	});

	it("appends on a push and can then go back", () => {
		const history = recordNavigation(loaded, "b", NavigationType.Push);

		expect(history).toEqual({ keys: ["a", "b"], index: 1 });
		expect(canGoBack(history)).toBe(true);
		expect(canGoForward(history)).toBe(false);
	});

	it("moves to the popped entry and can then go forward", () => {
		const pushed = recordNavigation(loaded, "b", NavigationType.Push);
		const history = recordNavigation(pushed, "a", NavigationType.Pop);

		expect(history).toEqual({ keys: ["a", "b"], index: 0 });
		expect(canGoBack(history)).toBe(false);
		expect(canGoForward(history)).toBe(true);
	});

	it("drops the forward entries on a push from the middle", () => {
		const pushed = recordNavigation(loaded, "b", NavigationType.Push);
		const back = recordNavigation(pushed, "a", NavigationType.Pop);
		const history = recordNavigation(back, "c", NavigationType.Push);

		expect(history).toEqual({ keys: ["a", "c"], index: 1 });
		expect(canGoForward(history)).toBe(false);
	});

	it("swaps the current entry on a replace and keeps the forward entries", () => {
		const pushed = recordNavigation(loaded, "b", NavigationType.Push);
		const back = recordNavigation(pushed, "a", NavigationType.Pop);
		const history = recordNavigation(back, "a2", NavigationType.Replace);

		expect(history).toEqual({ keys: ["a2", "b"], index: 0 });
		expect(canGoForward(history)).toBe(true);
	});

	it("restarts from a popped entry this document never saw", () => {
		const pushed = recordNavigation(loaded, "b", NavigationType.Push);
		const history = recordNavigation(pushed, "before-reload", NavigationType.Pop);

		expect(history).toEqual({ keys: ["before-reload"], index: 0 });
	});
});

describe("preview history messages", () => {
	it("reports the stack's edges", () => {
		const history = recordNavigation(startPreviewHistory("a"), "b", NavigationType.Push);

		expect(previewHistoryMessage(historyEdges(history))).toEqual({
			type: "mantle-preview-history",
			canGoBack: true,
			canGoForward: false,
		});
	});

	it("reads only a well-formed report", () => {
		const report = { type: "mantle-preview-history", canGoBack: true, canGoForward: false };

		expect(parsePreviewHistoryMessage(report)).toEqual(report);
		expect(parsePreviewHistoryMessage({ ...report, canGoBack: "yes" })).toBeNull();
		expect(parsePreviewHistoryMessage({ type: "other" })).toBeNull();
		expect(parsePreviewHistoryMessage("mantle-preview-history")).toBeNull();
	});

	it("reads only a one-step traverse request", () => {
		expect(parsePreviewHistoryGoMessage({ type: "mantle-preview-history-go", delta: -1 })).toEqual({
			type: "mantle-preview-history-go",
			delta: -1,
		});
		expect(
			parsePreviewHistoryGoMessage({ type: "mantle-preview-history-go", delta: -2 }),
		).toBeNull();
		expect(parsePreviewHistoryGoMessage({ type: "mantle-preview-history", delta: 1 })).toBeNull();
	});
});

describe("readNavigationApi", () => {
	it("reads the edges off a window with the Navigation API", () => {
		const target = { navigation: { canGoBack: true, canGoForward: false, entries: () => [] } };

		expect(readNavigationApi(target)).toEqual({ canGoBack: true, canGoForward: false });
	});

	it("returns null for a window without it, so the tracked stack stands in", () => {
		expect(readNavigationApi({})).toBeNull();
		expect(readNavigationApi({ navigation: null })).toBeNull();
		expect(readNavigationApi({ navigation: { canGoBack: "yes", canGoForward: false } })).toBeNull();
	});
});
