import { DocIndexList } from "~/components/doc-index-list";
import { recipeDescriptions, recipePages, recipeRoutes } from "~/components/navigation-data";

export const meta = () => {
	return [
		{ title: "Recipes - @ngrok/mantle" },
		{
			name: "description",
			content: "Compositional how-tos that wire multiple mantle primitives together",
		},
	];
};

export default function RecipesPage() {
	return (
		<div>
			<h1 className="text-4xl font-medium text-strong sm:text-5xl mb-4">Recipes</h1>
			<p className="mb-4 leading-relaxed text-pretty text-body">
				Compositional how-tos that wire multiple mantle primitives together with state, data, or
				routing. Use these when a component page is too small and a full app flow is too much. Each
				recipe is written to be handed directly to a coding agent — append <code>.md</code> to any
				recipe&rsquo;s URL to fetch its raw markdown.
			</p>
			<div className="mt-8">
				<DocIndexList
					label="Recipes"
					items={recipePages.map((page) => ({
						to: recipeRoutes[page],
						title: page,
						description: recipeDescriptions[page],
					}))}
				/>
			</div>
		</div>
	);
}
