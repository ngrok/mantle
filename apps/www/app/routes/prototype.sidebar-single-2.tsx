import { cx } from "@ngrok/mantle/cx";
import { Dialog } from "@ngrok/mantle/dialog";
import { DropdownMenu } from "@ngrok/mantle/dropdown-menu";
import { Icon } from "@ngrok/mantle/icon";
import { AutoThemeIcon, ThemeIcon } from "@ngrok/mantle/icons";
import { Input, InputCapture } from "@ngrok/mantle/input";
import { Sidebar } from "@ngrok/mantle/sidebar";
import { Button } from "@ngrok/mantle/button";
import { Table } from "@ngrok/mantle/table";
import { Tabs } from "@ngrok/mantle/tabs";
import { $theme, isTheme, useTheme } from "@ngrok/mantle/theme";
import { ArrowLeftIcon } from "@phosphor-icons/react/ArrowLeft";
import { ArrowRightIcon } from "@phosphor-icons/react/ArrowRight";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/ArrowsClockwise";
import { BankIcon } from "@phosphor-icons/react/Bank";
import { BookIcon } from "@phosphor-icons/react/Book";
import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import { CertificateIcon } from "@phosphor-icons/react/Certificate";
import { ChatsIcon } from "@phosphor-icons/react/Chats";
import { ClipboardTextIcon } from "@phosphor-icons/react/ClipboardText";
import { CloudArrowUpIcon } from "@phosphor-icons/react/CloudArrowUp";
import { CpuIcon } from "@phosphor-icons/react/Cpu";
import { CreditCardIcon } from "@phosphor-icons/react/CreditCard";
import { DoorOpenIcon } from "@phosphor-icons/react/DoorOpen";
import { DownloadSimpleIcon } from "@phosphor-icons/react/DownloadSimple";
import { EnvelopeIcon } from "@phosphor-icons/react/Envelope";
import { FingerprintIcon } from "@phosphor-icons/react/Fingerprint";
import { FolderIcon } from "@phosphor-icons/react/Folder";
import { GearIcon } from "@phosphor-icons/react/Gear";
import { GlobeHemisphereWestIcon } from "@phosphor-icons/react/GlobeHemisphereWest";
import { GraphIcon } from "@phosphor-icons/react/Graph";
import { HashIcon } from "@phosphor-icons/react/Hash";
import { HeartbeatIcon } from "@phosphor-icons/react/Heartbeat";
import { IdentificationCardIcon } from "@phosphor-icons/react/IdentificationCard";
import { KeyIcon } from "@phosphor-icons/react/Key";
import { ListMagnifyingGlassIcon } from "@phosphor-icons/react/ListMagnifyingGlass";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import { MapPinIcon } from "@phosphor-icons/react/MapPin";
import { MegaphoneIcon } from "@phosphor-icons/react/Megaphone";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import { PlusCircleIcon } from "@phosphor-icons/react/PlusCircle";
import { QuestionIcon } from "@phosphor-icons/react/Question";
import { RobotIcon } from "@phosphor-icons/react/Robot";
import { ShieldCheckIcon } from "@phosphor-icons/react/ShieldCheck";
import { SignOutIcon } from "@phosphor-icons/react/SignOut";
import { SlidersHorizontalIcon } from "@phosphor-icons/react/SlidersHorizontal";
import { SquaresFourIcon } from "@phosphor-icons/react/SquaresFour";
import { TerminalWindowIcon } from "@phosphor-icons/react/TerminalWindow";
import { UserCircleIcon } from "@phosphor-icons/react/UserCircle";
import { UsersThreeIcon } from "@phosphor-icons/react/UsersThree";
import { VaultIcon } from "@phosphor-icons/react/Vault";
import type { KeyboardEvent, ReactNode } from "react";
import { useRef, useState } from "react";

import { getAccountSettingsPage } from "~/examples/sidebar/account-settings-nav";
import { AiGatewayNav } from "~/examples/sidebar/ai-gateway-nav";
import { demoAccounts, demoUser } from "~/examples/sidebar/demo-data";
import {
	type ExampleProduct,
	type ProductId,
	productItems,
	utilityItems,
} from "~/examples/sidebar/products";
import { UserShieldIcon } from "~/examples/sidebar/user-shield-icon";

type SidebarMode =
	| { type: "product" }
	| { type: "utility"; utilityId: Extract<ProductId, "account-settings"> };

type SettingsUtilityId = Extract<ProductId, "account-settings">;
type ProductSwitcherId = Extract<ProductId, "ai-gateway" | "codename" | "universal-gateway">;

const initialProductId: Extract<ProductId, "universal-gateway"> = "universal-gateway";
const initialPath = "/endpoints";
const productSwitcherIds: ReadonlyArray<ProductSwitcherId> = [
	"universal-gateway",
	"codename",
	"ai-gateway",
];
const aiGatewayUrl = "https://app.ngrok.ai";
const productColorClassNames: Record<ProductSwitcherId, string> = {
	"ai-gateway": "bg-amber-600/10 text-amber-600 dark:text-amber-600",
	codename: "bg-sky-600/10 text-sky-600 dark:text-sky-600",
	"universal-gateway": "bg-emerald-600/10 text-emerald-600 dark:text-emerald-600",
};
const productTextColorClassNames: Record<ProductSwitcherId, string> = {
	"ai-gateway": "text-amber-600 dark:text-amber-600",
	codename: "text-sky-600 dark:text-sky-600",
	"universal-gateway": "text-emerald-600 dark:text-emerald-600",
};
const productSelectedClassNames: Record<ProductSwitcherId, string> = {
	"ai-gateway":
		"border-amber-600 bg-amber-600/[0.03] ring-4 ring-amber-600/15 dark:border-amber-600",
	codename: "border-sky-600 bg-sky-600/[0.03] ring-4 ring-sky-600/15 dark:border-sky-600",
	"universal-gateway":
		"border-emerald-600 bg-emerald-600/[0.03] ring-4 ring-emerald-600/15 dark:border-emerald-600",
};
const productHighlightClassNames: Record<ProductSwitcherId, string> = {
	"ai-gateway":
		"hover:border-amber-600 hover:bg-amber-600/[0.03] focus-visible:bg-amber-600/[0.03] focus-visible:ring-amber-600/20 dark:hover:border-amber-600",
	codename:
		"hover:border-sky-600 hover:bg-sky-600/[0.03] focus-visible:bg-sky-600/[0.03] focus-visible:ring-sky-600/20 dark:hover:border-sky-600",
	"universal-gateway":
		"hover:border-emerald-600 hover:bg-emerald-600/[0.03] focus-visible:bg-emerald-600/[0.03] focus-visible:ring-emerald-600/20 dark:hover:border-emerald-600",
};
const productArrowClassNames: Record<ProductSwitcherId, string> = {
	"ai-gateway":
		"group-hover:text-amber-600 group-focus-visible:text-amber-600 dark:group-hover:text-amber-600 dark:group-focus-visible:text-amber-600",
	codename:
		"group-hover:text-sky-600 group-focus-visible:text-sky-600 dark:group-hover:text-sky-600 dark:group-focus-visible:text-sky-600",
	"universal-gateway":
		"group-hover:text-emerald-600 group-focus-visible:text-emerald-600 dark:group-hover:text-emerald-600 dark:group-focus-visible:text-emerald-600",
};
const productDialogCopy: Record<
	ProductSwitcherId,
	{
		title: string;
		description: string;
	}
> = {
	"ai-gateway": {
		title: "One gateway, every model.",
		description:
			"Change one URL to route between hosted or self-hosted models, with failover and observability built in.",
	},
	codename: {
		title: "Ship apps without managing infrastructure.",
		description: "Deploy services close to your users with managed compute, domains, and secrets.",
	},
	"universal-gateway": {
		title: "Connect to anything, anywhere.",
		description:
			"An all-in-one cloud networking platform that secures, transforms, and routes traffic to all your services no matter where they run.",
	},
};
const utilityInitialPaths = {
	"account-settings": "/settings/general",
} as const satisfies Record<SettingsUtilityId, string>;
const footerActionItems = [
	{
		id: "vaults",
		label: "Vaults & Secrets",
		icon: <VaultIcon />,
		path: "/vaults",
	},
	{
		id: "iam",
		label: "Identity & Access",
		icon: utilityItems.find((item) => item.id === "iam")?.icon,
		path: "/iam/team-members",
	},
	{
		id: "usage",
		label: "Usage & Limits",
		icon: utilityItems.find((item) => item.id === "usage")?.icon,
		path: "/usage",
	},
] as const;
const iamTabs = [
	{ label: "Team Members", icon: <UsersThreeIcon />, path: "/iam/team-members", badge: "24" },
	{
		label: "Pending Invitations",
		icon: <EnvelopeIcon />,
		path: "/iam/pending-invitations",
		badge: "2",
	},
	{ label: "Service Users", icon: <RobotIcon />, path: "/iam/service-users" },
	{ label: "Access Tokens", icon: <KeyIcon />, path: "/iam/access-tokens" },
	{ label: "API Keys", path: "/iam/api-keys" },
	{ label: "Auth Tokens", path: "/iam/authtokens" },
] as const;
type IamTabPath = (typeof iamTabs)[number]["path"];

const iamTableContent: Record<
	IamTabPath,
	{
		columns: ReadonlyArray<string>;
		newLabel: string;
		rows: ReadonlyArray<ReadonlyArray<ReactNode>>;
		searchPlaceholder: string;
	}
> = {
	"/iam/team-members": {
		columns: ["Status", "Email", "Name", "Role", "Created"],
		newLabel: "Invite team member",
		searchPlaceholder: "Filter team members...",
		rows: [
			[
				<StatusDot key="active" label="Active" tone="success" />,
				"alex.chen@example.com",
				"Alex Chen",
				"Admin",
				"Jan 18, 2026",
			],
			[
				<StatusDot key="active" label="Active" tone="success" />,
				"micah@example.com",
				"Micah Woods",
				"Developer",
				"Mar 2, 2026",
			],
			[
				<StatusDot key="inactive" label="Inactive" tone="muted" />,
				"finance@example.com",
				"Finance Team",
				"Billing",
				"Apr 9, 2026",
			],
		],
	},
	"/iam/pending-invitations": {
		columns: ["Email", "Role", "Invited by", "Expires"],
		newLabel: "Invite Team Member",
		searchPlaceholder: "Filter pending invitations...",
		rows: [
			["jordan@example.com", "Developer", "Alex Chen", "2 days"],
			["taylor@example.com", "Viewer", "Micah Woods", "5 days"],
		],
	},
	"/iam/service-users": {
		columns: ["ID", "Status", "Name", "Created"],
		newLabel: "New service user",
		searchPlaceholder: "Filter service users...",
		rows: [
			[
				<code key="id" className="font-mono text-xs">
					bot_2Z3z7YcG
				</code>,
				<StatusDot key="active" label="Active" tone="success" />,
				"deploy-bot",
				"Feb 12, 2026",
			],
			[
				<code key="id" className="font-mono text-xs">
					bot_2Z4a9LkQ
				</code>,
				<StatusDot key="active" label="Active" tone="success" />,
				"github-actions",
				"Mar 27, 2026",
			],
			[
				<code key="id" className="font-mono text-xs">
					bot_2Z5n8PqR
				</code>,
				<StatusDot key="inactive" label="Inactive" tone="muted" />,
				"legacy-ci",
				"May 4, 2026",
			],
		],
	},
	"/iam/access-tokens": {
		columns: ["Name", "Token prefix", "Owner", "Scopes", "Last used"],
		newLabel: "New access token",
		searchPlaceholder: "Filter access tokens...",
		rows: [
			[
				"Production deploy",
				<code key="token" className="font-mono text-xs">
					ngpat_2Za...
				</code>,
				"Alex Chen",
				"API, Tunnels",
				"2 hours ago",
			],
			[
				"Terraform",
				<code key="token" className="font-mono text-xs">
					ngpat_2Zb...
				</code>,
				"Micah Woods",
				"API",
				"Yesterday",
			],
			[
				"Support tooling",
				<code key="token" className="font-mono text-xs">
					ngpat_2Zc...
				</code>,
				"Support Team",
				"Read-only",
				"Never",
			],
		],
	},
	"/iam/api-keys": {
		columns: ["Description", "Key prefix", "Created by", "Created"],
		newLabel: "New API key",
		searchPlaceholder: "Filter API keys...",
		rows: [
			[
				"Legacy billing export",
				<code key="key" className="font-mono text-xs">
					api_2Zd...
				</code>,
				"Finance Team",
				"Nov 5, 2025",
			],
			[
				"Ops dashboard",
				<code key="key" className="font-mono text-xs">
					api_2Ze...
				</code>,
				"Alex Chen",
				"Dec 14, 2025",
			],
		],
	},
	"/iam/authtokens": {
		columns: ["Description", "Token prefix", "Agent", "Last used"],
		newLabel: "New auth token",
		searchPlaceholder: "Filter auth tokens...",
		rows: [
			[
				"macOS dev tunnel",
				<code key="token" className="font-mono text-xs">
					2Zf8...
				</code>,
				"micah-mbp",
				"3 days ago",
			],
			[
				"staging ingress",
				<code key="token" className="font-mono text-xs">
					2Zg1...
				</code>,
				"staging-edge-01",
				"1 week ago",
			],
			[
				"demo environment",
				<code key="token" className="font-mono text-xs">
					2Zh4...
				</code>,
				"demo-agent",
				"Never",
			],
		],
	},
};

type SettingsNavItem = {
	label: string;
	icon: ReactNode;
	path: string;
};

type SettingsNavSection = {
	title: string;
	items: ReadonlyArray<SettingsNavItem>;
};

const settingsSections: ReadonlyArray<SettingsNavSection> = [
	{
		title: "Account",
		items: [
			{ label: "General", icon: <GearIcon />, path: "/settings/general" },
			{ label: "Billing", icon: <CreditCardIcon />, path: "/settings/billing" },
			{ label: "Auth", icon: <FingerprintIcon />, path: "/settings/auth" },
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
			{ label: "Preferences", icon: <SlidersHorizontalIcon />, path: "/settings/preferences" },
			{ label: "Profile", icon: <UserCircleIcon />, path: "/settings/profile" },
			{
				label: "Security & Access",
				icon: <ShieldCheckIcon />,
				path: "/settings/security-access",
			},
		],
	},
];

type DemoProject = {
	id: string;
	name: string;
};

const demoProjectsByAccount: Record<string, ReadonlyArray<DemoProject>> = {
	acc_acme: [
		{ id: "proj_orion", name: "Project Orion" },
		{ id: "proj_launchpad", name: "Launchpad" },
		{ id: "proj_customer_edge", name: "Customer Edge" },
	],
	acc_skunkworks: [
		{ id: "proj_labyrinth", name: "Labyrinth" },
		{ id: "proj_nightly", name: "Nightly Builds" },
	],
	acc_atlas: [
		{ id: "proj_northstar", name: "Northstar" },
		{ id: "proj_dataplane", name: "Global Dataplane" },
	],
};

function projectsForAccount(accountId: string) {
	return demoProjectsByAccount[accountId] ?? [];
}

function initialPathForProduct(productId: ProductSwitcherId) {
	if (productId === "ai-gateway") {
		return "/ai-gateway/overview";
	}
	if (productId === "codename") {
		return "/ship/apps";
	}
	return "/endpoints";
}

function isProductSwitcherId(id: ProductId): id is ProductSwitcherId {
	return productSwitcherIds.includes(id as ProductSwitcherId);
}

function productDisplayName(product: ExampleProduct | undefined) {
	return product?.label ?? "Gateway";
}

function navForProduct(
	productId: ProductSwitcherId,
	pathname: string,
	onNavigate: (path: string) => void,
) {
	if (productId === "universal-gateway") {
		return <UniversalGatewayNavForSingle2 pathname={pathname} onNavigate={onNavigate} />;
	}
	if (productId === "codename") {
		return <CodenameNavForSingle2 pathname={pathname} onNavigate={onNavigate} />;
	}
	if (productId === "ai-gateway") {
		return <AiGatewayNav pathname={pathname} onNavigate={onNavigate} />;
	}
	return <UniversalGatewayNavForSingle2 pathname={pathname} onNavigate={onNavigate} />;
}

function navForUtility(
	_utilityId: Extract<ProductId, "account-settings">,
	pathname: string,
	onNavigate: (path: string) => void,
) {
	return <SettingsNavForSingle2 pathname={pathname} onNavigate={onNavigate} />;
}

type ProductNavItem = {
	label: string;
	icon: ReactNode;
	path: string;
};

type ProductNavSection = {
	title: string;
	items: ReadonlyArray<ProductNavItem>;
};

const gatewayTopLevelItems: ReadonlyArray<ProductNavItem> = [
	{ label: "Endpoints", icon: <GraphIcon />, path: "/endpoints" },
	{ label: "Agents", icon: <TerminalWindowIcon />, path: "/agents" },
];

const gatewaySections: ReadonlyArray<ProductNavSection> = [
	{
		title: "Traffic",
		items: [
			{
				label: "Traffic Inspector",
				icon: <ListMagnifyingGlassIcon />,
				path: "/observability/traffic-inspector",
			},
			{
				label: "Traffic Identities",
				icon: <IdentificationCardIcon />,
				path: "/traffic-identities",
			},
			{ label: "Log Export", icon: <CloudArrowUpIcon />, path: "/event-subscriptions" },
		],
	},
	{
		title: "Network",
		items: [
			{ label: "Domains", icon: <GlobeHemisphereWestIcon />, path: "/domains" },
			{ label: "TCP Addresses", icon: <HashIcon />, path: "/tcp-addresses" },
		],
	},
	{
		title: "Resources",
		items: [
			{ label: "IP Policies", icon: <MapPinIcon />, path: "/ip-policies" },
			{ label: "TLS Certificates", icon: <CertificateIcon />, path: "/tls-certs" },
			{
				label: "TLS Cert Authorities",
				icon: <BankIcon />,
				path: "/tls-cert-authorities",
			},
		],
	},
	{
		title: "Kubernetes",
		items: [{ label: "K8s Operators", icon: <KubernetesIcon />, path: "/kubernetes-operators" }],
	},
];

const shipItems: ReadonlyArray<ProductNavItem> = [
	{ label: "Apps", icon: <SquaresFourIcon />, path: "/ship/apps" },
	{ label: "Compute Pools", icon: <CpuIcon />, path: "/ship/compute-pools" },
];

function UniversalGatewayNavForSingle2({
	onNavigate,
	pathname,
}: {
	onNavigate: (path: string) => void;
	pathname: string;
}) {
	return (
		<>
			<Sidebar.Group>
				{gatewayTopLevelItems.map((item) => (
					<ProductNavLinkItem
						key={item.path}
						item={item}
						pathname={pathname}
						onNavigate={onNavigate}
					/>
				))}
			</Sidebar.Group>
			{gatewaySections.map((section) => (
				<Sidebar.Section key={section.title}>
					<Sidebar.SectionTitle className="text-muted hover:bg-transparent px-2 py-1 text-xs font-medium">
						{section.title}
					</Sidebar.SectionTitle>
					<Sidebar.Group>
						{section.items.map((item) => (
							<ProductNavLinkItem
								key={item.path}
								item={item}
								pathname={pathname}
								onNavigate={onNavigate}
							/>
						))}
					</Sidebar.Group>
				</Sidebar.Section>
			))}
		</>
	);
}

function CodenameNavForSingle2({
	onNavigate,
	pathname,
}: {
	onNavigate: (path: string) => void;
	pathname: string;
}) {
	return (
		<Sidebar.Group>
			{shipItems.map((item) => (
				<ProductNavLinkItem
					key={item.path}
					item={item}
					pathname={pathname}
					onNavigate={onNavigate}
				/>
			))}
		</Sidebar.Group>
	);
}

function ProductNavLinkItem({
	item,
	onNavigate,
	pathname,
}: {
	item: ProductNavItem;
	onNavigate: (path: string) => void;
	pathname: string;
}) {
	return (
		<Sidebar.Item active={pathname === item.path} className="font-normal" level="top" asChild>
			<a
				href={item.path}
				onClick={(event) => {
					event.preventDefault();
					onNavigate(item.path);
				}}
			>
				{item.icon}
				{item.label}
			</a>
		</Sidebar.Item>
	);
}

function KubernetesIcon() {
	return (
		<svg viewBox="0 0 32 32" width="1em" height="1em" aria-hidden="true">
			<path
				fill="currentColor"
				d="M18.46 17.5a.46.46 0 0 0-.29.03.48.48 0 0 0-.23.62l1.1 2.65a5.58 5.58 0 0 0 2.25-2.84l-2.82-.47Zm-4.38.37a.48.48 0 0 0-.55-.36v-.01l-2.8.47a5.6 5.6 0 0 0 2.25 2.82l1.08-2.62c.03-.1.04-.2.02-.3Zm2.34 1.02a.48.48 0 0 0-.84 0l-1.38 2.49a5.6 5.6 0 0 0 3.6 0l-1.37-2.49h-.01Zm4.35-5.77-2.12 1.9a.48.48 0 0 0 .2.82v.01l2.73.8a5.68 5.68 0 0 0-.81-3.53Zm-3.93.22a.48.48 0 0 0 .76.36l2.32-1.64a5.62 5.62 0 0 0-3.24-1.56l.16 2.84Zm-2.45.37a.48.48 0 0 0 .76-.36l.01-.01.16-2.84a5.72 5.72 0 0 0-3.26 1.56l2.33 1.65Zm-1.24 2.15a.48.48 0 0 0 .19-.82v-.02l-2.12-1.9a5.57 5.57 0 0 0-.8 3.53l2.73-.79Zm2.07.83.78.38.78-.38.2-.84-.55-.68h-.87l-.54.68.2.84Z"
			/>
			<path
				fill="currentColor"
				d="m28.96 18.35-2.24-9.7a1.74 1.74 0 0 0-.93-1.16l-9.04-4.32a1.74 1.74 0 0 0-1.5 0L6.2 7.49a1.74 1.74 0 0 0-.94 1.16l-2.23 9.7a1.7 1.7 0 0 0 .33 1.46l6.26 7.78.09.1a1.72 1.72 0 0 0 1.26.54h10.04a1.65 1.65 0 0 0 .61-.12 1.76 1.76 0 0 0 .74-.53l6.25-7.78a1.69 1.69 0 0 0 .34-.7c.05-.25.05-.5 0-.75Zm-9.38 3.78.09.21a.43.43 0 0 0-.04.32c.13.3.3.6.48.86l.29.43.07.15a.54.54 0 1 1-.98.46l-.07-.14a4.52 4.52 0 0 1-.15-.5c-.1-.3-.22-.61-.37-.9a.43.43 0 0 0-.28-.17l-.12-.2a7 7 0 0 1-4.99-.02l-.12.22a.44.44 0 0 0-.24.12c-.18.3-.32.63-.42.97-.04.17-.09.33-.15.5l-.07.13a.54.54 0 1 1-.98-.46l.07-.15c.1-.15.19-.29.3-.43.18-.28.35-.57.48-.88.02-.1 0-.21-.04-.3l.1-.24a7.04 7.04 0 0 1-3.13-3.9l-.23.04a.6.6 0 0 0-.31-.1c-.33.06-.64.15-.95.27l-.48.19-.14.03h-.02a.54.54 0 1 1-.24-1.05h.01l.15-.04c.17-.02.34-.04.51-.04.33-.02.66-.08.97-.16.1-.06.18-.14.24-.23l.22-.07a7 7 0 0 1 1.1-4.88L9.98 12a.6.6 0 0 0-.1-.3 4.87 4.87 0 0 0-.8-.57 4.25 4.25 0 0 1-.46-.27l-.11-.09a.57.57 0 0 1-.14-.8.52.52 0 0 1 .43-.2c.14.01.27.06.38.15l.12.1c.12.12.24.24.35.38a5 5 0 0 0 .73.65c.1.06.22.07.32.04l.2.13a6.96 6.96 0 0 1 4.51-2.17l.02-.23a.59.59 0 0 0 .17-.28c.01-.32 0-.65-.06-.98a4.55 4.55 0 0 1-.07-.51V6.9a.54.54 0 1 1 1.08 0v.15a4.5 4.5 0 0 1-.07.51c-.05.33-.08.66-.06.98.02.11.08.21.17.28l.02.24a7.1 7.1 0 0 1 4.49 2.17l.2-.15a.6.6 0 0 0 .33-.04c.27-.2.51-.41.73-.66.11-.13.23-.25.36-.37l.12-.1a.54.54 0 1 1 .67.85l-.12.1a5.06 5.06 0 0 0-1.25.83.4.4 0 0 0-.1.3l-.2.17a7.03 7.03 0 0 1 1.13 4.87l.22.06c.06.1.14.18.23.24.32.08.65.14.98.16.17 0 .34.01.51.04.05 0 .12.03.16.04a.54.54 0 1 1-.24 1.05h-.02l-.14-.03a4.5 4.5 0 0 1-.48-.2c-.3-.11-.62-.2-.95-.27a.43.43 0 0 0-.3.11 8.22 8.22 0 0 0-.23-.04 7.04 7.04 0 0 1-3.12 3.93Z"
			/>
		</svg>
	);
}

function SettingsNavForSingle2({
	onNavigate,
	pathname,
}: {
	onNavigate: (path: string) => void;
	pathname: string;
}) {
	return (
		<>
			{settingsSections.map((section) => (
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

function ProductIconBox({
	className,
	product,
	variant = "box",
}: {
	className?: string;
	product: ExampleProduct;
	variant?: "box" | "icon";
}) {
	const colorClassName = isProductSwitcherId(product.id)
		? productColorClassNames[product.id]
		: "bg-amber-600/10 text-amber-600 dark:text-amber-600";
	const iconColorClassName = isProductSwitcherId(product.id)
		? productTextColorClassNames[product.id]
		: "text-amber-600 dark:text-amber-600";

	return (
		<span
			className={cx(
				"flex shrink-0 items-center justify-center",
				variant === "box"
					? ["size-5 rounded-[0.25rem] [&>svg]:size-4", colorClassName]
					: ["size-5 [&>svg]:size-5", iconColorClassName],
				className,
			)}
			aria-hidden="true"
		>
			{product.icon}
		</span>
	);
}

function ProductSelectorIcon({ product }: { product: ExampleProduct }) {
	const colorClassName = isProductSwitcherId(product.id)
		? productColorClassNames[product.id]
		: "bg-amber-600/10 text-amber-600 dark:text-amber-600";

	return (
		<span
			className={cx(
				"flex size-6 shrink-0 items-center justify-center rounded-md [&>svg]:size-5",
				colorClassName,
			)}
			aria-hidden="true"
		>
			{product.icon}
		</span>
	);
}

function AccountSelectorAvatar({
	accountId,
	accountName,
}: {
	accountId: string | undefined;
	accountName: string | undefined;
}) {
	return (
		<span className="flex size-6 shrink-0 items-center justify-center">
			<span className="sr-only">{accountName}</span>
			<Sidebar.AccountAvatar
				className="size-6! rounded-md text-xs"
				accountId={accountId}
				accountName={accountName}
			/>
		</span>
	);
}

export default function SidebarSingle2Prototype() {
	const [mode, setMode] = useState<SidebarMode>({ type: "product" });
	const [currentProductId, setCurrentProductId] = useState<ProductSwitcherId>(initialProductId);
	const [productDialogOpen, setProductDialogOpen] = useState(false);
	const [activeProductId, setActiveProductId] = useState<ProductSwitcherId>(initialProductId);
	const productTriggerRef = useRef<HTMLButtonElement | null>(null);
	const productOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);
	const [pathname, setPathname] = useState(initialPath);
	const [productPathById, setProductPathById] = useState<Record<ProductSwitcherId, string>>({
		"ai-gateway": initialPathForProduct("ai-gateway"),
		codename: initialPathForProduct("codename"),
		"universal-gateway": initialPath,
	});
	const [currentAccountId, setCurrentAccountId] = useState(demoAccounts[0]?.id ?? "");
	const [currentProjectId, setCurrentProjectId] = useState(
		projectsForAccount(demoAccounts[0]?.id ?? "")[0]?.id ?? "",
	);
	const [currentTheme, setTheme] = useTheme();

	const currentAccount = demoAccounts.find((account) => account.id === currentAccountId);
	const currentProjects = projectsForAccount(currentAccountId);
	const currentProject =
		currentProjects.find((project) => project.id === currentProjectId) ?? currentProjects[0];
	const currentProduct = productItems.find((product) => product.id === currentProductId);
	const productSwitcherItems = productSwitcherIds.flatMap(
		(productId): Array<ExampleProduct & { id: ProductSwitcherId }> => {
			const product = productItems.find((item) => item.id === productId);
			return product && isProductSwitcherId(product.id) ? [{ ...product, id: product.id }] : [];
		},
	);
	const currentUtility =
		mode.type === "utility" ? utilityItems.find((item) => item.id === mode.utilityId) : undefined;

	const openUtility = (utilityId: SettingsUtilityId) => {
		setMode({ type: "utility", utilityId });
		setPathname(utilityInitialPaths[utilityId]);
	};

	const openAccountSettingsPath = (path: string) => {
		setMode({ type: "utility", utilityId: "account-settings" });
		setPathname(path);
	};

	const selectFooterPath = (path: string) => {
		setMode({ type: "product" });
		setPathname(path);
	};

	const returnToProduct = () => {
		setMode({ type: "product" });
		setPathname(productPathById[currentProductId]);
	};

	const switchAccount = (accountId: string) => {
		setCurrentAccountId(accountId);
		setCurrentProjectId(projectsForAccount(accountId)[0]?.id ?? "");
	};

	const switchProduct = (productId: ProductSwitcherId) => {
		const nextPath = initialPathForProduct(productId);
		setCurrentProductId(productId);
		setActiveProductId(productId);
		setMode({ type: "product" });
		setPathname(nextPath);
		setProductPathById((currentPaths) => ({
			...currentPaths,
			[productId]: nextPath,
		}));
		setProductDialogOpen(false);
		window.setTimeout(() => productTriggerRef.current?.blur(), 0);
	};

	const selectProductOption = (productId: ProductSwitcherId) => {
		if (productId === "ai-gateway") {
			window.open(aiGatewayUrl, "_blank", "noopener,noreferrer");
			setProductDialogOpen(false);
			window.setTimeout(() => productTriggerRef.current?.blur(), 0);
			return;
		}
		switchProduct(productId);
	};

	const navigateProduct = (path: string) => {
		setPathname(path);
		setProductPathById((currentPaths) => ({
			...currentPaths,
			[currentProductId]: path,
		}));
	};

	const focusProductOption = (index: number) => {
		const product = productSwitcherItems[index];
		if (product) {
			setActiveProductId(product.id);
		}
		productOptionRefs.current[index]?.focus();
	};

	const handleProductOptionKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
		const lastIndex = productSwitcherItems.length - 1;
		if (event.key === "ArrowDown") {
			event.preventDefault();
			focusProductOption(index === lastIndex ? 0 : index + 1);
		}
		if (event.key === "ArrowUp") {
			event.preventDefault();
			focusProductOption(index === 0 ? lastIndex : index - 1);
		}
		if (event.key === "Home") {
			event.preventDefault();
			focusProductOption(0);
		}
		if (event.key === "End") {
			event.preventDefault();
			focusProductOption(lastIndex);
		}
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			selectProductOption(activeProductId);
		}
	};

	return (
		<div className="bg-base fixed inset-0 z-50 flex">
			<Sidebar.Root
				aria-label={
					mode.type === "utility"
						? `${currentUtility?.label ?? "Utility"} navigation`
						: `${currentProduct?.label ?? "Product"} navigation`
				}
				className="border-r-0 bg-transparent"
			>
				<Sidebar.Header className="border-b-0 pt-4 pb-2">
					{mode.type === "utility" ? (
						<button
							type="button"
							className={cx(
								"text-body hover:text-strong hover:bg-neutral-500/10 flex w-full min-w-0 items-center gap-2 truncate rounded-md px-2 py-1.5 text-left font-medium",
								"ring-focus-accent focus:outline-hidden focus-visible:ring-4",
								"[&>svg]:text-muted hover:[&>svg]:text-strong [&>svg]:size-5 [&>svg]:shrink-0",
							)}
							onClick={returnToProduct}
						>
							<ArrowLeftIcon />
							<span className="text-strong min-w-0 flex-1 truncate text-base">
								{currentUtility?.label ?? "Back"}
							</span>
						</button>
					) : (
						<Dialog.Root
							open={productDialogOpen}
							onOpenChange={(open) => {
								setProductDialogOpen(open);
								if (open) {
									setActiveProductId(currentProductId);
									window.setTimeout(() => {
										const activeIndex = productSwitcherItems.findIndex(
											(product) => product.id === currentProductId,
										);
										if (activeIndex >= 0) {
											focusProductOption(activeIndex);
										}
									}, 0);
								}
							}}
						>
							<Dialog.Trigger
								ref={productTriggerRef}
								className={cx(
									"text-body hover:text-strong hover:bg-neutral-500/10 flex w-full min-w-0 items-center gap-1.5 truncate rounded-md px-1.5 py-1.5 text-left font-medium",
									"data-state-open:bg-neutral-500/15 data-state-open:text-strong",
									"ring-focus-accent focus:outline-hidden focus-visible:ring-4",
								)}
							>
								{currentProduct ? <ProductSelectorIcon product={currentProduct} /> : null}
								<span className="text-strong min-w-0 flex-1 truncate text-left text-base">
									{productDisplayName(currentProduct)}
								</span>
								<Icon svg={<CaretDownIcon />} className="text-muted size-4 shrink-0" />
							</Dialog.Trigger>
							<Dialog.Content preferredWidth="max-w-xl" className="bg-popover">
								<Dialog.Body className="p-6">
									<Dialog.Title className="text-strong text-center text-lg font-medium">
										Choose a product
									</Dialog.Title>
									<div className="mt-6 flex flex-col gap-2">
										{productSwitcherItems.map((product, index) => {
											const copy = productDialogCopy[product.id];
											return (
												<button
													key={product.id}
													ref={(node) => {
														productOptionRefs.current[index] = node;
													}}
													type="button"
													className={cx(
														"group border-card-muted bg-card flex w-full flex-col rounded-lg border p-4 text-left shadow-sm transition-none focus:outline-hidden focus-visible:ring-4",
														productHighlightClassNames[product.id],
														product.id === activeProductId && productSelectedClassNames[product.id],
													)}
													onClick={() => selectProductOption(product.id)}
													onFocus={() => setActiveProductId(product.id)}
													onKeyDown={(event) => handleProductOptionKeyDown(event, index)}
												>
													<span className="flex w-full min-w-0 items-center justify-between gap-3">
														<span className="flex min-w-0 items-center gap-3">
															<ProductIconBox
																product={product}
																className="size-7 rounded-md [&>svg]:size-5"
															/>
															<span
																className={cx(
																	"truncate text-sm font-medium",
																	isProductSwitcherId(product.id)
																		? productTextColorClassNames[product.id]
																		: "text-amber-600 dark:text-amber-600",
																)}
															>
																{productDisplayName(product)}
															</span>
														</span>
														<ArrowRightIcon
															className={cx(
																"text-muted size-5 shrink-0",
																productArrowClassNames[product.id],
																product.id === activeProductId &&
																	productTextColorClassNames[product.id],
															)}
														/>
													</span>
													<span className="text-strong mt-2 text-base font-medium leading-snug">
														{copy.title}
													</span>
													<span className="text-muted mt-1 text-pretty text-sm leading-relaxed">
														{copy.description}
													</span>
												</button>
											);
										})}
									</div>
								</Dialog.Body>
							</Dialog.Content>
						</Dialog.Root>
					)}
				</Sidebar.Header>

				<Sidebar.Body className="pt-0">
					{mode.type === "utility"
						? navForUtility(mode.utilityId, pathname, setPathname)
						: navForProduct(currentProductId, pathname, navigateProduct)}
				</Sidebar.Body>

				<Sidebar.Footer className="border-t-0 pb-3.5">
					{(mode.type === "utility" ? [] : footerActionItems).map((item) => {
						const active =
							item.id === "vaults"
								? pathname.startsWith("/vaults")
								: item.id === "iam"
									? pathname.startsWith("/iam")
									: pathname.startsWith("/usage");
						return (
							<Sidebar.Item
								key={item.id}
								active={active}
								className="font-normal"
								level="top"
								asChild
							>
								<button type="button" onClick={() => selectFooterPath(item.path)}>
									{item.icon}
									{item.label}
								</button>
							</Sidebar.Item>
						);
					})}
					<DropdownMenu.Root modal={false}>
						<Sidebar.Item className="font-normal [&>svg:last-child]:size-4!" level="top" asChild>
							<DropdownMenu.Trigger className="flex w-full items-center gap-2 data-state-open:bg-neutral-500/15 data-state-open:text-strong">
								<Icon svg={<QuestionIcon />} className="text-muted" />
								Help
								<Icon svg={<CaretDownIcon />} className="text-muted ml-auto size-4 shrink-0" />
							</DropdownMenu.Trigger>
						</Sidebar.Item>
						<DropdownMenu.Content
							align="start"
							className="my-0 w-max min-w-48"
							side="top"
							sideOffset={4}
						>
							<DropdownMenu.Item asChild>
								<button
									type="button"
									className="flex w-full items-center gap-2 whitespace-nowrap"
									onClick={() => selectFooterPath("/early-access")}
								>
									<DoorOpenIcon className="text-muted" />
									Request early access
								</button>
							</DropdownMenu.Item>
							<DropdownMenu.Separator />
							<DropdownMenu.Item asChild>
								<a
									href="https://ngrok.com/docs"
									rel="noopener"
									target="_blank"
									className="flex items-center gap-2 whitespace-nowrap"
								>
									<BookIcon className="text-muted" />
									Documentation
								</a>
							</DropdownMenu.Item>
							<DropdownMenu.Item className="gap-2 whitespace-nowrap">
								<MegaphoneIcon className="text-muted" />
								Give feedback
							</DropdownMenu.Item>
							<DropdownMenu.Item asChild>
								<a
									href="https://ngrok.com/support"
									rel="noopener"
									target="_blank"
									className="flex items-center gap-2 whitespace-nowrap"
								>
									<ChatsIcon className="text-muted" />
									<span className="min-w-0 flex-1">Contact support</span>
									<span
										className="bg-accent-600 size-1.5 shrink-0 rounded-full"
										aria-hidden="true"
									/>
								</a>
							</DropdownMenu.Item>
							<DropdownMenu.Item asChild>
								<a
									href="https://status.ngrok.com/"
									rel="noopener"
									target="_blank"
									className="flex items-center gap-2 whitespace-nowrap"
								>
									<HeartbeatIcon className="text-muted" />
									<span className="min-w-0 flex-1">System status</span>
									<span
										className="bg-success-600 size-1.5 shrink-0 rounded-full"
										aria-hidden="true"
									/>
								</a>
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
					<div className="border-popover-muted my-3 border-t" aria-hidden="true" />
					<DropdownMenu.Root>
						<DropdownMenu.Trigger
							className={cx(
								"text-body hover:text-strong hover:bg-neutral-500/10 flex w-full items-center gap-1.5 rounded-md px-1.5 py-1",
								"data-state-open:bg-neutral-500/15 data-state-open:text-strong",
								"ring-focus-accent focus:outline-hidden focus-visible:ring-4",
							)}
						>
							<AccountSelectorAvatar
								accountId={currentAccount?.id}
								accountName={currentAccount?.name}
							/>
							<span className="flex min-w-0 flex-1 flex-col text-left">
								<span className="text-muted text-xs leading-none">Project</span>
								<span className="text-strong truncate text-xs font-medium">
									{currentProject?.name ?? "Project Orion"}
								</span>
							</span>
							<Sidebar.UserAvatar
								src={demoUser.pictureUrl}
								alt={demoUser.name}
								className="size-6 shrink-0"
							/>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content
							align="start"
							className="my-0 w-max min-w-56"
							side="top"
							sideOffset={4}
						>
							<DropdownMenu.Group>
								<DropdownMenu.Label className="text-muted py-1 text-xs font-medium">
									{currentAccount?.name ?? currentAccountId}
								</DropdownMenu.Label>
								<DropdownMenu.Item asChild>
									<button
										type="button"
										className="text-strong flex w-full items-center gap-2 whitespace-nowrap"
										onClick={() => openAccountSettingsPath("/settings/billing")}
									>
										<CreditCardIcon className="text-muted" />
										Billing
									</button>
								</DropdownMenu.Item>
								<DropdownMenu.Item asChild>
									<button
										type="button"
										className="text-strong flex w-full items-center gap-2 whitespace-nowrap"
										onClick={() => openUtility("account-settings")}
									>
										<Icon svg={<GearIcon />} className="text-muted" />
										Account settings
									</button>
								</DropdownMenu.Item>
								<DropdownMenu.Sub>
									<DropdownMenu.SubTrigger className="text-strong flex items-center gap-2 whitespace-nowrap">
										<Icon svg={<ArrowsClockwiseIcon />} className="text-muted" />
										Switch accounts
									</DropdownMenu.SubTrigger>
									<DropdownMenu.SubContent>
										<Sidebar.SwitchAccountsRadioGroup
											value={currentAccountId}
											onValueChange={switchAccount}
											accounts={demoAccounts.map((account) => ({
												id: account.id,
												name: account.name,
											}))}
										/>
										<DropdownMenu.Separator />
										<DropdownMenu.Item className="gap-2">
											<PlusCircleIcon className="text-muted" />
											New account
										</DropdownMenu.Item>
									</DropdownMenu.SubContent>
								</DropdownMenu.Sub>
							</DropdownMenu.Group>
							<DropdownMenu.Separator />
							<DropdownMenu.Group>
								<DropdownMenu.Label className="text-muted py-1 text-xs font-medium">
									Projects
								</DropdownMenu.Label>
								<DropdownMenu.RadioGroup
									value={currentProject?.id ?? currentProjectId}
									onValueChange={setCurrentProjectId}
								>
									{currentProjects.map((project) => (
										<DropdownMenu.RadioItem
											key={project.id}
											value={project.id}
											className="gap-2 whitespace-nowrap"
										>
											<FolderIcon className="text-muted" />
											{project.name}
										</DropdownMenu.RadioItem>
									))}
								</DropdownMenu.RadioGroup>
								<DropdownMenu.Item className="gap-2">
									<PlusCircleIcon className="text-muted" />
									New project
								</DropdownMenu.Item>
							</DropdownMenu.Group>
							<DropdownMenu.Separator />
							<DropdownMenu.Group>
								<DropdownMenu.Label className="text-muted py-1 text-xs font-medium">
									{demoUser.email}
								</DropdownMenu.Label>
								<DropdownMenu.Item asChild>
									<button
										type="button"
										className="text-strong flex w-full items-center gap-2 whitespace-nowrap"
										onClick={() => {
											setMode({ type: "utility", utilityId: "account-settings" });
											setPathname("/settings/preferences");
										}}
									>
										<Icon svg={<UserCircleIcon />} className="text-muted" />
										User settings
									</button>
								</DropdownMenu.Item>
								<DropdownMenu.Sub>
									<DropdownMenu.SubTrigger className="gap-2">
										<AutoThemeIcon className="text-muted size-5" />
										Theme
									</DropdownMenu.SubTrigger>
									<DropdownMenu.SubContent>
										<DropdownMenu.RadioGroup
											value={currentTheme}
											onValueChange={(value) => {
												if (isTheme(value)) {
													setTheme(value);
												}
											}}
										>
											<DropdownMenu.RadioItem name="theme" value={$theme("system")}>
												<Icon svg={<ThemeIcon theme="system" />} />
												System Preference
											</DropdownMenu.RadioItem>
											<DropdownMenu.RadioItem name="theme" value={$theme("light")}>
												<Icon svg={<ThemeIcon theme="light" />} />
												Light Mode
											</DropdownMenu.RadioItem>
											<DropdownMenu.RadioItem name="theme" value={$theme("dark")}>
												<Icon svg={<ThemeIcon theme="dark" />} />
												Dark Mode
											</DropdownMenu.RadioItem>
											<DropdownMenu.RadioItem name="theme" value={$theme("light-high-contrast")}>
												<Icon svg={<ThemeIcon theme="light-high-contrast" />} />
												Light High Contrast
											</DropdownMenu.RadioItem>
											<DropdownMenu.RadioItem name="theme" value={$theme("dark-high-contrast")}>
												<Icon svg={<ThemeIcon theme="dark-high-contrast" />} />
												Dark High Contrast
											</DropdownMenu.RadioItem>
										</DropdownMenu.RadioGroup>
									</DropdownMenu.SubContent>
								</DropdownMenu.Sub>
							</DropdownMenu.Group>
							<DropdownMenu.Separator />
							<DropdownMenu.Item asChild>
								<button
									type="button"
									className="text-strong flex w-full items-center gap-2 whitespace-nowrap"
								>
									<Icon svg={<SignOutIcon />} className="text-muted" />
									Log out
								</button>
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</Sidebar.Footer>
			</Sidebar.Root>

			<main className="bg-card border-card-muted my-2 mr-2 flex flex-1 items-center justify-center overflow-hidden rounded-xl border shadow-sm">
				<PagePreview
					mode={mode}
					onNavigate={setPathname}
					pathname={pathname}
					product={currentProduct}
					utility={currentUtility}
				/>
			</main>
		</div>
	);
}

function PagePreview({
	mode,
	onNavigate,
	pathname,
	product,
	utility,
}: {
	mode: SidebarMode;
	onNavigate: (path: string) => void;
	pathname: string;
	product: ExampleProduct | undefined;
	utility: ExampleProduct | undefined;
}) {
	if (mode.type === "utility" && mode.utilityId === "account-settings") {
		const page = getAccountSettingsPage(pathname);
		return (
			<DetailPreview
				title={page?.label ?? utility?.label ?? "Settings"}
				pathname={pathname}
				details={page?.details}
			/>
		);
	}
	if (mode.type === "product" && pathname.startsWith("/iam")) {
		return <IamTabsPreview pathname={pathname} onNavigate={onNavigate} />;
	}
	if (mode.type === "product" && pathname.startsWith("/usage")) {
		return <DetailPreview title="Usage & Limits" pathname={pathname} />;
	}
	if (mode.type === "product" && pathname.startsWith("/vaults")) {
		return (
			<DetailPreview
				title="Vaults & Secrets"
				pathname={pathname}
				details={[
					"Store secrets for services, agents, and managed compute.",
					"Control access to vault-backed credentials across products.",
					"Rotate sensitive values without changing application code.",
				]}
			/>
		);
	}
	if (mode.type === "product" && pathname === "/early-access") {
		return (
			<DetailPreview
				title="Early Access"
				pathname={pathname}
				details={[
					"Preview upcoming features before they are generally available.",
					"Join product betas and manage feature invitations for this account.",
					"Share feedback with the ngrok product team.",
				]}
			/>
		);
	}
	if (mode.type === "product" && pathname === "/settings/billing") {
		return <DetailPreview title="Billing" pathname={pathname} />;
	}

	return (
		<DetailPreview title={utility?.label ?? productDisplayName(product)} pathname={pathname} />
	);
}

function IamTabsPreview({
	onNavigate,
	pathname,
}: {
	onNavigate: (path: string) => void;
	pathname: string;
}) {
	const activeTab = iamTabs.find((tab) => tab.path === pathname) ?? iamTabs[0];

	return (
		<div className="flex h-full w-full flex-col overflow-hidden">
			<div className="border-card-muted bg-card border-b">
				<nav aria-label="Breadcrumb" className="flex items-center gap-2 px-6 py-3">
					<span
						aria-current="page"
						className="text-strong inline-flex items-center gap-2 text-base font-medium"
					>
						<UserShieldIcon className="text-muted size-5" />
						Identity & Access
					</span>
				</nav>
			</div>
			<section className="scrollbar flex-1 overflow-y-auto" aria-labelledby="identity-access-title">
				<div className="mx-auto w-full max-w-6xl space-y-4 px-6 pt-4 pb-6 min-[88rem]:pt-12">
					<header>
						<h1 id="identity-access-title" className="text-strong text-2xl font-medium">
							Identity & Access
						</h1>
						<p className="text-body mt-1 max-w-150 text-sm">
							Manage who can access this account and the credentials that allow users, services, and
							agents to authenticate with ngrok.
						</p>
					</header>
					<Tabs.Root
						orientation="horizontal"
						value={activeTab.path}
						onValueChange={onNavigate}
						className="gap-0"
					>
						<div className="border-card-muted border-b">
							<Tabs.List>
								{iamTabs.map((tab) => (
									<Tabs.Trigger key={tab.path} value={tab.path}>
										{"icon" in tab ? <Icon svg={tab.icon} /> : null}
										{tab.label}
										{"badge" in tab ? <Tabs.Badge>{tab.badge}</Tabs.Badge> : null}
									</Tabs.Trigger>
								))}
							</Tabs.List>
						</div>
						{iamTabs.map((tab) => (
							<Tabs.Content key={tab.path} value={tab.path}>
								<IamTabTable tabPath={tab.path} />
							</Tabs.Content>
						))}
					</Tabs.Root>
				</div>
			</section>
		</div>
	);
}

function IamTabTable({ tabPath }: { tabPath: IamTabPath }) {
	const table = iamTableContent[tabPath];
	const isTeamMembersTab = tabPath === "/iam/team-members";
	const isPendingInvitationsTab = tabPath === "/iam/pending-invitations";

	return (
		<div className="mt-4 space-y-4">
			<div className="flex items-center justify-between gap-3">
				<div className="flex min-w-0 flex-1 items-center gap-3">
					<Input
						aria-label={table.searchPlaceholder}
						className="max-w-xs"
						placeholder={table.searchPlaceholder}
					>
						<Icon svg={<MagnifyingGlassIcon />} className="text-muted" />
						<InputCapture />
					</Input>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					{isTeamMembersTab ? (
						<Button
							type="button"
							appearance="outlined"
							priority="neutral"
							icon={<DownloadSimpleIcon />}
						>
							Export CSV
						</Button>
					) : null}
					<Button type="button" appearance="filled" priority="neutral" icon={<PlusIcon />}>
						{isTeamMembersTab || isPendingInvitationsTab ? "Invite Team Member" : table.newLabel}
					</Button>
				</div>
			</div>
			<Table.Root>
				<Table.Element>
					<Table.Head>
						<Table.Row>
							{table.columns.map((column) => (
								<Table.Header key={column} className="whitespace-nowrap">
									{column}
								</Table.Header>
							))}
						</Table.Row>
					</Table.Head>
					<Table.Body>
						{table.rows.map((row, rowIndex) => (
							<Table.Row
								// oxlint-disable-next-line react/no-array-index-key - static prototype rows have no persisted IDs
								key={rowIndex}
							>
								{row.map((cell, cellIndex) => (
									<Table.Cell
										// oxlint-disable-next-line react/no-array-index-key - static prototype cells have no persisted IDs
										key={cellIndex}
										className="text-xs whitespace-nowrap"
									>
										{cell}
									</Table.Cell>
								))}
							</Table.Row>
						))}
					</Table.Body>
				</Table.Element>
			</Table.Root>
			{isTeamMembersTab ? (
				<div className="text-muted flex items-center justify-between text-xs">
					<span>Showing 1-3 of 24 members</span>
					<div className="flex items-center gap-2">
						<Button type="button" appearance="outlined" priority="neutral">
							Previous
						</Button>
						<span>Page 1 of 8</span>
						<Button type="button" appearance="outlined" priority="neutral">
							Next
						</Button>
					</div>
				</div>
			) : null}
		</div>
	);
}

function StatusDot({ label, tone }: { label: string; tone: "muted" | "success" }) {
	return (
		<span className="inline-flex items-center gap-2">
			<span
				className={cx(
					"size-2 rounded-full",
					tone === "success" ? "bg-success-600" : "bg-neutral-400",
				)}
				aria-hidden="true"
			/>
			{label}
		</span>
	);
}

function DetailPreview({
	details,
	pathname,
	title,
}: {
	details?: ReadonlyArray<string>;
	pathname: string;
	title: string;
}) {
	return (
		<div className="w-full max-w-sm px-6">
			<div className="text-strong text-lg font-medium">{title}</div>
			<div className="text-muted mt-1 text-sm">{pathname}</div>
			{details ? (
				<ul className="mt-4 space-y-2 text-sm text-body">
					{details.map((detail) => (
						<li key={detail}>{detail}</li>
					))}
				</ul>
			) : null}
		</div>
	);
}
