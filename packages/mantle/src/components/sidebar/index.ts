/**
 * Re-exports for the Sidebar compound component — a composable, collapsible
 * app-navigation sidebar with a desktop panel that collapses to an icon rail,
 * a mobile `Sheet` presentation, and a toggle trigger that composes into any
 * app shell.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar
 */

export {
	//,
	Sidebar,
	useSidebar,
} from "./sidebar.js";

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
