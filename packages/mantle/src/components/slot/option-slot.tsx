"use client";

import type { HTMLAttributes, ReactElement, ReactNode, Ref, RefCallback } from "react";
import type { Listbox } from "../../behaviors/use-listbox.js";
import { useStoreValue } from "../../behaviors/store.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { slotContent } from "./slot.js";

/** The props a function child spreads on its element: the option's final props and a callback ref. */
type OptionRenderProps = HTMLAttributes<HTMLElement> & { ref: RefCallback<HTMLElement> };

/** The state a listbox option reports to its function child. */
type OptionState = {
	/** Whether the option has virtual focus: the pointer or the arrow keys are on it. */
	highlighted: boolean;
};

/**
 * A function child of a listbox option. It gets the option's props and state
 * and returns the one element the option renders as. Spread `props` on it.
 */
type OptionRender = (
	props: OptionRenderProps,
	state: OptionState,
) => ReactElement<{ children?: ReactNode }>;

type OptionSlotProps = HTMLAttributes<HTMLElement> & {
	id: string;
	listbox: Listbox;
	ref?: Ref<HTMLElement>;
	render: OptionRender;
	/** Moves the returned element's children into the option's own content, such as its label span and check. */
	renderContent?: (inner: ReactNode) => ReactNode;
};

/**
 * Renders a listbox option through its function child. Only an option with a
 * function child renders it, so only such an option subscribes to the
 * highlight; the others re-render only when their selection changes.
 *
 * Internal: `option-slot.test.ts` lists the parts that may import it.
 *
 * @example
 * ```tsx
 * typeof children === "function" ? (
 *   <OptionSlot {...elementProps} listbox={listbox} render={children} renderContent={renderContent} />
 * ) : (
 *   <div {...elementProps}>{renderContent(children)}</div>
 * );
 * ```
 */
const OptionSlot = ({ listbox, ref, render, renderContent, ...props }: OptionSlotProps) => {
	const highlighted = useStoreValue(listbox.getStore(), (state) => state.activeId === props.id);
	// Why a callback ref: a function child may spread the props on any element, and only a
	// callback ref fits every element's `ref` type.
	const callbackRef = useComposedRefs(ref, undefined);
	const element = render({ ...props, ref: callbackRef }, { highlighted });
	return renderContent == null ? element : slotContent(element, renderContent);
};

export {
	//,
	OptionSlot,
};

export type {
	//,
	OptionRender,
	OptionRenderProps,
	OptionState,
};
