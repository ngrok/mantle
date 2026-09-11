import { Badge } from "@ngrok/mantle/badge";
import { Button } from "@ngrok/mantle/button";
import { Empty } from "@ngrok/mantle/empty";
import { Icon } from "@ngrok/mantle/icon";
import { Input } from "@ngrok/mantle/input";
import { List } from "@ngrok/mantle/list";
import { Well } from "@ngrok/mantle/well";
import { ArrowRightIcon } from "@phosphor-icons/react/ArrowRight";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import { useRef, useState } from "react";
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
 * One guide's list item. The whole row is a link to the guide: the number
 * badge and title, the description under them, and a trailing arrow.
 */
function MigrationListItem({ migration }: { migration: Migration }) {
	return (
		<List.Item asChild className="py-2.5">
			<Link className="group" to={migration.route} prefetch="intent">
				<div className="flex items-center gap-3">
					<div className="flex min-w-0 flex-1 flex-col gap-0.5">
						<span className="flex flex-wrap items-center gap-2">
							<Badge
								appearance="muted"
								color="neutral"
								className="font-mono tabular-nums"
								translate="no"
							>
								{formatMigrationNumber(migration.number)}
							</Badge>
							<List.ItemTitle>{migration.title}</List.ItemTitle>
						</span>
						<List.ItemDescription>{migration.description}</List.ItemDescription>
					</div>
					<Icon
						svg={<ArrowRightIcon />}
						className="text-muted group-hover:text-accent-600 group-focus-visible:text-accent-600 shrink-0 transition duration-150 ease-out group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5 motion-reduce:transition-none"
					/>
				</div>
			</Link>
		</List.Item>
	);
}

/**
 * The migration guide index: a search input over the newest-first guide list,
 * with an empty state when nothing matches.
 *
 * @example
 * <MigrationsList />
 */
export function MigrationsList() {
	const [query, setQuery] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	const filtered = filterMigrations(migrationsNewestFirst, query);

	return (
		<div className="mt-8 space-y-6">
			<Input
				type="search"
				aria-label="Filter migrations"
				autoComplete="off"
				placeholder="Filter by number, title, or description…"
				ref={inputRef}
				value={query}
				onChange={(event) => setQuery(event.target.value)}
			/>
			{filtered.length === 0 ? (
				<Well>
					<Empty.Root>
						<Empty.Icon svg={<MagnifyingGlassIcon />} />
						<Empty.Title>No migrations match “{query.trim()}”</Empty.Title>
						<Empty.Description>
							Try a different filter, or clear it to see every guide.
						</Empty.Description>
						<Empty.Actions>
							<Button
								type="button"
								appearance="outlined"
								intent="neutral"
								onClick={() => {
									setQuery("");
									// Why: the clear resets the list, and that unmounts this button.
									// Without a new target, focus falls to the document body.
									inputRef.current?.focus();
								}}
							>
								Clear filter
							</Button>
						</Empty.Actions>
					</Empty.Root>
				</Well>
			) : (
				<List.Root aria-label="Migration guides">
					{filtered.map((migration) => (
						<MigrationListItem key={migration.number} migration={migration} />
					))}
				</List.Root>
			)}
		</div>
	);
}
