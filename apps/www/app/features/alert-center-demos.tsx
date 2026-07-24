import { Alert } from "@ngrok/mantle/alert";
import type { AlertCenterIntent } from "@ngrok/mantle/alert-center";
import { AlertCenter } from "@ngrok/mantle/alert-center";
import { AppLayout } from "@ngrok/mantle/app-layout";
import { Breadcrumb } from "@ngrok/mantle/breadcrumb";
import { Button } from "@ngrok/mantle/button";
import { useSessionStorage } from "@ngrok/mantle/hooks";
import { Main } from "@ngrok/mantle/main";
import { Sidebar } from "@ngrok/mantle/sidebar";
import { SkipToMainLink } from "@ngrok/mantle/skip-to-main-link";
import { GearIcon } from "@phosphor-icons/react/Gear";
import { GraphIcon } from "@phosphor-icons/react/Graph";
import { HashIcon } from "@phosphor-icons/react/Hash";
import { LightbulbIcon } from "@phosphor-icons/react/Lightbulb";
import { TerminalWindowIcon } from "@phosphor-icons/react/TerminalWindow";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

type DemoNavItem = { label: string; icon: ReactNode; path: string };

const demoNavItems: ReadonlyArray<DemoNavItem> = [
	{ label: "Endpoints", icon: <GraphIcon />, path: "/endpoints" },
	{ label: "Agents", icon: <TerminalWindowIcon />, path: "/agents" },
	{ label: "TCP Addresses", icon: <HashIcon />, path: "/tcp-addresses" },
];

/**
 * A realistic set of account-limit / usage / billing alerts, authored as
 * `AlertCenter.Item` JSX — a payment-failure alert, two upgrade nags, and an
 * informational notice, all dismissable so the demos can prove that dismissing
 * the bar's top alert promotes the next severity up. `AlertCenter` ranks them
 * by severity, so "Payment failed" leads the bar until dismissed; dismissal is
 * just the consumer unmounting an item.
 */
function DemoAlerts({
	dismissed,
	onDismiss,
}: {
	dismissed: ReadonlySet<string>;
	onDismiss: (id: string) => void;
}) {
	return (
		<>
			{!dismissed.has("new-region") && (
				<AlertCenter.Item id="new-region" intent="info">
					<Alert.Icon />
					<Alert.Content>
						<Alert.Title>
							New region available: eu-west{" "}
							<a className="font-medium" href="#regions">
								Learn more
							</a>
						</Alert.Title>
						<Alert.Description>
							You can now create endpoints in the eu-west region.
						</Alert.Description>
						<AlertCenter.DismissIconButton onClick={() => onDismiss("new-region")} />
					</Alert.Content>
				</AlertCenter.Item>
			)}
			{!dismissed.has("tunnel-limit") && (
				<AlertCenter.Item id="tunnel-limit" intent="warning">
					<Alert.Icon />
					<Alert.Content>
						<Alert.Title>
							Tunnel limit reached{" "}
							<a className="font-medium" href="#upgrade">
								Upgrade
							</a>
						</Alert.Title>
						<Alert.Description>
							Free accounts are limited to 4 simultaneous tunnels. Upgrade to run more.
						</Alert.Description>
						<AlertCenter.DismissIconButton onClick={() => onDismiss("tunnel-limit")} />
					</Alert.Content>
				</AlertCenter.Item>
			)}
			{!dismissed.has("transfer-limit") && (
				<AlertCenter.Item id="transfer-limit" intent="warning">
					<Alert.Icon />
					<Alert.Content>
						<Alert.Title>
							You&apos;ve used 92% of your monthly data transfer{" "}
							<a className="font-medium" href="#upgrade">
								Upgrade
							</a>
						</Alert.Title>
						<Alert.Description>
							Free accounts include 5 GB of transfer per month. Upgrade for unlimited transfer.
						</Alert.Description>
						<AlertCenter.DismissIconButton onClick={() => onDismiss("transfer-limit")} />
					</Alert.Content>
				</AlertCenter.Item>
			)}
			{!dismissed.has("payment-failed") && (
				<AlertCenter.Item id="payment-failed" intent="danger">
					<Alert.Icon />
					<Alert.Content>
						<Alert.Title>
							Payment failed — update your card{" "}
							<a className="font-medium" href="#billing">
								Update payment method
							</a>
						</Alert.Title>
						<Alert.Description>
							We couldn&apos;t charge the card ending in 4242. Update your payment method to avoid a
							service interruption.
						</Alert.Description>
						<AlertCenter.DismissIconButton onClick={() => onDismiss("payment-failed")} />
					</Alert.Content>
				</AlertCenter.Item>
			)}
		</>
	);
}

/**
 * The hero demo: `AppLayout.Notice` is the single top-of-window composition
 * slot. The alert bar is one child of it, next to any other window-level
 * notice, replacing a stack of independent window banners. The bar surfaces
 * the highest-severity alert inline; the count-and-caret control expands the
 * other alerts as full-width banners. Dismiss alerts to watch the bar re-rank
 * (and finally collapse), then reset.
 *
 * Renders as an entire framed-preview document (see preview-registry.ts), so it
 * composes exactly like a real app shell: pinned with `fixed inset-0`, a
 * `SkipToMainLink`, and `AppLayout.Content` as the real `Main` landmark.
 */
export function AlertCenterShellDemo() {
	const [pathname, setPathname] = useState("/endpoints");
	const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());

	const dismiss = (id: string) => setDismissed((previous) => new Set(previous).add(id));
	const currentLabel = demoNavItems.find((item) => item.path === pathname)?.label ?? "Endpoints";

	return (
		// `md` (not the `lg` default ngrok's dashboards use) keeps the desktop
		// panel visible at the framed preview's desktop and tablet widths
		<Sidebar.Root mobileBreakpoint="md">
			<AppLayout.Root className="fixed inset-0">
				<SkipToMainLink />
				<AppLayout.Notice>
					<AlertCenter.Root>
						<AlertCenter.Bar />
						<AlertCenter.Content />
						<DemoAlerts dismissed={dismissed} onDismiss={dismiss} />
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
	const dismiss = (id: string) => setDismissed((previous) => new Set(previous).add(id));

	return (
		<div className="flex w-full max-w-2xl flex-col gap-3">
			<div className="border-card-muted overflow-hidden rounded-lg border">
				<AlertCenter.Root>
					<AlertCenter.Bar />
					<AlertCenter.Content />
					<DemoAlerts dismissed={dismissed} onDismiss={dismiss} />
				</AlertCenter.Root>
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
	return (
		<div className="border-card-muted w-full max-w-2xl overflow-hidden rounded-lg border">
			<AlertCenter.Root>
				<AlertCenter.Bar />
				<AlertCenter.Content />
				<AlertCenter.Item id="payment-failed" intent="danger">
					<Alert.Icon />
					<Alert.Content>
						<Alert.Title>
							Payment failed — update your card{" "}
							<a className="font-medium" href="#billing">
								Update payment method
							</a>
						</Alert.Title>
					</Alert.Content>
				</AlertCenter.Item>
			</AlertCenter.Root>
		</div>
	);
}

/**
 * A mixed-dismissability demo: the top-ranked danger alert and the hard-limit
 * warning compose no `AlertCenter.DismissIconButton`, so resolving the
 * underlying condition is the only way to clear them; the remaining warning
 * and info alerts are acknowledgeable. Opens expanded so the per-row dismiss
 * affordances (and their absence) are visible at a glance.
 */
export function AlertCenterMixedDismissabilityExample() {
	const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
	const dismiss = (id: string) => setDismissed((previous) => new Set(previous).add(id));

	return (
		<div className="flex w-full max-w-2xl flex-col gap-3">
			<div className="border-card-muted overflow-hidden rounded-lg border">
				<AlertCenter.Root defaultOpen>
					<AlertCenter.Bar />
					<AlertCenter.Content />
					<AlertCenter.Item id="payment-failed" intent="danger">
						<Alert.Icon />
						<Alert.Content>
							<Alert.Title>
								Payment failed — update your card{" "}
								<a className="font-medium" href="#billing">
									Update payment method
								</a>
							</Alert.Title>
						</Alert.Content>
					</AlertCenter.Item>
					<AlertCenter.Item id="tunnel-limit" intent="warning">
						<Alert.Icon />
						<Alert.Content>
							<Alert.Title>
								Tunnel limit reached — new tunnels are blocked{" "}
								<a className="font-medium" href="#upgrade">
									Upgrade
								</a>
							</Alert.Title>
						</Alert.Content>
					</AlertCenter.Item>
					{!dismissed.has("transfer-limit") && (
						<AlertCenter.Item id="transfer-limit" intent="warning">
							<Alert.Icon />
							<Alert.Content>
								<Alert.Title>
									You&apos;ve used 92% of your monthly data transfer{" "}
									<a className="font-medium" href="#upgrade">
										Upgrade
									</a>
								</Alert.Title>
								<AlertCenter.DismissIconButton onClick={() => dismiss("transfer-limit")} />
							</Alert.Content>
						</AlertCenter.Item>
					)}
					{!dismissed.has("new-region") && (
						<AlertCenter.Item id="new-region" intent="info">
							<Alert.Icon />
							<Alert.Content>
								<Alert.Title>
									New region available: eu-west{" "}
									<a className="font-medium" href="#regions">
										Learn more
									</a>
								</Alert.Title>
								<AlertCenter.DismissIconButton onClick={() => dismiss("new-region")} />
							</Alert.Content>
						</AlertCenter.Item>
					)}
				</AlertCenter.Root>
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

/** One currently-true alert condition, as a backend would report it. */
type ServerAlert = {
	id: string;
	intent: AlertCenterIntent;
	title: string;
	cta: string;
	href: string;
};

const serverAlertCatalog: ReadonlyArray<ServerAlert> = [
	{
		id: "payment-failed",
		intent: "danger",
		title: "Payment failed — update your card",
		cta: "Update payment method",
		href: "#billing",
	},
	{
		id: "transfer-limit",
		intent: "warning",
		title: "You've used 92% of your monthly data transfer",
		cta: "Upgrade",
		href: "#upgrade",
	},
	{
		id: "new-region",
		intent: "info",
		title: "New region available: eu-west",
		cta: "Learn more",
		href: "#regions",
	},
];

/**
 * Decodes the sessionStorage dismissal entry (a JSON array of alert ids). A
 * corrupt entry resolves to "nothing dismissed" instead of throwing.
 */
function parseDismissedIds(raw: string): ReadonlyArray<string> {
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			return [];
		}
		return parsed.filter((entry): entry is string => typeof entry === "string");
	} catch {
		return [];
	}
}

/**
 * The persistence + server-state reconciliation demo: dismissed ids live in
 * sessionStorage (per tab, survives reloads), the "server" keeps reporting
 * the currently-true conditions, and the client filters that list against the
 * dismissed set before mounting items. Dismissals for conditions the server
 * no longer reports are pruned, so a condition that clears and later recurs
 * resurfaces instead of staying silenced. As its dismissability policy (a
 * best practice, not an API constraint), this demo withholds the dismiss
 * button from danger alerts.
 */
export function AlertCenterPersistedDismissExample() {
	// Simulated backend state: which conditions are currently true. The
	// resolve/re-raise button toggles the transfer-limit condition.
	const [serverAlerts, setServerAlerts] = useState(serverAlertCatalog);
	const transferActive = serverAlerts.some((alert) => alert.id === "transfer-limit");

	const [dismissedRaw, setDismissedRaw] = useSessionStorage("docs-alert-center-dismissed", "[]");
	const dismissed = useMemo(() => new Set(parseDismissedIds(dismissedRaw)), [dismissedRaw]);
	const dismiss = (id: string) => setDismissedRaw(JSON.stringify([...dismissed, id]));

	// Reconcile: a dismissal only suppresses the occurrence the server is
	// still reporting. When a condition clears server-side, forget its
	// dismissal so a future recurrence resurfaces.
	useEffect(() => {
		const activeIds = new Set(serverAlerts.map((alert) => alert.id));
		const pruned = [...dismissed].filter((id) => activeIds.has(id));
		if (pruned.length !== dismissed.size) {
			setDismissedRaw(JSON.stringify(pruned));
		}
	}, [serverAlerts, dismissed, setDismissedRaw]);

	return (
		<div className="flex w-full max-w-2xl flex-col gap-3">
			<div className="border-card-muted overflow-hidden rounded-lg border">
				<AlertCenter.Root>
					<AlertCenter.Bar />
					<AlertCenter.Content />
					{serverAlerts
						.filter((alert) => !dismissed.has(alert.id))
						.map((alert) => (
							<AlertCenter.Item key={alert.id} id={alert.id} intent={alert.intent}>
								<Alert.Icon />
								<Alert.Content>
									<Alert.Title>
										{alert.title}{" "}
										<a className="font-medium" href={alert.href}>
											{alert.cta}
										</a>
									</Alert.Title>
									{alert.intent !== "danger" && (
										<AlertCenter.DismissIconButton onClick={() => dismiss(alert.id)} />
									)}
								</Alert.Content>
							</AlertCenter.Item>
						))}
				</AlertCenter.Root>
			</div>
			<div className="flex gap-2">
				<Button
					type="button"
					appearance="outlined"
					intent="neutral"
					size="sm"
					onClick={() =>
						setServerAlerts((previous) =>
							transferActive
								? previous.filter((alert) => alert.id !== "transfer-limit")
								: serverAlertCatalog,
						)
					}
				>
					{transferActive ? "Resolve transfer limit on the server" : "Re-raise transfer limit"}
				</Button>
				<Button
					type="button"
					appearance="outlined"
					intent="neutral"
					size="sm"
					disabled={dismissed.size === 0}
					onClick={() => setDismissedRaw("[]")}
				>
					Reset dismissals
				</Button>
			</div>
		</div>
	);
}

/**
 * A custom-content demo: each alert's banner is authored JSX, so anything
 * composes — a custom icon, placement-aware extras, arbitrary elements. The
 * usage tip renders a lightbulb instead of the intent icon, and its detail
 * line is marked `in-data-[placement=bar]:hidden` so it appears only in the
 * expansion rows (the same mechanism the bar uses to hide
 * `Alert.Description`).
 */
export function AlertCenterCustomContentExample() {
	return (
		<div className="border-card-muted w-full max-w-2xl overflow-hidden rounded-lg border">
			<AlertCenter.Root defaultOpen>
				<AlertCenter.Bar />
				<AlertCenter.Content />
				<AlertCenter.Item id="transfer-limit" intent="warning">
					<Alert.Icon />
					<Alert.Content>
						<Alert.Title>
							Approaching your data transfer limit{" "}
							<a className="font-medium" href="#upgrade">
								Upgrade
							</a>
						</Alert.Title>
					</Alert.Content>
				</AlertCenter.Item>
				<AlertCenter.Item id="usage-tip" intent="info">
					<Alert.Icon svg={<LightbulbIcon />} />
					<Alert.Content>
						<Alert.Title>
							Tip: agent version <code>3.24</code> reconnects dropped tunnels automatically.
						</Alert.Title>
						<p className="in-data-[placement=bar]:hidden text-sm">
							Run <code>ngrok update</code> to get the latest agent.
						</p>
					</Alert.Content>
				</AlertCenter.Item>
			</AlertCenter.Root>
		</div>
	);
}
