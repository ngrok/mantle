import { vi } from "vitest";

/**
 * Controls returned by {@link mockMatchMedia} for driving media query state
 * from a test.
 */
type MatchMediaControls = {
	/**
	 * Set whether `query` currently matches and synchronously notify every
	 * `"change"` listener registered for that query.
	 */
	setMatches: (query: string, matches: boolean) => void;
	/** Number of active `"change"` listeners registered for `query`. */
	listenerCount: (query: string) => number;
};

/**
 * Replace `window.matchMedia` with a deterministic, controllable stub for
 * happy-dom tests. Queries not primed via `initialMatches` (or a later
 * `setMatches`) report `matches: false`.
 *
 * Installed with `vi.spyOn`, so restore it in `afterEach` with
 * `vi.restoreAllMocks()`.
 *
 * @param initialMatches - Initial `matches` value per media query string.
 * @returns Controls to change query state and inspect listener counts.
 *
 * @example
 * const media = mockMatchMedia({ "(min-width: 48rem)": true });
 * const { result } = renderHook(() => useMatchesMediaQuery("(min-width: 48rem)"));
 * expect(result.current).toBe(true);
 *
 * act(() => {
 *   media.setMatches("(min-width: 48rem)", false);
 * });
 * expect(result.current).toBe(false);
 */
function mockMatchMedia(initialMatches: Record<string, boolean> = {}): MatchMediaControls {
	const matchState = new Map<string, boolean>(Object.entries(initialMatches));
	const changeListeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

	const listenersFor = (query: string): Set<EventListenerOrEventListenerObject> => {
		let listeners = changeListeners.get(query);
		if (listeners == null) {
			listeners = new Set();
			changeListeners.set(query, listeners);
		}
		return listeners;
	};

	vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
		get matches() {
			return matchState.get(query) ?? false;
		},
		media: query,
		onchange: null,
		addListener: () => {},
		removeListener: () => {},
		addEventListener: (_type: string, listener: EventListenerOrEventListenerObject | null) => {
			if (listener != null) {
				listenersFor(query).add(listener);
			}
		},
		removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject | null) => {
			if (listener != null) {
				listenersFor(query).delete(listener);
			}
		},
		dispatchEvent: () => false,
	}));

	return {
		setMatches(query, matches) {
			matchState.set(query, matches);
			// Listeners only read `matches`/`media`, so a plain Event carrying
			// those fields stands in for MediaQueryListEvent (which happy-dom
			// does not construct).
			const event = Object.assign(new Event("change"), { matches, media: query });
			for (const listener of listenersFor(query)) {
				if (typeof listener === "function") {
					listener(event);
				} else {
					listener.handleEvent(event);
				}
			}
		},
		listenerCount(query) {
			return listenersFor(query).size;
		},
	};
}

export {
	//,
	mockMatchMedia,
};

export type {
	//,
	MatchMediaControls,
};
