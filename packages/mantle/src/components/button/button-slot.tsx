"use client";

import type { MouseEvent, ReactElement } from "react";
import { cloneElement } from "react";

/**
 * Props that make a disabled `asChild` child inert. The native `disabled`
 * attribute does nothing on an `<a>`, so the child leaves the tab order and a
 * click is cancelled in the capture phase, before the child's own `onClick` or
 * a router's navigation runs.
 *
 * Why on the child through `cloneElement`, not on the `Slot`: Radix composes a
 * child handler ahead of a slot handler, so a child's own `onClickCapture`
 * would run before the blocker. Set on the child, these props replace it.
 */
const disabledChildProps = {
	tabIndex: -1,
	onClickCapture: (event: MouseEvent<HTMLElement>) => {
		event.preventDefault();
		event.stopPropagation();
	},
} as const;

type ButtonSlotProps = {
	/**
	 * The `Slot` element of the button, with the `asChild` child inside it.
	 */
	children: ReactElement<{ children: ReactElement<Partial<typeof disabledChildProps>> }>;
	/**
	 * Whether the button resolved disabled. When `true`, the child gets
	 * `disabledChildProps`.
	 */
	inert: boolean;
};

/**
 * Makes the `asChild` child of a `Button` or `IconButton` inert when `inert`.
 * It takes the button's `Slot` element and sets `disabledChildProps` on the
 * child inside it, so `Slot` still merges the child's own props.
 *
 * Why a client component of its own: the click blocker is a function, and a
 * server component cannot pass a function to an element. A native `<button>`
 * needs no blocker, so it stays a server component with no JavaScript.
 *
 * Why it does not import `Slot`: the server renders the `Slot` element and
 * passes it in, so `Slot` stays out of this client chunk.
 *
 * Why for every `asChild` child, not only a disabled one: a switch on
 * `inert` would remount the child when the button turns disabled, so the child
 * would lose focus and its translated text.
 */
const ButtonSlot = ({ children: slot, inert }: ButtonSlotProps) =>
	inert ? cloneElement(slot, {}, cloneElement(slot.props.children, disabledChildProps)) : slot;

export {
	//,
	ButtonSlot,
};
