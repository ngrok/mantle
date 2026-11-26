/** A simple least-recently-used cache backed by insertion-order `Map` semantics. */
type LruCache<K, V> = {
	delete: (key: K) => boolean;
	get: (key: K) => V | undefined;
	/** Returns the value without making it the most recently used. */
	peek: (key: K) => V | undefined;
	/** Stores `value` as the most recently used. `bytes` is its size, which counts toward `maxBytes`; the default is 0. */
	set: (key: K, value: V, bytes?: number) => void;
	/** Changes the size of a stored entry, and keeps its place in the recency order. */
	resize: (key: K, bytes: number) => void;
	size: () => number;
};

/**
 * Creates an LRU cache that evicts the least-recently-used entries while it
 * holds more than `maxEntries` entries or more than `maxBytes` bytes. The
 * newest entry stays, even when it alone is larger than `maxBytes`.
 */
function createLruCache<K, V>(
	maxEntries: number,
	{ maxBytes = Number.POSITIVE_INFINITY }: { maxBytes?: number } = {},
): LruCache<K, V> {
	if (!Number.isInteger(maxEntries) || maxEntries <= 0) {
		throw new Error("LRU cache maxEntries must be a positive integer.");
	}

	// Why the `{ value }` box: `get` can tell a stored `undefined` from a missing key.
	const map = new Map<K, { value: V; bytes: number }>();
	let totalBytes = 0;

	const evict = () => {
		for (const oldest of map.keys()) {
			if (map.size <= 1 || (map.size <= maxEntries && totalBytes <= maxBytes)) {
				break;
			}
			remove(oldest);
		}
	};

	const remove = (key: K) => {
		const entry = map.get(key);
		if (entry == null) {
			return false;
		}
		totalBytes -= entry.bytes;
		return map.delete(key);
	};

	return {
		delete: remove,
		get(key) {
			const entry = map.get(key);
			if (entry == null) {
				return undefined;
			}

			map.delete(key);
			map.set(key, entry);
			return entry.value;
		},
		peek(key) {
			return map.get(key)?.value;
		},
		set(key, value, bytes = 0) {
			remove(key);
			map.set(key, { value, bytes });
			totalBytes += bytes;
			evict();
		},
		resize(key, bytes) {
			const entry = map.get(key);
			if (entry == null) {
				return;
			}
			totalBytes += bytes - entry.bytes;
			entry.bytes = bytes;
			evict();
		},
		size() {
			return map.size;
		},
	};
}

export { createLruCache };
export type { LruCache };
