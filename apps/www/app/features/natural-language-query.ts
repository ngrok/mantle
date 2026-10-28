import {
	type FilterGrammar,
	checkFilterQuery,
	queryUsesQualifiers,
} from "@ngrok/mantle/query-filter";
import { useEffect, useRef, useState } from "react";

/** What the translation endpoint sends back for one request. */
export type TranslateResult =
	| { kind: "query"; query: string }
	| { kind: "off_topic" }
	| { kind: "rate_limited" }
	| { kind: "unavailable" };

/** Turns plain words into one filter query. The demo mocks it; an app calls its server. */
export type TranslateQuery = (request: {
	words: string;
	signal: AbortSignal;
}) => Promise<TranslateResult>;

/** Why a translation left the query as typed. */
export type TranslateFailure = Exclude<TranslateResult["kind"], "query"> | "invalid";

/** Where the translation of the typed words is. */
export type TranslationStatus =
	| { kind: "idle" }
	| { kind: "translating"; words: string }
	| { kind: "translated"; words: string; query: string }
	| { kind: "failed"; words: string; reason: TranslateFailure };

const idle: TranslationStatus = { kind: "idle" };

/**
 * Translates the plain words in a `Query` field into a filter query on Enter.
 *
 * A query that already holds a `key:value` qualifier is left alone, so Enter
 * keeps its usual meaning there. A new submit, an edit, or an unmount aborts
 * the request in flight, and a late result is dropped. A translated query
 * that names a key or a value the grammar does not define is refused, so an
 * invented filter never empties the list.
 *
 * @example
 * ```tsx
 * const nl = useNaturalLanguageQuery({ grammar, translate });
 * <form onSubmit={(event) => { event.preventDefault(); nl.submit(); }}>
 *   <Query.Root grammar={grammar} items={items} value={nl.query} onValueChange={nl.setQuery}>…</Query.Root>
 * </form>
 * ```
 */
export function useNaturalLanguageQuery<Item>({
	grammar,
	translate,
}: {
	grammar: FilterGrammar<Item>;
	translate: TranslateQuery;
}) {
	const [query, setTypedQuery] = useState("");
	const [status, setStatus] = useState<TranslationStatus>(idle);
	const abortRef = useRef<AbortController | null>(null);

	useEffect(() => () => abortRef.current?.abort(), []);

	function abort() {
		abortRef.current?.abort();
		abortRef.current = null;
	}

	async function submit() {
		const words = query.trim();
		if (words === "" || queryUsesQualifiers(grammar, words)) {
			return;
		}

		abort();
		const controller = new AbortController();
		abortRef.current = controller;
		setStatus({ kind: "translating", words });

		let result: TranslateResult;
		try {
			result = await translate({ words, signal: controller.signal });
		} catch {
			result = { kind: "unavailable" };
		}
		// A newer submit, an edit, or an unmount owns the field now.
		if (controller.signal.aborted) {
			return;
		}
		abortRef.current = null;

		if (result.kind !== "query") {
			setStatus({ kind: "failed", words, reason: result.kind });
			return;
		}
		if (result.query.trim() === "" || checkFilterQuery(grammar, result.query).length > 0) {
			setStatus({ kind: "failed", words, reason: "invalid" });
			return;
		}
		setTypedQuery(result.query);
		setStatus({ kind: "translated", words, query: result.query });
	}

	return {
		/** The query in the field. */
		query,
		/** Hand this to `Query.Root` as `onValueChange`. An edit drops the translation state. */
		setQuery: (nextQuery: string) => {
			abort();
			setTypedQuery(nextQuery);
			setStatus(idle);
		},
		status,
		/** Translates the typed words, when they hold no qualifier. */
		submit,
		/** Puts the typed words back in place of the translated query. */
		revert: () => {
			if (status.kind === "translated") {
				setTypedQuery(status.words);
				setStatus(idle);
			}
		},
	};
}
