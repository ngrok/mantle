/**
 * The screen readers a flow can run under. Each reader opens a page, takes key
 * presses the way a user gives them, and returns what it said since the last
 * call. The virtual reader runs anywhere Playwright Chromium runs. VoiceOver
 * needs macOS and NVDA needs Windows, each set up with `@guidepup/setup`.
 */
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import type { Browser, CDPSession, Page } from "playwright";

export const readerNames = ["virtual", "voiceover", "nvda"] as const;

export type ReaderName = (typeof readerNames)[number];

export type Reader = {
	page: Page;
	/** Load `url` and put the reader on the page content. */
	open: (url: string) => Promise<void>;
	/** Press a key with the reader running, such as `Tab` or `Shift+Tab`. */
	press: (key: string) => Promise<void>;
	/** Type text into the focused field. */
	type: (text: string) => Promise<void>;
	/** Move the reader to the next item in browse mode, without moving focus. */
	next: () => Promise<void>;
	/** What the reader said since the last call. */
	drain: () => Promise<string[]>;
	close: () => Promise<void>;
};

type VirtualReader = {
	start: (options: { container: Node }) => Promise<void>;
	next: () => Promise<void>;
	spokenPhraseLog: () => Promise<string[]>;
};

declare global {
	interface Window {
		__reader?: VirtualReader;
	}
}

const delay = (ms: number) =>
	new Promise((resolve) => {
		setTimeout(resolve, ms);
	});

const require = createRequire(import.meta.url);

/** A VoiceOver usage hint sentence. Hints repeat the role and say nothing about state. */
const HINT = /^(you are currently on|to [a-z]+ (this|the|a)|to exit|press control)/i;

const STATES = ["checked", "pressed", "selected", "expanded", "invalid", "disabled", "required"];
const CONTEXT_ROLES =
	/^(dialog|alertdialog|radiogroup|group|listbox|menu|tablist|grid|tree|toolbar)$/;

type AXNode = Awaited<ReturnType<typeof partialTree>>[number];

const partialTree = async (cdp: CDPSession, backendNodeId: number) =>
	(await cdp.send("Accessibility.getPartialAXTree", { backendNodeId, fetchRelatives: true })).nodes;

/** One accessibility node as a reader line: role, name, value, description, and states. */
const describeNode = (node: AXNode): string => {
	const parts = [
		String(node.role?.value ?? ""),
		node.name?.value ? `"${node.name.value}"` : "(no name)",
	];
	const value = node.value?.value;
	if (value !== undefined && value !== "") {
		parts.push(`value "${value}"`);
	}
	if (node.description?.value) {
		parts.push(`description "${node.description.value}"`);
	}
	// Why String: CDP property values are strings, numbers, and booleans.
	const props = new Map<string, string>(
		(node.properties ?? []).map((prop) => [prop.name, String(prop.value.value)]),
	);
	for (const state of STATES) {
		const stateValue = props.get(state);
		if (stateValue === undefined) {
			continue;
		}
		const on = stateValue !== "false";
		if (state === "checked") {
			parts.push(on ? "checked" : "not checked");
		} else if (state === "expanded") {
			parts.push(on ? "expanded" : "collapsed");
		} else if (on) {
			parts.push(stateValue === "true" ? state : `${state}=${stateValue}`);
		}
	}
	const hasPopup = props.get("hasPopup");
	if (hasPopup != null) {
		parts.push(`popup ${hasPopup}`);
	}
	const valuetext = props.get("valuetext");
	if (valuetext != null) {
		parts.push(`valuetext ${valuetext}`);
	}
	return parts.join(" ");
};

/**
 * The item a reader is on, as Chromium exposes it: the focused element, or the
 * option its `aria-activedescendant` points at, with the named groups and
 * dialogs around it. Why: the virtual reader does not follow
 * `aria-activedescendant` or read a combobox value, and Chromium's tree is what
 * NVDA and JAWS read in Chrome.
 */
const focusLine = async (cdp: CDPSession): Promise<string | null> => {
	const { result } = await cdp.send("Runtime.evaluate", {
		expression: `(() => {
			let element = document.activeElement;
			while (element?.shadowRoot?.activeElement) element = element.shadowRoot.activeElement;
			const id = element?.getAttribute("aria-activedescendant");
			return (id && element.ownerDocument.getElementById(id)) || element;
		})()`,
	});
	if (result.objectId == null) {
		return null;
	}
	const { node } = await cdp.send("DOM.describeNode", { objectId: result.objectId });
	const nodes = await partialTree(cdp, node.backendNodeId);
	const self = nodes.find((candidate) => candidate.backendDOMNodeId === node.backendNodeId);
	if (self == null || self.role?.value === "RootWebArea") {
		return "focus: (page, no element)";
	}
	const byId = new Map(nodes.map((candidate) => [candidate.nodeId, candidate]));
	const contexts: string[] = [];
	for (
		let parent = byId.get(self.parentId ?? "");
		parent != null;
		parent = byId.get(parent.parentId ?? "")
	) {
		const role = String(parent.role?.value ?? "");
		if (CONTEXT_ROLES.test(role) && parent.name?.value) {
			contexts.push(`${role} "${parent.name.value}"`);
		}
	}
	const where = contexts.length > 0 ? ` (in ${contexts.join(", in ")})` : "";
	return `focus: ${describeNode(self)}${where}`;
};

/**
 * Guidepup's virtual screen reader, running inside the page, plus one line for
 * the focused item from Chromium's accessibility tree when it changes. The
 * virtual reader follows focus and live regions; it does not model a real
 * reader's quirks, so a pass here is a lower bound.
 */
const virtualReader = async (browser: Browser): Promise<Reader> => {
	const source = await readFile(
		require.resolve("@guidepup/virtual-screen-reader/browser.js"),
		"utf8",
	);
	const context = await browser.newContext({
		bypassCSP: true,
		viewport: { width: 1280, height: 900 },
	});
	const page = await context.newPage();
	const cdp = await context.newCDPSession(page);
	await cdp.send("Accessibility.enable");
	let seen = 0;
	let lastFocus = "";
	return {
		page,
		open: async (url) => {
			await page.goto(url, { waitUntil: "networkidle" });
			await page.evaluate(async (code) => {
				const blob = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
				const { virtual } = await import(blob);
				window.__reader = virtual;
				await virtual.start({ container: document.body });
			}, source);
			seen = 0;
			lastFocus = "";
		},
		press: async (key) => {
			await page.keyboard.press(key);
			await delay(150);
		},
		type: async (text) => {
			await page.keyboard.type(text, { delay: 60 });
			await delay(150);
		},
		next: async () => {
			await page.evaluate(() => window.__reader?.next());
		},
		drain: async () => {
			await delay(400);
			const log = await page.evaluate(() => window.__reader?.spokenPhraseLog() ?? []);
			const fresh = log.slice(seen);
			seen = log.length;
			const line = await focusLine(cdp);
			if (line != null && line !== lastFocus) {
				fresh.push(line);
			}
			lastFocus = line ?? "";
			return fresh;
		},
		close: async () => {
			await context.close();
		},
	};
};

/**
 * A real reader driven by Guidepup: VoiceOver with Playwright WebKit on macOS,
 * or NVDA with Playwright Chromium on Windows. Keys go through the OS, so the
 * reader hears them as a user's.
 */
const realReader = async (browser: Browser, name: "voiceover" | "nvda"): Promise<Reader> => {
	const { voiceOver, nvda } = await import("@guidepup/guidepup");
	const sr = name === "voiceover" ? voiceOver : nvda;
	const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
	const page = await context.newPage();

	// Why: Guidepup finds the browser by bundle ID on macOS and by window title on Windows.
	const enterWebContent = async () => {
		if (name === "voiceover") {
			const { navigateVoiceOverToWebContent } =
				await import("@guidepup/playwright/lib/navigateVoiceOverToWebContent.js");
			await navigateVoiceOverToWebContent({
				voiceOver,
				page,
				applicationId: "org.webkit.Playwright",
			});
		} else {
			const { navigateNVDAtoWebContent } =
				await import("@guidepup/playwright/lib/navigateNVDAtoWebContent.js");
			await navigateNVDAtoWebContent({ nvda, page, applicationName: "Google Chrome For Testing" });
		}
	};

	await sr.start({ capture: true });
	let seen = 0;
	let lastHeard = "";
	let inWebContent = false;
	// Why: a real reader keeps speaking after the key event returns.
	const settle = () => delay(name === "voiceover" ? 1200 : 900);
	return {
		page,
		open: async (url) => {
			await page.goto(url, { waitUntil: "networkidle" });
			// Why once: finding the web area takes Guidepup up to a minute, and the
			// reader stays in it when the same tab loads the next page.
			if (!inWebContent) {
				await enterWebContent();
				inWebContent = true;
				// Why a second load: the first key after Guidepup finds the web area is lost.
				await page.goto(url, { waitUntil: "networkidle" });
			}
			// Why a click: after a flow that tabbed out to the browser UI, focus stays
			// there on the next load. A click on the page's corner puts it in the page.
			await page.mouse.click(1, 1);
			if (name === "nvda") {
				// Why: NVDA's browse cursor can stay at the end of the last page; Control+Home puts it on the first item.
				await sr.press("Control+Home");
			}
			await settle();
			seen = (await sr.spokenPhraseLog()).length;
			lastHeard = await sr.lastSpokenPhrase();
		},
		press: async (key) => {
			await sr.press(key);
			await settle();
		},
		type: async (text) => {
			await sr.type(text);
			await settle();
		},
		next: async () => {
			await sr.next();
			await settle();
		},
		drain: async () => {
			const log = await sr.spokenPhraseLog();
			// Why lastSpokenPhrase: Guidepup logs speech only while it runs a reader
			// command, so speech that comes late, such as a live region,
			// shows up only as the reader's last phrase.
			const last = await sr.lastSpokenPhrase();
			const heard = [
				...log.slice(seen),
				...(last !== lastHeard && !log.slice(seen).includes(last) ? [last] : []),
			];
			seen = log.length;
			lastHeard = last;
			return heard
				.map((phrase) =>
					phrase
						.split(/(?<=\.)\s+/)
						.filter((sentence) => !HINT.test(sentence))
						.join(" ")
						.trim(),
				)
				.filter((phrase) => phrase !== "");
		},
		close: async () => {
			await sr.stop().catch(() => undefined);
			await context.close();
		},
	};
};

/** Start `name` on a new page of `browser`. */
export const openReader = async (browser: Browser, name: ReaderName): Promise<Reader> =>
	name === "virtual" ? virtualReader(browser) : realReader(browser, name);
