import { BrowserOnly } from "@ngrok/mantle/browser-only";
import { cx } from "@ngrok/mantle/cx";
import { DropdownMenu } from "@ngrok/mantle/dropdown-menu";
import { Icon } from "@ngrok/mantle/icon";
import { AutoThemeIcon, ThemeIcon } from "@ngrok/mantle/icons";
import { Sidebar } from "@ngrok/mantle/sidebar";
import { $theme, isTheme, useTheme } from "@ngrok/mantle/theme";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/ArrowsClockwise";
import { ArrowsLeftRightIcon } from "@phosphor-icons/react/ArrowsLeftRight";
import { BookIcon } from "@phosphor-icons/react/Book";
import { CreditCardIcon } from "@phosphor-icons/react/CreditCard";
import { DoorOpenIcon } from "@phosphor-icons/react/DoorOpen";
import { GearIcon } from "@phosphor-icons/react/Gear";
import { GlobeIcon } from "@phosphor-icons/react/Globe";
import { ListMagnifyingGlassIcon } from "@phosphor-icons/react/ListMagnifyingGlass";
import { MegaphoneIcon } from "@phosphor-icons/react/Megaphone";
import { PlusCircleIcon } from "@phosphor-icons/react/PlusCircle";
import { QuestionIcon } from "@phosphor-icons/react/Question";
import { RocketIcon } from "@phosphor-icons/react/Rocket";
import { SignOutIcon } from "@phosphor-icons/react/SignOut";
import { UserCircleIcon } from "@phosphor-icons/react/UserCircle";
import { UsersThreeIcon } from "@phosphor-icons/react/UsersThree";
import type { ReactNode } from "react";
import { useState } from "react";

import { demoAccounts, demoUser } from "./demo-data";

type NavSection = {
	title: string;
	icon: ReactNode;
	items: ReadonlyArray<{ label: string; path: string }>;
};

const sections: ReadonlyArray<NavSection> = [
	{
		title: "Getting Started",
		icon: <RocketIcon />,
		items: [
			{ label: "Setup & Installation", path: "/get-started/setup" },
			{ label: "Your Authtoken", path: "/get-started/your-authtoken" },
		],
	},
	{
		title: "Universal Gateway",
		icon: <GlobeIcon />,
		items: [
			{ label: "Endpoints", path: "/endpoints" },
			{ label: "AI Gateways", path: "/ai-gateways" },
			{ label: "Domains", path: "/domains" },
			{ label: "TCP Addresses", path: "/tcp-addresses" },
			{ label: "TLS Certificates", path: "/tls-certs" },
			{ label: "Kubernetes Operators", path: "/kubernetes-operators" },
			{ label: "Vaults & Secrets", path: "/vaults" },
			{ label: "IP Policies", path: "/ip-policies" },
			{ label: "TLS Cert Authorities", path: "/tls-cert-authorities" },
			{ label: "Traffic Identities", path: "/traffic-identities" },
		],
	},
	{
		title: "Traffic Observability",
		icon: <ListMagnifyingGlassIcon />,
		items: [
			{ label: "Traffic Inspector", path: "/observability/traffic-inspector" },
			{ label: "Log Exporting", path: "/event-subscriptions" },
		],
	},
	{
		title: "Secure Tunnels",
		icon: <ArrowsLeftRightIcon />,
		items: [
			{ label: "Agents", path: "/agents" },
			{ label: "Connect URLs", path: "/ingress" },
		],
	},
	{
		title: "Identity & Access",
		icon: <UsersThreeIcon />,
		items: [
			{ label: "Team Members", path: "/team-members" },
			{ label: "Service Users", path: "/service-users" },
			{ label: "Authtokens", path: "/authtokens" },
			{ label: "API Keys", path: "/api-keys" },
			{ label: "SSH Public Keys", path: "/ssh-keys" },
			{ label: "IP Restrictions", path: "/ip-restrictions" },
		],
	},
	{
		title: "Settings",
		icon: <GearIcon />,
		items: [
			{ label: "Account", path: "/settings" },
			{ label: "Google Apps Sign-on", path: "/google-apps-sign-on" },
		],
	},
];

const initialPath = "/endpoints";

type DashboardDemoProps = {
	fullScreen?: boolean;
};

/**
 * Mirrors the authenticated dashboard app at `frontend/apps/dashboard`:
 * a single-column sidebar with a custom account switcher in the header
 * (avatar + account name + theme hint + user icon) whose dropdown unifies
 * account-level and user-level actions. Styled in the linear layout —
 * sidebar flush to the background, content pane as a floating rounded card.
 */
export function DashboardDemo({ fullScreen = false }: DashboardDemoProps) {
	const [pathname, setPathname] = useState(initialPath);
	const [currentAccountId, setCurrentAccountId] = useState(demoAccounts[0]?.id ?? "");
	const [currentTheme, setTheme] = useTheme();

	const currentAccount = demoAccounts.find((account) => account.id === currentAccountId);

	return (
		<div
			className={cx(
				"bg-base border-base-muted flex w-full overflow-hidden border",
				fullScreen ? "fixed inset-0 z-50 rounded-none border-0" : "h-[600px] rounded-md",
			)}
		>
			<Sidebar.Root aria-label="Primary navigation" className="border-r-0 bg-transparent">
				<Sidebar.Header className="border-b-0">
					<DropdownMenu.Root>
						<DropdownMenu.Trigger
							className={cx(
								"text-strong flex w-full items-center justify-between gap-1.5 rounded-lg px-1.5 py-1.5",
								"hover:bg-popover-hover",
								"ring-focus-accent focus:outline-hidden focus-visible:ring-4",
							)}
						>
							<div className="flex min-w-0 flex-1 items-center gap-1.5">
								<Sidebar.AccountAvatar
									className="shrink-0"
									accountId={currentAccount?.id}
									accountName={currentAccount?.name}
								/>
								<span className="min-w-0 truncate text-sm font-medium">
									{currentAccount?.name ?? currentAccount?.id}
								</span>
							</div>
							<div className="flex shrink-0 items-center gap-1">
								<BrowserOnly fallback={<div className="size-4" />}>
									{() => <AutoThemeIcon className="size-4" />}
								</BrowserOnly>
								<Sidebar.UserAvatar alt={demoUser.name} />
							</div>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content className="ml-2 w-[calc(var(--radix-dropdown-menu-trigger-width)+1.5rem)]">
							<DropdownMenu.Group>
								<DropdownMenu.Label className="text-muted py-1 text-xs font-medium">
									Account
								</DropdownMenu.Label>
								<DropdownMenu.Item asChild>
									<button type="button" className="text-strong flex w-full items-center gap-2">
										<Icon svg={<GearIcon />} className="text-muted" />
										Account settings
									</button>
								</DropdownMenu.Item>
								<DropdownMenu.Item asChild>
									<button type="button" className="text-strong flex w-full items-center gap-2">
										<Icon svg={<CreditCardIcon />} className="text-muted" />
										Manage subscription
									</button>
								</DropdownMenu.Item>
								<DropdownMenu.Sub>
									<DropdownMenu.SubTrigger className="text-strong flex items-center gap-2">
										<Icon svg={<ArrowsClockwiseIcon />} className="text-muted" />
										Switch accounts
									</DropdownMenu.SubTrigger>
									<DropdownMenu.SubContent>
										<Sidebar.SwitchAccountsRadioGroup
											value={currentAccountId}
											onValueChange={setCurrentAccountId}
											accounts={demoAccounts.map((account) => ({
												id: account.id,
												name: account.name,
											}))}
										/>
										<DropdownMenu.Item asChild>
											<button type="button" className="flex w-full items-center gap-1">
												<Icon svg={<PlusCircleIcon />} className="text-muted" />
												Create Account
											</button>
										</DropdownMenu.Item>
									</DropdownMenu.SubContent>
								</DropdownMenu.Sub>
							</DropdownMenu.Group>
							<DropdownMenu.Separator />
							<DropdownMenu.Group>
								<DropdownMenu.Label className="text-muted py-1 text-xs font-medium">
									{demoUser.email}
								</DropdownMenu.Label>
								<DropdownMenu.Item asChild>
									<button type="button" className="text-strong flex w-full items-center gap-2">
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
								<button type="button" className="text-strong flex w-full items-center gap-2">
									<Icon svg={<SignOutIcon />} className="text-muted" />
									Log out
								</button>
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</Sidebar.Header>

				<Sidebar.Body className="pt-0">
					{sections.map((section) => (
						<Sidebar.Section key={section.title}>
							<Sidebar.SectionTitle asChild>
								<button
									type="button"
									onClick={() => {
										const firstPath = section.items[0]?.path;
										if (firstPath) {
											setPathname(firstPath);
										}
									}}
								>
									{section.icon}
									{section.title}
								</button>
							</Sidebar.SectionTitle>
							<Sidebar.Group>
								{section.items.map((item) => (
									<Sidebar.Item key={item.path} active={pathname === item.path} asChild>
										<button type="button" onClick={() => setPathname(item.path)}>
											{item.label}
										</button>
									</Sidebar.Item>
								))}
							</Sidebar.Group>
						</Sidebar.Section>
					))}
				</Sidebar.Body>

				<Sidebar.Footer>
					<Sidebar.Item level="top" asChild>
						<button type="button" className="flex w-full items-center gap-2">
							<CreditCardIcon />
							Billing & Usage
						</button>
					</Sidebar.Item>
					<Sidebar.Item level="top" asChild>
						<button type="button" className="flex w-full items-center gap-2">
							<DoorOpenIcon />
							Early Access
						</button>
					</Sidebar.Item>
					<Sidebar.Item level="top" asChild>
						<button type="button" className="flex w-full items-center gap-2">
							<MegaphoneIcon />
							Give feedback
						</button>
					</Sidebar.Item>
					<Sidebar.Item level="top" asChild>
						<a
							href="https://ngrok.com/support"
							rel="noopener"
							target="_blank"
							className="flex items-center gap-2"
						>
							<QuestionIcon />
							Support
						</a>
					</Sidebar.Item>
					<Sidebar.Item level="top" asChild>
						<a
							href="https://ngrok.com/docs"
							rel="noopener"
							target="_blank"
							className="flex items-center gap-2"
						>
							<BookIcon />
							Documentation
						</a>
					</Sidebar.Item>
				</Sidebar.Footer>
			</Sidebar.Root>

			<main className="bg-card border-card-muted my-2 mr-2 flex flex-1 items-center justify-center rounded-xl border shadow-sm">
				<div className="text-muted text-center">
					<div className="text-sm">{pathname}</div>
				</div>
			</main>
		</div>
	);
}
