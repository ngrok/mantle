"use client";

import { AppLayout } from "@ngrok/mantle/app-layout";
import { Button } from "@ngrok/mantle/button";
import { Command, MetaKey } from "@ngrok/mantle/command";
import { Kbd } from "@ngrok/mantle/kbd";
import { Main } from "@ngrok/mantle/main";
import { Sidebar, useSidebar } from "@ngrok/mantle/sidebar";
import {
	CalculatorIcon,
	CalendarIcon,
	CaretDownIcon,
	CreditCardIcon,
	GearIcon,
	GlobeIcon,
	GraphIcon,
	MagnifyingGlassIcon,
	ShieldCheckIcon,
	SmileyIcon,
	UserIcon,
} from "@phosphor-icons/react";

/**
 * The palette body every demo on this page shares: the input, the list, and two
 * groups of items.
 */
function DemoPaletteContent() {
	return (
		<Command.DialogContent>
			<Command.Input placeholder="Type a command or search..." />
			<Command.List>
				<Command.Empty>No results found.</Command.Empty>
				<Command.Group heading="Suggestions">
					<Command.Item>
						<CalendarIcon />
						<span>Calendar</span>
					</Command.Item>
					<Command.Item>
						<SmileyIcon />
						<span>Search Emoji</span>
					</Command.Item>
					<Command.Item>
						<CalculatorIcon />
						<span>Calculator</span>
					</Command.Item>
				</Command.Group>
				<Command.Separator />
				<Command.Group heading="Settings">
					<Command.Item>
						<UserIcon />
						<span>Profile</span>
						<Command.Shortcut>
							<MetaKey /> P
						</Command.Shortcut>
					</Command.Item>
					<Command.Item>
						<CreditCardIcon />
						<span>Billing</span>
						<Command.Shortcut>
							<MetaKey /> B
						</Command.Shortcut>
					</Command.Item>
					<Command.Item>
						<GearIcon />
						<span>Settings</span>
						<Command.Shortcut>
							<MetaKey /> S
						</Command.Shortcut>
					</Command.Item>
				</Command.Group>
			</Command.List>
		</Command.DialogContent>
	);
}

/**
 * Demo for `Command.SearchTrigger` around a control of your own: give it focus
 * and type, and the palette opens with what you typed already in the query.
 *
 * @example
 * ```tsx
 * <CommandSearchTriggerDemo />
 * ```
 */
export function CommandSearchTriggerDemo() {
	return (
		// keyboardShortcut={false}: this docs site binds ⌘K to its own search
		// palette, and a demo rendered on the page must not compete for the chord.
		// Leave it on (the default) in a real app.
		<Command.DialogRoot keyboardShortcut={false}>
			<Command.SearchTrigger>
				<button
					type="button"
					className="bg-form border-form text-strong flex h-9 w-full max-w-80 items-center gap-1.5 rounded-md border px-2.5 text-sm"
				>
					<MagnifyingGlassIcon className="text-muted size-5 shrink-0" />
					<span className="text-placeholder min-w-0 flex-1 truncate text-left">
						Search commands…
					</span>
				</button>
			</Command.SearchTrigger>
			<DemoPaletteContent />
		</Command.DialogRoot>
	);
}

/**
 * Demo for `Command.DialogTrigger`: a palette opened by an ordinary `Button`,
 * with none of the search-field behavior.
 *
 * @example
 * ```tsx
 * <CommandDialogDemo />
 * ```
 */
export function CommandDialogDemo() {
	return (
		// keyboardShortcut={false}: see CommandSearchTriggerDemo — the docs site
		// owns ⌘K.
		<Command.DialogRoot keyboardShortcut={false}>
			<Command.DialogTrigger asChild>
				<Button type="button" appearance="outlined" intent="neutral">
					Open Command Dialog
				</Button>
			</Command.DialogTrigger>
			<DemoPaletteContent />
		</Command.DialogRoot>
	);
}

/**
 * The sidebar's search row and the palette it opens.
 *
 * `setOpenMobile(false)` as the palette opens is load-bearing, not tidiness:
 * below the sidebar's `mobileBreakpoint` the panel *is* a `Sheet`, so leaving it
 * open would stack a dialog inside a dialog — two focus traps, and two scroll
 * locks unwinding in an order neither owns.
 */
function SidebarSearch() {
	const { setOpenMobile } = useSidebar();

	return (
		<Command.DialogRoot
			onOpenChange={(open) => {
				if (open) {
					setOpenMobile(false);
				}
			}}
		>
			<Sidebar.Tooltip
				label="Search"
				shortcut={
					<>
						<MetaKey />
						<Kbd>K</Kbd>
					</>
				}
			>
				<Command.SearchTrigger>
					<Sidebar.SearchTrigger
						shortcut={
							<>
								<MetaKey />
								<Kbd>K</Kbd>
							</>
						}
					>
						<MagnifyingGlassIcon />
						<span className="min-w-0 flex-1 truncate">Search</span>
					</Sidebar.SearchTrigger>
				</Command.SearchTrigger>
			</Sidebar.Tooltip>
			<DemoPaletteContent />
		</Command.DialogRoot>
	);
}

/**
 * Demo for `Sidebar.SearchTrigger` composed with `Command.SearchTrigger`, in a
 * real app shell. Collapse the panel with the toggle to watch the search row
 * become the same icon chip as the navigation rows beneath it.
 *
 * Renders as its own preview document, so `⌘K` works here without competing
 * with the docs site's own palette.
 *
 * @example
 * ```tsx
 * <CommandSearchShellDemo />
 * ```
 */
export function CommandSearchShellDemo() {
	return (
		// `md` (not the `lg` default ngrok's dashboards use) keeps the desktop
		// panel visible at the framed preview's desktop and tablet widths.
		<Sidebar.Root mobileBreakpoint="md">
			<AppLayout.Root className="fixed inset-0">
				<AppLayout.Workspace>
					<Sidebar.Nav aria-label="Main">
						<Sidebar.Header>
							<Sidebar.SwitcherTrigger>
								<GlobeIcon />
								<span className="text-strong min-w-0 flex-1 truncate text-base">
									Universal Gateway
								</span>
								<CaretDownIcon className="text-muted size-4 shrink-0" />
							</Sidebar.SwitcherTrigger>
						</Sidebar.Header>
						<Sidebar.Body>
							<SidebarSearch />
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
									<Sidebar.Item>
										<Sidebar.Tooltip label="Edges">
											<Sidebar.ItemButton>
												<ShieldCheckIcon />
												Edges
											</Sidebar.ItemButton>
										</Sidebar.Tooltip>
									</Sidebar.Item>
								</Sidebar.List>
							</Sidebar.Group>
						</Sidebar.Body>
					</Sidebar.Nav>
					<AppLayout.Content>
						<AppLayout.Header>
							<Sidebar.Trigger
								shortcut={
									<>
										<MetaKey />
										<Kbd>B</Kbd>
									</>
								}
							/>
							<span className="text-strong text-sm font-medium">Endpoints</span>
						</AppLayout.Header>
						<AppLayout.Body>
							<Main className="p-6">
								<p className="text-muted text-sm">
									Collapse the sidebar to see the search row become an icon chip, or press{" "}
									<MetaKey />
									<Kbd>K</Kbd> to open the palette.
								</p>
							</Main>
						</AppLayout.Body>
					</AppLayout.Content>
				</AppLayout.Workspace>
			</AppLayout.Root>
		</Sidebar.Root>
	);
}
