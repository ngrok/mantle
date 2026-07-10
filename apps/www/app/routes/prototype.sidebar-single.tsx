import { BrowserOnly } from "@ngrok/mantle/browser-only";
import { cx } from "@ngrok/mantle/cx";
import { DropdownMenu } from "@ngrok/mantle/dropdown-menu";
import { Icon } from "@ngrok/mantle/icon";
import { AutoThemeIcon, ThemeIcon } from "@ngrok/mantle/icons";
import { Sidebar } from "@ngrok/mantle/sidebar";
import { $theme, isTheme, useTheme } from "@ngrok/mantle/theme";
import { ArrowLeftIcon } from "@phosphor-icons/react/ArrowLeft";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/ArrowsClockwise";
import { BookIcon } from "@phosphor-icons/react/Book";
import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import { ChatsIcon } from "@phosphor-icons/react/Chats";
import { CreditCardIcon } from "@phosphor-icons/react/CreditCard";
import { DoorOpenIcon } from "@phosphor-icons/react/DoorOpen";
import { GearIcon } from "@phosphor-icons/react/Gear";
import { HeartbeatIcon } from "@phosphor-icons/react/Heartbeat";
import { MegaphoneIcon } from "@phosphor-icons/react/Megaphone";
import { PlusCircleIcon } from "@phosphor-icons/react/PlusCircle";
import { QuestionIcon } from "@phosphor-icons/react/Question";
import { SignOutIcon } from "@phosphor-icons/react/SignOut";
import { UserCircleIcon } from "@phosphor-icons/react/UserCircle";
import { useState } from "react";

import {
	AccountSettingsNav,
	getAccountSettingsPage,
} from "~/examples/sidebar/account-settings-nav";
import { AiGatewayNav } from "~/examples/sidebar/ai-gateway-nav";
import { CodenameNav } from "~/examples/sidebar/codename-nav";
import { demoAccounts, demoUser } from "~/examples/sidebar/demo-data";
import { IamNav, getIamPage } from "~/examples/sidebar/iam-nav";
import { LocalhostNav } from "~/examples/sidebar/localhost-nav";
import {
	type ExampleProduct,
	type ProductId,
	productItems,
	utilityItems,
} from "~/examples/sidebar/products";
import { UniversalGatewayNav } from "~/examples/sidebar/universal-gateway-nav";
import { UsageNav } from "~/examples/sidebar/usage-nav";

type SidebarMode =
	| {
			type: "product";
			productId: Extract<ProductId, "ai-gateway" | "codename" | "localhost" | "universal-gateway">;
	  }
	| { type: "utility"; utilityId: Extract<ProductId, "account-settings" | "iam" | "usage"> };

type UtilityId = Extract<ProductId, "account-settings" | "iam" | "usage">;

const initialProductId: Extract<ProductId, "universal-gateway"> = "universal-gateway";
const initialPath = "/endpoints";

const utilityInitialPaths = {
	"account-settings": "/settings/general",
	iam: "/iam/team-members",
	usage: "/usage",
} as const satisfies Record<UtilityId, string>;

function isFooterUtilityId(id: ProductId): id is UtilityId {
	return id === "usage" || id === "iam" || id === "account-settings";
}

function navForProduct(
	productId: Extract<ProductId, "ai-gateway" | "codename" | "localhost" | "universal-gateway">,
	pathname: string,
	onNavigate: (path: string) => void,
) {
	if (productId === "universal-gateway") {
		return <UniversalGatewayNav pathname={pathname} onNavigate={onNavigate} />;
	}
	if (productId === "codename") {
		return <CodenameNav pathname={pathname} onNavigate={onNavigate} />;
	}
	if (productId === "ai-gateway") {
		return <AiGatewayNav pathname={pathname} onNavigate={onNavigate} />;
	}
	return <LocalhostNav pathname={pathname} onNavigate={onNavigate} />;
}

function navForUtility(
	utilityId: Extract<ProductId, "account-settings" | "iam" | "usage">,
	pathname: string,
	onNavigate: (path: string) => void,
) {
	if (utilityId === "account-settings") {
		return <AccountSettingsNav pathname={pathname} onNavigate={onNavigate} />;
	}
	if (utilityId === "iam") {
		return <IamNav pathname={pathname} onNavigate={onNavigate} />;
	}
	return <UsageNav pathname={pathname} onNavigate={onNavigate} />;
}

export default function SidebarSinglePrototype() {
	const [mode, setMode] = useState<SidebarMode>({ type: "product", productId: initialProductId });
	const [pathname, setPathname] = useState(initialPath);
	const [currentAccountId, setCurrentAccountId] = useState(demoAccounts[0]?.id ?? "");
	const [currentTheme, setTheme] = useTheme();

	const currentAccount = demoAccounts.find((account) => account.id === currentAccountId);
	const currentProduct = productItems.find((product) =>
		mode.type === "product" ? product.id === mode.productId : product.id === initialProductId,
	);
	const currentUtility =
		mode.type === "utility" ? utilityItems.find((item) => item.id === mode.utilityId) : undefined;

	const openUtility = (utilityId: UtilityId) => {
		setMode({ type: "utility", utilityId });
		setPathname(utilityInitialPaths[utilityId]);
	};

	const returnToProduct = () => {
		setMode({ type: "product", productId: initialProductId });
		setPathname(initialPath);
	};

	return (
		<div className="bg-base fixed inset-0 z-50 flex">
			<Sidebar.Root
				aria-label={
					mode.type === "utility"
						? `${currentUtility?.label ?? "Utility"} navigation`
						: `${currentProduct?.label ?? "Product"} navigation`
				}
				className="border-r-0 bg-transparent"
			>
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
									<button
										type="button"
										className="text-strong flex w-full items-center gap-2"
										onClick={() => {
											setMode({ type: "utility", utilityId: "account-settings" });
											setPathname("/settings/general");
										}}
									>
										<Icon svg={<GearIcon />} className="text-muted" />
										Account settings
									</button>
								</DropdownMenu.Item>
								<DropdownMenu.Item asChild>
									<button
										type="button"
										className="text-strong flex w-full items-center gap-2"
										onClick={() => {
											setMode({ type: "utility", utilityId: "account-settings" });
											setPathname("/settings/billing");
										}}
									>
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
									<button
										type="button"
										className="text-strong flex w-full items-center gap-2"
										onClick={() => {
											setMode({ type: "utility", utilityId: "account-settings" });
											setPathname("/settings/preferences");
										}}
									>
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

				<Sidebar.Body className="pt-1">
					{mode.type === "utility" ? (
						<>
							<Sidebar.Group>
								<Sidebar.Item level="top" asChild>
									<button type="button" onClick={returnToProduct}>
										<ArrowLeftIcon />
										Back to {currentProduct?.label ?? "Gateway"}
									</button>
								</Sidebar.Item>
							</Sidebar.Group>
							{navForUtility(mode.utilityId, pathname, setPathname)}
						</>
					) : (
						navForProduct(mode.productId, pathname, setPathname)
					)}
				</Sidebar.Body>

				<Sidebar.Footer>
					{utilityItems.map((item) => {
						if (!isFooterUtilityId(item.id)) {
							return null;
						}
						const utilityId = item.id;
						return (
							<Sidebar.Item
								key={item.id}
								level="top"
								active={mode.type === "utility" && mode.utilityId === utilityId}
								asChild
							>
								<button type="button" onClick={() => openUtility(utilityId)}>
									{item.icon}
									{item.label}
								</button>
							</Sidebar.Item>
						);
					})}
					<Sidebar.Item level="top" asChild>
						<button type="button">
							<DoorOpenIcon />
							Early Access
						</button>
					</Sidebar.Item>
					<DropdownMenu.Root modal={false}>
						<Sidebar.Item level="top" asChild>
							<DropdownMenu.Trigger className="flex w-full items-center gap-2 data-state-open:bg-neutral-500/15 data-state-open:text-strong">
								<QuestionIcon />
								Help
								<CaretDownIcon className="text-muted ml-auto size-4 shrink-0" />
							</DropdownMenu.Trigger>
						</Sidebar.Item>
						<DropdownMenu.Content
							align="start"
							className="my-0"
							side="top"
							sideOffset={4}
							width="trigger"
						>
							<DropdownMenu.Item asChild>
								<a
									href="https://ngrok.com/docs"
									rel="noopener"
									target="_blank"
									className="flex items-center gap-2"
								>
									<BookIcon className="text-muted" />
									Documentation
								</a>
							</DropdownMenu.Item>
							<DropdownMenu.Item className="gap-2">
								<MegaphoneIcon className="text-muted" />
								Give feedback
							</DropdownMenu.Item>
							<DropdownMenu.Item asChild>
								<a
									href="https://ngrok.com/support"
									rel="noopener"
									target="_blank"
									className="flex items-center gap-2"
								>
									<ChatsIcon className="text-muted" />
									Contact support
								</a>
							</DropdownMenu.Item>
							<DropdownMenu.Item asChild>
								<a
									href="https://status.ngrok.com/"
									rel="noopener"
									target="_blank"
									className="flex items-center gap-2"
								>
									<HeartbeatIcon className="text-muted" />
									System status
								</a>
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</Sidebar.Footer>
			</Sidebar.Root>

			<main className="bg-card border-card-muted my-2 mr-2 flex flex-1 items-center justify-center rounded-xl border shadow-sm">
				<PagePreview
					mode={mode}
					pathname={pathname}
					product={currentProduct}
					utility={currentUtility}
				/>
			</main>
		</div>
	);
}

function PagePreview({
	mode,
	pathname,
	product,
	utility,
}: {
	mode: SidebarMode;
	pathname: string;
	product: ExampleProduct | undefined;
	utility: ExampleProduct | undefined;
}) {
	if (mode.type === "utility" && mode.utilityId === "account-settings") {
		const page = getAccountSettingsPage(pathname);
		return (
			<DetailPreview
				title={page?.label ?? utility?.label ?? "Settings"}
				pathname={pathname}
				details={page?.details}
			/>
		);
	}
	if (mode.type === "utility" && mode.utilityId === "iam") {
		const page = getIamPage(pathname);
		return (
			<DetailPreview
				title={page?.label ?? utility?.label ?? "Identity & Access"}
				pathname={pathname}
				details={page?.details}
			/>
		);
	}

	return (
		<DetailPreview title={utility?.label ?? product?.label ?? "Gateway"} pathname={pathname} />
	);
}

function DetailPreview({
	details,
	pathname,
	title,
}: {
	details?: ReadonlyArray<string>;
	pathname: string;
	title: string;
}) {
	return (
		<div className="w-full max-w-sm px-6">
			<div className="text-strong text-lg font-medium">{title}</div>
			<div className="text-muted mt-1 text-sm">{pathname}</div>
			{details ? (
				<ul className="mt-4 space-y-2 text-sm text-body">
					{details.map((detail) => (
						<li key={detail}>{detail}</li>
					))}
				</ul>
			) : null}
		</div>
	);
}
