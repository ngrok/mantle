import { Button } from "@ngrok/mantle/button";
import { DataTable, createColumnHelper, tableFeatures, useTable } from "@ngrok/mantle/data-table";
import { Empty } from "@ngrok/mantle/empty";
import {
	filterItemsByQuery,
	parseFilterQuery,
	queryUsesQualifiers,
	toggleFacet,
} from "@ngrok/mantle/query-filter";
import { Query } from "@ngrok/mantle/query";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import { useDeferredValue, useState } from "react";
import { type Project, projectFilterGrammar, projects } from "~/features/query-demos";

type ProjectState = "shared" | "private" | "archived";

/** The states a project row shows. */
function projectStates(project: Project): ProjectState[] {
	const visibility = project.shared ? "shared" : "private";
	return project.archived ? [visibility, "archived"] : [visibility];
}

/** Whether the query already keeps only the projects in this state. */
function hasStateFilter(query: string, state: ProjectState) {
	return parseFilterQuery(projectFilterGrammar, query).some(
		(token) =>
			token.kind === "facet" &&
			token.key === "is" &&
			!token.negated &&
			token.members.length === 1 &&
			token.members[0]?.value === state,
	);
}

const features = tableFeatures({});
const columnHelper = createColumnHelper<typeof features, Project>();

export function FilterFromAValueDemo() {
	const [query, setQuery] = useState("");
	const deferredQuery = useDeferredValue(query);
	const visibleProjects = filterItemsByQuery({
		grammar: projectFilterGrammar,
		items: projects,
		query: deferredQuery,
	});

	function toggleState(state: ProjectState) {
		setQuery((current) =>
			toggleFacet({
				grammar: projectFilterGrammar,
				query: current,
				facet: { key: "is", value: state, negated: false },
			}),
		);
	}

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
		columnHelper.display({
			id: "state",
			header: () => <DataTable.Header>State</DataTable.Header>,
			cell: (props) => (
				<DataTable.Cell>
					<span className="flex flex-wrap gap-1">
						{projectStates(props.row.original).map((state) => (
							<Button
								key={state}
								type="button"
								appearance="outlined"
								intent="neutral"
								size="xs"
								className="aria-pressed:border-accent-600 aria-pressed:bg-accent-500/10 aria-pressed:text-accent-700"
								aria-pressed={hasStateFilter(query, state)}
								onClick={() => toggleState(state)}
							>
								{state}
							</Button>
						))}
					</span>
				</DataTable.Cell>
			),
		}),
	]);
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
					placeholder="Filter projects, or select a state in the table"
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
								<Empty.Description>
									{queryUsesQualifiers(projectFilterGrammar, deferredQuery)
										? "Remove a filter to see more projects."
										: "Check the spelling, or try a filter like is:shared."}
								</Empty.Description>
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
