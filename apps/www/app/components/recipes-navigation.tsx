import { cx } from "@ngrok/mantle/cx";
import type { WithStyleProps } from "@ngrok/mantle/types";
import { NavLink } from "./nav-link";
import { recipePages, recipeRoutes } from "./navigation-data";

/** Sidebar navigation for the recipes section. */
export function RecipesNavigation({ className, style }: WithStyleProps) {
	return (
		<nav className={cx("text-sm pb-16", className)} style={style}>
			<p className="mb-2 text-xs font-medium uppercase tracking-wider font-mono">Recipes</p>
			<ul className="mt-2 flex flex-col">
				{recipePages.map((page) => (
					<li key={page}>
						<NavLink to={recipeRoutes[page]} prefetch="intent">
							{page}
						</NavLink>
					</li>
				))}
			</ul>
		</nav>
	);
}
