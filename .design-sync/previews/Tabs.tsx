import {
	ArrowsSplitIcon,
	Card,
	ChartBarIcon,
	GearSixIcon,
	Icon,
	KeyIcon,
	ListIcon,
	RocketLaunchIcon,
	ShieldCheckIcon,
	Tabs,
	UserIcon,
} from "@ngrok/mantle";

export const Classic = () => (
	<Tabs.Root orientation="horizontal" defaultValue="account" className="w-full max-w-md">
		<Tabs.List>
			<Tabs.Trigger value="account">
				<Icon svg={<UserIcon />} />
				Account
				<Tabs.Badge>2</Tabs.Badge>
			</Tabs.Trigger>
			<Tabs.Trigger value="security">
				<Icon svg={<ShieldCheckIcon />} />
				Security
			</Tabs.Trigger>
		</Tabs.List>
		<Tabs.Separator />
		<Tabs.Content value="account">
			<Card.Root>
				<Card.Header>
					<Card.Title>Account</Card.Title>
					<p className="text-muted">
						Update your account name and billing email. Click save when you’re done.
					</p>
				</Card.Header>
			</Card.Root>
		</Tabs.Content>
		<Tabs.Content value="security">
			<Card.Root>
				<Card.Header>
					<Card.Title>Security</Card.Title>
					<p className="text-muted">
						Require SSO and two-factor authentication for every team member.
					</p>
				</Card.Header>
			</Card.Root>
		</Tabs.Content>
	</Tabs.Root>
);

export const Pill = () => (
	<Tabs.Root appearance="pill" orientation="horizontal" defaultValue="endpoints">
		<Tabs.List>
			<Tabs.Trigger value="endpoints">
				Endpoints
				<Tabs.Badge>12</Tabs.Badge>
			</Tabs.Trigger>
			<Tabs.Trigger value="agents">
				Agents
				<Tabs.Badge>4</Tabs.Badge>
			</Tabs.Trigger>
			<Tabs.Trigger value="domains">
				Domains
				<Tabs.Badge>3</Tabs.Badge>
			</Tabs.Trigger>
			<Tabs.Trigger disabled value="edges">
				Edges
			</Tabs.Trigger>
		</Tabs.List>
	</Tabs.Root>
);

export const WithIcons = () => (
	<Tabs.Root orientation="horizontal" defaultValue="traffic-policy">
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
			<Tabs.Trigger disabled value="logs">
				<Icon svg={<ListIcon />} />
				Logs
			</Tabs.Trigger>
		</Tabs.List>
		<Tabs.Separator />
	</Tabs.Root>
);

export const Vertical = () => (
	<Tabs.Root orientation="vertical" defaultValue="general" className="w-full max-w-xl">
		<Tabs.List>
			<Tabs.Trigger value="general">
				<Icon svg={<GearSixIcon />} />
				General
			</Tabs.Trigger>
			<Tabs.Trigger value="api-keys">
				<Icon svg={<KeyIcon />} />
				API Keys
			</Tabs.Trigger>
			<Tabs.Trigger value="audit-log" disabled>
				<Icon svg={<ListIcon />} />
				Audit log
			</Tabs.Trigger>
		</Tabs.List>
		<Tabs.Separator />
		<Tabs.Content value="general">
			<Card.Root>
				<Card.Header>
					<Card.Title>General</Card.Title>
					<p className="text-muted">
						Set your organization name and the default region for new endpoints.
					</p>
				</Card.Header>
			</Card.Root>
		</Tabs.Content>
		<Tabs.Content value="api-keys">
			<Card.Root>
				<Card.Header>
					<Card.Title>API Keys</Card.Title>
					<p className="text-muted">Create and rotate keys for the ngrok API.</p>
				</Card.Header>
			</Card.Root>
		</Tabs.Content>
	</Tabs.Root>
);

export const WithoutSeparator = () => (
	<Tabs.Root orientation="horizontal" defaultValue="overview">
		<Tabs.List>
			<Tabs.Trigger value="overview">Overview</Tabs.Trigger>
			<Tabs.Trigger value="requests">Requests</Tabs.Trigger>
			<Tabs.Trigger value="settings">Settings</Tabs.Trigger>
		</Tabs.List>
	</Tabs.Root>
);
