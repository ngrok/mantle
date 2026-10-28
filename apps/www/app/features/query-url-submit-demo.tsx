import { filterItemsByQuery } from "@ngrok/mantle/query-filter";
import { Query } from "@ngrok/mantle/query";
import { projectFilterGrammar, projects } from "~/features/query-demos";
import { useQueryParamInput } from "~/features/query-url-state";

export function QueryFromUrlSubmitDemo() {
	const { query, setQuery, appliedQuery, submit } = useQueryParamInput({ commitOn: "submit" });
	// Filter by the applied query: one pass runs per Enter, not per keystroke.
	const visibleProjects = filterItemsByQuery({
		grammar: projectFilterGrammar,
		items: projects,
		query: appliedQuery,
	});

	return (
		<div className="w-full space-y-3">
			<form
				onSubmit={(event) => {
					event.preventDefault();
					submit();
				}}
			>
				{/* No `items`: each match count is one more filter pass, so the suggestions show none. */}
				<Query.Root grammar={projectFilterGrammar} value={query} onValueChange={setQuery}>
					<Query.Input
						aria-label="Filter projects"
						placeholder="Filter projects, then press Enter"
					/>
					<Query.Content enterHint="select, or apply the filter" />
				</Query.Root>
			</form>
			<ul className="text-body space-y-1 text-sm">
				{visibleProjects.map((project) => (
					<li key={project.id} translate="no">
						{project.name}
					</li>
				))}
			</ul>
		</div>
	);
}
