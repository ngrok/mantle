import { DropdownMenu } from "@ngrok/mantle/dropdown-menu";
import { Icon } from "@ngrok/mantle/icon";
import { AutoThemeIcon, ThemeIcon } from "@ngrok/mantle/icons";
import { Sidebar } from "@ngrok/mantle/sidebar";
import { Tooltip } from "@ngrok/mantle/tooltip";
import { $theme, isTheme, useTheme } from "@ngrok/mantle/theme";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/ArrowsClockwise";
import { BookIcon } from "@phosphor-icons/react/Book";
import { CreditCardIcon } from "@phosphor-icons/react/CreditCard";
import { DoorOpenIcon } from "@phosphor-icons/react/DoorOpen";
import { GearIcon } from "@phosphor-icons/react/Gear";
import { MegaphoneIcon } from "@phosphor-icons/react/Megaphone";
import { QuestionIcon } from "@phosphor-icons/react/Question";
import { SignOutIcon } from "@phosphor-icons/react/SignOut";
import { UserCircleIcon } from "@phosphor-icons/react/UserCircle";
import { useState } from "react";

import { AccountSettingsNav, getAccountSettingsPage } from "./account-settings-nav";
import { AiGatewayNav } from "./ai-gateway-nav";
import { CodenameNav } from "./codename-nav";
import { demoAccounts, demoUser } from "./demo-data";
import { IamNav, getIamPage } from "./iam-nav";
import { LocalhostNav } from "./localhost-nav";
import { type ExampleProduct, type ProductId, productItems, utilityItems } from "./products";
import { UniversalGatewayNav } from "./universal-gateway-nav";
import { UsageNav } from "./usage-nav";

const initialProductId: ProductId = "universal-gateway";
const initialPath = "/endpoints";

const railTriggerBaseClassName =
	"ring-focus-accent flex size-10 shrink-0 items-center justify-center transition-none hover:bg-neutral-500/10 focus:outline-hidden focus-visible:ring-4";
// 4px padding around a `rounded-md` (6px) inner avatar → 10px outer for true concentric corners.
const railAccountTriggerClassName = `${railTriggerBaseClassName} rounded-[0.625rem]`;
const railUserTriggerClassName = `${railTriggerBaseClassName} rounded-full`;

function navForProduct(productId: ProductId, pathname: string, onNavigate: (path: string) => void) {
	if (productId === "account-settings") {
		return <AccountSettingsNav pathname={pathname} onNavigate={onNavigate} />;
	}
	if (productId === "usage") {
		return <UsageNav pathname={pathname} onNavigate={onNavigate} />;
	}
	if (productId === "iam") {
		return <IamNav pathname={pathname} onNavigate={onNavigate} />;
	}
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

/**
 * The recommended default. A two-column layout with a fixed icon rail on the
 * far left that holds (top-to-bottom) the account avatar, the product
 * switcher, and the signed-in user's avatar. The middle column holds the
 * selected product's nav, and the content pane floats as a rounded card
 * inset from the sidebar and window edges.
 */
export function IconRailDemo() {
	const [currentProductId, setCurrentProductId] = useState<ProductId>(initialProductId);
	const [pathname, setPathname] = useState(initialPath);
	const [currentAccountId, setCurrentAccountId] = useState(demoAccounts[0]?.id ?? "");
	const [currentTheme, setTheme] = useTheme();

	const allItems = [...productItems, ...utilityItems];
	const currentProduct: ExampleProduct | undefined = allItems.find(
		(product) => product.id === currentProductId,
	);
	const currentAccount = demoAccounts.find((account) => account.id === currentAccountId);

	return (
		<div className="bg-base border-base-muted flex h-[600px] w-full overflow-hidden rounded-md border">
			<Sidebar.Rail aria-label="Primary navigation" className="bg-transparent">
				<DropdownMenu.Root>
					<DropdownMenu.Trigger asChild>
						<button
							type="button"
							className={railAccountTriggerClassName}
							aria-label={`Account: ${currentAccount?.name ?? "current"}`}
						>
							<Sidebar.AccountAvatar
								accountId={currentAccount?.id}
								accountName={currentAccount?.name}
								className="size-8 text-sm"
							/>
						</button>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content side="right" align="start" className="min-w-56">
						<DropdownMenu.Label className="text-muted truncate text-xs font-medium">
							{currentAccount?.name}
						</DropdownMenu.Label>
						<DropdownMenu.Item asChild>
							<button type="button" className="flex w-full items-center gap-2">
								<GearIcon className="text-muted" />
								Account settings
							</button>
						</DropdownMenu.Item>
						<DropdownMenu.Item asChild>
							<button type="button" className="flex w-full items-center gap-2">
								<CreditCardIcon className="text-muted" />
								Manage subscription
							</button>
						</DropdownMenu.Item>
						<DropdownMenu.Sub>
							<DropdownMenu.SubTrigger className="gap-2">
								<ArrowsClockwiseIcon className="text-muted size-5" />
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
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>
					</DropdownMenu.Content>
				</DropdownMenu.Root>

				{productItems.map((product) => (
					<Tooltip.Root key={product.id}>
						<Tooltip.Trigger asChild>
							<Sidebar.RailItem
								icon={product.icon}
								label={product.label}
								active={product.id === currentProductId}
								onClick={() => setCurrentProductId(product.id)}
							/>
						</Tooltip.Trigger>
						<Tooltip.Content side="right">{product.label}</Tooltip.Content>
					</Tooltip.Root>
				))}

				{utilityItems.map((item) => (
					<Tooltip.Root key={item.id}>
						<Tooltip.Trigger asChild>
							<Sidebar.RailItem
								icon={item.icon}
								label={item.label}
								active={item.id === currentProductId}
								onClick={() => setCurrentProductId(item.id)}
							/>
						</Tooltip.Trigger>
						<Tooltip.Content side="right">{item.label}</Tooltip.Content>
					</Tooltip.Root>
				))}

				<DropdownMenu.Root>
					<DropdownMenu.Trigger asChild>
						<button
							type="button"
							className={`${railUserTriggerClassName} mt-auto`}
							aria-label={`Signed in as ${demoUser.name}`}
						>
							<Sidebar.UserAvatar
								src={demoUser.pictureUrl}
								alt={demoUser.name}
								className="size-8"
							/>
						</button>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content side="right" align="end" className="min-w-56">
						<DropdownMenu.Label className="text-muted truncate text-xs font-medium">
							{demoUser.email}
						</DropdownMenu.Label>
						<DropdownMenu.Item asChild>
							<button type="button" className="flex w-full items-center gap-2">
								<UserCircleIcon className="text-muted" />
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
						<DropdownMenu.Separator />
						<DropdownMenu.Item asChild>
							<button type="button" className="flex w-full items-center gap-2">
								<SignOutIcon className="text-muted" />
								Log out
							</button>
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</Sidebar.Rail>

			<Sidebar.Root
				aria-label={`${currentProduct?.label ?? "Product"} navigation`}
				className="border-r-0 bg-transparent"
			>
				<Sidebar.Header className="border-b-0 pb-0">
					<h2 className="text-strong flex h-10 items-center truncate px-1 text-base font-medium">
						{currentProduct?.label}
					</h2>
				</Sidebar.Header>

				<Sidebar.Body className="pt-1">
					{navForProduct(currentProductId, pathname, setPathname)}
				</Sidebar.Body>

				<Sidebar.Footer>
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
							href="https://ngrok.com/docs"
							rel="noopener"
							target="_blank"
							className="flex items-center gap-2"
						>
							<BookIcon />
							Documentation
						</a>
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
				</Sidebar.Footer>
			</Sidebar.Root>

			<main className="bg-card border-card-muted my-2 mr-2 flex flex-1 items-center justify-center rounded-xl border shadow-sm">
				<PagePreview
					productId={currentProductId}
					productLabel={currentProduct?.label}
					pathname={pathname}
				/>
			</main>
		</div>
	);
}

function PagePreview({
	pathname,
	productId,
	productLabel,
}: {
	pathname: string;
	productId: ProductId;
	productLabel: string | undefined;
}) {
	if (productId === "account-settings") {
		const page = getAccountSettingsPage(pathname);
		return (
			<div className="w-full max-w-sm px-6">
				<div className="text-strong text-lg font-medium">{page?.label ?? "Settings"}</div>
				<div className="text-muted mt-1 text-sm">{pathname}</div>
				{page?.details ? (
					<ul className="mt-4 space-y-2 text-sm text-body">
						{page.details.map((detail) => (
							<li key={detail}>{detail}</li>
						))}
					</ul>
				) : null}
			</div>
		);
	}
	if (productId === "iam") {
		const page = getIamPage(pathname);
		return (
			<div className="w-full max-w-sm px-6">
				<div className="text-strong text-lg font-medium">{page?.label ?? "IAM"}</div>
				<div className="text-muted mt-1 text-sm">{pathname}</div>
				{page?.details ? (
					<ul className="mt-4 space-y-2 text-sm text-body">
						{page.details.map((detail) => (
							<li key={detail}>{detail}</li>
						))}
					</ul>
				) : null}
			</div>
		);
	}

	return (
		<div className="text-muted text-center">
			<div className="text-lg font-medium">{productLabel}</div>
			<div className="text-sm">{pathname}</div>
		</div>
	);
}
