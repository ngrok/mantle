import { Button, IconButton } from "@ngrok/mantle/button";
import { DataTable, createColumnHelper, tableFeatures, useTable } from "@ngrok/mantle/data-table";
import { Empty } from "@ngrok/mantle/empty";
import {
	type FilterGrammar,
	defineRemoteFilterGrammar,
	filterItemsByQuery,
} from "@ngrok/mantle/query-filter";
import { Query } from "@ngrok/mantle/query";
import { CopyIcon } from "@phosphor-icons/react/Copy";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import { useDeferredValue, useState } from "react";

export type Project = {
	id: string;
	name: string;
	description: string;
	shared: boolean;
	archived: boolean;
};

export const projects: Project[] = [
	{
		id: "p_1",
		name: "billing-api",
		description: "Invoices and payments",
		shared: true,
		archived: false,
	},
	{
		id: "p_2",
		name: "marketing-site",
		description: "Public website",
		shared: true,
		archived: false,
	},
	{
		id: "p_3",
		name: "design-tokens",
		description: "Old color scales",
		shared: true,
		archived: true,
	},
	{
		id: "p_4",
		name: "staging-api",
		description: "Staging API",
		shared: false,
		archived: false,
	},
	{
		id: "p_5",
		name: "webhook-tests",
		description: "Local webhook tests",
		shared: false,
		archived: false,
	},
];

export const projectFilterGrammar: FilterGrammar<Project> = {
	keys: [
		{
			key: "name",
			aliases: ["title"],
			description: "Text in the project name",
			matches: (project, value) => project.name.toLowerCase().includes(value.toLowerCase()),
		},
		{
			key: "description",
			aliases: ["desc"],
			description: "Text in the description",
			prose: true,
			matches: (project, value) => project.description.toLowerCase().includes(value.toLowerCase()),
		},
		{
			key: "is",
			description: "The project state",
			values: [
				{ value: "shared", description: "Your team can see it" },
				{ value: "private", description: "Only you can see it", aliases: ["personal"] },
				{ value: "archived", description: "Kept for reference" },
			],
			matches: (project, value) => {
				switch (value) {
					case "shared":
						return project.shared;
					case "private":
						return !project.shared;
					case "archived":
						return project.archived;
					default:
						return false;
				}
			},
		},
	],
	getSearchText: (project) => [project.name, project.description, project.id].join("\n"),
};

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
	columnHelper.accessor((project) => (project.shared ? "Shared" : "Private"), {
		id: "visibility",
		header: () => <DataTable.Header>Visibility</DataTable.Header>,
		cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
	}),
]);

export function QueryExample() {
	const [query, setQuery] = useState("");
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
				<Query.Content>
					<Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
					<Query.Empty />
					<Query.Footer>
						<Query.Legend />
						<Query.KeyboardHints />
					</Query.Footer>
				</Query.Content>
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

export function InlineActionsQueryExample() {
	const [query, setQuery] = useState("is:shared ");

	return (
		<Query.Root
			className="max-w-xl"
			grammar={projectFilterGrammar}
			items={projects}
			value={query}
			onValueChange={setQuery}
		>
			<Query.Input
				aria-label="Filter projects"
				placeholder="Filter projects, or type a filter like is:shared"
			>
				<IconButton
					type="button"
					appearance="ghost"
					intent="neutral"
					size="xs"
					label="Copy filter"
					icon={<CopyIcon />}
					onClick={() => void navigator.clipboard.writeText(query)}
				/>
			</Query.Input>
			<Query.Content>
				<Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
				<Query.Empty />
				<Query.Footer>
					<Query.Legend />
					<Query.KeyboardHints />
					<p>Filters apply as you type.</p>
				</Query.Footer>
			</Query.Content>
		</Query.Root>
	);
}

const accountSearchGrammar = defineRemoteFilterGrammar({
	keys: [
		{
			key: "is",
			description: "The account state",
			values: [{ value: "active" }, { value: "suspended" }, { value: "past_due" }],
		},
		{ key: "email", description: "The account email" },
	],
});

export function RemoteQueryExample() {
	const [query, setQuery] = useState("");
	const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);

	return (
		<form
			className="w-full max-w-xl space-y-3"
			onSubmit={(event) => {
				event.preventDefault();
				setSubmittedQuery(query);
			}}
		>
			<Query.Root grammar={accountSearchGrammar} value={query} onValueChange={setQuery}>
				<Query.Input
					aria-label="Search accounts"
					placeholder="Search accounts, or type a filter like is:suspended"
				/>
				<Button type="submit" appearance="outlined" intent="neutral">
					Search
				</Button>
				<Query.Content>
					<Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
					<Query.Empty />
					<Query.Footer>
						<Query.Legend />
						<Query.KeyboardHints />
					</Query.Footer>
				</Query.Content>
			</Query.Root>
			<p className="text-muted text-sm">
				{submittedQuery == null ? "Press Enter to search." : `The server runs: ${submittedQuery}`}
			</p>
		</form>
	);
}

export function TokenColorsQueryExample() {
	const [query, setQuery] = useState("is:shared OR name:api");

	return (
		<Query.Root
			grammar={projectFilterGrammar}
			items={projects}
			value={query}
			onValueChange={setQuery}
			className="max-w-xl [--query-operator-color:var(--shiki-token-keyword)] [--query-value-color:var(--text-color-strong)]"
		>
			<Query.Input
				aria-label="Filter projects"
				placeholder="Filter projects, or type a filter like is:shared"
			/>
			<Query.Content>
				<Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
				<Query.Empty />
				<Query.Footer>
					<Query.Legend />
					<Query.KeyboardHints />
				</Query.Footer>
			</Query.Content>
		</Query.Root>
	);
}
