import { IconButton } from "@ngrok/mantle/button";
import { DropdownMenu } from "@ngrok/mantle/dropdown-menu";
import { Tooltip } from "@ngrok/mantle/tooltip";
import { DotsThreeIcon } from "@phosphor-icons/react/DotsThree";
import { isValidElement, type ReactElement } from "react";
import { useMatches } from "react-router";

/**
 * The `handle` shape a route exports to put actions in the app header. The
 * deepest matched route that exports one wins, so a child route inherits its
 * ancestor's actions until it exports its own. `null` opts a route out.
 *
 * @example
 * ```tsx
 * // app/routes/playground.tsx
 * export const handle = {
 * 	breadcrumb: "Playground",
 * 	headerActions: <PlaygroundActions />,
 * } satisfies BreadcrumbHandle & HeaderActionsHandle;
 * ```
 */
type HeaderActionsHandle = {
	/** The element `AppLayout.HeaderActions` renders for this route, or `null` for none. */
	headerActions: ReactElement | null;
};

/**
 * The fields {@link findHeaderActions} reads off a route match. Router-agnostic
 * on purpose: react-router's `UIMatch` satisfies it structurally, and so does a
 * fixture in a test or a docs demo.
 */
type HeaderActionsMatch = {
	/** The route module's `handle` export, `unknown` until narrowed. */
	handle: unknown;
};

/**
 * Whether a route match declares header actions. A real type guard, not a
 * cast: the router types `handle` as `unknown`, and the narrowing is what lets
 * {@link findHeaderActions} read `match.handle` without an assertion.
 *
 * @example
 * ```ts
 * useMatches().filter(hasHeaderActions);
 * ```
 */
function hasHeaderActions<TMatch extends HeaderActionsMatch>(
	match: TMatch,
): match is TMatch & { handle: HeaderActionsHandle } {
	const { handle } = match;
	if (typeof handle !== "object" || handle == null || !("headerActions" in handle)) {
		return false;
	}
	return handle.headerActions === null || isValidElement(handle.headerActions);
}

/**
 * The actions of the deepest matched route that declares any, or `null`. Pure:
 * it reads only `handle` off each match, so a test asserts it over a fixture
 * and a docs demo runs it with no router.
 *
 * @example
 * ```ts
 * findHeaderActions(useMatches()); // the leaf's <PlaygroundActions />, or null
 * ```
 */
function findHeaderActions(matches: ReadonlyArray<HeaderActionsMatch>): ReactElement | null {
	const match = matches.findLast(hasHeaderActions);
	return match == null ? null : match.handle.headerActions;
}

/**
 * The header actions for the current route. Render it once, in
 * `AppLayout.HeaderActions`: it derives everything from the matched route
 * chain, so no page pushes anything up, and the server renders the same
 * actions the client does.
 *
 * This is the only piece that touches the router, which keeps the hook at the
 * edge.
 *
 * @example
 * ```tsx
 * <AppLayout.HeaderActions>
 *   <RouteHeaderActions />
 * </AppLayout.HeaderActions>
 * ```
 */
function RouteHeaderActions() {
	return findHeaderActions(useMatches());
}

/**
 * One page-level action: an icon button at desktop widths and a menu item
 * below them. A thin description, so the two renderings never drift apart.
 */
type PageAction = {
	/** A stable key for the action. The label may change with state; this must not. */
	id: string;
	/** The button's accessible name and the menu item's text. Name the action, not the icon. */
	label: string;
	/** The icon both renderings show: one SVG element, as `IconButton` requires. */
	icon: ReactElement;
	/** Runs when the reader picks the action, from either rendering. */
	onSelect: () => void;
};

/**
 * Renders a route's actions for `AppLayout.HeaderActions`: one icon button per
 * action from the `md` breakpoint up, and one menu behind a single icon button
 * below it. Both controls are in the HTML and CSS picks one, so the server
 * paints the right control and hydration swaps nothing. The menu's items mount
 * when the menu opens. Keep the list to three.
 *
 * The `md` breakpoint matches the docs demos' `mobileBreakpoint`. ngrok's
 * dashboards keep the sidebar's `lg` default, so change `md:contents` and
 * `md:hidden` together to match yours.
 *
 * @example
 * ```tsx
 * export const handle = {
 * 	headerActions: (
 * 		<PageActions
 * 			actions={[{ id: "new", label: "New endpoint", icon: <PlusIcon />, onSelect: openNewEndpoint }]}
 * 		/>
 * 	),
 * } satisfies HeaderActionsHandle;
 * ```
 */
function PageActions({ actions }: { actions: ReadonlyArray<PageAction> }) {
	if (actions.length === 0) {
		return null;
	}

	return (
		<>
			{/* display: contents from md up, so the buttons sit in the slot's own gap */}
			<div className="hidden md:contents">
				{actions.map((action) => (
					<Tooltip.Root key={action.id}>
						<Tooltip.Trigger asChild>
							<IconButton
								type="button"
								appearance="ghost"
								intent="neutral"
								size="sm"
								icon={action.icon}
								label={action.label}
								onClick={action.onSelect}
							/>
						</Tooltip.Trigger>
						<Tooltip.Content>{action.label}</Tooltip.Content>
					</Tooltip.Root>
				))}
			</div>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger asChild>
					<IconButton
						type="button"
						appearance="ghost"
						intent="neutral"
						size="sm"
						className="md:hidden"
						icon={<DotsThreeIcon />}
						label="More actions"
					/>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end">
					{actions.map((action) => (
						<DropdownMenu.Item key={action.id} className="gap-2" onSelect={action.onSelect}>
							{action.icon}
							{/* an element, not bare text: a swapped icon then inserts before a node React still owns on a translated page */}
							<span>{action.label}</span>
						</DropdownMenu.Item>
					))}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</>
	);
}

export {
	//,
	findHeaderActions,
	hasHeaderActions,
	PageActions,
	RouteHeaderActions,
};

export type {
	//,
	HeaderActionsHandle,
	HeaderActionsMatch,
	PageAction,
};
