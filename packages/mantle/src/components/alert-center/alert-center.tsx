"use client";

import { XIcon } from "@phosphor-icons/react/X";
import type { ComponentProps, ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";
import invariant from "tiny-invariant";
import { cx } from "../../utils/cx/cx.js";
import { Alert } from "../alert/alert.js";
import { Badge } from "../badge/badge.js";
import { Button } from "../button/button.js";
import { IconButton } from "../button/icon-button.js";
import { Dialog } from "../dialog/dialog.js";

/**
 * The tone an alert's color communicates — identical to `Alert`'s intent axis,
 * so an alert's `intent` flows straight through to the `Alert` card that
 * renders it.
 */
type AlertCenterIntent = "danger" | "important" | "info" | "success" | "warning";

/**
 * Highest-severity-first ranking used to pick the alert shown in the bar and to
 * order the list in the dialog. Kept as a plain lookup so ordering is a pure,
 * testable function of the data — never incidental DOM/mount order (the exact
 * bug that made the old stacked banners unpredictable).
 */
const SEVERITY_RANK = {
	danger: 5,
	warning: 4,
	important: 3,
	info: 2,
	success: 1,
} as const satisfies Record<AlertCenterIntent, number>;

/**
 * The call-to-action on an alert — either a link (`href`, the common
 * "Upgrade" / "Update payment method" case) or an in-app callback
 * (`onSelect`). Modeled as a discriminated union so a link and a handler can
 * never be supplied together.
 */
type AlertCenterAction = { label: string; href: string } | { label: string; onSelect: () => void };

/**
 * A single account alert. The `title` / `titleText` pair makes an invalid
 * state unrepresentable at the type level: a rich `ReactNode` title REQUIRES a
 * plain-string `titleText` (used for the live-region announcement and
 * accessible names), while a plain-string title needs no duplicate.
 */
type AlertCenterAlert = {
	/** Stable identity — used for the React key and for `onDismiss`. */
	id: string;
	/** The tone the alert's color communicates; flows through to its `Alert` card. */
	intent: AlertCenterIntent;
	/** Optional supporting copy shown under the title inside the dialog. */
	description?: ReactNode;
	/** Optional call-to-action (the conversion moment: "Upgrade", "Update card", …). */
	action?: AlertCenterAction;
	/** When `true`, the alert renders a dismiss affordance wired to `onDismiss`. */
	dismissable?: boolean;
} & ({ title: string; titleText?: never } | { title: ReactNode; titleText: string });

/**
 * The plain-text form of an alert's title, for the live-region announcement and
 * accessible names (dismiss labels). Total by construction: the
 * `AlertCenterAlert` union guarantees a `titleText` whenever `title` is not
 * already a string.
 *
 * @example
 * ```ts
 * alertTitleText({ id: "x", intent: "danger", title: "Payment failed" }); // "Payment failed"
 * ```
 */
function alertTitleText(alert: AlertCenterAlert): string {
	if (alert.titleText != null) {
		return alert.titleText;
	}
	return typeof alert.title === "string" ? alert.title : "";
}

/**
 * Rank alerts highest-severity-first. Uses a stable sort, so alerts that share
 * an intent keep their incoming order — ordering is fully determined by the
 * data the caller passes, not by render timing.
 *
 * @example
 * ```ts
 * sortAlertsBySeverity([
 *   { id: "a", intent: "info", title: "A" },
 *   { id: "b", intent: "danger", title: "B" },
 * ]); // [{ id: "b", … }, { id: "a", … }]
 * ```
 */
function sortAlertsBySeverity(alerts: readonly AlertCenterAlert[]): AlertCenterAlert[] {
	return alerts.toSorted((a, b) => SEVERITY_RANK[b.intent] - SEVERITY_RANK[a.intent]);
}

/**
 * The screen-reader announcement for a set of alerts: the highest-severity
 * alert's title, plus a count of the rest. Empty when there are no alerts. Fed
 * to a persistent visually-hidden live region so arrivals and re-ranks are
 * announced (a live region must already exist before its text changes).
 *
 * @example
 * ```ts
 * alertsSummary(sortAlertsBySeverity(alerts)); // "Payment failed, and 2 more alerts"
 * ```
 */
function alertsSummary(sortedAlerts: readonly AlertCenterAlert[]): string {
	const [top] = sortedAlerts;
	if (top == null) {
		return "";
	}
	const remaining = sortedAlerts.length - 1;
	if (remaining === 0) {
		return alertTitleText(top);
	}
	return `${alertTitleText(top)}, and ${remaining} more alert${remaining === 1 ? "" : "s"}`;
}

type AlertCenterContextValue = {
	/** Alerts, sorted highest-severity-first. */
	alerts: readonly AlertCenterAlert[];
	/** `alerts.length`. */
	count: number;
	/** The highest-severity alert (shown inline in the bar), or `null` when empty. */
	topAlert: AlertCenterAlert | null;
	/** Dismiss handler forwarded from `AlertCenter.Root`. */
	onDismiss?: (id: string) => void;
};

const AlertCenterContext = createContext<AlertCenterContextValue | null>(null);

function useAlertCenterContext(): AlertCenterContextValue {
	const context = useContext(AlertCenterContext);
	invariant(context, "AlertCenter parts must be rendered inside <AlertCenter.Root>.");
	return context;
}

/**
 * Renders an alert's call-to-action as an accent-filled button — the mantle
 * upgrade-CTA idiom. A link action renders an anchor (via `asChild`); a
 * callback action renders a real button.
 */
function AlertAction({ action }: { action: AlertCenterAction }) {
	if ("href" in action) {
		return (
			<Button asChild appearance="filled" intent="accent" size="sm">
				<a href={action.href}>{action.label}</a>
			</Button>
		);
	}

	return (
		<Button type="button" appearance="filled" intent="accent" size="sm" onClick={action.onSelect}>
			{action.label}
		</Button>
	);
}

/**
 * The default row rendered for each alert inside the dialog list: an `Alert`
 * card carrying the intent icon, title, optional description, optional CTA, and
 * an optional dismiss button. Consumers can replace this via
 * `AlertCenter.Content`'s render-prop child.
 */
function DefaultAlertCard({ alert }: { alert: AlertCenterAlert }) {
	const { onDismiss } = useAlertCenterContext();

	return (
		<Alert.Root intent={alert.intent}>
			<Alert.Icon />
			<Alert.Content>
				<Alert.Title>{alert.title}</Alert.Title>
				{alert.description != null && <Alert.Description>{alert.description}</Alert.Description>}
				{alert.action != null && (
					<div className="mt-2">
						<AlertAction action={alert.action} />
					</div>
				)}
				{alert.dismissable && onDismiss != null && (
					<Alert.DismissIconButton
						label={`Dismiss ${alertTitleText(alert)}`}
						onClick={() => onDismiss(alert.id)}
					/>
				)}
			</Alert.Content>
		</Alert.Root>
	);
}

/**
 * Props for {@link AlertCenter.Root} — the alerts data plus the dialog's open
 * state. `AlertCenter.Root` owns both and publishes the ranked alerts on
 * context to `AlertCenter.Bar` and `AlertCenter.Content`.
 */
type AlertCenterRootProps = {
	/**
	 * The full set of active alerts. `AlertCenter` treats these as data: it
	 * derives the count, the highest-severity "top" alert, and the ranked list
	 * from this array, so aggregation/ordering is a pure function of the data
	 * rather than of which banners happened to mount.
	 */
	alerts: readonly AlertCenterAlert[];
	/**
	 * Called with an alert's `id` when its dismiss affordance is activated. The
	 * consumer owns removal (and any persistence, e.g. `sessionStorage`);
	 * `AlertCenter` re-derives everything from the next `alerts` array.
	 */
	onDismiss?: (id: string) => void;
	/** Controlled open state of the dialog. */
	open?: boolean;
	/** Uncontrolled initial open state of the dialog. */
	defaultOpen?: boolean;
	/** Called when the dialog requests to open or close. */
	onOpenChange?: (open: boolean) => void;
	children?: ReactNode;
};

/**
 * The state + data owner. Renderless beyond the underlying `Dialog.Root`
 * (the `Sidebar.Root` / `Tooltip.Root` precedent): it ranks the alerts,
 * publishes them on context, and hosts the dialog's open state. Place it as a
 * child of `AppLayout.Root` between `AppLayout.Notice` and `AppLayout.Body`.
 *
 * @see https://mantle.ngrok.com/components/preview/alert-center#alertcenterroot
 *
 * @example
 * ```tsx
 * <AlertCenter.Root alerts={alerts} onDismiss={dismiss}>
 *   <AlertCenter.Bar />
 *   <AlertCenter.Content />
 * </AlertCenter.Root>
 * ```
 */
const Root = ({
	alerts,
	children,
	defaultOpen,
	onDismiss,
	onOpenChange,
	open,
}: AlertCenterRootProps) => {
	const sorted = useMemo(() => sortAlertsBySeverity(alerts), [alerts]);
	const context = useMemo<AlertCenterContextValue>(
		() => ({
			alerts: sorted,
			count: sorted.length,
			topAlert: sorted[0] ?? null,
			onDismiss,
		}),
		[sorted, onDismiss],
	);

	return (
		<AlertCenterContext.Provider value={context}>
			<Dialog.Root defaultOpen={defaultOpen} onOpenChange={onOpenChange} open={open}>
				{children}
			</Dialog.Root>
			{/*
			 * A persistent, always-mounted live region. Screen readers only
			 * announce a polite region reliably when it already exists in the
			 * accessibility tree before its text changes — so the announcer lives
			 * here in the always-mounted Root (not on AlertCenter.Bar, which
			 * unmounts when empty), and only its text content swaps. This is why
			 * the visual Bar carries no role/aria-live of its own.
			 */}
			<div className="sr-only" role="status" aria-live="polite">
				{alertsSummary(sorted)}
			</div>
		</AlertCenterContext.Provider>
	);
};

type AlertCenterBarProps = Omit<ComponentProps<typeof Alert.Root>, "appearance" | "intent">;

/**
 * The always-visible, full-width strip. It surfaces the single highest-severity
 * alert INLINE — icon, title, and its call-to-action — so the top CTA is one
 * glance (and zero extra clicks) away, then offers a "+N more" trigger that
 * opens the dialog with the full list. Collapses to nothing when there are no
 * alerts (like `AppLayout.Notice`), so it can stay mounted and render
 * conditionally.
 *
 * The bar itself claims NO ARIA landmark (deliberately, like `AppLayout.Notice`)
 * — arrivals and re-ranks are announced by a persistent visually-hidden
 * `role="status"` region that `AlertCenter.Root` mounts.
 *
 * Known preview limitation: dismissing the top alert can unmount its dismiss
 * button (when the next alert isn't dismissable, or the bar collapses), which
 * drops keyboard focus to `<body>`. A production build should redirect focus to
 * a stable target.
 *
 * @see https://mantle.ngrok.com/components/preview/alert-center#alertcenterbar
 *
 * @example
 * ```tsx
 * <AlertCenter.Root alerts={alerts} onDismiss={dismiss}>
 *   <AlertCenter.Bar />
 *   <AlertCenter.Content />
 * </AlertCenter.Root>
 * ```
 */
const Bar = ({ className, ref, ...props }: AlertCenterBarProps) => {
	const { count, onDismiss, topAlert } = useAlertCenterContext();

	// No alerts → collapse the strip to nothing, mirroring AppLayout.Notice.
	if (topAlert == null) {
		return null;
	}

	const remaining = count - 1;

	return (
		<Alert.Root
			ref={ref}
			appearance="banner"
			intent={topAlert.intent}
			className={cx("shrink-0 items-center gap-2 py-2 pr-2", className)}
			{...props}
			// after the spread so consumers can't drop the styling/testing hook
			data-slot="alert-center-bar"
		>
			<Alert.Icon className="shrink-0" />
			<span className="min-w-0 flex-1 truncate font-medium">{topAlert.title}</span>
			{topAlert.action != null && <AlertAction action={topAlert.action} />}
			{remaining > 0 && (
				<Dialog.Trigger asChild>
					<Button type="button" appearance="ghost" intent="neutral" size="sm">
						+{remaining} more
						{/* keep the accessible name label-in-name compliant (WCAG 2.5.3):
						    it begins with the visible "+N more" text, then adds context */}
						<span className="sr-only"> — show all {count} alerts</span>
					</Button>
				</Dialog.Trigger>
			)}
			{topAlert.dismissable && onDismiss != null && (
				<IconButton
					type="button"
					appearance="ghost"
					intent="neutral"
					size="sm"
					icon={<XIcon />}
					label={`Dismiss ${alertTitleText(topAlert)}`}
					onClick={() => onDismiss(topAlert.id)}
				/>
			)}
		</Alert.Root>
	);
};

type AlertCenterContentProps = Omit<ComponentProps<typeof Dialog.Content>, "children"> & {
	/**
	 * Optional render-prop for a custom row. Receives each alert (in ranked
	 * order) and its index; return whatever should render inside that row's
	 * `<li>`. When omitted, each alert renders as a default `Alert` card. This
	 * keeps collection facts (count, ordering) data-driven while leaving row
	 * RENDERING fully composable.
	 */
	children?: (alert: AlertCenterAlert, index: number) => ReactNode;
};

/**
 * The dialog surface: a centered modal listing every alert, ranked
 * highest-severity-first, in a scrollable body. Reuses `Dialog` wholesale, so
 * it inherits the focus trap, `Escape`-to-close, and scroll region for free.
 * The overlay content part is named `Content` to match `Dialog.Content` /
 * `Sheet.Content`.
 *
 * @see https://mantle.ngrok.com/components/preview/alert-center#alertcentercontent
 *
 * @example
 * ```tsx
 * <AlertCenter.Content>
 *   {(alert) => (
 *     <Alert.Root intent={alert.intent}>
 *       <Alert.Icon />
 *       <Alert.Content>
 *         <Alert.Title>{alert.title}</Alert.Title>
 *       </Alert.Content>
 *     </Alert.Root>
 *   )}
 * </AlertCenter.Content>
 * ```
 */
const Content = ({ children, className, ...props }: AlertCenterContentProps) => {
	const { alerts, count } = useAlertCenterContext();

	return (
		<Dialog.Content data-slot="alert-center-content" className={className} {...props}>
			<Dialog.Header>
				<div className="flex items-center gap-2">
					<Dialog.Title>Account alerts</Dialog.Title>
					{count > 0 && (
						<Badge appearance="muted" color="neutral">
							{count}
						</Badge>
					)}
				</div>
				<Dialog.CloseIconButton />
			</Dialog.Header>
			<Dialog.Body>
				{count === 0 ? (
					<p className="text-muted py-8 text-center text-sm">{"You're all caught up."}</p>
				) : (
					<ul className="flex flex-col gap-3">
						{alerts.map((alert, index) => (
							<li key={alert.id}>
								{children ? children(alert, index) : <DefaultAlertCard alert={alert} />}
							</li>
						))}
					</ul>
				)}
			</Dialog.Body>
		</Dialog.Content>
	);
};

/**
 * A single, top-level entry point for one-to-many account alerts and their
 * upgrade CTAs — the aggregation layer that replaces a stack of independent
 * window banners. `AlertCenter.Bar` shows the highest-severity alert inline
 * (with its CTA) and a "+N more" trigger; `AlertCenter.Content` opens a modal
 * dialog listing every alert, ranked by severity.
 *
 * Compose it into an application shell as a child of `AppLayout.Root`, between
 * `AppLayout.Notice` and `AppLayout.Body`. Alerts are passed as DATA (not
 * authored children) so the count, the top alert, and the ordering are derived
 * deterministically rather than depending on which banners happen to mount.
 *
 * @see https://mantle.ngrok.com/components/preview/alert-center
 *
 * @example
 * Composition:
 * ```
 * AlertCenter.Root
 * ├── AlertCenter.Bar
 * └── AlertCenter.Content
 * ```
 *
 * @example
 * ```tsx
 * const alerts = [
 *   {
 *     id: "payment-failed",
 *     intent: "danger",
 *     title: "Payment failed — update your card",
 *     description: "We couldn't charge your card. Update it to avoid interruption.",
 *     action: { label: "Update payment method", href: "/billing" },
 *   },
 *   {
 *     id: "transfer-limit",
 *     intent: "warning",
 *     title: "Approaching your data transfer limit",
 *     action: { label: "Upgrade", href: "/billing/choose-a-plan" },
 *     dismissable: true,
 *   },
 * ] satisfies AlertCenterAlert[];
 *
 * <AppLayout.Root className="fixed inset-0">
 *   <AppLayout.Notice />
 *   <AlertCenter.Root alerts={alerts} onDismiss={dismiss}>
 *     <AlertCenter.Bar />
 *     <AlertCenter.Content />
 *   </AlertCenter.Root>
 *   <AppLayout.Body>…</AppLayout.Body>
 * </AppLayout.Root>
 * ```
 */
const AlertCenter = {
	/**
	 * The state + data owner. Renderless beyond the underlying dialog; ranks the
	 * alerts and publishes them on context.
	 *
	 * @see https://mantle.ngrok.com/components/preview/alert-center#alertcenterroot
	 *
	 * @example
	 * ```tsx
	 * <AlertCenter.Root alerts={alerts} onDismiss={dismiss}>
	 *   <AlertCenter.Bar />
	 *   <AlertCenter.Content />
	 * </AlertCenter.Root>
	 * ```
	 */
	Root,
	/**
	 * The always-visible strip: the highest-severity alert inline (icon, title,
	 * CTA) plus a "+N more" trigger. Collapses to nothing when empty. Claims no
	 * ARIA landmark; arrivals are announced by Root's persistent live region.
	 *
	 * @see https://mantle.ngrok.com/components/preview/alert-center#alertcenterbar
	 *
	 * @example
	 * ```tsx
	 * <AlertCenter.Root alerts={alerts} onDismiss={dismiss}>
	 *   <AlertCenter.Bar />
	 *   <AlertCenter.Content />
	 * </AlertCenter.Root>
	 * ```
	 */
	Bar,
	/**
	 * The modal dialog listing every alert, ranked highest-severity-first, in a
	 * scrollable body. Pass a render-prop child to customize each row.
	 *
	 * @see https://mantle.ngrok.com/components/preview/alert-center#alertcentercontent
	 *
	 * @example
	 * ```tsx
	 * <AlertCenter.Root alerts={alerts} onDismiss={dismiss}>
	 *   <AlertCenter.Bar />
	 *   <AlertCenter.Content />
	 * </AlertCenter.Root>
	 * ```
	 */
	Content,
} as const;

export {
	//,
	AlertCenter,
	// exported for unit tests, intentionally NOT re-exported from index.ts
	alertsSummary,
	alertTitleText,
	SEVERITY_RANK,
	sortAlertsBySeverity,
};

export type {
	//,
	AlertCenterAction,
	AlertCenterAlert,
	AlertCenterIntent,
	AlertCenterRootProps,
};
