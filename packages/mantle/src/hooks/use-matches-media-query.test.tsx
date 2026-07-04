import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, test, vi } from "vitest";
import { mockMatchMedia } from "../test-utils/mock-match-media.js";
import { useMatchesMediaQuery } from "./use-matches-media-query.js";

const query = "(min-width: 48rem)";

function Probe() {
	const matches = useMatchesMediaQuery(query);
	return <span>{String(matches)}</span>;
}

describe("useMatchesMediaQuery", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("returns false when the query does not match", () => {
		mockMatchMedia({ [query]: false });

		const { result } = renderHook(() => useMatchesMediaQuery(query));

		expect(result.current).toBe(false);
	});

	test("returns true when the query matches", () => {
		mockMatchMedia({ [query]: true });

		const { result } = renderHook(() => useMatchesMediaQuery(query));

		expect(result.current).toBe(true);
	});

	test("re-renders when the query result changes", () => {
		const media = mockMatchMedia({ [query]: false });

		const { result } = renderHook(() => useMatchesMediaQuery(query));
		expect(result.current).toBe(false);

		act(() => {
			media.setMatches(query, true);
		});
		expect(result.current).toBe(true);

		act(() => {
			media.setMatches(query, false);
		});
		expect(result.current).toBe(false);
	});

	test("removes its change listener on unmount", () => {
		const media = mockMatchMedia({ [query]: false });

		const { unmount } = renderHook(() => useMatchesMediaQuery(query));
		expect(media.listenerCount(query)).toBe(1);

		unmount();

		expect(media.listenerCount(query)).toBe(0);
	});

	test("resubscribes when the query changes", () => {
		const narrow = "(max-width: 30rem)";
		const media = mockMatchMedia({ [query]: true, [narrow]: false });

		const { result, rerender } = renderHook(
			({ activeQuery }) => useMatchesMediaQuery(activeQuery),
			{ initialProps: { activeQuery: query } },
		);
		expect(result.current).toBe(true);

		rerender({ activeQuery: narrow });

		expect(result.current).toBe(false);
		expect(media.listenerCount(query)).toBe(0);
		expect(media.listenerCount(narrow)).toBe(1);

		act(() => {
			media.setMatches(narrow, true);
		});
		expect(result.current).toBe(true);
	});

	test("returns false during server rendering even when the client query matches", () => {
		mockMatchMedia({ [query]: true });

		const html = renderToString(<Probe />);

		expect(html).toContain("false");
	});
});
