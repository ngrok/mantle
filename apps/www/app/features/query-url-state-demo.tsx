import { Button } from "@ngrok/mantle/button";
import { DataTable, createColumnHelper, tableFeatures, useTable } from "@ngrok/mantle/data-table";
import { Empty } from "@ngrok/mantle/empty";
import { filterItemsByQuery } from "@ngrok/mantle/query-filter";
import { Query } from "@ngrok/mantle/query";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import { useDeferredValue } from "react";
import { type Project, projectFilterGrammar, projects } from "~/features/query-demos";
import { useQueryParamInput } from "~/features/query-url-state";

const features = tableFeatures({});
const columnHelper = createColumnHelper<typeof features, Project>();
const columns = columnHelper.columns([
	columnHelper.accessor("name", {
		id: "name",
		header: () => <DataTable.Header>Project</DataTable.Header>,
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

export function QueryFromUrlDemo() {
	const { query, setQuery } = useQueryParamInput();
	const deferredQuery = useDeferredValue(query);
	const visibleProjects = filterItemsByQuery({
		grammar: projectFilterGrammar,
		items: projects,
		query: deferredQuery,
	});
	const table = useTable({ features, data: visibleProjects, columns });
	const rows = table.getRowModel().rows;

	return (
		<div className="w-full space-y-3">
			<Query.Root
				grammar={projectFilterGrammar}
				items={projects}
				value={query}
				onValueChange={setQuery}
			>
				<Query.Input
					aria-label="Filter projects"
					placeholder="Filter projects, or type a filter like is:shared"
				/>
				<Query.Content />
			</Query.Root>
			<DataTable.Root table={table}>
				<DataTable.Head />
				<DataTable.Body>
					{rows.length > 0 ? (
						rows.map((row) => <DataTable.Row key={row.id} row={row} />)
					) : (
						<DataTable.EmptyRow>
							<Empty.Root>
								<Empty.Icon svg={<MagnifyingGlassIcon />} />
								<Empty.Title>No projects match this filter</Empty.Title>
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
