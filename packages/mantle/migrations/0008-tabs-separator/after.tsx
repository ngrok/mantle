import { Tabs, Tabs as MantleTabs } from "@ngrok/mantle/tabs";
import { Tabs as OtherTabs } from "@acme/ui";

declare const compact: boolean;
declare const hidden: boolean;
declare const show: boolean;

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

export const Compound = (
	<Tabs.Root defaultValue="account">
		<Tabs.List>
			<Tabs.Trigger value="account">Account</Tabs.Trigger>
		</Tabs.List>
		{!(compact || hidden) && <Tabs.Separator />}
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

// The aliased import is the same part.
export const Aliased = (
	<MantleTabs.Root defaultValue="account">
		<MantleTabs.List>
			<MantleTabs.Trigger value="account">Account</MantleTabs.Trigger>
		</MantleTabs.List>
		<MantleTabs.List>
			<MantleTabs.Trigger value="account">Account</MantleTabs.Trigger>
		</MantleTabs.List>
		<MantleTabs.Separator />
		<MantleTabs.Content value="account">…</MantleTabs.Content>
	</MantleTabs.Root>
);

// Negative cases: a pill list never drew a border, and a migrated list keeps
// one separator, with or without props.
export const Pill = (
	<Tabs.Root defaultValue="account" appearance="pill">
		<Tabs.List>
			<Tabs.Trigger value="account">Account</Tabs.Trigger>
		</Tabs.List>
		<Tabs.List>
			<Tabs.Trigger value="account">Account</Tabs.Trigger>
		</Tabs.List>
		{/* oxlint-disable-next-line react/no-children-prop -- a self-closing part is the shape under test */}
		<Tabs.List children={<Tabs.Trigger value="account">Account</Tabs.Trigger>} />
		<Tabs.Content value="account">…</Tabs.Content>
	</Tabs.Root>
);

export const Migrated = (
	<Tabs.Root defaultValue="account">
		<Tabs.List>
			<Tabs.Trigger value="account">Account</Tabs.Trigger>
		</Tabs.List>
		<Tabs.Separator />
		<Tabs.List>
			<Tabs.Trigger value="password">Password</Tabs.Trigger>
		</Tabs.List>
		<Tabs.Separator className="mx-4" />
		<Tabs.Content value="account">…</Tabs.Content>
	</Tabs.Root>
);

// Negative case: the nearest root decides, so a pill root inside a classic one
// gets no separator.
export const Nested = (
	<Tabs.Root defaultValue="account">
		<Tabs.Content value="account">
			<Tabs.Root defaultValue="general" appearance="pill">
				<Tabs.List>
					<Tabs.Trigger value="general">General</Tabs.Trigger>
				</Tabs.List>
				<Tabs.Content value="general">…</Tabs.Content>
			</Tabs.Root>
		</Tabs.Content>
	</Tabs.Root>
);

// Negative cases: a list with no enclosing tag cannot take a sibling, so the
// conditional list and the self-closing list keep their flag for a human.
export const Unreachable = (
	<Tabs.Root defaultValue="account">
		{show && (
			<Tabs.List>
				<Tabs.Trigger value="account">Account</Tabs.Trigger>
			</Tabs.List>
		)}
		{show && (
			<Tabs.List hideBorder={compact}>
				<Tabs.Trigger value="account">Account</Tabs.Trigger>
			</Tabs.List>
		)}
		{/* oxlint-disable-next-line react/no-children-prop -- a self-closing part is the shape under test */}
		<Tabs.List hideBorder={false} children={<Tabs.Trigger value="account">Account</Tabs.Trigger>} />
		<Tabs.Content value="account">…</Tabs.Content>
	</Tabs.Root>
);

// Negative case: another library's Tabs.List is not the part.
export const Foreign = (
	<OtherTabs.Root defaultValue="account">
		<OtherTabs.List hideBorder>
			<OtherTabs.Trigger value="account">Account</OtherTabs.Trigger>
		</OtherTabs.List>
	</OtherTabs.Root>
);
