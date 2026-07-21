import { AppLayout } from "@ngrok/mantle/app-layout";
import { Breadcrumb } from "@ngrok/mantle/breadcrumb";
import { Button } from "@ngrok/mantle/button";
import { cx } from "@ngrok/mantle/cx";
import { DropdownMenu } from "@ngrok/mantle/dropdown-menu";
import { Main } from "@ngrok/mantle/main";
import { Sidebar, useSidebar } from "@ngrok/mantle/sidebar";
import { SkipToMainLink } from "@ngrok/mantle/skip-to-main-link";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/ArrowsClockwise";
import { BookOpenIcon } from "@phosphor-icons/react/BookOpen";
import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import { CertificateIcon } from "@phosphor-icons/react/Certificate";
import { GearIcon } from "@phosphor-icons/react/Gear";
import { GlobeIcon } from "@phosphor-icons/react/Globe";
import { GlobeHemisphereWestIcon } from "@phosphor-icons/react/GlobeHemisphereWest";
import { GraphIcon } from "@phosphor-icons/react/Graph";
import { HashIcon } from "@phosphor-icons/react/Hash";
import { KeyboardIcon } from "@phosphor-icons/react/Keyboard";
import { LifebuoyIcon } from "@phosphor-icons/react/Lifebuoy";
import { ListMagnifyingGlassIcon } from "@phosphor-icons/react/ListMagnifyingGlass";
import { MapPinIcon } from "@phosphor-icons/react/MapPin";
import { MegaphoneIcon } from "@phosphor-icons/react/Megaphone";
import { QuestionIcon } from "@phosphor-icons/react/Question";
import { SailboatIcon } from "@phosphor-icons/react/Sailboat";
import { ShareFatIcon } from "@phosphor-icons/react/ShareFat";
import { SignOutIcon } from "@phosphor-icons/react/SignOut";
import { SparkleIcon } from "@phosphor-icons/react/Sparkle";
import { TerminalWindowIcon } from "@phosphor-icons/react/TerminalWindow";
import { UserCircleIcon } from "@phosphor-icons/react/UserCircle";
import { UsersIcon } from "@phosphor-icons/react/Users";
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

type DemoProduct = {
	id: string;
	label: string;
	icon: ReactNode;
	iconClassName: string;
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
	{
		id: "universal-gateway",
		label: "Gateway",
		icon: <GlobeIcon weight="regular" />,
		iconClassName: "bg-emerald-600/10 text-emerald-600 dark:text-emerald-600",
	},
	{
		id: "codename",
		label: "Ship",
		icon: <SailboatIcon weight="regular" />,
		iconClassName: "bg-sky-600/10 text-sky-600 dark:text-sky-600",
	},
	{
		id: "localhost",
		label: "Share Localhost",
		icon: <ShareFatIcon weight="regular" />,
		iconClassName: "bg-purple-600/10 text-purple-600 dark:text-purple-600",
	},
	{
		id: "ai-gateway",
		label: "AI Gateway",
		icon: <SparkleIcon weight="regular" />,
		iconClassName: "bg-amber-600/10 text-amber-600 dark:text-amber-600",
	},
] as const satisfies ReadonlyArray<DemoProduct>;

const demoAccounts = [
	{ id: "acc_acme", name: "Acme Corp" },
	{ id: "acc_skunkworks", name: "Skunkworks" },
	{ id: "acc_atlas", name: "Atlas Industries" },
] as const;

function ProductIcon({ className, product }: { className?: string; product: DemoProduct }) {
	return (
		<span
			className={cx(
				"flex size-6 shrink-0 items-center justify-center rounded-md [&>svg]:size-5 [&>svg]:shrink-0",
				product.iconClassName,
				className,
			)}
			aria-hidden="true"
		>
			{product.icon}
		</span>
	);
}

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
 * decoupled app shell with a sidebar that collapses to the icon rail, a
 * header-mounted trigger, a toggleable full-window notice strip, and a
 * content card that scrolls internally. The two
 * components never reference each other — `Sidebar.Root` simply wraps the
 * shell so `Sidebar.Trigger` works from `AppLayout.Header`.
 *
 * Renders as an entire framed-preview document (see preview-registry.ts), so
 * it composes exactly like a real app shell: pinned to the viewport with
 * `fixed inset-0`, a `SkipToMainLink`, and `AppLayout.Content` as the real
 * `Main` landmark. Narrow the preview below `md` for the mobile sheet.
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
		// `md` (not the `lg` default ngrok's dashboards use) keeps the desktop
		// panel visible at the framed preview's desktop and tablet widths
		<Sidebar.Root mobileBreakpoint="md">
			<AppLayout.Root className="fixed inset-0">
				<SkipToMainLink />
				<AppLayout.Notice>
					{showNotice && (
						<div className="text-on-filled flex items-center gap-2 bg-rose-500 py-1 pr-4 pl-[1.375rem] text-xs">
							<WarningCircleIcon weight="fill" className="size-4 shrink-0" />
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
										<ProductIcon product={product} />
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
												<ProductIcon product={candidate} />
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
										<span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">
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
						<AppLayout.Content asChild>
							<Main>
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
							</Main>
						</AppLayout.Content>
					</AppLayout.Inset>
				</AppLayout.Body>
			</AppLayout.Root>
		</Sidebar.Root>
	);
}

/**
 * The pinned footer links for the single-product bridge shell — settings-type
 * destinations that sit above the footer separator, ahead of the Help menu.
 */
const bridgePinnedItems: ReadonlyArray<DemoNavItem> = [
	{ label: "Account settings", icon: <GearIcon />, path: "/settings" },
	{ label: "Members", icon: <UsersIcon />, path: "/members" },
];

/**
 * The single-product "bridge" app shell: the composition ngrok's dashboard can
 * adopt today, before product segmentation lands. Same decoupled `Sidebar` +
 * `AppLayout` as {@link AppShellDemo}, but with the current single-product
 * information architecture — the **account switcher** sits at the top (where
 * the product switcher lives in the multi-product shell), the body is one
 * product's navigation, and the footer stacks a few pinned links, a
 * `Sidebar.Separator`, and a Help `DropdownMenu`. To migrate later, move the
 * account switcher into the footer and put a product switcher in the header.
 *
 * Renders as an entire framed-preview document (see preview-registry.ts), so
 * it composes exactly like a real app shell: pinned to the viewport with
 * `fixed inset-0`, a `SkipToMainLink`, and `AppLayout.Content` as the real
 * `Main` landmark. Narrow the preview below `md` for the mobile sheet.
 */
export function BridgeShellDemo() {
	const [pathname, setPathname] = useState("/endpoints");
	const [accountId, setAccountId] = useState<string>(demoAccounts[0].id);
	const [showNotice, setShowNotice] = useState(false);

	const account = demoAccounts.find((candidate) => candidate.id === accountId) ?? demoAccounts[0];
	const currentLabel =
		[...demoNavSections.flatMap((section) => section.items), ...bridgePinnedItems].find(
			(item) => item.path === pathname,
		)?.label ?? "Home";

	return (
		// `md` (not the `lg` default ngrok's dashboards use) keeps the desktop
		// panel visible at the framed preview's desktop and tablet widths
		<Sidebar.Root mobileBreakpoint="md">
			<AppLayout.Root className="fixed inset-0">
				<SkipToMainLink />
				<AppLayout.Notice>
					{showNotice && (
						<div className="text-on-filled flex items-center gap-2 bg-rose-500 py-1 pr-4 pl-[1.375rem] text-xs">
							<WarningCircleIcon weight="fill" className="size-4 shrink-0" />
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
										<Sidebar.AccountAvatar accountId={account.id} accountName={account.name} />
										<span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">
											{account.name}
										</span>
										<CaretDownIcon className="text-muted size-4 shrink-0" />
									</Sidebar.SwitcherButton>
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="start" className="min-w-56">
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
						</Sidebar.Header>

						<Sidebar.Body>
							<DemoNav pathname={pathname} onNavigate={setPathname} />
						</Sidebar.Body>

						<Sidebar.Footer>
							{bridgePinnedItems.map((item) => (
								<Sidebar.ItemButton key={item.path} asChild current={pathname === item.path}>
									<a
										href={item.path}
										onClick={(event) => {
											event.preventDefault();
											setPathname(item.path);
										}}
									>
										{item.icon}
										{item.label}
									</a>
								</Sidebar.ItemButton>
							))}
							<Sidebar.Separator />
							<DropdownMenu.Root>
								<DropdownMenu.Trigger asChild>
									<Sidebar.ItemButton>
										<QuestionIcon />
										Help
									</Sidebar.ItemButton>
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="start" side="top" className="min-w-56">
									<DropdownMenu.Item className="gap-2">
										<BookOpenIcon className="text-muted" />
										Documentation
									</DropdownMenu.Item>
									<DropdownMenu.Item className="gap-2">
										<LifebuoyIcon className="text-muted" />
										Support
									</DropdownMenu.Item>
									<DropdownMenu.Item className="gap-2">
										<KeyboardIcon className="text-muted" />
										Keyboard shortcuts
									</DropdownMenu.Item>
									<DropdownMenu.Separator />
									<DropdownMenu.Item className="gap-2">
										<MegaphoneIcon className="text-muted" />
										What&apos;s new
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</Sidebar.Footer>
					</Sidebar.Nav>

					<AppLayout.Inset>
						<AppLayout.Content asChild>
							<Main>
								<AppLayout.Header>
									<Sidebar.Trigger />
									<Breadcrumb.Root>
										<Breadcrumb.List>
											<Breadcrumb.Item>
												<Breadcrumb.Link href="/" onClick={(event) => event.preventDefault()}>
													Home
												</Breadcrumb.Link>
											</Breadcrumb.Item>
											<Breadcrumb.Separator />
											<Breadcrumb.Item>
												<Breadcrumb.Page>{currentLabel}</Breadcrumb.Page>
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
												{currentLabel} row {index + 1}
											</p>
											<p className="text-muted text-sm">
												The content card is the only scroll container — the page never scrolls.
											</p>
										</div>
									))}
								</div>
							</Main>
						</AppLayout.Content>
					</AppLayout.Inset>
				</AppLayout.Body>
			</AppLayout.Root>
		</Sidebar.Root>
	);
}
