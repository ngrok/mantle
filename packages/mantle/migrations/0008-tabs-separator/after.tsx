import { Tabs } from "@ngrok/mantle/tabs";

declare const compact: boolean;

export const Classic = (
	<Tabs.Root defaultValue="account">
		<Tabs.List>
			<Tabs.Trigger value="account">Account</Tabs.Trigger>
			<Tabs.Trigger value="password">Password</Tabs.Trigger>
		</Tabs.List>
		<Tabs.Separator />
		<Tabs.Content value="account">…</Tabs.Content>
		<Tabs.Content value="password">…</Tabs.Content>
	</Tabs.Root>
);

export const Hidden = (
	<Tabs.Root defaultValue="account">
		<Tabs.List>
			<Tabs.Trigger value="account">Account</Tabs.Trigger>
		</Tabs.List>
		<Tabs.Content value="account">…</Tabs.Content>
	</Tabs.Root>
);

export const Dynamic = (
	<Tabs.Root defaultValue="account">
		<Tabs.List>
			<Tabs.Trigger value="account">Account</Tabs.Trigger>
		</Tabs.List>
		{!compact && <Tabs.Separator />}
		<Tabs.Content value="account">…</Tabs.Content>
	</Tabs.Root>
);

export const Shown = (
	<Tabs.Root defaultValue="account">
		<Tabs.List>
			<Tabs.Trigger value="account">Account</Tabs.Trigger>
		</Tabs.List>
		<Tabs.Separator />
		<Tabs.Content value="account">…</Tabs.Content>
	</Tabs.Root>
);

export const InsideWrapper = (
	<Tabs.Root defaultValue="overview" className="h-full gap-0">
		<div className="shrink-0 px-6 pt-4">
			<h1>Endpoint</h1>
			<Tabs.List>
				<Tabs.Trigger value="overview">Overview</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Separator />
		</div>
		<Tabs.Content value="overview">…</Tabs.Content>
	</Tabs.Root>
);

// Negative cases: a pill list never drew a border, and a migrated list keeps one separator.
export const Pill = (
	<Tabs.Root defaultValue="account" appearance="pill">
		<Tabs.List>
			<Tabs.Trigger value="account">Account</Tabs.Trigger>
		</Tabs.List>
		<Tabs.Content value="account">…</Tabs.Content>
	</Tabs.Root>
);

export const Migrated = (
	<Tabs.Root defaultValue="account">
		<Tabs.List>
			<Tabs.Trigger value="account">Account</Tabs.Trigger>
		</Tabs.List>
		<Tabs.Separator />
		<Tabs.Content value="account">…</Tabs.Content>
	</Tabs.Root>
);
