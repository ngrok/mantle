import { AlertCenter, type AlertCenterAlert } from "@ngrok/mantle/alert-center";
import { Alert } from "@ngrok/mantle/alert";
import { AppLayout } from "@ngrok/mantle/app-layout";
import { Breadcrumb } from "@ngrok/mantle/breadcrumb";
import { Button } from "@ngrok/mantle/button";
import { Main } from "@ngrok/mantle/main";
import { Sidebar } from "@ngrok/mantle/sidebar";
import { SkipToMainLink } from "@ngrok/mantle/skip-to-main-link";
import { CreditCardIcon } from "@phosphor-icons/react/CreditCard";
import { GearIcon } from "@phosphor-icons/react/Gear";
import { GraphIcon } from "@phosphor-icons/react/Graph";
import { HashIcon } from "@phosphor-icons/react/Hash";
import { TerminalWindowIcon } from "@phosphor-icons/react/TerminalWindow";
import type { ReactNode } from "react";
import { useState } from "react";

type DemoNavItem = { label: string; icon: ReactNode; path: string };

const demoNavItems: ReadonlyArray<DemoNavItem> = [
	{ label: "Endpoints", icon: <GraphIcon />, path: "/endpoints" },
	{ label: "Agents", icon: <TerminalWindowIcon />, path: "/agents" },
	{ label: "TCP Addresses", icon: <HashIcon />, path: "/tcp-addresses" },
];

/**
 * A realistic set of account-limit / usage / billing alerts for the demos —
 * one persistent revenue-recovery alert (payment failed), two dismissable
 * upgrade nags, and one informational notice. `AlertCenter` ranks them by
 * severity, so "Payment failed" always leads the bar.
 */
const demoAlerts: ReadonlyArray<AlertCenterAlert> = [
	{
		id: "new-region",
		intent: "info",
		title: "New region available: eu-west",
		description: "You can now create endpoints in the eu-west region.",
		action: { label: "Learn more", href: "#regions" },
		dismissable: true,
	},
	{
		id: "tunnel-limit",
		intent: "warning",
		title: "Tunnel limit reached",
		description: "Free accounts are limited to 4 simultaneous tunnels. Upgrade to run more.",
		action: { label: "Upgrade", href: "#upgrade" },
		dismissable: true,
	},
	{
		id: "transfer-limit",
		intent: "warning",
		title: "You've used 92% of your monthly data transfer",
		description:
			"Free accounts include 5 GB of transfer per month. Upgrade for unlimited transfer.",
		action: { label: "Upgrade", href: "#upgrade" },
		dismissable: true,
	},
	{
		id: "payment-failed",
		intent: "danger",
		title: "Payment failed — update your card",
		description:
			"We couldn't charge the card ending in 4242. Update your payment method to avoid a service interruption.",
		action: { label: "Update payment method", href: "#billing" },
	},
];

/**
 * The hero demo: `AppLayout.Notice` is the single top-of-window composition
 * slot. The alert bar is one child of it, next to any other window-level
 * notice, replacing a stack of independent window banners. The bar surfaces
 * the highest-severity alert inline; the count-and-caret control expands the other alerts as
 * full-width banners. Dismiss alerts to watch the bar re-rank (and finally
 * collapse), then reset.
 *
 * Renders as an entire framed-preview document (see preview-registry.ts), so it
 * composes exactly like a real app shell: pinned with `fixed inset-0`, a
 * `SkipToMainLink`, and `AppLayout.Content` as the real `Main` landmark.
 */
export function AlertCenterShellDemo() {
	const [pathname, setPathname] = useState("/endpoints");
	const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());

	const alerts = demoAlerts.filter((alert) => !dismissed.has(alert.id));
	const currentLabel = demoNavItems.find((item) => item.path === pathname)?.label ?? "Endpoints";

	return (
		// `md` (not the `lg` default ngrok's dashboards use) keeps the desktop
		// panel visible at the framed preview's desktop and tablet widths
		<Sidebar.Root mobileBreakpoint="md">
			<AppLayout.Root className="fixed inset-0">
				<SkipToMainLink />
				<AppLayout.Notice>
					<AlertCenter.Root
						alerts={alerts}
						onDismiss={(id) => setDismissed((prev) => new Set(prev).add(id))}
					>
						<AlertCenter.Bar />
						<AlertCenter.Content />
					</AlertCenter.Root>
				</AppLayout.Notice>
				<AppLayout.Body>
					<Sidebar.Nav aria-label="Main">
						<Sidebar.Header>
							<span className="text-strong px-2 text-base font-semibold">Acme Corp</span>
						</Sidebar.Header>
						<Sidebar.Body>
							<Sidebar.Group>
								<Sidebar.List>
									{demoNavItems.map((item) => (
										<Sidebar.Item key={item.path}>
											<Sidebar.ItemButton asChild current={pathname === item.path}>
												<a
													href={item.path}
													onClick={(event) => {
														event.preventDefault();
														setPathname(item.path);
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
						</Sidebar.Body>
						<Sidebar.Footer>
							<Sidebar.ItemButton asChild current={pathname === "/settings"}>
								<a
									href="/settings"
									onClick={(event) => {
										event.preventDefault();
										setPathname("/settings");
									}}
								>
									<GearIcon />
									Account settings
								</a>
							</Sidebar.ItemButton>
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
													Acme Corp
												</Breadcrumb.Link>
											</Breadcrumb.Item>
											<Breadcrumb.Separator />
											<Breadcrumb.Item>
												<Breadcrumb.Page>{currentLabel}</Breadcrumb.Page>
											</Breadcrumb.Item>
										</Breadcrumb.List>
									</Breadcrumb.Root>
									<Button
										type="button"
										appearance="outlined"
										intent="neutral"
										className="ml-auto"
										size="sm"
										disabled={dismissed.size === 0}
										onClick={() => setDismissed(new Set())}
									>
										Reset alerts
									</Button>
								</AppLayout.Header>
								<div className="space-y-4 p-6">
									<p className="text-muted text-sm">
										The alert bar is composed in the top-of-window notice slot. Choose the
										count-and-caret control to expand or collapse the other alert banners.
									</p>
									{Array.from({ length: 10 }, (_, index) => (
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

/**
 * A compact, non-framed demo for the docs page: the bar plus its inline
 * expansion in a shell-top-shaped container, with the sample alerts and a
 * reset control.
 */
export function AlertCenterExample() {
	const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
	const alerts = demoAlerts.filter((alert) => !dismissed.has(alert.id));

	return (
		<div className="flex w-full max-w-2xl flex-col gap-3">
			<div className="border-card-muted overflow-hidden rounded-lg border">
				<AlertCenter.Root
					alerts={alerts}
					onDismiss={(id) => setDismissed((prev) => new Set(prev).add(id))}
				>
					<AlertCenter.Bar />
					<AlertCenter.Content />
				</AlertCenter.Root>
				{alerts.length === 0 && (
					<p className="text-muted p-4 text-center text-sm">
						No active alerts — the bar has collapsed.
					</p>
				)}
			</div>
			<Button
				type="button"
				appearance="outlined"
				intent="neutral"
				size="sm"
				className="self-start"
				disabled={dismissed.size === 0}
				onClick={() => setDismissed(new Set())}
			>
				Reset alerts
			</Button>
		</div>
	);
}

/**
 * A single-alert demo: with one alert the bar shows it inline with its CTA and
 * omits the count-and-caret control entirely — there's nothing hidden to reveal.
 */
export function AlertCenterSingleAlertExample() {
	const singleAlert = [
		{
			id: "payment-failed",
			intent: "danger",
			title: "Payment failed — update your card",
			action: { label: "Update payment method", href: "#billing" },
		},
	] satisfies AlertCenterAlert[];

	return (
		<div className="border-card-muted w-full max-w-2xl overflow-hidden rounded-lg border">
			<AlertCenter.Root alerts={singleAlert}>
				<AlertCenter.Bar />
				<AlertCenter.Content />
			</AlertCenter.Root>
		</div>
	);
}

/**
 * A render-prop demo: `AlertCenter.Content` takes a function child, so each row
 * is fully composable while the count and ordering stay data-driven.
 */
export function AlertCenterCustomRowExample() {
	const alerts = [
		{
			id: "transfer-limit",
			intent: "warning",
			title: "Approaching your data transfer limit",
			action: { label: "Upgrade", href: "#upgrade" },
		},
		{
			id: "tunnel-limit",
			intent: "warning",
			title: "Tunnel limit reached",
			action: { label: "Upgrade", href: "#upgrade" },
		},
	] satisfies AlertCenterAlert[];

	return (
		<div className="border-card-muted w-full max-w-2xl overflow-hidden rounded-lg border">
			<AlertCenter.Root alerts={alerts} defaultOpen>
				<AlertCenter.Bar />
				<AlertCenter.Content>
					{(alert) => (
						<Alert.Root appearance="banner" intent={alert.intent}>
							<Alert.Icon />
							<Alert.Content>
								<Alert.Title>{alert.title}</Alert.Title>
								<CreditCardIcon className="text-muted mt-1 size-4" />
							</Alert.Content>
						</Alert.Root>
					)}
				</AlertCenter.Content>
			</AlertCenter.Root>
		</div>
	);
}
