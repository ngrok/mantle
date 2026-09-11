import { Icon } from "@ngrok/mantle/icon";
import { List } from "@ngrok/mantle/list";
import { ArrowRightIcon } from "@phosphor-icons/react/ArrowRight";
import type { ReactNode } from "react";
import { Link } from "react-router";

/** One row of a `DocIndexList`. */
export type DocIndexItem = {
	/** The page's route. It is also the row's React key, so it must be unique in the list. */
	to: string;
	/** The page name. */
	title: string;
	/** The one-sentence summary under the title. */
	description: string;
	/** An optional element before the title, for example a number `Badge`. */
	badge?: ReactNode;
};

/** Props for `DocIndexList`. */
export type DocIndexListProps = {
	/** The list's accessible name, for example `"Migration guides"`. */
	label: string;
	/** The pages to list, in display order. */
	items: readonly DocIndexItem[];
};

/**
 * A section index: one linked row per docs page. Each row shows an optional
 * badge, the title, the description, and a trailing arrow. The whole row is
 * the link.
 *
 * @example
 * <DocIndexList
 *   label="Recipes"
 *   items={[
 *     {
 *       to: "/recipes/route-announcer",
 *       title: "Route Announcer",
 *       description: "Announce completed client-side navigations to screen readers.",
 *     },
 *   ]}
 * />
 */
export function DocIndexList({ label, items }: DocIndexListProps) {
	return (
		<List.Root aria-label={label}>
			{items.map((item) => (
				<List.Item key={item.to} asChild className="py-2.5">
					<Link className="group" to={item.to} prefetch="intent">
						<div className="flex items-center gap-3">
							<div className="flex min-w-0 flex-1 flex-col gap-0.5">
								<span className="flex flex-wrap items-center gap-2">
									{item.badge}
									<List.ItemTitle>{item.title}</List.ItemTitle>
								</span>
								<List.ItemDescription>{item.description}</List.ItemDescription>
							</div>
							<Icon
								svg={<ArrowRightIcon />}
								className="text-muted group-hover:text-accent-600 group-focus-visible:text-accent-600 shrink-0 transition duration-150 ease-out group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5 motion-reduce:transition-none"
							/>
						</div>
					</Link>
				</List.Item>
			))}
		</List.Root>
	);
}
