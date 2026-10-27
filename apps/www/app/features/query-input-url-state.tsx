import { useDebouncedCallback } from "@ngrok/mantle/hooks";
import { useState } from "react";
import { useSearchParams } from "react-router";

/**
 * Owns the typed text of a `QueryInput` and keeps it in the `?q=` URL param,
 * so a filtered list is shareable by its URL.
 *
 * The typed text is the source of truth while you type: the URL write waits
 * 250 ms after the last edit and replaces the history entry. A URL change from
 * outside, such as the back button, replaces the typed text.
 *
 * @example
 * ```tsx
 * const { query, setQuery } = useQueryParamInput();
 * <QueryInput.Root grammar={grammar} items={items} value={query} onValueChange={setQuery}>…</QueryInput.Root>
 * ```
 */
export function useQueryParamInput() {
	const [searchParams, setSearchParams] = useSearchParams();
	const urlQuery = searchParams.get("q") ?? "";
	const [query, setQuery] = useState(urlQuery);
	const [previousUrlQuery, setPreviousUrlQuery] = useState(urlQuery);
	if (urlQuery !== previousUrlQuery) {
		setPreviousUrlQuery(urlQuery);
		setQuery(urlQuery);
	}

	const writeUrlQuery = useDebouncedCallback(
		(nextQuery: string) => {
			setSearchParams(
				(current) => {
					const next = new URLSearchParams(current);
					if (nextQuery === "") {
						next.delete("q");
					} else {
						next.set("q", nextQuery);
					}
					return next;
				},
				{ replace: true, preventScrollReset: true },
			);
		},
		{ waitMs: 250 },
	);

	return {
		query,
		setQuery: (nextQuery: string) => {
			setQuery(nextQuery);
			writeUrlQuery(nextQuery);
		},
	};
}
