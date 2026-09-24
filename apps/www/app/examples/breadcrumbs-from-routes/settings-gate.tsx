import { Outlet } from "react-router";

// No `handle` on purpose: a gate is not a place. It matches on every settings
// URL and contributes nothing to the trail.

/**
 * Stands in for an access gate: a pathless layout that checks who the reader
 * is and sends them elsewhere when the pages below are not theirs. It shows
 * up in `useMatches()` and in the debug popover with no `handle`.
 */
export default function SettingsGate() {
	return <Outlet />;
}
