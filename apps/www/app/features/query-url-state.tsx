import { useDebouncedCallback } from "@ngrok/mantle/hooks";
import { startTransition, useState } from "react";
import { useSearchParams } from "react-router";

/**
 * When the typed text reaches the URL:
 * - `change`: 250 ms after the last edit.
 * - `submit`: only when the person presses Enter. Use it when one filter pass
 *   over the list is too slow to run while the person types.
 */
export type QueryCommitMode = "change" | "submit";

/**
 * Owns the typed text of a `Query` and keeps it in the `?q=` URL param,
 * so a filtered list is shareable by its URL.
 *
 * The typed text is the source of truth while you type. In `change` mode, the
 * URL write waits 250 ms after the last edit. In `submit` mode, only `submit`
 * writes. In both modes, a clear writes at once. Each write replaces the
 * history entry. A URL change from outside, such as the back button, replaces
 * the typed text.
 *
 * @example
 * ```tsx
 * const { query, setQuery } = useQueryParamInput();
 * <Query.Root grammar={grammar} items={items} value={query} onValueChange={setQuery}>…</Query.Root>
 * ```
 */
export function useQueryParamInput({ commitOn = "change" }: { commitOn?: QueryCommitMode } = {}) {
	const [searchParams, setSearchParams] = useSearchParams();
	const urlQuery = searchParams.get("q") ?? "";
	const [query, setQuery] = useState(urlQuery);
	const [previousUrlQuery, setPreviousUrlQuery] = useState(urlQuery);
	// The `q` this hook last wrote. When the URL comes back with it, the typed text stays.
	const [writtenQuery, setWrittenQuery] = useState(urlQuery);
	if (urlQuery !== previousUrlQuery) {
		setPreviousUrlQuery(urlQuery);
		if (urlQuery !== writtenQuery) {
			setQuery(urlQuery);
			setWrittenQuery(urlQuery);
		}
	}

	function writeUrlQuery(nextQuery: string) {
		if (nextQuery === urlQuery) {
			return;
		}
		setWrittenQuery(nextQuery);
		// The transition keeps the keystroke urgent while the list re-filters.
		startTransition(() => {
			setSearchParams(
				(current) => {
					const next = new URLSearchParams(current);
					// A new filter starts a paginated list over at its first page.
					next.delete("page");
					if (nextQuery === "") {
						next.delete("q");
					} else {
						next.set("q", nextQuery);
					}
					return next;
				},
				{ replace: true, preventScrollReset: true },
			);
		});
	}

	// The write reads `query` when it runs. A URL change from outside during the
	// wait replaces `query`, so the write never puts the old text back.
	const writeTypedQuery = useDebouncedCallback(() => writeUrlQuery(query), { waitMs: 250 });

	return {
		/** The text in the field. */
		query,
		/** The query in the URL. In `submit` mode, filter the list by this. */
		appliedQuery: urlQuery,
		setQuery: (nextQuery: string) => {
			setQuery(nextQuery);
			if (nextQuery === "") {
				writeUrlQuery("");
			} else if (commitOn === "change") {
				writeTypedQuery();
			}
		},
		/** Writes the typed text to the URL now. Call it from the form's submit handler. */
		submit: () => writeUrlQuery(query),
	};
}
