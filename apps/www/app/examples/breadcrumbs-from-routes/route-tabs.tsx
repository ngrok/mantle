import { Tabs } from "@ngrok/mantle/tabs";
import { Link, useLocation, useMatches } from "react-router";

type RouteTab = {
	value: string;
	label: string;
	/** The absolute path the tab navigates to, and the match it is selected for. */
	to: string;
};

type RouteTabsProps = {
	tabs: ReadonlyArray<RouteTab>;
	/** The tablist's accessible name; a page can stack more than one. */
	"aria-label": string;
};

/**
 * Tabs whose triggers are links and whose selected tab derives from the
 * matched route chain. Click and Enter navigate through the anchor. Arrow
 * keys move focus only (`activationMode="manual"`), so a keyboard user picks
 * a tab before the page changes. No `onValueChange` and no `navigate()`: the
 * router owns the state, and the server and the client agree on first paint.
 *
 * The selected tab is the one whose `to` equals the deepest match's
 * `pathname`, so a child route under a tab still selects that tab. Each tab
 * forwards `location.state`: a tab is a view of the current place, so the
 * origin trail survives a tab switch.
 *
 * @example
 * ```tsx
 * <RouteTabs
 * 	aria-label="Domains sections"
 * 	tabs={[
 * 		{ value: "domains", label: "Domains", to: href("/domains") },
 * 		{ value: "tls-certs", label: "TLS Certificates", to: href("/tls-certs") },
 * 	]}
 * />
 * ```
 */
function RouteTabs({ tabs, "aria-label": ariaLabel }: RouteTabsProps) {
	const location = useLocation();
	const matches = useMatches();
	const selectedMatch = matches.findLast((match) => tabs.some((tab) => tab.to === match.pathname));
	const selectedTab = tabs.find((tab) => tab.to === selectedMatch?.pathname);

	return (
		<Tabs.Root value={selectedTab?.value ?? ""} activationMode="manual">
			<Tabs.List aria-label={ariaLabel}>
				{tabs.map((tab) => (
					<Tabs.Trigger key={tab.value} value={tab.value} asChild>
						<Link to={tab.to} prefetch="intent" state={location.state}>
							{tab.label}
						</Link>
					</Tabs.Trigger>
				))}
			</Tabs.List>
		</Tabs.Root>
	);
}

export {
	//,
	RouteTabs,
};

export type {
	//,
	RouteTab,
};
