import { expect, test, vi } from "vitest";
import {
	observeResize,
	onFontsLoaded,
	onPrint,
	prefersReducedMotion,
	watchDevicePixelRatio,
} from "./environment.js";

type ChangeListener = () => void;

/** A fake `matchMedia` that records every query and lets a test fire its `change`. */
const fakeMatchMedia = (preference: { reduced: boolean }) => {
	const changeListeners = new Map<string, Set<ChangeListener>>();
	const matchMedia = vi.fn<(query: string) => MediaQueryList>((query) => {
		const listeners = new Set<ChangeListener>();
		changeListeners.set(query, listeners);
		return {
			get matches() {
				return query === "(prefers-reduced-motion: reduce)" && preference.reduced;
			},
			media: query,
			onchange: null,
			addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
				if (typeof listener === "function") {
					listeners.add(() => listener(new Event("change")));
				}
			},
			removeEventListener: () => {
				listeners.clear();
			},
			// oxlint-disable-next-line typescript/no-deprecated -- Why: the `MediaQueryList` type still requires it.
			addListener: () => {},
			// oxlint-disable-next-line typescript/no-deprecated -- Why: the `MediaQueryList` type still requires it.
			removeListener: () => {},
			dispatchEvent: () => false,
		};
	});
	const fire = (query: string): void => {
		for (const listener of changeListeners.get(query) ?? []) {
			listener();
		}
	};
	return { matchMedia, fire, changeListeners };
};

test("prefersReducedMotion builds one query per window and reads the live preference", () => {
	const preference = { reduced: false };
	const { matchMedia } = fakeMatchMedia(preference);
	vi.stubGlobal("matchMedia", matchMedia);
	expect(prefersReducedMotion(window)).toBe(false);
	preference.reduced = true;
	// A cached boolean would miss the flip; a per-call query would build two.
	expect(prefersReducedMotion(window)).toBe(true);
	expect(matchMedia).toHaveBeenCalledTimes(1);
});

test("watchDevicePixelRatio shares one query, notifies every listener once, and re-arms at the new ratio", () => {
	const { matchMedia, fire, changeListeners } = fakeMatchMedia({ reduced: false });
	vi.stubGlobal("matchMedia", matchMedia);
	vi.stubGlobal("devicePixelRatio", 2);
	const first = vi.fn<ChangeListener>();
	const second = vi.fn<ChangeListener>();
	const stopFirst = watchDevicePixelRatio(window, first);
	const stopSecond = watchDevicePixelRatio(window, second);
	// A query per listener would build two.
	expect(matchMedia).toHaveBeenCalledTimes(1);
	expect(matchMedia).toHaveBeenLastCalledWith("(resolution: 2dppx)");

	vi.stubGlobal("devicePixelRatio", 3);
	fire("(resolution: 2dppx)");
	expect(first).toHaveBeenCalledTimes(1);
	expect(second).toHaveBeenCalledTimes(1);
	// The old query stopped matching for good; only a query at the new ratio fires again.
	expect(matchMedia).toHaveBeenLastCalledWith("(resolution: 3dppx)");

	stopFirst();
	fire("(resolution: 3dppx)");
	expect(first).toHaveBeenCalledTimes(1);
	expect(second).toHaveBeenCalledTimes(2);

	stopSecond();
	// The last unsubscribe releases the query; a leak would keep its listener.
	expect(changeListeners.get("(resolution: 3dppx)")?.size).toBe(0);
});

test("onPrint shares one listener pair per window and removes it after the last unsubscribe", () => {
	const add = vi.spyOn(window, "addEventListener");
	const remove = vi.spyOn(window, "removeEventListener");
	const first = { before: vi.fn<() => void>(), after: vi.fn<() => void>() };
	const second = { before: vi.fn<() => void>(), after: vi.fn<() => void>() };
	const stopFirst = onPrint(window, first);
	const stopSecond = onPrint(window, second);
	// A pair per subscriber would register four.
	expect(add).toHaveBeenCalledTimes(2);

	window.dispatchEvent(new Event("beforeprint"));
	expect(first.before).toHaveBeenCalledTimes(1);
	expect(second.before).toHaveBeenCalledTimes(1);

	stopFirst();
	window.dispatchEvent(new Event("afterprint"));
	expect(first.after).toHaveBeenCalledTimes(0);
	expect(second.after).toHaveBeenCalledTimes(1);

	stopSecond();
	expect(remove).toHaveBeenCalledTimes(2);
	window.dispatchEvent(new Event("beforeprint"));
	expect(second.before).toHaveBeenCalledTimes(1);
});

test("onFontsLoaded shares one listener per document and removes it after the last unsubscribe", () => {
	const fonts = new EventTarget();
	const fakeDocument = { fonts } as unknown as Document;
	const add = vi.spyOn(fonts, "addEventListener");
	const remove = vi.spyOn(fonts, "removeEventListener");
	const first = vi.fn<() => void>();
	const second = vi.fn<() => void>();
	const stopFirst = onFontsLoaded(fakeDocument, first);
	const stopSecond = onFontsLoaded(fakeDocument, second);
	// A listener per subscriber would register two.
	expect(add).toHaveBeenCalledTimes(1);

	fonts.dispatchEvent(new Event("loadingdone"));
	expect(first).toHaveBeenCalledTimes(1);
	expect(second).toHaveBeenCalledTimes(1);

	stopFirst();
	stopSecond();
	expect(remove).toHaveBeenCalledTimes(1);
	fonts.dispatchEvent(new Event("loadingdone"));
	expect(second).toHaveBeenCalledTimes(1);
});

/** A fake `ResizeObserver` that counts constructions and lets a test deliver entries. */
const fakeResizeObserver = () => {
	class Fake implements ResizeObserver {
		readonly targets = new Set<Element>();
		disconnected = false;
		readonly callback: ResizeObserverCallback;
		constructor(callback: ResizeObserverCallback) {
			this.callback = callback;
			instances.push(this);
		}
		observe(target: Element): void {
			this.targets.add(target);
		}
		unobserve(target: Element): void {
			this.targets.delete(target);
		}
		disconnect(): void {
			this.targets.clear();
			this.disconnected = true;
		}
	}
	const instances: Fake[] = [];
	const deliver = (target: Element): void => {
		for (const instance of instances) {
			if (instance.targets.has(target)) {
				const entry: ResizeObserverEntry = {
					target,
					contentRect: new DOMRect(0, 0, 10, 10),
					borderBoxSize: [],
					contentBoxSize: [],
					devicePixelContentBoxSize: [],
				};
				instance.callback([entry], instance);
			}
		}
	};
	return { Fake, instances, deliver };
};

test("observeResize shares one observer per document, routes each entry to its element, and disconnects after the last stop", () => {
	const { Fake, instances, deliver } = fakeResizeObserver();
	vi.stubGlobal("ResizeObserver", Fake);
	const first = document.createElement("div");
	const second = document.createElement("div");
	const onFirst = vi.fn<(entry: ResizeObserverEntry) => void>();
	const onSecond = vi.fn<(entry: ResizeObserverEntry) => void>();
	const stopFirst = observeResize(first, onFirst);
	const stopSecond = observeResize(second, onSecond);
	expect(instances).toHaveLength(1);

	deliver(second);
	expect(onSecond).toHaveBeenCalledTimes(1);
	expect(onFirst).toHaveBeenCalledTimes(0);

	stopFirst();
	expect(instances[0]?.disconnected).toBe(false);
	deliver(first);
	expect(onFirst).toHaveBeenCalledTimes(0);
	stopSecond();
	expect(instances[0]?.disconnected).toBe(true);

	// The next observation after the last stop builds a fresh observer.
	observeResize(first, onFirst);
	expect(instances).toHaveLength(2);
});
