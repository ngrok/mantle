import { createContext } from "react";

// Why its own module: `AppLayout.SidePanel` asks through it, and an import of
// `sidebar.tsx` would pull every `Sidebar` part into `AppLayout`.
/**
 * How a panel beside the page asks the nearest `Sidebar.Root` for the
 * sidebar's width: `1` when the panel starts to need it, `-1` when it gives its
 * request back. The sidebar yields while any request is open, so one panel
 * never cancels another's. `null` outside a `Sidebar.Root`.
 */
const SidebarWidthRequestContext = createContext<((change: 1 | -1) => void) | null>(null);

export {
	//,
	SidebarWidthRequestContext,
};
