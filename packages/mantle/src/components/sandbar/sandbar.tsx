"use client";

import type { AnimationEvent, ComponentProps, FocusEvent, ReactNode, Ref } from "react";
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
import { Alert } from "../alert/alert.js";
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
 * Fallback for closing → closed when the exit animation never fires (e.g.
 * `animate-none` overrides or animations globally disabled). Must exceed the
 * 150ms exit duration.
 */
const EXIT_ANIMATION_TIMEOUT_MS = 250;

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
 * The imperative surface of a {@link Sandbar}, exposed via `Sandbar.Root`'s
 * `handleRef` prop. `shake()` is a compound feedback action — it wiggles the
 * panel (skipped under `prefers-reduced-motion`) and always pushes an
 * assertive live-region announcement, so blocked navigation is perceivable
 * with or without motion.
 *
 * @example
 * ```tsx
 * const sandbarHandle = useRef<SandbarHandle>(null);
 *
 * useBlockUnsavedNavigation({
 *   enabled: isDirty,
 *   onNavigationBlocked: () => sandbarHandle.current?.shake(),
 * });
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
 * The panel's visibility lifecycle. `closing` keeps the panel mounted and
 * visible while the exit animation runs; only `closed` hides it.
 */
type SandbarPresence = "closed" | "closing" | "open";

type SandbarRootProps = ComponentProps<"div"> & {
	/**
	 * Whether the sandbar is showing. Controlled-only — the pending state
	 * (e.g. a form's dirty flag) lives in your app, not in the component.
	 *
	 * `Sandbar.Root` must stay mounted and be toggled with `open`, never
	 * conditionally mounted (`{isDirty && <Sandbar.Root …>}`): the screen
	 * reader announcement only works when the internal live regions exist in
	 * the tree before the message appears, and the exit animation needs the
	 * panel alive to play. A Root that mounts with `open` already true does
	 * not announce (mounting is not a live-region change).
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
 * `ref`, `className`, and all other props target the panel. Render it in
 * place at the end of the form it saves — `position: fixed` changes paint
 * position, not tab order, so Tab from the last field lands on the actions.
 * Escape is intentionally inert (a one-keypress discard would destroy data).
 *
 * @see https://mantle.ngrok.com/components/preview/sandbar
 *
 * @example
 * ```tsx
 * <Sandbar.Root open={isDirty} handleRef={sandbarHandle}>
 *   <Sandbar.Message>You have unsaved changes</Sandbar.Message>
 *   <Sandbar.Actions>
 *     <Sandbar.DiscardButton onClick={reset}>Discard</Sandbar.DiscardButton>
 *     <Sandbar.SaveButton onClick={save} isLoading={isPending}>Save</Sandbar.SaveButton>
 *   </Sandbar.Actions>
 *   {error != null && <Sandbar.Error>{error}</Sandbar.Error>}
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
	handleRef,
	onAnimationEnd,
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
	const politeClearTimerRef = useRef<number>(undefined);
	const assertiveClearTimerRef = useRef<number>(undefined);
	const assertiveFrameRef = useRef<number>(undefined);
	const assertiveNbspToggleRef = useRef(false);
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
	const isInitialRenderRef = useRef(true);
	const previousOpenRef = useRef(open);
	const previousPresenceRef = useRef(presence);

	const announcePolite = useCallback((text: string) => {
		setPoliteText(text);
		window.clearTimeout(politeClearTimerRef.current);
		politeClearTimerRef.current = window.setTimeout(() => {
			setPoliteText("");
		}, ANNOUNCEMENT_CLEAR_DELAY_MS);
	}, []);

	const announceAssertive = useCallback((text: string) => {
		// A live region only announces *changes*: clear first, then inject on the
		// next frame. Alternate a trailing no-break space so byte-identical
		// repeats (a second blocked navigation) still register as a change —
		// Safari/VoiceOver skip repeated identical strings otherwise.
		const padded = assertiveNbspToggleRef.current ? `${text}\u00A0` : text;
		assertiveNbspToggleRef.current = !assertiveNbspToggleRef.current;
		setAssertiveText("");
		if (assertiveFrameRef.current != null) {
			window.cancelAnimationFrame(assertiveFrameRef.current);
		}
		assertiveFrameRef.current = window.requestAnimationFrame(() => {
			setAssertiveText(padded);
			window.clearTimeout(assertiveClearTimerRef.current);
			assertiveClearTimerRef.current = window.setTimeout(() => {
				setAssertiveText("");
			}, ANNOUNCEMENT_CLEAR_DELAY_MS);
		});
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
			const activeElement = document.activeElement;
			const buttonHoldsFocus = button != null && activeElement === button;
			const focusFellToBody =
				button != null &&
				activeElement === document.body &&
				lastFocusedInsideRef.current === button;
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
			animation.onfinish = () => {
				shakeAnimationRef.current = null;
			};
			shakeAnimationRef.current = animation;
		},
		[announceAssertive],
	);

	useImperativeHandle(handleRef, () => ({ shake }), [shake]);

	const context = useMemo<SandbarContextValue>(
		() => ({ announceAssertive, registerMessage, reportSaving }),
		[announceAssertive, registerMessage, reportSaving],
	);

	// Presence transitions driven by the controlled `open` prop. Closing runs
	// the exit animation before the panel hides; reopening mid-exit cancels it.
	useEffect(() => {
		if (open) {
			setPresence("open");
		} else {
			setPresence((current) => (current === "closed" ? "closed" : "closing"));
		}
	}, [open]);

	// Safety net: if the exit animation never fires (animations disabled,
	// `animate-none` overrides), force closed so the machine cannot stick.
	useEffect(() => {
		if (presence !== "closing") {
			return;
		}
		const timer = window.setTimeout(() => {
			setPresence("closed");
		}, EXIT_ANIMATION_TIMEOUT_MS);
		return () => {
			window.clearTimeout(timer);
		};
	}, [presence]);

	// Announce the message when the bar opens. Mount is deliberately skipped:
	// a live region only announces changes, so a Root that mounts with `open`
	// already true stays silent (and conditional mounting misses announcements
	// entirely — pass `open` instead).
	useEffect(() => {
		const wasOpen = previousOpenRef.current;
		previousOpenRef.current = open;
		if (isInitialRenderRef.current) {
			isInitialRenderRef.current = false;
			return;
		}
		if (!open) {
			// Clear on close so a reopen within the 1s clear window still registers
			// as a live-region change — re-announcing the byte-identical string
			// would bail out of the state update and say nothing. Removals are
			// announcement-silent (`aria-relevant` defaults to `additions text`).
			if (wasOpen) {
				window.clearTimeout(politeClearTimerRef.current);
				setPoliteText("");
			}
			return;
		}
		if (wasOpen) {
			return;
		}
		const messageNode = panelRef.current?.querySelector('[data-slot="sandbar-message"]');
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
			if (assertiveFrameRef.current != null) {
				window.cancelAnimationFrame(assertiveFrameRef.current);
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
		window.requestAnimationFrame(() => {
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

	const handleAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
		onAnimationEnd?.(event);
		if (event.target !== event.currentTarget) {
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
				{/* Persistent assertive announcer for blocked navigation and errors. */}
				<div className="sr-only" role="alert">
					{assertiveText}
				</div>
				<div
					data-slot="sandbar"
					className={cx(
						// island surface — border-transparent is the forced-colors technique:
						// invisible normally, but forced-colors mode recolors transparent
						// borders to a system color while stripping box-shadow and
						// backgrounds, so the border becomes the island's boundary in
						// Windows High Contrast. bg-neutral-950 auto-flips with the theme.
						"pointer-events-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-2xl border border-transparent bg-neutral-950 px-4 py-3 text-neutral-50 shadow-lg",
						"max-h-[60svh] overflow-y-auto",
						"focus:outline-hidden",
						// quick slide+fade, ease-out both directions; reduced motion
						// keeps only the fade (motion-safe gates the slides)
						"ease-out",
						"data-state-open:animate-in data-state-open:fade-in data-state-open:duration-200 motion-safe:data-state-open:slide-in-from-bottom-4",
						"data-state-closed:animate-out data-state-closed:fade-out data-state-closed:duration-150 data-state-closed:fill-mode-forwards motion-safe:data-state-closed:slide-out-to-bottom-4",
						className,
					)}
					{...props}
					aria-label={label}
					aria-labelledby={labelledby}
					data-state={presence === "open" ? "open" : "closed"}
					hidden={isClosed ? true : undefined}
					inert={isClosed ? true : undefined}
					onAnimationEnd={handleAnimationEnd}
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
Root.displayName = "Sandbar";

type SandbarMessageProps = ComponentProps<"p"> & WithAsChild;

/**
 * The visible pending-state text (e.g. "You have unsaved changes"). A plain
 * paragraph — the live-region announcement is owned by `Sandbar.Root`'s
 * persistent announcer, not this node, and the panel's accessible name points
 * here via `aria-labelledby` so the group name always matches the visible
 * text.
 *
 * @see https://mantle.ngrok.com/components/preview/sandbar
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
const Message = ({ asChild, className, id: propId, ...props }: SandbarMessageProps) => {
	const { registerMessage } = useSandbarContext("Sandbar.Message");
	const generatedId = useId();
	const id = propId ?? generatedId;

	useIsomorphicLayoutEffect(() => registerMessage(id), [id, registerMessage]);

	const Comp = asChild ? Slot : "p";

	return (
		<Comp
			data-slot="sandbar-message"
			className={cx("text-sm font-sans", className)}
			id={id}
			{...props}
		/>
	);
};
Message.displayName = "SandbarMessage";

type SandbarActionsProps = ComponentProps<"div"> & WithAsChild;

/**
 * The action-button row. A plain flex container — deliberately not
 * `role="toolbar"`, which the ARIA APG reserves for 3+ controls with roving
 * tab stops.
 *
 * @see https://mantle.ngrok.com/components/preview/sandbar
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
const Actions = ({ asChild, className, ...props }: SandbarActionsProps) => {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			data-slot="sandbar-actions"
			className={cx("flex flex-wrap items-center justify-center gap-2", className)}
			{...props}
		/>
	);
};
Actions.displayName = "SandbarActions";

type SandbarSaveButtonProps = Omit<ButtonProps, "appearance" | "children" | "intent"> & {
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
 * @see https://mantle.ngrok.com/components/preview/sandbar
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
			data-slot="sandbar-save-button"
			appearance={appearance}
			intent={intent}
			isLoading={isLoading}
			ref={composedRef}
			{...props}
		>
			{children}
		</Button>
	);
};
SaveButton.displayName = "SandbarSaveButton";

type SandbarDiscardButtonProps = Omit<ButtonProps, "appearance" | "children" | "intent"> & {
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
 * @see https://mantle.ngrok.com/components/preview/sandbar
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
	intent = "neutral",
	...props
}: SandbarDiscardButtonProps) => {
	return (
		<Button data-slot="sandbar-discard-button" appearance={appearance} intent={intent} {...props}>
			{children}
		</Button>
	);
};
DiscardButton.displayName = "SandbarDiscardButton";

type SandbarErrorProps = Omit<ComponentProps<typeof Alert.Root>, "intent">;

/**
 * A danger alert row for a failed save. Renders a mantle `Alert` pinned to
 * `intent="danger"` on its own row of the panel. Deliberately carries no
 * `role="alert"` itself — mounting a pre-populated alert element is
 * unreliable across assistive tech, so `Sandbar.Root` mirrors the error text
 * through its persistent assertive announcer instead, which makes the usual
 * `{error != null && <Sandbar.Error>{error}</Sandbar.Error>}` conditional
 * mount safe.
 *
 * Needs Title/Icon-level control? Compose your own
 * `<Alert.Root intent="danger">` inside `Sandbar.Root` instead.
 *
 * @see https://mantle.ngrok.com/components/preview/sandbar
 *
 * @example
 * ```tsx
 * <Sandbar.Root open={isDirty} handleRef={sandbarHandle}>
 *   <Sandbar.Message>You have unsaved changes</Sandbar.Message>
 *   <Sandbar.Actions>
 *     <Sandbar.DiscardButton onClick={reset}>Discard</Sandbar.DiscardButton>
 *     <Sandbar.SaveButton onClick={save} isLoading={isPending}>Save</Sandbar.SaveButton>
 *   </Sandbar.Actions>
 *   {error != null && <Sandbar.Error>{error}</Sandbar.Error>}
 * </Sandbar.Root>
 * ```
 */
// Named SandbarError (not Error) so the global Error constructor is not
// shadowed for this module; exposed as `Sandbar.Error`.
const SandbarError = ({ children, className, ...props }: SandbarErrorProps) => {
	const { announceAssertive } = useSandbarContext("Sandbar.Error");
	const contentRef = useRef<HTMLDivElement>(null);
	const lastAnnouncedRef = useRef("");

	useEffect(() => {
		const text = contentRef.current?.textContent?.trim() ?? "";
		if (text.length === 0) {
			lastAnnouncedRef.current = "";
			return;
		}
		if (text !== lastAnnouncedRef.current) {
			lastAnnouncedRef.current = text;
			announceAssertive(text);
		}
	}, [announceAssertive, children]);

	return (
		<Alert.Root
			data-slot="sandbar-error"
			intent="danger"
			className={cx("basis-full", className)}
			{...props}
		>
			<Alert.Icon />
			<Alert.Content ref={contentRef}>
				<Alert.Description>{children}</Alert.Description>
			</Alert.Content>
		</Alert.Root>
	);
};
SandbarError.displayName = "SandbarError";

/**
 * A persistent, decision-bearing bar that floats near the bottom edge of the
 * viewport. It surfaces pending state — primarily a form's unsaved ("dirty")
 * changes — and stays until the user resolves it. Unlike Toast (which
 * announces something that already happened and leaves on its own), a Sandbar
 * surfaces something pending and stays until the user resolves it.
 *
 * The name: a sandbar is a bar that blocks navigation — exactly what this
 * does while changes are pending. Pair it with your app's navigation guard
 * and call `shake()` on the {@link SandbarHandle} when a navigation attempt
 * is blocked.
 *
 * @see https://mantle.ngrok.com/components/preview/sandbar
 *
 * @example
 * Composition:
 * ```
 * Sandbar.Root
 * ├── Sandbar.Message
 * ├── Sandbar.Actions
 * │   ├── Sandbar.DiscardButton
 * │   └── Sandbar.SaveButton
 * └── Sandbar.Error
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
 *   {error != null && <Sandbar.Error>{error}</Sandbar.Error>}
 * </Sandbar.Root>
 * ```
 */
const Sandbar = {
	/**
	 * The always-mounted shell: fixed positioning, persistent live-region
	 * announcers, presence-managed panel. Toggle with the controlled `open`
	 * prop — never conditionally mount it.
	 *
	 * @see https://mantle.ngrok.com/components/preview/sandbar
	 *
	 * @example
	 * ```tsx
	 * <Sandbar.Root open={isDirty} handleRef={sandbarHandle}>
	 *   <Sandbar.Message>You have unsaved changes</Sandbar.Message>
	 *   <Sandbar.Actions>
	 *     <Sandbar.DiscardButton onClick={reset}>Discard</Sandbar.DiscardButton>
	 *     <Sandbar.SaveButton onClick={save} isLoading={isPending}>Save</Sandbar.SaveButton>
	 *   </Sandbar.Actions>
	 *   {error != null && <Sandbar.Error>{error}</Sandbar.Error>}
	 * </Sandbar.Root>
	 * ```
	 */
	Root,
	/**
	 * The visible pending-state text. Also names the panel (via
	 * `aria-labelledby`) and feeds the polite screen-reader announcement.
	 *
	 * @see https://mantle.ngrok.com/components/preview/sandbar
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
	 * @see https://mantle.ngrok.com/components/preview/sandbar
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
	 * @see https://mantle.ngrok.com/components/preview/sandbar
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
	 * @see https://mantle.ngrok.com/components/preview/sandbar
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
	/**
	 * A danger alert row for a failed save; safe to conditionally mount —
	 * announcement goes through the persistent assertive announcer.
	 *
	 * @see https://mantle.ngrok.com/components/preview/sandbar
	 *
	 * @example
	 * ```tsx
	 * <Sandbar.Root open={isDirty} handleRef={sandbarHandle}>
	 *   <Sandbar.Message>You have unsaved changes</Sandbar.Message>
	 *   <Sandbar.Actions>
	 *     <Sandbar.DiscardButton onClick={reset}>Discard</Sandbar.DiscardButton>
	 *     <Sandbar.SaveButton onClick={save} isLoading={isPending}>Save</Sandbar.SaveButton>
	 *   </Sandbar.Actions>
	 *   {error != null && <Sandbar.Error>{error}</Sandbar.Error>}
	 * </Sandbar.Root>
	 * ```
	 */
	Error: SandbarError,
} as const;

export {
	//,
	Sandbar,
};
export type {
	//,
	SandbarActionsProps,
	SandbarDiscardButtonProps,
	SandbarErrorProps,
	SandbarHandle,
	SandbarMessageProps,
	SandbarRootProps,
	SandbarSaveButtonProps,
};
