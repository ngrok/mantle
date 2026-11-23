"use client";

import { useState } from "react";

/**
 * One value that a parent can control or leave to the behavior. When `value`
 * is not `undefined`, the parent owns it; `setValue` then only calls
 * `onChange`.
 */
function useControllableState<T>({
	value,
	defaultValue,
	onChange,
}: {
	value: T | undefined;
	defaultValue: T;
	onChange: ((value: T) => void) | undefined;
}): [T, (next: T) => void] {
	const [uncontrolled, setUncontrolled] = useState(defaultValue);
	const controlled = value !== undefined;
	const current = controlled ? value : uncontrolled;
	const setValue = (next: T) => {
		if (Object.is(next, current)) {
			return;
		}
		if (!controlled) {
			setUncontrolled(next);
		}
		onChange?.(next);
	};
	return [current, setValue];
}

export {
	//,
	useControllableState,
};
