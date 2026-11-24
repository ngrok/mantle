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

/**
 * Cancels a click on a disabled item in the capture phase, so no handler on
 * the item or its child runs and an `asChild` link does not navigate. A
 * native disabled button also runs no click handler.
 *
 * @example
 * ```tsx
 * <div aria-disabled {...(disabled && { onClickCapture: ignoreClick })} />
 * ```
 */
const ignoreClick = (event: { preventDefault: () => void; stopPropagation: () => void }) => {
	event.preventDefault();
	event.stopPropagation();
};

export {
	//,
	composeHandlers,
	ignoreClick,
};
