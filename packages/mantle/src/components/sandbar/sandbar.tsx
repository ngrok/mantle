"use client";

import type { ComponentProps, FocusEvent, ReactNode, Ref, TransitionEvent } from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useId,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";
import invariant from "tiny-invariant";
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js";
import { getPrefersReducedMotion } from "../../hooks/use-prefers-reduced-motion.js";
import type { WithAsChild } from "../../types/as-child.js";
import { useComposedRefs } from "../../utils/compose-refs/compose-refs.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import type { ButtonProps } from "../button/button.js";
import { Button } from "../button/button.js";
import { Slot } from "../slot/index.js";

/**
 * The last-resort accessible name for the panel, used only when no
 * `Sandbar.Message` is mounted and the consumer passed no `aria-label`.
 */
const DEFAULT_ACCESSIBLE_NAME = "Unsaved changes";

/**
 * The default assertive announcement for a blocked navigation attempt.
 * Save-flavored because batch-save is the flagship intent; non-save uses
 * override it per-call via `shake({ announcement })`.
 */
const DEFAULT_BLOCKED_NAVIGATION_ANNOUNCEMENT =
	"You have unsaved changes. Save or discard them before leaving.";

/**
 * Announced politely when `Sandbar.SaveButton` enters its loading state, so
 * screen-reader users hear that the save is underway. The save's resolution
 * is outside the component's reach: consumers MUST pair save success with
 * their own status announcement (mantle Toast qualifies).
 */
const SAVING_ANNOUNCEMENT = "Saving changes…";

/**
 * How long an injected polite announcement stays in the live region before
 * being cleared. Clearing prevents the announcer's text from being read twice
 * in the virtual-cursor reading order (once here, once in the visible
 * message); removals are announcement-silent by spec (`aria-relevant`
 * defaults to `additions text`).
 */
const ANNOUNCEMENT_CLEAR_DELAY_MS = 1_000;

/**
 * Fallback for closing → closed when the exit transition never fires (e.g.
 * `transition-none` overrides or animations globally disabled). Must exceed
 * the 200ms exit duration.
 */
const EXIT_TRANSITION_TIMEOUT_MS = 400;

/**
 * The panel's blocked-navigation wiggle: the origin implementation's ±8px /
 * 400ms with one extra ±3px decay step so the motion settles instead of
 * stopping abruptly. Symmetric oscillation wants symmetric easing, hence
 * ease-in-out rather than the panel's ease-out.
 */
const shakeKeyframes: Keyframe[] = [
	{ transform: "translateX(0)" },
	{ transform: "translateX(-8px)" },
	{ transform: "translateX(8px)" },
	{ transform: "translateX(-6px)" },
	{ transform: "translateX(6px)" },
	{ transform: "translateX(-3px)" },
	{ transform: "translateX(3px)" },
	{ transform: "translateX(0)" },
];

/**
 * Make a live-region injection differ from the one before it by alternating an
 * invisible trailing no-break space, advancing `toggle` in place.
 *
 * Two mechanisms need this. React bails out of a `setState` with an identical
 * value, so re-announcing a byte-identical string would never mutate the text
 * node and would say nothing at all (a retried save, a second blocked
 * navigation). And a live region only announces *changes* — Safari/VoiceOver
 * additionally skip repeated identical strings even when the node is rewritten.
 *
 * @example
 * ```ts
 * const toggle = useRef(false);
 * alternateAnnouncement("Saving changes…", toggle); // "Saving changes…"
 * alternateAnnouncement("Saving changes…", toggle); // "Saving changes…" + U+00A0
 * ```
 */
function alternateAnnouncement(text: string, toggle: { current: boolean }): string {
	const padded = toggle.current ? `${text}\u00A0` : text;
	toggle.current = !toggle.current;
	return padded;
}

/**
 * The imperative surface of a {@link Sandbar}, exposed via `Sandbar.Root`'s
 * `handleRef` prop. `shake()` is a compound feedback action — it wiggles the
 * panel (skipped under `prefers-reduced-motion`) and always pushes an
 * assertive live-region announcement, so blocked navigation is perceivable
 * with or without motion.
 *
 * @see https://mantle.ngrok.com/components/feedback/sandbar#sandbarhandle
 *
 * @example
 * ```tsx
 * const sandbarHandle = useRef<SandbarHandle>(null);
 *
 * // hand this to your router's guard — it owns the blocking, the bar reacts
 * const onNavigationBlocked = () => sandbarHandle.current?.shake();
 *
 * <Sandbar.Root open={isDirty} handleRef={sandbarHandle}>
 *   <Sandbar.Message>You have unsaved changes</Sandbar.Message>
 *   <Sandbar.Actions>
 *     <Sandbar.DiscardButton onClick={reset}>Discard</Sandbar.DiscardButton>
 *     <Sandbar.SaveButton onClick={save} isLoading={isPending}>Save</Sandbar.SaveButton>
 *   </Sandbar.Actions>
 * </Sandbar.Root>
 * ```
 */
type SandbarHandle = {
	/**
	 * Signal that an action (usually navigation) was blocked because changes
	 * are still pending: wiggles the panel and announces assertively.
	 *
	 * The default announcement is save-flavored; pass `announcement` for other
	 * intents (e.g. "Publish or discard your pending items before leaving.").
	 */
	shake: (options?: { announcement?: string }) => void;
};

type SandbarContextValue = {
	announceAssertive: (text: string) => void;
	registerMessage: (id: string) => () => void;
	reportSaving: (options: { button: HTMLButtonElement | null; isSaving: boolean }) => void;
};

const SandbarContext = createContext<SandbarContextValue | null>(null);

function useSandbarContext(part: string): SandbarContextValue {
	const context = useContext(SandbarContext);
	invariant(context, `${part} must be rendered as a child of <Sandbar.Root>.`);
	return context;
}

/**
 * The panel's visibility lifecycle. `opening` paints one frame in the closed
 * pose so the enter can transition from it (transitions cannot start from
 * `display: none`); `closing` keeps the panel mounted and visible while the
 * exit transition runs; only `closed` hides it.
 */
type SandbarPresence = "closed" | "closing" | "open" | "opening";

/**
 * Props for `Sandbar.Root`. Extends `<div>` props — which target the visible
 * panel, not the fixed-position wrapper — with the controlled `open` flag and
 * the imperative `handleRef`. Deliberately no `asChild`: Root renders four
 * nodes, so single-child polymorphism has no coherent meaning.
 *
 * @see https://mantle.ngrok.com/components/feedback/sandbar#sandbarroot
 *
 * @example
 * ```tsx
 * <Sandbar.Root open={isDirty} handleRef={sandbarHandle}>
 *   <Sandbar.Message>You have unsaved changes</Sandbar.Message>
 *   <Sandbar.Actions>
 *     <Sandbar.DiscardButton onClick={reset}>Discard</Sandbar.DiscardButton>
 *     <Sandbar.SaveButton onClick={save} isLoading={isPending}>Save</Sandbar.SaveButton>
 *   </Sandbar.Actions>
 * </Sandbar.Root>
 * ```
 */
type SandbarRootProps = ComponentProps<"div"> &
	WithDataSlot & {
		/**
		 * Whether the sandbar is showing. Controlled-only — the pending state
		 * (e.g. a form's dirty flag) lives in your app, not in the component.
		 *
		 * `Sandbar.Root` must stay mounted and be toggled with `open`, never
		 * conditionally mounted (`{isDirty && <Sandbar.Root …>}`). The
		 * screen-reader announcement only works when the internal live regions
		 * exist in the tree before the message appears. The exit animation needs
		 * the panel alive to play. A Root that mounts with `open` already true
		 * does not announce (mounting is not a live-region change).
		 */
		open: boolean;
		/**
		 * Receives the imperative {@link SandbarHandle}. Kept separate from `ref`
		 * (which stays the panel's DOM element, like every other mantle part) —
		 * wire it to your navigation guard's blocked callback.
		 */
		handleRef?: Ref<SandbarHandle>;
	};

/**
 * The always-mounted shell of the sandbar. Renders a private viewport-fixed
 * wrapper, two persistent visually-hidden live regions (a polite `status`
 * announcer and an assertive `alert` announcer), and the visible panel — a
 * floating island with `role="group"`, named by `Sandbar.Message` via
 * `aria-labelledby` (a consumer `aria-label` wins when passed).
 *
 * The panel is an `invert-theme` island: it renders in the opposite theme of
 * the page (light ⇄ dark, light-high-contrast ⇄ dark-high-contrast), and so
 * does everything composed inside it — the blessed buttons and any custom
 * children.
 *
 * `ref`, `className`, and all other props target the panel. Render it in
 * place at the end of the form it saves — `position: fixed` changes paint
 * position, not tab order, so Tab from the last field lands on the actions.
 * Escape is intentionally inert (a one-keypress discard would destroy data).
 *
 * Data attributes stamped on the panel:
 *
 * | Data Attribute | Value                  | Description                                                                                                                        |
 * | -------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
 * | `data-slot`    | `"sandbar"`            | Stable styling hook for the panel. Survives `className` overrides.                                                                 |
 * | `data-state`   | `"open"` \| `"closed"` | `"open"` only at the resting open pose — `"closed"` covers the pre-enter frame and the exit transition, which is what drives them. |
 *
 * @see https://mantle.ngrok.com/components/feedback/sandbar#sandbarroot
 *
 * @example
 * ```tsx
 * <Sandbar.Root open={isDirty} handleRef={sandbarHandle}>
 *   <Sandbar.Message>You have unsaved changes</Sandbar.Message>
 *   <Sandbar.Actions>
 *     <Sandbar.DiscardButton onClick={reset}>Discard</Sandbar.DiscardButton>
 *     <Sandbar.SaveButton onClick={save} isLoading={isPending}>Save</Sandbar.SaveButton>
 *   </Sandbar.Actions>
 * </Sandbar.Root>
 * ```
 */
// Deliberately no `asChild`: Root renders four nodes (wrapper, two announcers,
// panel), so single-child polymorphism has no coherent meaning here.
const Root = ({
	"aria-label": ariaLabel,
	"aria-labelledby": ariaLabelledby,
	children,
	className,
	"data-slot": dataSlot,
	handleRef,
	onTransitionEnd,
	open,
	ref,
	...props
}: SandbarRootProps) => {
	const [presence, setPresence] = useState<SandbarPresence>(open ? "open" : "closed");
	const [politeText, setPoliteText] = useState("");
	const [assertiveText, setAssertiveText] = useState("");
	const [messageId, setMessageId] = useState<string | null>(null);

	const wrapperRef = useRef<HTMLDivElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const composedPanelRef = useComposedRefs(panelRef, ref);

	const shakeAnimationRef = useRef<Animation | null>(null);
	const politeClearTimerRef = useRef<number | undefined>(undefined);
	const assertiveClearTimerRef = useRef<number | undefined>(undefined);
	const focusOutFrameRef = useRef<number | undefined>(undefined);
	const politeToggleRef = useRef(false);
	const assertiveToggleRef = useRef(false);
	const isSavingRef = useRef(false);
	/**
	 * The element that was focused immediately before focus entered the bar —
	 * the restore target when closing while focus is still inside.
	 */
	const restoreFocusRef = useRef<HTMLElement | null>(null);
	/**
	 * The most recently focused element inside the bar. Needed because
	 * Chromium applies the focus-fixup rule synchronously when a focused
	 * button becomes disabled: by the time our effects run,
	 * `document.activeElement` is already `<body>`.
	 */
	const lastFocusedInsideRef = useRef<HTMLElement | null>(null);
	const previousOpenRef = useRef(open);
	const previousPresenceRef = useRef(presence);

	// Both announcers inject synchronously and route through
	// `alternateAnnouncement`, which is what makes a repeat land: a retried save
	// re-announcing "Saving changes…" and a second blocked navigation are both
	// byte-identical repeats React would otherwise bail out of, leaving the text
	// node untouched and the region silent. Injecting on a
	// `requestAnimationFrame` instead would drop the announcement outright in a
	// backgrounded tab, where rAF never runs.
	const announcePolite = useCallback((text: string) => {
		setPoliteText(alternateAnnouncement(text, politeToggleRef));
		window.clearTimeout(politeClearTimerRef.current);
		politeClearTimerRef.current = window.setTimeout(() => {
			setPoliteText("");
		}, ANNOUNCEMENT_CLEAR_DELAY_MS);
	}, []);

	const announceAssertive = useCallback((text: string) => {
		setAssertiveText(alternateAnnouncement(text, assertiveToggleRef));
		window.clearTimeout(assertiveClearTimerRef.current);
		assertiveClearTimerRef.current = window.setTimeout(() => {
			setAssertiveText("");
		}, ANNOUNCEMENT_CLEAR_DELAY_MS);
	}, []);

	const registerMessage = useCallback((id: string) => {
		setMessageId(id);
		return () => {
			setMessageId((current) => (current === id ? null : current));
		};
	}, []);

	const reportSaving = useCallback(
		({ button, isSaving }: { button: HTMLButtonElement | null; isSaving: boolean }) => {
			const wasSaving = isSavingRef.current;
			isSavingRef.current = isSaving;
			if (!isSaving || wasSaving) {
				return;
			}
			announcePolite(SAVING_ANNOUNCEMENT);
			// mantle Button collapses `isLoading` into the native `disabled`
			// attribute, so a keyboard-activated save button drops focus the moment
			// the save starts. Park focus on the panel before paint — covering both
			// fixup behaviors: Chromium has already moved focus to <body>, Firefox
			// leaves it on the now-disabled button.
			//
			// Gated on the button having actually gone disabled: Button resolves
			// `disabled` as `ariaDisabled ?? disabled ?? isLoading`, so an explicit
			// `disabled={false}` beside `isLoading` leaves it enabled and focusable.
			// Parking then would yank focus off a live, still-clickable control.
			if (button == null || !button.matches(":disabled")) {
				return;
			}
			const activeElement = document.activeElement;
			const buttonHoldsFocus = activeElement === button;
			const focusFellToBody =
				activeElement === document.body && lastFocusedInsideRef.current === button;
			if (buttonHoldsFocus || focusFellToBody) {
				panelRef.current?.focus({ preventScroll: true });
			}
		},
		[announcePolite],
	);

	const shake = useCallback(
		(options?: { announcement?: string }) => {
			announceAssertive(options?.announcement ?? DEFAULT_BLOCKED_NAVIGATION_ANNOUNCEMENT);

			const panel = panelRef.current;
			// The announcement above is the load-bearing feedback; the wiggle is
			// skipped under reduced motion and in environments without the Web
			// Animations API (e.g. happy-dom).
			if (panel == null || getPrefersReducedMotion() || typeof panel.animate !== "function") {
				return;
			}
			// Cancel any in-flight wiggle so rapid blocked attempts never dead-zone.
			if (shakeAnimationRef.current != null) {
				shakeAnimationRef.current.cancel();
				shakeAnimationRef.current = null;
			}
			const animation = panel.animate(shakeKeyframes, { duration: 400, easing: "ease-in-out" });
			// Why: `cancel()` rejects `finished` with an `AbortError`. Browsers
			// suppress the report when nobody read `finished`, but happy-dom
			// surfaces it as an unhandled rejection and fails the test run.
			animation.finished.catch(() => {});
			animation.onfinish = () => {
				shakeAnimationRef.current = null;
			};
			shakeAnimationRef.current = animation;
		},
		[announceAssertive],
	);

	useImperativeHandle(handleRef, () => ({ shake }), [shake]);

	// Deliberately independent of `presence`: every value here is a stable
	// callback, so the context identity survives the four presence transitions
	// instead of re-rendering every consumer on each one.
	const context = useMemo<SandbarContextValue>(
		() => ({ announceAssertive, registerMessage, reportSaving }),
		[announceAssertive, registerMessage, reportSaving],
	);

	// Presence transitions driven by the controlled `open` prop. Opening from
	// rest inserts one painted frame in the closed pose so the enter can
	// transition from it; reopening mid-exit goes straight to open, letting
	// the transition retarget smoothly from the panel's current position
	// (never restarting from the bottom — the sonner behavior).
	useEffect(() => {
		if (open) {
			setPresence((current) => {
				if (current === "open" || current === "opening") {
					return current;
				}
				return current === "closing" ? "open" : "opening";
			});
		} else {
			setPresence((current) => {
				if (current === "closed") {
					return current;
				}
				// closing from the pre-paint frame has nothing to transition — hide now
				return current === "opening" ? "closed" : "closing";
			});
		}
	}, [open]);

	// One painted frame in the closed pose, then flip to open. Double-rAF
	// guarantees the closed pose actually painted before the destination
	// styles land — a single callback can fire before the commit's paint.
	useEffect(() => {
		if (presence !== "opening") {
			return;
		}
		let frame = window.requestAnimationFrame(() => {
			frame = window.requestAnimationFrame(() => {
				setPresence((current) => (current === "opening" ? "open" : current));
			});
		});
		return () => {
			window.cancelAnimationFrame(frame);
		};
	}, [presence]);

	// Safety net: if the exit transition never fires (transitions disabled,
	// `transition-none` overrides), force closed so the machine cannot stick.
	useEffect(() => {
		if (presence !== "closing") {
			return;
		}
		const timer = window.setTimeout(() => {
			setPresence("closed");
		}, EXIT_TRANSITION_TIMEOUT_MS);
		return () => {
			window.clearTimeout(timer);
		};
	}, [presence]);

	// Announce the message when the bar opens. Mount is deliberately skipped:
	// a live region only announces changes, so a Root that mounts with `open`
	// already true stays silent (and conditional mounting misses announcements
	// entirely — pass `open` instead).
	useEffect(() => {
		// `previousOpenRef` is seeded with `open`, so the mount pass already reads
		// `wasOpen === open` and falls through both guards below without announcing
		// — no separate first-render flag is needed.
		const wasOpen = previousOpenRef.current;
		previousOpenRef.current = open;
		if (!open) {
			// Clear on close so a closed bar never leaves text sitting in the live
			// region. Removals are announcement-silent (`aria-relevant` defaults to
			// `additions text`), so this is free.
			if (wasOpen) {
				window.clearTimeout(politeClearTimerRef.current);
				setPoliteText("");
			}
			return;
		}
		if (wasOpen) {
			return;
		}
		// `~=` (not `=`): `joinDataSlot` space-joins an ancestor chain ahead of the
		// part's own slot, so an exact-match selector misses every composed Message.
		const messageNode = panelRef.current?.querySelector('[data-slot~="sandbar-message"]');
		const messageText = messageNode?.textContent?.trim();
		announcePolite(messageText || ariaLabel || DEFAULT_ACCESSIBLE_NAME);
	}, [announcePolite, ariaLabel, open]);

	// Restore focus when the bar finishes closing while focus is still inside
	// the bar (or fell to <body> from a disabled child). Restore-to-previous is the
	// dialog pattern, guarded for this non-modal surface: if the user moved on
	// during an async save, leave them alone; if the stored target is gone or
	// disabled, leave focus where the browser put it.
	useEffect(() => {
		const previousPresence = previousPresenceRef.current;
		previousPresenceRef.current = presence;
		if (presence !== "closed" || previousPresence !== "closing") {
			return;
		}
		const wrapper = wrapperRef.current;
		const activeElement = document.activeElement;
		const focusIsInBar =
			wrapper != null && activeElement instanceof HTMLElement && wrapper.contains(activeElement);
		const focusFellToBody = activeElement === document.body && lastFocusedInsideRef.current != null;
		const candidate = restoreFocusRef.current;
		// End-of-session bookkeeping: the next open session starts clean, so a
		// stale target from this session can never steal focus later.
		restoreFocusRef.current = null;
		lastFocusedInsideRef.current = null;
		if (!focusIsInBar && !focusFellToBody) {
			return;
		}
		if (candidate == null || !candidate.isConnected || candidate.matches(":disabled")) {
			return;
		}
		// Focusing an invisible element silently no-ops and would strand focus.
		if (typeof candidate.checkVisibility === "function" && !candidate.checkVisibility()) {
			return;
		}
		candidate.focus();
	}, [presence]);

	// Clean up timers, frames, and any in-flight shake on unmount.
	useEffect(() => {
		return () => {
			window.clearTimeout(politeClearTimerRef.current);
			window.clearTimeout(assertiveClearTimerRef.current);
			if (focusOutFrameRef.current != null) {
				window.cancelAnimationFrame(focusOutFrameRef.current);
			}
			shakeAnimationRef.current?.cancel();
		};
	}, []);

	const handleFocusIn = (event: FocusEvent<HTMLDivElement>) => {
		const wrapper = wrapperRef.current;
		const related = event.relatedTarget;
		const cameFromOutside = wrapper != null && (related == null || !wrapper.contains(related));
		if (cameFromOutside && related instanceof HTMLElement) {
			restoreFocusRef.current = related;
		}
		if (event.target instanceof HTMLElement) {
			lastFocusedInsideRef.current = event.target;
		}
	};

	const handleFocusOut = (event: FocusEvent<HTMLDivElement>) => {
		// Best-effort parking for composed (non-blessed) buttons: when focus
		// evaporates (no relatedTarget) because the focused child became
		// disabled or hidden, pull it back onto the panel. SaveButton has a
		// guaranteed path via reportSaving; this covers everything else.
		if (event.relatedTarget != null) {
			// Focus moved somewhere deliberate. When it lands outside the bar,
			// close the "focus was just inside" window so the fell-to-body
			// heuristics (save parking, restore-on-close) never act on stale data
			// after the user has moved on.
			const wrapper = wrapperRef.current;
			if (wrapper == null || !wrapper.contains(event.relatedTarget)) {
				lastFocusedInsideRef.current = null;
			}
			return;
		}
		const departed = event.target;
		if (!(departed instanceof HTMLElement)) {
			return;
		}
		// Coalesced and cancellable: focus churn inside the bar (a row of controls
		// going disabled during a save) would otherwise queue one uncancelled
		// frame per departure, each retaining its `departed` node past unmount.
		if (focusOutFrameRef.current != null) {
			window.cancelAnimationFrame(focusOutFrameRef.current);
		}
		focusOutFrameRef.current = window.requestAnimationFrame(() => {
			focusOutFrameRef.current = undefined;
			const panel = panelRef.current;
			if (panel == null || panel.hidden) {
				return;
			}
			const departedIsGone =
				!departed.isConnected || departed.matches(":disabled") || departed.hidden;
			if (departedIsGone && document.activeElement === document.body) {
				panel.focus({ preventScroll: true });
			}
		});
	};

	const handleTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
		onTransitionEnd?.(event);
		if (event.target !== event.currentTarget) {
			return;
		}
		// only the presence transition's own properties advance the machine —
		// a consumer-added transition on another property must not close early.
		//
		// Why no "transform": Tailwind v4's `translate-y-*` writes the standalone
		// `translate` property, never `transform`. `motion-safe` gates only that
		// half, so the `opacity` transition runs in every engine and under reduced
		// motion — it is the guaranteed path, and widening this list would let a
		// consumer's own `transform` transition close the panel mid-exit.
		if (event.propertyName !== "opacity" && event.propertyName !== "translate") {
			return;
		}
		setPresence((current) => (current === "closing" ? "closed" : current));
	};

	// Accessible-name resolution: consumer aria-labelledby > consumer
	// aria-label > the mounted Message (name tracks the visible text and
	// localizes for free) > the save-flavored fallback.
	const labelledby =
		ariaLabelledby ?? (ariaLabel == null && messageId != null ? messageId : undefined);
	const label = labelledby == null ? (ariaLabel ?? DEFAULT_ACCESSIBLE_NAME) : ariaLabel;

	const isClosed = presence === "closed";
	// `inert` covers the exit, not just the resting closed state: through the
	// 200ms drop the panel is still painted and still in the tab order, so a user
	// who was Tabbing toward Discard as the save landed could focus and activate a
	// control that is visually gone. `data-state-closed:pointer-events-none` only
	// suppresses the mouse. Focus that `inert` evicts lands on <body> with no
	// `relatedTarget`, which `handleFocusOut` ignores (the departed control is
	// neither disconnected, disabled, nor hidden) and which the restore-on-close
	// effect reads as `focusFellToBody` — so the pre-bar element still gets focus.
	const isInert = isClosed || presence === "closing";

	return (
		<SandbarContext.Provider value={context}>
			<div
				className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 sm:bottom-10"
				onBlur={handleFocusOut}
				onFocus={handleFocusIn}
				ref={wrapperRef}
			>
				{/* Persistent polite announcer: exists before any content change so
				    injected text is reliably read. sr-only, never display:none. */}
				<div aria-atomic="true" aria-live="polite" className="sr-only" role="status">
					{politeText}
				</div>
				{/* Persistent assertive announcer for blocked navigation (`shake()`). */}
				<div className="sr-only" role="alert">
					{assertiveText}
				</div>
				<div
					className={cx(
						// island surface — `invert-theme` renders the whole panel subtree in
						// the opposite theme (light ⇄ dark, and between the high-contrast
						// pair), so the surface AND everything composed inside it — buttons,
						// alerts, links — read inverted from the page. bg-base/text-strong
						// resolve against the inverted theme. border-transparent is the
						// forced-colors technique: invisible normally, but forced-colors mode
						// recolors transparent borders to a system color while stripping
						// box-shadow and backgrounds, so the border becomes the island's
						// boundary in Windows High Contrast.
						"invert-theme pointer-events-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-2xl border border-transparent bg-base px-4 py-3 text-strong shadow-lg",
						"max-h-[60svh] overflow-y-auto",
						"focus:outline-hidden",
						// The closed state is the `hidden` attribute, and `flex` above would
						// otherwise beat the UA's `[hidden] { display: none }` — leaving a
						// permanently visible, inert, un-dismissable bar. Tailwind's Preflight
						// papers over this with `[hidden] { display: none !important }`, but a
						// consumer importing only `tailwindcss/theme` + `tailwindcss/utilities`
						// (a documented v4 setup) has no Preflight. This attribute-qualified
						// variant compiles to `.…[hidden] { display: none }` — author-origin
						// and specificity (0,2,0), so it outranks `flex` and any consumer
						// display utility on its own, with or without Preflight.
						//
						// Why the explicit `&`: editors suggest the `[[hidden]]:hidden` shorthand,
						// but Tailwind 4.3.3 compiles that to `.…:is([hidden])` instead. Same
						// specificity, different selector text — and the browser test injects this
						// one verbatim, so keep the two spellings in step if you ever switch.
						"[&[hidden]]:hidden",
						// state-driven transitions (the sonner approach): interruptible and
						// retargetable, so a reopen mid-exit rises back from wherever the
						// panel currently is instead of restarting. The closed pose sits a
						// full panel height plus the largest bottom offset (2.5rem, from
						// sm:bottom-10) below rest, fully clearing the viewport edge — the
						// enter rises from offscreen over 400ms; the exit answers a click,
						// so it drops away faster (200ms, sonner's own user-initiated
						// swipe-dismissal timing). The exit is motion-led: the per-property
						// easing list pairs positionally with transition-property, giving
						// opacity an accelerate curve (the bar stays solid while it travels,
						// evaporating only at the end to clean up the shadow at the edge)
						// while translate leads with ease-out. Reduced motion keeps only
						// the fades (motion-safe gates the translate).
						// `translate-y-*` writes the standalone `translate` property in
						// Tailwind v4 — transitioning `transform` instead silently snaps
						"transition-[opacity,translate] ease-out",
						"data-state-open:duration-400",
						"data-state-closed:pointer-events-none data-state-closed:opacity-0 data-state-closed:duration-200 motion-safe:data-state-closed:translate-y-[calc(100%+2.5rem)]",
						"data-state-closed:ease-[cubic-bezier(0.4,0,1,1),cubic-bezier(0,0,0.2,1)]",
						className,
					)}
					{...props}
					aria-label={label}
					aria-labelledby={labelledby}
					data-slot={joinDataSlot(dataSlot, "sandbar")}
					data-state={presence === "open" ? "open" : "closed"}
					hidden={isClosed ? true : undefined}
					inert={isInert ? true : undefined}
					onTransitionEnd={handleTransitionEnd}
					ref={composedPanelRef}
					role="group"
					tabIndex={-1}
				>
					{children}
				</div>
			</div>
		</SandbarContext.Provider>
	);
};

/**
 * Props for `Sandbar.Message`. Extends `<p>` props with `asChild`. An `id` is
 * generated when none is passed — it is what `Sandbar.Root` points
 * `aria-labelledby` at, so passing your own keeps that wiring intact.
 *
 * @see https://mantle.ngrok.com/components/feedback/sandbar#sandbarmessage
 *
 * @example
 * ```tsx
 * <Sandbar.Root open={isDirty} handleRef={sandbarHandle}>
 *   <Sandbar.Message>You have unsaved changes</Sandbar.Message>
 *   <Sandbar.Actions>
 *     <Sandbar.DiscardButton onClick={reset}>Discard</Sandbar.DiscardButton>
 *     <Sandbar.SaveButton onClick={save} isLoading={isPending}>Save</Sandbar.SaveButton>
 *   </Sandbar.Actions>
 * </Sandbar.Root>
 * ```
 */
type SandbarMessageProps = ComponentProps<"p"> & WithAsChild & WithDataSlot;

/**
 * The visible pending-state text (e.g. "You have unsaved changes"). A plain
 * paragraph: `Sandbar.Root`'s persistent announcer owns the live-region
 * announcement, not this node. The panel's accessible name points here via
 * `aria-labelledby`, so the group name always matches the visible text.
 *
 * Data attributes:
 *
 * | Data Attribute | Value                | Description                                                       |
 * | -------------- | -------------------- | ----------------------------------------------------------------- |
 * | `data-slot`    | `"sandbar-message"`  | Stable styling hook. Survives `className` overrides and `asChild`. |
 *
 * @see https://mantle.ngrok.com/components/feedback/sandbar#sandbarmessage
 *
 * @example
 * ```tsx
 * <Sandbar.Root open={isDirty} handleRef={sandbarHandle}>
 *   <Sandbar.Message>You have unsaved changes</Sandbar.Message>
 *   <Sandbar.Actions>
 *     <Sandbar.DiscardButton onClick={reset}>Discard</Sandbar.DiscardButton>
 *     <Sandbar.SaveButton onClick={save} isLoading={isPending}>Save</Sandbar.SaveButton>
 *   </Sandbar.Actions>
 * </Sandbar.Root>
 * ```
 */
const Message = ({
	asChild,
	className,
	"data-slot": dataSlot,
	id: propId,
	ref,
	...props
}: SandbarMessageProps) => {
	const { registerMessage } = useSandbarContext("Sandbar.Message");
	const generatedId = useId();
	const id = propId ?? generatedId;
	const nodeRef = useRef<HTMLParagraphElement>(null);
	const composedRef = useComposedRefs(nodeRef, ref);

	// Register the id the DOM actually carries, not the one passed down: under
	// `asChild`, Slot's merge lets the child element's own `id` win, so
	// registering `id` here would aim Root's `aria-labelledby` at an element that
	// does not exist — and because a present `aria-labelledby` suppresses
	// `aria-label`, the panel would end up with no accessible name at all.
	useIsomorphicLayoutEffect(
		() => registerMessage(nodeRef.current?.id || id),
		[id, registerMessage],
	);

	const Comp = asChild ? Slot : "p";

	return (
		<Comp
			className={cx("text-sm font-sans", className)}
			id={id}
			{...props}
			data-slot={joinDataSlot(dataSlot, "sandbar-message")}
			ref={composedRef}
		/>
	);
};

/**
 * Props for `Sandbar.Actions`. Extends `<div>` props with `asChild`.
 *
 * @see https://mantle.ngrok.com/components/feedback/sandbar#sandbaractions
 *
 * @example
 * ```tsx
 * <Sandbar.Root open={isDirty} handleRef={sandbarHandle}>
 *   <Sandbar.Message>You have unsaved changes</Sandbar.Message>
 *   <Sandbar.Actions>
 *     <Sandbar.DiscardButton onClick={reset}>Discard</Sandbar.DiscardButton>
 *     <Sandbar.SaveButton onClick={save} isLoading={isPending}>Save</Sandbar.SaveButton>
 *   </Sandbar.Actions>
 * </Sandbar.Root>
 * ```
 */
type SandbarActionsProps = ComponentProps<"div"> & WithAsChild & WithDataSlot;

/**
 * The action-button row. A plain flex container — deliberately not
 * `role="toolbar"`, which the ARIA APG reserves for 3+ controls with roving
 * tab stops.
 *
 * Data attributes:
 *
 * | Data Attribute | Value                | Description                                                       |
 * | -------------- | -------------------- | ----------------------------------------------------------------- |
 * | `data-slot`    | `"sandbar-actions"`  | Stable styling hook. Survives `className` overrides and `asChild`. |
 *
 * @see https://mantle.ngrok.com/components/feedback/sandbar#sandbaractions
 *
 * @example
 * ```tsx
 * <Sandbar.Root open={isDirty} handleRef={sandbarHandle}>
 *   <Sandbar.Message>You have unsaved changes</Sandbar.Message>
 *   <Sandbar.Actions>
 *     <Sandbar.DiscardButton onClick={reset}>Discard</Sandbar.DiscardButton>
 *     <Sandbar.SaveButton onClick={save} isLoading={isPending}>Save</Sandbar.SaveButton>
 *   </Sandbar.Actions>
 * </Sandbar.Root>
 * ```
 */
const Actions = ({ asChild, className, "data-slot": dataSlot, ...props }: SandbarActionsProps) => {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			className={cx("flex flex-wrap items-center justify-center gap-2", className)}
			{...props}
			data-slot={joinDataSlot(dataSlot, "sandbar-actions")}
		/>
	);
};

/**
 * Props for `Sandbar.SaveButton`. Extends `Button`'s props — including
 * `asChild` and `isLoading` — but makes `appearance` and `intent` optional
 * with save-flavored defaults, and `children` required.
 *
 * @see https://mantle.ngrok.com/components/feedback/sandbar#sandbarsavebutton
 *
 * @example
 * ```tsx
 * <Sandbar.Root open={isDirty} handleRef={sandbarHandle}>
 *   <Sandbar.Message>You have unsaved changes</Sandbar.Message>
 *   <Sandbar.Actions>
 *     <Sandbar.DiscardButton onClick={reset}>Discard</Sandbar.DiscardButton>
 *     <Sandbar.SaveButton onClick={save} isLoading={isPending}>Save</Sandbar.SaveButton>
 *   </Sandbar.Actions>
 * </Sandbar.Root>
 * ```
 */
type SandbarSaveButtonProps = Omit<ButtonProps, "appearance" | "children" | "intent"> &
	WithDataSlot & {
		/**
		 * The visual style of the button.
		 * @default "filled"
		 */
		appearance?: ButtonProps["appearance"];
		/**
		 * The tone of the button.
		 * @default "neutral"
		 */
		intent?: ButtonProps["intent"];
		/**
		 * The visible action label (e.g. "Save"). Required — action labels are app
		 * voice and must be visible at the call site.
		 */
		children: ReactNode;
	};

/**
 * The primary (save) action. A mantle `Button` defaulting to the system
 * primary style (`appearance="filled" intent="neutral"`), wired into
 * `Sandbar.Root`: while `isLoading`, Root announces "Saving changes…" via the
 * polite live region and catches the focus drop caused by the button going
 * natively disabled while focused.
 *
 * Defaults to `type="button"`; pass `type="submit"` when rendered inside the
 * form it saves. Announce the save's resolution yourself (e.g. a success
 * Toast) — the bar exits silently.
 *
 * Data attributes:
 *
 * | Data Attribute    | Value                     | Description                                                                                      |
 * | ----------------- | ------------------------- | -------------------------------------------------------------------------------------------------- |
 * | `data-slot`       | `"sandbar-save-button"`   | Stable styling hook. Replaces `Button`'s own `data-slot="button"`, as every Button wrapper does. |
 * | `data-appearance` | the resolved `appearance` | Stamped by `Button`.                                                                             |
 * | `data-intent`     | the resolved `intent`     | Stamped by `Button`.                                                                             |
 * | `data-size`       | the resolved `size`       | Stamped by `Button`; absent for `appearance="link"`.                                             |
 * | `data-disabled`   | `"true"` \| `"false"`     | Stamped by `Button`. Value-based, not presence-based — match on the value.                       |
 * | `data-loading`    | `"true"` \| `"false"`     | Stamped by `Button`, tracking `isLoading`. Value-based, not presence-based.                      |
 *
 * @see https://mantle.ngrok.com/components/feedback/sandbar#sandbarsavebutton
 *
 * @example
 * ```tsx
 * <Sandbar.Root open={isDirty} handleRef={sandbarHandle}>
 *   <Sandbar.Message>You have unsaved changes</Sandbar.Message>
 *   <Sandbar.Actions>
 *     <Sandbar.DiscardButton onClick={reset}>Discard</Sandbar.DiscardButton>
 *     <Sandbar.SaveButton onClick={save} isLoading={isPending}>Save</Sandbar.SaveButton>
 *   </Sandbar.Actions>
 * </Sandbar.Root>
 * ```
 */
const SaveButton = ({
	appearance = "filled",
	children,
	"data-slot": dataSlot,
	intent = "neutral",
	isLoading = false,
	ref,
	...props
}: SandbarSaveButtonProps) => {
	const { reportSaving } = useSandbarContext("Sandbar.SaveButton");
	const buttonRef = useRef<HTMLButtonElement>(null);
	const composedRef = useComposedRefs(buttonRef, ref);

	// Layout effect so Root can park focus before paint — Chromium moves focus
	// off a disabled button synchronously, so timing matters.
	useIsomorphicLayoutEffect(() => {
		reportSaving({ button: buttonRef.current, isSaving: Boolean(isLoading) });
	}, [isLoading, reportSaving]);

	useIsomorphicLayoutEffect(() => {
		return () => {
			reportSaving({ button: null, isSaving: false });
		};
	}, [reportSaving]);

	return (
		<Button
			appearance={appearance}
			intent={intent}
			isLoading={isLoading}
			ref={composedRef}
			{...props}
			data-slot={joinDataSlot(dataSlot, "sandbar-save-button")}
		>
			{children}
		</Button>
	);
};

/**
 * Props for `Sandbar.DiscardButton`. Extends `Button`'s props — including
 * `asChild` — but makes `appearance` and `intent` optional with
 * secondary-action defaults, and `children` required.
 *
 * @see https://mantle.ngrok.com/components/feedback/sandbar#sandbardiscardbutton
 *
 * @example
 * ```tsx
 * <Sandbar.Root open={isDirty} handleRef={sandbarHandle}>
 *   <Sandbar.Message>You have unsaved changes</Sandbar.Message>
 *   <Sandbar.Actions>
 *     <Sandbar.DiscardButton onClick={reset}>Discard</Sandbar.DiscardButton>
 *     <Sandbar.SaveButton onClick={save} isLoading={isPending}>Save</Sandbar.SaveButton>
 *   </Sandbar.Actions>
 * </Sandbar.Root>
 * ```
 */
type SandbarDiscardButtonProps = Omit<ButtonProps, "appearance" | "children" | "intent"> &
	WithDataSlot & {
		/**
		 * The visual style of the button.
		 * @default "outlined"
		 */
		appearance?: ButtonProps["appearance"];
		/**
		 * The tone of the button.
		 * @default "neutral"
		 */
		intent?: ButtonProps["intent"];
		/**
		 * The visible action label (e.g. "Discard"). Required — action labels are
		 * app voice and must be visible at the call site.
		 */
		children: ReactNode;
	};

/**
 * The secondary (discard/reset) action. A mantle `Button` defaulting to
 * `appearance="outlined" intent="neutral"`. Discard is destructive-ish: for
 * large forms, consider confirming before discarding.
 *
 * Data attributes:
 *
 * | Data Attribute    | Value                      | Description                                                                                      |
 * | ----------------- | -------------------------- | -------------------------------------------------------------------------------------------------- |
 * | `data-slot`       | `"sandbar-discard-button"` | Stable styling hook. Replaces `Button`'s own `data-slot="button"`, as every Button wrapper does. |
 * | `data-appearance` | the resolved `appearance`  | Stamped by `Button`.                                                                             |
 * | `data-intent`     | the resolved `intent`      | Stamped by `Button`.                                                                             |
 * | `data-size`       | the resolved `size`        | Stamped by `Button`; absent for `appearance="link"`.                                             |
 * | `data-disabled`   | `"true"` \| `"false"`      | Stamped by `Button`. Value-based, not presence-based — match on the value.                       |
 * | `data-loading`    | `"true"` \| `"false"`      | Stamped by `Button`, tracking `isLoading`. Value-based, not presence-based.                      |
 *
 * @see https://mantle.ngrok.com/components/feedback/sandbar#sandbardiscardbutton
 *
 * @example
 * ```tsx
 * <Sandbar.Root open={isDirty} handleRef={sandbarHandle}>
 *   <Sandbar.Message>You have unsaved changes</Sandbar.Message>
 *   <Sandbar.Actions>
 *     <Sandbar.DiscardButton onClick={reset}>Discard</Sandbar.DiscardButton>
 *     <Sandbar.SaveButton onClick={save} isLoading={isPending}>Save</Sandbar.SaveButton>
 *   </Sandbar.Actions>
 * </Sandbar.Root>
 * ```
 */
const DiscardButton = ({
	appearance = "outlined",
	children,
	"data-slot": dataSlot,
	intent = "neutral",
	...props
}: SandbarDiscardButtonProps) => {
	return (
		<Button
			appearance={appearance}
			intent={intent}
			{...props}
			data-slot={joinDataSlot(dataSlot, "sandbar-discard-button")}
		>
			{children}
		</Button>
	);
};

/**
 * A persistent, decision-bearing bar that floats near the bottom edge of the
 * viewport. It surfaces pending state — primarily a form's unsaved ("dirty")
 * changes — and stays until the user resolves it. Toast announces something
 * that already happened and leaves on its own; a Sandbar waits for the user's
 * decision. When the message needs no decision, reach for Toast or Alert.
 *
 * The name: a sandbar is a bar that blocks navigation — exactly what this
 * component does while changes are pending. Pair it with your app's
 * navigation guard and call `shake()` on the {@link SandbarHandle} when a
 * navigation attempt is blocked.
 *
 * @see https://mantle.ngrok.com/components/feedback/sandbar
 *
 * @example
 * Composition:
 * ```
 * Sandbar.Root
 * ├── Sandbar.Message
 * └── Sandbar.Actions
 *     ├── Sandbar.DiscardButton
 *     └── Sandbar.SaveButton
 * ```
 *
 * @example
 * ```tsx
 * <Sandbar.Root open={isDirty} handleRef={sandbarHandle}>
 *   <Sandbar.Message>You have unsaved changes</Sandbar.Message>
 *   <Sandbar.Actions>
 *     <Sandbar.DiscardButton onClick={reset}>Discard</Sandbar.DiscardButton>
 *     <Sandbar.SaveButton onClick={save} isLoading={isPending}>Save</Sandbar.SaveButton>
 *   </Sandbar.Actions>
 * </Sandbar.Root>
 * ```
 */
const Sandbar = {
	/**
	 * The always-mounted shell: fixed positioning, persistent live-region
	 * announcers, presence-managed panel. Toggle with the controlled `open`
	 * prop — never conditionally mount it.
	 *
	 * @see https://mantle.ngrok.com/components/feedback/sandbar#sandbarroot
	 *
	 * @example
	 * ```tsx
	 * <Sandbar.Root open={isDirty} handleRef={sandbarHandle}>
	 *   <Sandbar.Message>You have unsaved changes</Sandbar.Message>
	 *   <Sandbar.Actions>
	 *     <Sandbar.DiscardButton onClick={reset}>Discard</Sandbar.DiscardButton>
	 *     <Sandbar.SaveButton onClick={save} isLoading={isPending}>Save</Sandbar.SaveButton>
	 *   </Sandbar.Actions>
	 * </Sandbar.Root>
	 * ```
	 */
	Root,
	/**
	 * The visible pending-state text. Also names the panel (via
	 * `aria-labelledby`) and feeds the polite screen-reader announcement.
	 *
	 * @see https://mantle.ngrok.com/components/feedback/sandbar#sandbarmessage
	 *
	 * @example
	 * ```tsx
	 * <Sandbar.Root open={isDirty} handleRef={sandbarHandle}>
	 *   <Sandbar.Message>You have unsaved changes</Sandbar.Message>
	 *   <Sandbar.Actions>
	 *     <Sandbar.DiscardButton onClick={reset}>Discard</Sandbar.DiscardButton>
	 *     <Sandbar.SaveButton onClick={save} isLoading={isPending}>Save</Sandbar.SaveButton>
	 *   </Sandbar.Actions>
	 * </Sandbar.Root>
	 * ```
	 */
	Message,
	/**
	 * The action-button row. Holds `Sandbar.DiscardButton` and
	 * `Sandbar.SaveButton`, or your own composed `Button`s.
	 *
	 * @see https://mantle.ngrok.com/components/feedback/sandbar#sandbaractions
	 *
	 * @example
	 * ```tsx
	 * <Sandbar.Root open={isDirty} handleRef={sandbarHandle}>
	 *   <Sandbar.Message>You have unsaved changes</Sandbar.Message>
	 *   <Sandbar.Actions>
	 *     <Sandbar.DiscardButton onClick={reset}>Discard</Sandbar.DiscardButton>
	 *     <Sandbar.SaveButton onClick={save} isLoading={isPending}>Save</Sandbar.SaveButton>
	 *   </Sandbar.Actions>
	 * </Sandbar.Root>
	 * ```
	 */
	Actions,
	/**
	 * The primary (save) action — announces "Saving changes…" and keeps focus
	 * from being lost while the save is pending.
	 *
	 * @see https://mantle.ngrok.com/components/feedback/sandbar#sandbarsavebutton
	 *
	 * @example
	 * ```tsx
	 * <Sandbar.Root open={isDirty} handleRef={sandbarHandle}>
	 *   <Sandbar.Message>You have unsaved changes</Sandbar.Message>
	 *   <Sandbar.Actions>
	 *     <Sandbar.DiscardButton onClick={reset}>Discard</Sandbar.DiscardButton>
	 *     <Sandbar.SaveButton onClick={save} isLoading={isPending}>Save</Sandbar.SaveButton>
	 *   </Sandbar.Actions>
	 * </Sandbar.Root>
	 * ```
	 */
	SaveButton,
	/**
	 * The secondary (discard/reset) action.
	 *
	 * @see https://mantle.ngrok.com/components/feedback/sandbar#sandbardiscardbutton
	 *
	 * @example
	 * ```tsx
	 * <Sandbar.Root open={isDirty} handleRef={sandbarHandle}>
	 *   <Sandbar.Message>You have unsaved changes</Sandbar.Message>
	 *   <Sandbar.Actions>
	 *     <Sandbar.DiscardButton onClick={reset}>Discard</Sandbar.DiscardButton>
	 *     <Sandbar.SaveButton onClick={save} isLoading={isPending}>Save</Sandbar.SaveButton>
	 *   </Sandbar.Actions>
	 * </Sandbar.Root>
	 * ```
	 */
	DiscardButton,
} as const;

export {
	//,
	Sandbar,
};
export type {
	//,
	SandbarActionsProps,
	SandbarDiscardButtonProps,
	SandbarHandle,
	SandbarMessageProps,
	SandbarRootProps,
	SandbarSaveButtonProps,
};
