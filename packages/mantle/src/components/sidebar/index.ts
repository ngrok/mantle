/**
 * Re-exports for the Sidebar compound component: a composable, collapsible
 * app-navigation sidebar with a desktop panel that collapses to its icons,
 * a mobile `Sheet` presentation, and a toggle trigger that composes into any
 * app shell.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar
 */

import * as SidebarParts from "./sidebar-parts.js";

export {
	//,
	useSidebar,
} from "./sidebar.js";

/**
 * A composable, collapsible app-navigation sidebar. `Sidebar.Root` owns the
 * state (no DOM). `Sidebar.Nav` renders the panel: inline on desktop,
 * collapsing to its icons, and a left-side `Sheet` below the root's
 * `mobileBreakpoint`. `Sidebar.Trigger` toggles it from anywhere under the
 * root (typically an `AppLayout.Header`). Navigation is grouped with
 * `Sidebar.Group`/`Sidebar.GroupLabel`/`Sidebar.List`, a group of pages folds
 * under a `Sidebar.Disclosure`, and the switcher rows
 * (app switcher up top, account/user down bottom) compose
 * `Sidebar.SwitcherTrigger` with your own `DropdownMenu` or `Dialog`.
 *
 * The component is routing-agnostic: compose router links via `asChild` on
 * `Sidebar.ItemButton` and drive `current` from your router's location.
 *
 * Reach for it for the app's primary navigation on the start edge of an
 * `AppLayout`. A surface that opens beside the page for an assistant or a
 * details pane is `AppLayout.SidePanel`; a modal drawer is `Sheet`; switching
 * sections inside one page is `Tabs`.
 *
 * @useWhen Show the main navigation of an app, with its app and account switchers, in a column that
 * collapses to its icons, and to a sheet on small screens.
 *
 * @siblings
 * - `Tabs`: the user switches between views inside one page.
 * - `Sheet`: a panel opens over the page for a task, not for navigation.
 * - `Breadcrumb`: the page shows where it sits in a hierarchy.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar
 *
 * @example
 * Composition:
 * ```
 * Sidebar.Root
 * ├── Sidebar.Nav
 * │   ├── Sidebar.Header
 * │   │   └── Sidebar.SwitcherTrigger
 * │   ├── Sidebar.Body
 * │   │   ├── Sidebar.SearchTrigger
 * │   │   └── Sidebar.Group
 * │   │       ├── Sidebar.GroupLabel
 * │   │       └── Sidebar.List
 * │   │           ├── Sidebar.Item
 * │   │           │   └── Sidebar.Tooltip
 * │   │           │       └── Sidebar.ItemButton
 * │   │           └── Sidebar.Disclosure
 * │   │               ├── Sidebar.DisclosureTrigger
 * │   │               └── Sidebar.DisclosureList
 * │   │                   └── Sidebar.Item
 * │   │                       └── Sidebar.ItemButton
 * │   └── Sidebar.Footer
 * │       ├── Sidebar.ItemButton
 * │       ├── Sidebar.Separator
 * │       └── Sidebar.SwitcherTrigger
 * └── Sidebar.Trigger
 * ```
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <Sidebar.Nav aria-label="Main">
 *     <Sidebar.Header>
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherTrigger>
 *             <GlobeIcon />
 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
 *           </Sidebar.SwitcherTrigger>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Header>
 *     <Sidebar.Body>
 *       <Sidebar.Group>
 *         <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
 *         <Sidebar.List>
 *           <Sidebar.Item>
 *             <Sidebar.ItemButton asChild current>
 *               <a href="/endpoints">
 *                 <GraphIcon />
 *                 Endpoints
 *               </a>
 *             </Sidebar.ItemButton>
 *           </Sidebar.Item>
 *         </Sidebar.List>
 *       </Sidebar.Group>
 *     </Sidebar.Body>
 *     <Sidebar.Footer>
 *       <Sidebar.Separator />
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherTrigger>
 *             <Avatar.Root appearance="square" colorSeed="acc_123">
 *               <Avatar.Fallback name="Acme Corp" />
 *             </Avatar.Root>
 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
 *           </Sidebar.SwitcherTrigger>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Footer>
 *   </Sidebar.Nav>
 *   <Sidebar.Trigger />
 * </Sidebar.Root>
 * ```
 */
const Sidebar = SidebarParts;

export {
	//,
	Sidebar,
};

export type {
	//,
	SidebarMobileBreakpoint,
	SidebarState,
} from "./sidebar.js";

export {
	//,
	extractSidebarStateCookie,
	serializeSidebarStateCookie,
	SIDEBAR_STATE_COOKIE_NAME,
} from "./sidebar-state-cookie.js";

export type {
	//,
	SerializeSidebarStateCookieOptions,
} from "./sidebar-state-cookie.js";
