import { createContext } from "react";

// Why its own module: `AppLayout.SidePanel` asks through it, and an import of
// `sidebar.tsx` would pull every `Sidebar` part into `AppLayout`.
/**
 * How a panel beside the page asks the nearest `Sidebar.Root` for the
 * sidebar's width: `true` while the panel needs it, `false` when it gives the
 * width back. `null` outside a `Sidebar.Root`.
 */
const SidebarWidthRequestContext = createContext<((needsWidth: boolean) => void) | null>(null);

export {
	//,
	SidebarWidthRequestContext,
};
