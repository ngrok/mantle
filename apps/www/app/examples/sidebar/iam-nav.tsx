import { Sidebar } from "@ngrok/mantle/sidebar";
import { KeyIcon } from "@phosphor-icons/react/Key";
import { RobotIcon } from "@phosphor-icons/react/Robot";
import { UsersThreeIcon } from "@phosphor-icons/react/UsersThree";
import type { ReactNode } from "react";

type IamNavItem = {
	label: string;
	icon: ReactNode;
	path: string;
	details?: ReadonlyArray<string>;
};

const items: ReadonlyArray<IamNavItem> = [
	{ label: "Team Members", icon: <UsersThreeIcon />, path: "/iam/team-members" },
	{ label: "Service Users", icon: <RobotIcon />, path: "/iam/service-users" },
	{ label: "Access Tokens", icon: <KeyIcon />, path: "/iam/access-tokens" },
	{
		label: "Authtokens",
		icon: <KeyIcon />,
		path: "/iam/authtokens",
		details: ["Until deprecated"],
	},
	{
		label: "API Keys",
		icon: <KeyIcon />,
		path: "/iam/api-keys",
		details: ["Until deprecated"],
	},
];

type Props = {
	pathname: string;
	onNavigate: (path: string) => void;
};

function getIamPage(pathname: string) {
	return items.find((item) => item.path === pathname);
}

/**
 * IAM navigation for account-level identity and access management.
 */
export function IamNav({ onNavigate, pathname }: Props) {
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

export { getIamPage };
