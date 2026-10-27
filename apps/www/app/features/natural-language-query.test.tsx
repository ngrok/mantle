// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import {
	type TranslateQuery,
	type TranslateResult,
	useNaturalLanguageQuery,
} from "./natural-language-query";
import { projectFilterGrammar } from "./query-demos";
import { mockTranslateQuery } from "./natural-language-query-mock";

/** A translator the test resolves by hand, to order a late result after an edit. */
function deferredTranslator() {
	const pending: Array<(result: TranslateResult) => void> = [];
	const translate = vi.fn<TranslateQuery>(
		() =>
			new Promise<TranslateResult>((resolve) => {
				pending.push(resolve);
			}),
	);
	return { translate, resolveNext: (result: TranslateResult) => pending.shift()?.(result) };
}

function renderNaturalLanguageQuery(translate: TranslateQuery) {
	return renderHook(() => useNaturalLanguageQuery({ grammar: projectFilterGrammar, translate }));
}

describe("useNaturalLanguageQuery", () => {
	test("writes the translated query in place of the typed words", async () => {
		const { result } = renderNaturalLanguageQuery(async () => ({
			kind: "query",
			query: "is:shared -is:archived",
		}));

		act(() => result.current.setQuery("shared projects that aren't archived"));
		await act(() => result.current.submit());

		expect(result.current.query).toBe("is:shared -is:archived");
		expect(result.current.status).toEqual({
			kind: "translated",
			words: "shared projects that aren't archived",
			query: "is:shared -is:archived",
		});

		act(() => result.current.revert());
		expect(result.current.query).toBe("shared projects that aren't archived");
		expect(result.current.status).toEqual({ kind: "idle" });
	});

	test("leaves a query that already holds a qualifier to the field", async () => {
		const translate = vi.fn<TranslateQuery>();
		const { result } = renderNaturalLanguageQuery(translate);

		act(() => result.current.setQuery("is:shared api"));
		await act(() => result.current.submit());

		expect(translate).not.toHaveBeenCalled();
		expect(result.current.query).toBe("is:shared api");
	});

	test("refuses a translation that invents a key or a value", async () => {
		const { result } = renderNaturalLanguageQuery(async () => ({
			kind: "query",
			query: "owner:me is:starred",
		}));

		act(() => result.current.setQuery("my starred projects"));
		await act(() => result.current.submit());

		expect(result.current.query).toBe("my starred projects");
		expect(result.current.status).toMatchObject({ kind: "failed", reason: "invalid" });
	});

	test("drops a late result after the person edits the query", async () => {
		const { translate, resolveNext } = deferredTranslator();
		const { result } = renderNaturalLanguageQuery(translate);

		act(() => result.current.setQuery("shared"));
		let submitted: Promise<void> | undefined;
		act(() => {
			submitted = result.current.submit();
		});
		expect(result.current.status).toEqual({ kind: "translating", words: "shared" });
		expect(translate.mock.calls[0]?.[0].signal.aborted).toBe(false);

		act(() => result.current.setQuery("billing"));
		expect(translate.mock.calls[0]?.[0].signal.aborted).toBe(true);
		await act(async () => {
			resolveNext({ kind: "query", query: "is:shared" });
			await submitted;
		});

		expect(result.current.query).toBe("billing");
		expect(result.current.status).toEqual({ kind: "idle" });
	});

	test("reports a failed request without changing the query", async () => {
		const { result } = renderNaturalLanguageQuery(async () => {
			throw new Error("network down");
		});

		act(() => result.current.setQuery("shared"));
		await act(() => result.current.submit());

		expect(result.current.query).toBe("shared");
		expect(result.current.status).toMatchObject({ kind: "failed", reason: "unavailable" });
	});
});

describe("mockTranslateQuery", () => {
	test("maps the demo words to the demo grammar after a short wait", async () => {
		vi.useFakeTimers();
		const request = mockTranslateQuery({
			words: "shared projects not archived named billing",
			signal: new AbortController().signal,
		});
		await vi.advanceTimersByTimeAsync(700);
		vi.useRealTimers();

		expect(await request).toEqual({
			kind: "query",
			query: "-is:archived is:shared name:billing",
		});
	});
});
