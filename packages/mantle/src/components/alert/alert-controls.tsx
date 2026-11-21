"use client";

import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import { XIcon } from "@phosphor-icons/react/X";
import type { ReactNode, RefObject } from "react";
import { useContext, useEffect, useRef } from "react";
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Button, type ButtonProps } from "../button/button.js";
import {
	IconButton,
	type IconButtonAppearance,
	type IconButtonProps,
} from "../button/icon-button.js";
import { AlertContext } from "./alert-context.js";
import { findTabbableNeighbors, isTabbable } from "./tabbable-neighbors.js";

// Why a separate file from `alert-context.tsx`: these controls pull in `Button`, and an
// alert without them should not load it.

const defaultDismissIcon = <XIcon />;

type AlertDismissIconButtonProps = Partial<
	Omit<IconButtonProps, "appearance" | "icon" | "intent">
> & {
	/**
	 * The visual style of the dismiss button. Optional here:
	 * `Alert.DismissIconButton` defaults to `"ghost"` so the dismiss affordance
	 * stays visually quiet inside the Alert.
	 *
	 * @default "ghost"
	 */
	appearance?: IconButtonAppearance;
	/**
	 * An optional icon to render inside the dismiss button. Defaults to an X icon.
	 */
	icon?: ReactNode;
} & WithDataSlot;

/**
 * Moves keyboard focus to the alert's nearest tabbable neighbor when the
 * dismiss button unmounts while it holds focus. Removing the focused element
 * fires no blur and silently resets `document.activeElement` to `<body>`, so
 * the next Tab restarts at the top of the page. A screen reader user also gets
 * no confirmation that the alert left.
 *
 * Two cleanups split the work. The layout cleanup runs while the alert is
 * still in the document, so it can read which element has focus and collect
 * the neighbors. The passive cleanup runs after the whole commit, so a
 * consumer layout effect that placed focus in the meantime wins. A consumer
 * `useEffect` runs later still and overrides the move. The passive cleanup
 * moves focus only when focus did fall to `<body>`, and only to a neighbor
 * that the same commit left connected and tabbable. It tries the neighbors
 * in order until one holds focus.
 *
 * @example
 * ```tsx
 * const buttonRef = useRef<HTMLButtonElement | null>(null);
 * useDismissFocusRedirect({ buttonRef, enabled: true });
 * return <IconButton ref={buttonRef} … />;
 * ```
 */
function useDismissFocusRedirect({
	buttonRef,
	enabled,
}: {
	buttonRef: RefObject<HTMLButtonElement | null>;
	/** `false` when the composing component owns focus after a dismissal. */
	enabled: boolean;
}): void {
	const neighborsRef = useRef<HTMLElement[]>([]);

	useIsomorphicLayoutEffect(() => {
		if (!enabled) {
			return;
		}
		return () => {
			const button = buttonRef.current;
			if (button == null || document.activeElement !== button) {
				return;
			}
			// `~=` matches the token inside an `asChild` slot chain.
			const anchor = button.closest('[data-slot~="alert"]') ?? button;
			neighborsRef.current = findTabbableNeighbors(anchor);
		};
	}, [buttonRef, enabled]);

	useEffect(() => {
		if (!enabled) {
			return;
		}
		return () => {
			const neighbors = neighborsRef.current;
			neighborsRef.current = [];
			if (neighbors.length === 0) {
				return;
			}
			const { activeElement } = document;
			if (activeElement != null && activeElement !== document.body) {
				return;
			}
			// The same commit can disable, hide, or detach a recorded neighbor, and
			// an engine without `checkVisibility` can pass one that `focus()` then
			// refuses, so each candidate has to confirm the move.
			for (const element of neighbors) {
				if (!element.isConnected || !isTabbable(element)) {
					continue;
				}
				element.focus();
				if (document.activeElement === element) {
					return;
				}
			}
		};
	}, [enabled]);
}

/**
 * A compact, trailing control for dismissing an alert.
 *
 * It removes nothing itself: stop rendering the alert in its `onClick`
 * handler. When that unmount happens while the button holds focus, focus
 * moves to the nearest tabbable element outside the alert (the next one in
 * document order, else the previous one) instead of falling to `<body>`. If
 * your handler or a layout effect places focus first, that choice stands.
 *
 * It inherits `--alert-control-color`, `--alert-control-hover-color`, and
 * `--alert-control-hover-bg` from `Alert.Root`, shared with
 * `Alert.ExpandButton` when both controls are composed together.
 *
 * @see https://mantle.ngrok.com/components/feedback/alert#alertdismissiconbutton
 *
 * @example
 * ```tsx
 * <Alert.Root intent="warning">
 *   <Alert.Icon />
 *   <Alert.Content>
 *     <Alert.Title>Usage limit approaching</Alert.Title>
 *     <Alert.ExpandButton count={2} expanded={isExpanded} onClick={toggle} />
 *     <Alert.DismissIconButton onClick={dismiss} />
 *   </Alert.Content>
 * </Alert.Root>
 * ```
 */
const DismissIconButton = ({
	"data-slot": dataSlot,
	size = "sm",
	type = "button",
	label = "Dismiss Alert",
	appearance = "ghost",
	className,
	icon = defaultDismissIcon,
	ref,
	...props
}: AlertDismissIconButtonProps) => {
	// Read without the invariant: the button has no other need for the
	// context, so a standalone render keeps working and takes the default.
	const context = useContext(AlertContext);
	const buttonRef = useRef<HTMLButtonElement | null>(null);
	const composedRef = useComposedRefs(buttonRef, ref);
	useDismissFocusRedirect({
		buttonRef,
		enabled: context?.redirectDismissFocus ?? true,
	});

	return (
		<IconButton
			ref={composedRef}
			appearance={appearance}
			icon={icon}
			// not a public prop: the dismiss button's visible tone is dictated by
			// the parent Alert's intent via the CSS custom properties below, so a
			// consumer-passed intent would only half-apply (focus ring, outlined
			// border) and read as a bug
			intent="neutral"
			label={label}
			size={size}
			data-slot={joinDataSlot(dataSlot, "alert-dismiss-icon-button")}
			data-alert-dismiss
			className={cx(
				"right-1.5 top-1.5 absolute",
				"text-(--alert-control-color,currentColor)",
				"not-disabled:hover:bg-(--alert-control-hover-bg,transparent) not-disabled:hover:text-(--alert-control-hover-color,currentColor)",
				className,
			)}
			type={type}
			{...props}
		/>
	);
};

type AlertExpandButtonProps = Omit<
	ButtonProps,
	// `asChild` is omitted: ExpandButton always renders two children (the count and
	// the word), which would trip Button's single-child `Children.only` invariant at
	// runtime, so the invalid configuration is unrepresentable.
	"appearance" | "asChild" | "children" | "icon" | "iconPlacement" | "intent" | "size"
> & {
	/** The number of alerts hidden by a collapsed alert center. */
	count: number;
	/** Whether the alerts controlled by this button are currently visible. */
	expanded: boolean;
} & WithDataSlot;

/**
 * A compact, trailing control for expanding or collapsing related alerts.
 *
 * It sits at the trailing edge. When `Alert.DismissIconButton` is also
 * present, it moves to the left of the dismiss control, which stays
 * rightmost. It marks the alert so `Alert.Content` reserves room for its
 * plus-prefixed count and caret on narrow viewports. It shares the
 * `--alert-control-*` color variables from `Alert.Root` with the dismiss
 * control.
 *
 * @see https://mantle.ngrok.com/components/feedback/alert#alertexpandbutton
 *
 * @example
 * ```tsx
 * <Alert.Root intent="warning">
 *   <Alert.Icon />
 *   <Alert.Content>
 *     <Alert.Title>Usage limit approaching</Alert.Title>
 *     <Alert.ExpandButton count={2} expanded={isExpanded} onClick={toggle} />
 *     <Alert.DismissIconButton />
 *   </Alert.Content>
 * </Alert.Root>
 * ```
 */
const ExpandButton = ({
	"data-slot": dataSlot,
	count,
	expanded,
	className,
	...props
}: AlertExpandButtonProps) => {
	return (
		<Button
			type="button"
			appearance="ghost"
			intent="neutral"
			size="sm"
			aria-expanded={expanded}
			aria-label={
				expanded
					? "Collapse additional alerts"
					: `Show ${count} more ${count === 1 ? "alert" : "alerts"}`
			}
			data-slot={joinDataSlot(dataSlot, "alert-expand-button")}
			data-alert-expand
			icon={
				<CaretDownIcon
					weight="bold"
					className={cx(
						"size-4 transition-transform duration-200 ease-out-strong motion-reduce:transition-none",
						expanded && "-rotate-180",
					)}
				/>
			}
			iconPlacement="end"
			className={cx(
				// Why two longhands instead of `px-1.5`: `Button` tightens the icon side
				// by 0.125rem so the glyph reads optically aligned, and it spells that as
				// `pe-2`. A shorthand cannot override a longhand: tailwind-merge keeps
				// both, and Tailwind emits `pe-*` after `px-*`, so `pe-2` would win and
				// leave the caret side looser than the text side. `pe-1` is `ps-1.5` less
				// that same 0.125rem, and it replaces `pe-2` outright.
				"right-1.5 top-1.5 absolute gap-1 ps-1.5 pe-1",
				"text-(--alert-control-color,currentColor)",
				"not-disabled:hover:bg-(--alert-control-hover-bg,transparent) not-disabled:hover:text-(--alert-control-hover-color,currentColor)",
				className,
			)}
			{...props}
		>
			<span className="min-w-[2ch] text-center tabular-nums">+{count}</span>
			<span className="hidden md:inline">more</span>
		</Button>
	);
};

export {
	//,
	DismissIconButton,
	ExpandButton,
};
