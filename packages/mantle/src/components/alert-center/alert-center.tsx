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
import { createPortal } from "react-dom";
import invariant from "tiny-invariant";
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js";
import { useComposedRefs } from "../../utils/compose-refs/compose-refs.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Alert, AlertContextProvider } from "../alert/alert.js";

/**
 * The tone an alert's color communicates — identical to `Alert`'s intent axis,
 * so an item's `intent` flows straight through to the `Alert` chrome that
 * renders it. Also the severity ranking key: `danger` › `warning` ›
 * `important` › `info` › `success` decides which item the bar shows.
 *
 * @see https://mantle.ngrok.com/components/feedback/alert-center
 *
 * @example
 * ```tsx
 * <AlertCenter.Item id="payment-failed" intent="danger">…</AlertCenter.Item>
 * ```
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
 * One registered alert: the coordination facts the center ranks and labels
 * with. The authored banner content never enters the store — each
 * `AlertCenter.Item` renders its children through a portal into its stable
 * host element, and `Bar`/`Content` adopt that host into their chrome.
 */
type AlertCenterRegisteredAlert = {
	/** Stable identity — the React key, the sticky-order key, and the styling hook. */
	id: string;
	/** The tone the alert's color communicates; becomes the chrome `Alert.Root`'s intent. */
	intent: AlertCenterIntent;
	/** Optional classes forwarded to the chrome `Alert.Root` in both placements. */
	className: string | undefined;
	/**
	 * Arrival order: assigned at an id's FIRST registration and sticky for the
	 * store's lifetime, so prop updates never reorder and a dismissed-then-
	 * returning id resumes its original position.
	 */
	sequence: number;
};

/**
 * Moves an item's host element into a chrome mount point, preserving as much
 * client state as the platform allows: `Element.moveBefore` (when supported
 * and both nodes share a connected document) is an atomic, state-preserving
 * move — React subtree state, element focus, selection, and CSS transitions
 * all survive — with `appendChild` as the fallback (React state still
 * survives; transient DOM state like focus is re-established by the center's
 * focus redirects).
 */
function adoptHost(
	mount: HTMLElement & { moveBefore?: (node: Node, child: Node | null) => void },
	host: HTMLElement,
): boolean {
	if (host.parentElement === mount) {
		return false;
	}
	if (typeof mount.moveBefore === "function" && host.isConnected && mount.isConnected) {
		try {
			mount.moveBefore(host, null);
			return true;
		} catch {
			// Different roots or an otherwise unmovable node — fall through to
			// the state-resetting (but always-valid) append.
		}
	}
	mount.appendChild(host);
	return true;
}

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
 * returns resumes its original spot. Two mounted items sharing an id throws —
 * see {@link AlertCenterStore.register}.
 */
class AlertCenterStore {
	#listeners = new Set<() => void>();
	#alertsById = new Map<string, AlertCenterRegisteredAlert>();
	#sequenceById = new Map<string, number>();
	#hostById = new Map<string, HTMLElement>();
	#nextSequence = 0;
	#snapshot: readonly AlertCenterRegisteredAlert[] = EMPTY_ALERTS;
	#topLabel = "";
	#contentMounted = false;

	/**
	 * The stable host element an id's authored children portal into. Created
	 * lazily (client-only — callers reach here from effects) and kept for the
	 * store's lifetime, like the id's sticky sequence: a dismissed-then-
	 * returning id reuses its host. `display: contents` makes the host
	 * layout-transparent, so the authored children participate in the chrome's
	 * flex row as if the host weren't there. `Bar`/`Content` physically adopt
	 * the host into their chrome (see {@link adoptHost}); an unplaced host
	 * simply stays detached — its children stay mounted (and stateful) in
	 * React while contributing nothing to the document.
	 */
	getHost(id: string): HTMLElement {
		const existing = this.#hostById.get(id);
		if (existing != null) {
			return existing;
		}
		const host = document.createElement("div");
		host.style.display = "contents";
		host.setAttribute("data-slot", "alert-center-item-host");
		host.setAttribute("data-alert-host", id);
		this.#hostById.set(id, host);
		return host;
	}

	#hostSnapshot: { id: string; content: Node } | null = null;

	/**
	 * Item-side: snapshot the host's current content (a deep clone). The item
	 * unmounting empties its host BEFORE the bar's exit commit renders, so the
	 * exit slide needs a pre-captured copy to stay filled — captured on every
	 * item commit (deterministic, unlike observing mutations) and kept past
	 * unregistration on purpose: the exit is exactly when it's read.
	 *
	 * Only the TOP-ranked id is captured, and only its clone is retained: the
	 * ghost is a bar-only affordance, so a lower-ranked item's clone can never
	 * be read, and keeping one per id ever registered would hold a detached
	 * banner subtree for the store's lifetime. A promoted id captures on the
	 * very commit that promotes it — unranking the previous top re-renders its
	 * siblings, and cleanup runs before their effects — so the ghost is always
	 * ready by the time the bar exits.
	 */
	captureHostSnapshot(id: string): void {
		if (id !== this.#snapshot[0]?.id) {
			return;
		}
		const host = this.#hostById.get(id);
		if (host != null && host.hasChildNodes()) {
			this.#hostSnapshot = { id, content: host.cloneNode(true) };
		}
	}

	/** The last captured content snapshot for an id, for the bar's exit ghost. */
	getHostSnapshot = (id: string): Node | null =>
		this.#hostSnapshot?.id === id ? this.#hostSnapshot.content : null;

	/** Subscribe to every store change; returns the unsubscribe function. */
	subscribe = (listener: () => void): (() => void) => {
		this.#listeners.add(listener);
		return () => {
			this.#listeners.delete(listener);
		};
	};

	/** The ranked alerts (highest severity first, arrival order within an intent). */
	getSnapshot = (): readonly AlertCenterRegisteredAlert[] => this.#snapshot;

	/**
	 * Whether an id currently has a mounted registration. This — not DOM
	 * connectivity — is how the focus redirects tell a dismissal ("the alert is
	 * gone") from a re-rank ("the alert moved placements"): adoption detaches
	 * and re-attaches hosts, so a surviving control reads as removed mid-commit.
	 */
	hasAlert = (id: string): boolean => this.#alertsById.has(id);

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

	#pendingFocusRestore: HTMLElement | null = null;

	/**
	 * Ask for a control to be re-focused once the placement move that displaced
	 * it finishes. Re-inserting a subtree (the `appendChild` path in
	 * {@link adoptHost}) drops focus to `<body>` with no blur event, and the
	 * surface that notices is not the one that completes the move — the bar sees
	 * the demotion, the expansion re-attaches the host a moment later.
	 */
	requestFocusRestore(element: HTMLElement): void {
		this.#pendingFocusRestore = element;
	}

	/**
	 * Surface-side: called after adopting hosts. Re-focuses a requested control
	 * once it is back in the document, so a re-rank never leaves a keyboard user
	 * on `<body>`, and clears the request once it does. A host that lands nowhere
	 * visible (no `AlertCenter.Content` composed) never becomes reachable, so the
	 * request simply idles until the next move replaces it.
	 */
	flushFocusRestore(): void {
		const element = this.#pendingFocusRestore;
		if (element == null || !element.isConnected) {
			return;
		}
		this.#pendingFocusRestore = null;
		if (document.activeElement !== element) {
			element.focus({ preventScroll: true });
		}
	}

	#barElement: HTMLElement | null = null;
	#placementVersion = 0;

	/**
	 * Bumped whenever a host physically moves into new chrome. Parts that
	 * derive from their rendered surroundings (`AlertCenter.DismissIconButton`
	 * reads the enclosing banner's title for its accessible name) subscribe to
	 * this so a placement move re-runs their DOM reads — the move is
	 * imperative, so no React re-render reaches the portaled tree otherwise.
	 */
	getPlacementVersion = (): number => this.#placementVersion;

	/** Surface-side: report that adoption physically moved at least one host. */
	notifyPlacementChange(): void {
		this.#placementVersion++;
		this.#emit();
	}

	/** Bar-side: publish the bar's wrapper element for cross-surface focus redirects. */
	setBarElement(element: HTMLElement | null): void {
		this.#barElement = element;
	}

	/** The bar's wrapper element, or `null` while no bar is mounted. */
	getBarElement = (): HTMLElement | null => this.#barElement;

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
	 * Item-side: add the registration for `alert.id` and return its cleanup. An
	 * id's arrival `sequence` is assigned once and kept for the store's
	 * lifetime, so re-registrations never reorder. Only the coordination facts
	 * register — the authored children render through the item's own portal
	 * into {@link AlertCenterStore.getHost}.
	 *
	 * Throws when a SECOND mounted item claims an already-registered id: both
	 * items portal into that id's single stable host, so one item's children
	 * would silently disappear (or thrash between the two) instead of the
	 * consumer seeing the mistake.
	 */
	register(alert: Omit<AlertCenterRegisteredAlert, "sequence">): () => void {
		// The check lives here — the one funnel every registration passes
		// through — and it is a live-entry check rather than an ever-seen one,
		// because React always runs an effect's cleanup before re-running it: a
		// prop update, StrictMode's mount double-invoke, and a same-commit
		// unmount/remount of the same id all unregister first. A live entry can
		// therefore only mean a second, concurrently mounted item.
		invariant(
			!this.#alertsById.has(alert.id),
			`AlertCenter.Item id "${alert.id}" is already registered by another mounted item — ids must be unique under one <AlertCenter.Root>. Render one item per id, or give each alert its own id.`,
		);
		const sequence = this.#sequenceById.get(alert.id) ?? this.#nextSequence++;
		this.#sequenceById.set(alert.id, sequence);
		const registration: AlertCenterRegisteredAlert = { ...alert, sequence };
		this.#alertsById.set(alert.id, registration);
		this.#publish();
		return () => {
			// Cleanup compares the exact registration object, never its id alone —
			// re-registering the same id (a prop update, or the same id
			// unmounting and returning) must not let a stale cleanup delete the
			// surviving registration.
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

/**
 * The facts every part needs, stable for the Root's lifetime. Deliberately
 * kept apart from {@link AlertCenterExpansionContextValue}: `AlertCenter.Item`
 * and `AlertCenter.DismissIconButton` read only these, so toggling the
 * expansion must not re-render — and re-derive the accessible name of — every
 * mounted alert.
 */
type AlertCenterContextValue = {
	store: AlertCenterStore;
	/** The `id` of `AlertCenter.Content`, wired to the expand button's `aria-controls`. */
	contentId: string;
};

const AlertCenterContext = createContext<AlertCenterContextValue | null>(null);

/** The inline expansion's open state — consumed only by `Bar` and `Content`. */
type AlertCenterExpansionContextValue = {
	/** Whether the additional alerts are currently rendered below the bar. */
	isExpanded: boolean;
	/** Opens or collapses the additional alerts. */
	setExpanded: (expanded: boolean) => void;
};

const AlertCenterExpansionContext = createContext<AlertCenterExpansionContextValue | null>(null);

function useAlertCenterContext(partName: string): AlertCenterContextValue {
	const context = useContext(AlertCenterContext);
	invariant(context, `${partName} must be rendered inside <AlertCenter.Root>.`);
	return context;
}

function useAlertCenterExpansion(partName: string): AlertCenterExpansionContextValue {
	const context = useContext(AlertCenterExpansionContext);
	invariant(context, `${partName} must be rendered inside <AlertCenter.Root>.`);
	return context;
}

const useRankedAlerts = (store: AlertCenterStore) =>
	useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

/**
 * Whether an `AlertCenter.Item` encloses this subtree, provided around its
 * portaled children at the AUTHORING site (the portal keeps React context
 * flowing from where the item is written, not where its DOM lands). Presence
 * is the whole payload — it guards the composition invariants:
 * `AlertCenter.DismissIconButton` must be inside an item's children, and items
 * must never nest. Placement-aware STYLING needs no context — the chrome
 * stamps `data-placement`, so `in-data-[placement=…]` variants adapt purely in
 * CSS, even as a host physically moves between the bar and a row.
 */
const AlertCenterItemContext = createContext(false);

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
		<div data-slot="alert-center-announcer" className="sr-only" role="status" aria-live="polite">
			{alertsSummary(topLabel, alerts.length)}
		</div>
	);
}

/**
 * Props for {@link AlertCenter.Root} — the expansion's open state. The alerts
 * themselves are authored as `AlertCenter.Item` children.
 *
 * @see https://mantle.ngrok.com/components/feedback/alert-center#alertcenterroot
 *
 * @example
 * ```tsx
 * <AlertCenter.Root open={expanded} onOpenChange={setExpanded}>
 *   <AlertCenter.Bar />
 *   <AlertCenter.Content />
 *   <AlertCenter.Item id="payment-failed" intent="danger">…</AlertCenter.Item>
 * </AlertCenter.Root>
 * ```
 */
type AlertCenterRootProps = {
	/** Controlled expanded state of the additional-alert list. Pair with `onOpenChange`. */
	open?: boolean;
	/**
	 * Uncontrolled initial expanded state of the additional-alert list.
	 *
	 * @default false
	 */
	defaultOpen?: boolean;
	/** Called when the additional-alert list expands or collapses. */
	onOpenChange?: (open: boolean) => void;
	/**
	 * The `AlertCenter.Bar`, `AlertCenter.Content`, and every `AlertCenter.Item`.
	 * Items may be authored anywhere under the root — their children stay in this
	 * tree and are projected into the bar or an expansion row by rank.
	 */
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
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `alert-center-announcer` | On the persistent visually-hidden `role="status"` live region Root mounts. |
 *
 * @see https://mantle.ngrok.com/components/feedback/alert-center#alertcenterroot
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
		() => ({ store, contentId }),
		[store, contentId],
	);
	const expansion = useMemo<AlertCenterExpansionContextValue>(
		() => ({ isExpanded, setExpanded }),
		[isExpanded, setExpanded],
	);

	return (
		<AlertCenterContext.Provider value={context}>
			<AlertCenterExpansionContext.Provider value={expansion}>
				{children}
			</AlertCenterExpansionContext.Provider>
			<Announcer store={store} />
		</AlertCenterContext.Provider>
	);
};

/**
 * Props for {@link AlertCenter.Item}: the coordination facts the center needs
 * to rank, announce, and label an alert — everything presentational is the
 * authored `children`.
 *
 * @see https://mantle.ngrok.com/components/feedback/alert-center#alertcenteritem
 *
 * @example
 * ```tsx
 * <AlertCenter.Root>
 *   <AlertCenter.Bar />
 *   <AlertCenter.Content />
 *   <AlertCenter.Item id="transfer-limit" intent="warning">
 *     <Alert.Icon />
 *     <Alert.Content>
 *       <Alert.Title>Approaching your data transfer limit</Alert.Title>
 *       <AlertCenter.DismissIconButton onClick={() => dismiss("transfer-limit")} />
 *     </Alert.Content>
 *   </AlertCenter.Item>
 * </AlertCenter.Root>
 * ```
 */
type AlertCenterItemProps = {
	/**
	 * Stable identity. It keys the item's stable host element (children keep
	 * their state as the host moves between the bar and a row), pins the
	 * item's arrival order (a returning id resumes its original position), and
	 * is stamped on the chrome as `data-alert-id` for styling. Must be unique
	 * among the items mounted under one `AlertCenter.Root` — a second mounted
	 * item claiming the same id throws, since both would project into that
	 * id's single host.
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
 * One account alert, authored as JSX. It registers its coordination facts
 * with the center and renders its children through a portal into a stable
 * per-id host element that `AlertCenter.Bar` / `AlertCenter.Content`
 * physically adopt into their chrome. Mount it to show the alert, unmount it
 * to remove it — dismissal is just your state flipping the condition off.
 *
 * Because the children stay in YOUR React tree (only their DOM lands in the
 * chrome), context providers and error boundaries around the item work, and
 * router-aware links resolve at the authoring location. The host element is
 * stable and moved — not remounted — between the bar and a row, so authored
 * content keeps its state (and, in engines with `Element.moveBefore`, even
 * focus) across re-ranks. While an item ranks nowhere visible (e.g. the
 * expansion is not composed), its children stay mounted on a detached host —
 * rendered by React, contributing nothing to the document.
 *
 * Server rendering emits no alert DOM — the bar enters after hydration with
 * its height animation, the same entrance every arriving alert gets.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `alert-center-item-host` | On the stable per-id host element the item's children portal into. |
 * | `data-alert-host` | the item's `id` | On that same host — which alert's projected children it holds. |
 *
 * @see https://mantle.ngrok.com/components/feedback/alert-center#alertcenteritem
 *
 * @example
 * ```tsx
 * <AlertCenter.Root>
 *   <AlertCenter.Bar />
 *   <AlertCenter.Content />
 *   <AlertCenter.Item id="transfer-limit" intent="warning">
 *     <Alert.Icon />
 *     <Alert.Content>
 *       <Alert.Title>
 *         You've used 92% of your monthly transfer. <a href="/billing">Upgrade</a>
 *       </Alert.Title>
 *       <Alert.Description>Free accounts include 5 GB of transfer per month.</Alert.Description>
 *       <AlertCenter.DismissIconButton onClick={() => dismiss("transfer-limit")} />
 *     </Alert.Content>
 *   </AlertCenter.Item>
 * </AlertCenter.Root>
 * ```
 */
const Item = ({ children, className, id, intent }: AlertCenterItemProps) => {
	const { store } = useAlertCenterContext("AlertCenter.Item");
	// A nested item would register while its enclosing item renders, outrank
	// or unrank its host, and loop the projection forever — fail fast instead.
	const isInsideItem = useContext(AlertCenterItemContext);
	invariant(!isInsideItem, "AlertCenter.Item cannot be rendered inside another item's children.");
	// The host is created client-side in an effect (SSR emits nothing), then
	// the portal renders into it. Facts re-register only when they change —
	// children updates flow through the portal like any other render.
	const [host, setHost] = useState<HTMLElement | null>(null);
	useIsomorphicLayoutEffect(() => {
		setHost(store.getHost(id));
	}, [store, id]);
	useIsomorphicLayoutEffect(
		() => store.register({ id, intent, className }),
		[store, id, intent, className],
	);
	// No dependency array: children can change on any commit, and the bar's
	// exit ghost must always hold the latest rendered content (the store
	// bails when the host is empty).
	useIsomorphicLayoutEffect(() => {
		store.captureHostSnapshot(id);
	});
	if (host == null) {
		return null;
	}
	// The chrome `Alert.Root` is only a DOM ancestor of the portaled children —
	// React context can't cross a portal from the DOM side, so the item
	// provides the same Alert context (same `intent`) the chrome renders with.
	return createPortal(
		<AlertContextProvider intent={intent}>
			<AlertCenterItemContext.Provider value={true}>{children}</AlertCenterItemContext.Provider>
		</AlertContextProvider>,
		host,
	);
};

type AlertCenterDismissIconButtonProps = ComponentProps<typeof Alert.DismissIconButton> &
	WithDataSlot & {
		/**
		 * Dismissal is consumer-owned: remove the alert by unmounting its
		 * `AlertCenter.Item` (and persist that however you like). Required because a
		 * dismiss affordance that does nothing is always an authoring error.
		 */
		onClick: NonNullable<ComponentProps<typeof Alert.DismissIconButton>["onClick"]>;
	};

/**
 * The dismiss affordance for the item it's composed inside. A thin wrapper over
 * `Alert.DismissIconButton` whose label defaults to `Dismiss ${title}`, derived
 * from the enclosing banner's RENDERED `Alert.Title` text and re-read on every
 * commit so the accessible name stays in lockstep with the visible copy (pass
 * `label` to override, e.g. when the title is long). Compose it — or leave it
 * out — per alert; its presence IS the alert's dismissability.
 *
 * Where the control sits in each placement is the chrome's business, not this
 * wrapper's: {@link dismissClearsExpandControl} seats it beside the bar's
 * expand control, and {@link singleLineBarControls} re-centers it in a
 * single-line bar.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `alert-center-dismiss-icon-button` | Replaces `Alert.DismissIconButton`'s own `alert-dismiss-icon-button` on the rendered button. |
 * | `data-alert-dismiss` | present | Read, not stamped — `Alert` emits it, and `AlertCenter`'s bar CSS positions the control with it. |
 *
 * @see https://mantle.ngrok.com/components/feedback/alert-center#alertcenterdismissiconbutton
 *
 * @example
 * ```tsx
 * <AlertCenter.Root>
 *   <AlertCenter.Bar />
 *   <AlertCenter.Content />
 *   <AlertCenter.Item id="transfer-limit" intent="warning">
 *     <Alert.Icon />
 *     <Alert.Content>
 *       <Alert.Title>Approaching your data transfer limit</Alert.Title>
 *       <AlertCenter.DismissIconButton onClick={() => dismiss("transfer-limit")} />
 *     </Alert.Content>
 *   </AlertCenter.Item>
 * </AlertCenter.Root>
 * ```
 */
const DismissIconButton = ({
	"data-slot": dataSlot,
	label,
	ref,
	...props
}: AlertCenterDismissIconButtonProps) => {
	const isInsideItem = useContext(AlertCenterItemContext);
	invariant(
		isInsideItem,
		"AlertCenter.DismissIconButton must be composed inside an <AlertCenter.Item>'s children.",
	);
	const { store } = useAlertCenterContext("AlertCenter.DismissIconButton");
	// Placement moves are imperative DOM adoption — no render reaches this
	// portaled tree — so subscribe to the store's placement version: landing
	// in (or moving between) chrome re-renders this control and re-derives.
	useSyncExternalStore(store.subscribe, store.getPlacementVersion, store.getPlacementVersion);
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
			{...props}
			// after the spread so consumers can't drop the styling/testing hook
			data-slot={joinDataSlot(dataSlot, "alert-center-dismiss-icon-button")}
		/>
	);
};

type AlertCenterBarProps = Omit<
	ComponentProps<typeof Alert.Root>,
	"appearance" | "intent" | "children"
> &
	WithDataSlot & {
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
 * ref. Tracked with NATIVE `focusin`/`focusout` listeners (which follow DOM
 * propagation) rather than React handlers: the authored alert content is
 * portaled, so its React events propagate through the author's tree — never
 * through the chrome wrapper the redirect logic lives on.
 *
 * @example
 * ```tsx
 * const wrapperRef = useRef<HTMLDivElement | null>(null);
 * const { lastFocusedWithinRef } = useFocusWithin({ containerRef: wrapperRef, isAttached: isMounted });
 * return isMounted ? <div ref={wrapperRef}>…</div> : null;
 * ```
 */
function useFocusWithin({
	containerRef,
	isAttached,
}: {
	containerRef: { current: HTMLElement | null };
	/** Re-attaches the listeners when the container element (re)mounts. */
	isAttached: boolean;
}): {
	/**
	 * The last element that held focus inside the container, or `null` once
	 * focus deliberately moved elsewhere. Consumers decide "focus was lost to
	 * a dismissal" by checking `!element.isConnected` at effect time — a
	 * `focusout` with a null `relatedTarget` is ambiguous (node removal,
	 * `inert` application mid-commit, window blur, a click on empty page), so
	 * the tracker never clears on it; only a real refocus outside does.
	 */
	lastFocusedWithinRef: { current: Element | null };
} {
	const lastFocusedWithinRef = useRef<Element | null>(null);

	useIsomorphicLayoutEffect(() => {
		const container = containerRef.current;
		if (!isAttached || container == null) {
			return;
		}
		const handleFocusIn = (event: FocusEvent) => {
			if (event.target instanceof Element) {
				lastFocusedWithinRef.current = event.target;
			}
		};
		const handleFocusOut = (event: FocusEvent) => {
			if (event.relatedTarget instanceof Node && !container.contains(event.relatedTarget)) {
				lastFocusedWithinRef.current = null;
			}
		};
		container.addEventListener("focusin", handleFocusIn);
		container.addEventListener("focusout", handleFocusOut);
		return () => {
			container.removeEventListener("focusin", handleFocusIn);
			container.removeEventListener("focusout", handleFocusOut);
		};
	}, [containerRef, isAttached]);

	return { lastFocusedWithinRef };
}

/**
 * Steers keyboard focus to the page's main content landmark — the fallback
 * for dismissing the LAST alert, when no in-component control remains to
 * redirect to. Landing on `main` mirrors the skip-link contract (mantle's
 * `Main` ships `tabIndex={-1}` for exactly this); a bare `<main>` without it
 * gets the same skip-link treatment so the focus call always succeeds.
 * `preventScroll` matches `SkipToMainLink`'s contract: an AlertCenter embedded
 * in a page it does not own (a docs demo, a sub-region) must move focus without
 * scrolling the reader's page out from under them.
 */
function focusMainLandmark(): void {
	const main = document.querySelector<HTMLElement>('main, [role="main"]');
	if (main == null) {
		return;
	}
	if (!main.hasAttribute("tabindex")) {
		main.tabIndex = -1;
	}
	main.focus({ preventScroll: true });
}

/**
 * Redirects keyboard focus when the bar's top alert changes underneath it.
 * Dismissing the top alert removes the focused control, which silently drops
 * focus to `<body>` for keyboard users; this steers it to the new bar's first
 * trailing control instead (the dismiss button when the new top is
 * dismissable, else the expand control), so dismissing alert after alert
 * stays a keyboard-only flow. When the LAST alert dismisses — nothing left to
 * redirect into — focus falls back to the page's main landmark, mirroring the
 * skip-link contract. It redirects ONLY when the previous top alert was
 * actually DISMISSED — a promotion while the previous alert merely moves
 * placements (a higher-severity alert arriving from a poll or a socket) must
 * never steal focus, wherever in the banner that focus sits.
 */
function useBarFocusRedirect({
	isMounted,
	store,
	topId,
}: {
	isMounted: boolean;
	store: AlertCenterStore;
	topId: string | undefined;
}): {
	wrapperRef: { current: HTMLDivElement | null };
} {
	const wrapperRef = useRef<HTMLDivElement | null>(null);
	const { lastFocusedWithinRef } = useFocusWithin({
		containerRef: wrapperRef,
		isAttached: isMounted,
	});
	const previousTopIdRef = useRef(topId);

	useIsomorphicLayoutEffect(() => {
		const previousTopId = previousTopIdRef.current;
		previousTopIdRef.current = topId;
		if (previousTopId == null || topId === previousTopId) {
			return;
		}
		const lastFocused = lastFocusedWithinRef.current;
		// A demotion, not a dismissal: the previous top alert is still registered,
		// so its focused control only moved placements. Registration — not DOM
		// connectivity — is the signal, because adopting the new top's host
		// transiently detaches the demoted one, which would make a live control
		// read as removed and let a background arrival steal the user's focus.
		// The move may still have blown focus off that control, so ask whoever
		// re-attaches the host to put the user back on it.
		if (store.hasAlert(previousTopId)) {
			if (lastFocused instanceof HTMLElement && document.activeElement !== lastFocused) {
				store.requestFocusRestore(lastFocused);
			}
			return;
		}
		// Redirect only when the focused control was genuinely REMOVED by the
		// dismissal — a still-connected tracked element means focus deliberately
		// moved elsewhere, and taking it would be stealing.
		if (lastFocused == null || lastFocused.isConnected) {
			return;
		}
		lastFocusedWithinRef.current = null;
		const wrapper = wrapperRef.current;
		// The bar emptied entirely beneath the focused control: the wrapper is
		// inert and animating out, so no in-component target remains — land on
		// the main content instead of silently dropping to <body>.
		if (topId == null) {
			focusMainLandmark();
			return;
		}
		if (wrapper == null) {
			return;
		}
		// Document order puts a composed dismiss control before the chrome expand
		// control, so this prefers dismiss when the new top alert has one. Matched
		// on `Alert`'s presence attributes rather than its `data-slot` values:
		// `AlertCenter.DismissIconButton` stamps its own part slot, and a consumer
		// may compose `Alert.DismissIconButton` (or a slot override) directly.
		const control = wrapper.querySelector<HTMLElement>("[data-alert-dismiss], [data-alert-expand]");
		(control ?? wrapper).focus();
	}, [store, topId]);

	return { wrapperRef };
}

/**
 * Chrome classes shared by the bar banner and every expansion row: the compact
 * banner metrics, plus a non-shrinking `Alert.Icon` so authored icons never
 * collapse in the flex row.
 */
const chromeClassName = "gap-2 py-2 pr-2 [&_[data-slot=alert-icon]]:shrink-0";

/**
 * Vertically centers the bar's trailing controls (dismiss and expand) while the
 * bar is a single line. `Alert` pins both controls at a fixed `top-1.5` — tuned
 * to center within its default `p-2.5` and to top-align in a multi-line alert —
 * and the bar's tighter `py-2` leaves that offset ~2px below center, so a
 * transform re-centers them independent of the padding. The
 * `not-has-data-[slot=alert-description]` gate scopes that to the single-line
 * form: once the top alert authors an `Alert.Description`, the bar is a
 * multi-line banner exactly like an expansion row, where `Alert`'s top-aligned
 * default is the correct (and row-matching) position.
 *
 * Written on the chrome rather than on the controls so one rule covers both, and
 * because only the chrome can see whether a description was authored — the
 * children render through a portal, so no React state describes their shape;
 * `:has()` reads it off the committed DOM instead. A chrome-side descendant
 * selector also follows a control through a placement move for free, which a
 * class on the control itself cannot (the move is imperative DOM adoption, with
 * no re-render).
 */
const singleLineBarControls =
	"not-has-data-[slot=alert-description]:[&_[data-alert-dismiss],&_[data-alert-expand]]:top-1/2 not-has-data-[slot=alert-description]:[&_[data-alert-dismiss],&_[data-alert-expand]]:-translate-y-1/2";

/**
 * Keeps the bar's dismiss control clear of the expand control beside it.
 * `Alert.Root` already ships this offset, but its rule matches the dismiss
 * button by the exact `data-slot` value `Alert.DismissIconButton` stamps — and
 * `AlertCenter.DismissIconButton` replaces that value with its own part slot
 * (COMPONENT_SPEC §3.2), so the rule stops matching inside the center. Restated
 * here against `data-alert-dismiss` / `data-alert-expand`, the presence
 * attributes `Alert` stamps alongside the slots, which survive the rename.
 * Only the bar composes both controls, so rows need nothing equivalent.
 */
const dismissClearsExpandControl =
	"has-data-alert-expand:[&_[data-alert-dismiss]]:right-16 md:has-data-alert-expand:[&_[data-alert-dismiss]]:right-24";

// Why no `asChild`: Bar renders a fixed two-element structure — a presence
// wrapper that owns the exit animation (`data-state`, `inert`, `tabIndex`, and
// the `transitionend` that completes the exit) around an `Alert.Root` banner —
// so there is no single default element a Slot swap could coherently replace:
// swapping the outer element breaks the exit animation, swapping the inner one
// discards the Alert chrome the part exists to provide. It also takes
// `children?: never` — the banner content is the top item's projected children,
// so a consumer has nothing to compose in. The element they actually want to
// reach is each alert's `Alert` chrome, whose parts they already author as that
// item's children.
/**
 * The always-visible, full-width strip. It renders the single highest-severity
 * item's authored children INLINE — icon, title, description, and its
 * call-to-action — so the top CTA is one glance (and zero extra clicks) away,
 * then appends a count-and-caret control that expands the additional alerts
 * below the bar. Collapses to nothing when there are no alerts (like
 * `AppLayout.Notice`), so it can stay mounted and render unconditionally.
 *
 * The bar renders the top alert as authored, so it is exactly as tall as that
 * content: single-line for a title alone, two lines once an `Alert.Description`
 * is composed (matching how the same alert renders as an expansion row). Its
 * chrome carries `data-placement="bar"` and `data-alert-id` as styling hooks for
 * placement-aware authored content — `in-data-[placement=bar]:hidden` keeps a
 * given element out of the bar and shows it only in the expansion.
 *
 * The bar itself claims NO ARIA landmark (deliberately, like `AppLayout.Notice`)
 * — arrivals and re-ranks are announced by the persistent visually-hidden
 * `role="status"` region that `AlertCenter.Root` mounts.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `alert-center-bar-wrapper` | On the presence wrapper that owns the enter/exit animation. |
 * | `data-slot` | `alert-center-bar` | On the banner chrome (`Alert.Root`) the top item's children render inside. |
 * | `data-slot` | `alert-center-bar-mount` | On the layout-transparent element the top item's host is adopted into. |
 * | `data-state` | `"open"` \| `"closed"` | On the wrapper; drives the enter/exit transition, and stays `closed` while the exit plays. |
 * | `data-placement` | `"bar"` | On the chrome — where the top item's children are currently rendering. |
 * | `data-alert-id` | the top item's `id` | On the chrome; per-alert styling and testing hook. |
 * | `data-alert-dismiss` | present on the dismiss control | Read, not stamped — `Alert` emits it; the bar's CSS centers and offsets the control with it. |
 * | `data-alert-expand` | present on the expand control | Read, not stamped — `Alert` emits it; the bar's CSS centers the control with it. |
 *
 * @see https://mantle.ngrok.com/components/feedback/alert-center#alertcenterbar
 *
 * @example
 * ```tsx
 * <AlertCenter.Root>
 *   <AlertCenter.Bar />
 *   <AlertCenter.Content />
 *   <AlertCenter.Item id="payment-failed" intent="danger">
 *     <Alert.Icon />
 *     <Alert.Content>
 *       <Alert.Title>
 *         Payment failed — we couldn't charge your card.{" "}
 *         <a href="/billing">Update payment method</a>
 *       </Alert.Title>
 *       <Alert.Description>
 *         Update your payment method to avoid a service interruption.
 *       </Alert.Description>
 *     </Alert.Content>
 *   </AlertCenter.Item>
 *   {!dismissed.has("transfer-limit") && (
 *     <AlertCenter.Item id="transfer-limit" intent="warning">
 *       <Alert.Icon />
 *       <Alert.Content>
 *         <Alert.Title>
 *           You've used 92% of your monthly transfer.{" "}
 *           <a href="/billing/choose-a-plan">Upgrade</a>
 *         </Alert.Title>
 *         <AlertCenter.DismissIconButton onClick={() => dismiss("transfer-limit")} />
 *       </Alert.Content>
 *     </AlertCenter.Item>
 *   )}
 * </AlertCenter.Root>
 * ```
 */
const Bar = ({ className, "data-slot": dataSlot, ref, ...props }: AlertCenterBarProps) => {
	const { store, contentId } = useAlertCenterContext("AlertCenter.Bar");
	const { isExpanded, setExpanded } = useAlertCenterExpansion("AlertCenter.Bar");
	const alerts = useRankedAlerts(store);
	const contentMounted = useSyncExternalStore(
		store.subscribe,
		store.getContentMounted,
		store.getContentMounted,
	);
	const topAlert = alerts[0] ?? null;
	const present = topAlert != null;
	const { isMounted, dataState, onExitTransitionEnd } = useBarPresence({ present });

	// Retain the last alert so the collapsing bar keeps its chrome through the
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

	// Adopt the top alert's host into the bar chrome — declared before the
	// focus redirect and label effects so both read post-adoption DOM. No
	// dependency array on purpose: the mount appears a commit AFTER the top
	// id settles (the presence reducer flips `isMounted` in its own layout
	// effect), so id-keyed deps would skip the commit that finally renders the
	// mount. Idempotent (adoptHost bails when already placed), and disjoint
	// from Content's adoption — the bar takes exactly the top id, the rows
	// take the rest — so sibling effect order never matters.
	//
	// The ghost: the item's unmount empties its host (the portal's children
	// leave with it), so the exit slide would collapse a blank strip. Each
	// item snapshots its own rendered content into the store on every commit;
	// when the bar exits, the retained alert's snapshot swaps in so the banner
	// stays filled through the slide — the wrapper is `inert`, so the clone's
	// dead controls are unreachable by design.
	const barMountRef = useRef<HTMLDivElement | null>(null);
	useIsomorphicLayoutEffect(() => {
		const mount = barMountRef.current;
		if (mount == null) {
			return;
		}
		if (topAlert != null) {
			const host = store.getHost(topAlert.id);
			// A retargeted exit re-opens into live content: clear any ghost
			// before adopting the real host.
			if (host.parentElement !== mount && mount.childNodes.length > 0) {
				mount.replaceChildren();
			}
			if (adoptHost(mount, host)) {
				store.notifyPlacementChange();
			}
			// A control displaced by a promotion lands here: the expansion's row
			// went away with it, and this effect is what puts the host back.
			store.flushFocusRestore();
			return;
		}
		const ghost = alert == null ? null : store.getHostSnapshot(alert.id);
		if (ghost != null && ghost.parentNode !== mount) {
			mount.replaceChildren(ghost);
		}
	});

	const { wrapperRef } = useBarFocusRedirect({ isMounted, store, topId: topAlert?.id });

	// Publish the top alert's rendered title text for the announcer's headline.
	// No dependency array: title copy can change on any commit; `setTopLabel`
	// bails when the string is unchanged.
	useIsomorphicLayoutEffect(() => {
		const wrapper = wrapperRef.current;
		store.setTopLabel(present && wrapper != null ? alertTitleText(wrapper) : "");
	});
	// The authored children render in the ITEM's tree (through its portal), so
	// a content-only update never re-renders the Bar — observe the wrapper's
	// subtree and republish so the announcer can never drift from the visible
	// copy.
	useIsomorphicLayoutEffect(() => {
		const wrapper = wrapperRef.current;
		if (wrapper == null) {
			return;
		}
		const observer = new MutationObserver(() => {
			store.setTopLabel(present ? alertTitleText(wrapper) : "");
		});
		observer.observe(wrapper, { subtree: true, childList: true, characterData: true });
		return () => {
			observer.disconnect();
		};
	}, [store, present, isMounted]);
	// Unmount-only cleanup: without it, unmounting the Bar (while Root and
	// items stay mounted) would freeze the announcer on the last-published
	// headline forever.
	useIsomorphicLayoutEffect(() => {
		return () => {
			store.setTopLabel("");
		};
	}, [store]);
	// Publish the wrapper element so Content can redirect focus into the bar
	// when its last row dismisses. Every commit (the wrapper mounts and
	// unmounts with presence); cleared on unmount.
	useIsomorphicLayoutEffect(() => {
		store.setBarElement(wrapperRef.current);
	});
	useIsomorphicLayoutEffect(() => {
		return () => {
			store.setBarElement(null);
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
			data-slot="alert-center-bar-wrapper"
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
		>
			<Alert.Root
				ref={ref}
				appearance="banner"
				intent={alert.intent}
				className={cx(
					chromeClassName,
					singleLineBarControls,
					dismissClearsExpandControl,
					className,
					alert.className,
				)}
				{...props}
				// after the spread so consumers can't drop the styling/testing hooks
				data-slot={joinDataSlot(dataSlot, "alert-center-bar")}
				data-placement="bar"
				data-alert-id={alert.id}
			>
				{/* The top item's host is physically adopted in here (layout
				    effect above) — layout-transparent, so the authored children
				    sit in the chrome's flex row as direct participants. */}
				<div ref={barMountRef} className="contents" data-slot="alert-center-bar-mount" />
				{/* Only while a Content surface is composed — otherwise the control
				    would toggle an expansion with nowhere to render, and its
				    aria-controls would reference a missing id. */}
				{remaining > 0 && contentMounted && (
					<Alert.ExpandButton
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

type AlertCenterContentProps = Omit<ComponentProps<"div">, "children" | "id"> &
	WithDataSlot & {
		/** Rows are the registered items' authored children — Content takes none of its own. */
		children?: never;
	};

// Why no `asChild`: Content renders a fixed structure — a focus-within
// container that owns the collapse animation (`data-state`, the expansion's
// `id`) around the `<ul>` of rows — so there is no single default element a
// Slot swap could coherently replace. It also takes `children?: never`: the
// rows are the registered items' projected children, so a consumer has nothing
// to compose in. The element they actually want to reach is each alert's
// `Alert` chrome, whose parts they already author as that item's children.
/**
 * The inline expansion below `AlertCenter.Bar`. It renders the additional
 * alerts (every registered item except the bar's top one), ranked
 * highest-severity-first, as full-width banner rows that push the app shell
 * down while expanded. Each row is the item's authored children inside an
 * `Alert.Root` chrome stamped with `data-placement="list"` and
 * `data-alert-id`.
 *
 * `aria-label` (default `"More alerts"`) and `aria-labelledby` name the row
 * list itself — the outer wrapper is `role="generic"`, where ARIA prohibits
 * accessible names, so a name passed here would otherwise be dropped.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `alert-center-content` | On the expansion wrapper that owns the collapse animation. |
 * | `data-slot` | `alert-center-item` | On each row's banner chrome (`Alert.Root`). |
 * | `data-state` | `"open"` \| `"closed"` | On the wrapper; drives the collapse transition. |
 * | `data-placement` | `"list"` | On each row's chrome — where that item's children are currently rendering. |
 * | `data-alert-id` | the row item's `id` | On each row's chrome; per-alert styling and testing hook. |
 * | `data-alert-mount` | the row item's `id` | On the row's layout-transparent mount point — the element that item's host is adopted into. |
 *
 * @see https://mantle.ngrok.com/components/feedback/alert-center#alertcentercontent
 *
 * @example
 * ```tsx
 * <AlertCenter.Root>
 *   <AlertCenter.Bar />
 *   <AlertCenter.Content aria-label="Autres alertes" />
 *   <AlertCenter.Item id="payment-failed" intent="danger">
 *     <Alert.Icon />
 *     <Alert.Content>
 *       <Alert.Title>
 *         Payment failed — <a href="/billing">update your card</a>
 *       </Alert.Title>
 *     </Alert.Content>
 *   </AlertCenter.Item>
 *   {!dismissed.has("transfer-limit") && (
 *     <AlertCenter.Item id="transfer-limit" intent="warning">
 *       <Alert.Icon />
 *       <Alert.Content>
 *         <Alert.Title>Approaching your data transfer limit</Alert.Title>
 *         <AlertCenter.DismissIconButton onClick={() => dismiss("transfer-limit")} />
 *       </Alert.Content>
 *     </AlertCenter.Item>
 *   )}
 * </AlertCenter.Root>
 * ```
 */
const Content = ({
	"aria-label": ariaLabel = "More alerts",
	"aria-labelledby": ariaLabelledBy,
	className,
	"data-slot": dataSlot,
	ref,
	...props
}: AlertCenterContentProps) => {
	const { store, contentId } = useAlertCenterContext("AlertCenter.Content");
	const { isExpanded, setExpanded } = useAlertCenterExpansion("AlertCenter.Content");
	const alerts = useRankedAlerts(store);
	const additionalAlerts = alerts.slice(1);
	const hasRows = additionalAlerts.length > 0;

	// Report the expansion surface to the Bar (which renders the expand control
	// only while one is composed). Mount/unmount only — an empty Content is
	// still composed.
	useIsomorphicLayoutEffect(() => {
		store.setContentMounted(true);
		return () => {
			store.setContentMounted(false);
		};
	}, [store]);

	// The open state describes a user gesture applied to a set of hidden alerts.
	// Once that set EMPTIES, the expansion (and its control) unmount, so a stale
	// `true` would silently re-open — pushing the shell down — the next time any
	// lower-ranked alert arrives, with no user action. Only that transition
	// retires the state: the first commit has no rows yet either (items register
	// from their own layout effects, which run after this one), so collapsing
	// there would defeat `defaultOpen` outright and report a close no consumer
	// controlling `open` ever asked for.
	const hadRowsRef = useRef(hasRows);
	useIsomorphicLayoutEffect(() => {
		const rowSetEmptied = hadRowsRef.current && !hasRows;
		hadRowsRef.current = hasRows;
		if (rowSetEmptied && isExpanded) {
			setExpanded(false);
		}
	}, [hasRows, isExpanded, setExpanded]);

	// Dismissing a row removes the focused control with no blur — steer
	// keyboard focus to the first remaining dismiss control instead of letting
	// it fall to <body>. When the LAST row goes (the wrapper unmounts with
	// it), fall back to the bar's first trailing control — the top alert is
	// still showing, so the dismissal flow continues there — and to the page's
	// main landmark only when no bar control remains either.
	const wrapperRef = useRef<HTMLDivElement | null>(null);
	const composedRef = useComposedRefs(wrapperRef, ref);
	const { lastFocusedWithinRef } = useFocusWithin({
		containerRef: wrapperRef,
		isAttached: hasRows,
	});
	const rowIds = additionalAlerts.map((alert) => alert.id).join(" ");

	// Adopt each additional alert's host into its row chrome — declared before
	// the focus redirect so it queries post-adoption DOM. Disjoint from the
	// Bar's adoption (the rows take everything but the top id), idempotent per
	// host, and keyed on the row set — expansion toggles keep rows mounted, so
	// hosts never need re-adoption for open/close.
	useIsomorphicLayoutEffect(() => {
		const wrapper = wrapperRef.current;
		if (wrapper == null) {
			return;
		}
		let moved = false;
		for (const mount of wrapper.querySelectorAll<HTMLElement>("[data-alert-mount]")) {
			const id = mount.getAttribute("data-alert-mount");
			if (id != null && adoptHost(mount, store.getHost(id))) {
				moved = true;
			}
		}
		if (moved) {
			store.notifyPlacementChange();
		}
		// A control displaced by a demotion lands here: the bar noticed the move,
		// this effect is what puts the host back in the document.
		store.flushFocusRestore();
	}, [store, rowIds]);

	useIsomorphicLayoutEffect(() => {
		const lastFocused = lastFocusedWithinRef.current;
		if (lastFocused == null) {
			return;
		}
		if (lastFocused.isConnected) {
			// The control survived. If it also left the expansion, a promotion
			// carried it into the bar — re-inserting its host drops focus with no
			// blur, so put the user back on it. A control still inside the
			// expansion that lost focus means the user deliberately moved on.
			const currentWrapper = wrapperRef.current;
			if (
				lastFocused instanceof HTMLElement &&
				document.activeElement !== lastFocused &&
				(currentWrapper == null || !currentWrapper.contains(lastFocused))
			) {
				lastFocusedWithinRef.current = null;
				lastFocused.focus({ preventScroll: true });
			}
			return;
		}
		// The focused control was genuinely REMOVED by the dismissal — steer
		// focus rather than letting it fall to <body>.
		lastFocusedWithinRef.current = null;
		// Prefer another row's dismiss control. Rows are not required to be
		// dismissable (danger and hard-limit alerts generally are not), so when
		// none remains — or the whole expansion went with the last row — continue
		// the flow at the bar, which is still showing, and land on the page's main
		// content only when no control remains anywhere.
		// Matched on `Alert`'s presence attributes rather than its `data-slot`
		// values: `AlertCenter.DismissIconButton` stamps its own part slot, and a
		// consumer may compose `Alert.DismissIconButton` (or a slot override)
		// directly.
		const rowControl = wrapperRef.current?.querySelector<HTMLElement>("[data-alert-dismiss]");
		if (rowControl != null) {
			rowControl.focus();
			return;
		}
		const barControl = store
			.getBarElement()
			?.querySelector<HTMLElement>("[data-alert-dismiss], [data-alert-expand]");
		if (barControl != null) {
			barControl.focus();
			return;
		}
		focusMainLandmark();
	}, [store, rowIds]);

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
			data-slot={joinDataSlot(dataSlot, "alert-center-content")}
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
			{/* The list carries the accessible name: the wrapper above is
			    role=generic, where ARIA prohibits naming. */}
			<ul
				aria-label={ariaLabelledBy == null ? ariaLabel : undefined}
				aria-labelledby={ariaLabelledBy}
				className="flex w-full flex-col"
			>
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
							{/* This row's host is physically adopted in here (layout
							    effect above); layout-transparent like the bar's mount. */}
							<div className="contents" data-alert-mount={alert.id} />
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
 * show, unmount to dismiss); each item registers its coordination facts, and
 * the center derives the count, the top alert, and the severity ranking from
 * the registrations. `AlertCenter.Bar` shows the highest-severity item inline
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
 * window-level notice. Items may be authored anywhere under `Root`: their
 * children stay in the author's React tree (context providers and error
 * boundaries around an item work; router links resolve where the item is
 * written) while their DOM renders through a stable per-id host that the bar
 * and rows physically adopt — so content keeps its state across re-ranks.
 *
 * Siblings: `Alert` (`@ngrok/mantle/alert`) is a single inline banner you place
 * and control yourself; `Toast` (`@ngrok/mantle/toast`) is for transient,
 * ephemeral notifications; `AppLayout.Notice` (`@ngrok/mantle/app-layout`) is
 * the layout slot this composes INTO, not a competitor. `AlertCenter` answers
 * only the one-to-many case: persistent, ACCOUNT-level alerts that must be
 * ranked and collapsed into a single top-level bar.
 *
 * @see https://mantle.ngrok.com/components/feedback/alert-center
 *
 * @example
 * Composition (items render no DOM in place; their children portal into a
 * stable host the bar or a row adopts):
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
 *   <AppLayout.Workspace>…</AppLayout.Workspace>
 * </AppLayout.Root>
 * ```
 */
const AlertCenter = {
	/**
	 * The renderless state owner: creates the registration store, owns the
	 * expansion's open state, and mounts the persistent live-region announcer.
	 *
	 * **Data attributes:**
	 *
	 * | Data Attribute | Value | Description |
	 * | --- | --- | --- |
	 * | `data-slot` | `alert-center-announcer` | On the persistent visually-hidden `role="status"` live region Root mounts. |
	 *
	 * @see https://mantle.ngrok.com/components/feedback/alert-center#alertcenterroot
	 *
	 * @example
	 * ```tsx
	 * <AlertCenter.Root>
	 *   <AlertCenter.Bar />
	 *   <AlertCenter.Content />
	 *   <AlertCenter.Item id="payment-failed" intent="danger">
	 *     <Alert.Icon />
	 *     <Alert.Content>
	 *       <Alert.Title>
	 *         Payment failed — we couldn't charge your card.{" "}
	 *         <a href="/billing">Update payment method</a>
	 *       </Alert.Title>
	 *       <Alert.Description>
	 *         Update your payment method to avoid a service interruption.
	 *       </Alert.Description>
	 *     </Alert.Content>
	 *   </AlertCenter.Item>
	 *   {!dismissed.has("transfer-limit") && (
	 *     <AlertCenter.Item id="transfer-limit" intent="warning">
	 *       <Alert.Icon />
	 *       <Alert.Content>
	 *         <Alert.Title>
	 *           You've used 92% of your monthly transfer.{" "}
	 *           <a href="/billing/choose-a-plan">Upgrade</a>
	 *         </Alert.Title>
	 *         <AlertCenter.DismissIconButton onClick={() => dismiss("transfer-limit")} />
	 *       </Alert.Content>
	 *     </AlertCenter.Item>
	 *   )}
	 * </AlertCenter.Root>
	 * ```
	 */
	Root,
	/**
	 * The always-visible strip: the highest-severity item's children inline
	 * (icon, title, description, CTA) plus the count-and-caret expansion control.
	 * Collapses to nothing when empty. Claims no ARIA landmark; arrivals are
	 * announced by Root's persistent live region.
	 *
	 * **Data attributes:**
	 *
	 * | Data Attribute | Value | Description |
	 * | --- | --- | --- |
	 * | `data-slot` | `alert-center-bar-wrapper` | On the presence wrapper that owns the enter/exit animation. |
	 * | `data-slot` | `alert-center-bar` | On the banner chrome (`Alert.Root`) the top item's children render inside. |
	 * | `data-slot` | `alert-center-bar-mount` | On the layout-transparent element the top item's host is adopted into. |
	 * | `data-state` | `"open"` \| `"closed"` | On the wrapper; drives the enter/exit transition, and stays `closed` while the exit plays. |
	 * | `data-placement` | `"bar"` | On the chrome — where the top item's children are currently rendering. |
	 * | `data-alert-id` | the top item's `id` | On the chrome; per-alert styling and testing hook. |
	 * | `data-alert-dismiss` | present on the dismiss control | Read, not stamped — `Alert` emits it; the bar's CSS centers and offsets the control with it. |
	 * | `data-alert-expand` | present on the expand control | Read, not stamped — `Alert` emits it; the bar's CSS centers the control with it. |
	 *
	 * @see https://mantle.ngrok.com/components/feedback/alert-center#alertcenterbar
	 *
	 * @example
	 * ```tsx
	 * <AlertCenter.Root>
	 *   <AlertCenter.Bar />
	 *   <AlertCenter.Content />
	 *   <AlertCenter.Item id="payment-failed" intent="danger">
	 *     <Alert.Icon />
	 *     <Alert.Content>
	 *       <Alert.Title>
	 *         Payment failed — we couldn't charge your card.{" "}
	 *         <a href="/billing">Update payment method</a>
	 *       </Alert.Title>
	 *       <Alert.Description>
	 *         Update your payment method to avoid a service interruption.
	 *       </Alert.Description>
	 *     </Alert.Content>
	 *   </AlertCenter.Item>
	 *   {!dismissed.has("transfer-limit") && (
	 *     <AlertCenter.Item id="transfer-limit" intent="warning">
	 *       <Alert.Icon />
	 *       <Alert.Content>
	 *         <Alert.Title>
	 *           You've used 92% of your monthly transfer.{" "}
	 *           <a href="/billing/choose-a-plan">Upgrade</a>
	 *         </Alert.Title>
	 *         <AlertCenter.DismissIconButton onClick={() => dismiss("transfer-limit")} />
	 *       </Alert.Content>
	 *     </AlertCenter.Item>
	 *   )}
	 * </AlertCenter.Root>
	 * ```
	 */
	Bar,
	/**
	 * The inline expansion listing every alert hidden by the bar, ranked
	 * highest-severity-first as full-width banner rows of the items' authored
	 * children.
	 *
	 * **Data attributes:**
	 *
	 * | Data Attribute | Value | Description |
	 * | --- | --- | --- |
	 * | `data-slot` | `alert-center-content` | On the expansion wrapper that owns the collapse animation. |
	 * | `data-slot` | `alert-center-item` | On each row's banner chrome (`Alert.Root`). |
	 * | `data-state` | `"open"` \| `"closed"` | On the wrapper; drives the collapse transition. |
	 * | `data-placement` | `"list"` | On each row's chrome — where that item's children are currently rendering. |
	 * | `data-alert-id` | the row item's `id` | On each row's chrome; per-alert styling and testing hook. |
	 * | `data-alert-mount` | the row item's `id` | On the row's layout-transparent mount point — the element that item's host is adopted into. |
	 *
	 * @see https://mantle.ngrok.com/components/feedback/alert-center#alertcentercontent
	 *
	 * @example
	 * ```tsx
	 * <AlertCenter.Root>
	 *   <AlertCenter.Bar />
	 *   <AlertCenter.Content />
	 *   <AlertCenter.Item id="payment-failed" intent="danger">
	 *     <Alert.Icon />
	 *     <Alert.Content>
	 *       <Alert.Title>
	 *         Payment failed — <a href="/billing">update your card</a>
	 *       </Alert.Title>
	 *     </Alert.Content>
	 *   </AlertCenter.Item>
	 *   {!dismissed.has("transfer-limit") && (
	 *     <AlertCenter.Item id="transfer-limit" intent="warning">
	 *       <Alert.Icon />
	 *       <Alert.Content>
	 *         <Alert.Title>Approaching your data transfer limit</Alert.Title>
	 *         <AlertCenter.DismissIconButton onClick={() => dismiss("transfer-limit")} />
	 *       </Alert.Content>
	 *     </AlertCenter.Item>
	 *   )}
	 * </AlertCenter.Root>
	 * ```
	 */
	Content,
	/**
	 * One authored alert: registers its `{id, intent}` facts and renders its
	 * children through a portal into a stable per-id host that the bar or an
	 * expansion row adopts by rank — children stay in the author's React tree
	 * and keep their state across re-ranks. Mount to show; unmount to dismiss.
	 *
	 * **Data attributes:**
	 *
	 * | Data Attribute | Value | Description |
	 * | --- | --- | --- |
	 * | `data-slot` | `alert-center-item-host` | On the stable per-id host element the item's children portal into. |
	 * | `data-alert-host` | the item's `id` | On that same host — which alert's projected children it holds. |
	 *
	 * @see https://mantle.ngrok.com/components/feedback/alert-center#alertcenteritem
	 *
	 * @example
	 * ```tsx
	 * <AlertCenter.Root>
	 *   <AlertCenter.Bar />
	 *   <AlertCenter.Content />
	 *   <AlertCenter.Item id="payment-failed" intent="danger">
	 *     <Alert.Icon />
	 *     <Alert.Content>
	 *       <Alert.Title>
	 *         Payment failed — <a href="/billing">update your card</a>
	 *       </Alert.Title>
	 *     </Alert.Content>
	 *   </AlertCenter.Item>
	 * </AlertCenter.Root>
	 * ```
	 */
	Item,
	/**
	 * The per-item dismiss affordance: `Alert.DismissIconButton` wired to the
	 * enclosing banner's rendered title and the bar's control centering. Its
	 * presence in an item's children is what makes that alert dismissable.
	 *
	 * **Data attributes:**
	 *
	 * | Data Attribute | Value | Description |
	 * | --- | --- | --- |
	 * | `data-slot` | `alert-center-dismiss-icon-button` | Replaces `Alert.DismissIconButton`'s own `alert-dismiss-icon-button` on the rendered button. |
	 * | `data-alert-dismiss` | present | Read, not stamped — `Alert` emits it, and `AlertCenter`'s bar CSS positions the control with it. |
	 *
	 * @see https://mantle.ngrok.com/components/feedback/alert-center#alertcenterdismissiconbutton
	 *
	 * @example
	 * ```tsx
	 * <AlertCenter.Root>
	 *   <AlertCenter.Bar />
	 *   <AlertCenter.Content />
	 *   <AlertCenter.Item id="transfer-limit" intent="warning">
	 *     <Alert.Icon />
	 *     <Alert.Content>
	 *       <Alert.Title>Approaching your data transfer limit</Alert.Title>
	 *       <AlertCenter.DismissIconButton onClick={() => dismiss("transfer-limit")} />
	 *     </Alert.Content>
	 *   </AlertCenter.Item>
	 * </AlertCenter.Root>
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
