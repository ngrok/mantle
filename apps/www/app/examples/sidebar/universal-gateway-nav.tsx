import { Sidebar } from "@ngrok/mantle/sidebar";
import { BankIcon } from "@phosphor-icons/react/Bank";
import { CertificateIcon } from "@phosphor-icons/react/Certificate";
import { GlobeHemisphereWestIcon } from "@phosphor-icons/react/GlobeHemisphereWest";
import { HashIcon } from "@phosphor-icons/react/Hash";
import { IdentificationCardIcon } from "@phosphor-icons/react/IdentificationCard";
import { ListMagnifyingGlassIcon } from "@phosphor-icons/react/ListMagnifyingGlass";
import { MapPinIcon } from "@phosphor-icons/react/MapPin";
import { GraphIcon } from "@phosphor-icons/react/Graph";
import { SteeringWheelIcon } from "@phosphor-icons/react/SteeringWheel";
import { TerminalWindowIcon } from "@phosphor-icons/react/TerminalWindow";
import { VaultIcon } from "@phosphor-icons/react/Vault";
import { WavesIcon } from "@phosphor-icons/react/Waves";
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
			{ label: "Log Export", icon: <WavesIcon />, path: "/event-subscriptions" },
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
		items: [{ label: "Operators", icon: <SteeringWheelIcon />, path: "/kubernetes-operators" }],
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
		<Sidebar.Item active={pathname === item.path} level="top" asChild>
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
