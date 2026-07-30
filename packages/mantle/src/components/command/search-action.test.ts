import { describe, expect, test } from "vitest";
import { searchActionFromKeyDown, searchActionFromPaste } from "./search-action.js";

/**
 * Builds the subset of a `keydown` the policy reads. Defaults are "a plain
 * keypress with no modifiers and no IME", so each test states only the one
 * property it is about.
 */
function keyDown(overrides: {
	altKey?: boolean;
	ctrlKey?: boolean;
	isComposing?: boolean;
	key: string;
	keyCode?: number;
	metaKey?: boolean;
}) {
	return {
		altKey: false,
		ctrlKey: false,
		isComposing: false,
		metaKey: false,
		...overrides,
	};
}

/**
 * Builds a `paste` carrying `text` as `text/plain`. Pass `null` for a clipboard
 * with no text data at all (an image paste).
 */
function paste(text: string | null) {
	return {
		clipboardData: text == null ? null : { getData: () => text },
	};
}

describe("searchActionFromKeyDown", () => {
	describe("seeds printable text", () => {
		test.for([
			["a lowercase letter", "e", "e"],
			["an uppercase letter", "E", "E"],
			["a digit", "7", "7"],
			["punctuation", "/", "/"],
			// Spread-counting instead of `.length`: an emoji is a surrogate pair, so
			// a `key.length === 1` check would classify it as a named key and drop
			// the character entirely.
			["an astral character", "😀", "😀"],
			["a non-Latin character", "あ", "あ"],
		] as const)("%s", ([, key, query]) => {
			expect(searchActionFromKeyDown(keyDown({ key }))).toEqual({ type: "seed", query });
		});
	});

	describe("ignores keys that are not text", () => {
		test.for([
			// Space and Enter activate the button; the click that follows opens the
			// palette on its own. Seeding " " would put a stray space in the query.
			["Space", " "],
			["Enter", "Enter"],
			["Tab", "Tab"],
			["Escape", "Escape"],
			["ArrowDown", "ArrowDown"],
			["Shift", "Shift"],
			// A dead key (the first half of a composed accent) and an unmappable key
			// both report multi-character names. An engine that also flags the dead
			// key as IME processing is the `keyCode: 229` case below, not this one.
			["Dead", "Dead"],
			["Unidentified", "Unidentified"],
		] as const)("%s", ([, key]) => {
			expect(searchActionFromKeyDown(keyDown({ key }))).toEqual({ type: "ignore" });
		});
	});

	describe("ignores modifier chords", () => {
		test.for([
			["⌘K, the palette's own shortcut", { key: "k", metaKey: true }],
			["Ctrl+K", { key: "k", ctrlKey: true }],
			["⌘V, which the paste path handles", { key: "v", metaKey: true }],
			// Alt is excluded even though macOS ⌥ produces real characters: seeding
			// one means preventDefault()ing Windows Alt accelerators (Alt+D).
			["Alt+d", { key: "d", altKey: true }],
			["AltGr (reported as Ctrl+Alt)", { key: "@", altKey: true, ctrlKey: true }],
		] as const)("%s", ([, event]) => {
			expect(searchActionFromKeyDown(keyDown(event))).toEqual({ type: "ignore" });
		});
	});

	describe("opens empty for IME composition", () => {
		// The blog's original trigger returned nothing here, so a CJK user pressing
		// a key on the focused trigger got silence. A composition belongs to the
		// element that started it and cannot be replayed, so the palette opens with
		// an empty field instead.
		test.for([
			["a keystroke inside an active composition", { key: "a", isComposing: true }],
			["the engine-reported IME key", { key: "Process" }],
			["the legacy IME keyCode", { key: "a", keyCode: 229 }],
			// Chrome on macOS routes dead keys through the IME path — `⌥e` arrives
			// as `key: "Dead"` with `keyCode: 229`. Without the `keyCode` this case
			// falls into the named-key `ignore` above and the test agrees with
			// itself instead of with a browser.
			["a dead key the engine flags as IME processing", { key: "Dead", keyCode: 229 }],
		] as const)("%s", ([, event]) => {
			expect(searchActionFromKeyDown(keyDown(event))).toEqual({ type: "open" });
		});
	});

	test("composition wins over the modifier guard", () => {
		// Ordering pin: an IME keystroke that also reports a modifier must still
		// open rather than fall into `ignore` and strand the user.
		expect(
			searchActionFromKeyDown(keyDown({ key: "a", isComposing: true, ctrlKey: true })),
		).toEqual({ type: "open" });
	});
});

describe("searchActionFromPaste", () => {
	test("seeds the pasted text", () => {
		expect(searchActionFromPaste(paste("endpoints"))).toEqual({
			type: "seed",
			query: "endpoints",
		});
	});

	test("collapses a multi-line paste to one line", () => {
		// The query is a single-line field: pasted newlines would match nothing.
		expect(searchActionFromPaste(paste("api\nendpoints\n"))).toEqual({
			type: "seed",
			query: "api endpoints",
		});
	});

	test("collapses runs of whitespace and trims the ends", () => {
		expect(searchActionFromPaste(paste("  api \t  endpoints  "))).toEqual({
			type: "seed",
			query: "api endpoints",
		});
	});

	test.for([
		["an empty clipboard", ""],
		["a whitespace-only clipboard", " \n\t "],
	] as const)("opens without seeding for %s", ([, text]) => {
		expect(searchActionFromPaste(paste(text))).toEqual({ type: "open" });
	});

	test("opens without seeding when the clipboard carries no text data", () => {
		// A native ClipboardEvent's `clipboardData` is nullable (an image paste),
		// and reading `.getData` off it unguarded would throw.
		expect(searchActionFromPaste(paste(null))).toEqual({ type: "open" });
	});
});
