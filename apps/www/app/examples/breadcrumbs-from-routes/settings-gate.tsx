import { Outlet } from "react-router";

// No `handle` on purpose: a gate is not a place. It matches on every settings
// URL and contributes nothing to the trail.

/**
 * Stands in for the dashboard's account gate, which sends a personal account
 * away from account-only settings. It shows up in `useMatches()` and in the
 * debug popover with no `handle`.
 */
export default function SettingsGate() {
	return <Outlet />;
}
