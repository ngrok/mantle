import type { RefObject } from "react";
import { createContext } from "react";
import type { AppLayoutSidePanelState } from "./app-layout.js";

/**
 * The internal context value: the public state `useSidePanel` returns, and
 * the panel's focus tracker, which stays off the public object.
 */
type SidePanelContextValue = {
	state: AppLayoutSidePanelState;
	/**
	 * The last element focused inside the panel, or `null` once focus landed
	 * outside it. The panel writes it; the root reads it on close.
	 */
	lastFocusedInsideRef: RefObject<Element | null>;
	/**
	 * The panel's `<aside>`. The panel fills it; the header reads it as the
	 * element a swipe moves.
	 */
	panelRef: RefObject<HTMLElement | null>;
};

// Why its own module: `Sidebar.Root` reads the panel's state to yield the rail,
// and an import of `app-layout.tsx` would pull every `AppLayout` part into it.
/**
 * The state `AppLayout.SidePanelRoot` hands to the parts below it, or `null`
 * outside one.
 */
const SidePanelContext = createContext<SidePanelContextValue | null>(null);

export {
	//,
	SidePanelContext,
};

export type {
	//,
	SidePanelContextValue,
};
