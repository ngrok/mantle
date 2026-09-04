import type { BreadcrumbHandle } from "@ngrok/mantle/breadcrumb";
import { routeBreadcrumb } from "@ngrok/mantle/breadcrumb";
import { Outlet } from "react-router";

export const handle = {
	breadcrumb: () => [routeBreadcrumb.label("Identity & Access")],
} satisfies BreadcrumbHandle;

/** The Identity & Access section; see `settings-account.tsx`. */
export default function SettingsIdentityAccessSection() {
	return <Outlet />;
}
