import { Sidebar } from "@ngrok/mantle/sidebar";
import { ClipboardTextIcon } from "@phosphor-icons/react/ClipboardText";
import { CreditCardIcon } from "@phosphor-icons/react/CreditCard";
import { FingerprintIcon } from "@phosphor-icons/react/Fingerprint";
import { GearIcon } from "@phosphor-icons/react/Gear";
import { ListMagnifyingGlassIcon } from "@phosphor-icons/react/ListMagnifyingGlass";
import { MapPinIcon } from "@phosphor-icons/react/MapPin";
import { SlidersHorizontalIcon } from "@phosphor-icons/react/SlidersHorizontal";
import { ShieldCheckIcon } from "@phosphor-icons/react/ShieldCheck";
import { UserCircleIcon } from "@phosphor-icons/react/UserCircle";
import type { ReactNode } from "react";

type SettingsNavItem = {
	label: string;
	icon: ReactNode;
	path: string;
	details?: ReadonlyArray<string>;
};

type SettingsNavSection = {
	title: string;
	items: ReadonlyArray<SettingsNavItem>;
};

const sections: ReadonlyArray<SettingsNavSection> = [
	{
		title: "Account",
		items: [
			{
				label: "General",
				icon: <GearIcon />,
				path: "/settings/general",
				details: [
					"Account name",
					"Identity verification (credit card)",
					"Danger zone: revoke all sessions, delete account",
				],
			},
			{ label: "Billing", icon: <CreditCardIcon />, path: "/settings/billing" },
			{
				label: "Auth",
				icon: <FingerprintIcon />,
				path: "/settings/auth",
				details: ["SSO", "User Provisioning / SCIM", "MFA Enforcement", "Google Apps Sign-on"],
			},
			{
				label: "Data Retention",
				icon: <ListMagnifyingGlassIcon />,
				path: "/settings/traffic-inspector",
			},
			{ label: "IP Restrictions", icon: <MapPinIcon />, path: "/settings/ip-restrictions" },
			{ label: "Audit Logs", icon: <ClipboardTextIcon />, path: "/settings/audit-logs" },
		],
	},
	{
		title: "User",
		items: [
			{
				label: "Preferences",
				icon: <SlidersHorizontalIcon />,
				path: "/settings/preferences",
				details: ["Display (theme)", "Date and Time Preferences", "Mailing lists"],
			},
			{
				label: "Profile",
				icon: <UserCircleIcon />,
				path: "/settings/profile",
				details: ["Name", "Email Address", "Delete user profile"],
			},
			{
				label: "Security & Access",
				icon: <ShieldCheckIcon />,
				path: "/settings/security-access",
				details: ["Login Methods", "MFA"],
			},
		],
	},
];

type Props = {
	pathname: string;
	onNavigate: (path: string) => void;
};

function allSettingsItems() {
	return sections.flatMap((section) => section.items);
}

function getAccountSettingsPage(pathname: string) {
	return allSettingsItems().find((item) => item.path === pathname);
}

/**
 * Placeholder navigation for the Account Settings rail section. Real items
 * will be filled in by the platform team — this exists to demonstrate the
 * pattern of admin-style sections living alongside products in the rail.
 */
export function AccountSettingsNav({ onNavigate, pathname }: Props) {
	return (
		<>
			{sections.map((section) => (
				<Sidebar.Section key={section.title}>
					<Sidebar.SectionTitle className="text-muted hover:bg-transparent px-2 py-1 text-xs font-medium">
						{section.title}
					</Sidebar.SectionTitle>
					<Sidebar.Group>
						{section.items.map((item) => (
							<Sidebar.Item
								key={item.path}
								active={pathname === item.path}
								className="font-normal"
								level="top"
								asChild
							>
								<button type="button" onClick={() => onNavigate(item.path)}>
									{item.icon}
									{item.label}
								</button>
							</Sidebar.Item>
						))}
					</Sidebar.Group>
				</Sidebar.Section>
			))}
		</>
	);
}

export { getAccountSettingsPage };
