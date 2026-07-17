import { AppLayout } from "@ngrok/mantle/app-layout";
import { useLocalStorage } from "@ngrok/mantle/hooks";
import { Main } from "@ngrok/mantle/main";
import { Sidebar } from "@ngrok/mantle/sidebar";
import { SkipToMainLink } from "@ngrok/mantle/skip-to-main-link";
import { GlobeHemisphereWestIcon } from "@phosphor-icons/react/GlobeHemisphereWest";
import { GraphIcon } from "@phosphor-icons/react/Graph";
import { HashIcon } from "@phosphor-icons/react/Hash";
import { useState } from "react";

/**
 * The navigation anatomy on its own: a group, its label, a list, and rows.
 * These parts are plain styled elements — they render fine outside
 * `Sidebar.Nav`, which is what makes them easy to demo and test. Mirrors the
 * docs page's "Navigation anatomy" code block exactly.
 */
export function SidebarAnatomyDemo() {
	const [pathname, setPathname] = useState("/domains");

	return (
		<div className="w-64 text-sm">
			<Sidebar.Group>
				<Sidebar.GroupLabel>Network</Sidebar.GroupLabel>
				<Sidebar.List>
					<Sidebar.Item>
						<Sidebar.ItemButton asChild current={pathname === "/domains"}>
							<a
								href="/domains"
								onClick={(event) => {
									event.preventDefault();
									setPathname("/domains");
								}}
							>
								<GlobeHemisphereWestIcon />
								Domains
							</a>
						</Sidebar.ItemButton>
					</Sidebar.Item>
					<Sidebar.Item>
						<Sidebar.ItemButton asChild current={pathname === "/tcp-addresses"}>
							<a
								href="/tcp-addresses"
								onClick={(event) => {
									event.preventDefault();
									setPathname("/tcp-addresses");
								}}
							>
								<HashIcon />
								TCP Addresses
							</a>
						</Sidebar.ItemButton>
					</Sidebar.Item>
				</Sidebar.List>
			</Sidebar.Group>
		</div>
	);
}

/**
 * Persisting the collapsed state across visits with fully controlled props +
 * `useLocalStorage`. The controlled form is required in SSR apps: an
 * uncontrolled `defaultOpen` initializes exactly once at the hydration
 * render, before the stored value is available. Renders as an entire
 * framed-preview document (see preview-registry.ts) — reload the preview to
 * see the stored state restored.
 */
export function SidebarPersistenceDemo() {
	const [storedState, setStoredState] = useLocalStorage("docs-sidebar-state", "expanded");

	return (
		<Sidebar.Root
			open={storedState !== "collapsed"}
			onOpenChange={(open) => setStoredState(open ? "expanded" : "collapsed")}
			mobileBreakpoint="md"
		>
			<AppLayout.Root className="fixed inset-0">
				<SkipToMainLink />
				<AppLayout.Body>
					<Sidebar.Nav aria-label="Main">
						<Sidebar.Body>
							<Sidebar.Group>
								<Sidebar.GroupLabel>Persisted</Sidebar.GroupLabel>
								<Sidebar.List>
									<Sidebar.Item>
										<Sidebar.ItemButton current>
											<GraphIcon />
											Endpoints
										</Sidebar.ItemButton>
									</Sidebar.Item>
								</Sidebar.List>
							</Sidebar.Group>
						</Sidebar.Body>
					</Sidebar.Nav>
					<AppLayout.Inset>
						<AppLayout.Content asChild>
							<Main>
								<AppLayout.Header>
									<Sidebar.Trigger />
								</AppLayout.Header>
								<p className="text-muted p-6 text-sm">
									Toggle the sidebar, then reload the preview — the collapsed state is restored from
									localStorage.
								</p>
							</Main>
						</AppLayout.Content>
					</AppLayout.Inset>
				</AppLayout.Body>
			</AppLayout.Root>
		</Sidebar.Root>
	);
}
