import { describe, expect, test } from "vitest";
import { createLruCache } from "./lru-cache.js";

describe("createLruCache", () => {
	test("returns cached values and refreshes recency on get", () => {
		const cache = createLruCache<string, number>(2);

		cache.set("a", 1);
		cache.set("b", 2);
		expect(cache.get("a")).toBe(1);

		cache.set("c", 3);

		expect(cache.get("a")).toBe(1);
		expect(cache.get("b")).toBeUndefined();
		expect(cache.get("c")).toBe(3);
	});

	test("evicts the least recently used item when over capacity", () => {
		const cache = createLruCache<string, number>(2);

		cache.set("a", 1);
		cache.set("b", 2);
		cache.set("c", 3);

		expect(cache.size()).toBe(2);
		expect(cache.get("a")).toBeUndefined();
		expect(cache.get("b")).toBe(2);
		expect(cache.get("c")).toBe(3);
	});

	test("evicts the least recently used entries while it holds more than maxBytes", () => {
		const cache = createLruCache<string, number>(10, { maxBytes: 100 });

		cache.set("a", 1, 40);
		cache.set("b", 2, 40);
		expect(cache.get("a")).toBe(1);
		cache.set("c", 3, 40);

		expect(cache.get("b")).toBeUndefined();
		expect(cache.get("a")).toBe(1);
		expect(cache.get("c")).toBe(3);

		// A new size for a key replaces its old size.
		cache.set("a", 1, 10);
		cache.set("d", 4, 50);
		expect(cache.size()).toBe(3);

		// The newest entry stays, even when it alone is over the budget.
		cache.set("e", 5, 500);
		expect(cache.size()).toBe(1);
		expect(cache.peek("e")).toBe(5);
	});

	test("resize keeps the entry's recency and evicts the oldest", () => {
		const cache = createLruCache<string, number>(10, { maxBytes: 100 });

		cache.set("a", 1, 10);
		cache.set("b", 2, 10);
		cache.resize("a", 80);
		cache.set("c", 3, 20);

		// Why `a` goes: it is the least recently used, though it was resized last.
		expect(cache.peek("a")).toBeUndefined();
		expect(cache.peek("b")).toBe(2);
		expect(cache.peek("c")).toBe(3);
	});
});
