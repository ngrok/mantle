import type { BreadcrumbHandle } from "@ngrok/mantle/breadcrumb";
import { routeBreadcrumb } from "@ngrok/mantle/breadcrumb";
import { Outlet } from "react-router";

export const handle = {
	// a label, not a link: the section has no landing page of its own
	breadcrumb: () => [routeBreadcrumb.label("Account")],
} satisfies BreadcrumbHandle;

/** The Account section: a pathless grouping layout that names a level of the IA. */
export default function SettingsAccountSection() {
	return <Outlet />;
}
