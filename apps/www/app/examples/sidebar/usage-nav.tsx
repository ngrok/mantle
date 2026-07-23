import { Sidebar } from "@ngrok/mantle/sidebar";
import { ChartBarIcon } from "@phosphor-icons/react/ChartBar";
import { SpeedometerIcon } from "@phosphor-icons/react/Speedometer";
import { TrendUpIcon } from "@phosphor-icons/react/TrendUp";

const items: ReadonlyArray<{ label: string; icon: React.ReactNode; path: string }> = [
	{ label: "Overview", icon: <SpeedometerIcon />, path: "/usage" },
	{ label: "Usage Breakdown", icon: <ChartBarIcon />, path: "/usage/breakdown" },
	{ label: "Limits", icon: <TrendUpIcon />, path: "/usage/limits" },
];

type Props = {
	pathname: string;
	onNavigate: (path: string) => void;
};

/**
 * Placeholder navigation for the Usage rail section. Real items will be
 * filled in by the platform team — this exists to demonstrate how usage
 * lives in the rail alongside products and settings.
 */
export function UsageNav({ onNavigate, pathname }: Props) {
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
					<button type="button" onClick={() => onNavigate(item.path)}>
						{item.icon}
						{item.label}
					</button>
				</Sidebar.Item>
			))}
		</Sidebar.Group>
	);
}
