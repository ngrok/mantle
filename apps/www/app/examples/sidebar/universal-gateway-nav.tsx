import { Sidebar } from "@ngrok/mantle/sidebar";
import { BankIcon } from "@phosphor-icons/react/Bank";
import { CertificateIcon } from "@phosphor-icons/react/Certificate";
import { CloudArrowUpIcon } from "@phosphor-icons/react/CloudArrowUp";
import { GlobeHemisphereWestIcon } from "@phosphor-icons/react/GlobeHemisphereWest";
import { HashIcon } from "@phosphor-icons/react/Hash";
import { IdentificationCardIcon } from "@phosphor-icons/react/IdentificationCard";
import { ListMagnifyingGlassIcon } from "@phosphor-icons/react/ListMagnifyingGlass";
import { MapPinIcon } from "@phosphor-icons/react/MapPin";
import { GraphIcon } from "@phosphor-icons/react/Graph";
import { TerminalWindowIcon } from "@phosphor-icons/react/TerminalWindow";
import { VaultIcon } from "@phosphor-icons/react/Vault";
import type { ReactNode } from "react";

type NavItem = {
	label: string;
	icon: ReactNode;
	path: string;
};

type NavSection = {
	title: string;
	items: ReadonlyArray<NavItem>;
};

const topLevelItems: ReadonlyArray<NavItem> = [
	{ label: "Endpoints", icon: <GraphIcon />, path: "/endpoints" },
	{ label: "Agents", icon: <TerminalWindowIcon />, path: "/agents" },
];

const sections: ReadonlyArray<NavSection> = [
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
			{ label: "Vaults & Secrets", icon: <VaultIcon />, path: "/vaults" },
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

type Props = {
	pathname: string;
	onNavigate: (path: string) => void;
};

/**
 * Per-product navigation for the Universal Gateway example. Mirrors the
 * structure currently shipped in the dashboard's `PrimaryNav`. Active state is
 * derived from the `pathname` prop so the consumer's router (here, a local
 * `useState`) controls highlighting.
 */
export function UniversalGatewayNav({ onNavigate, pathname }: Props) {
	return (
		<>
			<Sidebar.Group>
				{topLevelItems.map((item) => (
					<NavLinkItem key={item.path} item={item} pathname={pathname} onNavigate={onNavigate} />
				))}
			</Sidebar.Group>
			{sections.map((section) => (
				<Sidebar.Section key={section.title}>
					<Sidebar.SectionTitle className="text-muted hover:bg-transparent px-2 py-1 text-xs font-medium">
						{section.title}
					</Sidebar.SectionTitle>
					<Sidebar.Group>
						{section.items.map((item) => (
							<NavLinkItem
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

type NavLinkItemProps = {
	item: NavItem;
	pathname: string;
	onNavigate: (path: string) => void;
};

function NavLinkItem({ item, onNavigate, pathname }: NavLinkItemProps) {
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
