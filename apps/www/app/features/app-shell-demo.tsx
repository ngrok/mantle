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
import { ArrowLeftIcon } from "@phosphor-icons/react/ArrowLeft";
import { ArrowRightIcon } from "@phosphor-icons/react/ArrowRight";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/ArrowsClockwise";
import { BellIcon } from "@phosphor-icons/react/Bell";
import { BookOpenIcon } from "@phosphor-icons/react/BookOpen";
import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import { CaretUpDownIcon } from "@phosphor-icons/react/CaretUpDown";
import { CertificateIcon } from "@phosphor-icons/react/Certificate";
import { ClipboardTextIcon } from "@phosphor-icons/react/ClipboardText";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/ClockCounterClockwise";
import { CreditCardIcon } from "@phosphor-icons/react/CreditCard";
import { FingerprintIcon } from "@phosphor-icons/react/Fingerprint";
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
import { ShieldCheckIcon } from "@phosphor-icons/react/ShieldCheck";
import { SignOutIcon } from "@phosphor-icons/react/SignOut";
import { SlidersHorizontalIcon } from "@phosphor-icons/react/SlidersHorizontal";
import { SparkleIcon } from "@phosphor-icons/react/Sparkle";
import { TerminalWindowIcon } from "@phosphor-icons/react/TerminalWindow";
import { UserCircleIcon } from "@phosphor-icons/react/UserCircle";
import { UsersIcon } from "@phosphor-icons/react/Users";
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
 * popping it out. The single example shows just the usage-limit warning; the
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
 * The navigation for whichever section is showing — a product's pages or the
 * settings pages. Lives inside `Sidebar.Root`, so it can use `useSidebar` to
 * close the mobile sheet when a nav item "navigates" — the same shape a real app
 * uses with its router.
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
 * The sidebar also shows the **settings section**: opening the account menu (or
 * the pinned footer link) and choosing "Account settings" swaps the header's
 * product switcher for a back link and the body's product nav for the settings
 * nav, and the back link returns to the product page the reader left.
 *
 * Renders as an entire framed-preview document (see preview-registry.ts), so
 * it composes exactly like a real app shell: pinned to the viewport with
 * `fixed inset-0`, a `SkipToMainLink`, and `AppLayout.Content` as the real
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

	const account = demoAccounts.find((candidate) => candidate.id === accountId) ?? demoAccounts[0];
	const inSettings = isSettingsPath(pathname);
	const productItems = demoNavSections.flatMap((section) => section.items);
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
				<AppLayout.Body>
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
						</Sidebar.Header>

						<Sidebar.Body>
							<DemoNav
								sections={inSettings ? demoSettingsSections : demoNavSections}
								pathname={pathname}
								onNavigate={navigate}
							/>
						</Sidebar.Body>

						<Sidebar.Footer>
							{/* no `current`: while the settings nav is showing, the current row
							    lives in that nav — two `aria-current="page"` rows in one
							    landmark would announce two current pages */}
							<Sidebar.ItemButton asChild>
								<a
									href={settingsSectionPath}
									onClick={(event) => {
										event.preventDefault();
										navigate(settingsSectionPath);
									}}
								>
									<GearIcon />
									Account settings
								</a>
							</Sidebar.ItemButton>
							<Sidebar.Separator />
							<DropdownMenu.Root>
								<DropdownMenu.Trigger asChild>
									<Sidebar.SwitcherTrigger>
										<Sidebar.AccountAvatar accountId={account.id} accountName={account.name} />
										<span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">
											{account.name}
										</span>
										<Sidebar.UserAvatar alt="Jane Doe" />
									</Sidebar.SwitcherTrigger>
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="start" side="top" width="trigger">
									<DropdownMenu.Group>
										<DropdownMenu.Label className="text-muted py-1 text-xs font-medium">
											{account.name}
										</DropdownMenu.Label>
										<DropdownMenu.Item
											className="gap-2"
											onSelect={() => navigate(settingsSectionPath)}
										>
											<GearIcon className="text-muted" />
											Account settings
										</DropdownMenu.Item>
										<DropdownMenu.Sub>
											<DropdownMenu.SubTrigger className="gap-2">
												<ArrowsClockwiseIcon className="text-muted" />
												Switch accounts
											</DropdownMenu.SubTrigger>
											<DropdownMenu.SubContent>
												<DropdownMenu.RadioGroup value={accountId} onValueChange={setAccountId}>
													{demoAccounts.map((demoAccount) => (
														<DropdownMenu.RadioItem key={demoAccount.id} value={demoAccount.id}>
															<Sidebar.AccountAvatar
																accountId={demoAccount.id}
																accountName={demoAccount.name}
															/>
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
										<DropdownMenu.Item
											className="gap-2"
											onSelect={() => navigate("/settings/preferences")}
										>
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
								<div className="space-y-4 p-6">
									{Array.from({ length: 12 }, (_, index) => (
										<div key={index} className="border-card-muted rounded-lg border p-4">
											<p className="text-strong text-sm font-medium">
												{currentItem?.label ?? "Overview"} row {index + 1}
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
	{ label: "Account settings", icon: <GearIcon />, path: settingsSectionPath },
	{ label: "Members", icon: <UsersIcon />, path: "/members" },
];

/**
 * The bridge shell's account switcher: the `Sidebar.Header` row that owns
 * account context in the single-product IA, with the account menu that can also
 * deep-link into the settings section.
 */
function BridgeAccountSwitcher({
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
			<DropdownMenu.Trigger asChild>
				<Sidebar.SwitcherTrigger>
					<Sidebar.AccountAvatar accountId={account.id} accountName={account.name} />
					<span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">
						{account.name}
					</span>
					<CaretDownIcon className="text-muted size-4 shrink-0" />
				</Sidebar.SwitcherTrigger>
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="start" width="trigger">
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
							<DropdownMenu.RadioGroup value={accountId} onValueChange={onAccountChange}>
								{demoAccounts.map((demoAccount) => (
									<DropdownMenu.RadioItem key={demoAccount.id} value={demoAccount.id}>
										<Sidebar.AccountAvatar
											accountId={demoAccount.id}
											accountName={demoAccount.name}
										/>
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
 * The single-product "bridge" app shell: the composition ngrok's dashboard can
 * adopt today, before product segmentation lands. Same decoupled `Sidebar` +
 * `AppLayout` as {@link AppShellDemo}, but with the current single-product
 * information architecture — the **account switcher** sits at the top (where
 * the product switcher lives in the multi-product shell), the body is one
 * product's navigation, and the footer stacks a few pinned links, a
 * `Sidebar.Separator`, and a Help `DropdownMenu`. To migrate later, move the
 * account switcher into the footer and put a product switcher in the header.
 *
 * Like {@link AppShellDemo}, the sidebar can show the **settings section**: the
 * pinned "Account settings" link (or the account menu's "User settings") swaps
 * the header and body for the settings nav and a back link. Note the tradeoff of
 * this IA — the header's account switcher is unavailable while the settings nav
 * is showing, so shells that need account switching from inside settings should
 * keep the switcher in the header and put the back row at the top of
 * `Sidebar.Body` instead.
 *
 * Renders as an entire framed-preview document (see preview-registry.ts), so
 * it composes exactly like a real app shell: pinned to the viewport with
 * `fixed inset-0`, a `SkipToMainLink`, and `AppLayout.Content` as the real
 * `Main` landmark. Narrow the preview below `md` for the mobile sheet.
 */
export function BridgeShellDemo() {
	// fake router — a real app reads this from `useLocation()` (see the note at
	// the top of this file)
	const [pathname, setPathname] = useState("/endpoints");
	// Where the settings section's back link goes — see AppShellDemo.
	const [returnPath, setReturnPath] = useState("/endpoints");
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
	// The pinned "Account settings" link points *into* the settings section rather
	// than at a page of its own, so it is left out of the page lookups below —
	// otherwise it would shadow the section's own label for that path.
	const productItems = [
		...demoNavSections.flatMap((section) => section.items),
		...bridgePinnedItems.filter((item) => !isSettingsPath(item.path)),
	];
	const currentLabel =
		[...productItems, ...demoSettingsSections.flatMap((section) => section.items)].find(
			(item) => item.path === pathname,
		)?.label ?? "Home";
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
				<AppLayout.Body>
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
								<BridgeAccountSwitcher
									accountId={accountId}
									onAccountChange={setAccountId}
									onNavigate={navigate}
								/>
							)}
						</Sidebar.Header>

						<Sidebar.Body>
							<DemoNav
								sections={inSettings ? demoSettingsSections : demoNavSections}
								pathname={pathname}
								onNavigate={navigate}
							/>
						</Sidebar.Body>

						<Sidebar.Footer>
							{/* while the settings nav is showing it owns the current row, so the
							    pinned settings link drops its own `current` — two
							    `aria-current="page"` rows in one landmark would announce two current
							    pages */}
							{bridgePinnedItems.map((item) => (
								<Sidebar.ItemButton
									key={item.path}
									asChild
									current={!inSettings && pathname === item.path}
								>
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
