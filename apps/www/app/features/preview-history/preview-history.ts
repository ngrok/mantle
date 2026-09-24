import { NavigationType } from "react-router";
import { z } from "zod";

/**
 * A framed preview document's own history stack: the `location.key` of each
 * entry the document has seen, and where it is now. It mimics what the
 * browser's Back and Forward buttons would do for that document.
 */
type PreviewHistory = {
	keys: ReadonlyArray<string>;
	index: number;
};

/** The stack for a document that has loaded and not navigated. */
function startPreviewHistory(key: string): PreviewHistory {
	return { keys: [key], index: 0 };
}

/**
 * The stack after a navigation. A push drops every forward entry, a replace
 * swaps the current one, and a pop moves to the entry with that key. A pop to
 * a key this document never saw restarts the stack from it.
 *
 * @example
 * ```ts
 * const history = recordNavigation(startPreviewHistory("a"), "b", NavigationType.Push);
 * canGoBack(history); // true
 * ```
 */
function recordNavigation(
	history: PreviewHistory,
	key: string,
	navigationType: NavigationType,
): PreviewHistory {
	if (navigationType === NavigationType.Push) {
		return { keys: [...history.keys.slice(0, history.index + 1), key], index: history.index + 1 };
	}
	if (navigationType === NavigationType.Replace) {
		return { keys: history.keys.with(history.index, key), index: history.index };
	}
	const index = history.keys.indexOf(key);
	if (index === -1) {
		return startPreviewHistory(key);
	}
	return { keys: history.keys, index };
}

/** Whether the document has an entry behind the current one. */
function canGoBack(history: PreviewHistory): boolean {
	return history.index > 0;
}

/** Whether the document has an entry ahead of the current one. */
function canGoForward(history: PreviewHistory): boolean {
	return history.index < history.keys.length - 1;
}

/** Where a history can move: what the toolbar's two buttons need to know. */
type HistoryEdges = {
	canGoBack: boolean;
	canGoForward: boolean;
};

/**
 * The browser's Navigation API for a window, when it has one. It counts every
 * entry of the frame's navigable, including the documents before a full page
 * load, which a stack tracked from the router cannot see. Firefox has no such
 * API, and the tracked stack stands in. Read structurally, so the result does
 * not depend on which `lib.dom` the compiler ships.
 *
 * @example
 * ```ts
 * const edges = readNavigationApi(window) ?? historyEdges(history);
 * ```
 */
function readNavigationApi(target: object): HistoryEdges | null {
	if (!("navigation" in target)) {
		return null;
	}
	const candidate: unknown = target.navigation;
	if (candidate == null || typeof candidate !== "object") {
		return null;
	}
	if (!("canGoBack" in candidate) || typeof candidate.canGoBack !== "boolean") {
		return null;
	}
	if (!("canGoForward" in candidate) || typeof candidate.canGoForward !== "boolean") {
		return null;
	}
	return { canGoBack: candidate.canGoBack, canGoForward: candidate.canGoForward };
}

/**
 * The tracked stack's edges.
 *
 * @example
 * ```ts
 * historyEdges(startPreviewHistory("a")); // { canGoBack: false, canGoForward: false }
 * ```
 */
function historyEdges(history: PreviewHistory): HistoryEdges {
	return { canGoBack: canGoBack(history), canGoForward: canGoForward(history) };
}

/**
 * What a framed preview document tells the docs page after each navigation,
 * so the frame's toolbar can enable its Back and Forward buttons.
 */
const previewHistoryMessageSchema = z.object({
	type: z.literal("mantle-preview-history"),
	canGoBack: z.boolean(),
	canGoForward: z.boolean(),
});

type PreviewHistoryMessage = z.infer<typeof previewHistoryMessageSchema>;

/** What the docs page tells the framed document when a toolbar button is pressed. */
const previewHistoryGoMessageSchema = z.object({
	type: z.literal("mantle-preview-history-go"),
	delta: z.union([z.literal(-1), z.literal(1)]),
});

type PreviewHistoryGoMessage = z.infer<typeof previewHistoryGoMessageSchema>;

/**
 * The message a framed document posts for where its history can move.
 *
 * @example
 * ```ts
 * window.parent.postMessage(previewHistoryMessage(historyEdges(history)), window.location.origin);
 * ```
 */
function previewHistoryMessage(edges: HistoryEdges): PreviewHistoryMessage {
	return { type: "mantle-preview-history", ...edges };
}

/**
 * The message the docs page posts to move the framed document by one entry.
 *
 * @example
 * ```ts
 * iframe.contentWindow?.postMessage(previewHistoryGoMessage(-1), window.location.origin);
 * ```
 */
function previewHistoryGoMessage(delta: -1 | 1): PreviewHistoryGoMessage {
	return { type: "mantle-preview-history-go", delta };
}

/**
 * Reads a history report off a `message` event, or `null` for anything else
 * that arrives on the window: other tools post there too.
 *
 * @example
 * ```ts
 * const report = parsePreviewHistoryMessage(event.data);
 * ```
 */
function parsePreviewHistoryMessage(data: unknown): PreviewHistoryMessage | null {
	const result = previewHistoryMessageSchema.safeParse(data);
	return result.success ? result.data : null;
}

/**
 * Reads a traverse request off a `message` event, or `null` for anything else.
 *
 * @example
 * ```ts
 * const request = parsePreviewHistoryGoMessage(event.data);
 * if (request != null) {
 * 	navigate(request.delta);
 * }
 * ```
 */
function parsePreviewHistoryGoMessage(data: unknown): PreviewHistoryGoMessage | null {
	const result = previewHistoryGoMessageSchema.safeParse(data);
	return result.success ? result.data : null;
}

export {
	//,
	canGoBack,
	canGoForward,
	historyEdges,
	parsePreviewHistoryGoMessage,
	parsePreviewHistoryMessage,
	previewHistoryGoMessage,
	previewHistoryMessage,
	readNavigationApi,
	recordNavigation,
	startPreviewHistory,
};

export type {
	//,
	HistoryEdges,
	PreviewHistory,
	PreviewHistoryGoMessage,
	PreviewHistoryMessage,
};
