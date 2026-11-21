/**
 * Runs a consumer's event handler, then the behavior's handler unless the
 * consumer called `event.preventDefault()`. A default that an outer listener
 * prevented before the consumer ran does not count, because a modal layer
 * prevents the Escape that a nested popup owns.
 *
 * @example
 * ```tsx
 * <button onKeyDown={composeHandlers(props.onKeyDown, triggerProps.onKeyDown)} />
 * ```
 */
const composeHandlers =
	<E extends { defaultPrevented: boolean }>(
		consumer: ((event: E) => void) | undefined,
		own: (event: E) => void,
	) =>
	(event: E): void => {
		const prevented = event.defaultPrevented;
		consumer?.(event);
		if (prevented || !event.defaultPrevented) {
			own(event);
		}
	};

export {
	//,
	composeHandlers,
};
