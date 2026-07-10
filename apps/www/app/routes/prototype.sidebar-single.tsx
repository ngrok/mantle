import { cx } from "@ngrok/mantle/cx";
import { Dialog } from "@ngrok/mantle/dialog";
import { DropdownMenu } from "@ngrok/mantle/dropdown-menu";
import { Icon } from "@ngrok/mantle/icon";
import { AutoThemeIcon, ThemeIcon } from "@ngrok/mantle/icons";
import { Sidebar } from "@ngrok/mantle/sidebar";
import { $theme, isTheme, useTheme } from "@ngrok/mantle/theme";
import { ArrowLeftIcon } from "@phosphor-icons/react/ArrowLeft";
import { ArrowRightIcon } from "@phosphor-icons/react/ArrowRight";
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
import type { KeyboardEvent } from "react";
import { useRef, useState } from "react";

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
	| { type: "product" }
	| { type: "utility"; utilityId: Extract<ProductId, "account-settings" | "iam" | "usage"> };

type UtilityId = Extract<ProductId, "account-settings" | "iam" | "usage">;
type ProductSwitcherId = Extract<
	ProductId,
	"ai-gateway" | "codename" | "localhost" | "universal-gateway"
>;

const initialProductId: Extract<ProductId, "universal-gateway"> = "universal-gateway";
const initialPath = "/endpoints";
const productSwitcherIds: ReadonlyArray<ProductSwitcherId> = [
	"universal-gateway",
	"codename",
	"localhost",
	"ai-gateway",
];
const productColorClassNames: Record<ProductSwitcherId, string> = {
	"ai-gateway": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
	codename: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
	localhost: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
	"universal-gateway": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};
const productTextColorClassNames: Record<ProductSwitcherId, string> = {
	"ai-gateway": "text-amber-600 dark:text-amber-400",
	codename: "text-sky-600 dark:text-sky-400",
	localhost: "text-purple-600 dark:text-purple-400",
	"universal-gateway": "text-emerald-600 dark:text-emerald-400",
};
const productSelectedClassNames: Record<ProductSwitcherId, string> = {
	"ai-gateway":
		"border-amber-600 bg-amber-500/[0.03] ring-4 ring-amber-500/15 dark:border-amber-400",
	codename: "border-sky-600 bg-sky-500/[0.03] ring-4 ring-sky-500/15 dark:border-sky-400",
	localhost:
		"border-purple-600 bg-purple-500/[0.03] ring-4 ring-purple-500/15 dark:border-purple-400",
	"universal-gateway":
		"border-emerald-600 bg-emerald-500/[0.03] ring-4 ring-emerald-500/15 dark:border-emerald-400",
};
const productHighlightClassNames: Record<ProductSwitcherId, string> = {
	"ai-gateway":
		"hover:border-amber-600 hover:bg-amber-500/[0.03] focus-visible:bg-amber-500/[0.03] focus-visible:ring-amber-500/20 dark:hover:border-amber-400",
	codename:
		"hover:border-sky-600 hover:bg-sky-500/[0.03] focus-visible:bg-sky-500/[0.03] focus-visible:ring-sky-500/20 dark:hover:border-sky-400",
	localhost:
		"hover:border-purple-600 hover:bg-purple-500/[0.03] focus-visible:bg-purple-500/[0.03] focus-visible:ring-purple-500/20 dark:hover:border-purple-400",
	"universal-gateway":
		"hover:border-emerald-600 hover:bg-emerald-500/[0.03] focus-visible:bg-emerald-500/[0.03] focus-visible:ring-emerald-500/20 dark:hover:border-emerald-400",
};
const productArrowClassNames: Record<ProductSwitcherId, string> = {
	"ai-gateway":
		"group-hover:text-amber-600 group-focus-visible:text-amber-600 dark:group-hover:text-amber-400 dark:group-focus-visible:text-amber-400",
	codename:
		"group-hover:text-sky-600 group-focus-visible:text-sky-600 dark:group-hover:text-sky-400 dark:group-focus-visible:text-sky-400",
	localhost:
		"group-hover:text-purple-600 group-focus-visible:text-purple-600 dark:group-hover:text-purple-400 dark:group-focus-visible:text-purple-400",
	"universal-gateway":
		"group-hover:text-emerald-600 group-focus-visible:text-emerald-600 dark:group-hover:text-emerald-400 dark:group-focus-visible:text-emerald-400",
};
const productDialogCopy: Record<
	ProductSwitcherId,
	{
		title: string;
		description: string;
	}
> = {
	"ai-gateway": {
		title: "One gateway, every model.",
		description:
			"Change one URL to route between hosted or self-hosted models, with failover and observability built in.",
	},
	codename: {
		title: "Ship apps without managing infrastructure.",
		description: "Deploy services close to your users with managed compute, domains, and secrets.",
	},
	localhost: {
		title: "Put your local app on a public URL.",
		description:
			"Securely expose a web server on localhost to the internet, even from behind a NAT or firewall, with secure tunnels.",
	},
	"universal-gateway": {
		title: "Connect to anything, anywhere.",
		description:
			"An all-in-one cloud networking platform that secures, transforms, and routes traffic to all your services no matter where they run.",
	},
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
	if (productId === "ai-gateway") {
		return "/ai-gateway/overview";
	}
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

function ProductIconBox({
	className,
	product,
	variant = "box",
}: {
	className?: string;
	product: ExampleProduct;
	variant?: "box" | "icon";
}) {
	const colorClassName = isProductSwitcherId(product.id)
		? productColorClassNames[product.id]
		: "bg-amber-500/10 text-amber-600 dark:text-amber-400";
	const iconColorClassName = isProductSwitcherId(product.id)
		? productTextColorClassNames[product.id]
		: "text-amber-600 dark:text-amber-400";

	return (
		<span
			className={cx(
				"flex shrink-0 items-center justify-center",
				variant === "box"
					? ["size-5 rounded-[0.25rem] [&>svg]:size-4", colorClassName]
					: ["size-5 [&>svg]:size-5", iconColorClassName],
				className,
			)}
			aria-hidden="true"
		>
			{product.icon}
		</span>
	);
}

function ProductSelectorIcon({ product }: { product: ExampleProduct }) {
	const colorClassName = isProductSwitcherId(product.id)
		? productColorClassNames[product.id]
		: "bg-amber-500/10 text-amber-600 dark:text-amber-400";

	return (
		<span
			className={cx(
				"flex size-6 shrink-0 items-center justify-center rounded-md [&>svg]:size-5",
				colorClassName,
			)}
			aria-hidden="true"
		>
			{product.icon}
		</span>
	);
}

function AccountSelectorAvatar({
	accountId,
	accountName,
}: {
	accountId: string | undefined;
	accountName: string | undefined;
}) {
	return (
		<span className="flex size-6 shrink-0 items-center justify-center">
			<span className="sr-only">{accountName}</span>
			<Sidebar.AccountAvatar
				className="size-6! rounded-md text-xs"
				accountId={accountId}
				accountName={accountName}
			/>
		</span>
	);
}

export default function SidebarSinglePrototype() {
	const [mode, setMode] = useState<SidebarMode>({ type: "product" });
	const [currentProductId, setCurrentProductId] = useState<ProductSwitcherId>(initialProductId);
	const [productDialogOpen, setProductDialogOpen] = useState(false);
	const [activeProductId, setActiveProductId] = useState<ProductSwitcherId>(initialProductId);
	const productTriggerRef = useRef<HTMLButtonElement | null>(null);
	const productOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);
	const [pathname, setPathname] = useState(initialPath);
	const [productPathById, setProductPathById] = useState<Record<ProductSwitcherId, string>>({
		"ai-gateway": initialPathForProduct("ai-gateway"),
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
	const productSwitcherItems = productSwitcherIds.flatMap(
		(productId): Array<ExampleProduct & { id: ProductSwitcherId }> => {
			const product = productItems.find((item) => item.id === productId);
			return product && isProductSwitcherId(product.id) ? [{ ...product, id: product.id }] : [];
		},
	);
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
		setActiveProductId(productId);
		setMode({ type: "product" });
		setPathname(productPathById[productId]);
		setProductDialogOpen(false);
		window.setTimeout(() => productTriggerRef.current?.blur(), 0);
	};

	const navigateProduct = (path: string) => {
		setPathname(path);
		setProductPathById((currentPaths) => ({
			...currentPaths,
			[currentProductId]: path,
		}));
	};

	const focusProductOption = (index: number) => {
		const product = productSwitcherItems[index];
		if (product) {
			setActiveProductId(product.id);
		}
		productOptionRefs.current[index]?.focus();
	};

	const handleProductOptionKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
		const lastIndex = productSwitcherItems.length - 1;
		if (event.key === "ArrowDown") {
			event.preventDefault();
			focusProductOption(index === lastIndex ? 0 : index + 1);
		}
		if (event.key === "ArrowUp") {
			event.preventDefault();
			focusProductOption(index === 0 ? lastIndex : index - 1);
		}
		if (event.key === "Home") {
			event.preventDefault();
			focusProductOption(0);
		}
		if (event.key === "End") {
			event.preventDefault();
			focusProductOption(lastIndex);
		}
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
				<Sidebar.Header className="border-b-0 pt-6 pb-4">
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
							<span className="text-strong min-w-0 flex-1 truncate text-base">
								{currentUtility?.label ?? "Back"}
							</span>
						</button>
					) : (
						<Dialog.Root
							open={productDialogOpen}
							onOpenChange={(open) => {
								setProductDialogOpen(open);
								if (open) {
									setActiveProductId(currentProductId);
									window.setTimeout(() => {
										const activeIndex = productSwitcherItems.findIndex(
											(product) => product.id === currentProductId,
										);
										if (activeIndex >= 0) {
											focusProductOption(activeIndex);
										}
									}, 0);
								}
							}}
						>
							<Dialog.Trigger
								ref={productTriggerRef}
								className={cx(
									"text-body hover:text-strong hover:bg-neutral-500/10 flex w-full min-w-0 items-center gap-1.5 truncate rounded-md px-1.5 py-1 text-left font-medium",
									"data-state-open:bg-neutral-500/15 data-state-open:text-strong",
									"ring-focus-accent focus:outline-hidden focus-visible:ring-4",
								)}
							>
								{currentProduct ? <ProductSelectorIcon product={currentProduct} /> : null}
								<span className="text-strong min-w-0 flex-1 truncate text-left text-base">
									{productDisplayName(currentProduct)}
								</span>
								<Icon svg={<CaretDownIcon />} className="text-muted size-4 shrink-0" />
							</Dialog.Trigger>
							<Dialog.Content preferredWidth="max-w-xl" className="bg-popover">
								<Dialog.Body className="p-6">
									<Dialog.Title className="text-strong text-center text-lg font-medium">
										Choose a product
									</Dialog.Title>
									<div className="mt-6 flex flex-col gap-2">
										{productSwitcherItems.map((product, index) => {
											const copy = productDialogCopy[product.id];
											return (
												<button
													key={product.id}
													ref={(node) => {
														productOptionRefs.current[index] = node;
													}}
													type="button"
													className={cx(
														"group border-card-muted bg-card flex w-full flex-col rounded-lg border p-4 text-left shadow-sm transition-none focus:outline-hidden focus-visible:ring-4",
														productHighlightClassNames[product.id],
														product.id === activeProductId && productSelectedClassNames[product.id],
													)}
													onClick={() => switchProduct(product.id)}
													onFocus={() => setActiveProductId(product.id)}
													onKeyDown={(event) => handleProductOptionKeyDown(event, index)}
												>
													<span className="flex w-full min-w-0 items-center justify-between gap-3">
														<span className="flex min-w-0 items-center gap-3">
															<ProductIconBox
																product={product}
																className="size-7 rounded-md [&>svg]:size-5"
															/>
															<span
																className={cx(
																	"truncate text-sm font-medium",
																	isProductSwitcherId(product.id)
																		? productTextColorClassNames[product.id]
																		: "text-amber-600 dark:text-amber-400",
																)}
															>
																{productDisplayName(product)}
															</span>
														</span>
														<ArrowRightIcon
															className={cx(
																"text-muted size-5 shrink-0",
																productArrowClassNames[product.id],
																product.id === activeProductId &&
																	productTextColorClassNames[product.id],
															)}
														/>
													</span>
													<span className="text-strong mt-2 text-base font-medium leading-snug">
														{copy.title}
													</span>
													<span className="text-muted mt-1 text-pretty text-sm leading-relaxed">
														{copy.description}
													</span>
												</button>
											);
										})}
									</div>
								</Dialog.Body>
							</Dialog.Content>
						</Dialog.Root>
					)}
				</Sidebar.Header>

				<Sidebar.Body className="pt-0">
					{mode.type === "utility"
						? navForUtility(mode.utilityId, pathname, setPathname)
						: navForProduct(currentProductId, pathname, navigateProduct)}
				</Sidebar.Body>

				<Sidebar.Footer className="border-t-0 pb-3.5">
					{mode.type === "product" ? (
						<>
							{utilityItems.map((item) => {
								if (!isFooterUtilityId(item.id)) {
									return null;
								}
								const utilityId = item.id;
								return (
									<Sidebar.Item key={item.id} className="font-normal" level="top" asChild>
										<button type="button" onClick={() => openUtility(utilityId)}>
											{item.icon}
											{item.label}
										</button>
									</Sidebar.Item>
								);
							})}
							<DropdownMenu.Root modal={false}>
								<Sidebar.Item
									className="font-normal [&>svg:last-child]:size-4!"
									level="top"
									asChild
								>
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
							<div className="border-popover-muted my-3 border-t" aria-hidden="true" />
						</>
					) : null}
					<DropdownMenu.Root>
						<DropdownMenu.Trigger
							className={cx(
								"text-body hover:text-strong hover:bg-neutral-500/10 flex w-full items-center gap-1.5 rounded-md px-1.5 py-1",
								"data-state-open:bg-neutral-500/15 data-state-open:text-strong",
								"ring-focus-accent focus:outline-hidden focus-visible:ring-4",
							)}
						>
							<AccountSelectorAvatar
								accountId={currentAccount?.id}
								accountName={currentAccount?.name}
							/>
							<span className="flex min-w-0 flex-1 flex-col text-left">
								<span className="text-muted text-xs leading-none">Project</span>
								<span className="text-strong truncate text-xs font-medium">
									{currentProject?.name ?? "Project Orion"}
								</span>
							</span>
							<Sidebar.UserAvatar
								src={demoUser.pictureUrl}
								alt={demoUser.name}
								className="size-6 shrink-0"
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
								<DropdownMenu.Item className="gap-2">
									<PlusCircleIcon className="text-muted" />
									New project
								</DropdownMenu.Item>
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
