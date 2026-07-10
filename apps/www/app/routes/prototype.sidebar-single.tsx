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
import { FolderIcon } from "@phosphor-icons/react/Folder";
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
	| { type: "product" }
	| { type: "utility"; utilityId: Extract<ProductId, "account-settings" | "iam" | "usage"> };

type UtilityId = Extract<ProductId, "account-settings" | "iam" | "usage">;
type ProductSwitcherId = Extract<ProductId, "codename" | "localhost" | "universal-gateway">;

const initialProductId: Extract<ProductId, "universal-gateway"> = "universal-gateway";
const initialPath = "/endpoints";
const productSwitcherIds: ReadonlyArray<ProductSwitcherId> = [
	"universal-gateway",
	"codename",
	"localhost",
];
const productColorClassNames: Record<ProductSwitcherId, string> = {
	codename: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
	localhost: "bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300",
	"universal-gateway": "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
};

const utilityInitialPaths = {
	"account-settings": "/settings/general",
	iam: "/iam/team-members",
	usage: "/usage",
} as const satisfies Record<UtilityId, string>;

type DemoProject = {
	id: string;
	name: string;
};

const demoProjectsByAccount: Record<string, ReadonlyArray<DemoProject>> = {
	acc_acme: [
		{ id: "proj_orion", name: "Project Orion" },
		{ id: "proj_launchpad", name: "Launchpad" },
		{ id: "proj_customer_edge", name: "Customer Edge" },
	],
	acc_skunkworks: [
		{ id: "proj_labyrinth", name: "Labyrinth" },
		{ id: "proj_nightly", name: "Nightly Builds" },
	],
	acc_atlas: [
		{ id: "proj_northstar", name: "Northstar" },
		{ id: "proj_dataplane", name: "Global Dataplane" },
	],
};

function projectsForAccount(accountId: string) {
	return demoProjectsByAccount[accountId] ?? [];
}

function initialPathForProduct(productId: ProductSwitcherId) {
	if (productId === "codename") {
		return "/ship/apps";
	}
	if (productId === "localhost") {
		return "/localhost";
	}
	return "/endpoints";
}

function isProductSwitcherId(id: ProductId): id is ProductSwitcherId {
	return productSwitcherIds.includes(id as ProductSwitcherId);
}

function isFooterUtilityId(id: ProductId): id is UtilityId {
	return id === "usage" || id === "iam" || id === "account-settings";
}

function productDisplayName(product: ExampleProduct | undefined) {
	if (product?.id === "localhost") {
		return "Localhost";
	}
	return product?.label ?? "Gateway";
}

function navForProduct(
	productId: ProductSwitcherId,
	pathname: string,
	onNavigate: (path: string) => void,
) {
	if (productId === "universal-gateway") {
		return <UniversalGatewayNav pathname={pathname} onNavigate={onNavigate} />;
	}
	if (productId === "codename") {
		return <CodenameNav pathname={pathname} onNavigate={onNavigate} />;
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

function ProductIconBox({ product }: { product: ExampleProduct }) {
	const colorClassName = isProductSwitcherId(product.id)
		? productColorClassNames[product.id]
		: "bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300";

	return (
		<span
			className={cx(
				"flex size-5 shrink-0 items-center justify-center rounded-[0.25rem] [&>svg]:size-4",
				colorClassName,
			)}
			aria-hidden="true"
		>
			{product.icon}
		</span>
	);
}

export default function SidebarSinglePrototype() {
	const [mode, setMode] = useState<SidebarMode>({ type: "product" });
	const [currentProductId, setCurrentProductId] = useState<ProductSwitcherId>(initialProductId);
	const [pathname, setPathname] = useState(initialPath);
	const [productPathById, setProductPathById] = useState<Record<ProductSwitcherId, string>>({
		codename: initialPathForProduct("codename"),
		localhost: initialPathForProduct("localhost"),
		"universal-gateway": initialPath,
	});
	const [currentAccountId, setCurrentAccountId] = useState(demoAccounts[0]?.id ?? "");
	const [currentProjectId, setCurrentProjectId] = useState(
		projectsForAccount(demoAccounts[0]?.id ?? "")[0]?.id ?? "",
	);
	const [currentTheme, setTheme] = useTheme();

	const currentAccount = demoAccounts.find((account) => account.id === currentAccountId);
	const currentProjects = projectsForAccount(currentAccountId);
	const currentProject =
		currentProjects.find((project) => project.id === currentProjectId) ?? currentProjects[0];
	const currentProduct = productItems.find((product) => product.id === currentProductId);
	const productSwitcherItems = productSwitcherIds.flatMap((productId) => {
		const product = productItems.find((item) => item.id === productId);
		return product && isProductSwitcherId(product.id) ? [product] : [];
	});
	const currentUtility =
		mode.type === "utility" ? utilityItems.find((item) => item.id === mode.utilityId) : undefined;

	const openUtility = (utilityId: UtilityId) => {
		setMode({ type: "utility", utilityId });
		setPathname(utilityInitialPaths[utilityId]);
	};

	const returnToProduct = () => {
		setMode({ type: "product" });
		setPathname(productPathById[currentProductId]);
	};

	const switchAccount = (accountId: string) => {
		setCurrentAccountId(accountId);
		setCurrentProjectId(projectsForAccount(accountId)[0]?.id ?? "");
	};

	const switchProduct = (productId: ProductSwitcherId) => {
		setCurrentProductId(productId);
		setMode({ type: "product" });
		setPathname(productPathById[productId]);
	};

	const navigateProduct = (path: string) => {
		setPathname(path);
		setProductPathById((currentPaths) => ({
			...currentPaths,
			[currentProductId]: path,
		}));
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
				<Sidebar.Header className="border-b-0 pb-0">
					{mode.type === "utility" ? (
						<button
							type="button"
							className={cx(
								"text-body hover:text-strong hover:bg-neutral-500/10 flex w-full min-w-0 items-center gap-2 truncate rounded-md px-2 py-1 text-left font-medium",
								"ring-focus-accent focus:outline-hidden focus-visible:ring-4",
								"[&>svg]:text-muted hover:[&>svg]:text-strong [&>svg]:size-5 [&>svg]:shrink-0",
							)}
							onClick={returnToProduct}
						>
							<ArrowLeftIcon />
							<span className="text-strong min-w-0 flex-1 truncate">
								{currentUtility?.label ?? "Back"}
							</span>
						</button>
					) : (
						<DropdownMenu.Root>
							<DropdownMenu.Trigger
								className={cx(
									"text-body hover:text-strong hover:bg-neutral-500/10 flex w-full min-w-0 items-center gap-2 truncate rounded-md px-2 py-1 text-left font-medium",
									"data-state-open:bg-neutral-500/15 data-state-open:text-strong",
									"ring-focus-accent focus:outline-hidden focus-visible:ring-4",
								)}
							>
								{currentProduct ? <ProductIconBox product={currentProduct} /> : null}
								<span className="min-w-0 flex-1 truncate text-left">
									{productDisplayName(currentProduct)}
								</span>
								<Icon svg={<CaretDownIcon />} className="text-muted size-4 shrink-0" />
							</DropdownMenu.Trigger>
							<DropdownMenu.Content align="start" className="my-0 w-56" sideOffset={4}>
								<DropdownMenu.RadioGroup
									value={currentProductId}
									onValueChange={(value) => switchProduct(value as ProductSwitcherId)}
								>
									{productSwitcherItems.map((product) => (
										<DropdownMenu.RadioItem
											key={product.id}
											value={product.id}
											className="gap-2 whitespace-nowrap"
										>
											<ProductIconBox product={product} />
											{productDisplayName(product)}
										</DropdownMenu.RadioItem>
									))}
								</DropdownMenu.RadioGroup>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					)}
				</Sidebar.Header>

				<Sidebar.Body className="pt-1">
					{mode.type === "utility"
						? navForUtility(mode.utilityId, pathname, setPathname)
						: navForProduct(currentProductId, pathname, navigateProduct)}
				</Sidebar.Body>

				<Sidebar.Footer className="border-t-0">
					{mode.type === "product" ? (
						<>
							<div className="border-popover-muted my-2 border-t" aria-hidden="true" />
							{utilityItems.map((item) => {
								if (!isFooterUtilityId(item.id)) {
									return null;
								}
								const utilityId = item.id;
								return (
									<Sidebar.Item key={item.id} level="top" asChild>
										<button type="button" onClick={() => openUtility(utilityId)}>
											{item.icon}
											{item.label}
										</button>
									</Sidebar.Item>
								);
							})}
							<DropdownMenu.Root modal={false}>
								<Sidebar.Item className="px-1.5! [&>svg:last-child]:size-4!" level="top" asChild>
									<DropdownMenu.Trigger className="flex w-full items-center gap-2 data-state-open:bg-neutral-500/15 data-state-open:text-strong">
										<Icon svg={<QuestionIcon />} className="text-muted" />
										Help
										<Icon svg={<CaretDownIcon />} className="text-muted ml-auto size-4 shrink-0" />
									</DropdownMenu.Trigger>
								</Sidebar.Item>
								<DropdownMenu.Content
									align="start"
									className="my-0 w-max min-w-48"
									side="top"
									sideOffset={4}
								>
									<DropdownMenu.Item className="gap-2 whitespace-nowrap">
										<DoorOpenIcon className="text-muted" />
										Early Access
									</DropdownMenu.Item>
									<DropdownMenu.Item asChild>
										<a
											href="https://ngrok.com/docs"
											rel="noopener"
											target="_blank"
											className="flex items-center gap-2 whitespace-nowrap"
										>
											<BookIcon className="text-muted" />
											Documentation
										</a>
									</DropdownMenu.Item>
									<DropdownMenu.Item className="gap-2 whitespace-nowrap">
										<MegaphoneIcon className="text-muted" />
										Give feedback
									</DropdownMenu.Item>
									<DropdownMenu.Item asChild>
										<a
											href="https://ngrok.com/support"
											rel="noopener"
											target="_blank"
											className="flex items-center gap-2 whitespace-nowrap"
										>
											<ChatsIcon className="text-muted" />
											<span className="min-w-0 flex-1">Contact support</span>
											<span
												className="bg-accent-600 size-1.5 shrink-0 rounded-full"
												aria-hidden="true"
											/>
										</a>
									</DropdownMenu.Item>
									<DropdownMenu.Item asChild>
										<a
											href="https://status.ngrok.com/"
											rel="noopener"
											target="_blank"
											className="flex items-center gap-2 whitespace-nowrap"
										>
											<HeartbeatIcon className="text-muted" />
											<span className="min-w-0 flex-1">System status</span>
											<span
												className="bg-success-600 size-1.5 shrink-0 rounded-full"
												aria-hidden="true"
											/>
										</a>
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</>
					) : null}
					<div className="border-popover-muted my-2 border-t" aria-hidden="true" />
					<DropdownMenu.Root>
						<DropdownMenu.Trigger
							className={cx(
								"text-strong flex w-full items-center gap-2 rounded-md px-2 py-1",
								"hover:bg-popover-hover",
								"ring-focus-accent focus:outline-hidden focus-visible:ring-4",
							)}
						>
							<Sidebar.AccountAvatar
								className="size-5! shrink-0 rounded-[0.25rem] text-[0.625rem]"
								accountId={currentAccount?.id}
								accountName={currentAccount?.name}
							/>
							<span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
								{currentProject?.name ?? "Project Orion"}
							</span>
							<Sidebar.UserAvatar
								src={demoUser.pictureUrl}
								alt={demoUser.name}
								className="size-5 shrink-0"
							/>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content
							align="start"
							className="my-0 w-max min-w-56"
							side="top"
							sideOffset={4}
						>
							<DropdownMenu.Group>
								<DropdownMenu.Label className="text-muted py-1 text-xs font-medium">
									Projects
								</DropdownMenu.Label>
								<DropdownMenu.RadioGroup
									value={currentProject?.id ?? currentProjectId}
									onValueChange={setCurrentProjectId}
								>
									{currentProjects.map((project) => (
										<DropdownMenu.RadioItem
											key={project.id}
											value={project.id}
											className="gap-2 whitespace-nowrap"
										>
											<FolderIcon className="text-muted" />
											{project.name}
										</DropdownMenu.RadioItem>
									))}
								</DropdownMenu.RadioGroup>
								<DropdownMenu.Separator />
								<DropdownMenu.Item className="gap-2">
									<PlusCircleIcon className="text-muted" />
									New project
								</DropdownMenu.Item>
							</DropdownMenu.Group>
							<DropdownMenu.Separator />
							<DropdownMenu.Group>
								<DropdownMenu.Label className="text-muted py-1 text-xs font-medium">
									{currentAccount?.name ?? currentAccountId}
								</DropdownMenu.Label>
								<DropdownMenu.Item asChild>
									<button
										type="button"
										className="text-strong flex w-full items-center gap-2 whitespace-nowrap"
										onClick={() => openUtility("account-settings")}
									>
										<Icon svg={<GearIcon />} className="text-muted" />
										Account settings
									</button>
								</DropdownMenu.Item>
								<DropdownMenu.Item asChild>
									<button
										type="button"
										className="text-strong flex w-full items-center gap-2 whitespace-nowrap"
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
									<DropdownMenu.SubTrigger className="text-strong flex items-center gap-2 whitespace-nowrap">
										<Icon svg={<ArrowsClockwiseIcon />} className="text-muted" />
										Switch accounts
									</DropdownMenu.SubTrigger>
									<DropdownMenu.SubContent>
										<Sidebar.SwitchAccountsRadioGroup
											value={currentAccountId}
											onValueChange={switchAccount}
											accounts={demoAccounts.map((account) => ({
												id: account.id,
												name: account.name,
											}))}
										/>
										<DropdownMenu.Separator />
										<DropdownMenu.Item className="gap-2">
											<PlusCircleIcon className="text-muted" />
											New account
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
										className="text-strong flex w-full items-center gap-2 whitespace-nowrap"
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
								<button
									type="button"
									className="text-strong flex w-full items-center gap-2 whitespace-nowrap"
								>
									<Icon svg={<SignOutIcon />} className="text-muted" />
									Log out
								</button>
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
		<DetailPreview title={utility?.label ?? productDisplayName(product)} pathname={pathname} />
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
