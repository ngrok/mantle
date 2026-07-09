import { Link } from "react-router";
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
			<h1 className="text-4xl font-medium text-strong sm:text-5xl font-family mb-4">Recipes</h1>
			<p className="mb-4 leading-relaxed text-pretty text-body">
				Compositional how-tos that wire multiple mantle primitives together with state, data, or
				routing. Use these when a component page is too small and a full app flow is too much. Each
				recipe is written to be handed directly to a coding agent — append <code>.md</code> to any
				recipe&rsquo;s URL to fetch its raw markdown.
			</p>
			<ul className="mt-8 max-w-3xl divide-y divide-gray-300 border-y border-gray-300">
				{recipePages.map((page) => (
					<li key={page}>
						<Link
							to={recipeRoutes[page]}
							prefetch="intent"
							className="group block rounded py-4 focus:outline-hidden focus-visible:ring-3 focus-visible:ring-focus-accent"
						>
							<span className="font-medium text-strong group-hover:text-accent-600">{page}</span>
							<p className="mt-1 text-sm leading-relaxed text-body">{recipeDescriptions[page]}</p>
						</Link>
					</li>
				))}
			</ul>
		</div>
	);
}
