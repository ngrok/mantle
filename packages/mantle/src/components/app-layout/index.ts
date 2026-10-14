/**
 * Re-exports for the AppLayout compound component: a viewport-locked
 * application shell with a full-width notice strip, a workspace row holding
 * the app's columns, a rounded content card whose page region
 * (`AppLayout.Body`) is the shell's only scroll container, and an optional
 * side panel that opens beside the card.
 *
 * @see https://mantle.ngrok.com/layouts/app-layout
 */

export {
	//,
	AppLayout,
	useSidePanel,
} from "./app-layout.js";
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
