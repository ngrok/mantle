import { Button } from "@ngrok/mantle/button";
import { DataTable, createColumnHelper, tableFeatures, useTable } from "@ngrok/mantle/data-table";
import { Empty } from "@ngrok/mantle/empty";
import { filterItemsByQuery } from "@ngrok/mantle/query-filter";
import { QueryInput } from "@ngrok/mantle/query-input";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import { useDeferredValue } from "react";
import { type Domain, domainFilterGrammar, domains } from "~/features/query-input-demos";
import { useQueryParamInput } from "~/features/query-input-url-state";

const features = tableFeatures({});
const columnHelper = createColumnHelper<typeof features, Domain>();
const columns = columnHelper.columns([
	columnHelper.accessor("name", {
		id: "name",
		header: () => <DataTable.Header>Domain</DataTable.Header>,
		cell: (props) => (
			<DataTable.Cell className="text-strong" translate="no">
				{props.getValue()}
			</DataTable.Cell>
		),
	}),
	columnHelper.accessor("description", {
		id: "description",
		header: () => <DataTable.Header>Description</DataTable.Header>,
		cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
	}),
]);

export function QueryInputFromUrlDemo() {
	const { query, setQuery } = useQueryParamInput();
	const deferredQuery = useDeferredValue(query);
	const visibleDomains = filterItemsByQuery({
		grammar: domainFilterGrammar,
		items: domains,
		query: deferredQuery,
	});
	const table = useTable({ features, data: visibleDomains, columns });
	const rows = table.getRowModel().rows;

	return (
		<div className="w-full space-y-3">
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
			<DataTable.Root table={table}>
				<DataTable.Head />
				<DataTable.Body>
					{rows.length > 0 ? (
						rows.map((row) => <DataTable.Row key={row.id} row={row} />)
					) : (
						<DataTable.EmptyRow>
							<Empty.Root>
								<Empty.Icon svg={<MagnifyingGlassIcon />} />
								<Empty.Title>No domains match this filter</Empty.Title>
								<Empty.Actions>
									<Button
										type="button"
										appearance="outlined"
										intent="neutral"
										onClick={() => setQuery("")}
									>
										Clear filter
									</Button>
								</Empty.Actions>
							</Empty.Root>
						</DataTable.EmptyRow>
					)}
				</DataTable.Body>
			</DataTable.Root>
		</div>
	);
}
