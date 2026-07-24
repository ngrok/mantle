import { Alert } from "@ngrok/mantle/alert";
import { AlertCenter } from "@ngrok/mantle/alert-center";
import { AppLayout } from "@ngrok/mantle/app-layout";
import { Breadcrumb } from "@ngrok/mantle/breadcrumb";
import { IconButton } from "@ngrok/mantle/button";
import { cx } from "@ngrok/mantle/cx";
import { Dialog } from "@ngrok/mantle/dialog";
import { DropdownMenu } from "@ngrok/mantle/dropdown-menu";
import { Main } from "@ngrok/mantle/main";
import { Sidebar, useSidebar } from "@ngrok/mantle/sidebar";
import { SkipToMainLink } from "@ngrok/mantle/skip-to-main-link";
import { ArrowRightIcon } from "@phosphor-icons/react/ArrowRight";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/ArrowsClockwise";
import { BellIcon } from "@phosphor-icons/react/Bell";
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
import { SignOutIcon } from "@phosphor-icons/react/SignOut";
import { SparkleIcon } from "@phosphor-icons/react/Sparkle";
import { TerminalWindowIcon } from "@phosphor-icons/react/TerminalWindow";
import { UserCircleIcon } from "@phosphor-icons/react/UserCircle";
import { UsersIcon } from "@phosphor-icons/react/Users";
import { VaultIcon } from "@phosphor-icons/react/Vault";
import { WarningIcon } from "@phosphor-icons/react/Warning";
import type { KeyboardEvent, ReactNode } from "react";
import { useRef, useState } from "react";

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
	/** the colored icon tile in the switcher trigger and dialog cards */
	iconClassName: string;
	/** one-line pitch on the product's dialog card */
	tagline: string;
	/** supporting copy under the tagline */
	description: string;
	/** the product's brand text color (dialog card name + current-card arrow) */
	textClassName: string;
	/** hover/focus treatment for the product's dialog card */
	cardHoverClassName: string;
	/** static highlight for the current product's dialog card */
	cardCurrentClassName: string;
	/** arrow tint while the product's dialog card is hovered or focused */
	arrowHoverClassName: string;
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

/**
 * The demo account alerts, authored as `AlertCenter.Item` JSX under a
 * stay-mounted `AlertCenter.Root` — the toggle mounts and unmounts items, so
 * flipping everything off collapses the bar with its exit animation instead of
 * popping it out. The single example shows just the usage-limit warning; the
 * multiple example adds a billing failure (the danger takes the bar) and a
 * member-limit warning.
 */
function DemoAccountAlerts({ example }: { example: "single" | "multiple" | null }) {
	return (
		<>
			{example === "multiple" && (
				<AlertCenter.Item id="billing" intent="danger">
					<Alert.Icon />
					<Alert.Content>
						<Alert.Title>
							A payment could not be processed{" "}
							<a className="font-medium" href="#billing">
								Review billing
							</a>
						</Alert.Title>
						<Alert.Description>
							Review your billing details to avoid an interruption.
						</Alert.Description>
					</Alert.Content>
				</AlertCenter.Item>
			)}
			{example != null && (
				<AlertCenter.Item id="usage-limit" intent="warning">
					<Alert.Icon />
					<Alert.Content>
						<Alert.Title>
							Your workspace is approaching its monthly usage limit{" "}
							<a className="font-medium" href="#usage">
								Review usage
							</a>
						</Alert.Title>
						<Alert.Description>
							Review usage or update your plan to avoid interruption.
						</Alert.Description>
					</Alert.Content>
				</AlertCenter.Item>
			)}
			{example === "multiple" && (
				<AlertCenter.Item id="member-limit" intent="warning">
					<Alert.Icon />
					<Alert.Content>
						<Alert.Title>
							Your workspace is approaching its member limit{" "}
							<a className="font-medium" href="#members">
								Review members
							</a>
						</Alert.Title>
						<Alert.Description>Review members or update your plan to add more.</Alert.Description>
					</Alert.Content>
				</AlertCenter.Item>
			)}
		</>
	);
}

const demoProducts = [
	{
		id: "universal-gateway",
		label: "Gateway",
		icon: <GlobeIcon weight="regular" />,
		iconClassName: "bg-emerald-600/10 text-emerald-600 dark:text-emerald-600",
		tagline: "Connect to anything, anywhere.",
		description:
			"An all-in-one cloud networking platform that secures, transforms, and routes traffic to all your services no matter where they run.",
		textClassName: "text-emerald-600 dark:text-emerald-600",
		cardHoverClassName:
			"hover:border-emerald-600 hover:bg-emerald-600/[0.03] focus-visible:border-emerald-600 focus-visible:bg-emerald-600/[0.03] focus-visible:ring-emerald-600/20 dark:hover:border-emerald-600 dark:focus-visible:border-emerald-600",
		cardCurrentClassName:
			"border-emerald-600 bg-emerald-600/[0.03] ring-4 ring-emerald-600/15 dark:border-emerald-600",
		arrowHoverClassName:
			"group-hover:text-emerald-600 group-focus-visible:text-emerald-600 dark:group-hover:text-emerald-600 dark:group-focus-visible:text-emerald-600",
	},
	{
		id: "codename",
		label: "Ship",
		icon: <SailboatIcon weight="regular" />,
		iconClassName: "bg-sky-600/10 text-sky-600 dark:text-sky-600",
		tagline: "Ship apps without managing infrastructure.",
		description: "Deploy services close to your users with managed compute, domains, and secrets.",
		textClassName: "text-sky-600 dark:text-sky-600",
		cardHoverClassName:
			"hover:border-sky-600 hover:bg-sky-600/[0.03] focus-visible:border-sky-600 focus-visible:bg-sky-600/[0.03] focus-visible:ring-sky-600/20 dark:hover:border-sky-600 dark:focus-visible:border-sky-600",
		cardCurrentClassName:
			"border-sky-600 bg-sky-600/[0.03] ring-4 ring-sky-600/15 dark:border-sky-600",
		arrowHoverClassName:
			"group-hover:text-sky-600 group-focus-visible:text-sky-600 dark:group-hover:text-sky-600 dark:group-focus-visible:text-sky-600",
	},
	{
		id: "ai-gateway",
		label: "AI Gateway",
		icon: <SparkleIcon weight="regular" />,
		iconClassName: "bg-amber-600/10 text-amber-600 dark:text-amber-600",
		tagline: "One gateway, every model.",
		description:
			"Change one URL to route between hosted or self-hosted models, with failover and observability built in.",
		textClassName: "text-amber-600 dark:text-amber-600",
		cardHoverClassName:
			"hover:border-amber-600 hover:bg-amber-600/[0.03] focus-visible:border-amber-600 focus-visible:bg-amber-600/[0.03] focus-visible:ring-amber-600/20 dark:hover:border-amber-600 dark:focus-visible:border-amber-600",
		cardCurrentClassName:
			"border-amber-600 bg-amber-600/[0.03] ring-4 ring-amber-600/15 dark:border-amber-600",
		arrowHoverClassName:
			"group-hover:text-amber-600 group-focus-visible:text-amber-600 dark:group-hover:text-amber-600 dark:group-focus-visible:text-amber-600",
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
 * Roving arrow-key navigation over the dialog's product cards: ArrowDown and
 * ArrowUp wrap around, Home/End jump to the edges. Enter and Space activate
 * the focused card natively, so only focus movement is handled here.
 */
function handleProductOptionKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
	const container = event.currentTarget.closest("[data-product-options]");
	if (container == null) {
		return;
	}
	const options = Array.from(container.querySelectorAll("button"));
	const focusedIndex = options.findIndex((option) => option === event.currentTarget);
	if (focusedIndex === -1) {
		return;
	}
	const lastIndex = options.length - 1;
	if (event.key === "ArrowDown") {
		event.preventDefault();
		options[focusedIndex === lastIndex ? 0 : focusedIndex + 1]?.focus();
	} else if (event.key === "ArrowUp") {
		event.preventDefault();
		options[focusedIndex === 0 ? lastIndex : focusedIndex - 1]?.focus();
	} else if (event.key === "Home") {
		event.preventDefault();
		options[0]?.focus();
	} else if (event.key === "End") {
		event.preventDefault();
		options[lastIndex]?.focus();
	}
}

/**
 * The multi-product switcher in the sidebar header: a `Sidebar.SwitcherButton`
 * trigger that opens a centered "Choose a product" dialog. Each product
 * renders as a color-coded card with its tagline and description; the current
 * product's card is highlighted and receives focus when the dialog opens, and
 * choosing a card switches the product and closes the dialog.
 */
function ProductSwitcherDialog({
	onProductChange,
	productId,
}: {
	onProductChange: (productId: string) => void;
	productId: string;
}) {
	const currentOptionRef = useRef<HTMLButtonElement | null>(null);
	const product = demoProducts.find((candidate) => candidate.id === productId) ?? demoProducts[0];

	return (
		<Dialog.Root>
			<Dialog.Trigger asChild>
				<Sidebar.SwitcherButton>
					<ProductIcon product={product} />
					<span className="text-strong min-w-0 flex-1 truncate text-base">{product.label}</span>
					<CaretDownIcon className="text-muted size-4 shrink-0" />
				</Sidebar.SwitcherButton>
			</Dialog.Trigger>
			<Dialog.Content
				className="bg-popover"
				preferredWidth="max-w-xl"
				onOpenAutoFocus={(event) => {
					// land focus on the current product's card, not the first card
					event.preventDefault();
					currentOptionRef.current?.focus();
				}}
			>
				<Dialog.Body className="p-6">
					<Dialog.Title className="text-strong text-center text-lg font-medium">
						Choose a product
					</Dialog.Title>
					<div className="mt-6 flex flex-col gap-2" data-product-options="">
						{demoProducts.map((candidate) => {
							const isCurrent = candidate.id === productId;
							return (
								<Dialog.Close key={candidate.id} asChild>
									<button
										ref={isCurrent ? currentOptionRef : undefined}
										type="button"
										className={cx(
											"group border-card-muted bg-card flex w-full flex-col rounded-lg border p-4 text-left shadow-sm transition-none focus:outline-hidden focus-visible:ring-4",
											candidate.cardHoverClassName,
											isCurrent && candidate.cardCurrentClassName,
										)}
										onClick={() => onProductChange(candidate.id)}
										onKeyDown={handleProductOptionKeyDown}
									>
										<span className="flex w-full min-w-0 items-center justify-between gap-3">
											<span className="flex min-w-0 items-center gap-3">
												<ProductIcon className="size-7" product={candidate} />
												<span
													className={cx("truncate text-sm font-medium", candidate.textClassName)}
												>
													{candidate.label}
												</span>
											</span>
											<ArrowRightIcon
												className={cx(
													"text-muted size-5 shrink-0",
													candidate.arrowHoverClassName,
													isCurrent && candidate.textClassName,
												)}
											/>
										</span>
										<span className="text-strong mt-2 text-base leading-snug font-medium">
											{candidate.tagline}
										</span>
										<span className="text-muted mt-1 text-sm leading-relaxed text-pretty">
											{candidate.description}
										</span>
									</button>
								</Dialog.Close>
							);
						})}
					</div>
				</Dialog.Body>
			</Dialog.Content>
		</Dialog.Root>
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
 * header-mounted trigger, a product-choice dialog in the sidebar header, a
 * toggleable full-window notice strip, and a
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
	const [alertExample, setAlertExample] = useState<"single" | "multiple" | null>(null);

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
						<div className="text-on-filled bg-rose-500 px-4 py-2 text-center text-xs">
							Preview notice
						</div>
					)}
					<AlertCenter.Root>
						<AlertCenter.Bar />
						<AlertCenter.Content />
						<DemoAccountAlerts example={alertExample} />
					</AlertCenter.Root>
				</AppLayout.Notice>
				<AppLayout.Body>
					<Sidebar.Nav aria-label="Main">
						<Sidebar.Header>
							<ProductSwitcherDialog productId={productId} onProductChange={setProductId} />
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
												<Breadcrumb.Page>
													{currentItem?.label ?? "Account settings"}
												</Breadcrumb.Page>
											</Breadcrumb.Item>
										</Breadcrumb.List>
									</Breadcrumb.Root>
									<div className="ml-auto flex gap-2">
										<IconButton
											type="button"
											appearance="outlined"
											intent="neutral"
											size="sm"
											label="Toggle notice"
											icon={<MegaphoneIcon />}
											onClick={() => setShowNotice((current) => !current)}
										/>
										<IconButton
											type="button"
											appearance="outlined"
											intent="neutral"
											size="sm"
											label="One warning"
											icon={<WarningIcon />}
											onClick={() =>
												setAlertExample((current) => (current === "single" ? null : "single"))
											}
										/>
										<IconButton
											type="button"
											appearance="outlined"
											intent="neutral"
											size="sm"
											label="Three alerts"
											icon={<BellIcon />}
											onClick={() =>
												setAlertExample((current) => (current === "multiple" ? null : "multiple"))
											}
										/>
									</div>
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
	const [alertExample, setAlertExample] = useState<"single" | "multiple" | null>(null);

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
						<div className="text-on-filled bg-rose-500 px-4 py-2 text-center text-xs">
							Preview notice
						</div>
					)}
					<AlertCenter.Root>
						<AlertCenter.Bar />
						<AlertCenter.Content />
						<DemoAccountAlerts example={alertExample} />
					</AlertCenter.Root>
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
									<div className="ml-auto flex gap-2">
										<IconButton
											type="button"
											appearance="outlined"
											intent="neutral"
											size="sm"
											label="Toggle notice"
											icon={<MegaphoneIcon />}
											onClick={() => setShowNotice((current) => !current)}
										/>
										<IconButton
											type="button"
											appearance="outlined"
											intent="neutral"
											size="sm"
											label="One warning"
											icon={<WarningIcon />}
											onClick={() =>
												setAlertExample((current) => (current === "single" ? null : "single"))
											}
										/>
										<IconButton
											type="button"
											appearance="outlined"
											intent="neutral"
											size="sm"
											label="Three alerts"
											icon={<BellIcon />}
											onClick={() =>
												setAlertExample((current) => (current === "multiple" ? null : "multiple"))
											}
										/>
									</div>
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
