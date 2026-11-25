import { Card } from "@ngrok/mantle/card";
import { Field } from "@ngrok/mantle/field";
import { Icon } from "@ngrok/mantle/icon";
import { HeadlessTabs, Tabs } from "@ngrok/mantle/tabs";
import { DoorOpenIcon } from "@phosphor-icons/react/DoorOpen";
import { GlobeIcon } from "@phosphor-icons/react/Globe";
import { GlobeHemisphereWestIcon } from "@phosphor-icons/react/GlobeHemisphereWest";
import { StackIcon } from "@phosphor-icons/react/Stack";
import { UserIcon } from "@phosphor-icons/react/User";
import { Link, href } from "react-router";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Tabs docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<Tabs.Root defaultValue="account" className="w-full max-w-100">
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

/** The "Appearance" example on the Tabs docs page. */
export function AppearanceExample() {
	return (
		<PreviewCanvas>
			<div className="flex flex-col items-center gap-8">
				<Field.Set className="w-auto items-center">
					<Field.Legend className="w-full text-center">Appearance classic (default)</Field.Legend>
					<Tabs.Root defaultValue="account">
						<Tabs.List aria-label="Settings, appearance classic">
							<Tabs.Trigger value="account">
								<Icon svg={<UserIcon />} />
								Account
							</Tabs.Trigger>
							<Tabs.Trigger value="members">
								Members
								<Tabs.Badge>8</Tabs.Badge>
							</Tabs.Trigger>
							<Tabs.Trigger disabled value="billing">
								Billing
							</Tabs.Trigger>
						</Tabs.List>
					</Tabs.Root>
				</Field.Set>
				<Field.Set className="w-auto items-center">
					<Field.Legend className="w-full text-center">Appearance pill</Field.Legend>
					<Tabs.Root appearance="pill" defaultValue="account">
						<Tabs.List aria-label="Settings, appearance pill">
							<Tabs.Trigger value="account">
								<Icon svg={<UserIcon />} />
								Account
							</Tabs.Trigger>
							<Tabs.Trigger value="members">
								Members
								<Tabs.Badge>8</Tabs.Badge>
							</Tabs.Trigger>
							<Tabs.Trigger disabled value="billing">
								Billing
							</Tabs.Trigger>
						</Tabs.List>
					</Tabs.Root>
				</Field.Set>
			</div>
		</PreviewCanvas>
	);
}

/** The "Icons" example on the Tabs docs page. */
export function IconsExample() {
	return (
		<PreviewCanvas>
			<Tabs.Root defaultValue="tab-1">
				<Tabs.List>
					<Tabs.Trigger value="tab-1">
						<Icon svg={<GlobeIcon />} />
						Tab title
					</Tabs.Trigger>
					<Tabs.Trigger value="tab-2">
						<Icon svg={<GlobeIcon />} />
						Tab title
					</Tabs.Trigger>
					<Tabs.Trigger value="tab-3">
						<Icon svg={<GlobeIcon />} />
						Tab title
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
			<Tabs.Root defaultValue="tab-1">
				<Tabs.List>
					<Tabs.Trigger value="tab-1">
						Tab title
						<Tabs.Badge>32</Tabs.Badge>
					</Tabs.Trigger>
					<Tabs.Trigger value="tab-2">
						Tab title
						<Tabs.Badge>32</Tabs.Badge>
					</Tabs.Trigger>
					<Tabs.Trigger value="tab-3">
						<Icon svg={<GlobeIcon />} />
						Tab title
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
			<Tabs.Root defaultValue="tab-1">
				<Tabs.List>
					<Tabs.Trigger value="tab-1">Tab title</Tabs.Trigger>
					<Tabs.Trigger value="tab-2">Tab title</Tabs.Trigger>
					<Tabs.Trigger disabled value="tab-3">
						Tab title
					</Tabs.Trigger>
					<Tabs.Trigger value="tab-4">Tab title</Tabs.Trigger>
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
					<p className="text-muted">Make changes to your account here.</p>
				</Tabs.Content>
				<Tabs.Content value="password">
					<p className="text-muted">Change your password here.</p>
				</Tabs.Content>
			</Tabs.Root>
		</PreviewCanvas>
	);
}

/** The "Separator" example on the Tabs docs page. */
export function SeparatorExample() {
	return (
		<PreviewCanvas>
			<div className="flex flex-col items-center gap-8">
				<Field.Set className="w-auto items-center">
					<Field.Legend className="w-full text-center">With Tabs.Separator</Field.Legend>
					<Tabs.Root defaultValue="tab-1">
						<Tabs.List aria-label="Sections, with separator">
							<Tabs.Trigger value="tab-1">Tab title</Tabs.Trigger>
							<Tabs.Trigger value="tab-2">Tab title</Tabs.Trigger>
							<Tabs.Trigger value="tab-3">Tab title</Tabs.Trigger>
						</Tabs.List>
						<Tabs.Separator />
					</Tabs.Root>
				</Field.Set>
				<Field.Set className="w-auto items-center">
					<Field.Legend className="w-full text-center">Without Tabs.Separator</Field.Legend>
					<Tabs.Root defaultValue="tab-1">
						<Tabs.List aria-label="Sections, without separator">
							<Tabs.Trigger value="tab-1">Tab title</Tabs.Trigger>
							<Tabs.Trigger value="tab-2">Tab title</Tabs.Trigger>
							<Tabs.Trigger value="tab-3">Tab title</Tabs.Trigger>
						</Tabs.List>
					</Tabs.Root>
				</Field.Set>
			</div>
		</PreviewCanvas>
	);
}

/** The "Horizontal overflow" example on the Tabs docs page. */
export function HorizontalOverflowExample() {
	return (
		<PreviewCanvas>
			<Tabs.Root defaultValue="getting-started" className="w-full max-w-2xl">
				<Tabs.List>
					<Tabs.Trigger value="getting-started">Getting started</Tabs.Trigger>
					<Tabs.Trigger value="traffic-policy">Traffic Policy</Tabs.Trigger>
					<Tabs.Trigger value="api-keys">API Keys</Tabs.Trigger>
					<Tabs.Trigger value="usage">Usage</Tabs.Trigger>
					<Tabs.Trigger value="settings">Settings</Tabs.Trigger>
					<Tabs.Trigger value="logs">Logs</Tabs.Trigger>
					<Tabs.Trigger value="analytics">Analytics</Tabs.Trigger>
					<Tabs.Trigger value="integrations">Integrations</Tabs.Trigger>
					<Tabs.Trigger value="domains">Domains</Tabs.Trigger>
					<Tabs.Trigger value="team">Team</Tabs.Trigger>
					<Tabs.Trigger value="security">Security</Tabs.Trigger>
					<Tabs.Trigger value="notifications">Notifications</Tabs.Trigger>
					<Tabs.Trigger value="certificates">Certificates</Tabs.Trigger>
					<Tabs.Trigger value="permissions">Permissions</Tabs.Trigger>
				</Tabs.List>
				<Tabs.Separator />
			</Tabs.Root>
		</PreviewCanvas>
	);
}

/** The "Find in page" example on the Tabs docs page. */
export function HiddenUntilFoundExample() {
	return (
		<PreviewCanvas className="*:min-w-0">
			<Tabs.Root defaultValue="npm">
				<Tabs.List>
					<Tabs.Trigger value="npm">npm</Tabs.Trigger>
					<Tabs.Trigger value="pnpm">pnpm</Tabs.Trigger>
				</Tabs.List>
				<Tabs.Separator />
				<Tabs.Content value="npm" hiddenUntilFound>
					npm install @ngrok/mantle
				</Tabs.Content>
				<Tabs.Content value="pnpm" hiddenUntilFound>
					pnpm add @ngrok/mantle
				</Tabs.Content>
			</Tabs.Root>
		</PreviewCanvas>
	);
}

/** The "Polymorphism" example on the Tabs docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas>
			<Tabs.Root defaultValue="colors">
				<Tabs.List>
					<Tabs.Trigger value="colors" asChild>
						<Link to={href("/base/colors")} target="_top">
							Colors
						</Link>
					</Tabs.Trigger>
					<Tabs.Trigger value="shadows" asChild>
						<Link to={href("/base/shadows")} target="_top">
							Shadows
						</Link>
					</Tabs.Trigger>
					<Tabs.Trigger value="typography" disabled asChild>
						<Link to={href("/base/typography")} target="_top">
							Typography
						</Link>
					</Tabs.Trigger>
				</Tabs.List>
				<Tabs.Separator />
			</Tabs.Root>
		</PreviewCanvas>
	);
}

/** The "Headless tabs" example on the Tabs docs page. */
export function HeadlessTabsExample() {
	return (
		<PreviewCanvas>
			<Card.Root className="w-full max-w-2xl">
				<HeadlessTabs.Root defaultValue="front-door">
					<HeadlessTabs.List aria-label="How it works" className="grid grid-cols-3 gap-1 p-2">
						<HeadlessTabs.Trigger
							value="front-door"
							className="group text-body hover:bg-card-hover aria-selected:bg-card-hover flex cursor-pointer flex-col items-center gap-2 rounded-md p-4 text-sm"
						>
							<Icon svg={<DoorOpenIcon />} className="size-6 group-aria-selected:text-accent-600" />
							Create one front door
						</HeadlessTabs.Trigger>
						<HeadlessTabs.Trigger
							value="agent"
							className="group text-body hover:bg-card-hover aria-selected:bg-card-hover flex cursor-pointer flex-col items-center gap-2 rounded-md p-4 text-sm"
						>
							<Icon svg={<StackIcon />} className="size-6 group-aria-selected:text-accent-600" />
							Run the agent
						</HeadlessTabs.Trigger>
						<HeadlessTabs.Trigger
							value="route"
							className="group text-body hover:bg-card-hover aria-selected:bg-card-hover flex cursor-pointer flex-col items-center gap-2 rounded-md p-4 text-sm"
						>
							<Icon
								svg={<GlobeHemisphereWestIcon />}
								className="size-6 group-aria-selected:text-accent-600"
							/>
							Route and authenticate
						</HeadlessTabs.Trigger>
					</HeadlessTabs.List>
					<Card.Body>
						<HeadlessTabs.Content value="front-door" hiddenUntilFound>
							Put one public endpoint in front of every service.
						</HeadlessTabs.Content>
						<HeadlessTabs.Content value="agent" hiddenUntilFound>
							Start the agent next to your services, in any network.
						</HeadlessTabs.Content>
						<HeadlessTabs.Content value="route" hiddenUntilFound>
							Route, transform, and authenticate each request with Traffic Policy.
						</HeadlessTabs.Content>
					</Card.Body>
				</HeadlessTabs.Root>
			</Card.Root>
		</PreviewCanvas>
	);
}
