import { cx } from "@ngrok/mantle/cx";
import type { WithStyleProps } from "@ngrok/mantle/types";
import { NavLink } from "./nav-link";
import { migrationPages, migrationRoutes } from "./navigation-data";

/** Sidebar navigation for the migrations section. */
export function MigrationsNavigation({ className, style }: WithStyleProps) {
	return (
		<nav className={cx("text-sm pb-16", className)} style={style}>
			<p className="mb-2 text-xs font-medium uppercase tracking-wider font-mono">Migrations</p>
			<ul className="mt-2 flex flex-col">
				{migrationPages.map((page) => (
					<li key={page}>
						<NavLink to={migrationRoutes[page]} prefetch="intent">
							{page}
						</NavLink>
					</li>
				))}
			</ul>
		</nav>
	);
}
