import { Button, IconButton } from "@ngrok/mantle/button";
import { DataTable, createColumnHelper, tableFeatures, useTable } from "@ngrok/mantle/data-table";
import { Empty } from "@ngrok/mantle/empty";
import { LiveRegion } from "@ngrok/mantle/live-region";
import { Query } from "@ngrok/mantle/query";
import { filterItemsByQuery, queryUsesQualifiers } from "@ngrok/mantle/query-filter";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import { SparkleIcon } from "@phosphor-icons/react/Sparkle";
import { useDeferredValue } from "react";
import { type TranslationStatus, useNaturalLanguageQuery } from "~/features/natural-language-query";
import { mockTranslateQuery } from "~/features/natural-language-query-mock";
import { type Project, projectFilterGrammar, projects } from "~/features/query-demos";

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

/** One sentence per status. Each is one string, so a translated page never loses a text node. */
function describeStatus(status: TranslationStatus): string {
	switch (status.kind) {
		case "idle":
			return "";
		case "translating":
			return `Translating “${status.words}”…`;
		case "translated":
			return `Translated “${status.words}” into a filter.`;
		case "failed":
			switch (status.reason) {
				case "off_topic":
					return "That doesn't describe a project. Try words like shared, archived, or a name.";
				case "invalid":
					return "The translation used a filter this list doesn't have, so the query stays as typed.";
				case "rate_limited":
					return "That's a lot of searches. Wait a minute, then try again.";
				case "unavailable":
					return "Translation isn't available right now. The words still search as text.";
			}
	}
}

export function NaturalLanguageQueryDemo() {
	const nl = useNaturalLanguageQuery({
		grammar: projectFilterGrammar,
		translate: mockTranslateQuery,
	});
	const deferredQuery = useDeferredValue(nl.query);
	const visibleProjects = filterItemsByQuery({
		grammar: projectFilterGrammar,
		items: projects,
		query: deferredQuery,
	});
	const table = useTable({ features, data: visibleProjects, columns });
	const rows = table.getRowModel().rows;
	const statusMessage = describeStatus(nl.status);
	const canTranslate =
		nl.query.trim() !== "" && !queryUsesQualifiers(projectFilterGrammar, nl.query);

	return (
		<div className="w-full space-y-3">
			<form
				onSubmit={(event) => {
					event.preventDefault();
					void nl.submit();
				}}
			>
				<Query.Root
					grammar={projectFilterGrammar}
					items={projects}
					value={nl.query}
					onValueChange={nl.setQuery}
				>
					<Query.Input
						aria-label="Filter projects"
						placeholder="Describe the projects, like shared projects that aren't archived"
					>
						{canTranslate && (
							<IconButton
								type="submit"
								appearance="ghost"
								intent="neutral"
								size="xs"
								label="Translate with AI"
								icon={<SparkleIcon />}
								isLoading={nl.status.kind === "translating"}
							/>
						)}
					</Query.Input>
					<Query.Content enterHint="select, or translate with AI" />
				</Query.Root>
			</form>
			<div className="flex min-h-8 flex-wrap items-center gap-x-3 text-sm">
				<LiveRegion>{statusMessage}</LiveRegion>
				<p aria-hidden className="text-muted">
					{statusMessage}
				</p>
				{nl.status.kind === "translated" && (
					<Button type="button" appearance="link" intent="accent" onClick={nl.revert}>
						Revert
					</Button>
				)}
			</div>
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
										onClick={() => nl.setQuery("")}
									>
										Clear filter
									</Button>
								</Empty.Actions>
							</Empty.Root>
						</DataTable.EmptyRow>
					)}
				</DataTable.Body>
			</DataTable.Root>
			<p className="text-muted text-xs">
				Plain words go to a model on Enter, and the model writes the filter. It can be wrong, so
				check the filter before you rely on it.
			</p>
		</div>
	);
}
