"use client";

import { useSyncExternalStore } from "react";

/**
 * A small external store. A behavior keeps hot state here, such as the
 * active option, so that a change re-renders only the parts that read it.
 */
type Store<T> = {
	get: () => T;
	set: (patch: Partial<T>) => void;
	subscribe: (listener: () => void) => () => void;
};

function createStore<T extends object>(initial: T): Store<T> {
	let state = initial;
	const listeners = new Set<() => void>();
	return {
		get: () => state,
		set(patch) {
			let changed = false;
			for (const key in patch) {
				if (!Object.is(patch[key], state[key])) {
					changed = true;
					break;
				}
			}
			if (!changed) {
				return;
			}
			state = { ...state, ...patch };
			for (const listener of listeners) {
				listener();
			}
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}

/**
 * Reads one derived value from a store. The part re-renders only when the
 * value changes, so an option that reads `active === id` re-renders when it
 * gains or loses the highlight, not when another option does.
 */
function useStoreValue<T, V>(store: Store<T>, select: (state: T) => V): V {
	return useSyncExternalStore(
		store.subscribe,
		() => select(store.get()),
		() => select(store.get()),
	);
}

export {
	//,
	createStore,
	useStoreValue,
};
export type { Store };
