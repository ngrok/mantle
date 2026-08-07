import { Alert } from "@ngrok/mantle/alert";
import { AlertCenter } from "@ngrok/mantle/alert-center";
import { AppLayout } from "@ngrok/mantle/app-layout";
import { Avatar } from "@ngrok/mantle/avatar";
import { Breadcrumb } from "@ngrok/mantle/breadcrumb";
import { IconButton } from "@ngrok/mantle/button";
import { Command, MetaKey } from "@ngrok/mantle/command";
import { cx } from "@ngrok/mantle/cx";
import { Dialog } from "@ngrok/mantle/dialog";
import { DropdownMenu } from "@ngrok/mantle/dropdown-menu";
import { AutoThemeIcon } from "@ngrok/mantle/icons";
import { Kbd } from "@ngrok/mantle/kbd";
import { Main } from "@ngrok/mantle/main";
import { Sidebar, useSidebar } from "@ngrok/mantle/sidebar";
import { SkipToMainLink } from "@ngrok/mantle/skip-to-main-link";
import { ThemeDropdownMenuRadioGroup } from "@ngrok/mantle/theme-switcher";
import { ArrowLeftIcon } from "@phosphor-icons/react/ArrowLeft";
import { ArrowRightIcon } from "@phosphor-icons/react/ArrowRight";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/ArrowsClockwise";
import { BellIcon } from "@phosphor-icons/react/Bell";
import { BookOpenIcon } from "@phosphor-icons/react/BookOpen";
import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import { CaretUpDownIcon } from "@phosphor-icons/react/CaretUpDown";
import { CertificateIcon } from "@phosphor-icons/react/Certificate";
import { ChatsIcon } from "@phosphor-icons/react/Chats";
import { ClipboardTextIcon } from "@phosphor-icons/react/ClipboardText";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/ClockCounterClockwise";
import { CreditCardIcon } from "@phosphor-icons/react/CreditCard";
import { DoorOpenIcon } from "@phosphor-icons/react/DoorOpen";
import { FingerprintIcon } from "@phosphor-icons/react/Fingerprint";
import { GearIcon } from "@phosphor-icons/react/Gear";
import { GlobeIcon } from "@phosphor-icons/react/Globe";
import { GlobeHemisphereWestIcon } from "@phosphor-icons/react/GlobeHemisphereWest";
import { BankIcon } from "@phosphor-icons/react/Bank";
import { CloudArrowUpIcon } from "@phosphor-icons/react/CloudArrowUp";
import { CubeIcon } from "@phosphor-icons/react/Cube";
import { GraphIcon } from "@phosphor-icons/react/Graph";
import { HandWavingIcon } from "@phosphor-icons/react/HandWaving";
import { IdentificationCardIcon } from "@phosphor-icons/react/IdentificationCard";
import { KeyIcon } from "@phosphor-icons/react/Key";
import { ShareFatIcon } from "@phosphor-icons/react/ShareFat";
import { HashIcon } from "@phosphor-icons/react/Hash";
import { HeartbeatIcon } from "@phosphor-icons/react/Heartbeat";
import { ListMagnifyingGlassIcon } from "@phosphor-icons/react/ListMagnifyingGlass";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import { MapPinIcon } from "@phosphor-icons/react/MapPin";
import { MegaphoneIcon } from "@phosphor-icons/react/Megaphone";
import { QuestionIcon } from "@phosphor-icons/react/Question";
import { ShieldCheckIcon } from "@phosphor-icons/react/ShieldCheck";
import { ShrimpIcon } from "@phosphor-icons/react/Shrimp";
import { SignOutIcon } from "@phosphor-icons/react/SignOut";
import { SlidersHorizontalIcon } from "@phosphor-icons/react/SlidersHorizontal";
import { SparkleIcon } from "@phosphor-icons/react/Sparkle";
import { SpeedometerIcon } from "@phosphor-icons/react/Speedometer";
import { TerminalWindowIcon } from "@phosphor-icons/react/TerminalWindow";
import { UserIcon } from "@phosphor-icons/react/User";
import { UserCircleIcon } from "@phosphor-icons/react/UserCircle";
import { UsersThreeIcon } from "@phosphor-icons/react/UsersThree";
import { VaultIcon } from "@phosphor-icons/react/Vault";
import { WarningIcon } from "@phosphor-icons/react/Warning";
import type { KeyboardEvent, ReactNode } from "react";
import { useRef, useState } from "react";

/*
 * Navigation in these demos is a FAKE ROUTER — do not copy it. They keep a local
 * `pathname` in state and cancel every anchor's default, purely so the examples
 * can be embedded. A real consumer uses their router's primitives instead:
 * render react-router's `Link` through `Sidebar.ItemButton`'s `asChild` and
 * derive `current` — and here, which navigation section is showing — from
 * `useLocation()`.
 *
 * Why the demos can't: each renders as its own framed-preview document *inside*
 * the docs app's router, and React Router permits exactly one router per tree —
 * a nested `MemoryRouter` (or a data-mode `RouterProvider`) throws "You cannot
 * render a <Router> inside another <Router>". Real `Link`s would mean giving the
 * previews real URLs, and then every click a reader makes inside a preview
 * iframe lands on the docs page's own Back button.
 */

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
		title: "Getting Started",
		items: [
			{ label: "Get Started", icon: <HandWavingIcon />, path: "/get-started" },
			{ label: "Share Localhost", icon: <ShareFatIcon />, path: "/share-localhost" },
			{ label: "Your Authtoken", icon: <KeyIcon />, path: "/your-authtoken" },
		],
	},
	{
		title: "Connectivity",
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
			{
				label: "Traffic Identities",
				icon: <IdentificationCardIcon />,
				path: "/traffic-identities",
			},
			{ label: "Log Export", icon: <CloudArrowUpIcon />, path: "/event-subscriptions" },
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
			{ label: "IP Policies", icon: <MapPinIcon />, path: "/ip-policies" },
			{ label: "TLS Certificates", icon: <CertificateIcon />, path: "/tls-certs" },
			{ label: "TLS Cert Authorities", icon: <BankIcon />, path: "/tls-cert-authorities" },
		],
	},
	{
		title: "Kubernetes",
		items: [{ label: "K8s Operators", icon: <CubeIcon />, path: "/kubernetes-operators" }],
	},
];

/**
 * The account/user settings navigation — the second _section_ of navigation the
 * same sidebar can show. Entering it swaps what `Sidebar.Header` and
 * `Sidebar.Body` render; the shell, the panel, and the footer are untouched.
 */
const demoSettingsSections: ReadonlyArray<DemoNavSection> = [
	{
		title: "Account",
		items: [
			{ label: "General", icon: <GearIcon />, path: "/settings/general" },
			{ label: "Billing", icon: <CreditCardIcon />, path: "/settings/billing" },
			{ label: "Auth", icon: <FingerprintIcon />, path: "/settings/auth" },
			{
				label: "Data Retention",
				icon: <ClockCounterClockwiseIcon />,
				path: "/settings/data-retention",
			},
			{ label: "IP Restrictions", icon: <MapPinIcon />, path: "/settings/ip-restrictions" },
			{ label: "Audit Logs", icon: <ClipboardTextIcon />, path: "/settings/audit-logs" },
		],
	},
	{
		title: "User",
		items: [
			{ label: "Preferences", icon: <SlidersHorizontalIcon />, path: "/settings/preferences" },
			{ label: "Profile", icon: <UserCircleIcon />, path: "/settings/profile" },
			{ label: "Security & Access", icon: <ShieldCheckIcon />, path: "/settings/security" },
		],
	},
];

/**
 * The account-scoped destinations the multi-product shell pins to its footer:
 * areas that outlive whichever product `Sidebar.Body` is showing, so they stay
 * put while the body's navigation changes. They are deliberately absent from
 * `demoNavSections` — one path must own exactly one row, or the panel would
 * announce two current pages.
 */
const demoFooterItems: ReadonlyArray<DemoNavItem> = [
	{ label: "Vaults & Secrets", icon: <VaultIcon />, path: "/vaults" },
	{ label: "Identity & Access", icon: <UsersThreeIcon />, path: "/iam" },
	{ label: "Usage & Limits", icon: <SpeedometerIcon />, path: "/usage" },
];

/** Where the settings section lands when entered from a link or a menu item. */
const settingsSectionPath = "/settings/general";

/**
 * Whether a demo path belongs to the settings section. Which navigation the
 * sidebar shows is *derived* from the location — the same thing a real app gets
 * for free from a nested settings route — so there is no second source of truth
 * to keep in sync with the router.
 */
function isSettingsPath(path: string) {
	return path === "/settings" || path.startsWith("/settings/");
}

/**
 * The demo account alerts, authored as `AlertCenter.Item` JSX under a
 * stay-mounted `AlertCenter.Root` — the toggle mounts and unmounts items, so
 * flipping everything off collapses the bar with its exit animation instead of
 * popping it out. The single example shows only the usage-limit warning; the
 * multiple example adds a billing failure (the danger takes the bar) and a
 * member-limit warning. The warnings are dismissable per the docs' best
 * practice — the billing failure withholds its dismiss button — and choosing
 * a preset resets any dismissals.
 */
function DemoAccountAlerts({
	dismissed,
	example,
	onDismiss,
}: {
	dismissed: ReadonlySet<string>;
	example: "single" | "multiple" | null;
	onDismiss: (id: string) => void;
}) {
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
			{example != null && !dismissed.has("usage-limit") && (
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
						<AlertCenter.DismissIconButton onClick={() => onDismiss("usage-limit")} />
					</Alert.Content>
				</AlertCenter.Item>
			)}
			{example === "multiple" && !dismissed.has("member-limit") && (
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
						<AlertCenter.DismissIconButton onClick={() => onDismiss("member-limit")} />
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
		label: "Shrimp",
		icon: <ShrimpIcon weight="regular" />,
		iconClassName: "bg-sky-600/10 text-sky-600 dark:text-sky-600",
		tagline: "Deploy apps without managing infrastructure.",
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
 * The multi-product switcher in the sidebar header: a `Sidebar.SwitcherTrigger`
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
			<Sidebar.Tooltip label={product.label}>
				<Dialog.Trigger asChild>
					<Sidebar.SwitcherTrigger>
						<ProductIcon product={product} />
						<span className="text-strong min-w-0 flex-1 truncate text-base">{product.label}</span>
						{/* the double caret reads "pick one of several", not "a menu drops from
						    here" — the caret-down below belongs to the account switchers, which
						    really do open a DropdownMenu */}
						<CaretUpDownIcon className="text-muted size-4 shrink-0" />
					</Sidebar.SwitcherTrigger>
				</Dialog.Trigger>
			</Sidebar.Tooltip>
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
 * The sidebar's search row and the palette it opens. The row is a
 * `Sidebar.SearchTrigger` — an item-shaped row whose ⌘K hint appears on hover or
 * focus — wrapped in `Command.SearchTrigger`, which is what makes typing or
 * pasting into the row open the palette with that text already in the query.
 *
 * `setOpenMobile(false)` as the palette opens is load-bearing, not tidiness:
 * below the sidebar's `mobileBreakpoint` the panel *is* a `Sheet`, so leaving it
 * open would stack a dialog inside a dialog — two focus traps, and two scroll
 * locks unwinding in an order neither owns.
 */
function DemoSearch({
	onNavigate,
	sections,
}: {
	onNavigate: (path: string) => void;
	sections: ReadonlyArray<DemoNavSection>;
}) {
	const { setOpenMobile } = useSidebar();

	return (
		<Command.DialogRoot
			onOpenChange={(open) => {
				if (open) {
					setOpenMobile(false);
				}
			}}
		>
			<Sidebar.Tooltip
				label="Search"
				shortcut={
					<>
						<MetaKey />
						<Kbd>K</Kbd>
					</>
				}
			>
				<Command.SearchTrigger>
					<Sidebar.SearchTrigger
						shortcut={
							<>
								<MetaKey />
								<Kbd>K</Kbd>
							</>
						}
					>
						<MagnifyingGlassIcon />
						<span className="min-w-0 flex-1 truncate">Search</span>
					</Sidebar.SearchTrigger>
				</Command.SearchTrigger>
			</Sidebar.Tooltip>
			<Command.DialogContent>
				<Command.Input placeholder="Search pages…" />
				<Command.List>
					<Command.Empty>No results found.</Command.Empty>
					{sections.map((section) => (
						<Command.Group heading={section.title ?? "Overview"} key={section.title ?? "top-level"}>
							{section.items.map((item) => (
								<Command.Item key={item.path} onSelect={() => onNavigate(item.path)}>
									{item.icon}
									{item.label}
								</Command.Item>
							))}
						</Command.Group>
					))}
				</Command.List>
			</Command.DialogContent>
		</Command.DialogRoot>
	);
}

/**
 * The navigation for whichever section is showing — a product's pages or the
 * settings pages, with the search row above them. Lives inside `Sidebar.Root`,
 * so it can use `useSidebar` to close the mobile sheet when a nav item
 * "navigates" — the same shape a real app uses with its router.
 */
function DemoNav({
	onNavigate,
	pathname,
	sections,
}: {
	onNavigate: (path: string) => void;
	pathname: string;
	sections: ReadonlyArray<DemoNavSection>;
}) {
	const { setOpenMobile } = useSidebar();

	function navigate(path: string) {
		onNavigate(path);
		setOpenMobile(false);
	}

	return (
		<>
			{sections.map((section) => (
				<Sidebar.Group key={section.title ?? "top-level"}>
					{section.title != null && <Sidebar.GroupLabel>{section.title}</Sidebar.GroupLabel>}
					<Sidebar.List>
						{section.items.map((item) => (
							<Sidebar.Item key={item.path}>
								<Sidebar.Tooltip label={item.label}>
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
								</Sidebar.Tooltip>
							</Sidebar.Item>
						))}
					</Sidebar.List>
				</Sidebar.Group>
			))}
		</>
	);
}

/**
 * The sidebar header while the settings section is showing: one full-width row —
 * back arrow plus the section title — that leaves the section, occupying the same
 * header band the product (or account) switcher owns the rest of the time.
 * Nothing about the shell or the panel changes; swapping what `Sidebar.Header`
 * and `Sidebar.Body` render is the entire pattern.
 *
 * The whole row is the affordance (per Micah's prototype), so it is a single
 * `Sidebar.ItemButton`: the hover/focus treatment spans arrow and title, and the
 * icon rail collapses it to the arrow chip with the title clipped away, exactly
 * like every other row. The `sr-only` destination keeps the accessible name from
 * being a bare "Settings" link sitting inside the Settings navigation.
 */
function DemoSettingsHeader({
	onBack,
	returnLabel,
	returnPath,
}: {
	onBack: () => void;
	returnLabel: string;
	returnPath: string;
}) {
	return (
		<Sidebar.Tooltip label={`Settings, back to ${returnLabel}`}>
			<Sidebar.ItemButton asChild className="font-medium">
				<a
					href={returnPath}
					onClick={(event) => {
						event.preventDefault();
						onBack();
					}}
				>
					<ArrowLeftIcon />
					<span className="text-strong min-w-0 flex-1 truncate text-base">Settings</span>
					<span className="sr-only">, back to {returnLabel}</span>
				</a>
			</Sidebar.ItemButton>
		</Sidebar.Tooltip>
	);
}

/**
 * The footer's Help menu, shared by both shells: a `Sidebar.ItemButton`
 * composed as a `DropdownMenu.Trigger`, so the row keeps the sidebar's row
 * treatment (and stays highlighted while the menu is open) instead of becoming
 * a foreign-looking button in the panel. The trailing caret reads "this row
 * opens a menu"; the leading icon is the only one the row sizes for you, which
 * is why the caret carries its own `size-4`.
 *
 * The menu opens upward (`side="top"`) — it is pinned to the bottom of the
 * viewport, so downward is off-screen.
 *
 * @example
 * ```tsx
 * <Sidebar.Footer>
 *   <DemoHelpMenu />
 * </Sidebar.Footer>
 * ```
 */
function DemoHelpMenu() {
	return (
		<DropdownMenu.Root>
			{/* Sidebar.Tooltip sits INSIDE DropdownMenu.Root: the menu root is
			    renderless, so Tooltip.Trigger asChild has no element to clone
			    if the tooltip wraps it */}
			<Sidebar.Tooltip label="Help">
				<DropdownMenu.Trigger asChild>
					<Sidebar.ItemButton>
						<QuestionIcon />
						Help
						<CaretDownIcon className="text-muted ml-auto size-4 shrink-0" />
					</Sidebar.ItemButton>
				</DropdownMenu.Trigger>
			</Sidebar.Tooltip>
			{/* trigger-width keeps the menu flush with the row it opens from; the
			    --sidebar-row-width floor keeps it there when the row shrinks into
			    the icon rail (the menu is portaled, so it inherits no sidebar
			    geometry of its own) */}
			<DropdownMenu.Content
				align="start"
				side="top"
				width="trigger"
				className="min-w-(--sidebar-row-width)"
			>
				<DropdownMenu.Item className="gap-2">
					<DoorOpenIcon className="text-muted" />
					Request early access
				</DropdownMenu.Item>
				<DropdownMenu.Separator />
				<DropdownMenu.Item asChild>
					<a
						className="flex items-center gap-2"
						href="https://ngrok.com/docs"
						rel="noopener"
						target="_blank"
					>
						<BookOpenIcon className="text-muted" />
						Documentation
					</a>
				</DropdownMenu.Item>
				<DropdownMenu.Item className="gap-2">
					<MegaphoneIcon className="text-muted" />
					Give feedback
				</DropdownMenu.Item>
				<DropdownMenu.Item asChild>
					<a
						className="flex items-center gap-2"
						href="https://ngrok.com/support"
						rel="noopener"
						target="_blank"
					>
						<ChatsIcon className="text-muted" />
						<span className="min-w-0 flex-1">Contact support</span>
						{/* decorative status pips: the row's text already carries the
						    meaning, so they stay out of the accessibility tree */}
						<span className="bg-accent-600 size-1.5 shrink-0 rounded-full" aria-hidden="true" />
					</a>
				</DropdownMenu.Item>
				<DropdownMenu.Item asChild>
					<a
						className="flex items-center gap-2"
						href="https://status.ngrok.com"
						rel="noopener"
						target="_blank"
					>
						<HeartbeatIcon className="text-muted" />
						<span className="min-w-0 flex-1">System status</span>
						<span className="bg-success-600 size-1.5 shrink-0 rounded-full" aria-hidden="true" />
					</a>
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	);
}

/**
 * The multi-product shell's footer switcher row: the account's avatar, the
 * account's name, and the signed-in user's avatar in one row that opens one
 * menu covering both scopes — account destinations (billing, settings,
 * switching) and user-level items (settings, theme, log out).
 *
 * @example
 * ```tsx
 * <Sidebar.Footer>
 *   <AppShellAccountSwitcher
 *     accountId={accountId}
 *     onAccountChange={setAccountId}
 *     onNavigate={navigate}
 *   />
 * </Sidebar.Footer>
 * ```
 */
function AppShellAccountSwitcher({
	accountId,
	onAccountChange,
	onNavigate,
}: {
	accountId: string;
	onAccountChange: (accountId: string) => void;
	onNavigate: (path: string) => void;
}) {
	const account = demoAccounts.find((candidate) => candidate.id === accountId) ?? demoAccounts[0];

	return (
		<DropdownMenu.Root>
			<Sidebar.Tooltip label={account.name}>
				<DropdownMenu.Trigger asChild>
					<Sidebar.SwitcherTrigger>
						<Avatar.Root appearance="square" colorSeed={account.id}>
							<Avatar.Fallback name={account.name} />
						</Avatar.Root>
						<span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">
							{account.name}
						</span>
						{/* the user has no picture here, so the avatar is a silhouette that
						    names the signed-in user itself — a bare span is role=generic,
						    where an accessible name is prohibited, hence role="img" */}
						<Avatar.Root aria-label="Jane Doe" className="text-muted" role="img">
							<Avatar.Fallback>
								<UserIcon className="size-4" />
							</Avatar.Fallback>
						</Avatar.Root>
					</Sidebar.SwitcherTrigger>
				</DropdownMenu.Trigger>
			</Sidebar.Tooltip>
			<DropdownMenu.Content
				align="start"
				side="top"
				width="trigger"
				className="min-w-(--sidebar-row-width)"
			>
				<DropdownMenu.Group>
					<DropdownMenu.Label className="text-muted py-1 text-xs font-medium">
						{account.name}
					</DropdownMenu.Label>
					<DropdownMenu.Item className="gap-2" onSelect={() => onNavigate("/settings/billing")}>
						<CreditCardIcon className="text-muted" />
						Billing
					</DropdownMenu.Item>
					<DropdownMenu.Item className="gap-2" onSelect={() => onNavigate(settingsSectionPath)}>
						<GearIcon className="text-muted" />
						Account settings
					</DropdownMenu.Item>
					<DropdownMenu.Sub>
						<DropdownMenu.SubTrigger className="gap-2">
							<ArrowsClockwiseIcon className="text-muted" />
							Switch accounts
						</DropdownMenu.SubTrigger>
						<DropdownMenu.SubContent>
							<DropdownMenu.RadioGroup value={account.id} onValueChange={onAccountChange}>
								{demoAccounts.map((demoAccount) => (
									<DropdownMenu.RadioItem key={demoAccount.id} value={demoAccount.id}>
										<Avatar.Root appearance="square" colorSeed={demoAccount.id}>
											<Avatar.Fallback name={demoAccount.name} />
										</Avatar.Root>
										<span className="min-w-0 flex-1 truncate">{demoAccount.name}</span>
									</DropdownMenu.RadioItem>
								))}
							</DropdownMenu.RadioGroup>
						</DropdownMenu.SubContent>
					</DropdownMenu.Sub>
				</DropdownMenu.Group>
				<DropdownMenu.Separator />
				<DropdownMenu.Group>
					<DropdownMenu.Label className="text-muted py-1 text-xs font-medium">
						jane@example.com
					</DropdownMenu.Label>
					<DropdownMenu.Item className="gap-2" onSelect={() => onNavigate("/settings/preferences")}>
						<UserCircleIcon className="text-muted" />
						User settings
					</DropdownMenu.Item>
					<DropdownMenu.Sub>
						<DropdownMenu.SubTrigger className="gap-2">
							<AutoThemeIcon className="text-muted size-5" />
							Theme
						</DropdownMenu.SubTrigger>
						<DropdownMenu.SubContent>
							{/* mantle ships the five-theme radio group for exactly this spot */}
							<ThemeDropdownMenuRadioGroup />
						</DropdownMenu.SubContent>
					</DropdownMenu.Sub>
				</DropdownMenu.Group>
				<DropdownMenu.Separator />
				<DropdownMenu.Item className="gap-2">
					<SignOutIcon className="text-muted" />
					Log out
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	);
}

/**
 * The canonical Sidebar + AppLayout composition, shared by both docs pages: a
 * decoupled app shell with a sidebar that collapses to the icon rail, a
 * header-mounted trigger, a product-choice dialog in the sidebar header, a
 * toggleable full-window notice strip, and a content card whose `Body` page
 * region is the only scroll container. The two components never reference each
 * other — `Sidebar.Root` wraps the shell so `Sidebar.Trigger` works from
 * `AppLayout.Header`.
 *
 * The footer carries the shell's stable rows, bottom-anchored under the
 * scrolling body: the account-scoped destinations every product shares
 * ({@link demoFooterItems}), a {@link DemoHelpMenu} row, a `Sidebar.Separator`,
 * and the {@link AppShellAccountSwitcher} row. Both menus open upward, and both
 * trigger rows stay highlighted while open.
 *
 * The sidebar also shows the **settings section**: opening the account menu and
 * choosing "Account settings" (or "Billing", which lands deeper in the same
 * section) swaps the header's product switcher for a back link and the body's
 * product nav for the settings nav, and the back link returns to the product
 * page the reader left.
 *
 * Renders as an entire framed-preview document (see preview-registry.ts), so
 * it composes exactly like a real app shell: pinned to the viewport with
 * `fixed inset-0`, a `SkipToMainLink`, and `AppLayout.Body` as the real
 * `Main` landmark. Narrow the preview below `md` for the mobile sheet.
 */
export function AppShellDemo() {
	// fake router — a real app reads this from `useLocation()` (see the note at
	// the top of this file)
	const [pathname, setPathname] = useState("/endpoints");
	// Where the settings section's back link goes: the product route the reader
	// left. A real app reads this from router history (or a fixed section parent);
	// the demo records it on the way in.
	const [returnPath, setReturnPath] = useState("/endpoints");
	const [productId, setProductId] = useState<string>(demoProducts[0].id);
	const [accountId, setAccountId] = useState<string>(demoAccounts[0].id);
	const [showNotice, setShowNotice] = useState(false);
	const [alertExample, setAlertExample] = useState<"single" | "multiple" | null>(null);
	const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
	const dismissAlert = (id: string) => setDismissed((previous) => new Set(previous).add(id));
	// Choosing a preset (or toggling it off) also restores dismissed alerts,
	// so the alert buttons double as a reset.
	const chooseAlertExample = (example: "single" | "multiple") => {
		setDismissed(new Set());
		setAlertExample((current) => (current === example ? null : example));
	};

	const inSettings = isSettingsPath(pathname);
	const productItems = [...demoNavSections.flatMap((section) => section.items), ...demoFooterItems];
	const currentItem = [
		...productItems,
		...demoSettingsSections.flatMap((section) => section.items),
	].find((item) => item.path === pathname);
	const returnLabel =
		productItems.find((item) => item.path === returnPath)?.label ?? "the dashboard";

	// Every navigation goes through here so entering the settings section always
	// records the product page its back link returns to.
	function navigate(path: string) {
		if (isSettingsPath(path) && !inSettings) {
			setReturnPath(pathname);
		}
		setPathname(path);
	}

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
						<DemoAccountAlerts
							example={alertExample}
							dismissed={dismissed}
							onDismiss={dismissAlert}
						/>
					</AlertCenter.Root>
				</AppLayout.Notice>
				<AppLayout.Workspace>
					{/* the landmark is renamed with the section it is showing */}
					<Sidebar.Nav aria-label={inSettings ? "Settings" : "Main"}>
						<Sidebar.Header>
							{inSettings ? (
								<DemoSettingsHeader
									returnLabel={returnLabel}
									returnPath={returnPath}
									onBack={() => setPathname(returnPath)}
								/>
							) : (
								<ProductSwitcherDialog productId={productId} onProductChange={setProductId} />
							)}
							<DemoSearch
								sections={inSettings ? demoSettingsSections : demoNavSections}
								onNavigate={navigate}
							/>
						</Sidebar.Header>

						<Sidebar.Body>
							<DemoNav
								sections={inSettings ? demoSettingsSections : demoNavSections}
								pathname={pathname}
								onNavigate={navigate}
							/>
						</Sidebar.Body>

						{/* The footer is the panel's stable region: the header and body swap
						    with the section being shown, these rows never do. */}
						<Sidebar.Footer>
							{demoFooterItems.map((item) => (
								<Sidebar.Tooltip key={item.path} label={item.label}>
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
								</Sidebar.Tooltip>
							))}
							<DemoHelpMenu />
							<Sidebar.Separator />
							<AppShellAccountSwitcher
								accountId={accountId}
								onAccountChange={setAccountId}
								onNavigate={navigate}
							/>
						</Sidebar.Footer>
					</Sidebar.Nav>

					<AppLayout.Content>
						<AppLayout.Header>
							<Sidebar.Trigger
								shortcut={
									<>
										<MetaKey />
										<Kbd>B</Kbd>
									</>
								}
							/>
							<Breadcrumb.Root>
								<Breadcrumb.List>
									{inSettings && (
										<>
											<Breadcrumb.Item>
												<Breadcrumb.Link
													href={settingsSectionPath}
													onClick={(event) => {
														event.preventDefault();
														navigate(settingsSectionPath);
													}}
												>
													Settings
												</Breadcrumb.Link>
											</Breadcrumb.Item>
											<Breadcrumb.Separator />
										</>
									)}
									<Breadcrumb.Item>
										<Breadcrumb.Page>{currentItem?.label ?? "Overview"}</Breadcrumb.Page>
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
									onClick={() => chooseAlertExample("single")}
								/>
								<IconButton
									type="button"
									appearance="outlined"
									intent="neutral"
									size="sm"
									label="Three alerts"
									icon={<BellIcon />}
									onClick={() => chooseAlertExample("multiple")}
								/>
							</div>
						</AppLayout.Header>
						<AppLayout.Body asChild>
							<Main>
								<div className="space-y-4 p-6">
									{Array.from({ length: 12 }, (_, index) => (
										<div key={index} className="border-card-muted rounded-lg border p-4">
											<p className="text-strong text-sm font-medium">
												{currentItem?.label ?? "Overview"} row {index + 1}
											</p>
											<p className="text-muted text-sm">
												The page region is the only scroll container — the document never scrolls.
											</p>
										</div>
									))}
								</div>
							</Main>
						</AppLayout.Body>
					</AppLayout.Content>
				</AppLayout.Workspace>
			</AppLayout.Root>
		</Sidebar.Root>
	);
}
