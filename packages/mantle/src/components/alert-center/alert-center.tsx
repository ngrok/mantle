"use client";

import type { ComponentProps, ReactNode, TransitionEvent } from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from "react";
import invariant from "tiny-invariant";
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js";
import { cx } from "../../utils/cx/cx.js";
import { Alert } from "../alert/alert.js";

/**
 * The tone an alert's color communicates — identical to `Alert`'s intent axis,
 * so an alert's `intent` flows straight through to the `Alert` card that
 * renders it.
 */
type AlertCenterIntent = "danger" | "important" | "info" | "success" | "warning";

/**
 * Highest-severity-first ranking used to pick the alert shown in the bar and to
 * order the inline expansion. Kept as a plain lookup so ordering is a pure,
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
 * The call-to-action on an alert. It renders as an inline link inside the
 * alert's copy rather than as a separate primary button.
 */
type AlertCenterAction = { label: string; href: string };

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
	/** Optional supporting copy shown under the title inside the inline expansion. */
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
	/** Whether the additional alerts are currently rendered below the bar. */
	isExpanded: boolean;
	/** Opens or collapses the additional alerts. */
	setExpanded: (expanded: boolean) => void;
};

const AlertCenterContext = createContext<AlertCenterContextValue | null>(null);

function useAlertCenterContext(): AlertCenterContextValue {
	const context = useContext(AlertCenterContext);
	invariant(context, "AlertCenter parts must be rendered inside <AlertCenter.Root>.");
	return context;
}

function AlertLink({ action }: { action: AlertCenterAction }) {
	return (
		<a className="font-medium" href={action.href}>
			{action.label}
		</a>
	);
}

/**
 * The default row rendered for each alert inside the inline expansion: a
 * compact, one- or two-line `Alert` banner carrying the intent icon, title,
 * optional description, inline CTA, and optional dismiss button. Consumers can replace this via
 * `AlertCenter.Content`'s render-prop child.
 */
function DefaultAlertCard({ alert }: { alert: AlertCenterAlert }) {
	const { onDismiss } = useAlertCenterContext();

	return (
		<Alert.Root appearance="banner" intent={alert.intent} className="gap-2 py-2 pr-2">
			<Alert.Icon className="shrink-0" />
			<Alert.Content>
				<Alert.Title>
					{alert.title} {alert.action != null && <AlertLink action={alert.action} />}
				</Alert.Title>
				{alert.description != null && <Alert.Description>{alert.description}</Alert.Description>}
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
 * Props for {@link AlertCenter.Root} — the alerts data plus the inline list's
 * expanded state. `AlertCenter.Root` owns both and publishes the ranked alerts on
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
	/** Controlled expanded state of the additional-alert list. */
	open?: boolean;
	/** Uncontrolled initial expanded state of the additional-alert list. */
	defaultOpen?: boolean;
	/** Called when the additional-alert list expands or collapses. */
	onOpenChange?: (open: boolean) => void;
	children?: ReactNode;
};

/**
 * The state + data owner. It ranks the alerts, publishes them on context, and
 * owns the inline list's expanded state. Compose its
 * `Bar` inside `AppLayout.Notice`, alongside any other window-level notice, so
 * all top-of-viewport messaging shares one layout slot.
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
	const [internalExpanded, setInternalExpanded] = useState(defaultOpen ?? false);
	const isExpanded = open ?? internalExpanded;
	const setExpanded = useCallback(
		(expanded: boolean) => {
			if (open == null) {
				setInternalExpanded(expanded);
			}
			onOpenChange?.(expanded);
		},
		[open, onOpenChange],
	);
	const context = useMemo<AlertCenterContextValue>(
		() => ({
			alerts: sorted,
			count: sorted.length,
			topAlert: sorted[0] ?? null,
			onDismiss,
			isExpanded,
			setExpanded,
		}),
		[sorted, onDismiss, isExpanded, setExpanded],
	);

	return (
		<AlertCenterContext.Provider value={context}>
			{children}
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

type AlertCenterBarRenderContext = {
	/** The number of alerts hidden by the collapsed bar. */
	remaining: number;
	/** Whether the additional alerts are currently expanded. */
	isExpanded: boolean;
	/** Expands or collapses the additional-alert list. */
	toggle: () => void;
	/** Dismisses this alert when `onDismiss` is supplied; otherwise `undefined`. */
	dismiss: (() => void) | undefined;
};

type AlertCenterBarProps =
	| (Omit<ComponentProps<typeof Alert.Root>, "appearance" | "intent" | "children"> & {
			children?: never;
	  })
	| {
			/**
			 * Replaces the default banner. Compose `Alert`'s banner parts here when
			 * the alert needs custom presentational content.
			 */
			children: (alert: AlertCenterAlert, context: AlertCenterBarRenderContext) => ReactNode;
	  };

/**
 * The bar's enter/exit animation, applied to a padding-free wrapper around the
 * banner (default or render-prop). On appearance it eases down from zero height
 * while fading in; on disappearance it collapses back the same way but faster
 * (the exit answers a dismissal, so it drops away sooner — the sonner/PowerBar
 * cadence). The wrapper carries no padding — like `Accordion.Content` — so its
 * height reaches a true zero that the banner's own `py-2` would otherwise clamp,
 * and the opacity fade hides the opening/closing frame. `@starting-style` (the
 * `starting:` variant) supplies the pre-insertion state so the enter runs on
 * mount; the exit is driven by `data-state="closed"` while the wrapper stays
 * mounted (see {@link useBarPresence}). `interpolate-size:allow-keywords` makes
 * the `auto` keyword animatable (Chromium — other engines snap, a fine
 * progressive enhancement).
 */
const barAnimation =
	"shrink-0 overflow-hidden transition-[height,opacity] duration-200 ease-out [interpolate-size:allow-keywords] starting:h-0 starting:opacity-0 data-state-closed:h-0 data-state-closed:opacity-0 data-state-closed:duration-150 motion-reduce:transition-none";

/** How long to keep the bar mounted for its exit slide if no `transitionend`
 * fires (reduced motion, engines that snap, a tab backgrounded mid-transition).
 * A hair longer than the 150ms CSS exit so a real `transitionend` wins first;
 * this is only the backstop that guarantees the bar can never get stuck mounted. */
const BAR_EXIT_SAFETY_MS = 200;

type BarPresence = "open" | "closing" | "closed";

/**
 * Presence transitions for the bar's mount lifecycle, modeled as a pure reducer
 * so the enter/exit/interrupt logic is testable without a DOM. `show` always
 * resolves to `"open"` — re-showing mid-exit is a smooth retarget back to open,
 * never a restart; `hide` begins the exit only from a mounted state; `exited`
 * completes it once the transition (or the safety timeout) fires.
 *
 * @example
 * barPresenceReducer("closing", "show"); // "open"  (interrupted exit reopens)
 * barPresenceReducer("open", "hide");    // "closing"
 * barPresenceReducer("closing", "exited"); // "closed" (now safe to unmount)
 */
function barPresenceReducer(state: BarPresence, event: "show" | "hide" | "exited"): BarPresence {
	switch (event) {
		case "show":
			return "open";
		case "hide":
			return state === "closed" ? "closed" : "closing";
		case "exited":
			return state === "closing" ? "closed" : state;
	}
}

/**
 * Keeps the bar mounted through its exit slide so the collapse can animate
 * instead of the bar popping out on unmount. `present` is the desired
 * visibility (whether there's a top alert to show). Returns whether to render,
 * the `data-state` the CSS animation reads, and a `transitionend` handler that
 * finishes the exit. A safety timeout backstops the exit when no `transitionend`
 * arrives, so the bar can never get stuck mounted.
 *
 * @example
 * const { isMounted, dataState, onExitTransitionEnd } = useBarPresence(topAlert != null);
 * if (!isMounted) return null;
 * return <div data-state={dataState} onTransitionEnd={onExitTransitionEnd} />;
 */
function useBarPresence(present: boolean): {
	isMounted: boolean;
	dataState: "open" | "closed";
	onExitTransitionEnd: (event: TransitionEvent<HTMLElement>) => void;
} {
	const [state, dispatch] = useReducer(barPresenceReducer, present ? "open" : "closed");

	// Layout effect so "closing" is applied before paint — no flash of the open
	// state after the alerts empty.
	useIsomorphicLayoutEffect(() => {
		dispatch(present ? "show" : "hide");
	}, [present]);

	useEffect(() => {
		if (state !== "closing") {
			return;
		}
		const timeout = window.setTimeout(() => dispatch("exited"), BAR_EXIT_SAFETY_MS);
		return () => window.clearTimeout(timeout);
	}, [state]);

	const onExitTransitionEnd = useCallback((event: TransitionEvent<HTMLElement>) => {
		// Only the wrapper's own height transition completes the exit — ignore
		// transitions bubbling up from children (e.g. the expand caret's rotate).
		if (event.target === event.currentTarget && event.propertyName === "height") {
			dispatch("exited");
		}
	}, []);

	return {
		isMounted: state !== "closed",
		dataState: state === "open" ? "open" : "closed",
		onExitTransitionEnd,
	};
}

/**
 * Vertically centers the bar's trailing controls. `Alert`'s dismiss/expand
 * controls are absolutely pinned at a fixed `top-1.5` — tuned to center within
 * the Alert's default `p-2.5` padding and to top-align in a multi-line alert.
 * The bar is a strictly single-line banner with tighter `py-2`, so that fixed
 * offset lands ~2px below center; centering with a transform re-centers the
 * control independent of the padding.
 */
const centeredBarControl = "top-1/2 -translate-y-1/2";

/**
 * The always-visible, full-width strip. It surfaces the single highest-severity
 * alert INLINE — icon, title, and its call-to-action — so the top CTA is one
 * glance (and zero extra clicks) away, then offers a count-and-caret control that
 * expands the additional alerts as full-width banners below the bar. Collapses
 * to nothing when there are no alerts (like `AppLayout.Notice`), so it can
 * stay mounted and render conditionally. Pass a render-prop child to replace
 * the default banner with a composition of `Alert`'s banner parts.
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
const Bar = (props: AlertCenterBarProps) => {
	const { count, isExpanded, onDismiss, setExpanded, topAlert } = useAlertCenterContext();
	const present = topAlert != null;
	const { isMounted, dataState, onExitTransitionEnd } = useBarPresence(present);

	// Retain the last alert so the collapsing bar keeps its content through the
	// exit slide instead of blanking the instant the alerts empty. Captured in a
	// layout effect (never during render) so it's ready on the commit that begins
	// the exit, when `topAlert` has already gone null.
	const lastAlertRef = useRef(topAlert);
	useIsomorphicLayoutEffect(() => {
		if (topAlert != null) {
			lastAlertRef.current = topAlert;
		}
	}, [topAlert]);
	const alert = topAlert ?? lastAlertRef.current;

	// Nothing showing and nothing left to animate out.
	if (!isMounted || alert == null) {
		return null;
	}

	// While closing (`topAlert` is null) the trailing controls would act on an
	// alert that's already gone, so drop them for the exit and slide out just the
	// banner.
	const remaining = present ? count - 1 : 0;
	const dismiss =
		present && alert.dismissable && onDismiss != null ? () => onDismiss(alert.id) : undefined;

	if (typeof props.children === "function") {
		// The render-prop banner rides the same enter/exit animation as the default.
		return (
			<div className={barAnimation} data-state={dataState} onTransitionEnd={onExitTransitionEnd}>
				{props.children(alert, {
					remaining,
					isExpanded,
					toggle: () => setExpanded(!isExpanded),
					dismiss,
				})}
			</div>
		);
	}

	const { className, ref, ...alertProps } = props;

	return (
		<div className={barAnimation} data-state={dataState} onTransitionEnd={onExitTransitionEnd}>
			<Alert.Root
				ref={ref}
				appearance="banner"
				intent={alert.intent}
				className={cx("gap-2 py-2 pr-2", className)}
				{...alertProps}
				// after the spread so consumers can't drop the styling/testing hook
				data-slot="alert-center-bar"
			>
				<Alert.Icon className="shrink-0" />
				<Alert.Content>
					<Alert.Title>
						{alert.title} {alert.action != null && <AlertLink action={alert.action} />}
					</Alert.Title>
					{dismiss != null && (
						<Alert.DismissIconButton
							className={centeredBarControl}
							label={`Dismiss ${alertTitleText(alert)}`}
							onClick={dismiss}
						/>
					)}
					{remaining > 0 && (
						<Alert.ExpandButton
							className={centeredBarControl}
							count={remaining}
							expanded={isExpanded}
							onClick={() => setExpanded(!isExpanded)}
						/>
					)}
				</Alert.Content>
			</Alert.Root>
		</div>
	);
};

type AlertCenterContentRenderContext = {
	/** Dismisses this alert when `onDismiss` is supplied; otherwise `undefined`. */
	dismiss: (() => void) | undefined;
};

type AlertCenterContentProps = Omit<ComponentProps<"div">, "children"> & {
	/**
	 * Optional render-prop for a custom row. Receives each alert (in ranked
	 * order), its index, and a dismiss capability; return whatever should render
	 * inside that row's `<li>`. When omitted, each alert renders as a default
	 * `Alert` card. This keeps collection facts (count, ordering) data-driven while leaving row
	 * RENDERING fully composable.
	 */
	children?: (
		alert: AlertCenterAlert,
		index: number,
		context: AlertCenterContentRenderContext,
	) => ReactNode;
};

/**
 * The inline expansion below `AlertCenter.Bar`. It renders the additional
 * alerts, ranked highest-severity-first, and pushes the app shell down while
 * expanded. The top alert remains in the bar, so the expansion lists only the
 * alerts hidden by the collapsed form. Its render prop receives a dismiss
 * capability, so custom banners can compose `Alert.DismissIconButton`.
 *
 * @see https://mantle.ngrok.com/components/preview/alert-center#alertcentercontent
 *
 * @example
 * ```tsx
 * <AlertCenter.Content>
 *   {(alert) => (
 *     <Alert.Root appearance="banner" intent={alert.intent}>
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
	const { alerts, isExpanded, onDismiss } = useAlertCenterContext();
	const additionalAlerts = alerts.slice(1);

	// Nothing is hidden behind the bar → there's no expansion to render or
	// animate, and the bar shows no expand control. (This stays unmounted rather
	// than collapsing to zero height, so the shell sits flush against the bar.)
	if (additionalAlerts.length === 0) {
		return null;
	}

	return (
		<div
			{...props}
			data-slot="alert-center-content"
			// after the spread so consumers can't drop the state hook the animation reads
			data-state={isExpanded ? "open" : "closed"}
			className={cx(
				// Slide the expansion open/closed by animating height 0 <-> auto — the
				// same technique and 200ms/ease-out curve as `Accordion.Content`.
				// `interpolate-size:allow-keywords` makes the `auto` keyword animatable
				// (Chromium; other engines snap, a fine progressive enhancement) and
				// `overflow-hidden` clips the rows mid-slide. When collapsed,
				// `content-visibility:hidden` takes the rows — and their CTA links — out
				// of the tab order and a11y tree; it transitions discretely so the rows
				// stay visible through the closing slide before they're skipped.
				"h-0 overflow-hidden [content-visibility:hidden] transition-[height,content-visibility] transition-discrete duration-200 ease-out [interpolate-size:allow-keywords] data-state-open:h-auto data-state-open:[content-visibility:visible] motion-reduce:transition-none",
				className,
			)}
		>
			<ul className="flex w-full flex-col">
				{additionalAlerts.map((alert, index) => {
					const dismiss =
						alert.dismissable && onDismiss != null ? () => onDismiss(alert.id) : undefined;

					return (
						<li key={alert.id}>
							{children ? children(alert, index, { dismiss }) : <DefaultAlertCard alert={alert} />}
						</li>
					);
				})}
			</ul>
		</div>
	);
};

/**
 * A single, top-level entry point for one-to-many account alerts and their
 * upgrade CTAs — the aggregation layer that replaces a stack of independent
 * window banners. `AlertCenter.Bar` shows the highest-severity alert inline
 * (with its CTA) and a count-and-caret control; `AlertCenter.Content` expands
 * the remaining alerts as full-width banners, ranked by severity.
 *
 * Compose its `Bar` into `AppLayout.Notice`, alongside any other window-level
 * notice. Alerts are passed as DATA (not authored children) so
 * the count, the top alert, and the ordering are derived deterministically
 * rather than depending on which banners happen to mount.
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
 *   <AppLayout.Notice>
 *     {showPreviewNotice && <PreviewNotice />}
 *     <AlertCenter.Root alerts={alerts} onDismiss={dismiss}>
 *       <AlertCenter.Bar />
 *       <AlertCenter.Content />
 *     </AlertCenter.Root>
 *   </AppLayout.Notice>
 *   <AppLayout.Body>…</AppLayout.Body>
 * </AppLayout.Root>
 * ```
 */
const AlertCenter = {
	/**
	 * The state + data owner. Ranks the alerts, owns inline expansion state, and
	 * publishes both on context.
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
	 * CTA) plus a count-and-caret expansion control. Collapses to nothing when empty. Claims no
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
	 * The inline expansion listing the alerts hidden by the bar, ranked
	 * highest-severity-first as full-width banners. Pass a render-prop child to
	 * customize each row.
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
	barPresenceReducer,
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
