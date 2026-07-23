import { Sidebar } from "@ngrok/mantle/sidebar";
import { CpuIcon } from "@phosphor-icons/react/Cpu";
import { GlobeHemisphereWestIcon } from "@phosphor-icons/react/GlobeHemisphereWest";
import { SquaresFourIcon } from "@phosphor-icons/react/SquaresFour";
import { VaultIcon } from "@phosphor-icons/react/Vault";
import type { ReactNode } from "react";

const items: ReadonlyArray<{ label: string; icon: ReactNode; path: string }> = [
	{ label: "Apps", icon: <SquaresFourIcon />, path: "/ship/apps" },
	{ label: "Compute Pools", icon: <CpuIcon />, path: "/ship/compute-pools" },
	{ label: "Vaults & Secrets", icon: <VaultIcon />, path: "/ship/vaults" },
	{ label: "Domains", icon: <GlobeHemisphereWestIcon />, path: "/ship/domains" },
];

type Props = {
	pathname: string;
	onNavigate: (path: string) => void;
};

/**
 * Per-product navigation for the Ship example.
 */
export function CodenameNav({ onNavigate, pathname }: Props) {
	return (
		<Sidebar.Group>
			{items.map((item) => (
				<Sidebar.Item
					key={item.path}
					active={pathname === item.path}
					className="font-normal"
					level="top"
					asChild
				>
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
			))}
		</Sidebar.Group>
	);
}
