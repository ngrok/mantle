import { filterItemsByQuery } from "@ngrok/mantle/query-filter";
import { QueryInput } from "@ngrok/mantle/query-input";
import { useDeferredValue } from "react";
import { domainFilterGrammar, domains } from "~/features/query-input-demos";
import { useQueryParamInput } from "~/features/query-input-url-state";

export function QueryInputFromUrlDemo() {
	const { query, setQuery } = useQueryParamInput();
	const deferredQuery = useDeferredValue(query);
	const visibleDomains = filterItemsByQuery({
		grammar: domainFilterGrammar,
		items: domains,
		query: deferredQuery,
	});

	return (
		<div className="w-full max-w-xl space-y-3">
			<QueryInput.Root
				grammar={domainFilterGrammar}
				items={domains}
				value={query}
				onValueChange={setQuery}
			>
				<QueryInput.Field
					aria-label="Filter domains"
					placeholder="Filter domains, or type a filter like is:custom"
				/>
				<QueryInput.BuilderMenu label="Add filter" />
				<QueryInput.Content />
			</QueryInput.Root>
			<ul aria-label="Domains" className="divide-y rounded-md border">
				{visibleDomains.map((domain) => (
					<li key={domain.id} className="px-3 py-2 font-mono text-sm">
						{domain.name}
					</li>
				))}
			</ul>
		</div>
	);
}
