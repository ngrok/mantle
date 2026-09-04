import { AppLayout } from "@ngrok/mantle/app-layout";
import { Main } from "@ngrok/mantle/main";
import { Sidebar } from "@ngrok/mantle/sidebar";
import { SkipToMainLink } from "@ngrok/mantle/skip-to-main-link";
import { CreditCardIcon } from "@phosphor-icons/react/CreditCard";
import { CubeIcon } from "@phosphor-icons/react/Cube";
import { GearIcon } from "@phosphor-icons/react/Gear";
import { GlobeIcon } from "@phosphor-icons/react/Globe";
import { GraphIcon } from "@phosphor-icons/react/Graph";
import { UsersThreeIcon } from "@phosphor-icons/react/UsersThree";
import type { ReactNode } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { RouteBreadcrumbs } from "~/features/breadcrumbs/breadcrumbs";
import type { Route } from "./+types/shell";
import { demoPaths } from "./paths";
import { RouterDebugPopover } from "./router-debug-popover";

type NavItem = {
	label: string;
	icon: ReactNode;
	to: string;
	/** Every path prefix the row is current for. The hub row covers both members. */
	currentFor: ReadonlyArray<string>;
};

const productItems: ReadonlyArray<NavItem> = [
	{
		label: "Endpoints",
		icon: <GraphIcon />,
		to: demoPaths.endpoints,
		currentFor: [demoPaths.endpoints],
	},
	{
		label: "Domains",
		icon: <GlobeIcon />,
		to: demoPaths.domains,
		// one sidebar row for the hub: the absorbed TLS Certificates row is gone
		currentFor: [demoPaths.domains, demoPaths.tlsCerts],
	},
	{ label: "Apps", icon: <CubeIcon />, to: demoPaths.apps, currentFor: [demoPaths.apps] },
];

const settingsItems: ReadonlyArray<NavItem> = [
	{
		label: "General",
		icon: <GearIcon />,
		to: demoPaths.settingsGeneral,
		currentFor: [demoPaths.settingsGeneral],
	},
	{
		label: "Billing",
		icon: <CreditCardIcon />,
		to: demoPaths.billing,
		currentFor: [demoPaths.billing],
	},
	{
		label: "Team Members",
		icon: <UsersThreeIcon />,
		to: demoPaths.teamMembers,
		currentFor: [demoPaths.teamMembers],
	},
];

/** Whether the row's destination, or a page under it, is the current URL. */
function isCurrent(pathname: string, item: NavItem): boolean {
	return item.currentFor.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function NavGroup({ label, items }: { label: string; items: ReadonlyArray<NavItem> }) {
	const { pathname } = useLocation();

	return (
		<Sidebar.Group>
			<Sidebar.GroupLabel>{label}</Sidebar.GroupLabel>
			<Sidebar.List>
				{items.map((item) => (
					<Sidebar.Item key={item.to}>
						<Sidebar.ItemButton asChild current={isCurrent(pathname, item)}>
							<Link to={item.to}>
								{item.icon}
								{item.label}
							</Link>
						</Sidebar.ItemButton>
					</Sidebar.Item>
				))}
			</Sidebar.List>
		</Sidebar.Group>
	);
}

export const meta: Route.MetaFunction = () => [
	{ title: "Breadcrumbs from routes demo — @ngrok/mantle" },
	// preview documents are chrome-less fragments of their docs page
	{ name: "robots", content: "noindex, nofollow" },
];

/**
 * The demo's app shell, and the only place the trail renders. It is a real
 * route module under `/preview/breadcrumbs-from-routes`, so every page below
 * it navigates with the real router: `useMatches()`, `Link`, and
 * `location.state` behave as they do in an app. The debug toggle at the
 * trailing edge shows the router state the trail derives from.
 */
export default function BreadcrumbsRecipeShell() {
	return (
		// `md` (not the `lg` default ngrok's dashboards use) keeps the desktop
		// panel visible at the framed preview's desktop and tablet widths
		<Sidebar.Root mobileBreakpoint="md">
			<AppLayout.Root className="fixed inset-0">
				<SkipToMainLink />
				<AppLayout.Workspace>
					<Sidebar.Nav aria-label="Main">
						<Sidebar.Body>
							<NavGroup label="Connectivity" items={productItems} />
							<NavGroup label="Settings" items={settingsItems} />
						</Sidebar.Body>
					</Sidebar.Nav>
					<AppLayout.Content>
						<AppLayout.Header>
							<Sidebar.Trigger />
							<RouteBreadcrumbs />
							<div className="ml-auto flex shrink-0 items-center gap-2">
								<RouterDebugPopover />
							</div>
						</AppLayout.Header>
						<AppLayout.Body asChild>
							<Main>
								<Outlet />
							</Main>
						</AppLayout.Body>
					</AppLayout.Content>
				</AppLayout.Workspace>
			</AppLayout.Root>
		</Sidebar.Root>
	);
}
