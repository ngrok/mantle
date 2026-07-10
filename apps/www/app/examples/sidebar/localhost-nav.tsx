import { Sidebar } from "@ngrok/mantle/sidebar";
import { GlobeHemisphereWestIcon } from "@phosphor-icons/react/GlobeHemisphereWest";
import { LinkIcon } from "@phosphor-icons/react/Link";
import { ListMagnifyingGlassIcon } from "@phosphor-icons/react/ListMagnifyingGlass";

const items: ReadonlyArray<{ label: string; icon: React.ReactNode; path: string }> = [
	{ label: "URLs", icon: <LinkIcon />, path: "/localhost/urls" },
	{ label: "Domains", icon: <GlobeHemisphereWestIcon />, path: "/localhost/domains" },
	{
		label: "Traffic Inspector",
		icon: <ListMagnifyingGlassIcon />,
		path: "/localhost/traffic-inspector",
	},
];

type Props = {
	pathname: string;
	onNavigate: (path: string) => void;
};

/**
 * Placeholder navigation for the Localhost product. Real nav items will be
 * filled in by the product team — this exists to demonstrate the multi-product
 * pattern without inventing specifics.
 */
export function LocalhostNav({ onNavigate, pathname }: Props) {
	return (
		<Sidebar.Group>
			{items.map((item) => (
				<Sidebar.Item key={item.path} active={pathname === item.path} level="top" asChild>
					<button type="button" onClick={() => onNavigate(item.path)}>
						{item.icon}
						{item.label}
					</button>
				</Sidebar.Item>
			))}
		</Sidebar.Group>
	);
}
