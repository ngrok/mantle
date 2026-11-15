import { Code } from "@ngrok/mantle/code";
import { Card } from "@ngrok/mantle/card";
import { Icon } from "@ngrok/mantle/icon";
import { Tabs } from "@ngrok/mantle/tabs";
import { ArrowsSplitIcon } from "@phosphor-icons/react/ArrowsSplit";
import { BellIcon } from "@phosphor-icons/react/Bell";
import { CertificateIcon } from "@phosphor-icons/react/Certificate";
import { ChartBarIcon } from "@phosphor-icons/react/ChartBar";
import { ChartLineIcon } from "@phosphor-icons/react/ChartLine";
import { GearSixIcon } from "@phosphor-icons/react/GearSix";
import { GlobeIcon } from "@phosphor-icons/react/Globe";
import { KeyIcon } from "@phosphor-icons/react/Key";
import { ListIcon } from "@phosphor-icons/react/List";
import { LockIcon } from "@phosphor-icons/react/Lock";
import { PlugIcon } from "@phosphor-icons/react/Plug";
import { RocketLaunchIcon } from "@phosphor-icons/react/RocketLaunch";
import { ShieldCheckIcon } from "@phosphor-icons/react/ShieldCheck";
import { UserIcon } from "@phosphor-icons/react/User";
import { Link, href } from "react-router";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Tabs docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<Tabs.Root orientation="horizontal" defaultValue="account" className="w-full max-w-100">
				<Tabs.List>
					<Tabs.Trigger value="account">Account</Tabs.Trigger>
					<Tabs.Trigger value="password">Password</Tabs.Trigger>
				</Tabs.List>
				<Tabs.Separator />
				<Tabs.Content value="account">
					<Card.Root>
						<Card.Header>
							<Card.Title>Account</Card.Title>
							<p className="text-muted">
								Make changes to your account here. Click save when you&apos;re done.
							</p>
						</Card.Header>
					</Card.Root>
				</Tabs.Content>
				<Tabs.Content value="password">
					<Card.Root>
						<Card.Header>
							<Card.Title>Password</Card.Title>
							<p className="text-muted">
								Change your password here. After saving, you&apos;ll be logged out.
							</p>
						</Card.Header>
					</Card.Root>
				</Tabs.Content>
			</Tabs.Root>
		</PreviewCanvas>
	);
}

/** The "Icons" example on the Tabs docs page. */
export function IconsExample() {
	return (
		<PreviewCanvas>
			<Tabs.Root orientation="horizontal" defaultValue="tab-1">
				<Tabs.List>
					<Tabs.Trigger value="tab-1">
						<Icon svg={<GlobeIcon />} />
						Tab Title
					</Tabs.Trigger>
					<Tabs.Trigger value="tab-2">
						<Icon svg={<GlobeIcon />} />
						Tab Title
					</Tabs.Trigger>
					<Tabs.Trigger value="tab-3">
						<Icon svg={<GlobeIcon />} />
						Tab Title
					</Tabs.Trigger>
				</Tabs.List>
				<Tabs.Separator />
			</Tabs.Root>
		</PreviewCanvas>
	);
}

/** The "Badges" example on the Tabs docs page. */
export function BadgesExample() {
	return (
		<PreviewCanvas className="*:min-w-0">
			<Tabs.Root orientation="horizontal" defaultValue="tab-1">
				<Tabs.List>
					<Tabs.Trigger value="tab-1">
						Tab Title
						<Tabs.Badge>32</Tabs.Badge>
					</Tabs.Trigger>
					<Tabs.Trigger value="tab-2">
						Tab Title
						<Tabs.Badge>32</Tabs.Badge>
					</Tabs.Trigger>
					<Tabs.Trigger value="tab-3">
						<Icon svg={<GlobeIcon />} />
						Tab Title
						<Tabs.Badge>32</Tabs.Badge>
					</Tabs.Trigger>
				</Tabs.List>
				<Tabs.Separator />
			</Tabs.Root>
		</PreviewCanvas>
	);
}

/** The "Disabled tabs" example on the Tabs docs page. */
export function DisabledTabsExample() {
	return (
		<PreviewCanvas className="*:min-w-0">
			<Tabs.Root orientation="horizontal" defaultValue="tab-1">
				<Tabs.List>
					<Tabs.Trigger value="tab-1">Tab Title</Tabs.Trigger>
					<Tabs.Trigger value="tab-2">Tab Title</Tabs.Trigger>
					<Tabs.Trigger disabled value="tab-3">
						Tab Title
					</Tabs.Trigger>
					<Tabs.Trigger value="tab-4">Tab Title</Tabs.Trigger>
				</Tabs.List>
				<Tabs.Separator />
			</Tabs.Root>
		</PreviewCanvas>
	);
}

/** The "Vertical orientation" example on the Tabs docs page. */
export function VerticalOrientationExample() {
	return (
		<PreviewCanvas>
			<Tabs.Root orientation="vertical" defaultValue="account" className="max-w-xl">
				<Tabs.List>
					<Tabs.Trigger value="account">Account</Tabs.Trigger>
					<Tabs.Trigger value="password">Password</Tabs.Trigger>
				</Tabs.List>
				<Tabs.Separator />
				<Tabs.Content value="account">
					<Card.Root>
						<Card.Header>
							<Card.Title>Account</Card.Title>
							<p className="text-muted">
								Make changes to your account here. Click save when you&apos;re done.
							</p>
						</Card.Header>
					</Card.Root>
				</Tabs.Content>
				<Tabs.Content value="password">
					<Card.Root>
						<Card.Header>
							<Card.Title>Password</Card.Title>
							<p className="text-muted">
								Change your password here. After saving, you&apos;ll be logged out.
							</p>
						</Card.Header>
					</Card.Root>
				</Tabs.Content>
			</Tabs.Root>
		</PreviewCanvas>
	);
}

/** The "Polymorphism" example on the Tabs docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas>
			<Tabs.Root orientation="horizontal" defaultValue="colors">
				<Tabs.List>
					<Tabs.Trigger value="colors" asChild>
						<Link to={href("/base/colors")}>Colors</Link>
					</Tabs.Trigger>
					<Tabs.Trigger value="shadows" asChild>
						<Link to={href("/base/shadows")}>Shadows</Link>
					</Tabs.Trigger>
					<Tabs.Trigger value="typography" asChild>
						<Link to={href("/base/typography")}>Typography</Link>
					</Tabs.Trigger>
				</Tabs.List>
				<Tabs.Separator />
			</Tabs.Root>
		</PreviewCanvas>
	);
}

/** The "Horizontal overflow" example on the Tabs docs page. */
export function HorizontalOverflowExample() {
	return (
		<PreviewCanvas>
			<Tabs.Root orientation="horizontal" defaultValue="getting-started" className="w-full">
				<Tabs.List>
					<Tabs.Trigger value="getting-started">
						<Icon svg={<RocketLaunchIcon />} />
						Getting Started
					</Tabs.Trigger>
					<Tabs.Trigger value="traffic-policy">
						<Icon svg={<ArrowsSplitIcon />} />
						Traffic Policy
					</Tabs.Trigger>
					<Tabs.Trigger value="api-keys">
						<Icon svg={<KeyIcon />} />
						API Keys
					</Tabs.Trigger>
					<Tabs.Trigger value="usage">
						<Icon svg={<ChartBarIcon />} />
						Usage
					</Tabs.Trigger>
					<Tabs.Trigger value="settings">
						<Icon svg={<GearSixIcon />} />
						Settings
					</Tabs.Trigger>
					<Tabs.Trigger value="logs">
						<Icon svg={<ListIcon />} />
						Logs
					</Tabs.Trigger>
					<Tabs.Trigger value="analytics">
						<Icon svg={<ChartLineIcon />} />
						Analytics
					</Tabs.Trigger>
					<Tabs.Trigger value="integrations">
						<Icon svg={<PlugIcon />} />
						Integrations
					</Tabs.Trigger>
					<Tabs.Trigger value="domains">
						<Icon svg={<GlobeIcon />} />
						Domains
					</Tabs.Trigger>
					<Tabs.Trigger value="team">
						<Icon svg={<UserIcon />} />
						Team
					</Tabs.Trigger>
					<Tabs.Trigger value="security">
						<Icon svg={<ShieldCheckIcon />} />
						Security
					</Tabs.Trigger>
					<Tabs.Trigger value="notifications">
						<Icon svg={<BellIcon />} />
						Notifications
					</Tabs.Trigger>
					<Tabs.Trigger value="certificates">
						<Icon svg={<CertificateIcon />} />
						Certificates
					</Tabs.Trigger>
					<Tabs.Trigger value="permissions">
						<Icon svg={<LockIcon />} />
						Permissions
					</Tabs.Trigger>
				</Tabs.List>
				<Tabs.Separator />
			</Tabs.Root>
		</PreviewCanvas>
	);
}

/** The "Pill appearance" example on the Tabs docs page. */
export function PillAppearanceExample() {
	return (
		<PreviewCanvas className="grid grid-cols-1 gap-6">
			<p>
				<Code>asChild</Code> with <Code>Link</Code>s
			</p>
			<div className="scrollbar -m-1 p-1 overflow-x-scroll">
				<Tabs.Root appearance="pill" orientation="horizontal" defaultValue="colors">
					<Tabs.List>
						<Tabs.Trigger value="colors" asChild>
							<Link to={href("/base/colors")}>Colors</Link>
						</Tabs.Trigger>
						<Tabs.Trigger value="shadows" asChild>
							<Link to={href("/base/shadows")}>Shadows</Link>
						</Tabs.Trigger>
						<Tabs.Trigger disabled value="tailwind-variants" asChild>
							<Link to={href("/base/tailwind-variants")}>Tailwind Variants</Link>
						</Tabs.Trigger>
						<Tabs.Trigger value="typography" asChild>
							<Link to={href("/base/typography")}>Typography</Link>
						</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>
			</div>
			<div className="scrollbar -m-1 p-1 overflow-x-scroll">
				<Tabs.Root appearance="pill" orientation="horizontal" defaultValue="tab-1">
					<Tabs.List>
						<Tabs.Trigger value="tab-1">Tab Title</Tabs.Trigger>
						<Tabs.Trigger value="tab-2">Tab Title</Tabs.Trigger>
						<Tabs.Trigger disabled value="tab-3">
							Tab Title
						</Tabs.Trigger>
						<Tabs.Trigger value="tab-4">Tab Title</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>
			</div>
			<div className="scrollbar -m-1 p-1 overflow-x-scroll">
				<Tabs.Root appearance="pill" orientation="horizontal" defaultValue="tab-1">
					<Tabs.List>
						<Tabs.Trigger value="tab-1">
							<Icon svg={<GlobeIcon />} />
							Tab Title
						</Tabs.Trigger>
						<Tabs.Trigger value="tab-2">
							<Icon svg={<GlobeIcon />} />
							Tab Title
						</Tabs.Trigger>
						<Tabs.Trigger disabled value="tab-3">
							<Icon svg={<GlobeIcon />} />
							Tab Title
						</Tabs.Trigger>
						<Tabs.Trigger value="tab-4">
							<Icon svg={<GlobeIcon />} />
							Tab Title
						</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>
			</div>
			<div className="scrollbar -m-1 p-1 overflow-x-scroll">
				<Tabs.Root appearance="pill" orientation="horizontal" defaultValue="tab-1">
					<Tabs.List>
						<Tabs.Trigger value="tab-1">
							Tab Title
							<Tabs.Badge>32</Tabs.Badge>
						</Tabs.Trigger>
						<Tabs.Trigger value="tab-2">
							Tab Title
							<Tabs.Badge>32</Tabs.Badge>
						</Tabs.Trigger>
						<Tabs.Trigger disabled value="tab-3">
							Tab Title
							<Tabs.Badge>32</Tabs.Badge>
						</Tabs.Trigger>
						<Tabs.Trigger value="tab-4">
							Tab Title
							<Tabs.Badge>32</Tabs.Badge>
						</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>
			</div>
			<div className="scrollbar -m-1 p-1 overflow-x-scroll">
				<Tabs.Root appearance="pill" orientation="horizontal" defaultValue="tab-1">
					<Tabs.List>
						<Tabs.Trigger value="tab-1">
							<Icon svg={<GlobeIcon />} />
							Tab Title
							<Tabs.Badge>32</Tabs.Badge>
						</Tabs.Trigger>
						<Tabs.Trigger value="tab-2">
							<Icon svg={<GlobeIcon />} />
							Tab Title
							<Tabs.Badge>32</Tabs.Badge>
						</Tabs.Trigger>
						<Tabs.Trigger disabled value="tab-3">
							<Icon svg={<GlobeIcon />} />
							Tab Title
							<Tabs.Badge>32</Tabs.Badge>
						</Tabs.Trigger>
						<Tabs.Trigger value="tab-4">
							<Icon svg={<GlobeIcon />} />
							Tab Title
							<Tabs.Badge>32</Tabs.Badge>
						</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>
			</div>
			<Tabs.Root
				appearance="pill"
				orientation="horizontal"
				defaultValue="account"
				className="w-full max-w-100"
			>
				<Tabs.List>
					<Tabs.Trigger value="account">
						<Icon svg={<UserIcon />} />
						Account
						<Tabs.Badge>2</Tabs.Badge>
					</Tabs.Trigger>
					<Tabs.Trigger value="password">
						<Icon svg={<ShieldCheckIcon />} />
						Password
					</Tabs.Trigger>
				</Tabs.List>
				<Tabs.Content value="account">
					<Card.Root>
						<Card.Header>
							<Card.Title>Account</Card.Title>
							<p className="text-muted">
								Make changes to your account here. Click save when you&apos;re done.
							</p>
						</Card.Header>
					</Card.Root>
				</Tabs.Content>
				<Tabs.Content value="password">
					<Card.Root>
						<Card.Header>
							<Card.Title>Password</Card.Title>
							<p className="text-muted">
								Change your password here. After saving, you&apos;ll be logged out.
							</p>
						</Card.Header>
					</Card.Root>
				</Tabs.Content>
			</Tabs.Root>
			<Tabs.Root
				appearance="pill"
				orientation="vertical"
				defaultValue="account"
				className="scrollbar max-w-xl -m-1 p-1 overflow-x-scroll"
			>
				<Tabs.List>
					<Tabs.Trigger value="account">Account</Tabs.Trigger>
					<Tabs.Trigger value="password">Password</Tabs.Trigger>
					<Tabs.Trigger value="disabled-tab" disabled>
						Disabled tab
					</Tabs.Trigger>
				</Tabs.List>
				<Tabs.Content value="account">
					<Card.Root>
						<Card.Header>
							<Card.Title>Account</Card.Title>
							<p className="text-muted">
								Make changes to your account here. Click save when you&apos;re done.
							</p>
						</Card.Header>
					</Card.Root>
				</Tabs.Content>
				<Tabs.Content value="password">
					<Card.Root>
						<Card.Header>
							<Card.Title>Password</Card.Title>
							<p className="text-muted">
								Change your password here. After saving, you&apos;ll be logged out.
							</p>
						</Card.Header>
					</Card.Root>
				</Tabs.Content>
			</Tabs.Root>
		</PreviewCanvas>
	);
}

/** The "Separator" example on the Tabs docs page. */
export function SeparatorExample() {
	return (
		<PreviewCanvas className="grid grid-cols-1 gap-6">
			<div>
				<p className="mb-2 font-mono text-xs">with Tabs.Separator</p>
				<div className="scrollbar -m-1 p-1 overflow-x-scroll">
					<Tabs.Root orientation="horizontal" defaultValue="tab-1">
						<Tabs.List>
							<Tabs.Trigger value="tab-1">Tab Title</Tabs.Trigger>
							<Tabs.Trigger value="tab-2">Tab Title</Tabs.Trigger>
							<Tabs.Trigger value="tab-3">Tab Title</Tabs.Trigger>
						</Tabs.List>
						<Tabs.Separator />
					</Tabs.Root>
				</div>
			</div>
			<div>
				<p className="mb-2 font-mono text-xs">without</p>
				<div className="scrollbar -m-1 p-1 overflow-x-scroll">
					<Tabs.Root orientation="horizontal" defaultValue="tab-1">
						<Tabs.List>
							<Tabs.Trigger value="tab-1">Tab Title</Tabs.Trigger>
							<Tabs.Trigger value="tab-2">Tab Title</Tabs.Trigger>
							<Tabs.Trigger value="tab-3">Tab Title</Tabs.Trigger>
						</Tabs.List>
					</Tabs.Root>
				</div>
			</div>
			<div>
				<p className="mb-2 font-mono text-xs">vertical</p>
				<Tabs.Root orientation="vertical" defaultValue="tab-1" className="max-w-xl">
					<Tabs.List>
						<Tabs.Trigger value="tab-1">Tab Title</Tabs.Trigger>
						<Tabs.Trigger value="tab-2">Tab Title</Tabs.Trigger>
						<Tabs.Trigger value="tab-3">Tab Title</Tabs.Trigger>
					</Tabs.List>
					<Tabs.Separator />
					<Tabs.Content value="tab-1">
						<p className="text-muted">
							The separator runs beside the list, the full height of the root.
						</p>
					</Tabs.Content>
					<Tabs.Content value="tab-2">
						<p className="text-muted">Tab 2 content.</p>
					</Tabs.Content>
					<Tabs.Content value="tab-3">
						<p className="text-muted">Tab 3 content.</p>
					</Tabs.Content>
				</Tabs.Root>
			</div>
		</PreviewCanvas>
	);
}
