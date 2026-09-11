import { Badge } from "@ngrok/mantle/badge";
import { Button } from "@ngrok/mantle/button";
import { Code } from "@ngrok/mantle/code";
import { Input } from "@ngrok/mantle/input";
import { Label } from "@ngrok/mantle/label";
import { useState } from "react";
import { Link } from "react-router";
import {
	type Migration,
	formatMigrationNumber,
	migrationsNewestFirst,
} from "~/components/navigation-data";

/**
 * Keep the migrations whose number, title, description, or slug contains the
 * query. The match is case-insensitive and ignores surrounding whitespace. A
 * blank query keeps every migration in its input order.
 *
 * @example
 * filterMigrations(migrationsNewestFirst, "0006"); // the sixth guide only
 * filterMigrations(migrationsNewestFirst, "  "); // every guide, unchanged
 */
export function filterMigrations(list: readonly Migration[], query: string): readonly Migration[] {
	const needle = query.trim().toLowerCase();
	if (needle === "") {
		return list;
	}
	return list.filter((migration) =>
		[
			formatMigrationNumber(migration.number),
			migration.title,
			migration.description,
			migration.slug,
		].some((field) => field.toLowerCase().includes(needle)),
	);
}

/**
 * The migration guide index: a filter input over the newest-first guide list.
 * Each guide shows its number as a badge, its title, and its description.
 *
 * @example
 * <MigrationsList />
 */
export function MigrationsList() {
	const [query, setQuery] = useState("");
	const filtered = filterMigrations(migrationsNewestFirst, query);

	return (
		<div className="mt-8 max-w-3xl">
			<div className="space-y-1">
				<Label className="block" htmlFor="migration-filter">
					Filter migrations
				</Label>
				<Input
					autoComplete="off"
					id="migration-filter"
					placeholder="Number, title, or description"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
				/>
			</div>
			{filtered.length === 0 ? (
				<div className="mt-8 space-y-4 text-center">
					<p className="text-strong">
						No migrations match <Code>{query}</Code>
					</p>
					<Button type="button" appearance="outlined" intent="neutral" onClick={() => setQuery("")}>
						Clear filter
					</Button>
				</div>
			) : (
				<ul className="mt-6 divide-y divide-gray-300 border-y border-gray-300">
					{filtered.map((migration) => (
						<li key={migration.number}>
							<Link
								to={migration.route}
								prefetch="intent"
								className="group block rounded py-4 focus:outline-hidden focus-visible:ring-3 focus-visible:ring-focus-accent"
							>
								<span className="flex items-center gap-2">
									<Badge
										appearance="muted"
										color="neutral"
										className="font-mono tabular-nums"
										translate="no"
									>
										{formatMigrationNumber(migration.number)}
									</Badge>
									<span className="font-medium text-strong group-hover:text-accent-600">
										{migration.title}
									</span>
								</span>
								<p className="mt-1 text-sm leading-relaxed text-body">{migration.description}</p>
							</Link>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
