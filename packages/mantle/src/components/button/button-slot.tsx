"use client";

import type { ComponentProps, MouseEvent, ReactElement } from "react";
import { cloneElement } from "react";
import { Slot } from "../slot/index.js";

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

type ButtonSlotProps = Omit<ComponentProps<typeof Slot>, "children"> & {
	/**
	 * The `asChild` child, with the button's icon and label inside it.
	 */
	children: ReactElement;
	/**
	 * Whether the button resolved disabled. When `true`, the child gets
	 * `disabledChildProps`.
	 */
	inert: boolean;
};

/**
 * The `Slot` of an `asChild` `Button` or `IconButton`. When `inert`, it makes
 * the child inert with `disabledChildProps`.
 *
 * Why a client component of its own: the click blocker is a function, and a
 * server component cannot pass a function to an element. A native `<button>`
 * needs no blocker, so it stays a server component with no JavaScript.
 *
 * Why `Slot` renders here, not in the server component: a client trigger such
 * as `Dialog.Trigger asChild` merges its props onto this component, and `Slot`
 * passes them on to the child. A server-rendered `Slot` would hand this
 * component the finished child, and the trigger's props would stop here.
 *
 * Why for every `asChild` child, not only a disabled one: a switch on
 * `inert` would remount the child when the button turns disabled, so the child
 * would lose focus and its translated text.
 */
const ButtonSlot = ({ children, inert, ...props }: ButtonSlotProps) => (
	<Slot {...props}>{inert ? cloneElement(children, disabledChildProps) : children}</Slot>
);

export {
	//,
	ButtonSlot,
};
