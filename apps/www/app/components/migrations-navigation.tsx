import { cx } from "@ngrok/mantle/cx";
import type { WithStyleProps } from "@ngrok/mantle/types";
import { NavLink } from "./nav-link";
import { formatMigrationNumber, migrationsNewestFirst } from "./navigation-data";

/** Sidebar navigation for the migrations section, newest guide first. */
export function MigrationsNavigation({ className, style }: WithStyleProps) {
	return (
		<nav className={cx("text-sm pb-16", className)} style={style}>
			<p className="mb-2 text-xs font-medium uppercase tracking-wider font-mono">Migrations</p>
			<ul className="mt-2 flex flex-col">
				{migrationsNewestFirst.map((migration) => (
					<li key={migration.number}>
						<NavLink to={migration.route} prefetch="intent" className="flex items-baseline gap-2">
							<span className="shrink-0 font-mono text-xs tabular-nums" translate="no">
								{formatMigrationNumber(migration.number)}
							</span>
							<span>{migration.title}</span>
						</NavLink>
					</li>
				))}
			</ul>
		</nav>
	);
}
