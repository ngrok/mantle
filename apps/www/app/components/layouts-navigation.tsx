import { cx } from "@ngrok/mantle/cx";
import type { WithStyleProps } from "@ngrok/mantle/types";
import { NavLink } from "./nav-link";
import { layoutPages, layoutRoutes } from "./navigation-data";

/** Sidebar navigation for the layouts section. */
export function LayoutsNavigation({ className, style }: WithStyleProps) {
	return (
		<nav className={cx("text-sm pb-16", className)} style={style}>
			<p className="mb-2 text-xs font-medium uppercase tracking-wider font-mono">Layouts</p>
			<ul className="mt-2 flex flex-col">
				{layoutPages.map((page) => (
					<li key={page}>
						<NavLink to={layoutRoutes[page]} prefetch="intent">
							{page}
						</NavLink>
					</li>
				))}
			</ul>
		</nav>
	);
}
