import type { BreadcrumbHandle } from "@ngrok/mantle/breadcrumb";
import { routeBreadcrumb } from "@ngrok/mantle/breadcrumb";
import { Outlet } from "react-router";

export const handle = {
	// a label, not a link: `/settings` has no page of its own, it only redirects
	breadcrumb: () => [routeBreadcrumb.label("Settings")],
} satisfies BreadcrumbHandle;

/**
 * The Settings shell: a pathless layout that names a level of the IA. Its
 * pages keep the flat URLs they have (`/settings/general`, `/billing`,
 * `/team-members`); the route tree, not the URL, puts them under `Settings`.
 */
export default function SettingsShell() {
	return <Outlet />;
}
