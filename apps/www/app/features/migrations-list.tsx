import { Badge } from "@ngrok/mantle/badge";
import { Button } from "@ngrok/mantle/button";
import { Empty } from "@ngrok/mantle/empty";
import { Input } from "@ngrok/mantle/input";
import { Well } from "@ngrok/mantle/well";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import { useRef, useState } from "react";
import { DocIndexList } from "~/components/doc-index-list";
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
				<DocIndexList
					label="Migration guides"
					items={filtered.map((migration) => ({
						to: migration.route,
						title: migration.title,
						description: migration.description,
						badge: (
							<Badge
								appearance="muted"
								color="neutral"
								className="font-mono tabular-nums"
								translate="no"
							>
								{formatMigrationNumber(migration.number)}
							</Badge>
						),
					}))}
				/>
			)}
		</div>
	);
}
