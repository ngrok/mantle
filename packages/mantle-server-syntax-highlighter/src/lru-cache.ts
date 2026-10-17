/** A simple least-recently-used cache backed by insertion-order `Map` semantics. */
type LruCache<K, V> = {
	delete: (key: K) => boolean;
	get: (key: K) => V | undefined;
	set: (key: K, value: V) => void;
	size: () => number;
};

/** Creates an LRU cache that evicts the least-recently-used entry when `maxEntries` is exceeded. */
function createLruCache<K, V>(maxEntries: number): LruCache<K, V> {
	if (!Number.isInteger(maxEntries) || maxEntries <= 0) {
		throw new Error("LRU cache maxEntries must be a positive integer.");
	}

	// Why the `{ value }` box: `get` can tell a stored `undefined` from a missing key.
	const map = new Map<K, { value: V }>();

	return {
		delete(key) {
			return map.delete(key);
		},
		get(key) {
			const entry = map.get(key);
			if (entry == null) {
				return undefined;
			}

			map.delete(key);
			map.set(key, entry);
			return entry.value;
		},
		set(key, value) {
			if (map.has(key)) {
				map.delete(key);
			}

			map.set(key, { value });
			if (map.size <= maxEntries) {
				return;
			}

			const oldestKey = map.keys().next().value;
			if (oldestKey != null) {
				map.delete(oldestKey);
			}
		},
		size() {
			return map.size;
		},
	};
}

export { createLruCache };
export type { LruCache };
