import { Sidebar } from "@ngrok/mantle/sidebar";
import { ChartLineUpIcon } from "@phosphor-icons/react/ChartLineUp";
import { CreditCardIcon } from "@phosphor-icons/react/CreditCard";
import { GearIcon } from "@phosphor-icons/react/Gear";
import { KeyIcon } from "@phosphor-icons/react/Key";
import { ListMagnifyingGlassIcon } from "@phosphor-icons/react/ListMagnifyingGlass";
import { StackIcon } from "@phosphor-icons/react/Stack";

const items: ReadonlyArray<{ label: string; icon: React.ReactNode; path: string }> = [
	{ label: "Overview", icon: <ChartLineUpIcon />, path: "/ai-gateway/overview" },
	{ label: "Access Keys", icon: <KeyIcon />, path: "/ai-gateway/keys" },
	{ label: "Providers", icon: <StackIcon />, path: "/ai-gateway/providers" },
	{ label: "Usage", icon: <ListMagnifyingGlassIcon />, path: "/ai-gateway/usage" },
	{ label: "Credits", icon: <CreditCardIcon />, path: "/ai-gateway/credits" },
	{ label: "Settings", icon: <GearIcon />, path: "/ai-gateway/settings" },
];

type Props = {
	pathname: string;
	onNavigate: (path: string) => void;
};

/**
 * Per-product navigation for the AI Gateway example. Today's AI Gateway dashboard
 * uses tabs; this example demonstrates how those tabs translate into top-level
 * sidebar items.
 */
export function AiGatewayNav({ onNavigate, pathname }: Props) {
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
