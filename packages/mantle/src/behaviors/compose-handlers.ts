/**
 * Runs a consumer's event handler, then the behavior's handler unless the
 * consumer called `event.preventDefault()`. An Escape that an outer listener
 * prevented before the consumer ran does not count, because a modal layer
 * prevents the Escape that a nested popup owns.
 *
 * @example
 * ```tsx
 * <button onKeyDown={composeHandlers(props.onKeyDown, triggerProps.onKeyDown)} />
 * ```
 */
const composeHandlers =
	<E extends { defaultPrevented: boolean; key?: string }>(
		consumer: ((event: E) => void) | undefined,
		own: (event: E) => void,
	) =>
	(event: E): void => {
		const outerEscape = event.defaultPrevented && event.key === "Escape";
		consumer?.(event);
		if (outerEscape || !event.defaultPrevented) {
			own(event);
		}
	};

type GuardedHandler<E> = ((event: E) => void) | undefined;

/**
 * Capture handlers for a list or menu that cancel a click or a middle click on
 * a disabled item, so no handler on the item or its child runs and an
 * `asChild` link neither navigates nor opens in a new tab. A native disabled
 * button also runs no click handler. Spread it after the caller's props: it
 * runs the caller's own capture handlers for every other click.
 *
 * Why on the container, not the item: `Slot` composes a child handler ahead of
 * the item's, so a child's own `onClickCapture` would run before an item guard.
 *
 * @example
 * ```tsx
 * <div role="listbox" {...props} {...disabledItemGuard(props)} />
 * ```
 */
const disabledItemGuard = <
	E extends {
		target: EventTarget;
		currentTarget: Element;
		preventDefault: () => void;
		stopPropagation: () => void;
	},
>({
	onClickCapture,
	onAuxClickCapture,
}: {
	onClickCapture?: GuardedHandler<E>;
	onAuxClickCapture?: GuardedHandler<E>;
}) => {
	const guard = (handler: GuardedHandler<E>) => (event: E) => {
		// Why only options and menu items: a popup portaled into a menu can hold other
		// `aria-disabled` controls that still handle a click, such as a locked tag.
		const item =
			event.target instanceof Element
				? event.target.closest(':is([role="option"], [role^="menuitem"])[aria-disabled="true"]')
				: null;
		// Why `contains`: React bubbles a portaled popup's click through this list or menu.
		if (item != null && event.currentTarget.contains(item)) {
			event.preventDefault();
			event.stopPropagation();
		} else {
			handler?.(event);
		}
	};
	return { onClickCapture: guard(onClickCapture), onAuxClickCapture: guard(onAuxClickCapture) };
};

export {
	//,
	composeHandlers,
	disabledItemGuard,
};
