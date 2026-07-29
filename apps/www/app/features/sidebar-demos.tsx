import { AppLayout } from "@ngrok/mantle/app-layout";
import { DropdownMenu } from "@ngrok/mantle/dropdown-menu";
import { useLocalStorage } from "@ngrok/mantle/hooks";
import { Main } from "@ngrok/mantle/main";
import { Sidebar } from "@ngrok/mantle/sidebar";
import { SkipToMainLink } from "@ngrok/mantle/skip-to-main-link";
import { BookOpenIcon } from "@phosphor-icons/react/BookOpen";
import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import { GearIcon } from "@phosphor-icons/react/Gear";
import { GlobeHemisphereWestIcon } from "@phosphor-icons/react/GlobeHemisphereWest";
import { GraphIcon } from "@phosphor-icons/react/Graph";
import { HashIcon } from "@phosphor-icons/react/Hash";
import { QuestionIcon } from "@phosphor-icons/react/Question";
import { SignOutIcon } from "@phosphor-icons/react/SignOut";
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
 * `asChild` swapping the elements the parts render: `Sidebar.GroupLabel` becomes
 * a real `<h3>` (and still names its `Sidebar.List` via `aria-labelledby`), and
 * each `Sidebar.ItemButton` becomes an `<a>` instead of its default `<button>` —
 * every part's classes, `data-*` attributes, and ref land on the child. Mirrors
 * the docs page's "Polymorphism" code block exactly.
 */
export function SidebarPolymorphismDemo() {
	const [pathname, setPathname] = useState("/endpoints");

	return (
		<div className="w-64 text-sm">
			<Sidebar.Group>
				<Sidebar.GroupLabel asChild>
					<h3>Traffic</h3>
				</Sidebar.GroupLabel>
				<Sidebar.List>
					<Sidebar.Item>
						<Sidebar.ItemButton asChild current={pathname === "/endpoints"}>
							<a
								href="/endpoints"
								onClick={(event) => {
									event.preventDefault();
									setPathname("/endpoints");
								}}
							>
								<GraphIcon />
								Endpoints
							</a>
						</Sidebar.ItemButton>
					</Sidebar.Item>
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
				</Sidebar.List>
			</Sidebar.Group>
		</div>
	);
}

/**
 * One sidebar widened to `18rem` by setting `--sidebar-width` on
 * `Sidebar.Nav`; the icon rail and the mobile sheet keep their own defaults.
 * The panel fills its ancestor's height — a real app gets that from
 * `AppLayout.Workspace`, so an inline example supplies a fixed-height frame of
 * its own. Mirrors the docs page's "Width" code block exactly.
 */
export function SidebarWidthExample() {
	return (
		// `sm` rather than the `lg` default keeps the inline panel visible at this
		// page's tablet widths; only a phone-sized viewport gets the mobile sheet
		<Sidebar.Root mobileBreakpoint="sm">
			<div className="border-card-muted bg-base flex h-72 w-full max-w-lg overflow-hidden rounded-lg border">
				<Sidebar.Nav aria-label="Main" className="[--sidebar-width:18rem]">
					<Sidebar.Body>
						<Sidebar.Group>
							<Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
							<Sidebar.List>
								<Sidebar.Item>
									<Sidebar.ItemButton current>
										<GraphIcon />
										Endpoints
									</Sidebar.ItemButton>
								</Sidebar.Item>
								<Sidebar.Item>
									<Sidebar.ItemButton>
										<GlobeHemisphereWestIcon />
										Domains
									</Sidebar.ItemButton>
								</Sidebar.Item>
							</Sidebar.List>
						</Sidebar.Group>
					</Sidebar.Body>
				</Sidebar.Nav>
				<div className="flex-1 p-3">
					<Sidebar.Trigger />
				</div>
			</div>
		</Sidebar.Root>
	);
}

/**
 * `Sidebar.Tooltip` labeling rows in the collapsed icon rail: a plain
 * navigation row, and a footer Help row that also opens a menu — which is why
 * its `DropdownMenu.Root` stays *outside* the tooltip. Starts collapsed
 * (`defaultOpen={false}`) so the tooltips are live without touching the
 * trigger. Mirrors the docs page's "Labeling the rail for pointer users" code
 * block exactly.
 */
export function SidebarRailTooltipExample() {
	return (
		// the rows' tooltips need a `TooltipProvider` ancestor — the docs site
		// mounts one at its root, so mount one at yours too
		<Sidebar.Root defaultOpen={false} mobileBreakpoint="sm">
			<div className="border-card-muted bg-base flex h-72 w-full max-w-lg overflow-hidden rounded-lg border">
				<Sidebar.Nav aria-label="Main">
					<Sidebar.Body>
						<Sidebar.Group>
							<Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
							<Sidebar.List>
								<Sidebar.Item>
									<Sidebar.Tooltip label="Endpoints">
										<Sidebar.ItemButton current>
											<GraphIcon />
											Endpoints
										</Sidebar.ItemButton>
									</Sidebar.Tooltip>
								</Sidebar.Item>
							</Sidebar.List>
						</Sidebar.Group>
					</Sidebar.Body>
					<Sidebar.Footer>
						<DropdownMenu.Root>
							<Sidebar.Tooltip label="Help">
								<DropdownMenu.Trigger asChild>
									<Sidebar.ItemButton>
										<QuestionIcon />
										Help
										<CaretDownIcon className="text-muted ml-auto size-4 shrink-0" />
									</Sidebar.ItemButton>
								</DropdownMenu.Trigger>
							</Sidebar.Tooltip>
							<DropdownMenu.Content
								align="start"
								side="top"
								width="trigger"
								className="min-w-(--sidebar-row-width)"
							>
								<DropdownMenu.Item className="gap-2">
									<BookOpenIcon className="text-muted" />
									Documentation
								</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</Sidebar.Footer>
				</Sidebar.Nav>
				<div className="flex-1 p-3">
					<Sidebar.Trigger />
				</div>
			</div>
		</Sidebar.Root>
	);
}

/**
 * A switcher row's menu keeping the expanded row's width inside the collapsed
 * icon rail: `width="trigger"` sizes it to the row, and the
 * `--sidebar-row-width` floor holds it there once the row is a chip. Collapse
 * and expand the panel with the trigger — the menu looks the same either way.
 * Mirrors the docs page's "Sizing a menu to a sidebar row" code block exactly.
 */
export function SidebarRowWidthMenuExample() {
	return (
		<Sidebar.Root defaultOpen={false} mobileBreakpoint="sm">
			<div className="border-card-muted bg-base flex h-72 w-full max-w-lg overflow-hidden rounded-lg border">
				<Sidebar.Nav aria-label="Main">
					<Sidebar.Body>
						<Sidebar.Group>
							<Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
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
					<Sidebar.Footer>
						<DropdownMenu.Root>
							<DropdownMenu.Trigger asChild>
								<Sidebar.SwitcherTrigger>
									<Sidebar.AccountAvatar accountId="acc_acme" accountName="Acme Corp" />
									<span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">
										Acme Corp
									</span>
									<Sidebar.UserAvatar alt="Jane Doe" />
								</Sidebar.SwitcherTrigger>
							</DropdownMenu.Trigger>
							<DropdownMenu.Content
								align="start"
								side="top"
								width="trigger"
								className="min-w-(--sidebar-row-width)"
							>
								<DropdownMenu.Item className="gap-2">
									<GearIcon className="text-muted" />
									Account settings
								</DropdownMenu.Item>
								<DropdownMenu.Item className="gap-2">
									<SignOutIcon className="text-muted" />
									Log out
								</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</Sidebar.Footer>
				</Sidebar.Nav>
				<div className="flex-1 p-3">
					<Sidebar.Trigger />
				</div>
			</div>
		</Sidebar.Root>
	);
}

/**
 * A per-sidebar `--sidebar-width` override does not reach `--sidebar-row-width`,
 * which resolves at `:root` — so a `12rem` panel would otherwise open a menu
 * wider than the row it belongs to. The menu declares its own floor instead,
 * which works because a custom property is read from the element that declares
 * it. Mirrors the docs page's second "Sizing a menu to a sidebar row" code
 * block exactly.
 */
export function SidebarNarrowMenuExample() {
	return (
		<Sidebar.Root mobileBreakpoint="sm">
			<div className="border-card-muted bg-base flex h-72 w-full max-w-lg overflow-hidden rounded-lg border">
				<Sidebar.Nav aria-label="Main" className="[--sidebar-width:12rem]">
					<Sidebar.Body>
						<Sidebar.Group>
							<Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
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
					<Sidebar.Footer>
						<DropdownMenu.Root>
							<DropdownMenu.Trigger asChild>
								<Sidebar.ItemButton>
									<QuestionIcon />
									Help
									<CaretDownIcon className="text-muted ml-auto size-4 shrink-0" />
								</Sidebar.ItemButton>
							</DropdownMenu.Trigger>
							<DropdownMenu.Content
								align="start"
								side="top"
								width="trigger"
								className="[--sidebar-row-width:calc(12rem-1rem)] min-w-(--sidebar-row-width)"
							>
								<DropdownMenu.Item className="gap-2">
									<BookOpenIcon className="text-muted" />
									Documentation
								</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</Sidebar.Footer>
				</Sidebar.Nav>
				<div className="flex-1 p-3">
					<Sidebar.Trigger />
				</div>
			</div>
		</Sidebar.Root>
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
				<AppLayout.Workspace>
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
					<AppLayout.Content>
						<AppLayout.Header>
							<Sidebar.Trigger />
						</AppLayout.Header>
						<AppLayout.Body asChild>
							<Main>
								<p className="text-muted p-6 text-sm">
									Toggle the sidebar, then reload the preview — the collapsed state is restored from
									localStorage.
								</p>
							</Main>
						</AppLayout.Body>
					</AppLayout.Content>
				</AppLayout.Workspace>
			</AppLayout.Root>
		</Sidebar.Root>
	);
}
