import { AppLayout } from "@ngrok/mantle/app-layout";
import { Breadcrumb } from "@ngrok/mantle/breadcrumb";
import { Button } from "@ngrok/mantle/button";
import { DropdownMenu } from "@ngrok/mantle/dropdown-menu";
import { Sidebar, useSidebar } from "@ngrok/mantle/sidebar";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/ArrowsClockwise";
import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import { CertificateIcon } from "@phosphor-icons/react/Certificate";
import { GearIcon } from "@phosphor-icons/react/Gear";
import { GlobeHemisphereWestIcon } from "@phosphor-icons/react/GlobeHemisphereWest";
import { GraphIcon } from "@phosphor-icons/react/Graph";
import { HashIcon } from "@phosphor-icons/react/Hash";
import { ListMagnifyingGlassIcon } from "@phosphor-icons/react/ListMagnifyingGlass";
import { MapPinIcon } from "@phosphor-icons/react/MapPin";
import { RobotIcon } from "@phosphor-icons/react/Robot";
import { SignOutIcon } from "@phosphor-icons/react/SignOut";
import { TerminalWindowIcon } from "@phosphor-icons/react/TerminalWindow";
import { UserCircleIcon } from "@phosphor-icons/react/UserCircle";
import { VaultIcon } from "@phosphor-icons/react/Vault";
import { WarningCircleIcon } from "@phosphor-icons/react/WarningCircle";
import type { ReactNode } from "react";
import { useState } from "react";

type DemoNavItem = {
	label: string;
	icon: ReactNode;
	path: string;
};

type DemoNavSection = {
	title: string | undefined;
	items: ReadonlyArray<DemoNavItem>;
};

const demoNavSections: ReadonlyArray<DemoNavSection> = [
	{
		title: undefined,
		items: [
			{ label: "Endpoints", icon: <GraphIcon />, path: "/endpoints" },
			{ label: "Agents", icon: <TerminalWindowIcon />, path: "/agents" },
		],
	},
	{
		title: "Traffic",
		items: [
			{
				label: "Traffic Inspector",
				icon: <ListMagnifyingGlassIcon />,
				path: "/traffic-inspector",
			},
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
		],
	},
];

const demoProducts = [
	{ id: "universal-gateway", label: "Universal Gateway", icon: <GlobeHemisphereWestIcon /> },
	{ id: "ai-gateway", label: "AI Gateway", icon: <RobotIcon /> },
	{ id: "localhost", label: "localhost", icon: <TerminalWindowIcon /> },
] as const;

const demoAccounts = [
	{ id: "acc_acme", name: "Acme Corp" },
	{ id: "acc_skunkworks", name: "Skunkworks" },
	{ id: "acc_atlas", name: "Atlas Industries" },
] as const;

/**
 * The per-product navigation for the app-shell demo. Lives inside
 * `Sidebar.Root`, so it can use `useSidebar` to close the mobile sheet when a
 * nav item "navigates" — the same shape a real app uses with its router.
 */
function DemoNav({
	onNavigate,
	pathname,
}: {
	onNavigate: (path: string) => void;
	pathname: string;
}) {
	const { setOpenMobile } = useSidebar();

	function navigate(path: string) {
		onNavigate(path);
		setOpenMobile(false);
	}

	return (
		<>
			{demoNavSections.map((section) => (
				<Sidebar.Group key={section.title ?? "top-level"}>
					{section.title != null && <Sidebar.GroupLabel>{section.title}</Sidebar.GroupLabel>}
					<Sidebar.List>
						{section.items.map((item) => (
							<Sidebar.Item key={item.path}>
								<Sidebar.ItemButton asChild current={pathname === item.path}>
									<a
										href={item.path}
										onClick={(event) => {
											event.preventDefault();
											navigate(item.path);
										}}
									>
										{item.icon}
										{item.label}
									</a>
								</Sidebar.ItemButton>
							</Sidebar.Item>
						))}
					</Sidebar.List>
				</Sidebar.Group>
			))}
		</>
	);
}

/**
 * The canonical Sidebar + AppLayout composition, shared by both docs pages: a
 * decoupled app shell with a collapsible sidebar, a header-mounted trigger, a
 * toggleable full-window notice strip, and a content card that scrolls
 * internally. The two components never reference each other — `Sidebar.Root`
 * simply wraps the shell so `Sidebar.Trigger` works from `AppLayout.Header`.
 * Resize the window below `lg` to see the mobile sheet.
 */
export function AppShellDemo() {
	const [pathname, setPathname] = useState("/endpoints");
	const [productId, setProductId] = useState<string>(demoProducts[0].id);
	const [accountId, setAccountId] = useState<string>(demoAccounts[0].id);
	const [showNotice, setShowNotice] = useState(false);

	const product = demoProducts.find((candidate) => candidate.id === productId) ?? demoProducts[0];
	const account = demoAccounts.find((candidate) => candidate.id === accountId) ?? demoAccounts[0];
	const currentItem = demoNavSections
		.flatMap((section) => section.items)
		.find((item) => item.path === pathname);

	return (
		<div className="h-full min-h-0 w-full">
			<Sidebar.Root>
				<AppLayout.Root className="rounded-lg">
					<AppLayout.Notice>
						{showNotice && (
							<div className="text-on-filled flex items-center gap-2 bg-red-600 px-4 py-1 text-xs">
								<WarningCircleIcon weight="fill" className="shrink-0" />
								You are impersonating jane@example.com in read-only mode.
							</div>
						)}
					</AppLayout.Notice>
					<AppLayout.Body>
						<Sidebar.Nav aria-label="Main">
							<Sidebar.Header>
								<DropdownMenu.Root>
									<DropdownMenu.Trigger asChild>
										<Sidebar.SwitcherButton>
											<span className="text-muted [&>svg]:size-5 [&>svg]:shrink-0">
												{product.icon}
											</span>
											<span className="text-strong min-w-0 flex-1 truncate text-base">
												{product.label}
											</span>
											<CaretDownIcon className="text-muted size-4 shrink-0" />
										</Sidebar.SwitcherButton>
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="start">
										<DropdownMenu.RadioGroup value={productId} onValueChange={setProductId}>
											{demoProducts.map((candidate) => (
												<DropdownMenu.RadioItem
													key={candidate.id}
													value={candidate.id}
													className="gap-2"
												>
													{candidate.icon}
													{candidate.label}
												</DropdownMenu.RadioItem>
											))}
										</DropdownMenu.RadioGroup>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</Sidebar.Header>

							<Sidebar.Body>
								<DemoNav pathname={pathname} onNavigate={setPathname} />
							</Sidebar.Body>

							<Sidebar.Footer>
								<Sidebar.ItemButton asChild current={pathname === "/settings"}>
									<a
										href="/settings"
										onClick={(event) => {
											event.preventDefault();
											setPathname("/settings");
										}}
									>
										<GearIcon />
										Account settings
									</a>
								</Sidebar.ItemButton>
								<Sidebar.Separator />
								<DropdownMenu.Root>
									<DropdownMenu.Trigger asChild>
										<Sidebar.SwitcherButton>
											<Sidebar.AccountAvatar accountId={account.id} accountName={account.name} />
											<span className="text-strong min-w-0 flex-1 truncate text-xs font-medium">
												{account.name}
											</span>
											<Sidebar.UserAvatar alt="Jane Doe" />
										</Sidebar.SwitcherButton>
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="start" side="top" className="min-w-56">
										<DropdownMenu.Group>
											<DropdownMenu.Label className="text-muted py-1 text-xs font-medium">
												{account.name}
											</DropdownMenu.Label>
											<DropdownMenu.Sub>
												<DropdownMenu.SubTrigger className="gap-2">
													<ArrowsClockwiseIcon className="text-muted" />
													Switch accounts
												</DropdownMenu.SubTrigger>
												<DropdownMenu.SubContent>
													<Sidebar.SwitchAccountsRadioGroup
														accounts={demoAccounts}
														value={accountId}
														onValueChange={setAccountId}
													/>
												</DropdownMenu.SubContent>
											</DropdownMenu.Sub>
										</DropdownMenu.Group>
										<DropdownMenu.Separator />
										<DropdownMenu.Group>
											<DropdownMenu.Label className="text-muted py-1 text-xs font-medium">
												jane@example.com
											</DropdownMenu.Label>
											<DropdownMenu.Item className="gap-2">
												<UserCircleIcon className="text-muted" />
												User settings
											</DropdownMenu.Item>
										</DropdownMenu.Group>
										<DropdownMenu.Separator />
										<DropdownMenu.Item className="gap-2">
											<SignOutIcon className="text-muted" />
											Log out
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</Sidebar.Footer>
						</Sidebar.Nav>

						<AppLayout.Inset>
							<AppLayout.Content>
								<AppLayout.Header>
									<Sidebar.Trigger />
									<Breadcrumb.Root>
										<Breadcrumb.List>
											<Breadcrumb.Item>
												<Breadcrumb.Link href="/" onClick={(event) => event.preventDefault()}>
													{product.label}
												</Breadcrumb.Link>
											</Breadcrumb.Item>
											<Breadcrumb.Separator />
											<Breadcrumb.Item>
												<Breadcrumb.Page>
													{currentItem?.label ?? "Account settings"}
												</Breadcrumb.Page>
											</Breadcrumb.Item>
										</Breadcrumb.List>
									</Breadcrumb.Root>
									<Button
										type="button"
										appearance="outlined"
										intent="neutral"
										className="ml-auto"
										size="sm"
										onClick={() => setShowNotice((current) => !current)}
									>
										Toggle notice
									</Button>
								</AppLayout.Header>
								<div className="space-y-4 p-6">
									{Array.from({ length: 12 }, (_, index) => (
										<div key={index} className="border-card-muted rounded-lg border p-4">
											<p className="text-strong text-sm font-medium">
												{currentItem?.label ?? "Account settings"} row {index + 1}
											</p>
											<p className="text-muted text-sm">
												The content card is the only scroll container — the page never scrolls.
											</p>
										</div>
									))}
								</div>
							</AppLayout.Content>
						</AppLayout.Inset>
					</AppLayout.Body>
				</AppLayout.Root>
			</Sidebar.Root>
		</div>
	);
}
