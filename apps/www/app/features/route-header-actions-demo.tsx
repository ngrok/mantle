import { AppLayout } from "@ngrok/mantle/app-layout";
import { Breadcrumb } from "@ngrok/mantle/breadcrumb";
import { Button, IconButton } from "@ngrok/mantle/button";
import { makeToast, Toast } from "@ngrok/mantle/toast";
import { ArrowLeftIcon } from "@phosphor-icons/react/ArrowLeft";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/ArrowsClockwise";
import { BookOpenIcon } from "@phosphor-icons/react/BookOpen";
import { CopyIcon } from "@phosphor-icons/react/Copy";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import { TrashIcon } from "@phosphor-icons/react/Trash";
import { Fragment, useState } from "react";
import {
	findHeaderActions,
	type HeaderActionsHandle,
	type HeaderActionsMatch,
	PageActions,
} from "~/features/header-actions/header-actions";

/** Announces a demo action. A real action navigates, opens a dialog, or mutates. */
function announce(label: string) {
	makeToast(
		<Toast.Root intent="info">
			<Toast.Icon />
			<Toast.Message>{label}</Toast.Message>
		</Toast.Root>,
	);
}

/**
 * The `handle` exports of the demo's route modules, as the router forwards them
 * onto `useMatches()`. A list route and a detail route each declare their own
 * actions; the detail's tab route declares none and inherits the detail's; the
 * settings routes declare none at all.
 */
const endpointsHandle = {
	headerActions: (
		<PageActions
			actions={[
				{ label: "New endpoint", icon: <PlusIcon />, onSelect: () => announce("New endpoint") },
				{ label: "Refresh", icon: <ArrowsClockwiseIcon />, onSelect: () => announce("Refreshed") },
				{
					label: "Endpoint docs",
					icon: <BookOpenIcon />,
					onSelect: () => announce("Endpoint docs"),
				},
			]}
		/>
	),
} satisfies HeaderActionsHandle;

const endpointHandle = {
	headerActions: (
		<PageActions
			actions={[
				{ label: "Copy endpoint URL", icon: <CopyIcon />, onSelect: () => announce("Copied") },
				{
					label: "Delete endpoint",
					icon: <TrashIcon />,
					onSelect: () => announce("Delete endpoint"),
				},
			]}
		/>
	),
} satisfies HeaderActionsHandle;

/** One simulated URL: its trail, and the matched chain's `handle`s. */
type DemoRoute = {
	url: string;
	crumbs: ReadonlyArray<string>;
	matches: ReadonlyArray<HeaderActionsMatch>;
};

/**
 * The shortest route, and the fallback for an out-of-range index, named so
 * TypeScript knows it is defined (`routes[i]` is `DemoRoute | undefined` under
 * `noUncheckedIndexedAccess`).
 */
const endpointsRoute = {
	url: "/endpoints",
	crumbs: ["Endpoints"],
	matches: [{ handle: endpointsHandle }],
} satisfies DemoRoute;

/**
 * The routes this demo switches between. In an app the matches come from
 * `useMatches()`; here they are fixtures, because a demo embedded in this page
 * cannot mount a second router. The function reading them is the real
 * `findHeaderActions`, unmodified.
 */
const routes = [
	endpointsRoute,
	{
		url: "/endpoints/ep_3Exgo",
		crumbs: ["Endpoints", "ep_3Exgo"],
		// deepest wins: the detail route replaces the list's actions
		matches: [{ handle: endpointsHandle }, { handle: endpointHandle }],
	},
	{
		url: "/endpoints/ep_3Exgo/traffic-policy",
		crumbs: ["Endpoints", "ep_3Exgo", "Traffic Policy"],
		// the tab route declares nothing, so the detail's actions stay
		matches: [{ handle: endpointsHandle }, { handle: endpointHandle }, { handle: undefined }],
	},
	{
		url: "/settings/general",
		crumbs: ["Settings", "General"],
		// no route in the chain declares actions, so the slot is empty
		matches: [{ handle: { breadcrumb: "Settings" } }, { handle: { breadcrumb: "General" } }],
	},
] satisfies ReadonlyArray<DemoRoute>;

/** A static trail for the demo. An app derives this from the same matches; see the breadcrumbs recipe. */
function Trail({ crumbs }: { crumbs: ReadonlyArray<string> }) {
	return (
		<Breadcrumb.Root>
			<Breadcrumb.List>
				{crumbs.map((crumb, index) => (
					<Fragment key={crumb}>
						{index > 0 && <Breadcrumb.Separator />}
						<Breadcrumb.Item>
							{index === crumbs.length - 1 ? (
								<Breadcrumb.Page>{crumb}</Breadcrumb.Page>
							) : (
								<Breadcrumb.Link href="#">{crumb}</Breadcrumb.Link>
							)}
						</Breadcrumb.Item>
					</Fragment>
				))}
			</Breadcrumb.List>
		</Breadcrumb.Root>
	);
}

/**
 * Switches between four URLs so a reader can watch the header's actions follow
 * the route: the list and the detail declare their own, the detail's tab route
 * inherits the detail's, and the settings routes declare none. Narrow the
 * window below `md` to see the actions collapse into one menu.
 *
 * @example
 * ```tsx
 * <Example>
 *   <RouteHeaderActionsDemo />
 * </Example>
 * ```
 */
export function RouteHeaderActionsDemo() {
	const [routeIndex, setRouteIndex] = useState(0);
	const route = routes[routeIndex] ?? endpointsRoute;

	return (
		<div className="flex w-full flex-col gap-4">
			<div className="flex flex-wrap gap-2">
				{routes.map((candidate, index) => (
					<Button
						key={candidate.url}
						type="button"
						size="sm"
						appearance={index === routeIndex ? "filled" : "outlined"}
						aria-pressed={index === routeIndex}
						intent={index === routeIndex ? "accent" : "neutral"}
						onClick={() => setRouteIndex(index)}
					>
						{candidate.url}
					</Button>
				))}
			</div>
			<AppLayout.Root className="rounded-lg">
				<AppLayout.Workspace>
					<AppLayout.Content>
						<AppLayout.Header>
							{/* an app shell puts Sidebar.Trigger here; this embedded demo has no rail */}
							<AppLayout.HeaderStart>
								<IconButton
									asChild
									appearance="ghost"
									intent="neutral"
									size="sm"
									icon={<ArrowLeftIcon />}
									label="Back"
								>
									<a href="/endpoints" onClick={(event) => event.preventDefault()}>
										Back
									</a>
								</IconButton>
							</AppLayout.HeaderStart>
							<AppLayout.HeaderContent>
								<Trail crumbs={route.crumbs} />
							</AppLayout.HeaderContent>
							<AppLayout.HeaderActions>{findHeaderActions(route.matches)}</AppLayout.HeaderActions>
						</AppLayout.Header>
						<AppLayout.Body>
							<p className="text-muted p-6 text-sm">
								The actions above come from the deepest matched route&rsquo;s{" "}
								<code>handle.headerActions</code>. The page below never touches them.
							</p>
						</AppLayout.Body>
					</AppLayout.Content>
				</AppLayout.Workspace>
			</AppLayout.Root>
		</div>
	);
}
