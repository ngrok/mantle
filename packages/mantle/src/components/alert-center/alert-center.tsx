"use client";

import type { ComponentProps, ReactNode, TransitionEvent } from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useId,
	useMemo,
	useReducer,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import invariant from "tiny-invariant";
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js";
import { useComposedRefs } from "../../utils/compose-refs/compose-refs.js";
import { cx } from "../../utils/cx/cx.js";
import { Alert } from "../alert/alert.js";

/**
 * The tone an alert's color communicates — identical to `Alert`'s intent axis,
 * so an item's `intent` flows straight through to the `Alert` chrome that
 * renders it.
 */
type AlertCenterIntent = "danger" | "important" | "info" | "success" | "warning";

/**
 * Highest-severity-first ranking used to pick the alert shown in the bar and to
 * order the inline expansion. Kept as a plain lookup so ordering is a pure,
 * testable function of the registered data — never incidental DOM paint order.
 */
const SEVERITY_RANK = {
	danger: 5,
	warning: 4,
	important: 3,
	info: 2,
	success: 1,
} as const satisfies Record<AlertCenterIntent, number>;

/**
 * One registered alert: the coordination facts (`id`, `intent`) plus the
 * authored banner content. `AlertCenter.Item` registers this shape into the
 * store; `Bar` and `Content` render from it.
 */
type AlertCenterRegisteredAlert = {
	/** Stable identity — the React key, the sticky-order key, and the styling hook. */
	id: string;
	/** The tone the alert's color communicates; becomes the chrome `Alert.Root`'s intent. */
	intent: AlertCenterIntent;
	/** Optional classes forwarded to the chrome `Alert.Root` in both placements. */
	className: string | undefined;
	/** The authored banner content, projected into the bar or an expansion row. */
	children: ReactNode;
	/**
	 * Arrival order: assigned at an id's FIRST registration and sticky for the
	 * store's lifetime, so prop updates never reorder and a dismissed-then-
	 * returning id resumes its original position.
	 */
	sequence: number;
};

/**
 * Collapse an element's `textContent` to a single-spaced, trimmed string —
 * JSX text nodes carry authoring whitespace that reads as pauses to a screen
 * reader.
 *
 * @example
 * ```ts
 * normalizeText("  Payment\n\t\tfailed "); // "Payment failed"
 * ```
 */
function normalizeText(text: string): string {
	return text.replace(/\s+/g, " ").trim();
}

/**
 * The plain-text form of a rendered banner's title: the
 * `[data-slot=alert-title]` descendant's text with CTA anchors and any
 * composed controls removed (mirroring how the bar treats the title and its
 * inline call-to-action as separate things), whitespace-normalized. Falls
 * back to the full title text when the title is entirely links; empty when
 * the banner rendered no title. Deriving from the committed DOM — instead of
 * requiring a duplicated plain-text prop — keeps accessible strings in
 * lockstep with the visible copy, and is safe because the center renders
 * exclusively client-side.
 *
 * @example
 * ```ts
 * // <h5 data-slot="alert-title">Payment failed <a href="/billing">Update card</a></h5>
 * alertTitleText(banner); // "Payment failed"
 * ```
 */
function alertTitleText(banner: Element): string {
	const title = banner.querySelector('[data-slot="alert-title"]');
	if (title == null) {
		return "";
	}
	const clone = title.cloneNode(true);
	if (!(clone instanceof Element)) {
		return normalizeText(title.textContent ?? "");
	}
	// Buttons are stripped on EVERY path: no control's text belongs in the
	// title-derived string — and a DismissIconButton composed inside the title
	// would otherwise read back its own sr-only label, growing the derived
	// string on every layout pass (an infinite update loop).
	for (const button of clone.querySelectorAll("button")) {
		button.remove();
	}
	const fullText = normalizeText(clone.textContent ?? "");
	for (const anchor of clone.querySelectorAll("a")) {
		anchor.remove();
	}
	const strippedText = normalizeText(clone.textContent ?? "");
	return strippedText === "" ? fullText : strippedText;
}

/**
 * Rank alerts highest-severity-first; ties within an intent break by
 * `sequence` (arrival order), so the result is a pure function of the
 * registered data. Alerts that arrive in the same commit register in tree
 * order; alerts whose conditions flip true later append after their
 * same-intent peers.
 *
 * @example
 * ```ts
 * rankAlerts([
 *   { intent: "info", sequence: 0 },
 *   { intent: "danger", sequence: 1 },
 * ]); // [{ intent: "danger", … }, { intent: "info", … }]
 * ```
 */
function rankAlerts<T extends { intent: AlertCenterIntent; sequence: number }>(
	alerts: readonly T[],
): T[] {
	return alerts.toSorted(
		(a, b) => SEVERITY_RANK[b.intent] - SEVERITY_RANK[a.intent] || a.sequence - b.sequence,
	);
}

/**
 * The screen-reader announcement for the alerts: the top alert's rendered
 * title text (re-derived from the bar's DOM on every commit, keeping it in
 * lockstep with the visible copy), plus a count of the rest. Empty when there are no alerts;
 * count-only when the top alert rendered no `Alert.Title`. Fed to a
 * persistent visually-hidden live region so arrivals and re-ranks are
 * announced (a live region must already exist before its text changes).
 *
 * @example
 * ```ts
 * alertsSummary("Payment failed", 3); // "Payment failed, and 2 more alerts"
 * alertsSummary("", 2); // "2 alerts"
 * ```
 */
function alertsSummary(topLabel: string, count: number): string {
	if (count === 0) {
		return "";
	}
	if (topLabel === "") {
		return `${count} alert${count === 1 ? "" : "s"}`;
	}
	const remaining = count - 1;
	if (remaining === 0) {
		return topLabel;
	}
	return `${topLabel}, and ${remaining} more alert${remaining === 1 ? "" : "s"}`;
}

const EMPTY_ALERTS: readonly AlertCenterRegisteredAlert[] = [];

/**
 * The registration store an `AlertCenter.Root` owns for its lifetime.
 * `AlertCenter.Item` parts render `null` and register their facts + content
 * here from layout effects; `Bar`, `Content`, and the live-region announcer
 * read the ranked snapshot via `useSyncExternalStore` — so registration churn
 * re-renders only those leaf surfaces, never the consumer's tree. (Same
 * pattern as the chart family's `ChartStore`.)
 *
 * Sequence numbers are sticky per id: an id keeps its first-seen arrival
 * position for the store's lifetime, so re-registrations (every re-render, as
 * `children` identity changes) never reorder, and a dismissed alert that
 * returns resumes its original spot. Two mounted items sharing an id is an
 * authoring error; the last registration wins (Map semantics).
 */
class AlertCenterStore {
	#listeners = new Set<() => void>();
	#alertsById = new Map<string, AlertCenterRegisteredAlert>();
	#sequenceById = new Map<string, number>();
	#nextSequence = 0;
	#snapshot: readonly AlertCenterRegisteredAlert[] = EMPTY_ALERTS;
	#topLabel = "";
	#contentMounted = false;

	/** Subscribe to every store change; returns the unsubscribe function. */
	subscribe = (listener: () => void): (() => void) => {
		this.#listeners.add(listener);
		return () => {
			this.#listeners.delete(listener);
		};
	};

	/** The ranked alerts (highest severity first, arrival order within an intent). */
	getSnapshot = (): readonly AlertCenterRegisteredAlert[] => this.#snapshot;

	/** The top alert's rendered title text, published by `AlertCenter.Bar`. */
	getTopLabel = (): string => this.#topLabel;

	/**
	 * Bar-side: publish the top alert's rendered title text for the announcer
	 * and any other string surface. Bails when unchanged, so the Bar can call
	 * it from an every-commit layout effect without notification churn. Leaves
	 * the ranked-array snapshot untouched — array subscribers bail on the
	 * unchanged reference.
	 */
	setTopLabel(topLabel: string): void {
		if (this.#topLabel === topLabel) {
			return;
		}
		this.#topLabel = topLabel;
		this.#emit();
	}

	/** Whether an `AlertCenter.Content` is composed under this Root. */
	getContentMounted = (): boolean => this.#contentMounted;

	/**
	 * Content-side: report that an expansion surface exists. The Bar renders
	 * the expand control only while one is mounted, so its `aria-controls`
	 * can never reference a missing element (and the control never toggles
	 * an expansion that has nowhere to render).
	 */
	setContentMounted(contentMounted: boolean): void {
		if (this.#contentMounted === contentMounted) {
			return;
		}
		this.#contentMounted = contentMounted;
		this.#emit();
	}

	/**
	 * Item-side: add or replace the registration for `alert.id` and return its
	 * cleanup. An id's arrival `sequence` is assigned once and kept for the
	 * store's lifetime, so re-registrations never reorder.
	 */
	register(alert: Omit<AlertCenterRegisteredAlert, "sequence">): () => void {
		const sequence = this.#sequenceById.get(alert.id) ?? this.#nextSequence++;
		this.#sequenceById.set(alert.id, sequence);
		const registration: AlertCenterRegisteredAlert = { ...alert, sequence };
		this.#alertsById.set(alert.id, registration);
		this.#publish();
		return () => {
			// Cleanup compares the exact registration object, never its id alone —
			// re-registering the same id (a prop update, or last-wins shadowing)
			// must not let a stale cleanup delete the surviving registration.
			if (this.#alertsById.get(alert.id) === registration) {
				this.#alertsById.delete(alert.id);
				this.#publish();
			}
		};
	}

	#publish(): void {
		this.#snapshot = rankAlerts([...this.#alertsById.values()]);
		this.#emit();
	}

	#emit(): void {
		for (const listener of this.#listeners) {
			listener();
		}
	}
}

type AlertCenterContextValue = {
	store: AlertCenterStore;
	/** Whether the additional alerts are currently rendered below the bar. */
	isExpanded: boolean;
	/** Opens or collapses the additional alerts. */
	setExpanded: (expanded: boolean) => void;
	/** The `id` of `AlertCenter.Content`, wired to the expand button's `aria-controls`. */
	contentId: string;
};

const AlertCenterContext = createContext<AlertCenterContextValue | null>(null);

function useAlertCenterContext(partName: string): AlertCenterContextValue {
	const context = useContext(AlertCenterContext);
	invariant(context, `${partName} must be rendered inside <AlertCenter.Root>.`);
	return context;
}

const useRankedAlerts = (store: AlertCenterStore) =>
	useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

/**
 * Where an item's authored children are currently rendering: the always-visible
 * bar or an expansion-list row. Provided by the surface around the projected
 * children, so placement-aware parts (`AlertCenter.DismissIconButton`) can wire
 * themselves without any per-placement authoring.
 */
type AlertCenterPlacement = "bar" | "list";

const AlertCenterItemContext = createContext<AlertCenterPlacement | null>(null);

/**
 * The persistent polite announcer. A leaf subscriber (rather than text inside
 * Root) so registration churn re-renders only this node. Its headline is the
 * top alert's RENDERED title text (published by `AlertCenter.Bar` from its own
 * DOM on every commit), keeping the announcement in lockstep with the visible
 * copy. Screen
 * readers only announce a polite region reliably when it already exists in the
 * accessibility tree before its text changes — so the announcer lives in the
 * always-mounted Root output (not in `AlertCenter.Bar`, which unmounts when
 * empty), and only its text content swaps. This is why the visual Bar carries
 * no role/aria-live of its own.
 */
function Announcer({ store }: { store: AlertCenterStore }) {
	const alerts = useRankedAlerts(store);
	const topLabel = useSyncExternalStore(store.subscribe, store.getTopLabel, store.getTopLabel);
	return (
		<div className="sr-only" role="status" aria-live="polite">
			{alertsSummary(topLabel, alerts.length)}
		</div>
	);
}

/**
 * Props for {@link AlertCenter.Root} — the expansion's open state. The alerts
 * themselves are authored as `AlertCenter.Item` children.
 */
type AlertCenterRootProps = {
	/** Controlled expanded state of the additional-alert list. */
	open?: boolean;
	/** Uncontrolled initial expanded state of the additional-alert list. */
	defaultOpen?: boolean;
	/** Called when the additional-alert list expands or collapses. */
	onOpenChange?: (open: boolean) => void;
	children?: ReactNode;
};

/**
 * The renderless state owner. It creates the registration store the
 * `AlertCenter.Item` children register into, owns the inline expansion's open
 * state, and mounts the persistent live-region announcer. Compose its `Bar`
 * (and `Content`) inside `AppLayout.Notice`, alongside any other window-level
 * notice, so all top-of-viewport messaging shares one layout slot.
 *
 * Items register client-side (from layout effects), so server-rendered HTML
 * contains no bar; it enters with its height animation after hydration — the
 * same entrance every arriving alert gets by design.
 *
 * @see https://mantle.ngrok.com/components/preview/alert-center#alertcenterroot
 *
 * @example
 * ```tsx
 * <AlertCenter.Root>
 *   <AlertCenter.Bar />
 *   <AlertCenter.Content />
 *   {paymentFailed && (
 *     <AlertCenter.Item id="payment-failed" intent="danger">
 *       <Alert.Icon />
 *       <Alert.Content>
 *         <Alert.Title>
 *           Payment failed — <a href="/billing">update your card</a>
 *         </Alert.Title>
 *       </Alert.Content>
 *     </AlertCenter.Item>
 *   )}
 * </AlertCenter.Root>
 * ```
 */
const Root = ({ children, defaultOpen, onOpenChange, open }: AlertCenterRootProps) => {
	const [store] = useState(() => new AlertCenterStore());
	const contentId = useId();
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
		() => ({ store, isExpanded, setExpanded, contentId }),
		[store, isExpanded, setExpanded, contentId],
	);

	return (
		<AlertCenterContext.Provider value={context}>
			{children}
			<Announcer store={store} />
		</AlertCenterContext.Provider>
	);
};

/**
 * Props for {@link AlertCenter.Item}: the coordination facts the center needs
 * to rank, announce, and label an alert — everything presentational is the
 * authored `children`.
 */
type AlertCenterItemProps = {
	/**
	 * Stable identity. It keys the projected content (so re-ranks never bleed
	 * state between alerts), pins the item's arrival order (a returning id
	 * resumes its original position), and is stamped on the chrome as
	 * `data-alert-id` for styling. Two mounted items sharing an id is an
	 * authoring error — the last registration wins.
	 */
	id: string;
	/**
	 * The tone the alert's color communicates. Drives both the severity ranking
	 * and the intent of the `Alert.Root` chrome the children render inside.
	 */
	intent: AlertCenterIntent;
	/** Optional classes for this item's chrome `Alert.Root`, in both placements. */
	className?: string;
	/**
	 * The banner content: compose `Alert.Icon`, `Alert.Content`, `Alert.Title`,
	 * `Alert.Description`, and `AlertCenter.DismissIconButton`. Do NOT include
	 * `Alert.Root` — the center provides the chrome (with this item's `intent`)
	 * at whichever placement the item ranks into.
	 */
	children: ReactNode;
};

/**
 * One account alert, authored as JSX. It renders `null` where authored and
 * registers its facts + content into the center; the highest-severity item's
 * children render inside `AlertCenter.Bar`, the rest inside
 * `AlertCenter.Content` rows. Mount it to show the alert, unmount it to remove
 * it — dismissal is just your state flipping the condition off.
 *
 * Projection contract: children render at the Bar/Content position inside
 * `AlertCenter.Root`, not where the item is authored — context providers must
 * wrap `Root` (not the item), error boundaries around the item cannot catch
 * the children's render errors, and content should stay render-stateless (a
 * re-rank remounts it). Avoid authoring items inside Suspense boundaries that
 * can hide them: hiding unregisters the alert and the bar animates out.
 *
 * @see https://mantle.ngrok.com/components/preview/alert-center#alertcenteritem
 *
 * @example
 * ```tsx
 * <AlertCenter.Item id="transfer-limit" intent="warning">
 *   <Alert.Icon />
 *   <Alert.Content>
 *     <Alert.Title>
 *       You've used 92% of your monthly transfer. <a href="/billing">Upgrade</a>
 *     </Alert.Title>
 *     <Alert.Description>Free accounts include 5 GB of transfer per month.</Alert.Description>
 *     <AlertCenter.DismissIconButton onClick={() => dismiss("transfer-limit")} />
 *   </Alert.Content>
 * </AlertCenter.Item>
 * ```
 */
const Item = ({ children, className, id, intent }: AlertCenterItemProps): null => {
	const { store } = useAlertCenterContext("AlertCenter.Item");
	// An item inside another item's projected children would register while the
	// bar renders, outrank or unrank its host, unregister on the swap, and loop
	// the projection forever — fail fast instead.
	const projection = useContext(AlertCenterItemContext);
	invariant(
		projection == null,
		"AlertCenter.Item cannot be rendered inside another item's children.",
	);
	// No dependency array on purpose: `children` has a new identity every
	// render, so this re-registers each commit (cleanup deletes, register
	// re-adds under the same sticky sequence). Only the leaf surfaces
	// (Bar/Content/announcer) subscribe, so there is no render loop. Same
	// idiom as the chart family's tooltip registration.
	useIsomorphicLayoutEffect(() => store.register({ id, intent, className, children }));
	return null;
};

type AlertCenterDismissIconButtonProps = ComponentProps<typeof Alert.DismissIconButton> & {
	/**
	 * Dismissal is consumer-owned: remove the alert by unmounting its
	 * `AlertCenter.Item` (and persist that however you like). Required because a
	 * dismiss affordance that does nothing is always an authoring error.
	 */
	onClick: NonNullable<ComponentProps<typeof Alert.DismissIconButton>["onClick"]>;
};

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
 * The dismiss affordance for the item it's composed inside. A thin wrapper
 * over `Alert.DismissIconButton`, placement-aware in two ways: its label
 * defaults to `Dismiss ${title}` derived from the enclosing banner's RENDERED
 * `Alert.Title` text, re-read on every commit so the accessible name stays in
 * lockstep with the visible copy (pass `label` to override, e.g. when the
 * title is long), and
 * in the bar it re-centers itself for the single-line form (where
 * `Alert.Root`'s existing expand-aware CSS already seats it next to the
 * expand control). Compose it — or leave it out — per alert; its presence IS
 * the alert's dismissability.
 *
 * @see https://mantle.ngrok.com/components/preview/alert-center#alertcenterdismissiconbutton
 *
 * @example
 * ```tsx
 * <AlertCenter.Item id="transfer-limit" intent="warning">
 *   <Alert.Icon />
 *   <Alert.Content>
 *     <Alert.Title>Approaching your data transfer limit</Alert.Title>
 *     <AlertCenter.DismissIconButton onClick={() => dismiss("transfer-limit")} />
 *   </Alert.Content>
 * </AlertCenter.Item>
 * ```
 */
const DismissIconButton = ({
	className,
	label,
	ref,
	...props
}: AlertCenterDismissIconButtonProps) => {
	const placement = useContext(AlertCenterItemContext);
	invariant(
		placement != null,
		"AlertCenter.DismissIconButton must be composed inside an <AlertCenter.Item>'s children.",
	);
	const buttonRef = useRef<HTMLButtonElement | null>(null);
	const composedRef = useComposedRefs(buttonRef, ref);
	const [derivedLabel, setDerivedLabel] = useState<string | null>(null);
	// No dependency array: the enclosing banner's title copy can change on any
	// commit, and reading the rendered DOM is the point — the derived name can
	// never drift from the visible text. `setState` bails on the unchanged
	// string, so this settles immediately.
	useIsomorphicLayoutEffect(() => {
		if (label != null) {
			return;
		}
		const banner = buttonRef.current?.closest("[data-alert-id]");
		const titleText = banner == null ? "" : alertTitleText(banner);
		setDerivedLabel(titleText === "" ? null : `Dismiss ${titleText}`);
	});
	return (
		<Alert.DismissIconButton
			ref={composedRef}
			label={label ?? derivedLabel ?? undefined}
			className={cx(placement === "bar" && centeredBarControl, className)}
			{...props}
		/>
	);
};

type AlertCenterBarProps = Omit<
	ComponentProps<typeof Alert.Root>,
	"appearance" | "intent" | "children"
> & {
	/** The bar renders the top-ranked item's authored children — it takes none of its own. */
	children?: never;
};

/**
 * The bar's enter/exit animation, applied to a padding-free wrapper around the
 * banner. On appearance it eases down from zero height while fading in; on
 * disappearance it collapses back the same way but faster (the exit answers a
 * dismissal, so it drops away sooner — the sonner/PowerBar cadence). The
 * wrapper carries no padding — like `Accordion.Content` — so its height
 * reaches a true zero that the banner's own `py-2` would otherwise clamp, and
 * the opacity fade hides the opening/closing frame. `@starting-style` (the
 * `starting:` variant) supplies the pre-insertion state so the enter runs on
 * mount; the exit is driven by `data-state="closed"` while the wrapper stays
 * mounted (see {@link useBarPresence}). `interpolate-size:allow-keywords`
 * makes the `auto` keyword animatable (Chromium — other engines snap, a fine
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
 * const { isMounted, dataState, onExitTransitionEnd } = useBarPresence({ present: topAlert != null });
 * if (!isMounted) return null;
 * return <div data-state={dataState} onTransitionEnd={onExitTransitionEnd} />;
 */
function useBarPresence({ present }: { present: boolean }): {
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
 * Track whether keyboard focus is (or was, at the moment a focused node got
 * removed) inside a container. Removing a focused element fires no blur and
 * silently resets `document.activeElement` to `<body>` — so by the time an
 * effect runs, the "focus was in here" fact is only recoverable from this
 * ref, maintained by the container's focus/blur events.
 *
 * @example
 * ```tsx
 * const { hadFocusWithinRef, onFocus, onBlur } = useFocusWithin();
 * return <div ref={containerRef} onFocus={onFocus} onBlur={onBlur}>…</div>;
 * ```
 */
function useFocusWithin(): {
	hadFocusWithinRef: { current: boolean };
	onFocus: () => void;
	onBlur: (event: { currentTarget: HTMLElement; relatedTarget: EventTarget | null }) => void;
} {
	const hadFocusWithinRef = useRef(false);

	const onFocus = useCallback(() => {
		hadFocusWithinRef.current = true;
	}, []);
	const onBlur = useCallback(
		(event: { currentTarget: HTMLElement; relatedTarget: EventTarget | null }) => {
			// Focus moved somewhere outside the container. (A removed node fires no
			// blur, so a mid-dismissal focus drop keeps the flag set — exactly the
			// case the redirect exists for.)
			if (
				!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))
			) {
				hadFocusWithinRef.current = false;
			}
		},
		[],
	);

	return { hadFocusWithinRef, onFocus, onBlur };
}

/**
 * Redirects keyboard focus when the bar's top alert changes underneath it.
 * Dismissing the top alert swaps the projected children (keyed by id), which
 * silently drops focus to `<body>` for keyboard users; this steers it to the
 * new bar's first trailing control instead (the dismiss button when the new
 * top is dismissable, else the expand control), so dismissing alert after
 * alert stays a keyboard-only flow. It redirects ONLY when the focused node
 * was actually removed — a promotion while focus sits on a surviving control
 * (e.g. the expand button as a higher-severity alert arrives) must never
 * steal focus.
 */
function useBarFocusRedirect(topId: string | undefined): {
	wrapperRef: { current: HTMLDivElement | null };
	onFocus: () => void;
	onBlur: (event: { currentTarget: HTMLElement; relatedTarget: EventTarget | null }) => void;
} {
	const wrapperRef = useRef<HTMLDivElement | null>(null);
	const { hadFocusWithinRef, onFocus, onBlur } = useFocusWithin();
	const previousTopIdRef = useRef(topId);

	useIsomorphicLayoutEffect(() => {
		const previousTopId = previousTopIdRef.current;
		previousTopIdRef.current = topId;
		// Redirect only on a promotion (a different alert now leads). When the
		// bar empties entirely the wrapper is inert and unmounting — focus falls
		// to <body>, the known preview limitation.
		if (topId == null || previousTopId == null || topId === previousTopId) {
			return;
		}
		if (!hadFocusWithinRef.current) {
			return;
		}
		const wrapper = wrapperRef.current;
		if (wrapper == null) {
			return;
		}
		// The focused control survived the swap (the expand button persists
		// across promotions) — the user never lost focus, so taking it would be
		// stealing.
		if (wrapper.contains(document.activeElement)) {
			return;
		}
		// Document order puts a composed dismiss control before the chrome expand
		// control, so this prefers dismiss when the new top alert has one.
		const control = wrapper.querySelector<HTMLElement>(
			'[data-slot="alert-dismiss-icon-button"], [data-slot="alert-expand-button"]',
		);
		(control ?? wrapper).focus();
	}, [topId]);

	return { wrapperRef, onFocus, onBlur };
}

/**
 * Chrome classes shared by the bar banner and every expansion row: the compact
 * banner metrics, plus a non-shrinking `Alert.Icon` so authored icons never
 * collapse in the flex row.
 */
const chromeClassName = "gap-2 py-2 pr-2 [&_[data-slot=alert-icon]]:shrink-0";

/**
 * The always-visible, full-width strip. It renders the single highest-severity
 * item's authored children INLINE — icon, title, and its call-to-action — so
 * the top CTA is one glance (and zero extra clicks) away, then appends a
 * count-and-caret control that expands the additional alerts below the bar.
 * Collapses to nothing when there are no alerts (like `AppLayout.Notice`), so
 * it can stay mounted and render unconditionally.
 *
 * The bar is the single-line form: it hides `Alert.Description` (shown in the
 * expansion rows instead), so put the call-to-action inside `Alert.Title`. Its
 * chrome carries `data-placement="bar"` and `data-alert-id` as styling hooks
 * for placement-aware authored content (e.g. `in-data-[placement=bar]:hidden`).
 *
 * The bar itself claims NO ARIA landmark (deliberately, like `AppLayout.Notice`)
 * — arrivals and re-ranks are announced by the persistent visually-hidden
 * `role="status"` region that `AlertCenter.Root` mounts.
 *
 * @see https://mantle.ngrok.com/components/preview/alert-center#alertcenterbar
 *
 * @example
 * ```tsx
 * <AlertCenter.Root>
 *   <AlertCenter.Bar />
 *   <AlertCenter.Content />
 *   <AlertCenter.Item id="payment-failed" intent="danger">
 *     …
 *   </AlertCenter.Item>
 * </AlertCenter.Root>
 * ```
 */
const Bar = ({ className, ref, ...props }: AlertCenterBarProps) => {
	const { store, isExpanded, setExpanded, contentId } = useAlertCenterContext("AlertCenter.Bar");
	const alerts = useRankedAlerts(store);
	const contentMounted = useSyncExternalStore(
		store.subscribe,
		store.getContentMounted,
		store.getContentMounted,
	);
	const topAlert = alerts[0] ?? null;
	const present = topAlert != null;
	const { isMounted, dataState, onExitTransitionEnd } = useBarPresence({ present });
	const { wrapperRef, onFocus, onBlur } = useBarFocusRedirect(topAlert?.id);

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

	// Publish the top alert's rendered title text for the announcer's headline.
	// No dependency array: title copy can change on any commit; `setTopLabel`
	// bails when the string is unchanged.
	useIsomorphicLayoutEffect(() => {
		const wrapper = wrapperRef.current;
		store.setTopLabel(present && wrapper != null ? alertTitleText(wrapper) : "");
	});
	// Unmount-only cleanup: without it, unmounting the Bar (while Root and
	// items stay mounted) would freeze the announcer on the last-published
	// headline forever.
	useIsomorphicLayoutEffect(() => {
		return () => {
			store.setTopLabel("");
		};
	}, [store]);

	// Nothing showing and nothing left to animate out.
	if (!isMounted || alert == null) {
		return null;
	}

	const remaining = present ? alerts.length - 1 : 0;

	return (
		<div
			ref={wrapperRef}
			tabIndex={-1}
			// While closing, the retained children still include the author's live
			// controls (dismiss, CTA links) for an alert that's already gone —
			// `inert` takes them out of the tab order, the a11y tree, and hit
			// testing for the exit slide (pointer-events alone wouldn't stop a
			// second Enter on the still-focused dismiss button).
			inert={!present}
			className={barAnimation}
			data-state={dataState}
			onTransitionEnd={onExitTransitionEnd}
			onFocus={onFocus}
			onBlur={onBlur}
		>
			<Alert.Root
				ref={ref}
				appearance="banner"
				intent={alert.intent}
				className={cx(
					chromeClassName,
					// The single-line form: authored descriptions render only in the
					// expansion rows. display:none also removes any links inside from
					// the tab order and the a11y tree.
					"[&_[data-slot=alert-description]]:hidden",
					className,
					alert.className,
				)}
				{...props}
				// after the spread so consumers can't drop the styling/testing hooks
				data-slot="alert-center-bar"
				data-placement="bar"
				data-alert-id={alert.id}
			>
				<AlertCenterItemContext.Provider
					// Keyed by the alert's id: a promotion must remount the projected
					// children rather than reconcile one alert's DOM (and state) into
					// another's.
					key={alert.id}
					value="bar"
				>
					{alert.children}
				</AlertCenterItemContext.Provider>
				{/* Only while a Content surface is composed — otherwise the control
				    would toggle an expansion with nowhere to render, and its
				    aria-controls would reference a missing id. */}
				{remaining > 0 && contentMounted && (
					<Alert.ExpandButton
						className={centeredBarControl}
						count={remaining}
						expanded={isExpanded}
						aria-controls={contentId}
						onClick={() => setExpanded(!isExpanded)}
					/>
				)}
			</Alert.Root>
		</div>
	);
};

type AlertCenterContentProps = Omit<ComponentProps<"div">, "children" | "id"> & {
	/** Rows are the registered items' authored children — Content takes none of its own. */
	children?: never;
};

/**
 * The inline expansion below `AlertCenter.Bar`. It renders the additional
 * alerts (every registered item except the bar's top one), ranked
 * highest-severity-first, as full-width banner rows that push the app shell
 * down while expanded. Each row is the item's authored children inside an
 * `Alert.Root` chrome stamped with `data-placement="list"` and
 * `data-alert-id`.
 *
 * @see https://mantle.ngrok.com/components/preview/alert-center#alertcentercontent
 *
 * @example
 * ```tsx
 * <AlertCenter.Root>
 *   <AlertCenter.Bar />
 *   <AlertCenter.Content />
 *   <AlertCenter.Item id="transfer-limit" intent="warning">
 *     …
 *   </AlertCenter.Item>
 * </AlertCenter.Root>
 * ```
 */
const Content = ({ className, onBlur, onFocus, ref, ...props }: AlertCenterContentProps) => {
	const { store, isExpanded, contentId } = useAlertCenterContext("AlertCenter.Content");
	const alerts = useRankedAlerts(store);
	const additionalAlerts = alerts.slice(1);

	// Report the expansion surface to the Bar (which renders the expand control
	// only while one is composed). Mount/unmount only — an empty Content is
	// still composed.
	useIsomorphicLayoutEffect(() => {
		store.setContentMounted(true);
		return () => {
			store.setContentMounted(false);
		};
	}, [store]);

	// Dismissing a row removes the focused control with no blur — steer
	// keyboard focus to the first remaining dismiss control instead of letting
	// it fall to <body>. (When the LAST row goes, this wrapper unmounts with
	// it — that drop is the same known preview limitation as the emptying bar.)
	const wrapperRef = useRef<HTMLDivElement | null>(null);
	const composedRef = useComposedRefs(wrapperRef, ref);
	const {
		hadFocusWithinRef,
		onFocus: trackFocusWithin,
		onBlur: trackBlurWithin,
	} = useFocusWithin();
	const rowIds = additionalAlerts.map((alert) => alert.id).join(" ");
	useIsomorphicLayoutEffect(() => {
		const wrapper = wrapperRef.current;
		if (wrapper == null || !hadFocusWithinRef.current || wrapper.contains(document.activeElement)) {
			return;
		}
		wrapper.querySelector<HTMLElement>('[data-slot="alert-dismiss-icon-button"]')?.focus();
	}, [rowIds]);

	// Nothing is hidden behind the bar → there's no expansion to render or
	// animate, and the bar shows no expand control. (This stays unmounted rather
	// than collapsing to zero height, so the shell sits flush against the bar.)
	if (additionalAlerts.length === 0) {
		return null;
	}

	return (
		<div
			{...props}
			ref={composedRef}
			// chain the consumer handlers ahead of the internal focus tracking —
			// spreading props above would otherwise silently drop them
			onFocus={(event) => {
				onFocus?.(event);
				trackFocusWithin();
			}}
			onBlur={(event) => {
				onBlur?.(event);
				trackBlurWithin(event);
			}}
			data-slot="alert-center-content"
			// after the spread so consumers can't break the aria-controls wiring or
			// the state hook the animation reads
			id={contentId}
			data-state={isExpanded ? "open" : "closed"}
			className={cx(
				// Slide the expansion open/closed by animating height 0 <-> auto — the
				// same technique and 200ms/ease-out curve as `Accordion.Content`.
				// `interpolate-size:allow-keywords` makes the `auto` keyword animatable
				// (Chromium; other engines snap, a fine progressive enhancement) and
				// `overflow-hidden` clips the rows mid-slide. When collapsed,
				// `content-visibility:hidden` takes the rows — and their CTA links — out
				// of the tab order and a11y tree; `invisible` is the equivalent fallback
				// for engines without content-visibility. Both transition discretely so
				// the rows stay visible through the closing slide before they're skipped.
				"h-0 overflow-hidden invisible [content-visibility:hidden] transition-[height,visibility,content-visibility] transition-discrete duration-200 ease-out [interpolate-size:allow-keywords] data-state-open:h-auto data-state-open:visible data-state-open:[content-visibility:visible] motion-reduce:transition-none",
				className,
			)}
		>
			<ul aria-label="More alerts" className="flex w-full flex-col">
				{additionalAlerts.map((alert) => (
					<li key={alert.id}>
						<Alert.Root
							appearance="banner"
							intent={alert.intent}
							className={cx(chromeClassName, alert.className)}
							data-slot="alert-center-item"
							data-placement="list"
							data-alert-id={alert.id}
						>
							<AlertCenterItemContext.Provider value="list">
								{alert.children}
							</AlertCenterItemContext.Provider>
						</Alert.Root>
					</li>
				))}
			</ul>
		</div>
	);
};

/**
 * A single, top-level entry point for one-to-many account alerts and their
 * upgrade CTAs — the aggregation layer that replaces a stack of independent
 * window banners. Alerts are AUTHORED as `AlertCenter.Item` JSX (mount to
 * show, unmount to dismiss); each item registers its facts + content, and the
 * center derives the count, the top alert, and the severity ranking from the
 * registrations. `AlertCenter.Bar` shows the highest-severity item inline
 * (with its CTA) and a count-and-caret control; `AlertCenter.Content` expands
 * the remaining items as full-width banners.
 *
 * Ranking is deterministic: severity first (`danger` › `warning` ›
 * `important` › `info` › `success`), then arrival order within an intent —
 * items mounting together rank in tree order, later arrivals append after
 * their same-intent peers, and a dismissed-then-returning id resumes its
 * original position.
 *
 * Compose `Bar` and `Content` into `AppLayout.Notice`, alongside any other
 * window-level notice. Items may be authored anywhere under `Root`, but their
 * children render at the Bar/Content position — wrap `Root` (not individual
 * items) with any context providers they need.
 *
 * @see https://mantle.ngrok.com/components/preview/alert-center
 *
 * @example
 * Composition (items render `null` in place; their children project into the
 * bar or a row):
 * ```
 * AlertCenter.Root
 * ├── AlertCenter.Bar        ← the top-ranked item's children, in Alert chrome
 * ├── AlertCenter.Content    ← every other item's children, as ranked rows
 * └── AlertCenter.Item (0..n, renderless)
 *     └── Alert.Icon / Alert.Content / Alert.Title / Alert.Description /
 *         AlertCenter.DismissIconButton
 * ```
 *
 * @example
 * ```tsx
 * <AppLayout.Root className="fixed inset-0">
 *   <AppLayout.Notice>
 *     {showPreviewNotice && <PreviewNotice />}
 *     <AlertCenter.Root>
 *       <AlertCenter.Bar />
 *       <AlertCenter.Content />
 *       <AlertCenter.Item id="payment-failed" intent="danger">
 *         <Alert.Icon />
 *         <Alert.Content>
 *           <Alert.Title>
 *             Payment failed — we couldn't charge your card.{" "}
 *             <a href="/billing">Update payment method</a>
 *           </Alert.Title>
 *           <Alert.Description>
 *             Update your payment method to avoid a service interruption.
 *           </Alert.Description>
 *         </Alert.Content>
 *       </AlertCenter.Item>
 *       {!dismissed.has("transfer-limit") && (
 *         <AlertCenter.Item id="transfer-limit" intent="warning">
 *           <Alert.Icon />
 *           <Alert.Content>
 *             <Alert.Title>
 *               You've used 92% of your monthly transfer.{" "}
 *               <a href="/billing/choose-a-plan">Upgrade</a>
 *             </Alert.Title>
 *             <AlertCenter.DismissIconButton onClick={() => dismiss("transfer-limit")} />
 *           </Alert.Content>
 *         </AlertCenter.Item>
 *       )}
 *     </AlertCenter.Root>
 *   </AppLayout.Notice>
 *   <AppLayout.Body>…</AppLayout.Body>
 * </AppLayout.Root>
 * ```
 */
const AlertCenter = {
	/**
	 * The renderless state owner: creates the registration store, owns the
	 * expansion's open state, and mounts the persistent live-region announcer.
	 *
	 * @see https://mantle.ngrok.com/components/preview/alert-center#alertcenterroot
	 *
	 * @example
	 * ```tsx
	 * <AlertCenter.Root>
	 *   <AlertCenter.Bar />
	 *   <AlertCenter.Content />
	 *   <AlertCenter.Item id="payment-failed" intent="danger">
	 *     …
	 *   </AlertCenter.Item>
	 * </AlertCenter.Root>
	 * ```
	 */
	Root,
	/**
	 * The always-visible strip: the highest-severity item's children inline
	 * (icon, title, CTA) plus the count-and-caret expansion control. Collapses
	 * to nothing when empty. Claims no ARIA landmark; arrivals are announced by
	 * Root's persistent live region.
	 *
	 * @see https://mantle.ngrok.com/components/preview/alert-center#alertcenterbar
	 *
	 * @example
	 * ```tsx
	 * <AlertCenter.Root>
	 *   <AlertCenter.Bar />
	 *   <AlertCenter.Content />
	 *   <AlertCenter.Item id="payment-failed" intent="danger">
	 *     …
	 *   </AlertCenter.Item>
	 * </AlertCenter.Root>
	 * ```
	 */
	Bar,
	/**
	 * The inline expansion listing every alert hidden by the bar, ranked
	 * highest-severity-first as full-width banner rows of the items' authored
	 * children.
	 *
	 * @see https://mantle.ngrok.com/components/preview/alert-center#alertcentercontent
	 *
	 * @example
	 * ```tsx
	 * <AlertCenter.Root>
	 *   <AlertCenter.Bar />
	 *   <AlertCenter.Content />
	 *   <AlertCenter.Item id="transfer-limit" intent="warning">
	 *     …
	 *   </AlertCenter.Item>
	 * </AlertCenter.Root>
	 * ```
	 */
	Content,
	/**
	 * One authored alert: renderless registration of `{id, intent}`
	 * facts plus banner-content children, projected into the bar or an
	 * expansion row by rank. Mount to show; unmount to dismiss.
	 *
	 * @see https://mantle.ngrok.com/components/preview/alert-center#alertcenteritem
	 *
	 * @example
	 * ```tsx
	 * <AlertCenter.Item id="payment-failed" intent="danger">
	 *   <Alert.Icon />
	 *   <Alert.Content>
	 *     <Alert.Title>
	 *       Payment failed — <a href="/billing">update your card</a>
	 *     </Alert.Title>
	 *   </Alert.Content>
	 * </AlertCenter.Item>
	 * ```
	 */
	Item,
	/**
	 * The per-item dismiss affordance: `Alert.DismissIconButton` wired to the
	 * enclosing banner's rendered title and the bar's control centering. Its
	 * presence in an item's children is what makes that alert dismissable.
	 *
	 * @see https://mantle.ngrok.com/components/preview/alert-center#alertcenterdismissiconbutton
	 *
	 * @example
	 * ```tsx
	 * <AlertCenter.Item id="transfer-limit" intent="warning">
	 *   <Alert.Icon />
	 *   <Alert.Content>
	 *     <Alert.Title>Approaching your data transfer limit</Alert.Title>
	 *     <AlertCenter.DismissIconButton onClick={() => dismiss("transfer-limit")} />
	 *   </Alert.Content>
	 * </AlertCenter.Item>
	 * ```
	 */
	DismissIconButton,
} as const;

export {
	//,
	AlertCenter,
	// exported for unit tests, intentionally NOT re-exported from index.ts
	AlertCenterStore,
	alertsSummary,
	alertTitleText,
	barPresenceReducer,
	rankAlerts,
	SEVERITY_RANK,
};

export type {
	//,
	AlertCenterIntent,
	AlertCenterItemProps,
	AlertCenterRootProps,
};
