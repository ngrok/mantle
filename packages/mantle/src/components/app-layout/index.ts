/**
 * Re-exports for the AppLayout compound component: a viewport-locked
 * application shell with a full-width notice strip, a workspace row holding
 * the app's columns, a rounded content card whose page region
 * (`AppLayout.Body`) is the shell's only scroll container, and an optional
 * side panel that opens beside the card.
 *
 * @see https://mantle.ngrok.com/layouts/app-layout
 */

import * as AppLayoutParts from "./app-layout-parts.js";

export {
	//,
	useSidePanel,
} from "./app-layout.js";

/**
 * A viewport-locked application shell: an optional full-width
 * `AppLayout.Notice` strip on top, then an `AppLayout.Workspace` row holding the
 * app's columns, typically a `Sidebar.Nav` beside an `AppLayout.Content` card
 * whose `AppLayout.Body` is the only thing that scrolls, and an optional
 * `AppLayout.SidePanel` that opens beside the card. It owns structure only
 * and is deliberately unaware of any sidebar: compose `Sidebar.Root` around it
 * and place `Sidebar.Trigger` in `AppLayout.Header` to connect the two.
 *
 * Reach for it when a signed-in application needs navigation chrome that
 * persists across routes. When the page is a single centered task surface with
 * no sidebar (sign in, sign up, onboarding, a standalone flow, a 404), compose
 * [`CenteredLayout`](https://mantle.ngrok.com/layouts/centered-layout) instead.
 *
 * The card reads exactly like the column beside it and like every other mantle
 * surface: `Content > Header + Body`, the same shape as `Sidebar.Nav`,
 * `Dialog.Content`, `Sheet.Content`, and `Card.Root`.
 *
 * There is deliberately no `Footer` part: a route rendering through an
 * `<Outlet />` inside `AppLayout.Body` could never reach one, and a page-owned
 * bottom bar is exactly what most consumers want. Make the page's root a flex
 * column instead; see the docs' "Sizing a page to the card".
 *
 * @useWhen Frame a signed-in app with navigation that persists across routes: a sidebar, a header
 * toolbar, and one scrolling content card.
 *
 * @siblings
 * - `CenteredLayout`: the page is one focused flow with no sidebar, such as sign-in, onboarding, or a 404 page.
 *
 * @see https://mantle.ngrok.com/layouts/app-layout
 *
 * @example
 * Composition:
 * ```
 * AppLayout.Root
 * ├── AppLayout.Notice
 * └── AppLayout.SidePanelRoot
 *     └── AppLayout.Workspace
 *         ├── AppLayout.Content
 *         │   ├── AppLayout.Header
 *         │   │   ├── AppLayout.HeaderStart
 *         │   │   ├── AppLayout.HeaderContent
 *         │   │   └── AppLayout.HeaderActions
 *         │   │       └── AppLayout.SidePanelTrigger
 *         │   └── AppLayout.Body
 *         └── AppLayout.SidePanel
 *             ├── AppLayout.SidePanelHeader
 *             ├── AppLayout.SidePanelBody
 *             └── AppLayout.SidePanelFooter
 * ```
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <AppLayout.Root className="fixed inset-0">
 *     <SkipToMainLink />
 *     <AppLayout.Notice>{isUnderMaintenance && <MaintenanceBanner />}</AppLayout.Notice>
 *     <AppLayout.SidePanelRoot>
 *       <AppLayout.Workspace>
 *         <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
 *         <AppLayout.Content>
 *           <AppLayout.Header>
 *             <AppLayout.HeaderStart>
 *               <Sidebar.Trigger />
 *             </AppLayout.HeaderStart>
 *             <AppLayout.HeaderContent>
 *               <Breadcrumbs />
 *             </AppLayout.HeaderContent>
 *             <AppLayout.HeaderActions>
 *               <AppLayout.SidePanelTrigger icon={<SparkleIcon />} label="Toggle the assistant" />
 *             </AppLayout.HeaderActions>
 *           </AppLayout.Header>
 *           <AppLayout.Body>
 *             <Outlet />
 *           </AppLayout.Body>
 *         </AppLayout.Content>
 *         <AppLayout.SidePanel aria-label="Assistant">
 *           <AppLayout.SidePanelHeader>
 *             <p className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Assistant</p>
 *             <AppLayout.SidePanelTrigger icon={<XIcon />} label="Close the assistant" />
 *           </AppLayout.SidePanelHeader>
 *           <AppLayout.SidePanelBody>
 *             <AssistantConversation />
 *           </AppLayout.SidePanelBody>
 *           <AppLayout.SidePanelFooter>
 *             <AssistantComposer />
 *           </AppLayout.SidePanelFooter>
 *         </AppLayout.SidePanel>
 *       </AppLayout.Workspace>
 *     </AppLayout.SidePanelRoot>
 *   </AppLayout.Root>
 * </Sidebar.Root>
 * ```
 */
const AppLayout = AppLayoutParts;

export {
	//,
	AppLayout,
};
export type {
	//,
	AppLayoutSidePanelMobileBreakpoint,
	AppLayoutSidePanelProps,
	AppLayoutSidePanelRootProps,
	AppLayoutSidePanelState,
	AppLayoutSidePanelTriggerProps,
} from "./app-layout.js";

export {
	//,
	extractSidePanelStateCookie,
	serializeSidePanelStateCookie,
	SIDE_PANEL_STATE_COOKIE_NAME,
} from "./side-panel-state-cookie.js";
export type {
	//,
	SerializeSidePanelStateCookieOptions,
} from "./side-panel-state-cookie.js";
